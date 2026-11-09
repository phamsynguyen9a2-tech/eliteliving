/**
 * Đổi phòng — phần đọc / ghi CSDL. Quy tắc tính tiền và điều kiện nằm trong lib/room-transfer.ts.
 * Lỗi nghiệp vụ ném dạng `MÃ: thông báo` (route chuyển thành mã HTTP bằng lifecycleErrorResponse).
 */
import { Prisma } from '@prisma/client';
import prisma from './prisma';
import { endActiveContractInTx, invalidateRoomsCache } from './db';
import { parseInitialReadings } from './billing';
import { publishRoomEvent } from './realtime-bus';
import {
  billMonthOf,
  checkTransferDate,
  checkTransferTarget,
  computeTransferSettlement,
  depositForRoom,
  directionOf,
  initialSettlementStatus,
  nextSettlementStatus,
  nextTransferStatus,
  SETTLEMENT_STATUS_LABELS,
  todayInVietnam,
  effectiveTransferDate,
  TRANSFER_STATUS_LABELS,
  type RoomTransferStatus,
  type RoomTransferView,
  type TransferOption,
  type TransferRoomSummary,
  type TransferSettlement,
  type TransferSettlementStatus,
} from './room-transfer';

type Tx = Prisma.TransactionClient;

export const TRANSFER_TABLE_MISSING_MESSAGE =
  'CSDL chưa có bảng yêu cầu đổi phòng. Hãy chạy "npx prisma db push" trong thư mục web rồi khởi động lại máy chủ.';

/** Bảng room_transfer_requests chưa được tạo (người dùng chưa chạy prisma db push). */
export function isTransferTableMissing(err: unknown) {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')
  );
}

const roomSummarySelect = {
  id: true,
  roomCode: true,
  title: true,
  price: true,
  deposit: true,
  area: true,
  roomType: true,
  address: true,
  projectName: true,
  images: true,
  electricityRate: true,
  waterRate: true,
} as const;

type RoomSummaryRow = Prisma.RoomGetPayload<{ select: typeof roomSummarySelect }>;

function mapRoomSummary(room: RoomSummaryRow | null | undefined): TransferRoomSummary | null {
  if (!room) return null;
  return {
    id: room.id,
    room_code: room.roomCode,
    title: room.title,
    price: room.price,
    deposit: depositForRoom(room),
    area: room.area,
    room_type: room.roomType,
    address: room.address,
    project_name: room.projectName,
    image: room.images?.[0] ?? null,
    electricity_rate: room.electricityRate,
    water_rate: room.waterRate,
  };
}

type TransferRow = Prisma.RoomTransferRequestGetPayload<{
  include: { fromRoom: { select: typeof roomSummarySelect }; toRoom: { select: typeof roomSummarySelect } };
}>;

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export function mapTransfer(row: TransferRow, contractEndDate?: string | null): RoomTransferView {
  const status = row.status as RoomTransferStatus;
  const settlementStatus = row.settlementStatus as TransferSettlementStatus;
  const approved = status === 'APPROVED' && row.totalDiff !== null;
  const totalDiff = row.totalDiff ?? 0;
  return {
    id: row.id,
    from_contract_id: row.fromContractId,
    from_room_id: row.fromRoomId,
    to_room_id: row.toRoomId,
    landlord_id: row.landlordId,
    tenant_name: row.tenantName,
    tenant_phone: row.tenantPhone,
    desired_date: row.desiredDate,
    note: row.note,
    status,
    status_label: TRANSFER_STATUS_LABELS[status] ?? status,
    reject_reason: row.rejectReason,
    created_at: row.createdAt.toISOString(),
    decided_at: iso(row.decidedAt),
    from_room: mapRoomSummary(row.fromRoom),
    to_room: mapRoomSummary(row.toRoom),
    new_contract_id: row.newContractId,
    transfer_date: row.transferDate,
    contract_end_date: contractEndDate ?? null,
    settlement: approved
      ? {
          old_rent: row.oldRent ?? 0,
          new_rent: row.newRent ?? 0,
          old_deposit: row.oldDeposit ?? 0,
          new_deposit: row.newDeposit ?? 0,
          depositDiff: row.depositDiff ?? 0,
          rentDiff: row.rentDiff ?? 0,
          remainingDays: row.remainingDays ?? 0,
          daysInMonth: row.daysInMonth ?? 0,
          monthAlreadyBilled: Boolean(row.monthAlreadyBilled),
          utilityIncluded: row.oldElectricFinal !== null,
          electricUsed: Math.max(0, (row.oldElectricFinal ?? 0) - (row.oldElectricPrev ?? 0)),
          waterUsed: Math.max(0, (row.oldWaterFinal ?? 0) - (row.oldWaterPrev ?? 0)),
          electricCost: 0,
          waterCost: 0,
          utilityCost: row.utilityCost ?? 0,
          damageCost: row.damageCost ?? 0,
          totalDiff,
          direction: directionOf(totalDiff),
          old_electric_prev: row.oldElectricPrev,
          old_electric_final: row.oldElectricFinal,
          old_water_prev: row.oldWaterPrev,
          old_water_final: row.oldWaterFinal,
          new_electric_start: row.newElectricStart,
          new_water_start: row.newWaterStart,
        }
      : null,
    settlement_status: settlementStatus,
    settlement_status_label: SETTLEMENT_STATUS_LABELS[settlementStatus] ?? settlementStatus,
    settlement_tx_code: row.settlementTxCode,
    settlement_reported_at: iso(row.settlementReportedAt),
    settled_at: iso(row.settledAt),
  };
}

const transferInclude = {
  fromRoom: { select: roomSummarySelect },
  toRoom: { select: roomSummarySelect },
} as const;

async function withContractEndDates(rows: TransferRow[]) {
  const ids = Array.from(new Set(rows.map((r) => r.newContractId || r.fromContractId)));
  const contracts = ids.length
    ? await prisma.contract.findMany({ where: { id: { in: ids } }, select: { id: true, endDate: true } })
    : [];
  const endById = new Map(contracts.map((c) => [c.id, c.endDate]));
  return rows.map((r) => mapTransfer(r, endById.get(r.newContractId || r.fromContractId) ?? null));
}

/** Danh sách yêu cầu: của một chủ trọ (landlordId) hoặc của các hợp đồng khách sở hữu (contractIds). */
export async function getTransferRequests(filter: { landlordId?: string | null; contractIds?: Iterable<string> }) {
  const where: Prisma.RoomTransferRequestWhereInput = {};
  if (filter.landlordId) where.landlordId = filter.landlordId;
  if (filter.contractIds) {
    const ids = Array.from(filter.contractIds);
    if (ids.length === 0) return [];
    where.fromContractId = { in: ids };
  }
  const rows = await prisma.roomTransferRequest.findMany({
    where,
    include: transferInclude,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return withContractEndDates(rows);
}

export async function getTransferRequestById(id: string) {
  const row = await prisma.roomTransferRequest.findUnique({ where: { id }, include: transferInclude });
  if (!row) return null;
  return (await withContractEndDates([row]))[0];
}

// ------------------------------------------------------------
// Số liệu dùng chung khi tính chênh lệch
// ------------------------------------------------------------
type ContractRow = Prisma.ContractGetPayload<{ include: { room: true } }>;

/** Phòng cũ đã có hóa đơn của tháng chuyển (thuộc hợp đồng này hoặc hóa đơn cũ chưa gắn hợp đồng). */
async function isTransferMonthBilled(db: Tx | typeof prisma, contract: { id: string; roomId: number }, transferDate: string) {
  const bill = await db.utilityBill.findFirst({
    where: {
      roomId: contract.roomId,
      month: billMonthOf(transferDate),
      OR: [{ contractId: contract.id }, { contractId: null }],
    },
    select: { id: true },
  });
  return Boolean(bill);
}

/**
 * Chỉ số điện nước kỳ trước của phòng cũ: hóa đơn gần nhất của hợp đồng → chỉ số ban đầu trong biên bản
 * nhận phòng → hóa đơn gần nhất của phòng. null = chưa có, chủ trọ nhập tay.
 */
export async function findPreviousReadings(db: Tx | typeof prisma, contract: { id: string; roomId: number }) {
  const ownBill = await db.utilityBill.findFirst({
    where: { roomId: contract.roomId, contractId: contract.id },
    orderBy: { createdAt: 'desc' },
    select: { electricNew: true, waterNew: true, month: true },
  });
  if (ownBill) {
    return { electric: ownBill.electricNew, water: ownBill.waterNew, source: `Hóa đơn kỳ ${ownBill.month}` };
  }
  const checkIn = await db.handover.findFirst({
    where: { contractId: contract.id, type: 'CHECK_IN' },
    orderBy: { createdAt: 'desc' },
    select: { notes: true },
  });
  const initial = parseInitialReadings(checkIn?.notes);
  if (initial.electric !== undefined && initial.water !== undefined) {
    return { electric: initial.electric, water: initial.water, source: 'Biên bản nhận phòng' };
  }
  const roomBill = await db.utilityBill.findFirst({
    where: { roomId: contract.roomId },
    orderBy: { createdAt: 'desc' },
    select: { electricNew: true, waterNew: true, month: true },
  });
  if (roomBill) {
    return { electric: roomBill.electricNew, water: roomBill.waterNew, source: `Hóa đơn kỳ ${roomBill.month} của phòng` };
  }
  return null;
}

async function loadContract(db: Tx | typeof prisma, contractId: string): Promise<ContractRow> {
  const contract = await db.contract.findUnique({ where: { id: contractId }, include: { room: true } });
  if (!contract) throw new Error('CONTRACT_NOT_FOUND: Không tìm thấy hợp đồng.');
  return contract;
}

const contractFacts = (contract: ContractRow) => ({
  status: contract.status,
  roomId: contract.roomId,
  startDate: contract.startDate,
  endDate: contract.endDate,
  landlordId: contract.room.landlordId,
});

// ------------------------------------------------------------
// Khách thuê
// ------------------------------------------------------------
/** Phòng trống cùng chủ trọ khách có thể chuyển sang, kèm ước tính chênh lệch (chưa gồm điện nước). */
export async function listTransferOptions(contractId: string, opts: { today?: string } = {}) {
  const contract = await loadContract(prisma, contractId);
  const today = opts.today ?? todayInVietnam();
  const estimateDate = effectiveTransferDate(today, contract.startDate);
  const [rooms, monthAlreadyBilled, pending] = await Promise.all([
    prisma.room.findMany({
      where: {
        landlordId: contract.room.landlordId,
        status: 'AVAILABLE',
        listingStatus: 'APPROVED',
        id: { not: contract.roomId },
      },
      select: roomSummarySelect,
      orderBy: [{ price: 'asc' }, { roomCode: 'asc' }],
      take: 200,
    }),
    isTransferMonthBilled(prisma, contract, estimateDate),
    prisma.roomTransferRequest.findFirst({ where: { pendingKey: contract.id }, select: { id: true } }),
  ]);
  const options: TransferOption[] = rooms.map((room) => ({
    room: mapRoomSummary(room)!,
    estimate: computeTransferSettlement({
      oldRent: contract.monthlyRent,
      newRent: room.price,
      oldDeposit: contract.depositAmount,
      newDeposit: depositForRoom(room),
      transferDate: estimateDate,
      monthAlreadyBilled,
      contractStartDate: contract.startDate,
    }),
  }));
  return {
    contract: {
      id: contract.id,
      status: contract.status,
      room_id: contract.roomId,
      room_code: contract.room.roomCode,
      room_title: contract.roomTitle,
      monthly_rent: contract.monthlyRent,
      deposit_amount: contract.depositAmount,
      start_date: contract.startDate,
      end_date: contract.endDate,
    },
    estimate_date: estimateDate,
    month_already_billed: monthAlreadyBilled,
    has_pending_request: Boolean(pending),
    options,
  };
}

export async function createTransferRequest(input: {
  contractId: string;
  toRoomId: number;
  desiredDate: string;
  note?: string | null;
  tenantUserId?: string | null;
  today?: string;
}) {
  const today = input.today ?? todayInVietnam();
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 500) : '';
  try {
    const created = await prisma.$transaction(async (tx) => {
      const contract = await loadContract(tx, input.contractId);
      const target = await tx.room.findUnique({
        where: { id: input.toRoomId },
        select: { id: true, landlordId: true, status: true, listingStatus: true },
      });
      const targetCheck = checkTransferTarget(contractFacts(contract), target);
      if (!targetCheck.ok) throw new Error(`${targetCheck.code}: ${targetCheck.message}`);
      const dateCheck = checkTransferDate(input.desiredDate, contract, today);
      if (!dateCheck.ok) throw new Error(`${dateCheck.code}: ${dateCheck.message}`);

      const pendingCheckout = await tx.handover.findFirst({
        where: { contractId: contract.id, type: 'CHECK_OUT', landlordConfirmed: false, status: { not: 'CONFIRMED' } },
        select: { id: true },
      });
      if (pendingCheckout) {
        throw new Error('TRANSFER_NOT_ALLOWED: Bạn đang có yêu cầu trả phòng chờ chủ trọ xác nhận nên chưa thể đổi phòng.');
      }
      const pending = await tx.roomTransferRequest.findFirst({ where: { pendingKey: contract.id }, select: { id: true } });
      if (pending) {
        throw new Error('TRANSFER_DUPLICATE: Hợp đồng này đã có một yêu cầu đổi phòng đang chờ chủ trọ duyệt.');
      }

      const request = await tx.roomTransferRequest.create({
        data: {
          fromContractId: contract.id,
          fromRoomId: contract.roomId,
          toRoomId: input.toRoomId,
          landlordId: contract.room.landlordId,
          tenantUserId: input.tenantUserId || null,
          tenantName: contract.tenantName,
          tenantPhone: contract.tenantPhone,
          desiredDate: input.desiredDate,
          note: note || null,
          status: 'PENDING',
          pendingKey: contract.id,
        },
        include: transferInclude,
      });
      return { request, contract };
    });
    publishRoomEvent('contract', created.contract.roomId);
    return { view: mapTransfer(created.request, created.contract.endDate), contract: created.contract };
  } catch (err) {
    // Hai lần gửi cùng lúc: unique pending_key chặn bản thứ hai
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new Error('TRANSFER_DUPLICATE: Hợp đồng này đã có một yêu cầu đổi phòng đang chờ chủ trọ duyệt.');
    }
    throw err;
  }
}

/** Khách hủy, hoặc chủ trọ từ chối, một yêu cầu đang chờ. */
export async function closeTransferRequest(id: string, action: 'CANCEL' | 'REJECT', reason?: string | null) {
  const next = nextTransferStatus('PENDING', action)!;
  const trimmedReason = typeof reason === 'string' ? reason.trim().slice(0, 500) : '';
  if (action === 'REJECT' && trimmedReason.length < 3) {
    throw new Error('INVALID_TRANSFER: Vui lòng nhập lý do từ chối (ít nhất 3 ký tự).');
  }
  const closed = await prisma.roomTransferRequest.updateMany({
    where: { id, status: 'PENDING' },
    data: {
      status: next,
      pendingKey: null,
      decidedAt: new Date(),
      ...(action === 'REJECT' ? { rejectReason: trimmedReason } : {}),
    },
  });
  if (closed.count !== 1) {
    throw new Error('TRANSFER_NOT_PENDING: Yêu cầu đổi phòng này đã được xử lý trước đó.');
  }
  const view = await getTransferRequestById(id);
  if (view) publishRoomEvent('contract', view.from_room_id);
  return view;
}

// ------------------------------------------------------------
// Chủ trọ duyệt
// ------------------------------------------------------------
/** Số liệu cho màn duyệt: chỉ số kỳ trước, đã lập hóa đơn tháng này chưa, ước tính chênh lệch. */
export async function getApprovalPreview(id: string, opts: { today?: string } = {}) {
  const request = await prisma.roomTransferRequest.findUnique({ where: { id }, include: transferInclude });
  if (!request) return null;
  const contract = await loadContract(prisma, request.fromContractId);
  // Cùng ngày đổi phòng mà approveTransferRequest sẽ dùng (không sớm hơn ngày bắt đầu hợp đồng)
  const today = effectiveTransferDate(opts.today ?? todayInVietnam(), contract.startDate);
  const [previous, monthAlreadyBilled] = await Promise.all([
    findPreviousReadings(prisma, contract),
    isTransferMonthBilled(prisma, contract, today),
  ]);
  const newDeposit = request.toRoom ? depositForRoom(request.toRoom) : 0;
  return {
    request: mapTransfer(request, contract.endDate),
    transfer_date: today,
    transfer_month: billMonthOf(today),
    month_already_billed: monthAlreadyBilled,
    previous_readings: previous,
    old_rates: { electricity_rate: contract.room.electricityRate, water_rate: contract.room.waterRate },
    old_rent: contract.monthlyRent,
    old_deposit: contract.depositAmount,
    new_rent: request.toRoom?.price ?? 0,
    new_deposit: newDeposit,
    contract_status: contract.status,
    contract_start_date: contract.startDate,
    contract_end_date: contract.endDate,
    date_check: checkTransferDate(today, contract),
  };
}

export interface ApproveTransferInput {
  oldElectricPrev?: number | null;
  oldWaterPrev?: number | null;
  oldElectricFinal: number;
  oldWaterFinal: number;
  newElectricStart: number;
  newWaterStart: number;
  damageCost?: number | null;
}

const DEFAULT_HANDOVER_ITEMS = [
  { assetName: 'Điều hòa', category: 'Điện tử', quantity: 1, condition: 'Tốt, có remote' },
  { assetName: 'Khóa cửa và thẻ từ', category: 'An ninh', quantity: 1, condition: 'Hoạt động tốt' },
  { assetName: 'Bình chữa cháy & tiêu lệnh PCCC', category: 'PCCC', quantity: 1, condition: 'Còn hạn, nguyên niêm phong' },
  { assetName: 'Giường, nệm & tủ quần áo', category: 'Nội thất', quantity: 1, condition: 'Sạch đẹp' },
];

const readingNumber = (value: unknown, label: string) => {
  if (value === null || value === undefined || value === '') {
    throw new Error(`INVALID_TRANSFER: Vui lòng nhập ${label}.`);
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`INVALID_TRANSFER: ${label} phải là số không âm.`);
  return n;
};

/**
 * Duyệt đổi phòng trong MỘT transaction: khóa yêu cầu, khóa phòng mới (Còn trống → Đang thuê), thanh lý
 * hợp đồng cũ (phòng cũ về Còn trống / Đã đặt lịch), lập hợp đồng nối tiếp giữ nguyên ngày hết hạn,
 * lập biên bản trả phòng cũ + nhận phòng mới, ghi bảng quyết toán. Lỗi ở bất kỳ bước nào → rollback hết.
 */
export async function approveTransferRequest(id: string, input: ApproveTransferInput, opts: { today?: string } = {}) {
  const baseToday = opts.today ?? todayInVietnam();
  // Ngày đổi phòng = hôm nay, nhưng không sớm hơn ngày bắt đầu hợp đồng (gán lại sau khi đọc hợp đồng)
  let transferDate = baseToday;
  const oldElectricFinal = readingNumber(input.oldElectricFinal, 'chỉ số điện chốt phòng cũ');
  const oldWaterFinal = readingNumber(input.oldWaterFinal, 'chỉ số nước chốt phòng cũ');
  const newElectricStart = readingNumber(input.newElectricStart, 'chỉ số điện ban đầu phòng mới');
  const newWaterStart = readingNumber(input.newWaterStart, 'chỉ số nước ban đầu phòng mới');

  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.roomTransferRequest.findUnique({ where: { id } });
    if (!request) throw new Error('TRANSFER_NOT_FOUND: Không tìm thấy yêu cầu đổi phòng.');
    if (nextTransferStatus(request.status as RoomTransferStatus, 'APPROVE') === null) {
      throw new Error('TRANSFER_NOT_PENDING: Yêu cầu đổi phòng này đã được xử lý trước đó.');
    }
    const contract = await loadContract(tx, request.fromContractId);
    transferDate = effectiveTransferDate(baseToday, contract.startDate);
    const toRoom = await tx.room.findUnique({ where: { id: request.toRoomId } });
    const targetCheck = checkTransferTarget(contractFacts(contract), toRoom);
    if (!targetCheck.ok) throw new Error(`${targetCheck.code}: ${targetCheck.message}`);
    const dateCheck = checkTransferDate(transferDate, contract);
    if (!dateCheck.ok) throw new Error(`${dateCheck.code}: ${dateCheck.message}`);
    const room = toRoom!;

    const pendingCheckout = await tx.handover.findFirst({
      where: { contractId: contract.id, type: 'CHECK_OUT', landlordConfirmed: false, status: { not: 'CONFIRMED' } },
      select: { id: true },
    });
    if (pendingCheckout) {
      throw new Error(
        'TRANSFER_NOT_ALLOWED: Khách đang có yêu cầu trả phòng chờ xác nhận. Vui lòng xử lý yêu cầu trả phòng hoặc từ chối yêu cầu đổi phòng.'
      );
    }

    const previous =
      input.oldElectricPrev !== undefined && input.oldElectricPrev !== null &&
      input.oldWaterPrev !== undefined && input.oldWaterPrev !== null
        ? {
            electric: readingNumber(input.oldElectricPrev, 'chỉ số điện kỳ trước'),
            water: readingNumber(input.oldWaterPrev, 'chỉ số nước kỳ trước'),
          }
        : await findPreviousReadings(tx, contract);
    if (!previous) {
      throw new Error('INVALID_TRANSFER: Chưa có chỉ số điện nước kỳ trước của phòng cũ. Vui lòng nhập tay.');
    }
    const monthAlreadyBilled = await isTransferMonthBilled(tx, contract, transferDate);
    const newDeposit = depositForRoom(room);
    const settlement: TransferSettlement = computeTransferSettlement({
      oldRent: contract.monthlyRent,
      newRent: room.price,
      oldDeposit: contract.depositAmount,
      newDeposit,
      transferDate,
      monthAlreadyBilled,
      readings: {
        electricPrev: previous.electric,
        electricFinal: oldElectricFinal,
        waterPrev: previous.water,
        waterFinal: oldWaterFinal,
      },
      rates: { electricityRate: contract.room.electricityRate, waterRate: contract.room.waterRate },
      damageCost: input.damageCost ?? 0,
      contractStartDate: contract.startDate,
    });

    // 1. Khóa yêu cầu: chỉ một lần duyệt thành công
    const claimed = await tx.roomTransferRequest.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'APPROVED', pendingKey: null, decidedAt: new Date() },
    });
    if (claimed.count !== 1) throw new Error('TRANSFER_NOT_PENDING: Yêu cầu đổi phòng này đã được xử lý trước đó.');

    // 2. Khóa phòng mới: chỉ phòng còn trống, tin đã duyệt, cùng chủ trọ
    const rented = await tx.room.updateMany({
      where: { id: room.id, status: 'AVAILABLE', listingStatus: 'APPROVED', landlordId: contract.room.landlordId },
      data: { status: 'RENTED' },
    });
    if (rented.count !== 1) {
      throw new Error('ROOM_NOT_AVAILABLE: Phòng muốn chuyển sang vừa có người đặt. Vui lòng từ chối yêu cầu hoặc báo khách chọn phòng khác.');
    }

    // 3. Thanh lý hợp đồng cũ (phòng cũ về Còn trống / Đã đặt lịch)
    const ended = await endActiveContractInTx(tx, contract.id);
    if (!ended) throw new Error('CONTRACT_NOT_FOUND: Không tìm thấy hợp đồng cần chuyển.');

    // 4. Hợp đồng nối tiếp ở phòng mới: giữ nguyên ngày hết hạn, giá và cọc theo phòng mới
    const newContract = await tx.contract.create({
      data: {
        roomId: room.id,
        roomTitle: room.title,
        tenantName: contract.tenantName,
        tenantPhone: contract.tenantPhone,
        tenantCitizenId: contract.tenantCitizenId,
        tenantAddress: contract.tenantAddress,
        vehicleCount: contract.vehicleCount,
        landlordName: contract.landlordName || room.landlordName,
        startDate: transferDate,
        endDate: contract.endDate,
        monthlyRent: room.price,
        depositAmount: newDeposit,
        status: 'ACTIVE',
      },
    });

    // 5. Biên bản trả phòng cũ (chủ trọ đã ký, khách ký sau)
    const handoverDate = new Date(`${transferDate}T00:00:00.000Z`);
    const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} đ`;
    await tx.handover.create({
      data: {
        contractId: contract.id,
        roomId: contract.roomId,
        type: 'CHECK_OUT',
        tenantName: contract.tenantName,
        tenantPhone: contract.tenantPhone,
        landlordName: contract.landlordName,
        status: 'PENDING_CONFIRMATION',
        tenantConfirmed: false,
        landlordConfirmed: true,
        damageCost: settlement.damageCost,
        handoverDate,
        notes: `[ĐỔI PHÒNG] Biên bản trả phòng ${contract.room.roomCode} để chuyển sang phòng ${room.roomCode} ngày ${transferDate}. Chỉ số điện cuối ${oldElectricFinal} kWh (kỳ trước ${previous.electric}). Chỉ số nước cuối ${oldWaterFinal} m³ (kỳ trước ${previous.water}). Chi phí hư hỏng: ${vnd(settlement.damageCost)}. Tiền cọc ${vnd(contract.depositAmount)} chuyển sang hợp đồng mới tại phòng ${room.roomCode}.`,
      },
    });

    // 6. Biên bản nhận phòng mới: chỉ số ban đầu ghi đúng mẫu để lập hóa đơn kỳ sau tự lấy
    const templates = await tx.assetTemplate.findMany({ where: { roomId: room.id } });
    const assetItems = templates.length
      ? templates.map((t) => ({ assetName: t.name, category: t.category, quantity: t.quantity, condition: 'Tốt' }))
      : DEFAULT_HANDOVER_ITEMS;
    await tx.handover.create({
      data: {
        contractId: newContract.id,
        roomId: room.id,
        type: 'CHECK_IN',
        tenantName: contract.tenantName,
        tenantPhone: contract.tenantPhone,
        landlordName: newContract.landlordName,
        status: 'PENDING_CONFIRMATION',
        tenantConfirmed: false,
        landlordConfirmed: true,
        damageCost: 0,
        handoverDate,
        notes: `Bàn giao nhận phòng ngày ${transferDate} (đổi phòng từ ${contract.room.roomCode}). Chỉ số điện ban đầu: ${newElectricStart} kWh. Chỉ số nước ban đầu: ${newWaterStart} m³. Số lượng xe: ${contract.vehicleCount}.`,
        items: {
          create: [
            { assetName: `Đồng hồ điện (Chỉ số: ${newElectricStart} kWh)`, category: 'Điện lực', quantity: 1, condition: 'Hoạt động bình thường' },
            { assetName: `Đồng hồ nước (Chỉ số: ${newWaterStart} m³)`, category: 'Nước sinh hoạt', quantity: 1, condition: 'Không rò rỉ' },
            ...assetItems,
          ],
        },
      },
    });

    // 7. Bảng quyết toán
    const updated = await tx.roomTransferRequest.update({
      where: { id },
      data: {
        newContractId: newContract.id,
        transferDate,
        oldRent: contract.monthlyRent,
        newRent: room.price,
        oldDeposit: contract.depositAmount,
        newDeposit,
        depositDiff: settlement.depositDiff,
        rentDiff: settlement.rentDiff,
        remainingDays: settlement.remainingDays,
        daysInMonth: settlement.daysInMonth,
        monthAlreadyBilled,
        oldElectricPrev: previous.electric,
        oldElectricFinal,
        oldWaterPrev: previous.water,
        oldWaterFinal,
        newElectricStart,
        newWaterStart,
        utilityCost: settlement.utilityCost,
        damageCost: settlement.damageCost,
        totalDiff: settlement.totalDiff,
        settlementStatus: initialSettlementStatus(settlement.totalDiff),
      },
      include: transferInclude,
    });

    return { request: updated, oldContract: ended.contract, oldRoomStatus: ended.roomStatus, newContract, settlement };
  });

  invalidateRoomsCache();
  publishRoomEvent('contract', result.oldContract.roomId);
  publishRoomEvent('contract', result.newContract.roomId);
  return {
    view: mapTransfer(result.request, result.newContract.endDate),
    oldContract: result.oldContract,
    newContract: result.newContract,
    oldRoomStatus: result.oldRoomStatus,
    settlement: result.settlement,
  };
}

// ------------------------------------------------------------
// Thanh toán chênh lệch (giả lập)
// ------------------------------------------------------------
export async function updateTransferSettlement(
  id: string,
  action: 'REPORT_PAYMENT' | 'CONFIRM',
  actor: 'TENANT' | 'LANDLORD',
  transactionCode?: string | null
) {
  const request = await prisma.roomTransferRequest.findUnique({ where: { id } });
  if (!request) throw new Error('TRANSFER_NOT_FOUND: Không tìm thấy yêu cầu đổi phòng.');
  if (request.status !== 'APPROVED' || request.totalDiff === null) {
    throw new Error('TRANSFER_NOT_ALLOWED: Yêu cầu đổi phòng chưa được duyệt nên chưa có khoản chênh lệch.');
  }
  const current = request.settlementStatus as TransferSettlementStatus;
  const next = nextSettlementStatus(current, action, directionOf(request.totalDiff), actor);
  if (!next) {
    throw new Error(
      action === 'REPORT_PAYMENT'
        ? 'TRANSFER_NOT_ALLOWED: Khoản chênh lệch này không cần bạn chuyển khoản hoặc đã được đối soát.'
        : 'TRANSFER_NOT_ALLOWED: Khoản chênh lệch này đã được xác nhận trước đó.'
    );
  }
  const changed = await prisma.roomTransferRequest.updateMany({
    where: { id, settlementStatus: current },
    data:
      action === 'REPORT_PAYMENT'
        ? { settlementStatus: next, settlementTxCode: transactionCode || null, settlementReportedAt: new Date() }
        : { settlementStatus: next, settledAt: new Date() },
  });
  if (changed.count !== 1) {
    throw new Error('TRANSFER_CHANGED: Trạng thái thanh toán vừa thay đổi. Vui lòng tải lại.');
  }
  const view = await getTransferRequestById(id);
  if (view) publishRoomEvent('contract', view.to_room_id);
  return view;
}
