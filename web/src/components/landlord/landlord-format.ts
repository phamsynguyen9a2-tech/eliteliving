import type { Appointment, Contract, Room, RoomStatus, UtilityBill } from '@/lib/types';

// ============================================================
// Navigation
// ============================================================

export type LandlordTab =
  | 'overview'
  | 'rooms'
  | 'appointments'
  | 'availability'
  | 'billing'
  | 'contracts'
  | 'rules'
  | 'handover';

export const LANDLORD_TABS: LandlordTab[] = [
  'overview',
  'rooms',
  'appointments',
  'availability',
  'billing',
  'contracts',
  'rules',
  'handover',
];

export function isLandlordTab(value: unknown): value is LandlordTab {
  return typeof value === 'string' && (LANDLORD_TABS as string[]).includes(value);
}

export const TAB_TITLES: Record<LandlordTab, string> = {
  overview: 'Tổng quan',
  rooms: 'Phòng cho thuê',
  appointments: 'Lịch xem phòng',
  availability: 'Khung giờ đón khách',
  billing: 'Hóa đơn điện nước',
  contracts: 'Hợp đồng',
  rules: 'Nội quy & PCCC',
  handover: 'Bàn giao tài sản',
};

// ============================================================
// Money & numbers
// ============================================================

export function formatVND(value: number | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n).toLocaleString('vi-VN')} đ`;
}

/** Short form for stat cards, e.g. "12,5 triệu đ". Always pair with the full value in a title. */
export function formatShortVND(value: number | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const fmt = (v: number) => v.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  if (abs >= 1_000_000_000) return `${fmt(n / 1_000_000_000)} tỷ đ`;
  if (abs >= 1_000_000) return `${fmt(n / 1_000_000)} triệu đ`;
  return formatVND(n);
}

export function formatNumber(value: number | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('vi-VN');
}

// ============================================================
// Dates (always local time — never UTC toISOString for "today")
// ============================================================

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** Normalises "YYYY-MM-DD" or ISO strings to a local "YYYY-MM-DD" key. */
export function normalizeDateKey(value: string | undefined | null): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match && value.length <= 10) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
  return toDateKey(parsed);
}

export function parseDateKey(value: string | undefined | null): Date | null {
  const key = normalizeDateKey(value);
  if (!key) return null;
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | undefined | null): string {
  const date = parseDateKey(value);
  if (!date) return '—';
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

export function formatDateWithWeekday(value: string | undefined | null): string {
  const date = parseDateKey(value);
  if (!date) return '—';
  return `${WEEKDAYS[date.getDay()]}, ${formatDate(value)}`;
}

/** Whole days between today (local midnight) and the given date. Negative = in the past. */
export function daysUntil(value: string | undefined | null): number | null {
  const date = parseDateKey(value);
  if (!date) return null;
  const today = parseDateKey(todayKey());
  if (!today) return null;
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

export function relativeDayLabel(value: string | undefined | null): string {
  const diff = daysUntil(value);
  if (diff === null) return '—';
  if (diff === 0) return 'Hôm nay';
  if (diff === 1) return 'Ngày mai';
  if (diff === -1) return 'Hôm qua';
  return formatDateWithWeekday(value);
}

export function addMonthsToDateKey(value: string, months: number): string {
  const date = parseDateKey(value);
  if (!date) return '';
  const target = new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  return toDateKey(target);
}

/** Billing period used by the existing CREATE_BILL flow ("MM/YYYY", current month). */
export function currentBillingMonth(now: Date = new Date()): string {
  return `${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
}

export function slotStartMinutes(slot: string | undefined | null): number {
  const match = /(\d{1,2})[:h](\d{2})/.exec(slot || '');
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function greetingForHour(hour: number): string {
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 13) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

// ============================================================
// Status metadata — user-facing Vietnamese labels only
// ============================================================

export type Tone = 'gold' | 'navy' | 'amber' | 'rose' | 'neutral' | 'outline';

export const ROOM_STATUS_ORDER: RoomStatus[] = ['AVAILABLE', 'BOOKED_VIEWING', 'RESERVED', 'RENTED'];

export const ROOM_STATUS_META: Record<RoomStatus, { label: string; description: string; tone: Tone; barColor: string }> = {
  AVAILABLE: {
    label: 'Còn trống',
    description: 'Sẵn sàng nhận lịch xem phòng',
    tone: 'outline',
    barColor: '#B89C66',
  },
  BOOKED_VIEWING: {
    label: 'Có lịch xem',
    description: 'Đã xác nhận lịch khách đến xem',
    tone: 'amber',
    barColor: '#E3C98E',
  },
  RESERVED: {
    label: 'Đã giữ chỗ',
    description: 'Khách đã đặt cọc, chờ nhận phòng',
    tone: 'gold',
    barColor: '#6F7C8F',
  },
  RENTED: {
    label: 'Đang thuê',
    description: 'Đã có hợp đồng, khách đang ở',
    tone: 'navy',
    barColor: '#0F223A',
  },
};

export const APPOINTMENT_STATUS_META: Record<Appointment['status'], { label: string; tone: Tone }> = {
  PENDING: { label: 'Chờ xác nhận', tone: 'amber' },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'outline' },
  COMPLETED: { label: 'Đã xem phòng', tone: 'gold' },
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
};

export const BILL_STATUS_META: Record<UtilityBill['status'], { label: string; tone: Tone }> = {
  UNPAID: { label: 'Chưa thanh toán', tone: 'rose' },
  PAID: { label: 'Đã thanh toán', tone: 'navy' },
};

export const CONTRACT_STATUS_META: Record<Contract['status'], { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Đang hiệu lực', tone: 'navy' },
  EXPIRED: { label: 'Đã hết hạn', tone: 'neutral' },
  TERMINATED: { label: 'Đã thanh lý', tone: 'neutral' },
};

// ============================================================
// Appointment grouping
// ============================================================

export type AppointmentView = 'PENDING' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED' | 'ALL';

export const APPOINTMENT_VIEWS: AppointmentView[] = ['PENDING', 'UPCOMING', 'COMPLETED', 'CANCELLED', 'ALL'];

export function isAppointmentView(value: unknown): value is AppointmentView {
  return typeof value === 'string' && (APPOINTMENT_VIEWS as string[]).includes(value);
}

/** CONFIRMED appointments whose date has passed still need a "Hoàn tất" or "Hủy" update. */
export function isOverdueConfirmed(apt: Appointment, today = todayKey()): boolean {
  return apt.status === 'CONFIRMED' && normalizeDateKey(apt.date) < today;
}

export function appointmentMatchesView(apt: Appointment, view: AppointmentView): boolean {
  if (view === 'ALL') return true;
  if (view === 'UPCOMING') return apt.status === 'CONFIRMED';
  return apt.status === view;
}

export function compareAppointmentsAsc(a: Appointment, b: Appointment): number {
  const da = normalizeDateKey(a.date);
  const db = normalizeDateKey(b.date);
  if (da !== db) return da < db ? -1 : 1;
  return slotStartMinutes(a.time_slot) - slotStartMinutes(b.time_slot);
}

// ============================================================
// Contracts
// ============================================================

export const CONTRACT_EXPIRY_WINDOW_DAYS = 30;

export function contractDaysRemaining(contract: Contract): number | null {
  return daysUntil(contract.end_date);
}

export function isContractExpiringSoon(contract: Contract): boolean {
  if (contract.status !== 'ACTIVE') return false;
  const days = contractDaysRemaining(contract);
  return days !== null && days <= CONTRACT_EXPIRY_WINDOW_DAYS;
}

// ============================================================
// Rooms
// ============================================================

export function roomBuildingLabel(room: Pick<Room, 'project_name' | 'district'> | undefined | null): string {
  if (!room) return '';
  return room.project_name?.trim() || room.district?.trim() || 'Chưa phân khu';
}

export function latestBillForRoom(bills: UtilityBill[], roomId: number): UtilityBill | undefined {
  let latest: UtilityBill | undefined;
  for (const bill of bills) {
    if (bill.room_id !== roomId) continue;
    if (!latest) {
      latest = bill;
      continue;
    }
    const a = new Date(bill.created_at).getTime();
    const b = new Date(latest.created_at).getTime();
    if (Number.isFinite(a) && (!Number.isFinite(b) || a > b)) latest = bill;
  }
  return latest;
}

// ============================================================
// Validation
// ============================================================

export function normalizePhone(value: string): string {
  return value.replace(/[\s.\-()]/g, '');
}

export function isValidVnPhone(value: string): boolean {
  return /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(normalizePhone(value));
}

export function isValidCitizenId(value: string): boolean {
  return /^(\d{9}|\d{12})$/.test(value.trim());
}

export function zaloLink(phone: string): string {
  const digits = normalizePhone(phone).replace(/^\+84/, '0');
  return `https://zalo.me/${digits}`;
}

export function initialsOf(name: string | undefined | null): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'EL';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[parts.length - 2][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function lastNameOf(name: string | undefined | null): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] || '';
}
