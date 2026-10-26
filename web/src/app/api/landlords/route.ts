import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/request-session';

import prisma from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';
import { isDemoLoginEnabled } from '@/lib/demo-mode';
import {
  getPersistedMaintenanceRequests,
  createPersistedMaintenanceRequest,
  updatePersistedMaintenanceRequest,
} from '@/lib/landlord-settings-store';
import { notifyTenant, resolveTenantRecipient } from '@/lib/tenant-notifications';
import { lifecycleErrorResponse } from '@/lib/lifecycle-errors';
import {
  getLandlords,
  getLandlordRooms,
  createRoom,
  updateRoom,
  changeRoomStatusManually,
  deleteRoom,
  createUtilityBill,
  createBillsBulk,
  getBulkBillingSheet,
  updateBillStatus,
  getUtilityBills,
  createContract,
  getContracts,
  terminateContract,
  getAppointments,
  updateAppointmentStatus,
  getLandlordAvailability,
  saveLandlordAvailability,
  getLandlordHouseRules,
  saveLandlordHouseRules,
  ensureLandlordDemoData,
  getRoomById,
  signContractAsTenant,
} from '@/lib/db';

async function resolveTargetLandlordId(searchParams: URLSearchParams, fallback = 'landlord_tp_1') {
  const directLandlordId = searchParams.get('landlordId')?.trim();
  if (directLandlordId) return directLandlordId;
  const roomIdParam = searchParams.get('roomId');
  if (roomIdParam) {
    const room = await getRoomById(Number(roomIdParam));
    if (room?.landlord_id) return room.landlord_id;
  }
  return fallback;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';

  // Publicly readable configuration for tenants & guests:
  // 1) Landlord viewing availability slots & instructions (used in BookingModal & RoomDetailClient)
  // 2) Building house rules & fire safety regulations (used in ContractLegalModal & HouseRulesManager)
  if (type === 'availability') {
    const session = await getRequestSession();
    const fallbackId = session?.user?.role === 'LANDLORD' ? session.user.id : 'landlord_tp_1';
    const targetLandlordId = await resolveTargetLandlordId(searchParams, fallbackId);
    const availability = await getLandlordAvailability(targetLandlordId);
    return NextResponse.json({ success: true, data: availability });
  }

  if (type === 'rules') {
    const session = await getRequestSession();
    const fallbackId = session?.user?.role === 'LANDLORD' ? session.user.id : 'default';
    const targetLandlordId = await resolveTargetLandlordId(searchParams, fallbackId);
    const rules = await getLandlordHouseRules(targetLandlordId);
    return NextResponse.json({ success: true, data: rules });
  }

  const session = await getRequestSession();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, message: 'Vui lòng đăng nhập để truy cập dữ liệu vận hành.' },
      { status: 401 }
    );
  }

  const role = session.user.role;

  // Tenant only sees contracts tied to the verified phone stored in the DB.
  if (role === 'TENANT') {
    if (type !== 'contracts') {
      return NextResponse.json(
        { success: false, message: 'Bạn không có quyền xem dữ liệu chủ trọ.' },
        { status: 403 }
      );
    }
    const tenant = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true, phoneVerified: true },
    });
    const cleanedPhone = tenant?.phone?.replace(/\s|-/g, '').replace(/^\+84/, '0').trim() || '';
    // SĐT chưa xác minh chỉ là chữ người dùng tự nhập, không được dùng để mở hợp đồng của người khác.
    if (!cleanedPhone || !tenant?.phoneVerified) {
      return NextResponse.json({ success: true, data: [] });
    }
    const contracts = await getContracts({ tenantPhone: cleanedPhone });
    return NextResponse.json({ success: true, data: contracts });
  }

  if (role !== 'LANDLORD' && role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, message: 'Bạn không có quyền truy cập dữ liệu chủ trọ.' },
      { status: 403 }
    );
  }

  const requestedLandlordId = searchParams.get('landlordId') || 'landlord_tp_1';
  const landlordId = role === 'LANDLORD' ? session.user.id : requestedLandlordId;

  if (type === 'landlords') {
    const landlords = await getLandlords();
    return NextResponse.json({
      success: true,
      data: role === 'ADMIN' ? landlords : landlords.filter((item) => item.id === landlordId),
    });
  }

  if (type === 'rooms') {
    const rooms = await getLandlordRooms(landlordId);
    return NextResponse.json({ success: true, data: rooms });
  }

  if (type === 'appointments') {
    const apts = await getAppointments({ landlord_id: landlordId });
    return NextResponse.json({ success: true, data: apts });
  }

  if (type === 'bills') {
    const roomId = searchParams.get('roomId') ? Number(searchParams.get('roomId')) : undefined;
    const bills = await getUtilityBills({ roomId, landlordId });
    return NextResponse.json({ success: true, data: bills });
  }

  if (type === 'contracts') {
    const contracts = await getContracts({ landlordId });
    return NextResponse.json({ success: true, data: contracts });
  }

  // Bảng lập hóa đơn hàng loạt theo tháng: ?type=bulk-billing&month=MM/YYYY
  if (type === 'bulk-billing') {
    try {
      const sheet = await getBulkBillingSheet(landlordId, searchParams.get('month') || '');
      return NextResponse.json({ success: true, data: sheet });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      return NextResponse.json({ success: false, message: msg.replace(/^[A-Z_]+:\s*/, '') || 'Không tải được bảng lập hóa đơn.' }, { status: 400 });
    }
  }

  // Combined fetch for fast initial load
  const [rooms, appointments, bills, contracts, landlords, availability, houseRules, maintenanceRequests] =
    await Promise.all([
      getLandlordRooms(landlordId),
      getAppointments({ landlord_id: landlordId }),
      getUtilityBills({ landlordId }),
      getContracts({ landlordId }),
      getLandlords(),
      getLandlordAvailability(landlordId),
      getLandlordHouseRules(landlordId),
      getPersistedMaintenanceRequests(landlordId),
    ]);

  const visibleLandlords = role === 'ADMIN'
    ? landlords
    : landlords.filter((landlord) => landlord.id === landlordId);
  const currentLandlord = visibleLandlords.find((l) => l.id === landlordId) || visibleLandlords[0];

  return NextResponse.json({
    success: true,
    data: {
      landlord: currentLandlord,
      allLandlords: visibleLandlords,
      rooms,
      appointments,
      bills,
      contracts,
      availability,
      houseRules,
      maintenanceRequests,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getRequestSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập để thực hiện thao tác này.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;
    const role = session.user.role;

    if (action === 'SIGN_CONTRACT') {
      if (typeof body.contractId !== 'string' || !body.contractId.trim()) {
        return NextResponse.json(
          { success: false, message: 'Thiếu mã hợp đồng cần ký.' },
          { status: 400 }
        );
      }
      if (role !== 'TENANT' && role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, message: 'Chỉ khách thuê sở hữu hợp đồng mới có thể ký.' },
          { status: 403 }
        );
      }
      if (role === 'TENANT') {
        const tenant = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { phone: true, phoneVerified: true },
        });
        const cleanedPhone = tenant?.phone?.replace(/\s|-/g, '').replace(/^\+84/, '0').trim() || '';
        const ownedContracts = cleanedPhone && tenant?.phoneVerified
          ? await getContracts({ tenantPhone: cleanedPhone })
          : [];
        if (!ownedContracts.some((contract) => contract.id === body.contractId)) {
          return NextResponse.json(
            { success: false, message: 'Bạn không có quyền ký hợp đồng này.' },
            { status: 403 }
          );
        }
      }
      let signature: { signedAt: string } | null;
      try {
        signature = await signContractAsTenant(body.contractId);
      } catch (error) {
        if (error instanceof Error && error.message === 'CONTRACT_HANDOVER_REQUIRED') {
          return NextResponse.json(
            { success: false, message: 'Hợp đồng chưa có hồ sơ bàn giao để lưu chữ ký số.' },
            { status: 409 }
          );
        }
        throw error;
      }
      if (!signature) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy hợp đồng.' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Ký số hợp đồng điện tử và cam kết 10 điều nội quy PCCC thành công!',
        data: { tenant_signed: true, tenant_signed_at: signature.signedAt },
      });
    }

    if (role !== 'LANDLORD' && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Bạn không có quyền thực hiện nghiệp vụ chủ trọ.' },
        { status: 403 }
      );
    }

    const effectiveLandlordId = role === 'LANDLORD'
      ? session.user.id
      : body.landlordId || body.roomData?.landlord_id || 'landlord_tp_1';
    const canManageRoom = async (roomId: unknown) => {
      if (role === 'ADMIN') return true;
      const room = await getRoomById(Number(roomId));
      return Boolean(room && room.landlord_id === effectiveLandlordId);
    };

    // Room CRUD
    if (action === 'CREATE_ROOM') {
      // Tin chủ trọ đăng phải qua kiểm duyệt của admin trước khi hiện công khai
      const room = await createRoom(
        { ...body.roomData, landlord_id: effectiveLandlordId },
        { listingStatus: role === 'ADMIN' ? 'APPROVED' : 'PENDING' }
      );
      return NextResponse.json({
        success: true,
        data: room,
        message:
          role === 'ADMIN'
            ? 'Đã thêm phòng.'
            : 'Đã gửi tin đăng phòng. Tin sẽ hiện công khai sau khi quản trị viên duyệt.',
      });
    }

    if (action === 'UPDATE_ROOM') {
      if (!(await canManageRoom(body.id))) {
        return NextResponse.json({ success: false, message: 'Bạn không sở hữu phòng này.' }, { status: 403 });
      }
      const room = await updateRoom(body.id, body.roomData, { reReviewOnContentChange: role === 'LANDLORD' });
      return NextResponse.json({
        success: true,
        data: room,
        ...(room?.listing_status === 'PENDING' && role === 'LANDLORD'
          ? { message: 'Đã lưu thay đổi. Nội dung tin đăng thay đổi nên tin được gửi duyệt lại.' }
          : {}),
      });
    }

    if (action === 'UPDATE_ROOM_STATUS') {
      if (!(await canManageRoom(body.id))) {
        return NextResponse.json({ success: false, message: 'Bạn không sở hữu phòng này.' }, { status: 403 });
      }
      // Đổi tay chỉ cho các chuyển đổi khớp vòng đời thuê; còn lại đi qua đặt cọc / check-in / thanh lý
      try {
        const room = await changeRoomStatusManually(Number(body.id), body.status);
        return NextResponse.json({ success: true, data: room });
      } catch (err) {
        const errorResponse = lifecycleErrorResponse(err);
        if (errorResponse) return errorResponse;
        throw err;
      }
    }

    if (action === 'DELETE_ROOM') {
      if (!(await canManageRoom(body.id))) {
        return NextResponse.json({ success: false, message: 'Bạn không sở hữu phòng này.' }, { status: 403 });
      }
      try {
        const success = await deleteRoom(Number(body.id));
        if (!success) {
          return NextResponse.json(
            { success: false, message: 'Không thể xóa phòng này.' },
            { status: 400 }
          );
        }
        return NextResponse.json({ success: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.startsWith('ROOM_HAS_RECORDS:')) {
          return NextResponse.json(
            {
              success: false,
              message: msg.replace('ROOM_HAS_RECORDS:', '').trim(),
            },
            { status: 409 }
          );
        }
        throw err;
      }
    }

    // Billing
    if (action === 'CREATE_BILL') {
      if (!(await canManageRoom(body.billData?.room_id))) {
        return NextResponse.json({ success: false, message: 'Bạn không sở hữu phòng lập hóa đơn.' }, { status: 403 });
      }
      try {
        const bill = await createUtilityBill(body.billData);
        return NextResponse.json({ success: true, data: bill });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        for (const [code, status] of [
          ['DUPLICATE_BILL_MONTH:', 409],
          ['NO_ACTIVE_CONTRACT:', 409],
          ['INVALID_BILL_MONTH:', 400],
          ['INVALID_READING:', 400],
        ] as const) {
          if (msg.startsWith(code)) {
            return NextResponse.json(
              { success: false, message: msg.replace(code, '').trim() },
              { status }
            );
          }
        }
        throw err;
      }
    }

    // Lập hóa đơn hàng loạt: { month, items: [{ room_id, electric_old, electric_new, water_old, water_new }] }
    if (action === 'CREATE_BILLS_BULK') {
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return NextResponse.json({ success: false, message: 'Chưa có phòng nào được chọn để lập hóa đơn.' }, { status: 400 });
      }
      const result = await createBillsBulk(role === 'LANDLORD' ? effectiveLandlordId : null, String(body.month || ''), body.items);
      return NextResponse.json({
        success: result.created > 0,
        data: result,
        message: `Đã lập ${result.created} hóa đơn${result.failed ? `, ${result.failed} phòng chưa lập được` : ''}.`,
      }, { status: result.created > 0 || result.failed === 0 ? 200 : 400 });
    }

    if (action === 'UPDATE_BILL_STATUS') {
      if (role === 'LANDLORD') {
        const ownedBills = await getUtilityBills({ landlordId: effectiveLandlordId });
        if (!ownedBills.some((bill) => bill.id === body.billId)) {
          return NextResponse.json({ success: false, message: 'Bạn không sở hữu hóa đơn này.' }, { status: 403 });
        }
      }
      if (body.status !== 'PAID' && body.status !== 'UNPAID') {
        return NextResponse.json({ success: false, message: 'Trạng thái hóa đơn không hợp lệ.' }, { status: 400 });
      }
      const bill = await updateBillStatus(body.billId, body.status);
      if (!bill) {
        return NextResponse.json(
          { success: false, message: 'Không lưu được trạng thái hóa đơn. Vui lòng thử lại.' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, data: bill });
    }

    // Contracts
    if (action === 'CREATE_CONTRACT') {
      if (!(await canManageRoom(body.contractData?.room_id))) {
        return NextResponse.json({ success: false, message: 'Bạn không sở hữu phòng lập hợp đồng.' }, { status: 403 });
      }
      try {
        const contract = await createContract(body.contractData);
        return NextResponse.json({ success: true, data: contract });
      } catch (err) {
        const errorResponse = lifecycleErrorResponse(err);
        if (errorResponse) return errorResponse;
        throw err;
      }
    }

    if (action === 'TERMINATE_CONTRACT') {
      // Quyền kiểm tra trên phòng thật của hợp đồng (đọc từ CSDL), không tin roomId trình duyệt gửi lên
      const target = typeof body.contractId === 'string' && body.contractId
        ? await prisma.contract.findUnique({ where: { id: body.contractId }, select: { roomId: true } })
        : null;
      if (!target) {
        return NextResponse.json({ success: false, message: 'Không tìm thấy hợp đồng cần thanh lý.' }, { status: 404 });
      }
      if (!(await canManageRoom(target.roomId))) {
        return NextResponse.json({ success: false, message: 'Bạn không sở hữu phòng của hợp đồng này.' }, { status: 403 });
      }
      let contract;
      try {
        contract = await terminateContract(body.contractId, target.roomId);
      } catch (err) {
        const errorResponse = lifecycleErrorResponse(err);
        if (errorResponse) return errorResponse;
        throw err;
      }
      if (!contract) {
        return NextResponse.json({ success: false, message: 'Không thể thanh lý hợp đồng. Vui lòng thử lại.' }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: contract });
    }

    // Appointments
    if (action === 'UPDATE_APPOINTMENT') {
      if (role === 'LANDLORD') {
        const ownedAppointments = await getAppointments({ landlord_id: effectiveLandlordId });
        if (!ownedAppointments.some((appointment) => appointment.id === body.id)) {
          return NextResponse.json({ success: false, message: 'Bạn không sở hữu lịch hẹn này.' }, { status: 403 });
        }
      }
      const apt = await updateAppointmentStatus(body.id, body.status);

      // Thông báo cho khách thuê khi chủ trọ cập nhật lịch hẹn
      if (apt && ['CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(body.status)) {
        try {
          const recipient = await resolveTenantRecipient({
            userId: apt.user_id,
            phone: apt.user_phone,
            name: apt.user_name,
          });
          const statusText =
            body.status === 'CONFIRMED'
              ? 'ĐÃ ĐƯỢC XÁC NHẬN'
              : body.status === 'CANCELLED'
              ? 'ĐÃ BỊ HỦY'
              : 'ĐÃ HOÀN TẤT';
          const roomLabel = apt.room_code ? `phòng #${apt.room_code}` : apt.room_title || 'phòng trọ';

          await notifyTenant({
            recipient,
            type: 'APPOINTMENT_UPDATE',
            subject: `Lịch hẹn xem ${roomLabel} ${statusText.toLowerCase()}`,
            summary: `Chủ trọ đã cập nhật lịch hẹn xem ${roomLabel} (ngày ${apt.date}, khung giờ ${apt.time_slot}) sang trạng thái: ${statusText}.`,
            link: '/ho-so?tab=appointments',
            metadata: {
              appointmentId: apt.id,
              roomId: apt.room_id,
              status: body.status,
              date: apt.date,
              timeSlot: apt.time_slot,
            },
            email: {
              badge: 'Elite Living • Lịch hẹn xem phòng',
              title: `CẬP NHẬT LỊCH HẸN: ${statusText}`,
              paragraphs: [
                `Lịch hẹn xem ${roomLabel} của quý khách đã được cập nhật sang trạng thái: ${statusText}.`,
                body.status === 'CONFIRMED'
                  ? 'Chủ trọ đã xác nhận lịch hẹn. Quý khách vui lòng đến đúng giờ đã hẹn hoặc liên hệ hotline chủ trọ đón tại sảnh.'
                  : body.status === 'CANCELLED'
                  ? 'Lịch hẹn đã bị hủy. Quý khách có thể lựa chọn và đặt lại khung giờ khác phù hợp trên hệ thống.'
                  : 'Lịch xem phòng đã hoàn tất. Cảm ơn quý khách đã quan tâm hệ thống phòng trọ Elite Living.'
              ],
              details: [
                { label: 'Phòng', value: roomLabel },
                { label: 'Ngày hẹn', value: apt.date },
                { label: 'Khung giờ', value: apt.time_slot },
                { label: 'Trạng thái', value: statusText },
              ],
              ctaLabel: 'Xem lịch hẹn của bạn',
              ctaHref: '/ho-so?tab=appointments',
            }
          });
        } catch (e) {
          console.warn('Could not dispatch appointment notification:', e);
        }
      }

      return NextResponse.json({ success: true, data: apt });
    }

    // Availability
    if (action === 'SAVE_AVAILABILITY') {
      const updated = await saveLandlordAvailability(effectiveLandlordId, body.availabilityData);
      return NextResponse.json({
        success: true,
        message: 'Đã lưu khung giờ đón khách thành công.',
        data: updated,
      });
    }

    // House Rules & PCCC
    if (action === 'SAVE_HOUSE_RULES') {
      if (!Array.isArray(body.rules) || body.rules.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Danh sách nội quy không hợp lệ.' },
          { status: 400 }
        );
      }
      const updated = await saveLandlordHouseRules(effectiveLandlordId, body.rules);
      return NextResponse.json({
        success: true,
        message: 'Đã lưu bộ nội quy tòa nhà lên hệ thống thành công.',
        data: updated,
      });
    }

    // Maintenance & Repair Requests
    if (action === 'CREATE_MAINTENANCE') {
      const mData = body.maintenanceData || {};
      const room = await getRoomById(Number(mData.room_id));
      if (!room) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy phòng cần bảo trì.' },
          { status: 404 }
        );
      }
      if (role === 'LANDLORD' && room.landlord_id !== effectiveLandlordId) {
        return NextResponse.json(
          { success: false, message: 'Bạn không sở hữu phòng này.' },
          { status: 403 }
        );
      }
      const created = await createPersistedMaintenanceRequest({
        room_id: room.id,
        room_code: room.room_code,
        landlord_id: room.landlord_id,
        tenant_name: mData.tenant_name || 'Khách đang thuê',
        tenant_phone: mData.tenant_phone || '',
        category: mData.category || 'OTHER',
        priority: mData.priority || 'MEDIUM',
        title: mData.title || `Bảo trì phòng ${room.room_code}`,
        description: mData.description || '',
        status: 'PENDING',
        repair_cost: Number(mData.repair_cost) || 0,
      });
      return NextResponse.json({
        success: true,
        message: `Đã ghi nhận phiếu yêu cầu sửa chữa cho phòng ${room.room_code}.`,
        data: created,
      });
    }

    if (action === 'UPDATE_MAINTENANCE') {
      // Chủ trọ chỉ cập nhật được phiếu sửa chữa thuộc phòng của mình
      const updated = await updatePersistedMaintenanceRequest(
        String(body.id || ''),
        {
          status: body.status,
          priority: body.priority,
          repair_cost: body.repair_cost,
          resolution_note: body.resolution_note,
        },
        { landlordId: role === 'LANDLORD' ? effectiveLandlordId : undefined }
      );
      if (!updated) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy phiếu yêu cầu sửa chữa.' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Đã cập nhật trạng thái phiếu sửa chữa.',
        data: updated,
      });
    }

    // Landlord Password Change
    if (action === 'CHANGE_LANDLORD_PASSWORD') {
      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || '');
      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' },
          { status: 400 }
        );
      }

      const landlordRecord = await prisma.landlord.findUnique({
        where: { id: effectiveLandlordId },
        select: { id: true, passwordHash: true },
      });
      if (!landlordRecord) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy tài khoản Chủ trọ.' },
          { status: 404 }
        );
      }

      const validCurrent = landlordRecord.passwordHash
        ? await verifyPassword(currentPassword, landlordRecord.passwordHash)
        : isDemoLoginEnabled() && currentPassword === '123456';

      if (!validCurrent && role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, message: 'Mật khẩu hiện tại không chính xác.' },
          { status: 400 }
        );
      }

      const nextHash = await hashPassword(newPassword);
      await prisma.landlord.update({
        where: { id: landlordRecord.id },
        data: { passwordHash: nextHash },
      });

      return NextResponse.json({
        success: true,
        message: 'Đã cập nhật mật khẩu bảo mật cho tài khoản Chủ trọ thành công!',
      });
    }

    return NextResponse.json({ success: false, message: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi xử lý nghiệp vụ chủ trọ.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
