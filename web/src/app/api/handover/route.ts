import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DEFAULT_ASSET_TEMPLATES } from '@/lib/../data/sample_handovers';
import type { Handover, HandoverItem } from '@/lib/types';
import { signHandover } from '@/lib/db';
import { lifecycleErrorResponse } from '@/lib/lifecycle-errors';
import {
  canManageRoom,
  forbidden,
  getSessionUser,
  getTenantScope,
  tenantHandoverWhere,
  tenantOwnsHandover,
  unauthorized,
  type SessionUser,
} from '@/lib/tenant-access';

async function canConfirmHandover(
  user: SessionUser,
  h: { id: string; roomId: number; tenantPhone: string; contractId: string }
) {
  if (user.role === 'TENANT') return tenantOwnsHandover(await getTenantScope(user.id), h);
  return canManageRoom(user, h.roomId);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để xem biên bản bàn giao.');
    if (!['TENANT', 'LANDLORD', 'ADMIN'].includes(user.role)) {
      return forbidden('Bạn không có quyền xem biên bản bàn giao.');
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId') ? Number(searchParams.get('roomId')) : undefined;
    const contractId = searchParams.get('contractId') || undefined;

    const tenantScope = user.role === 'TENANT' ? await getTenantScope(user.id) : null;
    const where: any = {};
    if (roomId) where.roomId = roomId;
    if (contractId) where.contractId = contractId;
    if (user.role === 'LANDLORD') where.room = { landlordId: user.id };
    if (tenantScope) {
      // Lọc ngay trong CSDL: trước đây tải mọi biên bản của hệ thống rồi mới lọc trong bộ nhớ
      const ownWhere = tenantHandoverWhere(tenantScope);
      if (!ownWhere) return NextResponse.json({ success: true, data: [] });
      where.AND = [ownWhere];
    }

    const dbHandovers = await prisma.handover.findMany({
      where,
      // Không nạp hợp đồng kèm theo: không dùng tới khi trả về
      include: {
        items: true,
        room: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const visibleHandovers = tenantScope
      ? dbHandovers.filter((h) => tenantOwnsHandover(tenantScope, h))
      : dbHandovers;

    return NextResponse.json({
      success: true,
      data: visibleHandovers.map((h) => ({
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
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để thao tác với biên bản bàn giao.');

    const body = await request.json();

    // Handle Tenant or Landlord Handover Confirmation
    if (body.action === 'CONFIRM_HANDOVER') {
      const { handoverId } = body;
      if (!handoverId) {
        return NextResponse.json(
          { success: false, message: 'Thiếu mã biên bản bàn giao (handoverId).' },
          { status: 400 }
        );
      }

      const role = user.role === 'TENANT' ? 'TENANT' : 'LANDLORD';
      if (role === 'LANDLORD' && user.role !== 'LANDLORD' && user.role !== 'ADMIN') {
        return forbidden('Bạn không có quyền ký biên bản bàn giao.');
      }

      const dbHandover = await prisma.handover.findUnique({
        where: { id: String(handoverId) },
        select: {
          id: true,
          roomId: true,
          tenantPhone: true,
          contractId: true,
          tenantConfirmed: true,
          landlordConfirmed: true,
        },
      });

      const target = dbHandover;

      if (!target) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy biên bản bàn giao để ký xác nhận.' },
          { status: 404 }
        );
      }

      if (!(await canConfirmHandover(user, target))) {
        return forbidden('Bạn không có quyền ký biên bản bàn giao này.');
      }

      // Cùng quy tắc với /api/handover/[id]/confirm: chủ trọ ký yêu cầu trả phòng thì hợp đồng kết thúc
      let signed;
      try {
        signed = await signHandover(target.id, role);
      } catch (err) {
        const errorResponse = lifecycleErrorResponse(err);
        if (errorResponse) return errorResponse;
        throw err;
      }

      return NextResponse.json({
        success: true,
        message: signed?.contractEnded
          ? 'Đã ký xác nhận biên bản trả phòng. Hợp đồng đã kết thúc và phòng được giải phóng.'
          : 'Ký xác nhận biên bản bàn giao cơ sở vật chất thành công!',
      });
    }

    // Creating a handover is a landlord operation on their own room.
    const numericRoomId = Number(body.room_id);
    if (!Number.isInteger(numericRoomId) || numericRoomId <= 0) {
      return NextResponse.json({ success: false, message: 'Vui lòng chọn phòng cần bàn giao.' }, { status: 400 });
    }
    if (!(await canManageRoom(user, numericRoomId))) {
      return forbidden('Chỉ chủ trọ sở hữu phòng mới được lập biên bản bàn giao.');
    }

    const {
      contract_id,
      room_code = '',
      room_title = 'Phòng cho thuê',
      type = 'CHECK_IN',
      tenant_name,
      tenant_phone,
      landlord_name = 'Chủ trọ',
      notes = '',
      items = [],
      handover_date = new Date().toISOString(),
    } = body;

    if (!tenant_name || !String(tenant_name).trim() || !tenant_phone || !String(tenant_phone).trim()) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng cung cấp đầy đủ họ tên và số điện thoại người thuê.' },
        { status: 400 }
      );
    }

    const roomRecord = await prisma.room.findUnique({
      where: { id: numericRoomId },
    });
    if (!roomRecord) {
      return NextResponse.json(
        { success: false, message: `Không tìm thấy phòng #${numericRoomId} trong cơ sở dữ liệu.` },
        { status: 404 }
      );
    }

    // Biên bản bàn giao luôn thuộc một hợp đồng thật của chính phòng này (không tự tạo hợp đồng).
    // Nhận phòng: hợp đồng đang hiệu lực. Trả phòng: hợp đồng đang hiệu lực, hoặc hợp đồng gần nhất vừa kết thúc.
    let targetContract = contract_id
      ? await prisma.contract.findUnique({ where: { id: String(contract_id) } })
      : null;
    if (contract_id && (!targetContract || targetContract.roomId !== roomRecord.id)) {
      return NextResponse.json(
        { success: false, message: 'Hợp đồng đã chọn không thuộc phòng này.' },
        { status: 400 }
      );
    }
    if (!targetContract) {
      targetContract = await prisma.contract.findFirst({
        where: { roomId: roomRecord.id, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
    }
    if (!targetContract && type === 'CHECK_OUT') {
      targetContract = await prisma.contract.findFirst({
        where: { roomId: roomRecord.id },
        orderBy: { createdAt: 'desc' },
      });
    }
    if (!targetContract) {
      return NextResponse.json(
        {
          success: false,
          message: 'Phòng này chưa có hợp đồng thuê. Vui lòng lập hợp đồng trước khi lập biên bản bàn giao.',
        },
        { status: 409 }
      );
    }

    const handoverId = `ho_${Date.now()}`;
    const parsedItems: HandoverItem[] = (items.length > 0 ? items : DEFAULT_ASSET_TEMPLATES).map(
      (item: any, idx: number) => ({
        id: `item_${Date.now()}_${idx}`,
        handover_id: handoverId,
        asset_name: item.name || item.asset_name || `Tài sản #${idx + 1}`,
        category: item.category || 'Nội thất',
        quantity: Math.max(1, Number(item.quantity || 1)),
        condition: item.condition || 'Tốt',
        photos: Array.isArray(item.photos) ? item.photos : [],
        note: item.note || '',
        estimated_cost: Math.max(0, Number(item.estimated_cost || 0)),
      })
    );

    const totalDamage = parsedItems.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);

    const createdDb = await prisma.handover.create({
      data: {
        id: handoverId,
        contractId: targetContract.id,
        roomId: roomRecord.id,
        type: (type === 'CHECK_OUT' ? 'CHECK_OUT' : 'CHECK_IN') as any,
        tenantName: String(tenant_name).trim(),
        tenantPhone: String(tenant_phone).trim(),
        landlordName: String(landlord_name).trim() || 'Chủ trọ',
        status: 'PENDING_CONFIRMATION',
        tenantConfirmed: false,
        landlordConfirmed: true,
        damageCost: totalDamage,
        notes: String(notes || ''),
        handoverDate: new Date(handover_date),
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
      include: {
        items: true,
        room: true,
      },
    });

    const newHandover: Handover & { items: HandoverItem[] } = {
      id: createdDb.id,
      contract_id: createdDb.contractId,
      room_id: createdDb.roomId,
      room_code: createdDb.room?.roomCode || room_code,
      room_title: createdDb.room?.title || room_title,
      type: createdDb.type as any,
      tenant_name: createdDb.tenantName,
      tenant_phone: createdDb.tenantPhone,
      landlord_name: createdDb.landlordName,
      status: createdDb.status as any,
      tenant_confirmed: createdDb.tenantConfirmed,
      landlord_confirmed: createdDb.landlordConfirmed,
      damage_cost: createdDb.damageCost,
      notes: createdDb.notes || '',
      handover_date: createdDb.handoverDate.toISOString(),
      created_at: createdDb.createdAt.toISOString(),
      items: createdDb.items.map((i) => ({
        id: i.id,
        handover_id: i.handoverId,
        asset_name: i.assetName,
        category: i.category as any,
        quantity: i.quantity,
        condition: i.condition as any,
        photos: i.photos,
        note: i.note || '',
        estimated_cost: i.estimatedCost,
      })),
    };

    return NextResponse.json({
      success: true,
      message: `Tạo biên bản bàn giao ${type === 'CHECK_IN' ? 'Nhận phòng' : 'Trả phòng'} thành công!`,
      data: newHandover,
    });
  } catch (err: any) {
    console.error('POST /api/handover error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Không thể lưu biên bản bàn giao vào cơ sở dữ liệu.' },
      { status: 500 }
    );
  }
}
