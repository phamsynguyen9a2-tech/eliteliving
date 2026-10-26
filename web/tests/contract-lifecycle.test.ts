/**
 * Kiểm thử nhóm lỗi vòng đời hợp đồng & cọc: cộng tháng không tràn ngày, đổi trạng thái phòng theo
 * FSM, tạo / thanh lý / gia hạn hợp đồng trong transaction, yêu cầu trả phòng phải chờ chủ trọ ký.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { addMonthsClamped, isValidIsoDate, parseRenewalMonths } from '../src/lib/contract-dates';
import {
  checkManualRoomStatusChange,
  parseMeterReading,
  roomStatusAfterContractEnds,
} from '../src/lib/room-lifecycle';
import { lifecycleErrorResponse } from '../src/lib/lifecycle-errors';
import { createContract, renewActiveContract, signHandover, terminateContract } from '../src/lib/db';
import prisma from '../src/lib/prisma';

// ------------------------------------------------------------
// Ngày hết hạn: không tràn tháng
// ------------------------------------------------------------
test('31/01 cộng 1 tháng ra cuối tháng 02, không tràn sang 03/03', () => {
  assert.equal(addMonthsClamped('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonthsClamped('2028-01-31', 1), '2028-02-29', 'năm nhuận');
  assert.equal(addMonthsClamped('2026-08-31', 6), '2027-02-28');
  assert.equal(addMonthsClamped('2026-03-31', 1), '2026-04-30');
  assert.equal(addMonthsClamped('2026-10-15', 12), '2027-10-15');
  assert.equal(addMonthsClamped('2026-11-30', 3), '2027-02-28', 'qua năm mới');
});

test('ngày và số tháng gia hạn không hợp lệ bị từ chối', () => {
  assert.equal(isValidIsoDate('2026-02-30'), false);
  assert.equal(isValidIsoDate('2026-02-28'), true);
  for (const bad of [0, -6, 1.5, 37, 'abc', null]) assert.equal(parseRenewalMonths(bad), null, String(bad));
  assert.equal(parseRenewalMonths('12'), 12);
});

// ------------------------------------------------------------
// Đổi tay trạng thái phòng theo FSM
// ------------------------------------------------------------
const noFacts = { hasActiveContract: false, hasOpenAppointment: false, hasPendingDeposit: false };

test('trạng thái không hợp lệ trả 400 (trước đây vẫn success: true với dữ liệu null)', () => {
  const check = checkManualRoomStatusChange('AVAILABLE', 'SOLD_OUT', noFacts);
  assert.equal(check.ok, false);
  if (!check.ok) assert.equal(check.status, 400);
});

test('không đổi tay sang Đang thuê / Giữ chỗ, không bỏ qua hợp đồng hoặc phiếu cọc đang có', () => {
  assert.equal(checkManualRoomStatusChange('AVAILABLE', 'RENTED', noFacts).ok, false);
  assert.equal(checkManualRoomStatusChange('AVAILABLE', 'RESERVED', noFacts).ok, false);
  assert.equal(checkManualRoomStatusChange('RENTED', 'AVAILABLE', { ...noFacts, hasActiveContract: true }).ok, false);
  assert.equal(checkManualRoomStatusChange('RESERVED', 'AVAILABLE', { ...noFacts, hasPendingDeposit: true }).ok, false);
  assert.equal(checkManualRoomStatusChange('AVAILABLE', 'BOOKED_VIEWING', noFacts).ok, false);
});

test('các chuyển đổi khớp dữ liệu vẫn được phép', () => {
  assert.equal(checkManualRoomStatusChange('BOOKED_VIEWING', 'AVAILABLE', noFacts).ok, true);
  assert.equal(checkManualRoomStatusChange('AVAILABLE', 'BOOKED_VIEWING', { ...noFacts, hasOpenAppointment: true }).ok, true);
  // Dữ liệu lệch (Đang thuê nhưng không có hợp đồng) thì sửa tay về Còn trống được
  assert.equal(checkManualRoomStatusChange('RENTED', 'AVAILABLE', noFacts).ok, true);
  assert.equal(checkManualRoomStatusChange('RENTED', 'RENTED', { ...noFacts, hasActiveContract: true }).ok, true);
});

test('phòng sau khi hợp đồng kết thúc', () => {
  assert.equal(roomStatusAfterContractEnds('RENTED', { hasActiveContract: false, hasOpenAppointment: false }), 'AVAILABLE');
  assert.equal(roomStatusAfterContractEnds('RENTED', { hasActiveContract: false, hasOpenAppointment: true }), 'BOOKED_VIEWING');
  assert.equal(roomStatusAfterContractEnds('RENTED', { hasActiveContract: true, hasOpenAppointment: false }), null);
  // Phòng đang được người khác đặt lịch / còn trống thì không bị đụng tới
  assert.equal(roomStatusAfterContractEnds('BOOKED_VIEWING', { hasActiveContract: false, hasOpenAppointment: true }), null);
});

test('chỉ số công tơ khi trả phòng bắt buộc nhập, không dùng số mặc định', () => {
  for (const bad of [undefined, null, '', -1, 'abc']) assert.equal(parseMeterReading(bad), null, String(bad));
  assert.equal(parseMeterReading('1520.5'), 1520.5);
  assert.equal(parseMeterReading(0), 0);
});

test('lỗi nghiệp vụ được chuyển thành mã HTTP, lỗi hệ thống thì không', async () => {
  const res = lifecycleErrorResponse(new Error('CONTRACT_NOT_ACTIVE: Hợp đồng đã kết thúc.'));
  assert.equal(res?.status, 409);
  assert.equal((await res!.json()).message, 'Hợp đồng đã kết thúc.');
  assert.equal(lifecycleErrorResponse(new Error('connect ECONNREFUSED')), null);
});

// ------------------------------------------------------------
// Hàm CSDL chạy trên transaction giả (không đụng CSDL thật)
// ------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dòng giả của CSDL, kiểu tự do
type Row = Record<string, any>;
type NewContract = Parameters<typeof createContract>[0];
const transactionHost = prisma as unknown as { $transaction: unknown };

function fakeDb(seed: { contracts?: Row[]; rooms?: Row[]; handovers?: Row[]; appointments?: Row[] }) {
  const contracts = seed.contracts ?? [];
  const rooms = seed.rooms ?? [];
  const handovers = seed.handovers ?? [];
  const appointments = seed.appointments ?? [];
  const calls: string[] = [];
  const match = (row: Row, where: Row = {}) =>
    Object.entries(where).every(([key, cond]) => {
      if (cond && typeof cond === 'object' && 'in' in cond) return cond.in.includes(row[key]);
      if (cond && typeof cond === 'object' && 'not' in cond) return row[key] !== cond.not;
      return row[key] === cond;
    });
  // Như Prisma thật: đọc trả về bản sao, không phải chính dòng đang lưu
  const copy = (row: Row | undefined) => (row ? { ...row } : null);
  const table = (rows: Row[], name: string) => ({
    findUnique: async ({ where }: Row) => copy(rows.find((r) => match(r, where))),
    findUniqueOrThrow: async ({ where }: Row) => {
      const row = rows.find((r) => match(r, where));
      if (!row) throw new Error('not found');
      return { ...row };
    },
    findFirst: async ({ where }: Row) => copy(rows.find((r) => match(r, where))),
    updateMany: async ({ where, data }: Row) => {
      const hit = rows.filter((r) => match(r, where));
      hit.forEach((r) => Object.assign(r, data));
      calls.push(`${name}.updateMany:${hit.length}`);
      return { count: hit.length };
    },
    update: async ({ where, data }: Row) => {
      const row = rows.find((r) => match(r, where));
      if (!row) throw new Error('not found');
      Object.assign(row, data);
      calls.push(`${name}.update`);
      return { ...row };
    },
    create: async ({ data }: Row) => {
      const row = { id: `${name}_${rows.length + 1}`, createdAt: new Date(), ...data };
      rows.push(row);
      calls.push(`${name}.create`);
      return { ...row };
    },
  });
  const tx = {
    contract: table(contracts, 'contract'),
    room: table(rooms, 'room'),
    handover: table(handovers, 'handover'),
    appointment: table(appointments, 'appointment'),
    depositClaim: table([], 'depositClaim'),
    $executeRaw: async () => 1,
  };
  return { tx, calls, contracts, rooms, handovers };
}

async function withFakeTransaction<T>(db: ReturnType<typeof fakeDb>, run: () => Promise<T>) {
  const original = transactionHost.$transaction;
  transactionHost.$transaction = async (fn: (tx: unknown) => unknown) => fn(db.tx);
  try {
    return await run();
  } finally {
    transactionHost.$transaction = original;
  }
}

const baseContract = {
  roomTitle: 'P101',
  tenantName: 'An',
  tenantPhone: '0901111111',
  landlordName: 'Chủ',
  startDate: '2026-01-31',
  endDate: '2026-07-31',
  monthlyRent: 3_000_000,
  depositAmount: 3_000_000,
  createdAt: new Date('2026-01-31'),
};

test('lập hợp đồng mới trên phòng đang có người ở bị từ chối, hợp đồng cũ giữ nguyên', async () => {
  const db = fakeDb({
    contracts: [{ id: 'c-an', roomId: 7, status: 'ACTIVE', ...baseContract }],
    rooms: [{ id: 7, status: 'RENTED' }],
  });
  await withFakeTransaction(db, async () => {
    await assert.rejects(
      createContract({
        room_id: 7,
        room_title: 'P101',
        tenant_name: 'Bình',
        tenant_phone: '0902222222',
        landlord_name: 'Chủ',
        start_date: '2026-10-01',
        end_date: '2027-10-01',
        monthly_rent: 3_000_000,
        deposit_amount: 3_000_000,
        status: 'ACTIVE',
      } as NewContract),
      /^Error: ROOM_HAS_ACTIVE_CONTRACT:/
    );
  });
  assert.equal(db.contracts[0].status, 'ACTIVE', 'hợp đồng của người đang ở không bị chấm dứt');
  assert.ok(!db.calls.includes('contract.create'));
});

test('phòng đang giữ chỗ không lập hợp đồng trực tiếp được (phải qua check-in)', async () => {
  const db = fakeDb({ rooms: [{ id: 8, status: 'RESERVED' }] });
  await withFakeTransaction(db, async () => {
    await assert.rejects(
      createContract({
        room_id: 8,
        room_title: '',
        tenant_name: '',
        tenant_phone: '',
        landlord_name: '',
        start_date: '',
        end_date: '',
        monthly_rent: 0,
        deposit_amount: 0,
        status: 'ACTIVE',
      } as NewContract),
      /^Error: ROOM_RESERVED:/
    );
  });
});

test('thanh lý lại hợp đồng đã kết thúc bị từ chối và không giải phóng phòng của lượt thuê sau', async () => {
  const db = fakeDb({
    contracts: [
      { id: 'c-old', roomId: 9, status: 'TERMINATED', ...baseContract },
      { id: 'c-new', roomId: 9, status: 'ACTIVE', ...baseContract, tenantName: 'Bình' },
    ],
    rooms: [{ id: 9, status: 'RENTED' }],
  });
  await withFakeTransaction(db, async () => {
    await assert.rejects(terminateContract('c-old'), /^Error: CONTRACT_NOT_ACTIVE:/);
  });
  assert.equal(db.rooms[0].status, 'RENTED');
  assert.equal(await withFakeTransaction(db, () => terminateContract('khong-co')), null);
});

test('thanh lý hợp đồng ACTIVE giải phóng phòng', async () => {
  const db = fakeDb({
    contracts: [{ id: 'c1', roomId: 10, status: 'ACTIVE', ...baseContract }],
    rooms: [{ id: 10, status: 'RENTED' }],
  });
  const ended = await withFakeTransaction(db, () => terminateContract('c1'));
  assert.equal(ended?.status, 'TERMINATED');
  assert.equal(db.rooms[0].status, 'AVAILABLE');
});

test('gia hạn không hồi sinh hợp đồng đã thanh lý, và cộng tháng không tràn ngày', async () => {
  const db = fakeDb({
    contracts: [
      { id: 'c-done', roomId: 11, status: 'TERMINATED', ...baseContract },
      { id: 'c-live', roomId: 12, status: 'ACTIVE', ...baseContract, endDate: '2026-01-31' },
    ],
  });
  await withFakeTransaction(db, async () => {
    await assert.rejects(renewActiveContract('c-done', 6), /^Error: CONTRACT_NOT_ACTIVE:/);
    const renewed = await renewActiveContract('c-live', 1);
    assert.equal(renewed.end_date, '2026-02-28');
  });
  assert.equal(db.contracts[0].status, 'TERMINATED', 'không bị đổi lại thành ACTIVE');
});

test('yêu cầu trả phòng của khách chỉ kết thúc hợp đồng khi chủ trọ ký', async () => {
  const db = fakeDb({
    contracts: [{ id: 'c-req', roomId: 13, status: 'ACTIVE', ...baseContract }],
    rooms: [{ id: 13, status: 'RENTED' }],
    handovers: [{
      id: 'h-req', contractId: 'c-req', roomId: 13, type: 'CHECK_OUT',
      tenantConfirmed: true, landlordConfirmed: false, status: 'PENDING_CONFIRMATION',
    }],
  });
  // Khách ký lại biên bản của chính mình: hợp đồng không đổi
  await withFakeTransaction(db, () => signHandover('h-req', 'TENANT'));
  assert.equal(db.contracts[0].status, 'ACTIVE');

  const signed = await withFakeTransaction(db, () => signHandover('h-req', 'LANDLORD'));
  assert.equal(signed?.contractEnded, true);
  assert.equal(signed?.handover.status, 'CONFIRMED');
  assert.equal(db.contracts[0].status, 'TERMINATED');
  assert.equal(db.rooms[0].status, 'AVAILABLE');
});

test('chủ trọ ký biên bản trả phòng do chính mình lập không kết thúc hợp đồng lần nữa', async () => {
  const db = fakeDb({
    contracts: [{ id: 'c-x', roomId: 14, status: 'ACTIVE', ...baseContract }],
    rooms: [{ id: 14, status: 'RENTED' }],
    handovers: [{
      id: 'h-x', contractId: 'c-x', roomId: 14, type: 'CHECK_OUT',
      tenantConfirmed: false, landlordConfirmed: true, status: 'PENDING_CONFIRMATION',
    }],
  });
  const signed = await withFakeTransaction(db, () => signHandover('h-x', 'LANDLORD'));
  assert.equal(signed?.contractEnded, false);
  assert.equal(db.contracts[0].status, 'ACTIVE');
});
