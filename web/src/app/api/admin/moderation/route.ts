import { NextRequest, NextResponse } from 'next/server';
import { countListingsByStatus, getModerationQueue, moderateRoom } from '@/lib/db';
import { businessErrorResponse, requireAdmin } from '@/lib/admin-guard';
import { publishRealtime } from '@/lib/realtime-bus';

const STATUSES = ['PENDING', 'REJECTED', 'APPROVED'] as const;

/** Hàng đợi kiểm duyệt tin đăng: GET ?status=PENDING|REJECTED|APPROVED */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const raw = new URL(request.url).searchParams.get('status') || 'PENDING';
  const status = (STATUSES as readonly string[]).includes(raw) ? (raw as (typeof STATUSES)[number]) : 'PENDING';
  const [counts, items] = await Promise.all([countListingsByStatus(), getModerationQueue(status, status === 'APPROVED' ? 50 : 200)]);
  return NextResponse.json({ success: true, data: { counts, items } });
}

/** Duyệt / từ chối: { roomId, decision: 'APPROVED' | 'REJECTED', note } */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const body = await request.json().catch(() => ({}));
  const roomId = Number(body.roomId);
  const decision = body.decision === 'APPROVED' || body.decision === 'REJECTED' ? body.decision : null;
  if (!Number.isInteger(roomId) || roomId <= 0 || !decision) {
    return NextResponse.json({ success: false, message: 'Thiếu mã phòng hoặc quyết định duyệt.' }, { status: 400 });
  }
  try {
    const room = await moderateRoom(roomId, decision, body.note);
    publishRealtime({ type: 'room', roomId, landlordId: room.landlord_id });
    return NextResponse.json({
      success: true,
      data: room,
      message: decision === 'APPROVED'
        ? `Đã duyệt tin phòng ${room.room_code}. Tin đã hiện công khai.`
        : `Đã từ chối tin phòng ${room.room_code}. Chủ trọ sẽ thấy lý do trong danh sách phòng.`,
    });
  } catch (err) {
    const mapped = businessErrorResponse(err, { MODERATION_NOTE_REQUIRED: 400 });
    if (mapped) return mapped;
    return NextResponse.json({ success: false, message: 'Không tìm thấy phòng cần duyệt.' }, { status: 404 });
  }
}
