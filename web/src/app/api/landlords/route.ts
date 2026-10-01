import { NextRequest, NextResponse } from 'next/server';
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
} from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const landlordId = searchParams.get('landlordId') || 'landlord_tp_1';
  const type = searchParams.get('type') || 'all';

  if (type === 'landlords') {
    return NextResponse.json({ success: true, data: await getLandlords() });
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
  const currentLandlord = landlords.find((l) => l.id === landlordId) || landlords[0];

  return NextResponse.json({
    success: true,
    data: {
      landlord: currentLandlord,
      allLandlords: landlords,
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
    const body = await request.json();
    const { action } = body;

    // Room CRUD
    if (action === 'CREATE_ROOM') {
      const room = await createRoom(body.roomData);
      return NextResponse.json({ success: true, data: room });
    }

    if (action === 'UPDATE_ROOM') {
      const room = await updateRoom(body.id, body.roomData);
      return NextResponse.json({ success: true, data: room });
    }

    if (action === 'UPDATE_ROOM_STATUS') {
      const room = await updateRoomStatus(body.id, body.status);
      return NextResponse.json({ success: true, data: room });
    }

    if (action === 'DELETE_ROOM') {
      const success = await deleteRoom(body.id);
      return NextResponse.json({ success });
    }

    // Billing
    if (action === 'CREATE_BILL') {
      const bill = await createUtilityBill(body.billData);
      return NextResponse.json({ success: true, data: bill });
    }

    if (action === 'UPDATE_BILL_STATUS') {
      const bill = await updateBillStatus(body.billId, body.status);
      return NextResponse.json({ success: true, data: bill });
    }

    // Contracts
    if (action === 'CREATE_CONTRACT') {
      const contract = await createContract(body.contractData);
      return NextResponse.json({ success: true, data: contract });
    }

    if (action === 'TERMINATE_CONTRACT') {
      const contract = await terminateContract(body.contractId, body.roomId);
      return NextResponse.json({ success: true, data: contract });
    }

    // Appointments
    if (action === 'UPDATE_APPOINTMENT') {
      const apt = await updateAppointmentStatus(body.id, body.status);
      return NextResponse.json({ success: true, data: apt });
    }

    // Availability
    if (action === 'SAVE_AVAILABILITY') {
      const updated = saveLandlordAvailability(body.landlordId, body.availabilityData);
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, message: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
