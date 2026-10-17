import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/request-session';
import { getAdminStats } from '@/lib/db';


export async function GET() {
  const session = await getRequestSession();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, message: 'Bạn không có quyền xem thống kê quản trị.' },
      { status: session?.user ? 403 : 401 }
    );
  }

  const stats = await getAdminStats();
  return NextResponse.json({
    success: true,
    data: stats
  });
}
