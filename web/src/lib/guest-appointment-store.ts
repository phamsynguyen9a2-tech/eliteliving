/**
 * Danh sách mã tra cứu lịch hẹn của khách vãng lai, lưu trên trình duyệt của chính khách
 * (localStorage) để mở lại trang "Lịch đã đặt" trên cùng thiết bị. Chỉ là tiện ích: mất dữ liệu
 * trình duyệt thì khách vẫn mở được bằng link đã lưu, hoặc xác minh SĐT sau khi đăng ký để gộp lịch.
 */

export interface SavedGuestAppointment {
  token: string;
  room_code?: string;
  room_title?: string;
  date: string;
  time_slot: string;
  saved_at: string;
}

const STORAGE_KEY = 'elite_guest_appointments_v1';
const MAX_SAVED = 20;

export function readSavedGuestAppointments(): SavedGuestAppointment[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.token === 'string' && typeof item.date === 'string')
      : [];
  } catch {
    return [];
  }
}

export function saveGuestAppointment(item: Omit<SavedGuestAppointment, 'saved_at'>) {
  try {
    const rest = readSavedGuestAppointments().filter((saved) => saved.token !== item.token);
    const next = [{ ...item, saved_at: new Date().toISOString() }, ...rest].slice(0, MAX_SAVED);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Trình duyệt chặn lưu trữ (ẩn danh / hết dung lượng): khách vẫn còn link tra cứu
  }
}

export function forgetGuestAppointment(token: string) {
  try {
    const next = readSavedGuestAppointments().filter((saved) => saved.token !== token);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // bỏ qua
  }
}
