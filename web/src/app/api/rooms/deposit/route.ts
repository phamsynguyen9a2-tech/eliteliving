import { NextRequest, NextResponse } from 'next/server';
import { getRoomById, isPubliclyListed } from '@/lib/db';
import { saveRoomDepositClaim } from '@/lib/payment-claims-store';
import { getRequestSession } from '@/lib/request-session';

import prisma from '@/lib/prisma';
import { publishRoomEvent } from '@/lib/realtime-bus';

export async function POST(request: NextRequest) {
  try {
    const session = await getRequestSession();
    if (!session?.user?.id || session.user.role !== 'TENANT') {
      return NextResponse.json(
        { success: false, message: 'Bạn cần đăng nhập bằng tài khoản khách thuê để đặt cọc.' },
        { status: session?.user ? 403 : 401 }
      );
    }

    const body = await request.json();
    const {
      roomId,
      tenantCitizenId,
      tenantAddress,
      moveInDate,
      vehicleCount = 1,
      paymentMethod = 'BANK_TRANSFER',
      transactionCode,
      notes,
    } = body;

    if (!roomId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu mã phòng cần đặt cọc' },
        { status: 400 }
      );
    }

    // Thanh toán mô phỏng: khách thuê tự nhập hoặc bấm tạo mã SIM-COC-… trên giao diện; máy chủ không tự sinh mã
    const cleanedTransactionCode =
      typeof transactionCode === 'string' ? transactionCode.trim() : '';
    if (cleanedTransactionCode.length < 4 || cleanedTransactionCode.length > 64) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Vui lòng nhập hoặc tạo mã giao dịch mô phỏng (tối thiểu 4 ký tự) để chủ trọ đối soát khoản cọc.',
        },
        { status: 400 }
      );
    }

    const cleanedCitizenId =
      typeof tenantCitizenId === 'string' ? tenantCitizenId.replace(/\s/g, '') : '';
    if (cleanedCitizenId && !/^\d{9}(\d{3})?$/.test(cleanedCitizenId)) {
      return NextResponse.json(
        { success: false, message: 'Số CCCD/CMND phải gồm 9 hoặc 12 chữ số.' },
        { status: 400 }
      );
    }

    const tenant = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, phone: true, phoneVerified: true },
    });
    if (!tenant?.phone || !tenant.phoneVerified) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng xác minh số điện thoại trước khi đặt cọc.' },
        { status: 403 }
      );
    }

    const completedViewing = await prisma.appointment.findFirst({
      where: {
        roomId: Number(roomId),
        userId: session.user.id,
        status: 'COMPLETED',
      },
    });
    if (!completedViewing) {
      return NextResponse.json(
        { success: false, message: 'Bạn chỉ có thể đặt cọc sau khi hoàn tất lịch xem phòng của mình.' },
        { status: 403 }
      );
    }

    const room = await getRoomById(Number(roomId));
    if (!room) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy phòng trọ' },
        { status: 404 }
      );
    }

    if (!isPubliclyListed(room)) {
      return NextResponse.json(
        { success: false, message: 'Tin đăng của phòng này đang chờ kiểm duyệt nên chưa nhận đặt cọc.' },
        { status: 409 }
      );
    }

    if (room.status !== 'AVAILABLE' && room.status !== 'BOOKED_VIEWING') {
      return NextResponse.json(
        { success: false, message: 'Phòng này hiện không còn ở trạng thái có thể đặt cọc.' },
        { status: 409 }
      );
    }

    const requestedMoveInDate = typeof moveInDate === 'string' ? moveInDate : '';
    const parsedMoveInDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedMoveInDate)
      ? new Date(`${requestedMoveInDate}T00:00:00`)
      : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isRealMoveInDate = parsedMoveInDate
      ? parsedMoveInDate.getFullYear() === Number(requestedMoveInDate.slice(0, 4)) &&
        parsedMoveInDate.getMonth() === Number(requestedMoveInDate.slice(5, 7)) - 1 &&
        parsedMoveInDate.getDate() === Number(requestedMoveInDate.slice(8, 10))
      : false;
    if (requestedMoveInDate && (!isRealMoveInDate || parsedMoveInDate! < today)) {
      return NextResponse.json(
        { success: false, message: 'Ngày dọn vào không hợp lệ hoặc đã ở trong quá khứ.' },
        { status: 400 }
      );
    }

    const actualTenantName = tenant.name || session.user.name || 'Khách thuê';
    const actualTenantPhone = tenant.phone;
    const actualDepositAmount = room.deposit || room.price;
    const actualVehicleCount = Math.min(10, Math.max(0, Number(vehicleCount) || 0));
    const effectiveMoveInDate =
      requestedMoveInDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);

    // Chuyển trạng thái phòng sang RESERVED (Giữ chỗ) trong transaction chống tranh chấp.
    // TUYỆT ĐỐI KHÔNG tự tạo Hợp đồng ACTIVE hay Biên bản bàn giao khi chủ trọ chưa đối soát tiền cọc & check-in.
    const reservedOk = await prisma.$transaction(async (tx) => {
      const reserved = await tx.room.updateMany({
        where: {
          id: Number(roomId),
          status: { in: ['AVAILABLE', 'BOOKED_VIEWING'] },
        },
        data: { status: 'RESERVED' },
      });
      if (reserved.count !== 1) return false;

      const depositNote = `[ĐẶT CỌC GIỮ CHỖ - CHỜ CHỦ TRỌ XÁC NHẬN] Mã GD: ${cleanedTransactionCode} | Số tiền: ${actualDepositAmount.toLocaleString('vi-VN')}đ | Ngày dọn vào dự kiến: ${effectiveMoveInDate}`;
      await tx.appointment.update({
        where: { id: completedViewing.id },
        data: {
          notes: completedViewing.notes
            ? `${completedViewing.notes}\n${depositNote}`
            : depositNote,
        },
      });

      return true;
    });

    if (!reservedOk) {
      return NextResponse.json(
        { success: false, message: 'Phòng vừa được người khác giữ chỗ. Vui lòng chọn phòng khác.' },
        { status: 409 }
      );
    }

    const depositClaim = await saveRoomDepositClaim({
      room_id: Number(roomId),
      appointment_id: completedViewing.id,
      tenant_id: session.user.id,
      tenant_name: actualTenantName,
      tenant_phone: actualTenantPhone,
      tenant_citizen_id: cleanedCitizenId,
      tenant_address: typeof tenantAddress === 'string' ? tenantAddress.trim() : '',
      deposit_amount: actualDepositAmount,
      move_in_date: effectiveMoveInDate,
      vehicle_count: actualVehicleCount,
      transaction_code: cleanedTransactionCode,
      notes: typeof notes === 'string' ? notes.trim() : undefined,
      status: 'PENDING_CONFIRMATION',
      created_at: new Date().toISOString(),
    });

    const updatedRoom = await getRoomById(Number(roomId));

    const depositReceipt = {
      id: `DEP_${Date.now()}`,
      room_id: Number(roomId),
      room_code: room.room_code,
      room_title: room.title,
      tenant_name: actualTenantName,
      tenant_phone: actualTenantPhone,
      deposit_amount: actualDepositAmount,
      move_in_date: effectiveMoveInDate,
      vehicle_count: actualVehicleCount,
      payment_method: paymentMethod,
      transaction_code: cleanedTransactionCode,
      notes:
        notes ||
        `Khách thuê đã gửi mã giao dịch đặt cọc (${cleanedTransactionCode}), chờ chủ trọ đối soát và phát hành hợp đồng.`,
      created_at: depositClaim.created_at,
      status: 'PENDING_CONFIRMATION',
    };

    publishRoomEvent('contract', Number(roomId));
    return NextResponse.json({
      success: true,
      message: `Đã ghi nhận yêu cầu đặt cọc giữ chỗ (Mã GD: ${cleanedTransactionCode}). Phòng đã chuyển sang trạng thái "Giữ chỗ", chờ chủ trọ đối soát khoản cọc để kích hoạt Hợp đồng điện tử và Biên bản bàn giao.`,
      data: {
        receipt: depositReceipt,
        room: updatedRoom,
        depositClaim,
        contract: null,
        handover: null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi xử lý đặt cọc phòng';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
