import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAppointmentById, updateAppointmentStatus } from '@/lib/db';
import {
  createAppointmentLookupToken,
  createAppointmentShortCode,
  matchesAppointmentShortCode,
  toLookupView,
  verifyAppointmentLookupToken,
} from '@/lib/appointment-lookup';
import { createSlidingWindowLimiter, getTrustedClientIp } from '@/lib/guest-booking-limit';

/**
 * Chống dò mã 6 số: mỗi IP tối đa 10 lần tra / 15 phút, mỗi SĐT tối đa 5 lần nhập sai / 15 phút.
 * (1 triệu tổ hợp mã + phải biết đúng SĐT nên dò ngẫu nhiên gần như không thể.)
 */
const globalForLookup = globalThis as typeof globalThis & {
  __eliteLookupIpLimiter?: ReturnType<typeof createSlidingWindowLimiter>;
  __eliteLookupPhoneLimiter?: ReturnType<typeof createSlidingWindowLimiter>;
};
const lookupIpLimiter =
  globalForLookup.__eliteLookupIpLimiter ??
  (globalForLookup.__eliteLookupIpLimiter = createSlidingWindowLimiter(10, 15 * 60_000));
const lookupPhoneFailLimiter =
  globalForLookup.__eliteLookupPhoneLimiter ??
  (globalForLookup.__eliteLookupPhoneLimiter = createSlidingWindowLimiter(5, 15 * 60_000));

const normalizePhone = (phone: string) => {
  const cleaned = phone.replace(/\s|-|\./g, '');
  return cleaned.startsWith('+84') ? `0${cleaned.slice(3)}` : cleaned;
};

/**
 * Tra cứu / hủy lịch hẹn bằng mã tra cứu (dành cho khách vãng lai, không cần đăng nhập).
 * Mã có chữ ký HMAC nên chỉ người được cấp mã khi đặt lịch mới mở được đúng lịch hẹn đó.
 */

function invalidToken() {
  return NextResponse.json(
    { success: false, message: 'Mã tra cứu lịch hẹn không hợp lệ hoặc đã bị sửa.' },
    { status: 404 }
  );
}

async function findByToken(token: unknown) {
  const appointmentId = verifyAppointmentLookupToken(token);
  return appointmentId ? getAppointmentById(appointmentId) : null;
}

/** GET /api/appointments/lookup?token=<mã> */
export async function GET(request: NextRequest) {
  try {
    const appointment = await findByToken(new URL(request.url).searchParams.get('token'));
    if (!appointment) return invalidToken();
    // Người cầm link thấy kèm mã 6 số để ghi lại, mở lại trên máy khác bằng SĐT + mã
    return NextResponse.json({
      success: true,
      data: { ...toLookupView(appointment), lookup_code: createAppointmentShortCode(appointment.id) },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Không tải được lịch hẹn lúc này. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/appointments/lookup
 *  - { action: 'FIND', phone, code }  → tìm lịch bằng SĐT đặt lịch + mã 6 số, trả mã tra cứu đầy đủ
 *  - { action: 'CANCEL', token }      → hủy lịch
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.action === 'FIND') {
      return findByPhoneAndCode(request, body);
    }
    if (body?.action !== 'CANCEL') {
      return NextResponse.json({ success: false, message: 'Thao tác không hợp lệ.' }, { status: 400 });
    }
    const appointment = await findByToken(body.token);
    if (!appointment) return invalidToken();
    if (appointment.status !== 'PENDING' && appointment.status !== 'CONFIRMED') {
      return NextResponse.json(
        { success: false, message: 'Chỉ lịch đang chờ hoặc đã xác nhận mới có thể hủy.' },
        { status: 409 }
      );
    }
    const updated = await updateAppointmentStatus(appointment.id, 'CANCELLED');
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Không hủy được lịch hẹn. Vui lòng thử lại.' }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      message: 'Đã hủy lịch xem phòng.',
      data: toLookupView({ ...appointment, status: 'CANCELLED' }),
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Không hủy được lịch hẹn lúc này. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}

async function findByPhoneAndCode(request: NextRequest, body: { phone?: unknown; code?: unknown }) {
  const phone = typeof body.phone === 'string' ? normalizePhone(body.phone) : '';
  const code = typeof body.code === 'string' ? body.code.replace(/\D/g, '') : '';
  if (!/^0\d{9}$/.test(phone) || code.length !== 6) {
    return NextResponse.json(
      { success: false, message: 'Vui lòng nhập đúng số điện thoại đã đặt lịch và mã tra cứu gồm 6 chữ số.' },
      { status: 400 }
    );
  }
  const ip = getTrustedClientIp(request.headers);
  if (!lookupIpLimiter.hit(ip)) {
    return NextResponse.json(
      { success: false, message: 'Bạn đã tra cứu quá nhiều lần. Vui lòng thử lại sau 15 phút.' },
      { status: 429 }
    );
  }
  // Chỉ xét lịch của đúng SĐT đó; mã 6 số được tính lại từ từng lịch để so khớp
  const candidates = await prisma.appointment.findMany({
    where: { userPhone: phone },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true },
  });
  const match = candidates.find((item) => matchesAppointmentShortCode(item.id, code));
  if (!match) {
    if (!lookupPhoneFailLimiter.hit(phone)) {
      return NextResponse.json(
        { success: false, message: 'Nhập sai mã quá nhiều lần cho số điện thoại này. Vui lòng thử lại sau 15 phút.' },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { success: false, message: 'Không tìm thấy lịch hẹn khớp số điện thoại và mã tra cứu này.' },
      { status: 404 }
    );
  }
  const appointment = await getAppointmentById(match.id);
  const token = createAppointmentLookupToken(match.id);
  if (!appointment || !token) return invalidToken();
  return NextResponse.json({
    success: true,
    data: { ...toLookupView(appointment), lookup_code: code, lookup_token: token },
  });
}
