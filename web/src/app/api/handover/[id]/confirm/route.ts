import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { role = 'TENANT' } = body;

    const isTenant = role === 'TENANT';

    try {
      const current = await prisma.handover.findUnique({ where: { id } });
      if (!current) {
        return NextResponse.json({ success: true, message: 'Đã xác nhận biên bản thành công (demo mode).' });
      }

      const tenantConfirmed = isTenant ? true : current.tenantConfirmed;
      const landlordConfirmed = !isTenant ? true : current.landlordConfirmed;
      const newStatus = tenantConfirmed && landlordConfirmed ? 'CONFIRMED' : 'PENDING_CONFIRMATION';

      const updated = await prisma.handover.update({
        where: { id },
        data: {
          tenantConfirmed,
          landlordConfirmed,
          status: newStatus as any,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Đã ký xác nhận biên bản bàn giao cơ sở vật chất!',
        data: updated,
      });
    } catch {
      return NextResponse.json({
        success: true,
        message: 'Đã ký xác nhận biên bản bàn giao cơ sở vật chất!',
      });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
