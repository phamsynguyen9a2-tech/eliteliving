import { NextRequest, NextResponse } from 'next/server';
import { getRoomById } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'TENANT') {
      return NextResponse.json(
        { success: false, message: 'Bạn cần đăng nhập bằng tài khoản khách thuê để đặt cọc.' },
        { status: session?.user ? 403 : 401 }
      );
    }

    const body = await request.json();
    const {
      roomId,
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

    if (room.status !== 'AVAILABLE') {
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
    const effectiveMoveInDate = requestedMoveInDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    const actualLandlordName = room.project_name
      ? `Ban Quản Lý ${room.project_name}`
      : room.landlord_name;

    // Chuyển trạng thái, lập hợp đồng và biên bản trong cùng transaction để
    // không thể tạo hồ sơ thuê dở dang hoặc nhận hai khoản cọc cho một phòng.
    const reservation = await prisma.$transaction(async (tx) => {
      const reserved = await tx.room.updateMany({
        where: { id: Number(roomId), status: 'AVAILABLE' },
        data: { status: 'RESERVED' },
      });
      if (reserved.count !== 1) return null;

      const contract = await tx.contract.create({
        data: {
          roomId: Number(roomId),
          roomTitle: room.title,
          tenantName: actualTenantName,
          tenantPhone: actualTenantPhone,
          landlordName: actualLandlordName,
          startDate: effectiveMoveInDate,
          endDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
          monthlyRent: room.price,
          depositAmount: actualDepositAmount,
          status: 'ACTIVE',
        },
      });

      const handover = await tx.handover.create({
        data: {
          contractId: contract.id,
          roomId: Number(roomId),
          type: 'CHECK_IN',
          tenantName: actualTenantName,
          tenantPhone: actualTenantPhone,
          landlordName: actualLandlordName,
          status: 'DRAFT',
          tenantConfirmed: false,
          landlordConfirmed: true,
          damageCost: 0,
          handoverDate: new Date(),
          items: {
            create: [
              { assetName: 'Điều hòa Inverter Panasonic', category: 'Điện tử', quantity: 1, condition: 'Tốt, làm lạnh sâu' },
              { assetName: 'Tủ lạnh 2 cánh Aqua 180L', category: 'Gia dụng', quantity: 1, condition: 'Mới 98%, làm đá tốt' },
              { assetName: 'Khóa cửa điện tử vân tay thông minh', category: 'An ninh', quantity: 1, condition: 'Nhận diện nhạy' },
              { assetName: 'Bình chữa cháy bột ABC 4kg & Tiêu lệnh PCCC', category: 'PCCC', quantity: 1, condition: 'Nguyên niêm phong, đạt chuẩn' },
              { assetName: 'Giường gỗ, nệm cao su & Tủ quần áo âm tường', category: 'Nội thất', quantity: 1, condition: 'Sạch đẹp, không trầy xước' },
            ],
          },
        },
      });

      return { contract, handover };
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, message: 'Phòng vừa được người khác giữ chỗ. Vui lòng chọn phòng khác.' },
        { status: 409 }
      );
    }
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
      transaction_code: transactionCode || `MB_${Math.floor(100000 + Math.random() * 900000)}`,
      notes: notes || 'Khách đã hoàn tất xem phòng và tiến hành đặt cọc giữ chỗ',
      created_at: new Date().toISOString(),
      status: 'CONFIRMED',
    };

    return NextResponse.json({
      success: true,
      message: 'Đặt cọc giữ chỗ phòng thành công! Trạng thái phòng đã chuyển sang "Giữ chỗ". Chủ trọ đã gửi Hợp đồng và Biên bản bàn giao để bạn ký xác nhận.',
      data: {
        receipt: depositReceipt,
        room: updatedRoom,
        contract: reservation.contract,
        handover: reservation.handover,
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
