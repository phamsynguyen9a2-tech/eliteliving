import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notifyTenant, resolveTenantRecipient } from '@/lib/tenant-notifications';
import {
  getLandlords,
  getLandlordRooms,
  createRoom,
  updateRoom,
  updateRoomStatus,
  deleteRoom,
  createUtilityBill,
  updateBillStatus,
  getUtilityBills,
  createContract,
  getContracts,
  terminateContract,
  getAppointments,
  updateAppointmentStatus,
  getLandlordAvailability,
  saveLandlordAvailability,
  ensureLandlordDemoData,
  getRoomById,
  signContractAsTenant,
} from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, message: 'Vui lòng đăng nhập để truy cập dữ liệu vận hành.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';
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
    if (!tenant?.phone || !tenant.phoneVerified) {
      return NextResponse.json({ success: true, data: [] });
    }
    const ownedAppointments = await prisma.appointment.findMany({
      where: { userId: session.user.id },
      select: { roomId: true },
    });
    const ownedRoomIds = new Set(ownedAppointments.map((appointment) => appointment.roomId));
    const contracts = (await getContracts({ tenantPhone: tenant.phone })).filter((contract) =>
      ownedRoomIds.has(contract.room_id)
    );
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

  // Ensure initial demo contracts, appointments, and bills exist for this landlord
  await ensureLandlordDemoData(landlordId);

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

  if (type === 'availability') {
    const availability = getLandlordAvailability(landlordId);
    return NextResponse.json({ success: true, data: availability });
  }

  // Combined fetch for fast initial load
  const [rooms, appointments, bills, contracts, landlords] = await Promise.all([
    getLandlordRooms(landlordId),
    getAppointments({ landlord_id: landlordId }),
    getUtilityBills({ landlordId }),
    getContracts({ landlordId }),
    getLandlords(),
  ]);

  const availability = getLandlordAvailability(landlordId);
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
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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
        const ownedAppointments = await prisma.appointment.findMany({
          where: { userId: session.user.id },
          select: { roomId: true },
        });
        const ownedRoomIds = new Set(ownedAppointments.map((appointment) => appointment.roomId));
        const ownedContracts = tenant?.phone && tenant.phoneVerified
          ? (await getContracts({ tenantPhone: tenant.phone })).filter((contract) =>
              ownedRoomIds.has(contract.room_id)
            )
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
      const room = await createRoom({ ...body.roomData, landlord_id: effectiveLandlordId });
      return NextResponse.json({ success: true, data: room });
    }

    if (action === 'UPDATE_ROOM') {
      if (!(await canManageRoom(body.id))) {
        return NextResponse.json({ success: false, message: 'Bạn không sở hữu phòng này.' }, { status: 403 });
      }
      const room = await updateRoom(body.id, body.roomData);
      return NextResponse.json({ success: true, data: room });
    }

    if (action === 'UPDATE_ROOM_STATUS') {
      if (!(await canManageRoom(body.id))) {
        return NextResponse.json({ success: false, message: 'Bạn không sở hữu phòng này.' }, { status: 403 });
      }
      const room = await updateRoomStatus(body.id, body.status);
      return NextResponse.json({ success: true, data: room });
    }

    if (action === 'DELETE_ROOM') {
      if (!(await canManageRoom(body.id))) {
        return NextResponse.json({ success: false, message: 'Bạn không sở hữu phòng này.' }, { status: 403 });
      }
      const success = await deleteRoom(body.id);
      return NextResponse.json({ success });
    }

    // Billing
    if (action === 'CREATE_BILL') {
      if (!(await canManageRoom(body.billData?.room_id))) {
        return NextResponse.json({ success: false, message: 'Bạn không sở hữu phòng lập hóa đơn.' }, { status: 403 });
      }
      const bill = await createUtilityBill(body.billData);
      return NextResponse.json({ success: true, data: bill });
    }

    if (action === 'UPDATE_BILL_STATUS') {
      if (role === 'LANDLORD') {
        const ownedBills = await getUtilityBills({ landlordId: effectiveLandlordId });
        if (!ownedBills.some((bill) => bill.id === body.billId)) {
          return NextResponse.json({ success: false, message: 'Bạn không sở hữu hóa đơn này.' }, { status: 403 });
        }
      }
      const bill = await updateBillStatus(body.billId, body.status);
      return NextResponse.json({ success: true, data: bill });
    }

    // Contracts
    if (action === 'CREATE_CONTRACT') {
      if (!(await canManageRoom(body.contractData?.room_id))) {
        return NextResponse.json({ success: false, message: 'Bạn không sở hữu phòng lập hợp đồng.' }, { status: 403 });
      }
      const contract = await createContract(body.contractData);
      return NextResponse.json({ success: true, data: contract });
    }

    if (action === 'TERMINATE_CONTRACT') {
      if (!(await canManageRoom(body.roomId))) {
        return NextResponse.json({ success: false, message: 'Bạn không sở hữu phòng của hợp đồng này.' }, { status: 403 });
      }
      const contract = await terminateContract(body.contractId, body.roomId);
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

          notifyTenant({
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
      const updated = saveLandlordAvailability(effectiveLandlordId, body.availabilityData);
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, message: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi xử lý nghiệp vụ chủ trọ.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
