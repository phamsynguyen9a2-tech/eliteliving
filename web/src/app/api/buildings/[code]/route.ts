import { NextRequest, NextResponse } from 'next/server';
import { getBuildingByCode } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const building = await getBuildingByCode(code);

  if (!building) {
    return NextResponse.json(
      { success: false, message: 'Không tìm thấy thông tin tòa nhà' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: building
  });
}
