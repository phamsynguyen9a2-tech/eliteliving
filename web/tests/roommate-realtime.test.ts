/**
 * Kiểm thử nhóm 4: "Bài đăng của tôi" chỉ có bài của mình, đồng bộ thời gian thực cho ở ghép,
 * và bỏ truy vấn thừa (biên bản bàn giao, cột bổ sung của hợp đồng).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { publishRoommateEvent, shouldDeliver, subscribeRealtime, type RealtimeEvent } from '../src/lib/realtime-bus';
import { tenantHandoverWhere, type TenantScope } from '../src/lib/tenant-access';
import { getContracts } from '../src/lib/db';
import { GET as getRoommatePosts } from '../src/app/api/roommate/posts/route';
import prisma from '../src/lib/prisma';

async function withPatched<T>(target: object, key: string, impl: unknown, run: () => Promise<T>) {
  const host = target as Record<string, unknown>;
  const original = host[key];
  host[key] = impl;
  try {
    return await run();
  } finally {
    host[key] = original;
  }
}

// ------------------------------------------------------------
// "Bài đăng của tôi"
// ------------------------------------------------------------
const dbPost = (id: string, userId: string) => ({
  id,
  roomId: 1,
  userId,
  title: `Bài ${id}`,
  description: 'Mô tả',
  sharedRent: 2_000_000,
  maxPeople: 2,
  currentPeople: 1,
  genderPreference: 'Không yêu cầu',
  requiredHabits: [],
  status: 'OPEN',
  images: [],
  contactPhone: '0900000000',
  district: 'Quận 1',
  address: '',
  createdAt: new Date(),
  expiresAt: new Date(),
  user: { name: 'A', image: null },
  room: null,
});

test('lọc theo authorId chỉ trả bài của chính người đó; userId không lọc (lỗi cũ của /ho-so)', async () => {
  await withPatched(prisma.roommatePost, 'findMany', async () => [dbPost('p1', 'user_a'), dbPost('p2', 'user_b')], async () => {
    await withPatched(prisma.roommateProfile, 'findUnique', async () => null, async () => {
      const mine = await (await getRoommatePosts(new NextRequest('http://localhost/api/roommate/posts?authorId=user_a'))).json();
      assert.deepEqual(mine.data.map((p: { id: string }) => p.id), ['p1']);
      // /ho-so trước đây gửi ?userId= → nhận về bài của mọi người
      const all = await (await getRoommatePosts(new NextRequest('http://localhost/api/roommate/posts?userId=user_a'))).json();
      assert.equal(all.data.length, 2);
    });
  });
});

// ------------------------------------------------------------
// Đồng bộ thời gian thực ở ghép
// ------------------------------------------------------------
const tenant = (id: string) => ({ id, role: 'TENANT' as const, roomIds: new Set<number>() });

test('sự kiện yêu cầu ở ghép chỉ tới người gửi và chủ bài đăng', () => {
  const event: RealtimeEvent = { type: 'roommate', userIds: ['user_a', 'user_b'] };
  assert.equal(shouldDeliver(event, tenant('user_a')), true);
  assert.equal(shouldDeliver(event, tenant('user_b')), true);
  assert.equal(shouldDeliver(event, tenant('user_c')), false);
  assert.equal(shouldDeliver(event, { id: 'landlord_1', role: 'LANDLORD' }), false);
  assert.equal(shouldDeliver(event, null), false);
  assert.equal(shouldDeliver(event, { id: 'admin', role: 'ADMIN' }), true);
});

test('bài đăng ở ghép mới là sự kiện công khai cho bảng tin', () => {
  assert.equal(shouldDeliver({ type: 'roommate_post' }, null), true);
  assert.equal(shouldDeliver({ type: 'roommate_post' }, tenant('user_c')), true);
});

test('publishRoommateEvent phát một sự kiện cho các bên liên quan (bỏ trùng, bỏ rỗng)', () => {
  const received: RealtimeEvent[] = [];
  const unsubscribe = subscribeRealtime((event) => received.push(event));
  try {
    publishRoommateEvent(['user_a', 'user_b', 'user_a', undefined, null]);
    publishRoommateEvent([undefined]);
  } finally {
    unsubscribe();
  }
  assert.equal(received.length, 1);
  assert.equal(received[0].type, 'roommate');
  assert.deepEqual(received[0].userIds, ['user_a', 'user_b']);
});

// ------------------------------------------------------------
// Truy vấn thừa
// ------------------------------------------------------------
const scope = (over: Partial<TenantScope>): TenantScope => ({
  phone: null,
  appointmentRoomIds: new Set(),
  contractIds: new Set(),
  contractRoomIds: new Set(),
  ...over,
});

test('biên bản bàn giao của khách thuê được lọc ngay trong CSDL', () => {
  assert.equal(tenantHandoverWhere(scope({})), null, 'không sở hữu gì → không truy vấn');
  assert.deepEqual(tenantHandoverWhere(scope({ contractIds: new Set(['c1']), phone: '0901234567' })), {
    OR: [
      { contractId: { in: ['c1'] } },
      { tenantPhone: { in: ['0901234567', '+84901234567', '84901234567'] } },
    ],
  });
});

test('cột bổ sung của hợp đồng chỉ đọc cho các hợp đồng vừa lấy, không quét toàn bảng', async () => {
  const rawCalls: string[] = [];
  const rawQuery = async (strings: TemplateStringsArray) => {
    rawCalls.push(strings.join('?'));
    return [{ id: 'c1', tenant_citizen_id: '079', tenant_address: 'HCM', vehicle_count: 1 }];
  };
  await withPatched(prisma, '$queryRaw', rawQuery, async () => {
    await withPatched(prisma.contract, 'findMany', async () => [], async () => {
      assert.deepEqual(await getContracts({ tenantPhone: '0900000000' }), []);
    });
    assert.equal(rawCalls.length, 0, 'không có hợp đồng thì không chạy câu SQL thô');

    await withPatched(prisma.contract, 'findMany', async () => [{
      id: 'c1', roomId: 1, roomTitle: 'P1', tenantName: 'An', tenantPhone: '0900000000', landlordName: 'Chủ',
      startDate: '2026-01-01', endDate: '2026-12-31', monthlyRent: 1, depositAmount: 1, status: 'ACTIVE',
      createdAt: new Date(), handovers: [],
    }], async () => {
      const [contract] = await getContracts({ tenantPhone: '0900000000' });
      assert.equal(contract.tenant_citizen_id, '079');
      assert.equal(contract.vehicle_count, 1);
    });
  });
  assert.equal(rawCalls.length, 1);
  assert.match(rawCalls[0], /WHERE id IN/);
});
