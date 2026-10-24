import assert from 'node:assert/strict';
import test from 'node:test';
import { inferBillContractId } from '../src/lib/bill-ownership';
import { isAccountBlocked, setAccountBlockedStatus } from '../src/lib/account-status';
import { isRecommendationId, recordRecommendationEvent } from '../src/lib/interaction-tracking';
import prisma from '../src/lib/prisma';

// ------------------------------------------------------------
// Hóa đơn thuộc hợp đồng nào
// ------------------------------------------------------------
const contracts = [
  { id: 'old', roomId: 7, createdAt: new Date('2026-01-05T00:00:00Z') },
  { id: 'new', roomId: 7, createdAt: new Date('2026-06-01T00:00:00Z') },
  { id: 'other-room', roomId: 8, createdAt: new Date('2026-07-01T00:00:00Z') },
];

test('hóa đơn cũ thuộc hợp đồng đang ở phòng lúc lập hóa đơn', () => {
  assert.equal(inferBillContractId({ roomId: 7, createdAt: '2026-03-30T00:00:00Z' }, contracts), 'old');
  assert.equal(inferBillContractId({ roomId: 7, createdAt: '2026-07-30T00:00:00Z' }, contracts), 'new');
});

test('hóa đơn lập khi phòng chưa có hợp đồng không thuộc về ai', () => {
  assert.equal(inferBillContractId({ roomId: 7, createdAt: '2025-12-30T00:00:00Z' }, contracts), null);
  assert.equal(inferBillContractId({ roomId: 9, createdAt: '2026-07-30T00:00:00Z' }, contracts), null);
});

test('kỳ hóa đơn nằm trong thời hạn hợp đồng thì thuộc hợp đồng đó, dù hóa đơn lập trước khi tạo hợp đồng', () => {
  const rows = [
    { id: 'A', roomId: 3, createdAt: '2026-01-02T00:00:00Z', startDate: '2026-01-01', endDate: '2026-12-31' },
    { id: 'B', roomId: 3, createdAt: '2026-10-05T00:00:00Z', startDate: '2026-10-01', endDate: '2027-09-30' },
  ];
  // Hóa đơn kỳ 10/2026 lập ngày 24/09, trước khi hợp đồng B được tạo; A (thanh lý sớm) và B cùng bao trùm → B bắt đầu muộn hơn
  assert.equal(inferBillContractId({ roomId: 3, createdAt: '2026-09-24T00:00:00Z', month: '10/2026' }, rows), 'B');
  assert.equal(inferBillContractId({ roomId: 3, createdAt: '2026-05-01T00:00:00Z', month: '04/2026' }, rows), 'A');
  // Kỳ ngoài mọi hợp đồng → quay về quy tắc "hợp đồng có trước khi lập hóa đơn"
  assert.equal(inferBillContractId({ roomId: 3, createdAt: '2026-10-06T00:00:00Z', month: '12/2027' }, rows), 'B');
});

test('hóa đơn đã có contractId thì dùng đúng contractId đó', () => {
  assert.equal(inferBillContractId({ roomId: 7, createdAt: '2026-07-30T00:00:00Z', contractId: 'old' }, contracts), 'old');
});

// ------------------------------------------------------------
// Khóa tài khoản: thu hồi phiên ngay
// ------------------------------------------------------------
test('khóa / mở khóa có hiệu lực ngay, không cần đọc lại CSDL', async () => {
  const original = prisma.user.findUnique;
  let reads = 0;
  prisma.user.findUnique = (async () => {
    reads++;
    return { isBlocked: false };
  }) as unknown as typeof prisma.user.findUnique;
  try {
    const id = `lock-${Date.now()}`;
    assert.equal(await isAccountBlocked(id), false, 'lần đầu đọc từ CSDL');
    assert.equal(reads, 1);
    setAccountBlockedStatus(id, true);
    assert.equal(await isAccountBlocked(id), true, 'admin vừa khóa → bị khóa ngay');
    setAccountBlockedStatus(id, false);
    assert.equal(await isAccountBlocked(id), false, 'mở khóa → dùng lại được ngay');
    assert.equal(reads, 1, 'trong 30 giây không đọc lại CSDL');
    assert.equal(await isAccountBlocked(undefined), false);
  } finally {
    prisma.user.findUnique = original;
  }
});

test('trạng thái khóa đọc từ CSDL khi chưa có trong bộ nhớ đệm', async () => {
  const original = prisma.user.findUnique;
  prisma.user.findUnique = (async () => ({ isBlocked: true })) as unknown as typeof prisma.user.findUnique;
  try {
    assert.equal(await isAccountBlocked(`blocked-${Date.now()}`), true);
  } finally {
    prisma.user.findUnique = original;
  }
});

// ------------------------------------------------------------
// Đo CTR: không thể "bơm" lượt bấm bằng mã gợi ý tùy ý
// ------------------------------------------------------------
test('lượt bấm chỉ được tính cho phòng nằm trong đúng danh sách gợi ý đã hiển thị', async () => {
  const impressionId = '3f2b8c1e-6a4d-4e8f-9b7a-1c2d3e4f5a6b';
  const originalFind = prisma.recommendationImpression.findUnique;
  const originalCreate = prisma.recommendationEvent.createMany;
  const written: unknown[] = [];
  prisma.recommendationImpression.findUnique = (async (args: { where: { id: string } }) =>
    args.where.id === impressionId ? { roomIds: [11, 12, 13], createdAt: new Date() } : null) as unknown as typeof prisma.recommendationImpression.findUnique;
  prisma.recommendationEvent.createMany = (async (args: { data: unknown[] }) => {
    written.push(...args.data);
    return { count: args.data.length };
  }) as unknown as typeof prisma.recommendationEvent.createMany;
  try {
    assert.equal(isRecommendationId('not-a-uuid'), false);
    assert.equal(await recordRecommendationEvent({ recommendationId: 'not-a-uuid', roomId: 11, action: 'CLICK' }), false);
    assert.equal(await recordRecommendationEvent({ recommendationId: impressionId, roomId: 99, action: 'CLICK' }), false, 'phòng không có trong danh sách');
    assert.equal(
      await recordRecommendationEvent({ recommendationId: '00000000-0000-4000-8000-000000000000', roomId: 11, action: 'CLICK' }),
      false,
      'mã gợi ý không tồn tại'
    );
    assert.equal(await recordRecommendationEvent({ recommendationId: impressionId, roomId: 12, action: 'BOOK' }), true);
    assert.deepEqual(written, [{ impressionId, roomId: 12, action: 'BOOK' }]);
  } finally {
    prisma.recommendationImpression.findUnique = originalFind;
    prisma.recommendationEvent.createMany = originalCreate;
  }
});
