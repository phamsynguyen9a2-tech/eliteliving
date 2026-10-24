/**
 * Elite Living — Cấu hình chủ trọ (khung giờ đón khách, nội quy & PCCC) và phiếu sửa chữa.
 *
 * Lưu trong bảng Prisma `landlord_configs` và `maintenance_requests` (trước đây là bảng tạo bằng
 * SQL thủ công kèm file .data/*.json, nằm ngoài schema nên `prisma db push` có thể xóa mất).
 * Giữ nguyên các hàm cũ để API và giao diện không phải đổi.
 */
import prisma from '@/lib/prisma';
import { DEFAULT_HOUSE_RULES } from '@/lib/house-rules';
import type { Prisma } from '@prisma/client';
import type { AvailabilitySlot, HouseRule, LandlordAvailability, MaintenanceRequest } from '@/lib/types';
import type { MaintenanceRequest as MaintenanceRow } from '@prisma/client';

/** Khóa cấu hình nội quy mặc định của hệ thống (dùng khi chủ trọ chưa có bộ nội quy riêng). */
export const DEFAULT_SETTINGS_KEY = 'default';

export const DEFAULT_AVAILABILITY_SLOTS: AvailabilitySlot[] = [
  { id: 's1', timeSlot: '08:30 - 09:30', period: 'morning', enabled: true },
  { id: 's2', timeSlot: '09:30 - 10:30', period: 'morning', enabled: true },
  { id: 's3', timeSlot: '10:30 - 11:30', period: 'morning', enabled: true },
  { id: 's4', timeSlot: '14:00 - 15:00', period: 'afternoon', enabled: true },
  { id: 's5', timeSlot: '15:30 - 16:30', period: 'afternoon', enabled: true },
  { id: 's6', timeSlot: '17:00 - 18:00', period: 'afternoon', enabled: true },
  { id: 's7', timeSlot: '18:30 - 19:30', period: 'evening', enabled: true },
  { id: 's8', timeSlot: '20:00 - 21:00', period: 'evening', enabled: false },
];

export function buildDefaultAvailability(landlordId: string): LandlordAvailability {
  return {
    landlord_id: landlordId,
    available_days: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    slots: DEFAULT_AVAILABILITY_SLOTS.map((s) => ({ ...s })),
    notice_hours: 2,
    instructions:
      'Vui lòng đến đúng giờ đã hẹn. Đến nơi bấm chuông hoặc gọi hotline chủ trọ đón tại sảnh.',
  };
}

export function normalizeAvailability(
  landlordId: string,
  input: Partial<LandlordAvailability> | null | undefined
): LandlordAvailability {
  const base = buildDefaultAvailability(landlordId);
  if (!input || typeof input !== 'object') return base;

  const validDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const available_days = Array.isArray(input.available_days)
    ? input.available_days.filter((d) => typeof d === 'string' && validDays.includes(d))
    : base.available_days;

  const slots: AvailabilitySlot[] =
    Array.isArray(input.slots) && input.slots.length > 0
      ? input.slots
          .filter((s) => s && typeof s.timeSlot === 'string')
          .map((s, idx) => ({
            id: typeof s.id === 'string' && s.id ? s.id : `s${idx + 1}`,
            timeSlot: s.timeSlot.trim(),
            period:
              s.period === 'morning' || s.period === 'afternoon' || s.period === 'evening'
                ? s.period
                : 'morning',
            enabled: Boolean(s.enabled),
          }))
      : base.slots;

  const noticeNum = Number(input.notice_hours);
  const notice_hours =
    Number.isFinite(noticeNum) && noticeNum >= 1 && noticeNum <= 24
      ? Math.round(noticeNum)
      : base.notice_hours;

  const instructions =
    typeof input.instructions === 'string' ? input.instructions.trim() : base.instructions;

  return {
    landlord_id: landlordId,
    available_days,
    slots,
    notice_hours,
    instructions,
  };
}

export function normalizeHouseRules(input: unknown): HouseRule[] {
  if (!Array.isArray(input) || input.length === 0) {
    return DEFAULT_HOUSE_RULES.map((r) => ({ ...r }));
  }
  const normalized: HouseRule[] = [];
  for (let i = 0; i < input.length; i++) {
    const item = input[i] as Partial<HouseRule>;
    if (!item || typeof item !== 'object') continue;
    const fallback = DEFAULT_HOUSE_RULES[i] || DEFAULT_HOUSE_RULES[0];
    normalized.push({
      id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : fallback.id,
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : i + 1,
      category: item.category || fallback.category,
      title:
        typeof item.title === 'string' && item.title.trim() ? item.title.trim() : fallback.title,
      content:
        typeof item.content === 'string' && item.content.trim()
          ? item.content.trim()
          : fallback.content,
      mandatory: typeof item.mandatory === 'boolean' ? item.mandatory : fallback.mandatory,
      isActive: typeof item.isActive === 'boolean' ? item.isActive : true,
      penalty:
        typeof item.penalty === 'string' ? item.penalty.trim() : fallback.penalty || undefined,
    });
  }
  return normalized.length > 0 ? normalized : DEFAULT_HOUSE_RULES.map((r) => ({ ...r }));
}

const toJson = (value: unknown) => value as Prisma.InputJsonValue;

export async function getPersistedLandlordAvailability(landlordId: string): Promise<LandlordAvailability> {
  const key = landlordId || 'landlord_tp_1';
  try {
    const row = await prisma.landlordSetting.findUnique({ where: { landlordId: key }, select: { availability: true } });
    if (row?.availability) return normalizeAvailability(key, row.availability as unknown as Partial<LandlordAvailability>);
  } catch (err) {
    console.warn('[landlord-settings-store] Không đọc được khung giờ đón khách:', err);
  }
  return buildDefaultAvailability(key);
}

export async function savePersistedLandlordAvailability(
  landlordId: string,
  data: Partial<LandlordAvailability>
): Promise<LandlordAvailability> {
  const key = landlordId || 'landlord_tp_1';
  const current = await getPersistedLandlordAvailability(key);
  const merged = normalizeAvailability(key, { ...current, ...data, landlord_id: key });
  await prisma.landlordSetting.upsert({
    where: { landlordId: key },
    create: { landlordId: key, availability: toJson(merged) },
    update: { availability: toJson(merged) },
  });
  return merged;
}

/** Nội quy của chủ trọ; chưa có bộ riêng thì dùng nội quy mặc định của hệ thống. */
export async function getPersistedHouseRules(landlordId?: string): Promise<HouseRule[]> {
  const key = landlordId || DEFAULT_SETTINGS_KEY;
  try {
    const rows = await prisma.landlordSetting.findMany({
      where: { landlordId: { in: Array.from(new Set([key, DEFAULT_SETTINGS_KEY])) } },
      select: { landlordId: true, houseRules: true },
    });
    const chosen =
      rows.find((row) => row.landlordId === key && row.houseRules) ||
      rows.find((row) => row.landlordId === DEFAULT_SETTINGS_KEY && row.houseRules);
    if (chosen?.houseRules) return normalizeHouseRules(chosen.houseRules);
  } catch (err) {
    console.warn('[landlord-settings-store] Không đọc được nội quy:', err);
  }
  return DEFAULT_HOUSE_RULES.map((rule) => ({ ...rule }));
}

/**
 * Lưu nội quy cho đúng một chủ trọ (hoặc mặc định khi không có mã chủ trọ).
 * Trước đây lưu nội quy của một chủ trọ còn ghi đè nội quy mặc định, làm các chủ trọ khác
 * chưa có nội quy riêng bị hiện nội quy của người đó.
 */
export async function savePersistedHouseRules(landlordId: string | undefined, rules: HouseRule[]): Promise<HouseRule[]> {
  const key = landlordId || DEFAULT_SETTINGS_KEY;
  const normalized = normalizeHouseRules(rules);
  await prisma.landlordSetting.upsert({
    where: { landlordId: key },
    create: { landlordId: key, houseRules: toJson(normalized) },
    update: { houseRules: toJson(normalized) },
  });
  return normalized;
}

// ------------------------------------------------------------
// Phiếu yêu cầu sửa chữa / bảo trì
// ------------------------------------------------------------

const CATEGORIES = ['ELECTRICAL', 'PLUMBING', 'AC_APPLIANCE', 'DOOR_LOCK', 'OTHER'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
const STATUSES = ['PENDING', 'IN_PROGRESS', 'RESOLVED'] as const;
const pick = <T extends string>(allowed: readonly T[], value: unknown, fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

function toMaintenance(row: MaintenanceRow): MaintenanceRequest {
  return {
    id: row.id,
    room_id: row.roomId,
    room_code: row.roomCode,
    landlord_id: row.landlordId,
    tenant_name: row.tenantName,
    tenant_phone: row.tenantPhone,
    category: row.category,
    priority: row.priority,
    title: row.title,
    description: row.description,
    status: row.status,
    repair_cost: row.repairCost,
    resolution_note: row.resolutionNote ?? undefined,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function getPersistedMaintenanceRequests(landlordId?: string): Promise<MaintenanceRequest[]> {
  try {
    const rows = await prisma.maintenanceRequest.findMany({
      where: landlordId ? { landlordId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toMaintenance);
  } catch (err) {
    console.warn('[landlord-settings-store] Không đọc được phiếu sửa chữa:', err);
    return [];
  }
}

export async function createPersistedMaintenanceRequest(
  payload: Omit<MaintenanceRequest, 'id' | 'created_at' | 'updated_at'>
): Promise<MaintenanceRequest> {
  const row = await prisma.maintenanceRequest.create({
    data: {
      roomId: Number(payload.room_id),
      roomCode: String(payload.room_code || '').trim(),
      landlordId: String(payload.landlord_id || 'landlord_tp_1'),
      tenantName: String(payload.tenant_name || '').trim() || 'Khách thuê',
      tenantPhone: String(payload.tenant_phone || '').trim(),
      category: pick(CATEGORIES, payload.category, 'OTHER'),
      priority: pick(PRIORITIES, payload.priority, 'MEDIUM'),
      title: String(payload.title || '').trim(),
      description: String(payload.description || '').trim(),
      status: pick(STATUSES, payload.status, 'PENDING'),
      repairCost: Math.max(0, Number(payload.repair_cost) || 0),
      resolutionNote: payload.resolution_note?.trim() || null,
    },
  });
  return toMaintenance(row);
}

/**
 * Cập nhật phiếu sửa chữa. Truyền landlordId để chỉ cho chủ trọ sửa phiếu thuộc phòng của mình
 * (trả null nếu phiếu không tồn tại hoặc thuộc chủ trọ khác).
 */
export async function updatePersistedMaintenanceRequest(
  id: string,
  updates: Partial<Pick<MaintenanceRequest, 'status' | 'repair_cost' | 'resolution_note' | 'priority'>>,
  scope: { landlordId?: string } = {}
): Promise<MaintenanceRequest | null> {
  const existing = await prisma.maintenanceRequest.findUnique({ where: { id } });
  if (!existing) return null;
  if (scope.landlordId && existing.landlordId !== scope.landlordId) return null;
  const row = await prisma.maintenanceRequest.update({
    where: { id },
    data: {
      ...(updates.status ? { status: pick(STATUSES, updates.status, existing.status) } : {}),
      ...(updates.priority ? { priority: pick(PRIORITIES, updates.priority, existing.priority) } : {}),
      ...(updates.repair_cost !== undefined ? { repairCost: Math.max(0, Number(updates.repair_cost) || 0) } : {}),
      ...(updates.resolution_note !== undefined ? { resolutionNote: String(updates.resolution_note).trim() || null } : {}),
    },
  });
  return toMaintenance(row);
}
