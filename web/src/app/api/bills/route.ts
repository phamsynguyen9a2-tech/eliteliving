import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateBillStatus, getUtilityBills } from '@/lib/db';
import { generateMonthlyBillEmail } from '@/lib/email-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId') ? Number(searchParams.get('roomId')) : undefined;
    const landlordId = searchParams.get('landlordId') || undefined;

    const bills = await getUtilityBills({ roomId, landlordId });
    return NextResponse.json({ success: true, data: bills });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, billId, status, tenantEmail, tenantName } = body;

    if (action === 'PAY_BILL') {
      const updated = await updateBillStatus(billId, 'PAID');
      return NextResponse.json({
        success: true,
        message: '✅ Thanh toán hóa đơn thành công! Trạng thái đã cập nhật sang "Đã thanh toán (PAID)".',
        data: updated,
      });
    }

    if (action === 'NOTIFY_BILL') {
      // Chủ trọ gửi thông báo hóa đơn qua email tới khách thuê
      const bill = await prisma.utilityBill.findUnique({
        where: { id: billId },
      });

      if (!bill) {
        return NextResponse.json({ success: false, message: 'Không tìm thấy hóa đơn' }, { status: 404 });
      }

      const notif = generateMonthlyBillEmail({
        tenantName: tenantName || 'Khách thuê',
        tenantEmail: tenantEmail || 'tenant@eliteliving.vn',
        roomCode: bill.roomCode,
        month: bill.month,
        totalAmount: bill.totalAmount,
        rentCost: bill.rentCost,
        electricUsed: bill.electricUsed,
        electricCost: bill.electricCost,
        waterUsed: bill.waterUsed,
        waterCost: bill.waterCost,
        internetCost: bill.internetCost,
        serviceCost: bill.serviceCost,
        billId: bill.id,
      });

      return NextResponse.json({
        success: true,
        message: `✅ Đã gửi thông báo hóa đơn tháng ${bill.month} tới email khách thuê!`,
        data: notif,
      });
    }

    return NextResponse.json({ success: false, message: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
