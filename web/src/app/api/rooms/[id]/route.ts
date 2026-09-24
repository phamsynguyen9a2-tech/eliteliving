import { NextRequest, NextResponse } from 'next/server';
import { getRoomById } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const room = await getRoomById(Number(id));

  if (!room) {
    return NextResponse.json({ success: false, message: 'Phòng không tồn tại' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: room
  });
}
