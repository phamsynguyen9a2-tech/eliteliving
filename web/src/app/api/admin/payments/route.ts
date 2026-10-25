import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-guard';
import { isSimulatedTransactionCode } from '@/lib/simulated-payment';

export interface PaymentLedgerRow {
  id: string;
  kind: 'BILL' | 'DEPOSIT';
  room_id: number;
  room_code: string;
  reference: string; // kỳ hóa đơn hoặc ngày dọn vào
  payer_name: string;
  payer_phone: string;
  amount: number;
  transaction_code: string;
  simulated: boolean;
  status: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'CANCELLED';
  reported_at: string;
  confirmed_at: string | null;
}

/** Lịch sử giao dịch thanh toán mô phỏng: báo thanh toán hóa đơn + đặt cọc giữ chỗ. */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const [billPayments, deposits] = await Promise.all([
    prisma.billPayment.findMany({
      orderBy: { reportedAt: 'desc' },
      take: 500,
      include: { bill: { select: { roomCode: true, month: true, totalAmount: true } } },
    }),
    prisma.depositClaim.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { room: { select: { roomCode: true } } },
    }),
  ]);

  const rows: PaymentLedgerRow[] = [
    ...billPayments.map((p) => ({
      id: p.id,
      kind: 'BILL' as const,
      room_id: p.roomId,
      room_code: p.bill.roomCode,
      reference: `Hóa đơn kỳ ${p.bill.month}`,
      payer_name: p.tenantName,
      payer_phone: p.tenantPhone,
      amount: p.bill.totalAmount,
      transaction_code: p.transactionCode,
      simulated: isSimulatedTransactionCode(p.transactionCode),
      status: p.status,
      reported_at: p.reportedAt.toISOString(),
      confirmed_at: p.confirmedAt?.toISOString() ?? null,
    })),
    ...deposits.map((d) => ({
      id: d.id,
      kind: 'DEPOSIT' as const,
      room_id: d.roomId,
      room_code: d.room.roomCode,
      reference: `Đặt cọc, dọn vào ${d.moveInDate}`,
      payer_name: d.tenantName,
      payer_phone: d.tenantPhone,
      amount: d.depositAmount,
      transaction_code: d.transactionCode,
      simulated: isSimulatedTransactionCode(d.transactionCode),
      status: d.status,
      reported_at: d.createdAt.toISOString(),
      confirmed_at: d.confirmedAt?.toISOString() ?? null,
    })),
  ].sort((a, b) => b.reported_at.localeCompare(a.reported_at));

  const sum = (filter: (r: PaymentLedgerRow) => boolean) => rows.filter(filter).reduce((s, r) => s + r.amount, 0);
  return NextResponse.json({
    success: true,
    data: {
      rows,
      totals: {
        count: rows.length,
        confirmedAmount: sum((r) => r.status === 'CONFIRMED'),
        pendingAmount: sum((r) => r.status === 'PENDING_CONFIRMATION'),
        pendingCount: rows.filter((r) => r.status === 'PENDING_CONFIRMATION').length,
      },
    },
  });
}
