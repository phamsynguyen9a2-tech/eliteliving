/**
 * Quy tắc vòng đời phòng (FSM): Còn trống → Đã đặt lịch → Giữ chỗ → Đang thuê.
 *
 * Trạng thái phòng phải khớp với dữ liệu thật của phòng: phòng "Đang thuê" khi có hợp đồng ACTIVE,
 * "Giữ chỗ" khi có phiếu đặt cọc đang chờ, "Đã đặt lịch" khi có lịch hẹn đang mở. Đổi tay chỉ được
 * phép khi không đi ngược các dữ liệu đó; các bước còn lại đi qua nghiệp vụ tương ứng
 * (đặt cọc, check-in, thanh lý, hủy giữ chỗ).
 */
import type { RoomStatus } from './types';

export const ROOM_STATUSES: RoomStatus[] = ['AVAILABLE', 'BOOKED_VIEWING', 'RESERVED', 'RENTED'];

export function isRoomStatus(value: unknown): value is RoomStatus {
  return typeof value === 'string' && (ROOM_STATUSES as string[]).includes(value);
}

export interface RoomFacts {
  /** Phòng có hợp đồng ACTIVE (ngoài hợp đồng đang được thanh lý, nếu có) */
  hasActiveContract: boolean;
  /** Phòng có lịch hẹn PENDING / CONFIRMED */
  hasOpenAppointment: boolean;
  /** Phiếu đặt cọc mới nhất của phòng đang chờ chủ trọ xác nhận */
  hasPendingDeposit: boolean;
}

export type RoomStatusCheck =
  | { ok: true }
  | { ok: false; status: 400 | 409; message: string };

/** Admin / chủ trọ đổi tay trạng thái phòng: chỉ cho các chuyển đổi không làm sai dữ liệu thuê. */
export function checkManualRoomStatusChange(
  current: RoomStatus,
  next: unknown,
  facts: RoomFacts
): RoomStatusCheck {
  if (!isRoomStatus(next)) {
    return { ok: false, status: 400, message: 'Trạng thái phòng không hợp lệ.' };
  }
  if (next === current) return { ok: true };

  if (facts.hasActiveContract) {
    return {
      ok: false,
      status: 409,
      message: 'Phòng đang có hợp đồng hiệu lực. Vui lòng thanh lý hợp đồng thay vì đổi trạng thái thủ công.',
    };
  }
  if (current === 'RESERVED' && facts.hasPendingDeposit) {
    return {
      ok: false,
      status: 409,
      message: 'Phòng đang có phiếu đặt cọc chờ xác nhận. Vui lòng dùng chức năng Check-in hoặc Hủy giữ chỗ.',
    };
  }
  if (next === 'RENTED') {
    return { ok: false, status: 409, message: 'Chỉ chuyển sang "Đang thuê" bằng cách lập hợp đồng hoặc check-in.' };
  }
  if (next === 'RESERVED') {
    return { ok: false, status: 409, message: 'Chỉ chuyển sang "Giữ chỗ" khi khách thuê đặt cọc.' };
  }
  if (next === 'BOOKED_VIEWING' && !facts.hasOpenAppointment) {
    return { ok: false, status: 409, message: 'Phòng chưa có lịch hẹn xem phòng nào đang mở.' };
  }
  return { ok: true };
}

/**
 * Trạng thái phòng sau khi một hợp đồng kết thúc. null = giữ nguyên (còn hợp đồng ACTIVE khác,
 * hoặc phòng không ở trạng thái do hợp đồng này giữ).
 */
export function roomStatusAfterContractEnds(
  current: RoomStatus,
  facts: Pick<RoomFacts, 'hasActiveContract' | 'hasOpenAppointment'>
): RoomStatus | null {
  if (facts.hasActiveContract) return null;
  if (current !== 'RENTED' && current !== 'RESERVED') return null;
  return facts.hasOpenAppointment ? 'BOOKED_VIEWING' : 'AVAILABLE';
}

/** Chỉ số công tơ cuối kỳ khi trả phòng: bắt buộc nhập, là số không âm. */
export function parseMeterReading(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const reading = Number(value);
  return Number.isFinite(reading) && reading >= 0 ? reading : null;
}
