/**
 * Kiểm tra ngày / khung giờ xem phòng (dùng chung cho đặt lịch mới và đổi lịch).
 * Hàm thuần: nhận cấu hình khung giờ đón khách của chủ trọ, không truy cập CSDL.
 */
import type { LandlordAvailability } from './types';

export type SlotCheck =
  | { ok: true; bookingDate: Date; slotStart: number }
  | { ok: false; message: string };

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function checkViewingSlot(
  date: unknown,
  timeSlot: unknown,
  availability: Pick<LandlordAvailability, 'available_days' | 'slots' | 'notice_hours'> | null | undefined,
  now: Date = new Date()
): SlotCheck {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, message: 'Ngày xem phòng không đúng định dạng YYYY-MM-DD.' };
  }
  const [y, m, d] = date.split('-').map(Number);
  const bookingDate = new Date(y, m - 1, d);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const real = bookingDate.getFullYear() === y && bookingDate.getMonth() === m - 1 && bookingDate.getDate() === d;
  if (!real || bookingDate < today) {
    return { ok: false, message: 'Ngày xem phòng phải từ hôm nay trở đi.' };
  }

  const match = typeof timeSlot === 'string'
    ? timeSlot.match(/^([01]\d|2[0-3]):([0-5]\d)\s-\s([01]\d|2[0-3]):([0-5]\d)$/)
    : null;
  const slotStart = match ? Number(match[1]) * 60 + Number(match[2]) : 0;
  const slotEnd = match ? Number(match[3]) * 60 + Number(match[4]) : 0;
  if (!match || slotEnd <= slotStart) {
    return { ok: false, message: 'Khung giờ xem phòng không hợp lệ.' };
  }

  if (availability) {
    const dayCode = DAY_LABELS[bookingDate.getDay()];
    if (Array.isArray(availability.available_days) && availability.available_days.length > 0 && !availability.available_days.includes(dayCode)) {
      return { ok: false, message: `Chủ trọ không đón khách vào ${dayCode}. Các ngày mở cửa: ${availability.available_days.join(', ')}.` };
    }
    if (Array.isArray(availability.slots) && availability.slots.length > 0) {
      const enabled = availability.slots.filter((s) => s.enabled).map((s) => s.timeSlot);
      if (!enabled.includes(timeSlot as string)) {
        return { ok: false, message: `Khung giờ ${timeSlot} không nằm trong khung giờ đón khách của chủ trọ.` };
      }
    }
    const sameDay = bookingDate.getFullYear() === now.getFullYear() && bookingDate.getMonth() === now.getMonth() && bookingDate.getDate() === now.getDate();
    if (sameDay && typeof availability.notice_hours === 'number' && availability.notice_hours > 0) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (slotStart - nowMinutes < availability.notice_hours * 60) {
        return { ok: false, message: `Chủ trọ yêu cầu đặt lịch trước tối thiểu ${availability.notice_hours} giờ cho lịch hẹn trong ngày.` };
      }
    }
  }
  return { ok: true, bookingDate, slotStart };
}
