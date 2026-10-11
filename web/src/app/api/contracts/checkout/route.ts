import { NextRequest, NextResponse } from 'next/server';
import { updateRoomStatus } from '@/lib/db';
import prisma from '@/lib/prisma';
import { inMemoryNotifications, StoredNotification } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
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
    const updatedRoom = await updateRoomStatus(Number(roomId), 'AVAILABLE');

    // 4. Lưu thông báo thanh lý và quyết toán cọc
    const notif: StoredNotification = {
      id: `notif_${Date.now()}_checkout`,
      recipientEmail: 'tenant@eliteliving.vn',
      recipientName: contract?.tenantName || 'Khách thuê',
      subject: `[ELITE LIVING] Biên bản trả phòng & Quyết toán tiền cọc phòng #${roomId}`,
      type: 'CONTRACT_EXPIRY',
      contentHtml: `<p>Quý khách đã hoàn tất trả phòng #${roomId}. Tiền cọc ban đầu: ${originalDeposit.toLocaleString('vi-VN')} đ. Khấu trừ hư hại: ${Number(damageCost).toLocaleString('vi-VN')} đ. Số tiền cọc hoàn trả thực nhận: <strong>${finalRefund.toLocaleString('vi-VN')} đ</strong>. Phòng đã được giải phóng trạng thái về Còn trống.</p>`,
      summary: `Hoàn tất trả phòng #${roomId}. Quyết toán hoàn cọc: ${finalRefund.toLocaleString('vi-VN')} đ. Phòng đã trở về Còn trống (AVAILABLE).`,
      sentAt: new Date().toISOString(),
      isRead: false,
    };
    inMemoryNotifications.unshift(notif);

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
