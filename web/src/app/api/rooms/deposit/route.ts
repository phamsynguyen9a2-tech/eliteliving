import { NextRequest, NextResponse } from 'next/server';
import { updateRoomStatus, getRoomById } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const {
      roomId,
      tenantName,
      tenantPhone,
      depositAmount,
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

    const room = await getRoomById(Number(roomId));
    if (!room) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy phòng trọ' },
        { status: 404 }
      );
    }

    if (room.status === 'RENTED') {
      return NextResponse.json(
        { success: false, message: 'Phòng này hiện đã được thuê bởi người khác' },
        { status: 400 }
      );
    }

    // 1. Cập nhật trạng thái phòng sang RESERVED (Giữ chỗ)
    const updatedRoom = await updateRoomStatus(Number(roomId), 'RESERVED');

    const actualTenantName = tenantName || session?.user?.name || 'Khách thuê';
    const actualTenantPhone = tenantPhone || session?.user?.phone || '';

    // 2. Chủ trọ tự động tiến hành lập Hợp đồng điện tử (10 điều PCCC) & Biên bản bàn giao ngay khi nhận cọc
    let newContract: any = null;
    let newHandover: any = null;
    try {
      newContract = await prisma.contract.create({
        data: {
          roomId: Number(roomId),
          roomTitle: room.title,
          tenantName: actualTenantName,
          tenantPhone: actualTenantPhone,
          landlordName: (room as any).building_name ? `Ban Quản Lý ${(room as any).building_name}` : 'Nguyễn Văn Hùng (Chủ trọ)',
          startDate: moveInDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
          endDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
          monthlyRent: room.price,
          depositAmount: depositAmount || room.deposit || room.price,
          status: 'ACTIVE',
        },
      });

      newHandover = await prisma.handover.create({
        data: {
          contractId: newContract.id,
          roomId: Number(roomId),
          type: 'CHECK_IN',
          tenantName: actualTenantName,
          tenantPhone: actualTenantPhone,
          landlordName: (room as any).building_name ? `Ban Quản Lý ${(room as any).building_name}` : 'Nguyễn Văn Hùng (Chủ trọ)',
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
    } catch (createErr) {
      console.warn('Auto create contract/handover error (non-fatal fallback):', createErr);
    }

    const depositReceipt = {
      id: `DEP_${Date.now()}`,
      room_id: Number(roomId),
      room_code: room.room_code,
      room_title: room.title,
      tenant_name: actualTenantName,
      tenant_phone: actualTenantPhone,
      deposit_amount: depositAmount || room.deposit || room.price,
      move_in_date: moveInDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      vehicle_count: vehicleCount,
      payment_method: paymentMethod,
      transaction_code: transactionCode || `MB_${Math.floor(100000 + Math.random() * 900000)}`,
      notes: notes || 'Khách đã hoàn tất xem phòng và tiến hành đặt cọc giữ chỗ',
      created_at: new Date().toISOString(),
      status: 'CONFIRMED',
    };

    return NextResponse.json({
      success: true,
      message: '✅ Đặt cọc giữ chỗ phòng thành công! Trạng thái phòng đã chuyển sang "Giữ chỗ". Chủ trọ đã gửi Hợp đồng và Biên bản bàn giao để bạn ký xác nhận.',
      data: {
        receipt: depositReceipt,
        room: updatedRoom,
        contract: newContract,
        handover: newHandover,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Lỗi xử lý đặt cọc phòng' },
      { status: 500 }
    );
  }
}
