import { NextRequest, NextResponse } from 'next/server';
import { createRoom, deleteRoom, updateRoom } from '@/lib/db';
import { businessErrorResponse, requireAdmin } from '@/lib/admin-guard';
import prisma from '@/lib/prisma';
import { publishRoomEvent, publishRealtime } from '@/lib/realtime-bus';

/** Admin thêm phòng cho một chủ trọ: { landlordId, roomData } (tin do admin thêm được duyệt luôn) */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const body = await request.json().catch(() => ({}));
  const landlordId = typeof body.landlordId === 'string' ? body.landlordId : '';
  const landlord = landlordId ? await prisma.landlord.findUnique({ where: { id: landlordId } }) : null;
  if (!landlord) return NextResponse.json({ success: false, message: 'Vui lòng chọn chủ trọ phụ trách phòng.' }, { status: 400 });
  let room;
  try {
    room = await createRoom({ ...(body.roomData || {}), landlord_id: landlord.id }, { listingStatus: 'APPROVED' });
  } catch (err) {
    const errorResponse = businessErrorResponse(err, { BUILDING_NOT_OWNED: 403 });
    if (errorResponse) return errorResponse;
    throw err;
  }
  publishRealtime({ type: 'room', roomId: room.id, landlordId: landlord.id });
  return NextResponse.json({ success: true, data: room, message: `Đã thêm phòng ${room.room_code}.` });
}

/** Admin sửa phòng: { roomId, roomData } */
export async function PUT(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const body = await request.json().catch(() => ({}));
  const roomId = Number(body.roomId);
  let room;
  try {
    room = Number.isInteger(roomId) ? await updateRoom(roomId, body.roomData || {}) : null;
  } catch (err) {
    const errorResponse = businessErrorResponse(err, { BUILDING_NOT_OWNED: 403 });
    if (errorResponse) return errorResponse;
    throw err;
  }
  if (!room) return NextResponse.json({ success: false, message: 'Không tìm thấy phòng cần sửa.' }, { status: 404 });
  publishRoomEvent('room', roomId);
  return NextResponse.json({ success: true, data: room, message: `Đã lưu phòng ${room.room_code}.` });
}

/** Admin xóa phòng: DELETE ?id= (không xóa được phòng đã có hợp đồng / hóa đơn / bàn giao) */
export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ success: false, message: 'Thiếu mã phòng.' }, { status: 400 });
  try {
    const ok = await deleteRoom(id);
    if (!ok) return NextResponse.json({ success: false, message: 'Không xóa được phòng này.' }, { status: 400 });
    publishRealtime({ type: 'room', roomId: id });
    return NextResponse.json({ success: true, message: 'Đã xóa phòng.' });
  } catch (err) {
    const mapped = businessErrorResponse(err, { ROOM_HAS_RECORDS: 409 });
    if (mapped) return mapped;
    throw err;
  }
}
