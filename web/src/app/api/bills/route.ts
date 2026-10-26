import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateBillStatus, getUtilityBills, getUtilityBillsForContracts, resolveBillContractId } from '@/lib/db';
import { saveBillPaymentClaim } from '@/lib/payment-claims-store';
import { generateMonthlyBillEmail } from '@/lib/email-service';
import { publishRoomEvent } from '@/lib/realtime-bus';
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

    // Khách thuê: chỉ hóa đơn thuộc HỢP ĐỒNG của chính mình (không phải mọi hóa đơn của phòng),
    // nên khách cũ không thấy hóa đơn của khách mới cùng phòng và ngược lại.
    if (user.role === 'TENANT') {
      const scope = await getTenantScope(user.id);
      const bills = (await getUtilityBillsForContracts(scope.contractIds)).filter(
        (bill) => roomId === undefined || bill.room_id === roomId
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
    const { action, billId, transactionCode, tenantEmail, tenantName } = body;

    if (action === 'PAY_BILL') {
      if (!billId) {
        return NextResponse.json(
          { success: false, message: 'Thiếu mã hóa đơn cần xử lý.' },
          { status: 400 }
        );
      }

      const existingBill = await prisma.utilityBill.findUnique({
        where: { id: String(billId) },
      });

      if (!existingBill) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy hóa đơn trong cơ sở dữ liệu.' },
          { status: 404 }
        );
      }

      const billRoomId = existingBill.roomId;

      // LUỒNG 1: KHÁCH THUÊ BÁO ĐÃ CHUYỂN KHOẢN -> Lưu thông tin chờ chủ trọ đối soát, KHÔNG tự động đổi sang PAID
      if (user.role === 'TENANT') {
        const scope = await getTenantScope(user.id);
        const billContractId = await resolveBillContractId(existingBill);
        if (!billContractId || !scope.contractIds.has(billContractId)) {
          return forbidden('Hóa đơn này không thuộc hợp đồng thuê của bạn.');
        }

        if (existingBill.status === 'PAID') {
          return NextResponse.json(
            { success: false, message: 'Hóa đơn này đã được chủ trọ xác nhận thanh toán trước đó.' },
            { status: 409 }
          );
        }

        const cleanedTxCode =
          typeof transactionCode === 'string' ? transactionCode.trim() : '';
        if (cleanedTxCode.length < 4 || cleanedTxCode.length > 64) {
          return NextResponse.json(
            {
              success: false,
              message:
                'Vui lòng nhập hoặc tạo mã giao dịch mô phỏng (tối thiểu 4 ký tự) để chủ trọ đối soát.',
            },
            { status: 400 }
          );
        }

        const claim = await saveBillPaymentClaim({
          bill_id: String(existingBill.id),
          room_id: billRoomId,
          tenant_id: user.id,
          tenant_name: user.name || 'Khách thuê',
          tenant_phone: scope.phone || user.phone || '',
          transaction_code: cleanedTxCode,
          status: 'PENDING_CONFIRMATION',
          reported_at: new Date().toISOString(),
        });

        publishRoomEvent('bill', billRoomId);
        // Chỉ trả lại đúng hóa đơn vừa báo thanh toán (không trả hóa đơn khác của phòng)
        const matchedBill = (await getUtilityBills({ roomId: billRoomId })).find(
          (b) => b.id === String(existingBill.id)
        );

        return NextResponse.json({
          success: true,
          pendingConfirmation: true,
          message: `Đã gửi thông báo chuyển khoản (Mã GD: ${cleanedTxCode}) tới chủ trọ. Hóa đơn sẽ chuyển sang "Đã thanh toán" sau khi chủ trọ đối soát và xác nhận thu tiền.`,
          data: matchedBill || {
            id: existingBill.id,
            status: 'UNPAID',
            payment_claim: claim,
          },
        });
      }

      // LUỒNG 2: CHỦ TRỌ HOẶC ADMIN ĐỐI SOÁT & XÁC NHẬN ĐÃ THU TIỀN -> Chuyển trạng thái sang PAID
      if (!(await canManageRoom(user, billRoomId))) {
        return forbidden('Chỉ chủ trọ sở hữu phòng hoặc quản trị viên mới được xác nhận đã thu tiền.');
      }

      const updated = await updateBillStatus(String(billId), 'PAID');
      // Lưu không thành công thì không báo "đã thu" và không gửi biên lai cho khách
      if (!updated) {
        return NextResponse.json(
          { success: false, message: 'Không lưu được xác nhận thu tiền. Hóa đơn chưa được cập nhật, vui lòng thử lại.' },
          { status: 500 }
        );
      }

      // Tự động gửi thông báo biên lai đã thanh toán cho khách thuê sau khi chủ trọ xác nhận
      try {
        // Gửi cho khách thuê của hợp đồng mà hóa đơn thuộc về
        const billContractId = await resolveBillContractId(existingBill);
        const activeContract = billContractId
          ? await prisma.contract.findUnique({
              where: { id: billContractId },
              select: { tenantName: true, tenantPhone: true },
            })
          : null;

        const recipient = await resolveTenantRecipient({
          userId: null,
          phone: activeContract?.tenantPhone,
          email: null,
          name: activeContract?.tenantName,
        });

        const formatMoney = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';
        const billMonth = existingBill.month || 'hiện tại';
        const roomCode = existingBill.roomCode || `P.${billRoomId}`;
        const amount = existingBill.totalAmount || 0;

        await notifyTenant({
          recipient,
          type: 'BILL_PAID',
          subject: `Xác nhận thanh toán hóa đơn tháng ${billMonth} — Phòng ${roomCode}`,
          summary: `Chủ trọ đã xác nhận thu tiền hóa đơn tháng ${billMonth} số tiền ${formatMoney(amount)}.`,
          link: '/ho-so?tab=bills',
          metadata: {
            billId: String(billId),
            roomId: billRoomId,
            month: billMonth,
            totalAmount: amount,
          },
          email: {
            badge: 'Elite Living • Biên lai thanh toán',
            title: `BIÊN LAI ĐÃ THANH TOÁN THÁNG ${billMonth}`,
            paragraphs: [
              `Chủ trọ đã đối soát và xác nhận quý khách hoàn tất thanh toán hóa đơn tiền nhà và dịch vụ tháng ${billMonth}.`,
              `Trạng thái hóa đơn đã chuyển sang "Đã thanh toán" (PAID). Cảm ơn quý khách đã hoàn thành đúng hạn!`,
            ],
            details: [
              { label: 'Mã phòng', value: roomCode },
              { label: 'Kỳ hóa đơn', value: `Tháng ${billMonth}` },
              { label: 'Số tiền thanh toán', value: formatMoney(amount) },
              { label: 'Trạng thái', value: 'ĐÃ THANH TOÁN' },
            ],
            ctaLabel: 'Xem lịch sử hóa đơn',
            ctaHref: '/ho-so?tab=bills',
          },
        });
      } catch (e) {
        console.warn('Could not dispatch bill payment notification:', e);
      }

      return NextResponse.json({
        success: true,
        pendingConfirmation: false,
        message: 'Đã xác nhận thu tiền! Hóa đơn đã cập nhật sang trạng thái "Đã thanh toán (PAID)".',
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

      // Hợp đồng mà hóa đơn thuộc về → SĐT và tài khoản thật của khách thuê
      const billContractId = await resolveBillContractId(bill);
      const activeContract = billContractId
        ? await prisma.contract.findUnique({
            where: { id: billContractId },
            select: { tenantName: true, tenantPhone: true },
          })
        : null;

      const recipient = await resolveTenantRecipient({
        phone: activeContract?.tenantPhone,
        email: tenantEmail,
        name: tenantName || activeContract?.tenantName,
      });

      const notif = await generateMonthlyBillEmail(
        {
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
        },
        { recipientUserId: recipient.userId, recipientPhone: recipient.phone }
      );

      const { deliverNotificationEmailIfConfigured } = await import('@/lib/notification-store');
      const delivery = await deliverNotificationEmailIfConfigured(notif);

      return NextResponse.json({
        success: true,
        emailDelivered: delivery.delivered,
        deliveryChannel: delivery.channel,
        message: delivery.delivered
          ? `Đã gửi email hóa đơn tháng ${bill.month} tới ${recipient.email} và đồng bộ vào hộp thư khách thuê!`
          : `Đã gửi thông báo hóa đơn tháng ${bill.month} vào Hộp thư Cổng khách thuê (${recipient.name}) và tạo bản phiếu báo điện tử (chưa cấu hình SMTP ngoài).`,
        data: notif,
      });
    }

    return NextResponse.json({ success: false, message: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
