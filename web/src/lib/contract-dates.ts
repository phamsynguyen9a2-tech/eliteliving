/**
 * Tính ngày của hợp đồng thuê (dùng được cả ở máy chủ lẫn trình duyệt).
 *
 * Ngày hợp đồng lưu dạng chuỗi YYYY-MM-DD; tính trực tiếp trên chuỗi để không lệch ngày theo
 * múi giờ. Cộng tháng giữ ngày cuối tháng: 31/01 + 1 tháng = 28/02 (hoặc 29/02 năm nhuận),
 * không tràn sang 03/03 như Date.setMonth.
 */

export const MAX_RENEWAL_MONTHS = 36;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const daysInMonth = (year: number, month1: number) => new Date(Date.UTC(year, month1, 0)).getUTCDate();

const pad = (n: number) => String(n).padStart(2, '0');

/** Chuỗi YYYY-MM-DD có phải một ngày có thật không (loại 2026-02-30). */
export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

/** Cộng `months` tháng vào ngày YYYY-MM-DD, kẹp ngày về cuối tháng nếu tháng đích ngắn hơn. */
export function addMonthsClamped(isoDate: string, months: number): string {
  const match = ISO_DATE.exec(isoDate.slice(0, 10));
  if (!match || !Number.isInteger(months)) throw new Error(`INVALID_DATE: ${isoDate}`);
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const total = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(total / 12);
  const targetMonth = (total % 12) + 1;
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  return `${targetYear}-${pad(targetMonth)}-${pad(targetDay)}`;
}

/** Số tháng gia hạn hợp lệ: số nguyên từ 1 đến MAX_RENEWAL_MONTHS. */
export function parseRenewalMonths(value: unknown): number | null {
  const months = Number(value);
  return Number.isInteger(months) && months >= 1 && months <= MAX_RENEWAL_MONTHS ? months : null;
}
