import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { getDemandInsights } from '@/lib/search-log';

/** Thống kê nhu cầu: khu vực được tìm nhiều, phòng được quan tâm nhiều (GET ?days=30) */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const days = Number(new URL(request.url).searchParams.get('days'));
  const windowDays = [7, 30, 90].includes(days) ? days : 30;
  return NextResponse.json({ success: true, data: await getDemandInsights(windowDays) });
}
