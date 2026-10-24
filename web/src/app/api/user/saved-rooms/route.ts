import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getRoomsByIds } from '@/lib/db';
import { getRequestSession } from '@/lib/request-session';
import { isRoomSaved, listSavedRoomIds, saveRoom, unsaveRoom } from '@/lib/interaction-tracking';

async function requireTenant() {
  const session = await getRequestSession();
  const user = session?.user;
  if (!user?.id) {
    return { error: NextResponse.json({ success: false, message: 'Vui lòng đăng nhập để lưu phòng yêu thích.' }, { status: 401 }) };
  }
  if (user.role !== 'TENANT') {
    return { error: NextResponse.json({ success: false, message: 'Chỉ tài khoản khách thuê mới lưu được phòng.' }, { status: 403 }) };
  }
  return { userId: user.id };
}

function parseRoomId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * GET ?roomId=123 → { saved: boolean }
 * GET            → danh sách phòng đã lưu (mới lưu trước)
 */
export async function GET(request: NextRequest) {
  const auth = await requireTenant();
  if (auth.error) return auth.error;

  const roomId = parseRoomId(new URL(request.url).searchParams.get('roomId'));
  if (roomId) {
    return NextResponse.json({ success: true, data: { saved: await isRoomSaved(auth.userId, roomId) } });
  }

  const ids = await listSavedRoomIds(auth.userId);
  return NextResponse.json({ success: true, data: await getRoomsByIds(ids) });
}

/** POST { roomId } → lưu phòng (ghi BOOKMARK cho bộ gợi ý) */
export async function POST(request: NextRequest) {
  const auth = await requireTenant();
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => ({}));
  const roomId = parseRoomId(body?.roomId);
  if (!roomId) {
    return NextResponse.json({ success: false, message: 'Mã phòng không hợp lệ.' }, { status: 400 });
  }
  const exists = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true } });
  if (!exists) {
    return NextResponse.json({ success: false, message: 'Không tìm thấy phòng.' }, { status: 404 });
  }
  await saveRoom(auth.userId, roomId);
  return NextResponse.json({ success: true, data: { saved: true }, message: 'Đã lưu phòng vào danh sách yêu thích.' });
}

/** DELETE ?roomId=123 → bỏ lưu phòng */
export async function DELETE(request: NextRequest) {
  const auth = await requireTenant();
  if (auth.error) return auth.error;
  const roomId = parseRoomId(new URL(request.url).searchParams.get('roomId'));
  if (!roomId) {
    return NextResponse.json({ success: false, message: 'Mã phòng không hợp lệ.' }, { status: 400 });
  }
  await unsaveRoom(auth.userId, roomId);
  return NextResponse.json({ success: true, data: { saved: false }, message: 'Đã bỏ lưu phòng.' });
}
