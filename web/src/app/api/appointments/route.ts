import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { bookAppointment, getAppointments, getRoomById, updateAppointmentStatus } from '@/lib/db';
import { checkRateLimit } from '@/lib/spam-filter';

const isValidPhone = (p: string) => {
  const cleaned = p.replace(/\s|-/g, '');
  return /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-689]|9[0-46-9])\d{7}$/.test(cleaned);
};

const normalizePhone = (phone: string) => {
  const cleaned = phone.replace(/\s|-/g, '');
  return cleaned.startsWith('+84') ? `0${cleaned.slice(3)}` : cleaned;
};

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId') ? Number(searchParams.get('roomId')) : undefined;
  const isAdmin = session?.user?.role === 'ADMIN';
  const userId = isAdmin
    ? searchParams.get('userId') || undefined
    : session?.user?.id || undefined;
  const userPhone = isAdmin
    ? searchParams.get('phone') || undefined
    : session?.user?.phone || undefined;

  // Bảo vệ riêng tư: khách vãng lai không được liệt kê lịch hẹn theo phòng,
  // vì dữ liệu trả về có thông tin liên hệ của người đặt lịch.
  if (!session?.user && !isAdmin) {
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
    const { room_id, user_name, user_phone, date, time_slot, notes } = body;

    const isAuthenticated = Boolean(session?.user?.id);
    const actualUserId = session?.user?.id || `user_guest_${randomUUID()}`;
    const suppliedName = isAuthenticated
      ? session?.user?.name || user_name || 'Khách thuê'
      : user_name || 'Khách thuê';
    const actualName = typeof suppliedName === 'string' ? suppliedName.trim() : '';
    const suppliedPhone = isAuthenticated
      ? session?.user?.phone || user_phone || ''
      : user_phone || '';
    const actualPhone = typeof suppliedPhone === 'string' ? normalizePhone(suppliedPhone) : '';

    if (!room_id || !actualName || !actualPhone || !date || !time_slot) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc để đặt lịch hẹn' },
        { status: 400 }
      );
    }

    if (actualName.length < 2 || actualName.length > 100) {
      return NextResponse.json(
        { success: false, message: 'Họ tên người xem phải có từ 2 đến 100 ký tự.' },
        { status: 400 }
      );
    }

    if (typeof notes === 'string' && notes.length > 1000) {
      return NextResponse.json(
        { success: false, message: 'Ghi chú không được vượt quá 1.000 ký tự.' },
        { status: 400 }
      );
    }

    const numericRoomId = Number(room_id);
    if (!Number.isInteger(numericRoomId) || numericRoomId <= 0) {
      return NextResponse.json(
        { success: false, message: 'Mã phòng không hợp lệ.' },
        { status: 400 }
      );
    }

    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, message: 'Ngày xem phòng không đúng định dạng YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    const [bookingYear, bookingMonth, bookingDay] = date.split('-').map(Number);
    const bookingDate = new Date(bookingYear, bookingMonth - 1, bookingDay);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isRealCalendarDate =
      bookingDate.getFullYear() === bookingYear &&
      bookingDate.getMonth() === bookingMonth - 1 &&
      bookingDate.getDate() === bookingDay;
    if (!isRealCalendarDate || bookingDate < today) {
      return NextResponse.json(
        { success: false, message: 'Ngày xem phòng phải từ hôm nay trở đi.' },
        { status: 400 }
      );
    }

    const slotMatch = typeof time_slot === 'string'
      ? time_slot.match(/^([01]\d|2[0-3]):([0-5]\d)\s-\s([01]\d|2[0-3]):([0-5]\d)$/)
      : null;
    const slotStart = slotMatch ? Number(slotMatch[1]) * 60 + Number(slotMatch[2]) : 0;
    const slotEnd = slotMatch ? Number(slotMatch[3]) * 60 + Number(slotMatch[4]) : 0;
    if (!slotMatch || slotEnd <= slotStart) {
      return NextResponse.json(
        { success: false, message: 'Khung giờ xem phòng không hợp lệ.' },
        { status: 400 }
      );
    }

    const room = await getRoomById(numericRoomId);
    if (!room) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy phòng cần đặt lịch.' },
        { status: 404 }
      );
    }
    if (room.status === 'RESERVED' || room.status === 'RENTED') {
      return NextResponse.json(
        { success: false, message: 'Phòng này hiện không còn nhận lịch xem mới.' },
        { status: 409 }
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
      room_id: numericRoomId,
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi xử lý lịch hẹn.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Bạn cần đăng nhập để cập nhật lịch hẹn.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !['CANCELLED'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Khách thuê chỉ có thể hủy lịch hẹn của mình.' },
        { status: 400 }
      );
    }

    const ownedAppointments = await getAppointments({
      user_id: session.user.id,
      user_phone: session.user.phone || undefined,
    });
    const ownedAppointment = ownedAppointments.find((appointment) => appointment.id === id);
    if (!ownedAppointment) {
      return NextResponse.json(
        { success: false, message: 'Bạn không có quyền cập nhật lịch hẹn này.' },
        { status: 403 }
      );
    }

    if (!['PENDING', 'CONFIRMED'].includes(ownedAppointment.status)) {
      return NextResponse.json(
        { success: false, message: 'Chỉ lịch đang chờ hoặc đã xác nhận mới có thể hủy.' },
        { status: 409 }
      );
    }

    const updated = await updateAppointmentStatus(id, status);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Lịch hẹn không tìm thấy' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi cập nhật lịch hẹn.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
