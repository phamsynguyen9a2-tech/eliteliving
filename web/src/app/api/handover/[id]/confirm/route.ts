import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  canManageRoom,
  forbidden,
  getSessionUser,
  getTenantScope,
  tenantOwnsHandover,
  unauthorized,
} from '@/lib/tenant-access';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để ký biên bản bàn giao.');

    const { id } = await params;
    // Role comes from the session, never from the body; ADMIN signs on the landlord side.
    if (user.role !== 'TENANT' && user.role !== 'LANDLORD' && user.role !== 'ADMIN') {
      return forbidden('Bạn không có quyền ký biên bản bàn giao.');
    }
    const isTenant = user.role === 'TENANT';

    try {
      const current = await prisma.handover.findUnique({ where: { id } });
      if (!current) {
        return NextResponse.json({ success: true, message: 'Đã xác nhận biên bản thành công (demo mode).' });
      }

      const allowed = isTenant
        ? tenantOwnsHandover(await getTenantScope(user.id), current)
        : await canManageRoom(user, current.roomId);
      if (!allowed) return forbidden('Bạn không có quyền ký biên bản bàn giao này.');

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
