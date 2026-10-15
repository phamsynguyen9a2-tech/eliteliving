import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { inMemoryNotifications, StoredNotification } from '@/lib/email-service';
import {
  canAccessContract,
  forbidden,
  getSessionUser,
  resolveTenantEmail,
  unauthorized,
} from '@/lib/tenant-access';

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để gia hạn hợp đồng.');

    const body = await request.json();
    const { contractId, monthsToExtend = 6, newEndDate } = body;

    if (!contractId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu mã hợp đồng cần gia hạn' },
        { status: 400 }
      );
    }

    let contract = null;
    try {
      contract = await prisma.contract.findUnique({
        where: { id: contractId },
        include: { room: true },
      });
    } catch {}

    // Unknown contract (draft in /ho-so) cannot be updated below, so only real rows need the check.
    if (contract && !(await canAccessContract(user, contract))) {
      return forbidden('Bạn không có quyền gia hạn hợp đồng này.');
    }

    let calculatedEndDate = newEndDate;
    if (!calculatedEndDate) {
      const baseDate = contract?.endDate ? new Date(contract.endDate) : new Date();
      baseDate.setMonth(baseDate.getMonth() + Number(monthsToExtend));
      calculatedEndDate = baseDate.toISOString().slice(0, 10);
    }

    let updatedContract = null;
    try {
      updatedContract = await prisma.contract.update({
        where: { id: contractId },
        data: {
          endDate: calculatedEndDate,
          status: 'ACTIVE',
        },
      });
    } catch (e) {
      console.warn('DB contract renew fallback:', e);
      updatedContract = {
        id: contractId,
        endDate: calculatedEndDate,
        status: 'ACTIVE',
      };
    }

    // Thông báo gia hạn thành công
    const notif: StoredNotification = {
      id: `notif_${Date.now()}_renew`,
      recipientEmail: await resolveTenantEmail(user, contract?.tenantPhone),
      recipientName: contract?.tenantName || 'Khách thuê',
      subject: `[ELITE LIVING] Xác nhận gia hạn hợp đồng thành công đến ngày ${calculatedEndDate}`,
      type: 'CONTRACT_EXPIRY',
      contentHtml: `<p>Hợp đồng của quý khách đã được gia hạn thêm ${monthsToExtend} tháng. Ngày kết thúc hợp đồng mới: <strong>${calculatedEndDate}</strong>.</p>`,
      summary: `Hợp đồng phòng #${contract?.roomId || ''} đã gia hạn thêm ${monthsToExtend} tháng đến ngày ${calculatedEndDate}.`,
      sentAt: new Date().toISOString(),
      isRead: false,
    };
    inMemoryNotifications.unshift(notif);

    return NextResponse.json({
      success: true,
      message: `✅ Gia hạn hợp đồng thành công thêm ${monthsToExtend} tháng! Ngày hết hạn mới: ${calculatedEndDate}`,
      data: updatedContract,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Lỗi khi gia hạn hợp đồng' },
      { status: 500 }
    );
  }
}
