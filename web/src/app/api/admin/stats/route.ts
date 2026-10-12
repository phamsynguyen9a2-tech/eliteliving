import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAdminStats } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
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
