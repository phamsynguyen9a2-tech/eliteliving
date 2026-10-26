/**
 * Kiểm thử nhóm lỗi "lưu dữ liệu và báo lỗi trung thực": xác nhận hóa đơn không báo đã thu khi lưu lỗi,
 * yêu cầu ở ghép không nuốt lỗi CSDL, thông báo theo SĐT chỉ tới tài khoản đã xác minh số đó.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { updateBillStatus } from '../src/lib/db';
import { prismaErrorCode, saveRequestStatus } from '../src/lib/roommate-request-auth';
import { addRequest } from '../src/lib/roommate-store';
import { resolveTenantRecipient } from '../src/lib/tenant-notifications';
import { verifiedTenantPhoneWhere } from '../src/lib/guest-booking-limit';
import prisma from '../src/lib/prisma';

// Thay tạm một hàm của Prisma Client trong một test rồi trả lại
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

const prismaError = (code: string) => Object.assign(new Error(`prisma ${code}`), { code });

// ------------------------------------------------------------
// Xác nhận hóa đơn
// ------------------------------------------------------------
test('lưu trạng thái hóa đơn lỗi thì trả null (route báo lỗi, không báo "đã thu")', async () => {
  await withPatched(prisma, '$transaction', async () => {
    throw new Error('connection lost');
  }, async () => {
    assert.equal(await updateBillStatus('bill-1', 'PAID'), null);
  });
});

test('trạng thái hóa đơn không hợp lệ bị từ chối trước khi ghi CSDL', async () => {
  let wrote = false;
  await withPatched(prisma, '$transaction', async () => {
    wrote = true;
  }, async () => {
    assert.equal(await updateBillStatus('bill-1', 'REFUNDED' as 'PAID'), null);
  });
  assert.equal(wrote, false);
});

test('hóa đơn và báo thanh toán đổi trong cùng một transaction', async () => {
  const ops: string[] = [];
  const tx = {
    utilityBill: {
      update: async () => {
        ops.push('bill');
        return { id: 'bill-2', roomId: 3, status: 'PAID', month: '10/2026', createdAt: new Date() };
      },
    },
    billPayment: {
      updateMany: async () => {
        ops.push('claim');
        return { count: 1 };
      },
    },
  };
  await withPatched(prisma, '$transaction', async (fn: (t: typeof tx) => unknown) => fn(tx), async () => {
    await withPatched(prisma.billPayment, 'findUnique', async () => null, async () => {
      const bill = await updateBillStatus('bill-2', 'PAID');
      assert.equal(bill?.status, 'PAID');
    });
  });
  assert.deepEqual(ops, ['bill', 'claim']);
});

// ------------------------------------------------------------
// Yêu cầu ở ghép
// ------------------------------------------------------------
test('nhận diện mã lỗi Prisma', () => {
  assert.equal(prismaErrorCode(prismaError('P2002')), 'P2002');
  assert.equal(prismaErrorCode(new Error('ECONNREFUSED')), null);
  assert.equal(prismaErrorCode(null), null);
});

test('CSDL lỗi khi đổi trạng thái yêu cầu ở ghép: trả 500, không báo thành công', async () => {
  await withPatched(prisma.roommateRequest, 'update', async () => {
    throw prismaError('P2003');
  }, async () => {
    const saved = await saveRequestStatus('req-db', 'ACCEPTED');
    assert.ok('error' in saved);
    if ('error' in saved) assert.equal(saved.error.status, 500);
  });
});

test('yêu cầu không có trong CSDL lẫn bộ nhớ: 404', async () => {
  await withPatched(prisma.roommateRequest, 'update', async () => {
    throw prismaError('P2025');
  }, async () => {
    const saved = await saveRequestStatus(`req-missing-${Date.now()}`, 'ACCEPTED');
    assert.ok('error' in saved);
    if ('error' in saved) assert.equal(saved.error.status, 404);
  });
});

test('yêu cầu chỉ có ở bộ nhớ (bài mẫu / offline) vẫn đổi trạng thái được', async () => {
  const id = `req-memory-${Date.now()}`;
  addRequest({
    id,
    post_id: 'post-sample',
    requester_id: 'user-b',
    message: '',
    status: 'PENDING',
    created_at: new Date().toISOString(),
  } as Parameters<typeof addRequest>[0]);
  await withPatched(prisma.roommateRequest, 'update', async () => {
    throw prismaError('P2025');
  }, async () => {
    const saved = await saveRequestStatus(id, 'REJECTED');
    assert.ok('data' in saved);
    if ('data' in saved) assert.equal((saved.data as { status: string }).status, 'REJECTED');
  });
});

// ------------------------------------------------------------
// Thông báo theo SĐT: chỉ tài khoản đã xác minh số đó
// ------------------------------------------------------------
test('điều kiện tìm người nhận theo SĐT đòi đã xác minh và loại khách vãng lai', () => {
  assert.deepEqual(verifiedTenantPhoneWhere('0901234567'), {
    phone: '0901234567',
    role: 'TENANT',
    phoneVerified: true,
    NOT: { id: { startsWith: 'user_guest_' } },
  });
});

test('SĐT trên hợp đồng chỉ thuộc tài khoản chưa xác minh: không gắn thông báo vào tài khoản đó', async () => {
  const where: unknown[] = [];
  await withPatched(prisma.user, 'findFirst', async (args: { where: Record<string, unknown> }) => {
    where.push(args.where);
    // Giả lập CSDL: chỉ có một tài khoản CHƯA xác minh mang số này
    return args.where.phoneVerified === true ? null : { id: 'user_unverified', email: 'x@y.vn', name: 'X', phone: '0901234567' };
  }, async () => {
    const recipient = await resolveTenantRecipient({ phone: '0901234567', name: 'Người thuê' });
    assert.equal(recipient.userId, undefined, 'không chọn tài khoản chưa xác minh');
    assert.equal(recipient.phone, '0901234567', 'vẫn gắn SĐT để chủ thật của số (đã xác minh) đọc được');
  });
  assert.equal((where[0] as { phoneVerified?: boolean }).phoneVerified, true);
});
