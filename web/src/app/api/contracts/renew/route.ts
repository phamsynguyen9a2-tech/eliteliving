import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { renewActiveContract } from '@/lib/db';
import { addMonthsClamped, parseRenewalMonths, MAX_RENEWAL_MONTHS } from '@/lib/contract-dates';
import { lifecycleErrorResponse } from '@/lib/lifecycle-errors';
import { notifyTenant, resolveTenantRecipient } from '@/lib/tenant-notifications';
import { publishRoomEvent } from '@/lib/realtime-bus';
import {
  canAccessContract,
  forbidden,
  getSessionUser,
  unauthorized,
} from '@/lib/tenant-access';

/**
 * Gia hạn hợp đồng ACTIVE.
 * - Chủ trọ / admin: cộng thêm số tháng vào ngày hết hạn hiện tại (máy chủ tự tính, không nhận
 *   ngày do trình duyệt gửi), chỉ khi hợp đồng còn hiệu lực.
 * - Khách thuê: chỉ GỬI YÊU CẦU gia hạn tới chủ trọ; hạn hợp đồng không đổi cho tới khi chủ trọ gia hạn.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để gia hạn hợp đồng.');

    const body = await request.json();
    const { contractId, monthsToExtend = 6 } = body;

    if (!contractId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu mã hợp đồng cần gia hạn' },
        { status: 400 }
      );
    }
    const months = parseRenewalMonths(monthsToExtend);
    if (!months) {
      return NextResponse.json(
        { success: false, message: `Số tháng gia hạn phải là số nguyên từ 1 đến ${MAX_RENEWAL_MONTHS}.` },
        { status: 400 }
      );
    }

    const contract = await prisma.contract.findUnique({
      where: { id: String(contractId) },
      include: { room: true },
    });
    if (!contract) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy hợp đồng cần gia hạn.' },
        { status: 404 }
      );
    }
    if (!(await canAccessContract(user, contract))) {
      return forbidden('Bạn không có quyền gia hạn hợp đồng này.');
    }
    if (contract.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, message: 'Hợp đồng đã kết thúc nên không thể gia hạn. Vui lòng lập hợp đồng mới.' },
        { status: 409 }
      );
    }

    if (user.role === 'TENANT') {
      const proposedEndDate = addMonthsClamped(contract.endDate, months);
      const landlord = await prisma.landlord.findUnique({
        where: { id: contract.room.landlordId },
        select: { id: true, name: true, email: true },
      });
      // Lưu yêu cầu vào hộp thư của chủ trọ; hợp đồng giữ nguyên hạn cũ
      await notifyTenant({
        recipient: {
          email: landlord?.email || '',
          name: landlord?.name || contract.landlordName,
          userId: landlord?.id || contract.room.landlordId,
        },
        type: 'CONTRACT_RENEWAL_REQUEST',
        subject: `Yêu cầu gia hạn hợp đồng phòng #${contract.room.roomCode || contract.roomId}`,
        summary: `${contract.tenantName} đề nghị gia hạn thêm ${months} tháng (đến ${proposedEndDate}).`,
        link: '/chu-tro',
        metadata: { contractId: contract.id, roomId: contract.roomId, monthsToExtend: months, proposedEndDate },
      });
      publishRoomEvent('contract', contract.roomId);
      return NextResponse.json({
        success: true,
        message: `Đã gửi yêu cầu gia hạn thêm ${months} tháng tới chủ trọ. Hạn hợp đồng hiện tại (${contract.endDate}) giữ nguyên cho tới khi chủ trọ đồng ý gia hạn.`,
        data: { contract, requested: { monthsToExtend: months, proposedEndDate } },
      });
    }

    let updatedContract;
    try {
      updatedContract = await renewActiveContract(contract.id, months);
    } catch (err) {
      const errorResponse = lifecycleErrorResponse(err);
      if (errorResponse) return errorResponse;
      throw err;
    }
    const calculatedEndDate = updatedContract.end_date;

    // Thông báo gia hạn thành công tới khách thuê
    const recipient = await resolveTenantRecipient({
      userId: null,
      phone: contract.tenantPhone,
      email: null,
      name: contract.tenantName,
    });

    await notifyTenant({
      recipient,
      type: 'CONTRACT_RENEWED',
      subject: `Xác nhận gia hạn hợp đồng thành công đến ngày ${calculatedEndDate}`,
      summary: `Hợp đồng phòng #${contract.roomId} đã gia hạn thêm ${months} tháng đến ngày ${calculatedEndDate}.`,
      link: '/ho-so?tab=contracts',
      metadata: {
        contractId: contract.id,
        roomId: contract.roomId,
        monthsToExtend: months,
        newEndDate: calculatedEndDate,
      },
      email: {
        badge: 'Elite Living • Gia hạn hợp đồng',
        title: 'XÁC NHẬN GIA HẠN HỢP ĐỒNG THÀNH CÔNG',
        paragraphs: [
          `Hợp đồng thuê phòng của quý khách đã được gia hạn thành công thêm ${months} tháng.`,
          `Mọi quyền lợi cư dân, nội quy an toàn PCCC và điều khoản hợp đồng tiếp tục có hiệu lực đến ngày ${calculatedEndDate}.`
        ],
        details: [
          { label: 'Mã hợp đồng', value: `#${contract.id.slice(-8).toUpperCase()}` },
          { label: 'Thời gian gia hạn', value: `+${months} tháng` },
          { label: 'Hạn kết thúc mới', value: calculatedEndDate },
        ],
        ctaLabel: 'Xem hợp đồng của bạn',
        ctaHref: '/ho-so?tab=contracts',
      }
    });

    return NextResponse.json({
      success: true,
      message: `✅ Gia hạn hợp đồng thành công thêm ${months} tháng! Ngày hết hạn mới: ${calculatedEndDate}`,
      data: updatedContract,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Lỗi khi gia hạn hợp đồng' },
      { status: 500 }
    );
  }
}
