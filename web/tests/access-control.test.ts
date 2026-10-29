/**
 * Kiểm thử nhóm lỗi quyền truy cập chéo: thu hồi phiên khi đổi vai trò, ai được hủy giữ chỗ,
 * ghép biên bản bàn giao đúng lượt thuê, SĐT của khách vãng lai không chặn chủ thật của số,
 * chủ trọ không gắn được phòng vào khu trọ của chủ trọ khác.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isSessionRevoked,
  isSessionRevokedFor,
  setAccountBlockedStatus,
  setAccountRoleStatus,
} from '../src/lib/account-status';
import { tenantHoldsReservation } from '../src/lib/reservation-access';
import { pickPairedHandover, type PairableHandover } from '../src/lib/handover-pairing';
import { guestUserIdForPhone, otherPhoneOwnerWhere } from '../src/lib/guest-booking-limit';
import prisma from '../src/lib/prisma';
import { createRoom, updateRoom } from '../src/lib/db';
import { lifecycleErrorResponse } from '../src/lib/lifecycle-errors';

// ------------------------------------------------------------
// Đổi vai trò: phiên cũ mất hiệu lực
// ------------------------------------------------------------
test('phiên bị thu hồi khi vai trò trong phiên khác vai trò hiện tại', () => {
  assert.equal(isSessionRevokedFor({ blocked: false, role: 'TENANT' }, 'LANDLORD'), true);
  assert.equal(isSessionRevokedFor({ blocked: false, role: 'LANDLORD' }, 'LANDLORD'), false);
  assert.equal(isSessionRevokedFor({ blocked: true, role: 'LANDLORD' }, 'LANDLORD'), true);
  // Chưa biết vai trò hiện tại (CSDL chưa đọc được) thì không tự đăng xuất người dùng
  assert.equal(isSessionRevokedFor({ blocked: false, role: null }, 'LANDLORD'), false);
});

test('chủ trọ bị hạ xuống khách thuê: phiên chủ trọ đang mở bị thu hồi ngay, không chờ đọc lại CSDL', async () => {
  const original = prisma.user.findUnique;
  let reads = 0;
  prisma.user.findUnique = (async () => {
    reads++;
    return { isBlocked: false, role: 'LANDLORD' };
  }) as unknown as typeof prisma.user.findUnique;
  try {
    const id = `role-${Date.now()}`;
    assert.equal(await isSessionRevoked(id, 'LANDLORD'), false, 'lần đầu đọc CSDL: vẫn là chủ trọ');
    setAccountRoleStatus(id, 'TENANT');
    assert.equal(await isSessionRevoked(id, 'LANDLORD'), true, 'admin vừa hạ quyền → phiên chủ trọ hết hiệu lực');
    // Khóa / mở khóa không làm mất vai trò đang biết
    setAccountBlockedStatus(id, false);
    assert.equal(await isSessionRevoked(id, 'LANDLORD'), true);
    assert.equal(await isSessionRevoked(id, 'TENANT'), false);
    assert.equal(reads, 1, 'trong 30 giây không đọc lại CSDL');
  } finally {
    prisma.user.findUnique = original;
  }
});

test('vai trò hiện tại đọc từ CSDL khi chưa có trong bộ nhớ đệm', async () => {
  const original = prisma.user.findUnique;
  prisma.user.findUnique = (async () => ({ isBlocked: false, role: 'TENANT' })) as unknown as typeof prisma.user.findUnique;
  try {
    assert.equal(await isSessionRevoked(`demoted-${Date.now()}`, 'LANDLORD'), true);
  } finally {
    prisma.user.findUnique = original;
  }
});

// ------------------------------------------------------------
// Hủy giữ chỗ: chỉ người đang giữ chỗ
// ------------------------------------------------------------
const claim = { status: 'PENDING_CONFIRMATION', tenant_id: 'user_A', tenant_phone: '0901111111' };

test('người chỉ từng xem phòng (không đặt cọc) không hủy được giữ chỗ của người khác', () => {
  assert.equal(
    tenantHoldsReservation({ tenantId: 'user_B', verifiedPhone: '0902222222', claim, hasOwnActiveContract: false }),
    false
  );
  // Phòng giữ chỗ không còn phiếu cọc nào: khách thuê không tự hủy được (chủ trọ / admin xử lý)
  assert.equal(
    tenantHoldsReservation({ tenantId: 'user_B', verifiedPhone: '0902222222', claim: undefined, hasOwnActiveContract: false }),
    false
  );
});

test('chủ phiếu đặt cọc còn hiệu lực hoặc người đứng tên hợp đồng ACTIVE được hủy', () => {
  assert.equal(tenantHoldsReservation({ tenantId: 'user_A', verifiedPhone: '0901111111', claim, hasOwnActiveContract: false }), true);
  // Cùng SĐT đã xác minh (phiếu tạo trước khi gắn tài khoản)
  assert.equal(tenantHoldsReservation({ tenantId: 'user_X', verifiedPhone: '+84901111111', claim, hasOwnActiveContract: false }), true);
  assert.equal(tenantHoldsReservation({ tenantId: 'user_C', verifiedPhone: '0903333333', claim, hasOwnActiveContract: true }), true);
});

test('phiếu cọc đã hủy hoặc SĐT chưa xác minh không cho quyền hủy', () => {
  const cancelled = { ...claim, status: 'CANCELLED' };
  assert.equal(tenantHoldsReservation({ tenantId: 'user_A', verifiedPhone: '0901111111', claim: cancelled, hasOwnActiveContract: false }), false);
  assert.equal(tenantHoldsReservation({ tenantId: 'user_A', verifiedPhone: null, claim, hasOwnActiveContract: true }), false);
});

// ------------------------------------------------------------
// Đối soát bàn giao: không ghép dữ liệu hai lượt thuê
// ------------------------------------------------------------
const h = (
  id: string,
  type: 'CHECK_IN' | 'CHECK_OUT',
  contractId: string,
  tenantPhone: string,
  date: string
): PairableHandover => ({
  id,
  type,
  contractId,
  roomId: 5,
  tenantPhone,
  handoverDate: new Date(date),
  createdAt: new Date(date),
});

// Người thuê trước (An) và người thuê sau (Bình) ở cùng phòng 5
const anIn = h('an-in', 'CHECK_IN', 'c-an', '0901111111', '2025-01-01');
const anOut = h('an-out', 'CHECK_OUT', 'c-an', '0901111111', '2025-12-31');
const binhIn = h('binh-in', 'CHECK_IN', 'c-binh', '0902222222', '2026-01-05');
const binhOutLegacy = h('binh-out', 'CHECK_OUT', 'c-legacy', '0902222222', '2026-09-30');
const all = [anIn, anOut, binhIn, binhOutLegacy];

test('biên bản cùng hợp đồng được ghép trước', () => {
  assert.equal(pickPairedHandover(anOut, all, 'CHECK_IN')?.id, 'an-in');
  assert.equal(pickPairedHandover(anIn, all, 'CHECK_OUT')?.id, 'an-out');
});

test('biên bản cũ chưa gắn đúng hợp đồng chỉ ghép với lượt thuê của cùng người thuê', () => {
  // Trước đây lấy "biên bản nhận phòng gần nhất của phòng" — có thể là của người khác
  assert.equal(pickPairedHandover(binhOutLegacy, all, 'CHECK_IN')?.id, 'binh-in');
  assert.equal(pickPairedHandover(binhIn, all, 'CHECK_OUT')?.id, 'binh-out');
});

test('không có biên bản cùng người thuê thì không ghép (không lấy ảnh / tên người thuê khác)', () => {
  const stranger = h('lan-out', 'CHECK_OUT', 'c-lan', '0903333333', '2026-10-01');
  assert.equal(pickPairedHandover(stranger, [...all, stranger], 'CHECK_IN'), null);
  // Biên bản nhận phòng sau ngày trả phòng không phải của lượt thuê này
  const lateIn = h('an-in-later', 'CHECK_IN', 'c-x', '0901111111', '2027-01-01');
  const anOutLegacy = h('an-out-legacy', 'CHECK_OUT', 'c-y', '0901111111', '2025-12-31');
  assert.equal(pickPairedHandover(anOutLegacy, [anIn, lateIn, anOutLegacy], 'CHECK_IN')?.id, 'an-in');
});

// ------------------------------------------------------------
// SĐT của khách vãng lai không chặn chủ thật của số
// ------------------------------------------------------------
test('bản ghi ngầm của khách vãng lai không được tính là "tài khoản khác đang giữ SĐT"', () => {
  const where = otherPhoneOwnerWhere('0901234567', 'user_real');
  assert.equal(where.phone, '0901234567');
  assert.deepEqual(where.NOT, [{ id: 'user_real' }, { id: { startsWith: 'user_guest_' } }]);
  assert.ok(guestUserIdForPhone('0901234567').startsWith('user_guest_'));
});

// ------------------------------------------------------------
// Chủ trọ không gắn được phòng vào khu trọ của chủ trọ khác
// ------------------------------------------------------------
type Row = Record<string, unknown>;

async function withFakeRoomCatalog<T>(run: (rooms: Row[]) => Promise<T>) {
  const projects: Row[] = [
    { code: 'BLD_A', name: 'Khu A', landlordId: 'landlord_a', address: 'Tân Phú', district: 'Quận Tân Phú', lat: 10.8, lng: 106.63 },
    { code: 'BLD_B', name: 'Khu B', landlordId: 'landlord_b', address: 'Tân Bình', district: 'Quận Tân Bình', lat: 10.79, lng: 106.65 },
  ];
  const rooms: Row[] = [{ id: 700, landlordId: 'landlord_a', landlordName: 'A', landlordPhone: '0901000001', projectCode: 'BLD_A', price: 3_000_000, area: 20 }];
  const stubs: Record<string, Record<string, unknown>> = {
    project: { findUnique: async ({ where }: { where: Row }) => projects.find((p) => p.code === where.code) ?? null },
    room: {
      findFirst: async () => ({ id: Math.max(...rooms.map((r) => Number(r.id))) }),
      findUnique: async ({ where }: { where: Row }) => rooms.find((r) => r.id === where.id) ?? null,
      create: async ({ data }: { data: Row }) => {
        rooms.push({ ...data });
        return { ...data };
      },
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const row = rooms.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return { ...row };
      },
    },
    systemSetting: { findUnique: async () => null },
  };
  // Delegate của Prisma là Proxy: gán đè từng hàm rồi trả lại như cũ
  const host = prisma as unknown as Record<string, Record<string, unknown>>;
  const originals: [string, string, unknown][] = [];
  for (const [model, fns] of Object.entries(stubs)) {
    for (const [fn, impl] of Object.entries(fns)) {
      originals.push([model, fn, host[model][fn]]);
      host[model][fn] = impl;
    }
  }
  try {
    return await run(rooms);
  } finally {
    for (const [model, fn, original] of originals) host[model][fn] = original;
  }
}

test('chủ trọ đăng phòng vào khu trọ của chủ trọ khác bị từ chối 403, không ghi phòng', async () => {
  await withFakeRoomCatalog(async (rooms) => {
    const before = rooms.length;
    const err = await createRoom({
      landlord_id: 'landlord_a',
      landlord_name: 'A',
      landlord_phone: '0901000001',
      project_code: 'BLD_B',
      price: 3_500_000,
    }).then(
      () => null,
      (e: unknown) => e
    );
    assert.ok(err instanceof Error && err.message.startsWith('BUILDING_NOT_OWNED:'));
    assert.equal(lifecycleErrorResponse(err)?.status, 403);
    assert.equal(rooms.length, before, 'không tạo phòng nào');
  });
});

test('chủ trọ sửa phòng sang khu trọ của chủ trọ khác bị từ chối 403, phòng giữ khu trọ cũ', async () => {
  await withFakeRoomCatalog(async (rooms) => {
    const err = await updateRoom(700, { project_code: 'BLD_B' }).then(
      () => null,
      (e: unknown) => e
    );
    assert.equal(lifecycleErrorResponse(err)?.status, 403, 'lỗi không bị nuốt thành "không tìm thấy phòng"');
    assert.equal(rooms[0].projectCode, 'BLD_A');
  });
});

test('chủ trọ vẫn đăng phòng vào khu trọ của chính mình', async () => {
  await withFakeRoomCatalog(async (rooms) => {
    const room = await createRoom({
      landlord_id: 'landlord_a',
      landlord_name: 'A',
      landlord_phone: '0901000001',
      project_code: 'BLD_A',
      price: 3_500_000,
    });
    assert.equal(room.project_code, 'BLD_A');
    assert.equal(rooms.at(-1)?.landlordId, 'landlord_a');
  });
});
