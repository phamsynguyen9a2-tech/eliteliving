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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để xem biên bản bàn giao.');

    const { id } = await params;

    const dbHandover = await prisma.handover.findUnique({
      where: { id },
      include: { items: true, room: true, contract: true },
    });

    if (dbHandover) {
      const allowed = user.role === 'TENANT'
        ? tenantOwnsHandover(await getTenantScope(user.id), dbHandover)
        : await canManageRoom(user, dbHandover.roomId);
      if (!allowed) return forbidden('Bạn không có quyền xem biên bản bàn giao này.');
      return NextResponse.json({
        success: true,
        data: {
          id: dbHandover.id,
          contract_id: dbHandover.contractId,
          room_id: dbHandover.roomId,
          type: dbHandover.type,
          tenant_name: dbHandover.tenantName,
          tenant_phone: dbHandover.tenantPhone,
          landlord_name: dbHandover.landlordName,
          status: dbHandover.status,
          tenant_confirmed: dbHandover.tenantConfirmed,
          landlord_confirmed: dbHandover.landlordConfirmed,
          notes: dbHandover.notes,
          damage_cost: dbHandover.damageCost,
          handover_date: dbHandover.handoverDate.toISOString(),
          created_at: dbHandover.createdAt.toISOString(),
          room_code: dbHandover.room?.roomCode,
          room_title: dbHandover.room?.title,
          items: dbHandover.items.map((i) => ({
            id: i.id,
            handover_id: i.handoverId,
            asset_name: i.assetName,
            category: i.category,
            quantity: i.quantity,
            condition: i.condition,
            photos: i.photos,
            note: i.note,
            estimated_cost: i.estimatedCost,
          })),
        },
      });
    }

    return NextResponse.json({ success: false, message: 'Không tìm thấy biên bản bàn giao' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
