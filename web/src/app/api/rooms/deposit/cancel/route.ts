import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getRoomById } from '@/lib/db';
import prisma from '@/lib/prisma';
import { inMemoryNotifications, StoredNotification } from '@/lib/email-service';
import { notifyTenant, resolveTenantRecipient } from '@/lib/tenant-notifications';
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

    let existingReservation = null;
    try {
      existingReservation = await prisma.contract.findFirst({
        where: { roomId: Number(roomId) },
        orderBy: { createdAt: 'desc' },
        select: { id: true, tenantName: true, tenantPhone: true },
      });
    } catch {}

    const recipient = await resolveTenantRecipient({
      userId: role === 'TENANT' ? session.user.id : null,
      phone: existingReservation?.tenantPhone,
      email: role === 'TENANT' ? session.user.email : null,
      name: existingReservation?.tenantName,
    });

    notifyTenant({
      recipient,
      type: 'DEPOSIT_CANCEL',
      subject: `Thông báo hủy cọc & Giải phóng phòng ${room.room_code}`,
      summary: `Hủy cọc phòng ${room.room_code}: ${reasonText}. Phòng đã trở về trạng thái Còn trống.`,
      link: '/ho-so?tab=contracts',
      metadata: {
        roomId: Number(roomId),
        roomCode: room.room_code,
        forfeitDeposit,
        reason,
      },
      email: {
        badge: 'Elite Living • Hủy cọc giữ chỗ',
        title: `XÁC NHẬN HỦY CỌC PHÒNG #${room.room_code}`,
        paragraphs: [
          `Thông báo giải phóng phòng #${room.room_code}.`,
          `Lý do hủy: ${reasonText}.`,
          `Xử lý tiền cọc: ${forfeitDeposit ? 'Tiền cọc giữ chỗ được xử lý theo cam kết quy định giữ chỗ.' : 'Hoàn trả tiền cọc theo thỏa thuận giữa hai bên.'}`,
          `Phòng đã được hoàn trả về trạng thái Còn trống (AVAILABLE). Quý khách có thể lựa chọn các căn hộ khác phù hợp trên hệ thống.`
        ],
        details: [
          { label: 'Mã phòng', value: `#${room.room_code}` },
          { label: 'Lý do hủy', value: reasonText },
          { label: 'Xử lý tiền cọc', value: forfeitDeposit ? 'Không hoàn lại' : 'Hoàn trả theo thỏa thuận' },
        ],
        ctaLabel: 'Khám phá phòng khác',
        ctaHref: '/#danh-sach-toa-nha',
      }
    });

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
