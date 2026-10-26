import { NextResponse } from 'next/server';
import { type Session } from 'next-auth';
import { getRequestSession } from '@/lib/request-session';

import prisma from '@/lib/prisma';
import { verifiedTenantPhoneWhere } from '@/lib/guest-booking-limit';

export type SessionUser = Session['user'];

/**
 * Rows a tenant may touch: rooms booked via their own appointments (matched by
 * user id), plus contracts and handovers tied to the tenant's phone number —
 * but ONLY when that phone is verified (phoneVerified = true) in the DB.
 * An unverified phone is just text the user typed into their profile, so it
 * must never unlock another person's contract (CCCD, address, bills, signing).
 * Contracts created directly by the landlord without a viewing appointment are
 * still included once the phone is verified.
 */
export interface TenantScope {
  phone: string | null;
  appointmentRoomIds: Set<number>;
  contractIds: Set<string>;
  contractRoomIds: Set<number>;
}

const normalizePhone = (phone?: string | null) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\s|-/g, '').trim();
  return cleaned.startsWith('+84') ? `0${cleaned.slice(3)}` : cleaned;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getRequestSession();
  return session?.user?.id ? session.user : null;
}

export function unauthorized(message = 'Vui lòng đăng nhập để thực hiện thao tác này.') {
  return NextResponse.json({ success: false, message }, { status: 401 });
}

export function forbidden(message = 'Bạn không có quyền truy cập dữ liệu này.') {
  return NextResponse.json({ success: false, message }, { status: 403 });
}

export async function getTenantScope(userId: string): Promise<TenantScope> {
  const scope: TenantScope = {
    phone: null,
    appointmentRoomIds: new Set(),
    contractIds: new Set(),
    contractRoomIds: new Set(),
  };
  try {
    const tenant = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, phoneVerified: true },
    });
    const ownedAppointments = await prisma.appointment.findMany({
      where: { userId },
      select: { roomId: true },
    });
    ownedAppointments.forEach((appointment) => scope.appointmentRoomIds.add(appointment.roomId));

    const cleanedPhone = normalizePhone(tenant?.phone);
    // Chỉ SĐT đã xác minh mới được dùng để khớp hợp đồng / biên bản bàn giao.
    if (!cleanedPhone || !tenant?.phoneVerified) return scope;

    scope.phone = cleanedPhone;
    const phoneCandidates = Array.from(
      new Set([cleanedPhone, tenant?.phone?.trim() || ''].filter(Boolean))
    );

    // Direct landlord contracts for this tenant's phone are included even when the
    // tenant did not create a viewing appointment beforehand.
    const contracts = await prisma.contract.findMany({
      where: { tenantPhone: { in: phoneCandidates } },
      select: { id: true, roomId: true },
    });
    contracts.forEach((contract) => {
      scope.contractIds.add(contract.id);
      scope.contractRoomIds.add(contract.roomId);
      scope.appointmentRoomIds.add(contract.roomId);
    });

    try {
      const handovers = await prisma.handover.findMany({
        where: { tenantPhone: { in: phoneCandidates } },
        select: { roomId: true },
      });
      handovers.forEach((handover) => {
        scope.appointmentRoomIds.add(handover.roomId);
      });
    } catch {
      // Handover table optional in older schemas
    }
  } catch {
    // DB offline: the tenant owns nothing verifiable.
  }
  return scope;
}

/**
 * A tenant owns a handover when it carries their phone or belongs to one of
 * their contracts (whether booked via appointment or created directly by landlord).
 */
export function tenantOwnsHandover(
  scope: TenantScope,
  handover: { roomId: number; tenantPhone: string; contractId: string }
) {
  if (scope.contractIds.has(handover.contractId)) return true;
  if (!scope.phone) return false;
  return normalizePhone(handover.tenantPhone) === scope.phone;
}

/** Room ids owned by a landlord, or null when the DB cannot be reached. */
export async function getLandlordRoomIds(landlordId: string): Promise<Set<number> | null> {
  try {
    const rooms = await prisma.room.findMany({ where: { landlordId }, select: { id: true } });
    return new Set(rooms.map((room) => room.id));
  } catch {
    return null;
  }
}

export async function landlordOwnsRoom(landlordId: string, roomId: unknown): Promise<boolean> {
  const id = Number(roomId);
  if (!Number.isInteger(id)) return false;
  try {
    const room = await prisma.room.findUnique({ where: { id }, select: { landlordId: true } });
    return Boolean(room && room.landlordId === landlordId);
  } catch {
    return false;
  }
}

/** Landlord-side access: LANDLORD only their rooms, ADMIN all, TENANT never. */
export async function canManageRoom(user: SessionUser, roomId: unknown): Promise<boolean> {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'LANDLORD') return landlordOwnsRoom(user.id, roomId);
  return false;
}

/** Tenant-side access to a contract row (by id and room). */
export async function canAccessContract(
  user: SessionUser,
  contract: { id: string; roomId: number }
): Promise<boolean> {
  if (user.role === 'TENANT') {
    const scope = await getTenantScope(user.id);
    return scope.contractIds.has(contract.id);
  }
  return canManageRoom(user, contract.roomId);
}

/**
 * Email that should receive a tenant notification: the signed-in tenant's own
 * address, otherwise the account registered with the contract's phone.
 */
export async function resolveTenantEmail(user: SessionUser, tenantPhone?: string | null) {
  const fallback = 'tenant@eliteliving.vn';
  if (user.role === 'TENANT') return user.email || fallback;
  if (!tenantPhone) return fallback;
  try {
    const tenant = await prisma.user.findFirst({
      where: verifiedTenantPhoneWhere(tenantPhone),
      select: { email: true },
    });
    return tenant?.email || fallback;
  } catch {
    return fallback;
  }
}
