import { NextRequest, NextResponse } from 'next/server';
import { updateRoomStatus, getRoomById } from '@/lib/db';
import prisma from '@/lib/prisma';
import { inMemoryNotifications, StoredNotification } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      roomId,
      reason = 'EXPIRED_NO_SHOW', // 'EXPIRED_NO_SHOW' | 'TENANT_REQUEST' | 'MUTUAL_AGREEMENT'
      forfeitDeposit = true,
      notes = '',
      cancelledBy = 'LANDLORD',
    } = body;

    if (!roomId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu mã phòng cần hủy cọc' },
        { status: 400 }
      );
    }

    const room = await getRoomById(Number(roomId));
    if (!room) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy phòng trọ' },
        { status: 404 }
      );
    }

    // 1. Giải phóng phòng về trạng thái AVAILABLE
    const updatedRoom = await updateRoomStatus(Number(roomId), 'AVAILABLE');

    // 2. Cập nhật các hợp đồng đang ở trạng thái ACTIVE/DRAFT liên quan tới phòng này thành TERMINATED nếu chưa dọn vào
    try {
      await prisma.contract.updateMany({
        where: {
          roomId: Number(roomId),
          status: 'ACTIVE',
        },
        data: {
          status: 'TERMINATED',
        },
      });
    } catch (e) {
      console.warn('Fallback cancel contract:', e);
    }

    // 3. Cập nhật lịch hẹn liên quan (nếu có)
    try {
      await prisma.appointment.updateMany({
        where: {
          roomId: Number(roomId),
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
        data: {
          status: 'CANCELLED',
          notes: `Lịch hẹn/giữ cọc đã bị hủy. Lý do: ${reason}. Ghi chú: ${notes}`,
        },
      });
    } catch (e) {
      console.warn('Fallback cancel appointment:', e);
    }

    // 4. Lưu thông báo xác nhận hủy cọc
    const reasonText =
      reason === 'EXPIRED_NO_SHOW'
        ? 'Quá hạn ngày hẹn dọn vào nhưng khách không đến nhận phòng (Không đến theo hẹn)'
        : reason === 'TENANT_REQUEST'
        ? 'Khách thuê chủ động yêu cầu hủy giữ cọc'
        : 'Thỏa thuận chấm dứt giữ cọc giữa hai bên';

    const notif: StoredNotification = {
      id: `notif_${Date.now()}_cancel`,
      recipientEmail: 'tenant@eliteliving.vn',
      recipientName: 'Khách thuê phòng ' + room.room_code,
      subject: `[ELITE LIVING] Thông báo hủy cọc & Giải phóng phòng ${room.room_code}`,
      type: 'DEPOSIT_CANCEL',
      contentHtml: `<p>Đã hủy giữ cọc phòng ${room.room_code}. Lý do: ${reasonText}. Tiền cọc: ${forfeitDeposit ? 'Tịch thu theo cam kết quy định giữ chỗ' : 'Hoàn trả theo thỏa thuận'}. Phòng đã được hoàn trả về trạng thái Còn trống (AVAILABLE).</p>`,
      summary: `Hủy cọc phòng ${room.room_code}: ${reasonText}. Phòng đã trở về trạng thái Còn trống.`,
      sentAt: new Date().toISOString(),
      isRead: false,
    };
    inMemoryNotifications.unshift(notif);

    return NextResponse.json({
      success: true,
      message: `✅ Đã hủy giữ cọc thành công! Phòng #${room.room_code} đã được hoàn trả về trạng thái "Còn trống" (AVAILABLE) để sẵn sàng đón khách mới.`,
      data: {
        room: updatedRoom,
        reason: reasonText,
        forfeitDeposit,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Lỗi khi hủy cọc phòng' },
      { status: 500 }
    );
  }
}
