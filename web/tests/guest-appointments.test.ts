/**
 * Kiểm thử lịch hẹn của khách vãng lai: mã tra cứu có chữ ký (không làm giả / sửa được),
 * API tra cứu và hủy lịch bằng mã, gộp lịch vào tài khoản sau khi xác minh SĐT.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import {
  createAppointmentLookupToken,
  maskPhone,
  toLookupView,
  verifyAppointmentLookupToken,
} from '../src/lib/appointment-lookup';
import { mergeGuestAppointmentsIntoUser } from '../src/lib/db';
import { GET, POST } from '../src/app/api/appointments/lookup/route';
import prisma from '../src/lib/prisma';
import type { Appointment } from '../src/lib/types';

type Row = Record<string, unknown>;
const host = prisma as unknown as Record<string, Record<string, unknown>> & { $transaction: unknown };

/** Gán đè vài hàm của Prisma trong lúc chạy `run`, xong thì trả lại như cũ. */
async function withPrisma<T>(stubs: Record<string, Record<string, unknown>>, run: () => Promise<T>) {
  const originals: [string, string, unknown][] = [];
  for (const [model, fns] of Object.entries(stubs)) {
    for (const [fn, impl] of Object.entries(fns)) {
      const target = model === '$' ? (host as unknown as Record<string, unknown>) : host[model];
      originals.push([model, fn, target[fn]]);
      target[fn] = impl;
    }
  }
  try {
    return await run();
  } finally {
    for (const [model, fn, original] of originals) {
      const target = model === '$' ? (host as unknown as Record<string, unknown>) : host[model];
      target[fn] = original;
    }
  }
}

const appointmentRow = (status: string): Row => ({
  id: 'apt_guest_1',
  roomId: 1191,
  userId: 'user_guest_0349929702',
  userName: 'Anh Nguyễn Tuấn',
  userPhone: '0349929702',
  date: '2026-11-25',
  timeSlot: '18:30 - 19:30',
  status,
  createdAt: new Date('2026-10-29T10:00:00Z'),
  room: { roomCode: 'P.201', title: 'P.201 (1PN)', address: 'Quận 1', images: [], project: { name: 'Chung cư mini' } },
});

// ------------------------------------------------------------
// Mã tra cứu
// ------------------------------------------------------------
test('mã tra cứu: mã đúng mở được đúng lịch hẹn', () => {
  const token = createAppointmentLookupToken('apt_123', 'khoa-bi-mat');
  assert.ok(token);
  assert.equal(verifyAppointmentLookupToken(token, 'khoa-bi-mat'), 'apt_123');
});

test('mã tra cứu: sửa mã lịch hẹn, sửa chữ ký, sai khóa hoặc sai định dạng đều bị từ chối', () => {
  const token = createAppointmentLookupToken('apt_123', 'khoa-bi-mat')!;
  const signature = token.slice(token.lastIndexOf('.') + 1);
  assert.equal(verifyAppointmentLookupToken(`apt_124.${signature}`, 'khoa-bi-mat'), null, 'đổi sang lịch khác');
  const tampered = `${token.slice(0, -1)}${token.endsWith('x') ? 'y' : 'x'}`;
  assert.equal(verifyAppointmentLookupToken(tampered, 'khoa-bi-mat'), null, 'sửa chữ ký');
  assert.equal(verifyAppointmentLookupToken(token, 'khoa-khac'), null, 'khóa của máy chủ khác');
  for (const bad of ['', 'apt_123', '.abc', null, 123, 'a'.repeat(300)]) {
    assert.equal(verifyAppointmentLookupToken(bad, 'khoa-bi-mat'), null, String(bad));
  }
  assert.equal(createAppointmentLookupToken('apt_123', null), null, 'chưa cấu hình khóa thì không cấp mã');
});

test('trang tra cứu che SĐT và không trả mã người dùng', () => {
  assert.equal(maskPhone('0349929702'), '034****702');
  const view = toLookupView({
    id: 'a',
    room_id: 1,
    user_id: 'user_guest_0349929702',
    user_name: 'An',
    user_phone: '0349929702',
    date: '2026-11-25',
    time_slot: '08:30 - 09:30',
    status: 'COMPLETED',
    created_at: '',
  } as Appointment);
  assert.equal('user_id' in view, false);
  assert.equal('user_phone' in view, false);
  assert.equal(view.user_phone_masked, '034****702');
  assert.equal(view.can_cancel, false);
});

// ------------------------------------------------------------
// API tra cứu / hủy
// ------------------------------------------------------------
test('API tra cứu: mã giả trả 404 mà không đọc cơ sở dữ liệu', async () => {
  let reads = 0;
  await withPrisma({ appointment: { findUnique: async () => (reads++, appointmentRow('PENDING')) } }, async () => {
    const res = await GET(new NextRequest('http://localhost/api/appointments/lookup?token=apt_guest_1.gia-mao'));
    assert.equal(res.status, 404);
    const cancel = await POST(
      new NextRequest('http://localhost/api/appointments/lookup', {
        method: 'POST',
        body: JSON.stringify({ token: 'apt_guest_1.gia-mao', action: 'CANCEL' }),
      })
    );
    assert.equal(cancel.status, 404);
  });
  assert.equal(reads, 0);
});

test('API tra cứu: mã thật xem được lịch, lịch đã xem phòng xong thì không hủy được (409)', async () => {
  const token = createAppointmentLookupToken('apt_guest_1')!;
  await withPrisma({ appointment: { findUnique: async () => appointmentRow('COMPLETED') } }, async () => {
    const res = await GET(new NextRequest(`http://localhost/api/appointments/lookup?token=${encodeURIComponent(token)}`));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.room_code, 'P.201');
    assert.equal(body.data.user_phone_masked, '034****702');

    const cancel = await POST(
      new NextRequest('http://localhost/api/appointments/lookup', {
        method: 'POST',
        body: JSON.stringify({ token, action: 'CANCEL' }),
      })
    );
    assert.equal(cancel.status, 409);
  });
});

test('API tra cứu: khách hủy được lịch đang chờ bằng mã tra cứu', async () => {
  const token = createAppointmentLookupToken('apt_guest_1')!;
  const updates: Row[] = [];
  const tx = {
    appointment: {
      update: async ({ data }: { data: Row }) => (updates.push(data), { ...appointmentRow('PENDING'), ...data }),
      findFirst: async () => null,
    },
    room: { updateMany: async () => ({ count: 1 }) },
  };
  await withPrisma(
    {
      appointment: { findUnique: async () => appointmentRow('PENDING') },
      $: { $transaction: async (fn: (t: unknown) => unknown) => fn(tx) },
    },
    async () => {
      const res = await POST(
        new NextRequest('http://localhost/api/appointments/lookup', {
          method: 'POST',
          body: JSON.stringify({ token, action: 'CANCEL' }),
        })
      );
      assert.equal(res.status, 200);
      assert.equal((await res.json()).data.status, 'CANCELLED');
    }
  );
  assert.deepEqual(updates, [{ status: 'CANCELLED' }]);
});

// ------------------------------------------------------------
// Gộp lịch vào tài khoản sau khi xác minh SĐT
// ------------------------------------------------------------
test('gộp lịch: chỉ chuyển lịch của bản ghi khách vãng lai cùng SĐT sang tài khoản đã xác minh', async () => {
  const calls: Row[] = [];
  await withPrisma(
    { appointment: { updateMany: async (args: Row) => (calls.push(args), { count: 2 }) } },
    async () => {
      assert.equal(await mergeGuestAppointmentsIntoUser('0349929702', 'user_real_1'), 2);
      // Bản ghi ngầm của khách không được "nhận" lịch của khách khác
      assert.equal(await mergeGuestAppointmentsIntoUser('0349929702', 'user_guest_0909999999'), 0);
      assert.equal(await mergeGuestAppointmentsIntoUser('0349929702', ''), 0);
    }
  );
  assert.deepEqual(calls, [{ where: { userId: 'user_guest_0349929702' }, data: { userId: 'user_real_1' } }]);
});
