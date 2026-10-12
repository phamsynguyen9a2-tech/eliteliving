import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getRoomById } from '@/lib/db';
import prisma from '@/lib/prisma';
import { inMemoryNotifications, StoredNotification } from '@/lib/email-service';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !['TENANT', 'LANDLORD', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập để hủy giữ chỗ.' },
        { status: session?.user ? 403 : 401 }
      );
    }

    const body = await request.json();
    const {
      roomId,
      reason: requestedReason = 'EXPIRED_NO_SHOW',
      forfeitDeposit: requestedForfeitDeposit = true,
      notes = '',
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

    if (room.status !== 'RESERVED') {
      return NextResponse.json(
        { success: false, message: 'Phòng không ở trạng thái giữ chỗ để hủy cọc.' },
        { status: 409 }
      );
    }

    const role = session.user.role;
    if (role === 'LANDLORD' && room.landlord_id !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Bạn không sở hữu phòng này.' },
        { status: 403 }
      );
    }
    if (role === 'TENANT') {
      const tenant = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { phone: true, phoneVerified: true },
      });
      if (!tenant?.phone || !tenant.phoneVerified) {
        return NextResponse.json(
          { success: false, message: 'Vui lòng xác minh số điện thoại trước khi hủy giữ chỗ.' },
          { status: 403 }
        );
      }

      const ownedReservation = await prisma.contract.findFirst({
        where: {
          roomId: Number(roomId),
          tenantPhone: tenant.phone,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      if (!ownedReservation) {
        return NextResponse.json(
          { success: false, message: 'Bạn không có quyền hủy giữ chỗ của phòng này.' },
          { status: 403 }
        );
      }
    }

    const reason = role === 'TENANT' ? 'TENANT_REQUEST' : requestedReason;
    const forfeitDeposit = role === 'TENANT' ? true : Boolean(requestedForfeitDeposit);

    // Đồng bộ giải phóng phòng, hợp đồng và lịch hẹn trong một transaction.
    const released = await prisma.$transaction(async (tx) => {
      const roomUpdate = await tx.room.updateMany({
        where: { id: Number(roomId), status: 'RESERVED' },
        data: { status: 'AVAILABLE' },
      });
      if (roomUpdate.count !== 1) return false;

      await tx.contract.updateMany({
        where: {
          roomId: Number(roomId),
          status: 'ACTIVE',
        },
        data: { status: 'TERMINATED' },
      });

      await tx.appointment.updateMany({
        where: {
          roomId: Number(roomId),
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
        data: {
          status: 'CANCELLED',
          notes: `Lịch hẹn/giữ cọc đã bị hủy. Lý do: ${reason}. Ghi chú: ${notes}`,
        },
      });
      return true;
    });
    if (!released) {
      return NextResponse.json(
        { success: false, message: 'Trạng thái phòng vừa thay đổi, không thể hủy giữ chỗ.' },
        { status: 409 }
      );
    }
    const updatedRoom = await getRoomById(Number(roomId));

    // Lưu thông báo xác nhận hủy cọc
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
      message: `Đã hủy giữ cọc thành công! Phòng #${room.room_code} đã được hoàn trả về trạng thái "Còn trống" (AVAILABLE) để sẵn sàng đón khách mới.`,
      data: {
        room: updatedRoom,
        reason: reasonText,
        forfeitDeposit,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi khi hủy cọc phòng';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
