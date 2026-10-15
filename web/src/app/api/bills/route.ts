import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateBillStatus, getUtilityBills } from '@/lib/db';
import { generateMonthlyBillEmail } from '@/lib/email-service';
import {
  canManageRoom,
  forbidden,
  getSessionUser,
  getTenantScope,
  unauthorized,
} from '@/lib/tenant-access';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để xem hóa đơn.');

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId') ? Number(searchParams.get('roomId')) : undefined;

    // Tenant: only bills of rooms covered by their own contracts.
    if (user.role === 'TENANT') {
      const scope = await getTenantScope(user.id);
      if (roomId !== undefined && !scope.contractRoomIds.has(roomId)) {
        return NextResponse.json({ success: true, data: [] });
      }
      const bills = (await getUtilityBills({ roomId })).filter((bill) =>
        scope.contractRoomIds.has(bill.room_id)
      );
      return NextResponse.json({ success: true, data: bills });
    }

    if (user.role !== 'LANDLORD' && user.role !== 'ADMIN') {
      return forbidden('Bạn không có quyền xem hóa đơn.');
    }

    const landlordId = user.role === 'LANDLORD'
      ? user.id
      : searchParams.get('landlordId') || undefined;
    const bills = await getUtilityBills({ roomId, landlordId });
    return NextResponse.json({ success: true, data: bills });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để thao tác với hóa đơn.');

    const body = await request.json();
    const { action, billId, status, tenantEmail, tenantName } = body;

    if (action === 'PAY_BILL') {
      let billRoomId: number | null = null;
      try {
        const bill = await prisma.utilityBill.findUnique({
          where: { id: String(billId) },
          select: { roomId: true },
        });
        billRoomId = bill?.roomId ?? null;
      } catch {}

      // Unknown bill (demo/draft bill shown in /ho-so): nothing to update, keep demo flow.
      if (billRoomId !== null) {
        const allowed = user.role === 'TENANT'
          ? (await getTenantScope(user.id)).contractRoomIds.has(billRoomId)
          : await canManageRoom(user, billRoomId);
        if (!allowed) return forbidden('Bạn không có quyền thanh toán hóa đơn này.');
      }

      const updated = await updateBillStatus(billId, 'PAID');
      return NextResponse.json({
        success: true,
        message: '✅ Thanh toán hóa đơn thành công! Trạng thái đã cập nhật sang "Đã thanh toán (PAID)".',
        data: updated,
      });
    }

    if (action === 'NOTIFY_BILL') {
      // Chủ trọ gửi thông báo hóa đơn qua email tới khách thuê
      const bill = await prisma.utilityBill.findUnique({
        where: { id: billId },
      });

      if (!bill) {
        return NextResponse.json({ success: false, message: 'Không tìm thấy hóa đơn' }, { status: 404 });
      }

      if (!(await canManageRoom(user, bill.roomId))) {
        return forbidden('Chỉ chủ trọ sở hữu phòng mới được gửi thông báo hóa đơn.');
      }

      const notif = generateMonthlyBillEmail({
        tenantName: tenantName || 'Khách thuê',
        tenantEmail: tenantEmail || 'tenant@eliteliving.vn',
        roomCode: bill.roomCode,
        month: bill.month,
        totalAmount: bill.totalAmount,
        rentCost: bill.rentCost,
        electricUsed: bill.electricUsed,
        electricCost: bill.electricCost,
        waterUsed: bill.waterUsed,
        waterCost: bill.waterCost,
        internetCost: bill.internetCost,
        serviceCost: bill.serviceCost,
        billId: bill.id,
      });

      return NextResponse.json({
        success: true,
        message: `✅ Đã gửi thông báo hóa đơn tháng ${bill.month} tới email khách thuê!`,
        data: notif,
      });
    }

    return NextResponse.json({ success: false, message: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
