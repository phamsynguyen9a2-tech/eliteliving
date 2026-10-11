import { NextRequest, NextResponse } from 'next/server';
import { bookAppointment, getAppointments, updateAppointmentStatus } from '@/lib/db';
import { checkRateLimit } from '@/lib/spam-filter';

const isValidPhone = (p: string) => {
  const cleaned = p.replace(/\s|-/g, '');
  return /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-689]|9[0-46-9])\d{7}$/.test(cleaned);
};

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId') ? Number(searchParams.get('roomId')) : undefined;
  const userId = searchParams.get('userId') || session?.user?.id || undefined;
  const userPhone = searchParams.get('phone') || session?.user?.phone || undefined;
  const isAdmin = session?.user?.role === 'ADMIN';

  // Bảo vệ riêng tư: Khách vãng lai / request không định danh người dùng và không chọn phòng cụ thể -> trả về rỗng []
  if (!roomId && !userId && !userPhone && !isAdmin) {
    return NextResponse.json({ success: true, data: [] });
  }

  const appointments = await getAppointments({
    room_id: roomId,
    user_id: userId,
    user_phone: userPhone,
  });
  return NextResponse.json({ success: true, data: appointments });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { room_id, user_id, user_name, user_phone, date, time_slot, notes } = body;

    const actualUserId = session?.user?.id || (user_id && user_id !== 'user_current' ? user_id : null) || `user_guest_${Date.now()}`;
    const actualName = user_name || session?.user?.name || 'Khách thuê';
    const actualPhone = user_phone || session?.user?.phone || '';

    if (!room_id || !actualName || !actualPhone || !date || !time_slot) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc để đặt lịch hẹn' },
        { status: 400 }
      );
    }

    // Lọc rác: Kiểm tra định dạng số điện thoại
    if (!isValidPhone(actualPhone)) {
      return NextResponse.json(
        { success: false, message: 'Số điện thoại không hợp lệ. Vui lòng cung cấp SĐT thật của bạn để chủ nhà liên hệ.' },
        { status: 400 }
      );
    }

    // Lọc rác Tầng 3: Kiểm tra Rate Limit & Spam score nếu là tài khoản đã đăng ký
    if (actualUserId && !actualUserId.startsWith('user_guest_')) {
      try {
        const rateCheck = await checkRateLimit(actualUserId, 'BOOK_VIEWING');
        if (!rateCheck.allowed) {
          return NextResponse.json(
            { success: false, message: rateCheck.message || 'Hành động bị chặn bởi bộ lọc chống spam.' },
            { status: 429 }
          );
        }
      } catch {
        // Fallback gracefully if database table is not yet synced
      }
    }

    // Call bookAppointment which enforces Concurrency Control & Mutex lock
    const result = await bookAppointment({
      room_id: Number(room_id),
      user_id: actualUserId,
      user_name: actualName,
      user_phone: actualPhone,
      date,
      time_slot,
      notes
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 409 } // Conflict
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.appointment
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;
    const updated = await updateAppointmentStatus(id, status);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Lịch hẹn không tìm thấy' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
