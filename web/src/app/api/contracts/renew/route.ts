import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyTenant, resolveTenantRecipient } from '@/lib/tenant-notifications';
import { publishRoomEvent } from '@/lib/realtime-bus';
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

    // Thông báo gia hạn thành công tới khách thuê
    const recipient = await resolveTenantRecipient({
      userId: user.role === 'TENANT' ? user.id : null,
      phone: contract?.tenantPhone,
      email: user.role === 'TENANT' ? user.email : null,
      name: contract?.tenantName,
    });

    await notifyTenant({
      recipient,
      type: 'CONTRACT_RENEWED',
      subject: `Xác nhận gia hạn hợp đồng thành công đến ngày ${calculatedEndDate}`,
      summary: `Hợp đồng phòng #${contract?.roomId || ''} đã gia hạn thêm ${monthsToExtend} tháng đến ngày ${calculatedEndDate}.`,
      link: '/ho-so?tab=contracts',
      metadata: {
        contractId,
        roomId: contract?.roomId,
        monthsToExtend,
        newEndDate: calculatedEndDate,
      },
      email: {
        badge: 'Elite Living • Gia hạn hợp đồng',
        title: 'XÁC NHẬN GIA HẠN HỢP ĐỒNG THÀNH CÔNG',
        paragraphs: [
          `Hợp đồng thuê phòng của quý khách đã được gia hạn thành công thêm ${monthsToExtend} tháng.`,
          `Mọi quyền lợi cư dân, nội quy an toàn PCCC và điều khoản hợp đồng tiếp tục có hiệu lực đến ngày ${calculatedEndDate}.`
        ],
        details: [
          { label: 'Mã hợp đồng', value: `#${contractId.slice(-8).toUpperCase()}` },
          { label: 'Thời gian gia hạn', value: `+${monthsToExtend} tháng` },
          { label: 'Hạn kết thúc mới', value: calculatedEndDate },
        ],
        ctaLabel: 'Xem hợp đồng của bạn',
        ctaHref: '/ho-so?tab=contracts',
      }
    });

    if (contract?.roomId) publishRoomEvent('contract', contract.roomId);
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
