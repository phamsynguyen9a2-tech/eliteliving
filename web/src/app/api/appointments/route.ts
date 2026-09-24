import { NextRequest, NextResponse } from 'next/server';
import { bookAppointment, getAppointments, updateAppointmentStatus } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId') ? Number(searchParams.get('roomId')) : undefined;
  const userId = searchParams.get('userId') || undefined;

  const appointments = await getAppointments({ room_id: roomId, user_id: userId });
  return NextResponse.json({ success: true, data: appointments });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { room_id, user_id, user_name, user_phone, date, time_slot, notes } = body;

    if (!room_id || !user_name || !user_phone || !date || !time_slot) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc để đặt lịch hẹn' },
        { status: 400 }
      );
    }

    // Call bookAppointment which enforces Concurrency Control & Mutex lock
    const result = await bookAppointment({
      room_id: Number(room_id),
      user_id: user_id || `user_${Date.now()}`,
      user_name,
      user_phone,
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
