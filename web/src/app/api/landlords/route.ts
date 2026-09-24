import { NextRequest, NextResponse } from 'next/server';
import { getLandlords, getLandlordRooms, createUtilityBill, getUtilityBills, createContract, getContracts } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const landlordId = searchParams.get('landlordId');
  const type = searchParams.get('type') || 'rooms';

  if (type === 'landlords') {
    return NextResponse.json({ success: true, data: await getLandlords() });
  }

  if (type === 'bills') {
    const roomId = searchParams.get('roomId') ? Number(searchParams.get('roomId')) : undefined;
    return NextResponse.json({ success: true, data: await getUtilityBills(roomId) });
  }

  if (type === 'contracts') {
    return NextResponse.json({ success: true, data: await getContracts() });
  }

  // Default: return rooms for this landlord
  const targetLandlordId = landlordId || 'landlord_1';
  const rooms = await getLandlordRooms(targetLandlordId);
  return NextResponse.json({ success: true, data: rooms });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'CREATE_BILL') {
      const bill = await createUtilityBill(body.billData);
      return NextResponse.json({ success: true, data: bill });
    }

    if (action === 'CREATE_CONTRACT') {
      const contract = await createContract(body.contractData);
      return NextResponse.json({ success: true, data: contract });
    }

    return NextResponse.json({ success: false, message: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
