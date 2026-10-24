import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { HandoverComparison } from '@/lib/types';
import {
  canManageRoom,
  forbidden,
  getSessionUser,
  getTenantScope,
  tenantOwnsHandover,
  unauthorized,
} from '@/lib/tenant-access';

/**
 * Đối soát biên bản nhận phòng (CHECK_IN) với biên bản trả phòng (CHECK_OUT) của cùng một hợp đồng.
 * Chi phí hư hỏng lấy đúng số tiền chủ trọ ghi trên biên bản trả phòng.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để xem đối soát bàn giao.');

    const { id } = await params;
    const targetHandover = await prisma.handover.findUnique({
      where: { id },
      include: { items: true, room: true },
    });
    if (!targetHandover) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy biên bản bàn giao' }, { status: 404 });
    }

    const allowed =
      user.role === 'TENANT'
        ? tenantOwnsHandover(await getTenantScope(user.id), targetHandover)
        : await canManageRoom(user, targetHandover.roomId);
    if (!allowed) return forbidden('Bạn không có quyền xem đối soát bàn giao này.');

    // Cùng hợp đồng trước; biên bản cũ chưa gắn đúng hợp đồng thì lấy biên bản gần nhất của phòng.
    const findPair = async (type: 'CHECK_IN' | 'CHECK_OUT') =>
      (await prisma.handover.findFirst({
        where: { contractId: targetHandover.contractId, type },
        include: { items: true, room: true },
        orderBy: { createdAt: 'desc' },
      })) ||
      (await prisma.handover.findFirst({
        where: { roomId: targetHandover.roomId, type },
        include: { items: true, room: true },
        orderBy: { createdAt: 'desc' },
      }));

    const checkoutHandover =
      targetHandover.type === 'CHECK_OUT' ? targetHandover : (await findPair('CHECK_OUT')) || targetHandover;
    const checkinHandover = targetHandover.type === 'CHECK_IN' ? targetHandover : await findPair('CHECK_IN');

    const comparisonList: HandoverComparison[] = [];
    let totalDamageCost = 0;

    checkoutHandover.items.forEach((outItem) => {
      const inItem = checkinHandover?.items.find(
        (i) => i.assetName.toLowerCase() === outItem.assetName.toLowerCase()
      );

      const hasDamage =
        outItem.condition === 'Hư hỏng' ||
        outItem.condition === 'Mất' ||
        (inItem && inItem.condition === 'Tốt' && outItem.condition !== 'Tốt') ||
        (outItem.estimatedCost && outItem.estimatedCost > 0);

      const damageCost = Math.max(0, outItem.estimatedCost || 0);
      totalDamageCost += damageCost;

      comparisonList.push({
        asset_name: outItem.assetName,
        category: outItem.category as any,
        check_in_condition: (inItem?.condition || 'Tốt') as any,
        check_in_quantity: inItem?.quantity || outItem.quantity || 1,
        check_out_condition: outItem.condition as any,
        check_out_quantity: outItem.quantity,
        has_damage: Boolean(hasDamage),
        damage_cost: damageCost,
        check_in_photos: inItem?.photos || [],
        check_out_photos: outItem.photos || [],
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        room_code: checkoutHandover.room?.roomCode || `P-${checkoutHandover.roomId}`,
        room_title: checkoutHandover.room?.title || 'Phòng cho thuê',
        tenant_name: checkoutHandover.tenantName,
        check_in_date: (checkinHandover?.handoverDate || checkoutHandover.handoverDate).toISOString(),
        check_out_date: checkoutHandover.handoverDate.toISOString(),
        total_damage_cost: totalDamageCost,
        comparisons: comparisonList,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
