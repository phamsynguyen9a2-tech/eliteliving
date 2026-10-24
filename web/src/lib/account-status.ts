/**
 * Trạng thái khóa tài khoản, dùng để thu hồi phiên đăng nhập đang mở khi admin khóa tài khoản.
 *
 * Phiên đăng nhập là JWT nên không thể "xóa" ở máy chủ. Thay vào đó, mỗi lần máy chủ đọc phiên
 * (jwt callback), hệ thống kiểm tra tài khoản có đang bị khóa không:
 * - Khi admin khóa / mở khóa: cập nhật bộ nhớ đệm ngay → có hiệu lực ở request kế tiếp.
 * - Ngoài ra đọc lại từ CSDL tối đa mỗi 30 giây cho mỗi tài khoản (stale-while-revalidate:
 *   trả giá trị đang có ngay, làm mới ở nền), nên không làm chậm các API.
 *
 * Khóa chủ trọ được lưu ở cột users.is_blocked của dòng users cùng id với chủ trọ.
 */
import prisma from './prisma';

export const ACCOUNT_STATUS_REFRESH_MS = 30_000;

type Entry = { blocked: boolean; checkedAt: number; refreshing?: Promise<boolean> };

const globalForStatus = globalThis as typeof globalThis & {
  __eliteAccountStatus?: Map<string, Entry>;
};
const cache = globalForStatus.__eliteAccountStatus ?? new Map<string, Entry>();
globalForStatus.__eliteAccountStatus = cache;

async function loadBlocked(userId: string): Promise<boolean> {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { isBlocked: true } });
  return Boolean(row?.isBlocked);
}

function refresh(userId: string, entry?: Entry): Promise<boolean> {
  if (entry?.refreshing) return entry.refreshing;
  const startedAt = Date.now();
  const promise = loadBlocked(userId)
    .then((blocked) => {
      // Admin vừa khóa / mở khóa trong lúc đang đọc: giữ giá trị mới hơn đó
      const current = cache.get(userId);
      if (current && current.checkedAt >= startedAt) return current.blocked;
      cache.set(userId, { blocked, checkedAt: Date.now() });
      return blocked;
    })
    .catch(() => {
      // CSDL tạm lỗi: giữ trạng thái đang biết (mặc định không khóa) và thử lại ở lần sau
      const fallback = entry?.blocked ?? false;
      cache.set(userId, { blocked: fallback, checkedAt: entry?.checkedAt ?? 0 });
      return fallback;
    });
  cache.set(userId, { blocked: entry?.blocked ?? false, checkedAt: entry?.checkedAt ?? 0, refreshing: promise });
  return promise;
}

/** Tài khoản có đang bị khóa không. Lần đầu (chưa có trong bộ nhớ đệm) sẽ đọc CSDL. */
export async function isAccountBlocked(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const entry = cache.get(userId);
  // Chưa từng đọc được trạng thái: chờ đọc CSDL
  if (!entry || entry.checkedAt === 0) return entry?.refreshing ?? refresh(userId, entry);
  // Đã có trạng thái nhưng cũ: dùng ngay, làm mới ở nền
  if (Date.now() - entry.checkedAt > ACCOUNT_STATUS_REFRESH_MS) void refresh(userId, entry);
  return entry.blocked;
}

/** Ghi trạng thái đã biết chắc (lúc đăng nhập, hoặc khi admin vừa khóa / mở khóa). */
export function setAccountBlockedStatus(userId: string, blocked: boolean) {
  cache.set(userId, { blocked, checkedAt: Date.now() });
}
