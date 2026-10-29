import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Appointment } from './types';

/**
 * Mã tra cứu lịch hẹn cho khách vãng lai (chưa đăng ký tài khoản).
 *
 * Khách không có trang hồ sơ, và tra lịch theo SĐT thì ai biết số cũng xem được lịch của người khác.
 * Thay vào đó, khi đặt lịch thành công, máy chủ cấp mã "<mã lịch hẹn>.<chữ ký HMAC>" ký bằng
 * NEXTAUTH_SECRET: chỉ người nhận mã mới mở được trang /lich-hen/<mã>, và không ai sửa mã lịch hẹn
 * trong mã tra cứu để xem lịch khác được. Không cần thêm cột vào cơ sở dữ liệu.
 */

const LOOKUP_PURPOSE = 'appointment-lookup:v1';
const SIGNATURE_LENGTH = 32;

function lookupSecret(): string | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  // Cùng khóa dự phòng với lib/auth.ts, chỉ dùng khi phát triển
  return process.env.NODE_ENV !== 'production' ? 'nhatrotop_local_development_only_secret' : null;
}

function sign(appointmentId: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${LOOKUP_PURPOSE}:${appointmentId}`)
    .digest('base64url')
    .slice(0, SIGNATURE_LENGTH);
}

/** Tạo mã tra cứu cho một lịch hẹn; trả null khi máy chủ chưa cấu hình khóa bí mật. */
export function createAppointmentLookupToken(appointmentId: string, secret = lookupSecret()): string | null {
  if (!secret || !appointmentId) return null;
  return `${appointmentId}.${sign(appointmentId, secret)}`;
}

/** Trả mã lịch hẹn nếu mã tra cứu hợp lệ, ngược lại null (mã giả, bị sửa hoặc sai định dạng). */
export function verifyAppointmentLookupToken(token: unknown, secret = lookupSecret()): string | null {
  if (!secret || typeof token !== 'string' || token.length > 200) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const appointmentId = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(appointmentId, secret));
  return given.length === expected.length && timingSafeEqual(given, expected) ? appointmentId : null;
}

/** Che bớt SĐT trên trang tra cứu (link có thể bị chia sẻ): 0901234567 → 090****567. */
export function maskPhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 7) return digits ? '***' : '';
  return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
}

/** Dữ liệu lịch hẹn trả cho người cầm mã tra cứu: bỏ mã người dùng và che SĐT. */
export function toLookupView(appointment: Appointment) {
  return {
    id: appointment.id,
    room_id: appointment.room_id,
    room_code: appointment.room_code,
    room_title: appointment.room_title,
    building_name: appointment.building_name,
    address: appointment.address,
    room_image: appointment.room_image,
    date: appointment.date,
    time_slot: appointment.time_slot,
    status: appointment.status,
    notes: appointment.notes,
    user_name: appointment.user_name,
    user_phone_masked: maskPhone(appointment.user_phone),
    created_at: appointment.created_at,
    can_cancel: appointment.status === 'PENDING' || appointment.status === 'CONFIRMED',
  };
}

export type AppointmentLookupView = ReturnType<typeof toLookupView>;
