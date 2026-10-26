/**
 * Giới hạn đặt lịch xem phòng của khách vãng lai (chưa đăng nhập).
 *
 * Tài khoản đã đăng nhập đã có bộ lọc spam theo tài khoản (lib/spam-filter.ts); khách vãng lai
 * thì trước đây không bị giới hạn gì, một người có thể đặt kín lịch của mọi phòng. Nay:
 *   - mỗi địa chỉ IP tối đa GUEST_IP_LIMIT lượt đặt trong GUEST_IP_WINDOW_MS;
 *   - mỗi số điện thoại tối đa GUEST_MAX_UPCOMING_PER_PHONE lịch hẹn đang chờ / đã xác nhận,
 *     và không đặt 2 lịch sắp tới cho cùng một phòng.
 * Muốn đặt nhiều hơn thì đăng nhập (đã xác minh số điện thoại).
 */

export const GUEST_IP_LIMIT = 5;
export const GUEST_IP_WINDOW_MS = 60 * 60_000;
export const GUEST_MAX_UPCOMING_PER_PHONE = 2;

/** Đếm số lượt theo khóa trong cửa sổ thời gian trượt (lưu trong bộ nhớ của tiến trình). */
export function createSlidingWindowLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return {
    /** Ghi một lượt; trả false nếu khóa đã dùng hết hạn mức (lượt bị từ chối không được ghi). */
    hit(key: string, now = Date.now()): boolean {
      const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      // Dọn khóa cũ để Map không phình mãi
      if (hits.size > 5000) {
        for (const [k, list] of hits) {
          if (list.every((t) => now - t >= windowMs)) hits.delete(k);
        }
      }
      return true;
    },
    /** Số giây cần chờ tới khi khóa có lại hạn mức. */
    retryAfterSeconds(key: string, now = Date.now()): number {
      const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
      if (recent.length < limit) return 0;
      return Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
    },
  };
}

const globalForLimiter = globalThis as typeof globalThis & {
  __eliteGuestBookingLimiter?: ReturnType<typeof createSlidingWindowLimiter>;
};
export const guestBookingLimiter =
  globalForLimiter.__eliteGuestBookingLimiter ??
  (globalForLimiter.__eliteGuestBookingLimiter = createSlidingWindowLimiter(GUEST_IP_LIMIT, GUEST_IP_WINDOW_MS));

/** IP của người gửi (qua proxy thì lấy địa chỉ đầu tiên trong x-forwarded-for). */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * Mã người dùng của khách vãng lai: cố định theo số điện thoại, để mỗi số chỉ tạo một bản ghi
 * người dùng thay vì mỗi lần đặt lịch lại sinh thêm một tài khoản rác.
 */
export function guestUserIdForPhone(phone: string): string {
  return `${GUEST_USER_ID_PREFIX}${phone.replace(/\D/g, '')}`;
}

export const GUEST_USER_ID_PREFIX = 'user_guest_';

/**
 * Điều kiện Prisma tìm tài khoản KHÁC đang giữ SĐT này. Bản ghi ngầm của khách vãng lai không tính:
 * SĐT đó chỉ là số khách tự gõ khi đặt lịch (chưa xác minh), không được chặn chủ thật của số
 * xác minh / lưu SĐT cho tài khoản của mình — và không ai chặn được số của người khác bằng cách
 * đặt lịch vãng lai với số đó.
 */
export function otherPhoneOwnerWhere(phone: string, userId: string) {
  return {
    phone,
    NOT: [{ id: userId }, { id: { startsWith: GUEST_USER_ID_PREFIX } }],
  };
}

/** Ngày hôm nay dạng YYYY-MM-DD theo giờ máy chủ (cùng cách so ngày với ngày đặt lịch). */
export function localDateString(date = new Date()): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}
