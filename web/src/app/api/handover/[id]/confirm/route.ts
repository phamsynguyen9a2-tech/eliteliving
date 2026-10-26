import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { signHandover } from '@/lib/db';
import { lifecycleErrorResponse } from '@/lib/lifecycle-errors';
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

    const current = await prisma.handover.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy biên bản bàn giao trong cơ sở dữ liệu.' },
        { status: 404 }
      );
    }

    const allowed = isTenant
      ? tenantOwnsHandover(await getTenantScope(user.id), current)
      : await canManageRoom(user, current.roomId);
    if (!allowed) return forbidden('Bạn không có quyền ký biên bản bàn giao này.');

    // Chủ trọ ký yêu cầu trả phòng của khách = đồng ý trả phòng: hợp đồng kết thúc cùng transaction
    let signed;
    try {
      signed = await signHandover(id, isTenant ? 'TENANT' : 'LANDLORD');
    } catch (err) {
      const errorResponse = lifecycleErrorResponse(err);
      if (errorResponse) return errorResponse;
      throw err;
    }
    if (!signed) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy biên bản bàn giao trong cơ sở dữ liệu.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: signed.contractEnded
        ? 'Đã ký xác nhận biên bản trả phòng. Hợp đồng đã kết thúc và phòng được giải phóng.'
        : 'Đã ký xác nhận biên bản bàn giao cơ sở vật chất!',
      data: signed.handover,
    });
  } catch (err: any) {
    console.error('POST /api/handover/[id]/confirm error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Lỗi khi ký xác nhận biên bản bàn giao.' },
      { status: 500 }
    );
  }
}
