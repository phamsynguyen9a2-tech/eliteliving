import { NextRequest, NextResponse } from 'next/server';
import { getRoomById, isPubliclyListed } from '@/lib/db';
import { canPreviewUnlistedRoom } from '@/lib/room-visibility';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const room = await getRoomById(Number(id));

  if (!room || (!isPubliclyListed(room) && !(await canPreviewUnlistedRoom(room, { fromApi: true })))) {
    return NextResponse.json({ success: false, message: 'Phòng không tồn tại' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: room
  });
}
