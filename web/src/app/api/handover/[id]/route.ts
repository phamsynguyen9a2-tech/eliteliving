import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { INITIAL_HANDOVERS } from '@/lib/../data/sample_handovers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Try DB
    try {
      const dbHandover = await prisma.handover.findUnique({
        where: { id },
        include: { items: true, room: true, contract: true },
      });

      if (dbHandover) {
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
    } catch {}

    const matched = INITIAL_HANDOVERS.find((h) => h.id === id);
    if (!matched) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy biên bản bàn giao' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: matched });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
