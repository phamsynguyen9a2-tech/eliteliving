import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/request-session';
import { getAdminStats } from '@/lib/db';
import { getAdminErrorResponse, withDatabaseReadRetry } from '@/lib/database-resilience';


export async function GET() {
  try {
  const session = await getRequestSession();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, message: 'Bạn không có quyền xem thống kê quản trị.' },
      { status: session?.user ? 403 : 401 }
    );
  }

  const stats = await withDatabaseReadRetry(() => getAdminStats());
  return NextResponse.json({
    success: true,
    data: stats
  });
  } catch (error) {
    console.error('Admin stats GET error:', error);
    const response = getAdminErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
