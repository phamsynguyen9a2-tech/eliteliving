import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { INITIAL_HANDOVERS, DEFAULT_ASSET_TEMPLATES } from '@/lib/../data/sample_handovers';
import type { Handover, HandoverItem } from '@/lib/types';

let handoversStore = [...INITIAL_HANDOVERS];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId') ? Number(searchParams.get('roomId')) : undefined;
    const contractId = searchParams.get('contractId') || undefined;

    // Try DB
    try {
      const where: any = {};
      if (roomId) where.roomId = roomId;
      if (contractId) where.contractId = contractId;

      const dbHandovers = await prisma.handover.findMany({
        where,
        include: {
          items: true,
          room: true,
          contract: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (dbHandovers && dbHandovers.length > 0) {
        return NextResponse.json({
          success: true,
          data: dbHandovers.map((h) => ({
            id: h.id,
            contract_id: h.contractId,
            room_id: h.roomId,
            type: h.type,
            tenant_name: h.tenantName,
            tenant_phone: h.tenantPhone,
            landlord_name: h.landlordName,
            status: h.status,
            tenant_confirmed: h.tenantConfirmed,
            landlord_confirmed: h.landlordConfirmed,
            notes: h.notes || undefined,
            damage_cost: h.damageCost,
            handover_date: h.handoverDate.toISOString(),
            created_at: h.createdAt.toISOString(),
            room_code: h.room?.roomCode,
            room_title: h.room?.title,
            items: h.items.map((i) => ({
              id: i.id,
              handover_id: i.handoverId,
              asset_name: i.assetName,
              category: i.category,
              quantity: i.quantity,
              condition: i.condition,
              photos: i.photos,
              note: i.note || undefined,
              estimated_cost: i.estimatedCost,
            })),
          })),
        });
      }
    } catch {}

    // Fallback store
    let filtered = [...handoversStore];
    if (roomId) filtered = filtered.filter((h) => h.room_id === roomId);
    if (contractId) filtered = filtered.filter((h) => h.contract_id === contractId);

    return NextResponse.json({
      success: true,
      data: filtered,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle Tenant or Landlord Handover Confirmation
    if (body.action === 'CONFIRM_HANDOVER') {
      const { handoverId, role } = body;
      try {
        const updateData: any = {};
        if (role === 'TENANT') {
          updateData.tenantConfirmed = true;
          updateData.status = 'CONFIRMED';
        } else {
          updateData.landlordConfirmed = true;
        }
        await prisma.handover.update({
          where: { id: handoverId },
          data: updateData,
        });
      } catch (dbErr) {
        console.warn('DB Handover update fallback to memory:', dbErr);
      }

      const hIndex = handoversStore.findIndex((h) => h.id === handoverId);
      if (hIndex !== -1) {
        if (role === 'TENANT') {
          handoversStore[hIndex].tenant_confirmed = true;
          handoversStore[hIndex].status = 'CONFIRMED';
        } else {
          handoversStore[hIndex].landlord_confirmed = true;
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Ký xác nhận biên bản bàn giao cơ sở vật chất thành công!',
      });
    }

    const {
      contract_id = 'ct_general',
      room_id = 101,
      room_code = 'P-101',
      room_title = 'Phòng cho thuê',
      type = 'CHECK_IN',
      tenant_name,
      tenant_phone,
      landlord_name = 'Chủ trọ',
      notes = '',
      items = [],
      handover_date = new Date().toISOString(),
    } = body;

    if (!tenant_name || !tenant_phone) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng cung cấp tên và số điện thoại người thuê' },
        { status: 400 }
      );
    }

    // Calculate total damage cost if any
    const parsedItems: HandoverItem[] = (items.length > 0 ? items : DEFAULT_ASSET_TEMPLATES).map(
      (item: any, idx: number) => ({
        id: `item_${Date.now()}_${idx}`,
        handover_id: `ho_${Date.now()}`,
        asset_name: item.name || item.asset_name,
        category: item.category || 'Nội thất',
        quantity: Number(item.quantity || 1),
        condition: item.condition || 'Tốt',
        photos: item.photos || [],
        note: item.note || '',
        estimated_cost: Number(item.estimated_cost || 0),
      })
    );

    const totalDamage = parsedItems.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);

    const newHandover: Handover & { items: HandoverItem[] } = {
      id: `ho_${Date.now()}`,
      contract_id,
      room_id: Number(room_id),
      room_code,
      room_title,
      type: type as any,
      tenant_name,
      tenant_phone,
      landlord_name,
      status: 'PENDING_CONFIRMATION',
      tenant_confirmed: false,
      landlord_confirmed: true,
      damage_cost: totalDamage,
      notes,
      handover_date,
      created_at: new Date().toISOString(),
      items: parsedItems,
    };

    // Try DB
    try {
      await prisma.handover.create({
        data: {
          id: newHandover.id,
          contractId: newHandover.contract_id,
          roomId: newHandover.room_id,
          type: newHandover.type,
          tenantName: newHandover.tenant_name,
          tenantPhone: newHandover.tenant_phone,
          landlordName: newHandover.landlord_name,
          status: 'PENDING_CONFIRMATION',
          tenantConfirmed: false,
          landlordConfirmed: true,
          damageCost: newHandover.damage_cost,
          notes: newHandover.notes,
          handoverDate: new Date(newHandover.handover_date),
          items: {
            create: parsedItems.map((i) => ({
              id: i.id,
              assetName: i.asset_name,
              category: i.category,
              quantity: i.quantity,
              condition: i.condition,
              photos: i.photos,
              note: i.note,
              estimatedCost: i.estimated_cost,
            })),
          },
        },
      });
    } catch {}

    handoversStore.unshift(newHandover);

    return NextResponse.json({
      success: true,
      message: `Tạo biên bản bàn giao ${type === 'CHECK_IN' ? 'Nhận phòng' : 'Trả phòng'} thành công!`,
      data: newHandover,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
