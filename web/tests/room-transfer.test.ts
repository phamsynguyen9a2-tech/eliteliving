/**
 * Kiểm thử nghiệp vụ ĐỔI PHÒNG: tính chênh lệch (cọc, tiền thuê theo ngày, điện nước, hư hỏng), điều kiện
 * phòng đích / ngày chuyển, chuyển trạng thái yêu cầu và thanh toán, và duyệt đổi phòng trên transaction
 * giả (không đụng CSDL thật): hợp đồng nối tiếp giữ nguyên ngày hết hạn, phòng cũ trống, phòng mới đang thuê.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  billMonthOf,
  checkTransferDate,
  checkTransferTarget,
  computeTransferSettlement,
  depositForRoom,
  describeTransferDiff,
  expandTransferRooms,
  initialSettlementStatus,
  isTransferStartMonth,
  nextBillMonthOf,
  nextSettlementStatus,
  nextTransferStatus,
  parseTransactionCode,
  remainingDaysInMonth,
  todayInVietnam,
} from '../src/lib/room-transfer';
import { approveTransferRequest, closeTransferRequest } from '../src/lib/room-transfer-db';
import { lifecycleErrorResponse } from '../src/lib/lifecycle-errors';
import { parseInitialReadings } from '../src/lib/billing';
import prisma from '../src/lib/prisma';

// ------------------------------------------------------------
// Tính chênh lệch
// ------------------------------------------------------------
const base = {
  oldRent: 3_000_000,
  newRent: 3_500_000,
  oldDeposit: 3_000_000,
  newDeposit: 3_500_000,
  transferDate: '2026-11-20',
  monthAlreadyBilled: true,
};

test('phòng mới đắt hơn: khách trả thêm chênh lệch cọc + tiền thuê những ngày còn lại của tháng', () => {
  const s = computeTransferSettlement(base);
  assert.equal(s.depositDiff, 500_000);
  // Tháng 11 có 30 ngày, chuyển ngày 20 → ở phòng mới 11 ngày (20..30)
  assert.equal(s.remainingDays, 11);
  assert.equal(s.daysInMonth, 30);
  assert.equal(s.rentDiff, Math.round((500_000 * 11) / 30)); // 183.333
  assert.equal(s.utilityIncluded, false);
  assert.equal(s.totalDiff, 500_000 + 183_333);
  assert.equal(s.direction, 'TENANT_PAYS');
});

test('phòng mới rẻ hơn: chủ trọ hoàn lại (tổng âm)', () => {
  const s = computeTransferSettlement({ ...base, newRent: 2_400_000, newDeposit: 2_400_000 });
  assert.equal(s.depositDiff, -600_000);
  assert.equal(s.rentDiff, Math.round((-600_000 * 11) / 30));
  assert.ok(s.totalDiff < 0);
  assert.equal(s.direction, 'LANDLORD_REFUNDS');
  assert.equal(describeTransferDiff(s.totalDiff, 'TENANT'), `Chủ trọ hoàn lại cho bạn ${Math.abs(s.totalDiff).toLocaleString('vi-VN')} đ.`);
});

test('cùng giá cùng cọc, không điện nước: không có chênh lệch', () => {
  const s = computeTransferSettlement({ ...base, newRent: 3_000_000, newDeposit: 3_000_000 });
  assert.equal(s.totalDiff, 0);
  assert.equal(s.direction, 'NONE');
  assert.equal(initialSettlementStatus(s.totalDiff), 'NONE');
  assert.equal(initialSettlementStatus(683_333), 'UNPAID');
});

test('phòng cũ chưa lập hóa đơn tháng chuyển: tính trọn tiền thuê tháng theo ngày ở mỗi phòng', () => {
  const s = computeTransferSettlement({ ...base, monthAlreadyBilled: false });
  // 19 ngày ở phòng cũ giá cũ + 11 ngày phòng mới giá mới
  assert.equal(s.rentDiff, Math.round((3_000_000 * 19 + 3_500_000 * 11) / 30));
  assert.equal(s.totalDiff, 500_000 + s.rentDiff);
});

test('điện nước phòng cũ chưa lập hóa đơn và hư hỏng được cộng vào quyết toán', () => {
  const s = computeTransferSettlement({
    ...base,
    readings: { electricPrev: 1200, electricFinal: 1260.5, waterPrev: 40, waterFinal: 43 },
    rates: { electricityRate: 3800, waterRate: 25000 },
    damageCost: 150_000,
  });
  assert.equal(s.electricUsed, 60.5);
  assert.equal(s.electricCost, Math.round(60.5 * 3800));
  assert.equal(s.waterCost, 75_000);
  assert.equal(s.utilityCost, s.electricCost + s.waterCost);
  assert.equal(s.damageCost, 150_000);
  assert.equal(s.totalDiff, s.depositDiff + s.rentDiff + s.utilityCost + 150_000);
});

test('chỉ số / số tiền sai bị từ chối với mã INVALID_TRANSFER', () => {
  assert.throws(
    () => computeTransferSettlement({ ...base, readings: { electricPrev: 100, electricFinal: 90, waterPrev: 1, waterFinal: 2 }, rates: { electricityRate: 1, waterRate: 1 } }),
    /^Error: INVALID_TRANSFER:/
  );
  assert.throws(() => computeTransferSettlement({ ...base, damageCost: -1 }), /INVALID_TRANSFER/);
  assert.throws(() => computeTransferSettlement({ ...base, transferDate: '2026-02-30' }), /INVALID_TRANSFER/);
});

test('số ngày còn lại tính cả ngày chuyển; tháng 2 năm nhuận; kỳ hóa đơn kế tiếp qua năm', () => {
  assert.deepEqual(remainingDaysInMonth('2026-11-01'), { remainingDays: 30, daysInMonth: 30 });
  assert.deepEqual(remainingDaysInMonth('2026-12-31'), { remainingDays: 1, daysInMonth: 31 });
  assert.deepEqual(remainingDaysInMonth('2028-02-10'), { remainingDays: 20, daysInMonth: 29 });
  assert.equal(billMonthOf('2026-11-20'), '11/2026');
  assert.equal(nextBillMonthOf('2026-12-05'), '01/2027');
  assert.equal(isTransferStartMonth('2026-11-20', '11/2026'), true);
  assert.equal(isTransferStartMonth('2026-11-20', '12/2026'), false);
  assert.equal(isTransferStartMonth(null, '11/2026'), false);
});

test('cọc phòng mới: lấy cột deposit, chưa khai báo thì bằng một tháng tiền thuê', () => {
  assert.equal(depositForRoom({ price: 3_500_000, deposit: 4_000_000 }), 4_000_000);
  assert.equal(depositForRoom({ price: 3_500_000, deposit: 0 }), 3_500_000);
});

test('hôm nay theo giờ Việt Nam (UTC+7)', () => {
  assert.equal(todayInVietnam(new Date('2026-11-19T18:30:00Z')), '2026-11-20');
  assert.equal(todayInVietnam(new Date('2026-11-19T16:59:00Z')), '2026-11-19');
});

// ------------------------------------------------------------
// Điều kiện đổi phòng
// ------------------------------------------------------------
const activeContract = { status: 'ACTIVE', roomId: 101, startDate: '2026-06-01', endDate: '2027-05-31', landlordId: 'll_1' };
const freeRoom = { id: 102, landlordId: 'll_1', status: 'AVAILABLE', listingStatus: 'APPROVED' };

test('chỉ đổi sang phòng trống, tin đã duyệt, cùng chủ trọ, khác phòng hiện tại', () => {
  assert.equal(checkTransferTarget(activeContract, freeRoom).ok, true);
  const cases: Array<[unknown, string]> = [
    [{ ...freeRoom, landlordId: 'll_2' }, 'TRANSFER_NOT_ALLOWED'],
    [{ ...freeRoom, listingStatus: 'PENDING' }, 'TRANSFER_NOT_ALLOWED'],
    [{ ...freeRoom, status: 'RESERVED' }, 'ROOM_NOT_AVAILABLE'],
    [{ ...freeRoom, status: 'BOOKED_VIEWING' }, 'ROOM_NOT_AVAILABLE'],
    [{ ...freeRoom, id: 101 }, 'INVALID_TRANSFER'],
    [null, 'ROOM_NOT_FOUND'],
  ];
  for (const [target, code] of cases) {
    const check = checkTransferTarget(activeContract, target as typeof freeRoom);
    assert.equal(check.ok, false);
    if (!check.ok) assert.equal(check.code, code, JSON.stringify(target));
  }
  const ended = checkTransferTarget({ ...activeContract, status: 'TERMINATED' }, freeRoom);
  assert.equal(ended.ok, false);
  if (!ended.ok) assert.equal(ended.code, 'CONTRACT_NOT_ACTIVE');
});

test('ngày chuyển phải từ hôm nay, trong thời hạn và trước ngày hết hạn hợp đồng', () => {
  assert.equal(checkTransferDate('2026-11-20', activeContract, '2026-11-08').ok, true);
  assert.equal(checkTransferDate('2026-11-01', activeContract, '2026-11-08').ok, false);
  assert.equal(checkTransferDate('2027-05-31', activeContract).ok, false);
  assert.equal(checkTransferDate('2026-05-31', activeContract).ok, false);
  assert.equal(checkTransferDate('20/11/2026', activeContract).ok, false);
});

// ------------------------------------------------------------
// Trạng thái yêu cầu và thanh toán chênh lệch
// ------------------------------------------------------------
test('yêu cầu chỉ được duyệt / từ chối / hủy khi đang chờ', () => {
  assert.equal(nextTransferStatus('PENDING', 'APPROVE'), 'APPROVED');
  assert.equal(nextTransferStatus('PENDING', 'REJECT'), 'REJECTED');
  assert.equal(nextTransferStatus('PENDING', 'CANCEL'), 'CANCELLED');
  for (const done of ['APPROVED', 'REJECTED', 'CANCELLED'] as const) {
    assert.equal(nextTransferStatus(done, 'APPROVE'), null, done);
    assert.equal(nextTransferStatus(done, 'CANCEL'), null, done);
  }
});

test('thanh toán chênh lệch: khách báo chuyển khoản khi phải trả thêm, chủ trọ xác nhận / hoàn', () => {
  assert.equal(nextSettlementStatus('UNPAID', 'REPORT_PAYMENT', 'TENANT_PAYS', 'TENANT'), 'PENDING_CONFIRMATION');
  assert.equal(nextSettlementStatus('PENDING_CONFIRMATION', 'REPORT_PAYMENT', 'TENANT_PAYS', 'TENANT'), 'PENDING_CONFIRMATION');
  assert.equal(nextSettlementStatus('PENDING_CONFIRMATION', 'CONFIRM', 'TENANT_PAYS', 'LANDLORD'), 'SETTLED');
  assert.equal(nextSettlementStatus('UNPAID', 'CONFIRM', 'LANDLORD_REFUNDS', 'LANDLORD'), 'SETTLED');
  // Không hợp lệ
  assert.equal(nextSettlementStatus('UNPAID', 'REPORT_PAYMENT', 'LANDLORD_REFUNDS', 'TENANT'), null);
  assert.equal(nextSettlementStatus('UNPAID', 'CONFIRM', 'TENANT_PAYS', 'TENANT'), null);
  assert.equal(nextSettlementStatus('SETTLED', 'CONFIRM', 'TENANT_PAYS', 'LANDLORD'), null);
  assert.equal(nextSettlementStatus('NONE', 'CONFIRM', 'NONE', 'LANDLORD'), null);
});

test('mã giao dịch hợp lệ', () => {
  assert.equal(parseTransactionCode(' SIM-DP-2611201030-AB12 '), 'SIM-DP-2611201030-AB12');
  assert.equal(parseTransactionCode('FT2632412345'), 'FT2632412345');
  for (const bad of ['', 'ab', '<script>', null, 12345]) assert.equal(parseTransactionCode(bad), null, String(bad));
});

test('chuỗi phòng sau các lần đổi phòng đã duyệt', () => {
  const transfers = [
    { status: 'APPROVED', from_room_id: 1, to_room_id: 2 },
    { status: 'APPROVED', from_room_id: 2, to_room_id: 3 },
    { status: 'REJECTED', from_room_id: 3, to_room_id: 4 },
  ];
  assert.deepEqual([...expandTransferRooms([1], transfers)].sort(), [1, 2, 3]);
  assert.deepEqual([...expandTransferRooms([3], transfers)].sort(), [1, 2, 3]);
  assert.deepEqual([...expandTransferRooms([9], transfers)], [9]);
});

test('lỗi đổi phòng được chuyển thành mã HTTP', () => {
  assert.equal(lifecycleErrorResponse(new Error('TRANSFER_DUPLICATE: Đã có yêu cầu.'))?.status, 409);
  assert.equal(lifecycleErrorResponse(new Error('TRANSFER_NOT_PENDING: Đã xử lý.'))?.status, 409);
  assert.equal(lifecycleErrorResponse(new Error('INVALID_TRANSFER: Sai số liệu.'))?.status, 400);
  assert.equal(lifecycleErrorResponse(new Error('TRANSFER_NOT_FOUND: Không thấy.'))?.status, 404);
});

// ------------------------------------------------------------
// Duyệt đổi phòng trên transaction giả (không đụng CSDL thật)
// ------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dòng giả của CSDL, kiểu tự do
type Row = Record<string, any>;
const transactionHost = prisma as unknown as { $transaction: unknown; roomTransferRequest: unknown };

function matchWhere(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'OR') return (cond as Row[]).some((c) => matchWhere(row, c));
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('in' in cond) return cond.in.includes(row[key]);
      if ('not' in cond) return row[key] !== cond.not;
    }
    return (row[key] ?? null) === cond;
  });
}

function fakeDb() {
  const roomRow = (id: number, extra: Row = {}) => ({
    id,
    roomCode: `P${id}`,
    title: `Phòng ${id}`,
    price: 3_000_000,
    deposit: 3_000_000,
    area: 25,
    roomType: 'Studio',
    address: '140 Lê Trọng Tấn',
    projectName: 'Elite Tân Phú',
    images: [],
    status: 'AVAILABLE',
    listingStatus: 'APPROVED',
    landlordId: 'll_1',
    landlordName: 'Chủ trọ A',
    electricityRate: 3800,
    waterRate: 25000,
    ...extra,
  });
  const rooms: Row[] = [
    roomRow(101, { status: 'RENTED' }),
    roomRow(102, { price: 3_500_000, deposit: 3_500_000 }),
  ];
  const contracts: Row[] = [
    {
      id: 'c_old',
      roomId: 101,
      roomTitle: 'Phòng 101',
      tenantName: 'Nguyễn Văn B',
      tenantPhone: '0901234567',
      tenantCitizenId: '079123456789',
      tenantAddress: 'TP.HCM',
      vehicleCount: 1,
      landlordName: 'Chủ trọ A',
      startDate: '2026-06-01',
      endDate: '2027-05-31',
      monthlyRent: 3_000_000,
      depositAmount: 3_000_000,
      status: 'ACTIVE',
      createdAt: new Date('2026-06-01T00:00:00Z'),
    },
  ];
  const handovers: Row[] = [
    { id: 'h_in', contractId: 'c_old', roomId: 101, type: 'CHECK_IN', landlordConfirmed: true, status: 'CONFIRMED', notes: 'Chỉ số điện ban đầu: 1000 kWh. Chỉ số nước ban đầu: 30 m³.', createdAt: new Date('2026-06-01') },
  ];
  const bills: Row[] = [
    { id: 'b_11', roomId: 101, contractId: 'c_old', month: '11/2026', electricNew: 1200, waterNew: 40, createdAt: new Date('2026-11-01') },
  ];
  const transfers: Row[] = [
    {
      id: 't_1', fromContractId: 'c_old', fromRoomId: 101, toRoomId: 102, landlordId: 'll_1', tenantUserId: 'u_1',
      tenantName: 'Nguyễn Văn B', tenantPhone: '0901234567', desiredDate: '2026-11-20', note: null, status: 'PENDING',
      pendingKey: 'c_old', rejectReason: null, createdAt: new Date('2026-11-10'), decidedAt: null, newContractId: null,
      transferDate: null, totalDiff: null, settlementStatus: 'NONE', settlementTxCode: null, settlementReportedAt: null, settledAt: null,
    },
  ];
  const tables: Record<string, Row[]> = { room: rooms, contract: contracts, handover: handovers, utilityBill: bills, roomTransferRequest: transfers, appointment: [], assetTemplate: [] };

  const withInclude = (name: string, row: Row | undefined, args: Row) => {
    if (!row) return null;
    const out: Row = { ...row };
    if (args.include?.room && name === 'contract') out.room = { ...rooms.find((r) => r.id === row.roomId) };
    if (args.include?.fromRoom) out.fromRoom = { ...rooms.find((r) => r.id === row.fromRoomId) };
    if (args.include?.toRoom) out.toRoom = { ...rooms.find((r) => r.id === row.toRoomId) };
    return out;
  };
  const sorted = (rows: Row[]) => [...rows].sort((a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0));
  const table = (name: string) => {
    const rows = tables[name];
    return {
      findUnique: async (args: Row) => withInclude(name, rows.find((r) => matchWhere(r, args.where)), args),
      findUniqueOrThrow: async (args: Row) => {
        const row = rows.find((r) => matchWhere(r, args.where));
        if (!row) throw new Error('not found');
        return withInclude(name, row, args);
      },
      findFirst: async (args: Row) => withInclude(name, sorted(rows).find((r) => matchWhere(r, args.where)), args),
      findMany: async (args: Row) => rows.filter((r) => matchWhere(r, args.where)).map((r) => withInclude(name, r, args)),
      updateMany: async ({ where, data }: Row) => {
        const hit = rows.filter((r) => matchWhere(r, where));
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      },
      update: async (args: Row) => {
        const row = rows.find((r) => matchWhere(r, args.where));
        if (!row) throw new Error('not found');
        Object.assign(row, args.data);
        return withInclude(name, row, args);
      },
      create: async (args: Row) => {
        const { items, ...data } = args.data;
        const row = { id: `${name}_${rows.length + 1}`, createdAt: new Date(), ...data, items: items?.create ?? [] };
        rows.push(row);
        return withInclude(name, row, args);
      },
    };
  };
  const tx = Object.fromEntries(Object.keys(tables).map((name) => [name, table(name)]));
  return { tx, rooms, contracts, handovers, transfers };
}

async function withFakeDb<T>(db: ReturnType<typeof fakeDb>, fn: () => Promise<T>) {
  const originalTx = transactionHost.$transaction;
  const originalTransfer = transactionHost.roomTransferRequest;
  transactionHost.$transaction = async (cb: (tx: unknown) => unknown) => cb(db.tx);
  transactionHost.roomTransferRequest = db.tx.roomTransferRequest;
  try {
    return await fn();
  } finally {
    transactionHost.$transaction = originalTx;
    transactionHost.roomTransferRequest = originalTransfer;
  }
}

const readings = { oldElectricFinal: 1260, oldWaterFinal: 43, newElectricStart: 500, newWaterStart: 12, damageCost: 0 };

test('duyệt đổi phòng: hợp đồng nối tiếp giữ nguyên ngày hết hạn, phòng cũ trống, phòng mới đang thuê', async () => {
  const db = fakeDb();
  const result = await withFakeDb(db, () => approveTransferRequest('t_1', readings, { today: '2026-11-20' }));

  const oldContract = db.contracts.find((c) => c.id === 'c_old')!;
  const newContract = db.contracts.find((c) => c.id !== 'c_old')!;
  assert.equal(oldContract.status, 'TERMINATED');
  assert.equal(newContract.status, 'ACTIVE');
  assert.equal(newContract.roomId, 102);
  assert.equal(newContract.startDate, '2026-11-20');
  assert.equal(newContract.endDate, '2027-05-31', 'giữ nguyên ngày hết hạn của hợp đồng cũ');
  assert.equal(newContract.monthlyRent, 3_500_000);
  assert.equal(newContract.depositAmount, 3_500_000);
  assert.equal(newContract.tenantCitizenId, '079123456789');
  assert.equal(newContract.vehicleCount, 1);

  assert.equal(db.rooms.find((r) => r.id === 101)!.status, 'AVAILABLE');
  assert.equal(db.rooms.find((r) => r.id === 102)!.status, 'RENTED');

  // Biên bản trả phòng cũ + nhận phòng mới; chỉ số ban đầu đọc lại được cho hóa đơn kỳ sau
  const checkOut = db.handovers.find((h) => h.type === 'CHECK_OUT')!;
  const checkIn = db.handovers.find((h) => h.type === 'CHECK_IN' && h.contractId === newContract.id)!;
  assert.equal(checkOut.contractId, 'c_old');
  assert.equal(checkOut.landlordConfirmed, true);
  assert.equal(checkIn.roomId, 102);
  assert.deepEqual(parseInitialReadings(checkIn.notes), { electric: 500, water: 12 });

  // Quyết toán: chỉ số kỳ trước lấy từ hóa đơn 11/2026 của hợp đồng (1200 kWh, 40 m³); tháng 11 đã lập hóa đơn
  const t = db.transfers[0];
  assert.equal(t.status, 'APPROVED');
  assert.equal(t.pendingKey, null);
  assert.equal(t.newContractId, newContract.id);
  assert.equal(t.oldElectricPrev, 1200);
  assert.equal(t.monthAlreadyBilled, true);
  const expectedUtility = 60 * 3800 + 3 * 25000;
  assert.equal(t.utilityCost, expectedUtility);
  assert.equal(t.totalDiff, 500_000 + Math.round((500_000 * 11) / 30) + expectedUtility);
  assert.equal(t.settlementStatus, 'UNPAID');
  assert.equal(result.view.settlement?.direction, 'TENANT_PAYS');
  assert.equal(result.view.contract_end_date, '2027-05-31');
});

test('không duyệt hai lần, không duyệt khi phòng mới đã có người giữ chỗ', async () => {
  const db = fakeDb();
  await withFakeDb(db, () => approveTransferRequest('t_1', readings, { today: '2026-11-20' }));
  await assert.rejects(
    withFakeDb(db, () => approveTransferRequest('t_1', readings, { today: '2026-11-20' })),
    /^Error: TRANSFER_NOT_PENDING:/
  );

  const taken = fakeDb();
  taken.rooms.find((r) => r.id === 102)!.status = 'RESERVED';
  await assert.rejects(
    withFakeDb(taken, () => approveTransferRequest('t_1', readings, { today: '2026-11-20' })),
    /^Error: ROOM_NOT_AVAILABLE:/
  );
  assert.equal(taken.contracts.length, 1, 'không lập hợp đồng mới');
  assert.equal(taken.contracts[0].status, 'ACTIVE');
});

test('không duyệt khi khách đang có yêu cầu trả phòng chờ xác nhận, hoặc thiếu chỉ số chốt', async () => {
  const db = fakeDb();
  db.handovers.push({ id: 'h_out', contractId: 'c_old', roomId: 101, type: 'CHECK_OUT', landlordConfirmed: false, status: 'PENDING_CONFIRMATION', createdAt: new Date() });
  await assert.rejects(
    withFakeDb(db, () => approveTransferRequest('t_1', readings, { today: '2026-11-20' })),
    /^Error: TRANSFER_NOT_ALLOWED:/
  );
  await assert.rejects(
    withFakeDb(fakeDb(), () =>
      approveTransferRequest('t_1', { ...readings, oldElectricFinal: undefined as unknown as number }, { today: '2026-11-20' })
    ),
    /^Error: INVALID_TRANSFER:/
  );
});

test('từ chối cần lý do; yêu cầu đã xử lý thì không hủy được nữa', async () => {
  const db = fakeDb();
  await assert.rejects(withFakeDb(db, () => closeTransferRequest('t_1', 'REJECT', '')), /INVALID_TRANSFER/);
  await withFakeDb(db, () => approveTransferRequest('t_1', readings, { today: '2026-11-20' }));
  await assert.rejects(withFakeDb(db, () => closeTransferRequest('t_1', 'CANCEL')), /TRANSFER_NOT_PENDING/);
});

test('đổi phòng ngay trong tháng bắt đầu hợp đồng: không tính tiền những ngày chưa vào ở', async () => {
  const { computeTransferSettlement: compute } = await import('../src/lib/room-transfer');
  // Hợp đồng bắt đầu 09/11, đổi phòng cùng ngày: chỉ trả 22 ngày giá phòng mới
  const sameDay = compute({
    oldRent: 8_000_000, newRent: 8_000_000, oldDeposit: 8_000_000, newDeposit: 8_000_000,
    transferDate: '2026-11-09', monthAlreadyBilled: false, contractStartDate: '2026-11-09',
  });
  assert.equal(sameDay.rentDiff, Math.round((8_000_000 * 22) / 30));
  // Bắt đầu 05/11, đổi 20/11: 15 ngày giá cũ (05→19) + 11 ngày giá mới
  const midMonth = compute({
    oldRent: 3_000_000, newRent: 3_500_000, oldDeposit: 3_000_000, newDeposit: 3_500_000,
    transferDate: '2026-11-20', monthAlreadyBilled: false, contractStartDate: '2026-11-05',
  });
  assert.equal(midMonth.rentDiff, Math.round((3_000_000 * 15 + 3_500_000 * 11) / 30));
  // Hợp đồng bắt đầu từ tháng trước: giữ cách tính cũ (ở từ ngày 1)
  const olderContract = compute({
    oldRent: 3_000_000, newRent: 3_500_000, oldDeposit: 3_000_000, newDeposit: 3_500_000,
    transferDate: '2026-11-20', monthAlreadyBilled: false, contractStartDate: '2026-10-15',
  });
  assert.equal(olderContract.rentDiff, Math.round((3_000_000 * 19 + 3_500_000 * 11) / 30));
});

test('ngày đổi phòng thực tế không sớm hơn ngày bắt đầu hợp đồng', async () => {
  const { effectiveTransferDate, checkTransferDate: check } = await import('../src/lib/room-transfer');
  assert.equal(effectiveTransferDate('2026-11-09', '2026-11-14'), '2026-11-14');
  assert.equal(effectiveTransferDate('2026-11-20', '2026-11-14'), '2026-11-20');
  assert.equal(effectiveTransferDate('2026-11-20', ''), '2026-11-20');
  // Chủ trọ duyệt trước ngày nhận phòng: ngày đổi = ngày bắt đầu hợp đồng nên hợp lệ
  const contract = { startDate: '2026-11-14', endDate: '2027-05-14' };
  assert.equal(check(effectiveTransferDate('2026-11-09', contract.startDate), contract).ok, true);
});
