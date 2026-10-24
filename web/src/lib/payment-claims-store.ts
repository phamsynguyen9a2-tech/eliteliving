/**
 * Báo thanh toán hóa đơn và yêu cầu đặt cọc giữ chỗ — lưu trong bảng Prisma `bill_payments` và
 * `deposit_claims` (trước đây là một khối JSON trong bảng tạo bằng SQL thủ công kèm file .data).
 * Giữ nguyên các hàm và kiểu dữ liệu cũ để các API không phải đổi.
 */
import prisma from './prisma';
import type { BillPayment, DepositClaim } from '@prisma/client';

export interface BillPaymentClaim {
  bill_id: string;
  room_id: number;
  tenant_id: string;
  tenant_name: string;
  tenant_phone: string;
  transaction_code: string;
  status: 'PENDING_CONFIRMATION' | 'CONFIRMED';
  reported_at: string;
  confirmed_at?: string;
}

export interface RoomDepositClaim {
  room_id: number;
  appointment_id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_phone: string;
  tenant_citizen_id: string;
  tenant_address: string;
  deposit_amount: number;
  move_in_date: string;
  vehicle_count: number;
  transaction_code: string;
  notes?: string;
  status: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'CANCELLED';
  created_at: string;
  confirmed_at?: string;
}

function toBillClaim(row: BillPayment): BillPaymentClaim {
  return {
    bill_id: row.billId,
    room_id: row.roomId,
    tenant_id: row.tenantId ?? '',
    tenant_name: row.tenantName,
    tenant_phone: row.tenantPhone,
    transaction_code: row.transactionCode,
    status: row.status,
    reported_at: row.reportedAt.toISOString(),
    ...(row.confirmedAt ? { confirmed_at: row.confirmedAt.toISOString() } : {}),
  };
}

function toDepositClaim(row: DepositClaim): RoomDepositClaim {
  return {
    room_id: row.roomId,
    appointment_id: row.appointmentId ?? '',
    tenant_id: row.tenantId ?? '',
    tenant_name: row.tenantName,
    tenant_phone: row.tenantPhone,
    tenant_citizen_id: row.tenantCitizenId,
    tenant_address: row.tenantAddress,
    deposit_amount: row.depositAmount,
    move_in_date: row.moveInDate,
    vehicle_count: row.vehicleCount,
    transaction_code: row.transactionCode,
    ...(row.notes ? { notes: row.notes } : {}),
    status: row.status,
    created_at: row.createdAt.toISOString(),
    ...(row.confirmedAt ? { confirmed_at: row.confirmedAt.toISOString() } : {}),
  };
}

// ------------------------------------------------------------
// Báo thanh toán hóa đơn (mỗi hóa đơn một bản ghi, báo lại thì ghi đè)
// ------------------------------------------------------------

export async function getAllBillPaymentClaims(): Promise<Record<string, BillPaymentClaim>> {
  const rows = await prisma.billPayment.findMany();
  return Object.fromEntries(rows.map((row) => [row.billId, toBillClaim(row)]));
}

export async function getBillPaymentClaim(billId: string): Promise<BillPaymentClaim | undefined> {
  const row = await prisma.billPayment.findUnique({ where: { billId: String(billId) } });
  return row ? toBillClaim(row) : undefined;
}

export async function saveBillPaymentClaim(claim: BillPaymentClaim): Promise<BillPaymentClaim> {
  const data = {
    roomId: claim.room_id,
    tenantId: claim.tenant_id || null,
    tenantName: claim.tenant_name,
    tenantPhone: claim.tenant_phone || '',
    transactionCode: claim.transaction_code,
    status: claim.status,
    reportedAt: new Date(claim.reported_at),
    confirmedAt: null,
  };
  const row = await prisma.billPayment.upsert({
    where: { billId: String(claim.bill_id) },
    create: { billId: String(claim.bill_id), ...data },
    update: data,
  });
  return toBillClaim(row);
}

/** CONFIRMED khi chủ trọ xác nhận đã thu; CLEARED (hóa đơn trở lại "chưa thanh toán") thì xóa báo cũ. */
export async function updateBillPaymentClaimStatus(
  billId: string,
  status: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'CLEARED'
): Promise<void> {
  const key = String(billId);
  if (status === 'CLEARED') {
    await prisma.billPayment.deleteMany({ where: { billId: key } });
    return;
  }
  await prisma.billPayment.updateMany({
    where: { billId: key },
    data: { status, ...(status === 'CONFIRMED' ? { confirmedAt: new Date() } : {}) },
  });
}

// ------------------------------------------------------------
// Yêu cầu đặt cọc (lưu mọi lần; yêu cầu hiện hành của phòng = bản ghi mới nhất)
// ------------------------------------------------------------

/** Yêu cầu đặt cọc mới nhất của từng phòng. */
export async function getAllRoomDepositClaims(): Promise<Record<string, RoomDepositClaim>> {
  const rows = await prisma.depositClaim.findMany({
    orderBy: { createdAt: 'desc' },
    distinct: ['roomId'],
  });
  return Object.fromEntries(rows.map((row) => [String(row.roomId), toDepositClaim(row)]));
}

export async function getRoomDepositClaim(roomId: number): Promise<RoomDepositClaim | undefined> {
  const row = await prisma.depositClaim.findFirst({
    where: { roomId: Number(roomId) },
    orderBy: { createdAt: 'desc' },
  });
  return row ? toDepositClaim(row) : undefined;
}

export async function saveRoomDepositClaim(claim: RoomDepositClaim): Promise<RoomDepositClaim> {
  const row = await prisma.depositClaim.create({
    data: {
      roomId: claim.room_id,
      appointmentId: claim.appointment_id || null,
      tenantId: claim.tenant_id || null,
      tenantName: claim.tenant_name,
      tenantPhone: claim.tenant_phone,
      tenantCitizenId: claim.tenant_citizen_id,
      tenantAddress: claim.tenant_address || '',
      depositAmount: claim.deposit_amount,
      moveInDate: claim.move_in_date,
      vehicleCount: claim.vehicle_count || 0,
      transactionCode: claim.transaction_code,
      notes: claim.notes || null,
      status: claim.status,
      createdAt: claim.created_at ? new Date(claim.created_at) : undefined,
    },
  });
  return toDepositClaim(row);
}

/** Đổi trạng thái yêu cầu đặt cọc hiện hành (mới nhất) của phòng. */
export async function updateRoomDepositClaimStatus(
  roomId: number,
  status: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'CANCELLED'
): Promise<void> {
  const latest = await prisma.depositClaim.findFirst({
    where: { roomId: Number(roomId) },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  if (!latest) return;
  await prisma.depositClaim.update({
    where: { id: latest.id },
    data: { status, ...(status === 'CONFIRMED' ? { confirmedAt: new Date() } : {}) },
  });
}
