import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/request-session';
import { getRoomById } from '@/lib/db';
import { updateRoomDepositClaimStatus } from '@/lib/payment-claims-store';
import prisma from '@/lib/prisma';
import { generateContractCheckinEmail } from '@/lib/email-service';


export async function POST(request: NextRequest) {
  try {
    const session = await getRequestSession();
    if (!session?.user || !['LANDLORD', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: 'Chỉ chủ trọ hoặc quản trị viên được thực hiện check-in.' },
        { status: session?.user ? 403 : 401 }
      );
    }

    const body = await request.json();
    const {
      roomId,
      tenantName,
      tenantPhone,
      tenantEmail,
      tenantCitizenId,
      initialElectric = 0,
      initialWater = 0,
      moveInDate,
      contractDurationMonths = 12,
      vehicleCount = 0,
    } = body;

    const numericRoomId = Number(roomId);
    if (!Number.isInteger(numericRoomId) || numericRoomId <= 0) {
      return NextResponse.json(
        { success: false, message: 'Mã phòng cần check-in không hợp lệ.' },
        { status: 400 }
      );
    }

    const submittedTenantName = typeof tenantName === 'string' ? tenantName.trim() : '';
    const submittedTenantPhone = typeof tenantPhone === 'string'
      ? tenantPhone.replace(/\s|-/g, '').replace(/^\+84/, '0')
      : '';
    const submittedTenantEmail = typeof tenantEmail === 'string' ? tenantEmail.trim() : '';
    const submittedCitizenId = typeof tenantCitizenId === 'string'
      ? tenantCitizenId.replace(/\s/g, '')
      : '';
    const numericInitialElectric = Number(initialElectric);
    const numericInitialWater = Number(initialWater);
    const numericDuration = Number(contractDurationMonths);
    const numericVehicleCount = Number(vehicleCount);
    const requestedMoveInDate = typeof moveInDate === 'string' ? moveInDate : '';
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(requestedMoveInDate);
    const startDateObj = dateMatch
      ? new Date(Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3])))
      : null;
    const validMoveInDate = Boolean(
      dateMatch &&
      startDateObj &&
      startDateObj.getUTCFullYear() === Number(dateMatch[1]) &&
      startDateObj.getUTCMonth() === Number(dateMatch[2]) - 1 &&
      startDateObj.getUTCDate() === Number(dateMatch[3])
    );

    if (submittedTenantName.length < 2 || submittedTenantName.length > 100) {
      return NextResponse.json({ success: false, message: 'Họ tên khách thuê không hợp lệ.' }, { status: 400 });
    }
    if (!/^0(3[2-9]|5[2689]|7[06-9]|8[1-689]|9[0-46-9])\d{7}$/.test(submittedTenantPhone)) {
      return NextResponse.json({ success: false, message: 'Số điện thoại khách thuê không hợp lệ.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submittedTenantEmail)) {
      return NextResponse.json({ success: false, message: 'Email khách thuê không hợp lệ.' }, { status: 400 });
    }
    if (!/^\d{9}(\d{3})?$/.test(submittedCitizenId)) {
      return NextResponse.json({ success: false, message: 'Số CCCD/CMND phải gồm 9 hoặc 12 chữ số.' }, { status: 400 });
    }
    if (!validMoveInDate || !startDateObj) {
      return NextResponse.json({ success: false, message: 'Ngày nhận phòng không hợp lệ.' }, { status: 400 });
    }
    if (!Number.isFinite(numericInitialElectric) || numericInitialElectric < 0 ||
        !Number.isFinite(numericInitialWater) || numericInitialWater < 0) {
      return NextResponse.json({ success: false, message: 'Chỉ số điện nước ban đầu không hợp lệ.' }, { status: 400 });
    }
    if (!Number.isInteger(numericDuration) || numericDuration < 1 || numericDuration > 36) {
      return NextResponse.json({ success: false, message: 'Thời hạn hợp đồng phải từ 1 đến 36 tháng.' }, { status: 400 });
    }
    if (!Number.isInteger(numericVehicleCount) || numericVehicleCount < 0 || numericVehicleCount > 10) {
      return NextResponse.json({ success: false, message: 'Số lượng xe phải từ 0 đến 10.' }, { status: 400 });
    }

    const room = await getRoomById(numericRoomId);
    if (!room) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy thông tin phòng trọ' },
        { status: 404 }
      );
    }

    if (session.user.role === 'LANDLORD' && room.landlord_id !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Bạn không sở hữu phòng này.' },
        { status: 403 }
      );
    }

    if (room.status !== 'RESERVED') {
      return NextResponse.json(
        { success: false, message: 'Chỉ phòng đang được giữ chỗ mới có thể check-in.' },
        { status: 409 }
      );
    }

    // Tính toán ngày hết hạn trên UTC để không lệch ngày theo múi giờ máy chủ.
    const endDateObj = new Date(startDateObj);
    endDateObj.setUTCMonth(endDateObj.getUTCMonth() + numericDuration);
    const endDateStr = endDateObj.toISOString().slice(0, 10);
    const landlordName = room.landlord_name || 'Chủ trọ Elite Living';
    const handoverItems = [
      { assetName: `Đồng hồ điện công tơ riêng (Chỉ số: ${numericInitialElectric} kWh)`, category: 'Điện lực', quantity: 1, condition: 'Nguyên niêm chì, hoạt động chuẩn xác' },
      { assetName: `Đồng hồ nước đồng hồ riêng (Chỉ số: ${numericInitialWater} m³)`, category: 'Nước sinh hoạt', quantity: 1, condition: 'Đạt chuẩn, không rò rỉ' },
      { assetName: 'Điều hòa Inverter Panasonic 1.5 HP', category: 'Điện tử', quantity: 1, condition: 'Tốt, làm lạnh sâu, có remote' },
      { assetName: 'Tủ lạnh 2 cánh Aqua 180L', category: 'Gia dụng', quantity: 1, condition: 'Mới 98%, làm đá tốt' },
      { assetName: 'Khóa cửa điện tử vân tay / thẻ từ thông minh', category: 'An ninh', quantity: 1, condition: 'Nhạy, đã cấp 02 thẻ từ & cài vân tay' },
      { assetName: 'Bình chữa cháy bột ABC 4kg & Tiêu lệnh PCCC', category: 'PCCC', quantity: 1, condition: 'Nguyên chốt niêm phong, áp kế vạch xanh' },
      { assetName: 'Giường gỗ, nệm lò xo cao cấp & Tủ quần áo âm tường', category: 'Nội thất', quantity: 1, condition: 'Sạch đẹp, mới 99%' },
      { assetName: 'Bếp từ đôi Sunhouse & Máy hút mùi kính cong', category: 'Nhà bếp', quantity: 1, condition: 'Hoạt động êm, sạch sẽ' },
    ];

    // Trạng thái phòng, hợp đồng và biên bản cùng commit hoặc cùng rollback.
    const checkIn = await prisma.$transaction(async (tx) => {
      const rented = await tx.room.updateMany({
        where: { id: numericRoomId, status: 'RESERVED' },
        data: { status: 'RENTED' },
      });
      if (rented.count !== 1) throw new Error('ROOM_NOT_RESERVED');

      const existingContract = await tx.contract.findFirst({
        where: { roomId: numericRoomId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
      const actualTenantName = existingContract?.tenantName || submittedTenantName;
      const actualTenantPhone = existingContract?.tenantPhone || submittedTenantPhone;
      const contract = existingContract
        ? await tx.contract.update({
            where: { id: existingContract.id },
            data: {
              startDate: requestedMoveInDate,
              endDate: endDateStr,
              monthlyRent: room.price,
              depositAmount: room.deposit || room.price,
              status: 'ACTIVE',
            },
          })
        : await tx.contract.create({
            data: {
              roomId: numericRoomId,
              roomTitle: room.title,
              tenantName: actualTenantName,
              tenantPhone: actualTenantPhone,
              landlordName,
              startDate: requestedMoveInDate,
              endDate: endDateStr,
              monthlyRent: room.price,
              depositAmount: room.deposit || room.price,
              status: 'ACTIVE',
            },
          });

      const submittedTenantAddress =
        typeof body.tenantAddress === 'string' && body.tenantAddress.trim().length > 0
          ? body.tenantAddress.trim()
          : null;
      await tx.$executeRaw`
        UPDATE contracts
        SET tenant_citizen_id = ${submittedCitizenId || null},
            tenant_address = COALESCE(${submittedTenantAddress}, tenant_address),
            vehicle_count = ${numericVehicleCount}
        WHERE id = ${contract.id}
      `;

      const notes = `Bàn giao nhận phòng ngày ${requestedMoveInDate}. CCCD/CMND: ${submittedCitizenId}. Chỉ số điện ban đầu: ${numericInitialElectric} kWh. Chỉ số nước ban đầu: ${numericInitialWater} m³. Số lượng xe: ${numericVehicleCount}.`;
      const draftHandover = await tx.handover.findFirst({
        where: { contractId: contract.id, type: 'CHECK_IN', status: 'DRAFT' },
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      });
      const signatureMarker = draftHandover?.notes?.match(
        /\[ELITE_CONTRACT_TENANT_SIGNED_AT:[^\]]+\]/
      )?.[0];
      const persistedNotes = signatureMarker ? `${notes}\n${signatureMarker}` : notes;
      const handover = draftHandover
        ? await tx.handover.update({
            where: { id: draftHandover.id },
            data: {
              tenantName: actualTenantName,
              tenantPhone: actualTenantPhone,
              landlordName,
              status: 'PENDING_CONFIRMATION',
              tenantConfirmed: false,
              landlordConfirmed: true,
              damageCost: 0,
              handoverDate: startDateObj,
              notes: persistedNotes,
              ...(draftHandover.items.length === 0 ? { items: { create: handoverItems } } : {}),
            },
            include: { items: true },
          })
        : await tx.handover.create({
            data: {
              contractId: contract.id,
              roomId: numericRoomId,
              type: 'CHECK_IN',
              tenantName: actualTenantName,
              tenantPhone: actualTenantPhone,
              landlordName,
              status: 'PENDING_CONFIRMATION',
              tenantConfirmed: false,
              landlordConfirmed: true,
              damageCost: 0,
              handoverDate: startDateObj,
              notes,
              items: { create: handoverItems },
            },
            include: { items: true },
          });

      return { contract, handover };
    });
    await updateRoomDepositClaimStatus(numericRoomId, 'CONFIRMED');
    const updatedRoom = await getRoomById(numericRoomId);

    // Chỉ phát thông báo sau khi giao dịch DB đã thành công.
    // Gắn recipientUserId nếu tài khoản khách thuê đã có trên hệ thống
    let recipientUserId: string | undefined;
    try {
      const tenantAccount = await prisma.user.findFirst({
        where: {
          OR: [
            { email: submittedTenantEmail },
            { phone: checkIn.contract.tenantPhone, role: 'TENANT' },
          ],
        },
        select: { id: true },
      });
      recipientUserId = tenantAccount?.id;
    } catch {}

    const emailNotif = await generateContractCheckinEmail(
      {
        tenantName: checkIn.contract.tenantName,
        tenantEmail: submittedTenantEmail,
        tenantPhone: checkIn.contract.tenantPhone,
        roomCode: room.room_code,
        roomTitle: room.title,
        address: room.address,
        monthlyRent: room.price,
        depositAmount: room.deposit || room.price,
        startDate: requestedMoveInDate,
        endDate: endDateStr,
        initialElectric: numericInitialElectric,
        initialWater: numericInitialWater,
        contractId: checkIn.contract.id,
      },
      { recipientUserId }
    );

    return NextResponse.json({
      success: true,
      message: `Check-in nhận phòng #${room.room_code} thành công! Hợp đồng đã kích hoạt, Biên bản bàn giao đã lập và Email Hợp đồng điện tử kèm 10 điều PCCC đã được gửi tới ${submittedTenantEmail}.`,
      data: {
        room: updatedRoom,
        contract: checkIn.contract,
        handover: checkIn.handover,
        notification: emailNotif,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi khi xử lý check-in nhận phòng';
    if (message === 'ROOM_NOT_RESERVED') {
      return NextResponse.json(
        { success: false, message: 'Trạng thái phòng vừa thay đổi, không thể check-in.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
