import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateBillStatus, getUtilityBills } from '@/lib/db';
import { generateMonthlyBillEmail } from '@/lib/email-service';
import { notifyTenant, resolveTenantRecipient } from '@/lib/tenant-notifications';
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
      let existingBill: any = null;
      try {
        existingBill = await prisma.utilityBill.findUnique({
          where: { id: String(billId) },
        });
        billRoomId = existingBill?.roomId ?? null;
      } catch {}

      // Unknown bill (demo/draft bill shown in /ho-so): nothing to update, keep demo flow.
      if (billRoomId !== null) {
        const allowed = user.role === 'TENANT'
          ? (await getTenantScope(user.id)).contractRoomIds.has(billRoomId)
          : await canManageRoom(user, billRoomId);
        if (!allowed) return forbidden('Bạn không có quyền thanh toán hóa đơn này.');
      }

      const updated = await updateBillStatus(billId, 'PAID');

      // Tự động gửi thông báo biên lai đã thanh toán cho khách thuê
      try {
        const targetRoomId = billRoomId ?? existingBill?.roomId;
        const activeContract = targetRoomId
          ? await prisma.contract.findFirst({
              where: { roomId: targetRoomId, status: 'ACTIVE' },
              select: { tenantName: true, tenantPhone: true },
            })
          : null;

        const recipient = await resolveTenantRecipient({
          userId: user.role === 'TENANT' ? user.id : null,
          phone: activeContract?.tenantPhone,
          email: user.role === 'TENANT' ? user.email : null,
          name: activeContract?.tenantName || user.name,
        });

        const formatMoney = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';
        const billMonth = existingBill?.month || 'hiện tại';
        const roomCode = existingBill?.roomCode || (targetRoomId ? `P.${targetRoomId}` : '');
        const amount = existingBill?.totalAmount || 0;

        notifyTenant({
          recipient,
          type: 'BILL_PAID',
          subject: `Xác nhận thanh toán hóa đơn tháng ${billMonth} — Phòng ${roomCode}`,
          summary: `Thanh toán thành công hóa đơn tiền phòng & điện nước tháng ${billMonth} số tiền ${formatMoney(amount)}.`,
          link: '/ho-so?tab=bills',
          metadata: {
            billId: String(billId),
            roomId: targetRoomId,
            month: billMonth,
            totalAmount: amount,
          },
          email: {
            badge: 'Elite Living • Biên lai thanh toán',
            title: `BIÊN LAI ĐÃ THANH TOÁN THÁNG ${billMonth}`,
            paragraphs: [
              `Hệ thống xác nhận quý khách đã hoàn tất thanh toán hóa đơn tiền nhà và dịch vụ tháng ${billMonth}.`,
              `Trạng thái hóa đơn đã chuyển sang "Đã thanh toán" (PAID). Cảm ơn quý khách đã hoàn thành đúng hạn!`
            ],
            details: [
              { label: 'Mã phòng', value: roomCode },
              { label: 'Kỳ hóa đơn', value: `Tháng ${billMonth}` },
              { label: 'Số tiền thanh toán', value: formatMoney(amount) },
              { label: 'Trạng thái', value: 'ĐÃ THANH TOÁN' },
            ],
            ctaLabel: 'Xem lịch sử hóa đơn',
            ctaHref: '/ho-so?tab=bills',
          }
        });
      } catch (e) {
        console.warn('Could not dispatch bill payment notification:', e);
      }

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

      // Tìm thông tin hợp đồng đang hiệu lực để lấy SĐT và tài khoản thật của khách thuê
      const activeContract = await prisma.contract.findFirst({
        where: { roomId: bill.roomId, status: 'ACTIVE' },
        select: { tenantName: true, tenantPhone: true },
      });

      const recipient = await resolveTenantRecipient({
        phone: activeContract?.tenantPhone,
        email: tenantEmail,
        name: tenantName || activeContract?.tenantName,
      });

      const notif = generateMonthlyBillEmail({
        tenantName: recipient.name,
        tenantEmail: recipient.email,
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
      notif.recipientUserId = recipient.userId;
      notif.recipientPhone = recipient.phone;

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
