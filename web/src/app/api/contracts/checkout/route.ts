import { NextRequest, NextResponse } from 'next/server';
import { updateRoomStatus } from '@/lib/db';
import prisma from '@/lib/prisma';
import { notifyTenant, resolveTenantRecipient } from '@/lib/tenant-notifications';
import {
  canAccessContract,
  canManageRoom,
  forbidden,
  getSessionUser,
  resolveTenantEmail,
  unauthorized,
} from '@/lib/tenant-access';

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để thanh lý trả phòng.');

    const body = await request.json();
    const {
      contractId,
      roomId,
      finalElectric = 1450,
      finalWater = 52,
      damageCost = 0,
      deductionNotes = 'Không có hư hỏng tài sản nghiêm trọng',
      tenantBankInfo = 'Ngân hàng Quân đội MBBank - STK: 0908123456 - Tên: NGUYEN VAN MINH',
    } = body;

    if (!contractId || !roomId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu mã hợp đồng hoặc mã phòng cần thanh lý trả phòng' },
        { status: 400 }
      );
    }

    let contract: any = null;
    try {
      contract = await prisma.contract.findUnique({
        where: { id: contractId },
        include: { room: true },
      });
    } catch {}

    // Real contract: caller must own it and the room must be the contract's room.
    // Unknown contract (draft in /ho-so): only the room's landlord/admin may release the room.
    let mayReleaseRoom: boolean;
    if (contract) {
      if (!(await canAccessContract(user, contract))) {
        return forbidden('Bạn không có quyền thanh lý hợp đồng này.');
      }
      if (Number(roomId) !== contract.roomId) {
        return NextResponse.json(
          { success: false, message: 'Mã phòng không khớp với hợp đồng cần thanh lý.' },
          { status: 400 }
        );
      }
      mayReleaseRoom = true;
    } else {
      mayReleaseRoom = await canManageRoom(user, roomId);
    }

    const originalDeposit = contract?.depositAmount || 4500000;
    const finalRefund = Math.max(0, originalDeposit - Number(damageCost));

    // 1. Chuyển hợp đồng sang trạng thái TERMINATED
    let updatedContract: any = null;
    try {
      updatedContract = await prisma.contract.update({
        where: { id: contractId },
        data: { status: 'TERMINATED' },
      });
    } catch (e) {
      console.warn('DB Contract terminate fallback:', e);
    }

    // 2. Tạo Biên bản bàn giao trả phòng (CHECK_OUT Handover)
    let checkOutHandover: any = null;
    try {
      checkOutHandover = await prisma.handover.create({
        data: {
          contractId,
          roomId: Number(roomId),
          type: 'CHECK_OUT',
          tenantName: contract?.tenantName || 'Khách thuê',
          tenantPhone: contract?.tenantPhone || '',
          landlordName: contract?.landlordName || 'Nguyễn Văn Hùng (Chủ trọ)',
          status: 'CONFIRMED',
          tenantConfirmed: true,
          landlordConfirmed: true,
          damageCost: Number(damageCost),
          handoverDate: new Date(),
          notes: `Biên bản trả phòng: Chỉ số điện cuối ${finalElectric} kWh. Chỉ số nước cuối ${finalWater} m³. Chi phí hư hỏng khấu trừ: ${damageCost.toLocaleString('vi-VN')} đ. Tiền cọc hoàn trả: ${finalRefund.toLocaleString('vi-VN')} đ. Tài khoản nhận hoàn cọc: ${tenantBankInfo}. Ghi chú: ${deductionNotes}`,
        },
      });
    } catch (e) {
      console.warn('DB Handover checkout fallback:', e);
    }

    // 3. QUAN TRỌNG: Hoàn trả trạng thái phòng về AVAILABLE (Còn trống) để đón khách mới
    const updatedRoom = mayReleaseRoom ? await updateRoomStatus(Number(roomId), 'AVAILABLE') : null;

    // 4. Lưu thông báo thanh lý và quyết toán cọc
    const recipient = await resolveTenantRecipient({
      userId: user.role === 'TENANT' ? user.id : null,
      phone: contract?.tenantPhone,
      email: user.role === 'TENANT' ? user.email : null,
      name: contract?.tenantName,
    });

    await notifyTenant({
      recipient,
      type: 'CHECKOUT_SETTLEMENT',
      subject: `Biên bản trả phòng & Quyết toán tiền cọc phòng #${roomId}`,
      summary: `Hoàn tất trả phòng #${roomId}. Quyết toán hoàn cọc: ${finalRefund.toLocaleString('vi-VN')} đ. Phòng đã trở về Còn trống (AVAILABLE).`,
      link: '/ho-so?tab=contracts',
      metadata: {
        contractId,
        roomId: Number(roomId),
        damageCost: Number(damageCost),
        finalRefund,
        originalDeposit,
      },
      email: {
        badge: 'Elite Living • Quyết toán trả phòng',
        title: `BIÊN BẢN TRẢ PHÒNG & QUYẾT TOÁN CỌC #${roomId}`,
        paragraphs: [
          `Quý khách đã hoàn tất bàn giao và thủ tục thanh lý hợp đồng trả phòng #${roomId}.`,
          `Biên bản kiểm kê thiết bị và quyết toán tiền cọc đã được lưu trữ trên hệ thống.`
        ],
        details: [
          { label: 'Mã phòng', value: `#${roomId}` },
          { label: 'Tiền cọc ban đầu', value: `${originalDeposit.toLocaleString('vi-VN')} đ` },
          { label: 'Khấu trừ hư hỏng', value: `${Number(damageCost).toLocaleString('vi-VN')} đ` },
          { label: 'Tiền cọc thực nhận', value: `${finalRefund.toLocaleString('vi-VN')} đ` },
          { label: 'Tài khoản nhận', value: tenantBankInfo },
        ],
        ctaLabel: 'Xem lịch sử hợp đồng',
        ctaHref: '/ho-so?tab=contracts',
      }
    });

    return NextResponse.json({
      success: true,
      message: `✅ Đã hoàn tất trả phòng và quyết toán cọc thành công! Hoàn trả tiền cọc: ${finalRefund.toLocaleString('vi-VN')} đ. Phòng #${roomId} đã được giải phóng về trạng thái "Còn trống" (AVAILABLE).`,
      data: {
        contract: updatedContract,
        room: updatedRoom,
        handover: checkOutHandover,
        refundSummary: {
          originalDeposit,
          damageCost: Number(damageCost),
          finalRefund,
          tenantBankInfo,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Lỗi khi xử lý trả phòng' },
      { status: 500 }
    );
  }
}
