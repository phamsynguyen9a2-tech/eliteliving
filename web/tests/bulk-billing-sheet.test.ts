/**
 * Kiểm thử bảng lập hóa đơn hàng loạt (getBulkBillingSheet): chỉ số kỳ trước phải lấy theo thứ tự
 * hóa đơn của chính hợp đồng → chỉ số ban đầu trong biên bản nhận phòng → hóa đơn gần nhất của phòng.
 * Khách mới vào (check-in) hoặc hợp đồng nối tiếp sau đổi phòng không được lấy chỉ số cuối của người thuê trước.
 * Chạy trên prisma giả (chỉ có findMany, không đụng CSDL thật, không ghi gì).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { getBulkBillingSheet } from '../src/lib/db';
import prisma from '../src/lib/prisma';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dòng giả của CSDL, kiểu tự do
type Row = Record<string, any>;
const host = prisma as unknown as { contract: unknown; utilityBill: unknown };

const room = (id: number, extra: Row = {}): Row => ({
  id,
  roomCode: `P${id}`,
  title: `Phòng ${id}`,
  landlordId: 'll_1',
  price: 3_000_000,
  electricityRate: 3800,
  waterRate: 25000,
  internetFee: 100_000,
  serviceFee: 50_000,
  ...extra,
});
const contract = (id: string, roomId: number, extra: Row = {}): Row => ({
  id,
  roomId,
  status: 'ACTIVE',
  tenantName: `Khách ${id}`,
  monthlyRent: 3_000_000,
  startDate: '2026-01-01',
  endDate: '2027-01-01',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  ...extra,
});
const bill = (id: string, roomId: number, contractId: string | null, month: string, electricNew: number, waterNew: number, createdAt: string): Row => ({
  id,
  roomId,
  contractId,
  month,
  electricNew,
  waterNew,
  createdAt: new Date(createdAt),
});
const checkIn = (contractId: string, notes: string, createdAt = '2026-01-01T00:00:00Z'): Row => ({
  id: `h_${contractId}`,
  contractId,
  type: 'CHECK_IN',
  notes,
  createdAt: new Date(createdAt),
});
const readingsNote = (electric: number, water: number) =>
  `Bàn giao nhận phòng. Chỉ số điện ban đầu: ${electric} kWh. Chỉ số nước ban đầu: ${water} m³. Số lượng xe: 1.`;

function fakePrisma(seed: { rooms: Row[]; contracts: Row[]; handovers?: Row[]; bills?: Row[] }) {
  const { rooms, contracts } = seed;
  const handovers = seed.handovers ?? [];
  const bills = seed.bills ?? [];
  const calls: string[] = [];

  const matches = (row: Row, where: Row = {}): boolean =>
    Object.entries(where).every(([key, cond]) => {
      if (key === 'room') {
        const owner = rooms.find((r) => r.id === row.roomId);
        return !!owner && matches(owner, cond);
      }
      if (cond && typeof cond === 'object' && 'in' in cond) return cond.in.includes(row[key]);
      return (row[key] ?? null) === cond;
    });
  const newestFirst = (rows: Row[]) => [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const pick = (row: Row, select?: Row) =>
    select ? Object.fromEntries(Object.keys(select).filter((k) => select[k]).map((k) => [k, row[k]])) : { ...row };
  const distinctBy = (rows: Row[], keys?: string[]) => {
    if (!keys?.length) return rows;
    const seen = new Set<string>();
    return rows.filter((r) => {
      const key = JSON.stringify(keys.map((k) => r[k]));
      return seen.has(key) ? false : (seen.add(key), true);
    });
  };

  const contractTable = {
    findMany: async (args: Row) => {
      calls.push('contract.findMany');
      const rows = newestFirst(contracts.filter((c) => matches(c, args.where)));
      if (!args.include) return rows.map((c) => pick(c, args.select));
      return rows.map((c) => {
        const own = newestFirst(handovers.filter((h) => h.contractId === c.id && matches(h, args.include.handovers.where)));
        return {
          ...c,
          room: pick(rooms.find((r) => r.id === c.roomId)!, args.include.room.select),
          handovers: own.slice(0, args.include.handovers.take).map((h) => pick(h, args.include.handovers.select)),
        };
      });
    },
  };
  const billTable = {
    findMany: async (args: Row) => {
      calls.push('utilityBill.findMany');
      const rows = newestFirst(bills.filter((b) => matches(b, args.where)));
      return distinctBy(rows, args.distinct).map((b) => pick(b, args.select));
    },
  };
  return { contract: contractTable, utilityBill: billTable, calls };
}

async function sheetOn(db: ReturnType<typeof fakePrisma>, landlordId: string | null = 'll_1', month = '11/2026') {
  const original = { contract: host.contract, utilityBill: host.utilityBill };
  host.contract = db.contract;
  host.utilityBill = db.utilityBill;
  try {
    return await getBulkBillingSheet(landlordId, month);
  } finally {
    host.contract = original.contract;
    host.utilityBill = original.utilityBill;
  }
}

const rowOf = (sheet: Awaited<ReturnType<typeof getBulkBillingSheet>>, roomId: number) => {
  const row = sheet.rows.find((r) => r.room_id === roomId);
  assert.ok(row, `phải có dòng của phòng ${roomId}`);
  return row;
};

test('khách mới check-in: kỳ đầu lấy chỉ số ban đầu trong biên bản nhận phòng, không lấy chỉ số cuối của người thuê trước', async () => {
  const db = fakePrisma({
    rooms: [room(101)],
    contracts: [
      contract('c_truoc', 101, { status: 'TERMINATED', createdAt: new Date('2026-01-01T00:00:00Z') }),
      contract('c_moi', 101, { startDate: '2026-10-20', createdAt: new Date('2026-10-20T00:00:00Z') }),
    ],
    handovers: [checkIn('c_truoc', readingsNote(100, 5)), checkIn('c_moi', readingsNote(1520, 61), '2026-10-20T00:00:00Z')],
    bills: [bill('b_truoc', 101, 'c_truoc', '10/2026', 1500, 60, '2026-10-01T00:00:00Z')],
  });
  const row = rowOf(await sheetOn(db), 101);
  assert.equal(row.contract_id, 'c_moi');
  assert.equal(row.prev_electric, 1520);
  assert.equal(row.prev_water, 61);
  assert.equal(row.prev_source, 'Biên bản nhận phòng');
});

test('hợp đồng nối tiếp sau đổi phòng: phòng mới lấy chỉ số ban đầu của biên bản đổi phòng', async () => {
  const db = fakePrisma({
    rooms: [room(101), room(102)],
    contracts: [
      contract('c_old', 101, { status: 'TERMINATED' }),
      contract('c_next', 102, { startDate: '2026-11-20', createdAt: new Date('2026-11-20T00:00:00Z') }),
    ],
    handovers: [
      checkIn('c_old', readingsNote(1000, 30)),
      checkIn('c_next', 'Bàn giao nhận phòng ngày 2026-11-20 (đổi phòng từ P101). Chỉ số điện ban đầu: 500 kWh. Chỉ số nước ban đầu: 12 m³. Số lượng xe: 1.', '2026-11-20T00:00:00Z'),
    ],
    bills: [
      bill('b_old', 101, 'c_old', '11/2026', 1200, 40, '2026-11-01T00:00:00Z'),
      // Người thuê trước của phòng 102
      bill('b_102_truoc', 102, 'c_khac', '10/2026', 480, 11, '2026-10-01T00:00:00Z'),
    ],
  });
  const sheet = await sheetOn(db);
  assert.deepEqual(sheet.rows.map((r) => r.room_id), [102], 'hợp đồng đã kết thúc ở phòng cũ không còn trên bảng');
  const row = rowOf(sheet, 102);
  assert.equal(row.prev_electric, 500);
  assert.equal(row.prev_water, 12);
  assert.equal(row.prev_source, 'Biên bản nhận phòng');
});

test('hợp đồng đã có hóa đơn: lấy hóa đơn gần nhất của chính hợp đồng, bỏ qua chỉ số biên bản', async () => {
  const db = fakePrisma({
    rooms: [room(103)],
    contracts: [contract('c_b', 103)],
    handovers: [checkIn('c_b', readingsNote(800, 25))],
    bills: [
      bill('b_09', 103, 'c_b', '09/2026', 870, 28, '2026-09-01T00:00:00Z'),
      bill('b_10', 103, 'c_b', '10/2026', 900, 30, '2026-10-01T00:00:00Z'),
    ],
  });
  const row = rowOf(await sheetOn(db), 103);
  assert.equal(row.prev_electric, 900);
  assert.equal(row.prev_water, 30);
  assert.equal(row.prev_source, 'Hóa đơn kỳ 10/2026');
});

test('hóa đơn cũ chưa có contractId nhưng suy ra thuộc hợp đồng hiện tại vẫn được ưu tiên hơn biên bản', async () => {
  const db = fakePrisma({
    rooms: [room(104)],
    contracts: [contract('c_c', 104, { startDate: '2026-03-01', endDate: '2027-03-01', createdAt: new Date('2026-03-01T00:00:00Z') })],
    handovers: [checkIn('c_c', readingsNote(200, 8), '2026-03-01T00:00:00Z')],
    bills: [bill('b_legacy', 104, null, '08/2026', 650, 21, '2026-08-01T00:00:00Z')],
  });
  const row = rowOf(await sheetOn(db), 104);
  assert.equal(row.prev_electric, 650);
  assert.equal(row.prev_water, 21);
  assert.equal(row.prev_source, 'Hóa đơn kỳ 08/2026');
});

test('hợp đồng chưa có hóa đơn lẫn biên bản: dùng hóa đơn gần nhất của phòng như trước', async () => {
  const db = fakePrisma({
    rooms: [room(105)],
    contracts: [contract('c_d', 105)],
    bills: [bill('b_105', 105, 'c_truoc_105', '10/2026', 333, 9, '2026-10-01T00:00:00Z')],
  });
  const row = rowOf(await sheetOn(db), 105);
  assert.equal(row.prev_electric, 333);
  assert.equal(row.prev_water, 9);
  assert.equal(row.prev_source, 'Hóa đơn kỳ 10/2026');
});

test('không có nguồn nào: chỉ số 0, chủ trọ nhập tay', async () => {
  const db = fakePrisma({ rooms: [room(106)], contracts: [contract('c_e', 106)] });
  const row = rowOf(await sheetOn(db), 106);
  assert.equal(row.prev_electric, 0);
  assert.equal(row.prev_water, 0);
  assert.equal(row.prev_source, 'Chưa có (nhập tay)');
});

test('biên bản chỉ ghi chỉ số điện: nước lấy theo hóa đơn gần nhất của phòng và ghi rõ nguồn', async () => {
  const db = fakePrisma({
    rooms: [room(107), room(108)],
    contracts: [contract('c_f', 107), contract('c_g', 108)],
    handovers: [checkIn('c_f', 'Chỉ số điện ban đầu: 1520 kWh.'), checkIn('c_g', 'Chỉ số nước ban đầu: 7 m³.')],
    bills: [bill('b_107', 107, 'c_truoc_107', '10/2026', 1500, 60, '2026-10-01T00:00:00Z')],
  });
  const sheet = await sheetOn(db);
  const f = rowOf(sheet, 107);
  assert.equal(f.prev_electric, 1520);
  assert.equal(f.prev_water, 60);
  assert.equal(f.prev_source, 'Biên bản nhận phòng (không có chỉ số nước: lấy theo hóa đơn kỳ 10/2026)');
  const g = rowOf(sheet, 108);
  assert.equal(g.prev_electric, 0);
  assert.equal(g.prev_water, 7);
  assert.equal(g.prev_source, 'Biên bản nhận phòng (không có chỉ số điện: nhập tay)');
});

test('chỉ lấy phòng của chủ trọ, đánh dấu phòng đã lập kỳ này và chỉ đọc (không ghi) CSDL', async () => {
  const db = fakePrisma({
    rooms: [room(109), room(110, { landlordId: 'll_2' })],
    contracts: [contract('c_h', 109, { createdAt: new Date('2026-10-05T00:00:00Z') }), contract('c_i', 110)],
    handovers: [checkIn('c_h', readingsNote(10, 1), '2026-10-05T00:00:00Z')],
    bills: [bill('b_109_11', 109, 'c_h', '11/2026', 40, 3, '2026-11-01T00:00:00Z')],
  });
  const sheet = await sheetOn(db, 'll_1', '11/2026');
  assert.equal(sheet.month, '11/2026');
  assert.deepEqual(sheet.rows.map((r) => r.room_id), [109]);
  assert.equal(sheet.rows[0].billed, true);
  assert.equal(sheet.rows[0].prev_source, 'Hóa đơn kỳ 11/2026');
  assert.ok(db.calls.every((c) => c.endsWith('.findMany')), `chỉ có truy vấn đọc: ${db.calls.join(', ')}`);
  await assert.rejects(sheetOn(db, 'll_1', '13/2026'), /^Error: INVALID_BILL_MONTH:/);
});
