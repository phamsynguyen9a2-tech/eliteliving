import { NextResponse } from 'next/server';
import { type Session } from 'next-auth';
import { getRequestSession } from '@/lib/request-session';

import prisma from '@/lib/prisma';

export type SessionUser = Session['user'];

/**
 * Rows a tenant may touch: contracts tied to the verified phone stored in the
 * DB AND to a room the tenant booked an appointment for. Same rule as
 * /api/landlords GET type=contracts and SIGN_CONTRACT.
 */
export interface TenantScope {
  phone: string | null;
  appointmentRoomIds: Set<number>;
  contractIds: Set<string>;
  contractRoomIds: Set<number>;
}

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
    if (!tenant?.phone || !tenant.phoneVerified) return scope;

    scope.phone = tenant.phone;
    // Same filter as getContracts({ tenantPhone }), but without its handovers
    // include so ownership still resolves where the handovers table is missing.
    const contracts = await prisma.contract.findMany({
      where: { tenantPhone: tenant.phone, roomId: { in: [...scope.appointmentRoomIds] } },
      select: { id: true, roomId: true },
    });
    contracts.forEach((contract) => {
      scope.contractIds.add(contract.id);
      scope.contractRoomIds.add(contract.roomId);
    });
  } catch {
    // DB offline: the tenant owns nothing verifiable.
  }
  return scope;
}

/**
 * A tenant owns a handover of a room they booked when it carries their verified
 * phone or belongs to one of their contracts.
 */
export function tenantOwnsHandover(
  scope: TenantScope,
  handover: { roomId: number; tenantPhone: string; contractId: string }
) {
  if (!scope.phone || !scope.appointmentRoomIds.has(handover.roomId)) return false;
  return handover.tenantPhone === scope.phone || scope.contractIds.has(handover.contractId);
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
      where: { phone: tenantPhone, role: 'TENANT' },
      select: { email: true },
    });
    return tenant?.email || fallback;
  } catch {
    return fallback;
  }
}
