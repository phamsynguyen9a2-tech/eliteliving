import { NextResponse } from 'next/server';
import { getAdminStats } from '@/lib/db';

export async function GET() {
  const stats = await getAdminStats();
  return NextResponse.json({
    success: true,
    data: stats
  });
}
