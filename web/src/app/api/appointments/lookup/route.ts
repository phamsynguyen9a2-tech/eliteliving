import { NextRequest, NextResponse } from 'next/server';
import { getAppointmentById, updateAppointmentStatus } from '@/lib/db';
import { toLookupView, verifyAppointmentLookupToken } from '@/lib/appointment-lookup';

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
    return NextResponse.json({ success: true, data: toLookupView(appointment) });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Không tải được lịch hẹn lúc này. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}

/** POST /api/appointments/lookup { token, action: 'CANCEL' } */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
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
