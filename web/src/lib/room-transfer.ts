/**
 * Nghiệp vụ ĐỔI PHÒNG (dùng được cả ở máy chủ lẫn trình duyệt, không đụng CSDL).
 *
 * Khách đứng tên hợp đồng ACTIVE xin chuyển sang một phòng Còn trống, tin đã duyệt của CÙNG chủ trọ.
 * Chủ trọ duyệt → hợp đồng cũ thanh lý, hợp đồng nối tiếp ở phòng mới giữ nguyên NGÀY HẾT HẠN cũ,
 * giá thuê và tiền cọc theo phòng mới. Phần chênh lệch (số dương: khách trả thêm, số âm: chủ trọ hoàn):
 *   1. Cọc: cọc phòng mới − cọc đang giữ trên hợp đồng cũ.
 *   2. Tiền thuê tháng chuyển, tính theo ngày (ngày chuyển tính là ngày ở phòng mới):
 *      - Phòng cũ ĐÃ lập hóa đơn tháng này (trọn tháng giá cũ): (giá mới − giá cũ) × ngày còn lại / số ngày của tháng.
 *      - Phòng cũ CHƯA lập hóa đơn tháng này: giá cũ × ngày đã ở + giá mới × ngày còn lại (chia số ngày của tháng),
 *        vì sau khi đổi phòng không lập hóa đơn cho phòng cũ được nữa.
 *      Kỳ hóa đơn đầu tiên của phòng mới là tháng SAU tháng chuyển.
 *   3. Tiền điện nước phòng cũ chưa lập hóa đơn: (chỉ số chốt − chỉ số kỳ trước) × đơn giá phòng cũ.
 *   4. Chi phí hư hỏng tài sản phòng cũ (nếu có).
 */

export type RoomTransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type TransferSettlementStatus = 'NONE' | 'UNPAID' | 'PENDING_CONFIRMATION' | 'SETTLED';
export type TransferDirection = 'TENANT_PAYS' | 'LANDLORD_REFUNDS' | 'NONE';

export const TRANSFER_STATUS_LABELS: Record<RoomTransferStatus, string> = {
  PENDING: 'Chờ chủ trọ duyệt',
  APPROVED: 'Đã đổi phòng',
  REJECTED: 'Chủ trọ từ chối',
  CANCELLED: 'Đã hủy yêu cầu',
};

export const SETTLEMENT_STATUS_LABELS: Record<TransferSettlementStatus, string> = {
  NONE: 'Không có chênh lệch',
  UNPAID: 'Chưa thanh toán',
  PENDING_CONFIRMATION: 'Chờ chủ trọ đối soát',
  SETTLED: 'Đã thanh toán xong',
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad = (n: number) => String(n).padStart(2, '0');

function parseIso(isoDate: string) {
  const match = ISO_DATE.exec(String(isoDate || '').slice(0, 10));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dim = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > dim) return null;
  return { year, month, day, daysInMonth: dim };
}

/** Hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD (máy chủ có thể chạy múi giờ khác). */
export function todayInVietnam(now = new Date()): string {
  const shifted = new Date(now.getTime() + 7 * 3600 * 1000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** Tiền cọc của phòng mới: cột deposit, chưa khai báo thì bằng một tháng tiền thuê (giống check-in). */
export function depositForRoom(room: { price: number; deposit?: number | null }): number {
  const deposit = Number(room.deposit);
  return Number.isFinite(deposit) && deposit > 0 ? deposit : Number(room.price) || 0;
}

/**
 * Ngày đổi phòng thực tế khi chủ trọ duyệt: hôm nay, nhưng không sớm hơn ngày bắt đầu hợp đồng.
 * Khách chưa tới ngày nhận phòng mà xin đổi thì việc đổi diễn ra đúng ngày nhận phòng.
 */
export function effectiveTransferDate(today: string, contractStartDate: string): string {
  const start = String(contractStartDate || '').slice(0, 10);
  return parseIso(start) && start > today ? start : today;
}

/**
 * Ngày đầu tiên của tháng chuyển mà khách thực sự ở phòng cũ: ngày 1, hoặc ngày bắt đầu hợp đồng
 * nếu hợp đồng bắt đầu ngay trong tháng chuyển (không tính tiền những ngày chưa vào ở).
 */
function firstOccupiedDayInMonth(transferDate: string, contractStartDate?: string | null): number {
  const transfer = parseIso(transferDate);
  const start = contractStartDate ? parseIso(String(contractStartDate).slice(0, 10)) : null;
  if (!transfer || !start) return 1;
  return start.year === transfer.year && start.month === transfer.month ? start.day : 1;
}

/** Số ngày còn lại của tháng tính cả ngày chuyển, và số ngày của tháng. */
export function remainingDaysInMonth(isoDate: string): { remainingDays: number; daysInMonth: number } {
  const parsed = parseIso(isoDate);
  if (!parsed) throw new Error(`INVALID_TRANSFER: Ngày chuyển phòng "${isoDate}" không hợp lệ.`);
  return { remainingDays: parsed.daysInMonth - parsed.day + 1, daysInMonth: parsed.daysInMonth };
}

/** Kỳ hóa đơn (MM/YYYY) chứa ngày cho trước. */
export function billMonthOf(isoDate: string): string {
  const parsed = parseIso(isoDate);
  if (!parsed) throw new Error(`INVALID_TRANSFER: Ngày "${isoDate}" không hợp lệ.`);
  return `${pad(parsed.month)}/${parsed.year}`;
}

/** Kỳ hóa đơn kế tiếp sau ngày cho trước (kỳ đầu tiên của phòng mới). */
export function nextBillMonthOf(isoDate: string): string {
  const parsed = parseIso(isoDate);
  if (!parsed) throw new Error(`INVALID_TRANSFER: Ngày "${isoDate}" không hợp lệ.`);
  return parsed.month === 12 ? `01/${parsed.year + 1}` : `${pad(parsed.month + 1)}/${parsed.year}`;
}

export interface TransferMeterReadings {
  electricPrev: number;
  electricFinal: number;
  waterPrev: number;
  waterFinal: number;
}

export interface TransferSettlementInput {
  oldRent: number;
  newRent: number;
  oldDeposit: number;
  newDeposit: number;
  /** Ngày bàn giao thực tế YYYY-MM-DD */
  transferDate: string;
  /** Phòng cũ đã lập hóa đơn của tháng chuyển (tiền thuê trọn tháng theo giá cũ) */
  monthAlreadyBilled: boolean;
  /** Chỉ số điện nước phòng cũ; null = chưa có (ước tính khi khách gửi yêu cầu) */
  readings?: TransferMeterReadings | null;
  rates?: { electricityRate: number; waterRate: number } | null;
  damageCost?: number | null;
  /** Ngày bắt đầu hợp đồng cũ: đổi phòng ngay trong tháng đầu thì không tính tiền những ngày trước đó */
  contractStartDate?: string | null;
}

export interface TransferSettlement {
  depositDiff: number;
  rentDiff: number;
  remainingDays: number;
  daysInMonth: number;
  monthAlreadyBilled: boolean;
  utilityIncluded: boolean;
  electricUsed: number;
  waterUsed: number;
  electricCost: number;
  waterCost: number;
  utilityCost: number;
  damageCost: number;
  totalDiff: number;
  direction: TransferDirection;
}

const money = (value: unknown, label: string) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`INVALID_TRANSFER: ${label} không hợp lệ.`);
  return n;
};

export function directionOf(totalDiff: number): TransferDirection {
  if (totalDiff > 0) return 'TENANT_PAYS';
  if (totalDiff < 0) return 'LANDLORD_REFUNDS';
  return 'NONE';
}

/** Tính bảng quyết toán đổi phòng. Ném "INVALID_TRANSFER: …" khi số liệu sai. */
export function computeTransferSettlement(input: TransferSettlementInput): TransferSettlement {
  const oldRent = money(input.oldRent, 'Giá thuê phòng cũ');
  const newRent = money(input.newRent, 'Giá thuê phòng mới');
  const oldDeposit = money(input.oldDeposit, 'Tiền cọc đang giữ');
  const newDeposit = money(input.newDeposit, 'Tiền cọc phòng mới');
  const damageCost = Math.round(money(input.damageCost ?? 0, 'Chi phí hư hỏng'));
  const { remainingDays, daysInMonth } = remainingDaysInMonth(input.transferDate);
  const transferDay = daysInMonth - remainingDays + 1;
  // Số ngày đã ở phòng cũ trong tháng chuyển, tính từ ngày vào ở (không phải luôn từ ngày 1)
  const daysStayed = Math.max(0, transferDay - firstOccupiedDayInMonth(input.transferDate, input.contractStartDate));

  const depositDiff = Math.round(newDeposit - oldDeposit);
  const rentDiff = input.monthAlreadyBilled
    ? Math.round(((newRent - oldRent) * remainingDays) / daysInMonth)
    : Math.round((oldRent * daysStayed + newRent * remainingDays) / daysInMonth);

  let electricUsed = 0;
  let waterUsed = 0;
  let electricCost = 0;
  let waterCost = 0;
  const readings = input.readings ?? null;
  if (readings) {
    const electricPrev = money(readings.electricPrev, 'Chỉ số điện kỳ trước');
    const electricFinal = money(readings.electricFinal, 'Chỉ số điện chốt');
    const waterPrev = money(readings.waterPrev, 'Chỉ số nước kỳ trước');
    const waterFinal = money(readings.waterFinal, 'Chỉ số nước chốt');
    if (electricFinal < electricPrev) {
      throw new Error('INVALID_TRANSFER: Chỉ số điện chốt phòng cũ phải lớn hơn hoặc bằng chỉ số kỳ trước.');
    }
    if (waterFinal < waterPrev) {
      throw new Error('INVALID_TRANSFER: Chỉ số nước chốt phòng cũ phải lớn hơn hoặc bằng chỉ số kỳ trước.');
    }
    const electricityRate = money(input.rates?.electricityRate ?? 0, 'Đơn giá điện');
    const waterRate = money(input.rates?.waterRate ?? 0, 'Đơn giá nước');
    electricUsed = Number((electricFinal - electricPrev).toFixed(2));
    waterUsed = Number((waterFinal - waterPrev).toFixed(2));
    electricCost = Math.round(electricUsed * electricityRate);
    waterCost = Math.round(waterUsed * waterRate);
  }
  const utilityCost = electricCost + waterCost;
  const totalDiff = depositDiff + rentDiff + utilityCost + damageCost;

  return {
    depositDiff,
    rentDiff,
    remainingDays,
    daysInMonth,
    monthAlreadyBilled: input.monthAlreadyBilled,
    utilityIncluded: Boolean(readings),
    electricUsed,
    waterUsed,
    electricCost,
    waterCost,
    utilityCost,
    damageCost,
    totalDiff,
    direction: directionOf(totalDiff),
  };
}

// ------------------------------------------------------------
// Điều kiện đổi phòng
// ------------------------------------------------------------
export type TransferCheck = { ok: true } | { ok: false; code: string; message: string };

export interface TransferContractFacts {
  status: string;
  roomId: number;
  startDate: string;
  endDate: string;
  landlordId: string;
}

export interface TransferTargetFacts {
  id: number;
  landlordId: string;
  status: string;
  listingStatus: string;
}

/** Phòng đích: khác phòng hiện tại, cùng chủ trọ, tin đã duyệt, đang Còn trống. */
export function checkTransferTarget(
  contract: TransferContractFacts,
  target: TransferTargetFacts | null | undefined
): TransferCheck {
  if (contract.status !== 'ACTIVE') {
    return { ok: false, code: 'CONTRACT_NOT_ACTIVE', message: 'Hợp đồng đã kết thúc nên không thể đổi phòng.' };
  }
  if (!target) return { ok: false, code: 'ROOM_NOT_FOUND', message: 'Không tìm thấy phòng muốn chuyển sang.' };
  if (target.id === contract.roomId) {
    return { ok: false, code: 'INVALID_TRANSFER', message: 'Phòng muốn chuyển sang trùng với phòng đang thuê.' };
  }
  if (target.landlordId !== contract.landlordId) {
    return { ok: false, code: 'TRANSFER_NOT_ALLOWED', message: 'Chỉ được đổi sang phòng của cùng chủ trọ.' };
  }
  if (target.listingStatus !== 'APPROVED') {
    return { ok: false, code: 'TRANSFER_NOT_ALLOWED', message: 'Tin đăng của phòng này chưa được duyệt.' };
  }
  if (target.status !== 'AVAILABLE') {
    return { ok: false, code: 'ROOM_NOT_AVAILABLE', message: 'Phòng này không còn trống. Vui lòng chọn phòng khác.' };
  }
  return { ok: true };
}

/** Ngày chuyển: không trước ngày bắt đầu hợp đồng, phải trước ngày hết hạn (còn thời hạn để chuyển). */
export function checkTransferDate(
  date: string,
  contract: Pick<TransferContractFacts, 'startDate' | 'endDate'>,
  today?: string
): TransferCheck {
  if (!parseIso(date)) return { ok: false, code: 'INVALID_TRANSFER', message: 'Ngày chuyển phòng không hợp lệ.' };
  if (today && date < today) {
    return { ok: false, code: 'INVALID_TRANSFER', message: 'Ngày muốn chuyển không được trước hôm nay.' };
  }
  if (date < contract.startDate.slice(0, 10)) {
    return { ok: false, code: 'INVALID_TRANSFER', message: 'Ngày chuyển phòng không được trước ngày bắt đầu hợp đồng.' };
  }
  if (date >= contract.endDate.slice(0, 10)) {
    return {
      ok: false,
      code: 'INVALID_TRANSFER',
      message: `Hợp đồng hết hạn ngày ${contract.endDate}; ngày chuyển phòng phải trước ngày này.`,
    };
  }
  return { ok: true };
}

// ------------------------------------------------------------
// Trạng thái yêu cầu và thanh toán chênh lệch
// ------------------------------------------------------------
export type TransferAction = 'APPROVE' | 'REJECT' | 'CANCEL';

/** Yêu cầu chỉ được xử lý một lần, khi đang chờ duyệt. null = không hợp lệ. */
export function nextTransferStatus(current: RoomTransferStatus, action: TransferAction): RoomTransferStatus | null {
  if (current !== 'PENDING') return null;
  if (action === 'APPROVE') return 'APPROVED';
  if (action === 'REJECT') return 'REJECTED';
  if (action === 'CANCEL') return 'CANCELLED';
  return null;
}

export function initialSettlementStatus(totalDiff: number): TransferSettlementStatus {
  return Math.round(totalDiff) === 0 ? 'NONE' : 'UNPAID';
}

export type SettlementAction = 'REPORT_PAYMENT' | 'CONFIRM';

/**
 * - Khách báo đã chuyển khoản (chỉ khi khách phải trả thêm): Chưa thanh toán / Chờ đối soát → Chờ đối soát.
 * - Chủ trọ xác nhận đã thu (khách trả thêm) hoặc đã hoàn (chủ trọ hoàn lại): → Đã thanh toán xong.
 */
export function nextSettlementStatus(
  current: TransferSettlementStatus,
  action: SettlementAction,
  direction: TransferDirection,
  actor: 'TENANT' | 'LANDLORD'
): TransferSettlementStatus | null {
  if (direction === 'NONE' || current === 'NONE' || current === 'SETTLED') return null;
  if (action === 'REPORT_PAYMENT') {
    if (actor !== 'TENANT' || direction !== 'TENANT_PAYS') return null;
    return current === 'UNPAID' || current === 'PENDING_CONFIRMATION' ? 'PENDING_CONFIRMATION' : null;
  }
  if (action === 'CONFIRM') {
    if (actor !== 'LANDLORD') return null;
    return current === 'UNPAID' || current === 'PENDING_CONFIRMATION' ? 'SETTLED' : null;
  }
  return null;
}

/** Mã giao dịch khách nhập: 4–64 ký tự chữ, số, gạch. */
export function parseTransactionCode(value: unknown): string | null {
  const code = typeof value === 'string' ? value.trim() : '';
  return /^[A-Za-z0-9][A-Za-z0-9._\-/]{3,63}$/.test(code) ? code : null;
}

/** Hợp đồng nối tiếp do đổi phòng: tiền thuê tháng chuyển đã nằm trong quyết toán, không lập hóa đơn kỳ đó nữa. */
export function isTransferStartMonth(transferDate: string | null | undefined, billMonth: string): boolean {
  if (!transferDate || !parseIso(transferDate)) return false;
  return billMonthOf(transferDate) === billMonth;
}

/**
 * Các phòng thuộc cùng một chuỗi thuê sau những lần đổi phòng đã duyệt (để trang hồ sơ hiện cả hợp đồng
 * cũ lẫn hợp đồng nối tiếp khi khách chọn phòng đã xem ban đầu).
 */
export function expandTransferRooms(
  startRoomIds: Iterable<number>,
  transfers: Array<{ status: string; from_room_id: number; to_room_id: number }>
): Set<number> {
  const rooms = new Set<number>(startRoomIds);
  let grew = true;
  while (grew) {
    grew = false;
    for (const t of transfers) {
      if (t.status !== 'APPROVED') continue;
      if (rooms.has(t.from_room_id) && !rooms.has(t.to_room_id)) {
        rooms.add(t.to_room_id);
        grew = true;
      }
      if (rooms.has(t.to_room_id) && !rooms.has(t.from_room_id)) {
        rooms.add(t.from_room_id);
        grew = true;
      }
    }
  }
  return rooms;
}

// ------------------------------------------------------------
// Dữ liệu trả về cho giao diện (snake_case như các API khác)
// ------------------------------------------------------------
export interface TransferRoomSummary {
  id: number;
  room_code: string;
  title: string;
  price: number;
  deposit: number;
  area?: number;
  room_type?: string;
  address?: string;
  project_name?: string | null;
  image?: string | null;
  electricity_rate?: number;
  water_rate?: number;
}

export interface TransferSettlementView extends TransferSettlement {
  old_rent: number;
  new_rent: number;
  old_deposit: number;
  new_deposit: number;
  old_electric_prev?: number | null;
  old_electric_final?: number | null;
  old_water_prev?: number | null;
  old_water_final?: number | null;
  new_electric_start?: number | null;
  new_water_start?: number | null;
}

export interface RoomTransferView {
  id: string;
  from_contract_id: string;
  from_room_id: number;
  to_room_id: number;
  landlord_id: string;
  tenant_name: string;
  tenant_phone: string;
  desired_date: string;
  note: string | null;
  status: RoomTransferStatus;
  status_label: string;
  reject_reason: string | null;
  created_at: string;
  decided_at: string | null;
  from_room: TransferRoomSummary | null;
  to_room: TransferRoomSummary | null;
  new_contract_id: string | null;
  transfer_date: string | null;
  contract_end_date: string | null;
  settlement: TransferSettlementView | null;
  settlement_status: TransferSettlementStatus;
  settlement_status_label: string;
  settlement_tx_code: string | null;
  settlement_reported_at: string | null;
  settled_at: string | null;
}

export interface TransferOption {
  room: TransferRoomSummary;
  estimate: TransferSettlement;
}

export const formatTransferMoney = (value: number) => `${Math.abs(Math.round(value)).toLocaleString('vi-VN')} đ`;

/** Câu mô tả chiều chênh lệch cho cả hai bên. */
export function describeTransferDiff(totalDiff: number, viewer: 'TENANT' | 'LANDLORD'): string {
  const direction = directionOf(totalDiff);
  if (direction === 'NONE') return 'Không có chênh lệch cần thanh toán.';
  const amount = formatTransferMoney(totalDiff);
  if (direction === 'TENANT_PAYS') {
    return viewer === 'TENANT' ? `Bạn cần trả thêm ${amount} cho chủ trọ.` : `Khách cần trả thêm ${amount}.`;
  }
  return viewer === 'TENANT' ? `Chủ trọ hoàn lại cho bạn ${amount}.` : `Bạn cần hoàn lại cho khách ${amount}.`;
}
