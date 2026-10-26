/**
 * Trạng thái khóa / vai trò tài khoản, dùng để thu hồi phiên đăng nhập đang mở khi admin khóa
 * tài khoản hoặc đổi vai trò (ví dụ hạ chủ trọ xuống khách thuê).
 *
 * Phiên đăng nhập là JWT nên không thể "xóa" ở máy chủ. Thay vào đó, mỗi lần máy chủ đọc phiên
 * (jwt callback), hệ thống kiểm tra tài khoản có đang bị khóa không và vai trò trong phiên có còn
 * đúng với vai trò trong CSDL không:
 * - Khi admin khóa / mở khóa / đổi vai trò: cập nhật bộ nhớ đệm ngay → có hiệu lực ở request kế tiếp.
 * - Ngoài ra đọc lại từ CSDL tối đa mỗi 30 giây cho mỗi tài khoản (stale-while-revalidate:
 *   trả giá trị đang có ngay, làm mới ở nền), nên không làm chậm các API.
 *
 * Khóa chủ trọ được lưu ở cột users.is_blocked của dòng users cùng id với chủ trọ.
 */
import prisma from './prisma';

export const ACCOUNT_STATUS_REFRESH_MS = 30_000;

/** role = null: chưa biết vai trò hiện tại (chưa đọc được CSDL) → chưa dùng để thu hồi phiên. */
export type AccountStatus = { blocked: boolean; role: string | null };

type Entry = AccountStatus & { checkedAt: number; refreshing?: Promise<AccountStatus> };

const globalForStatus = globalThis as typeof globalThis & {
  __eliteAccountStatus?: Map<string, Entry>;
};
const cache = globalForStatus.__eliteAccountStatus ?? new Map<string, Entry>();
globalForStatus.__eliteAccountStatus = cache;

/**
 * Phiên có phải bị thu hồi không: tài khoản bị khóa, hoặc vai trò ghi trong phiên không còn là
 * vai trò hiện tại của tài khoản (phiên cũ của chủ trọ đã bị hạ quyền không còn vào cổng chủ trọ).
 */
export function isSessionRevokedFor(status: AccountStatus, sessionRole: string | null | undefined): boolean {
  if (status.blocked) return true;
  return Boolean(status.role && sessionRole && status.role !== sessionRole);
}

async function loadStatus(userId: string): Promise<AccountStatus> {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { isBlocked: true, role: true } });
  if (row) return { blocked: row.isBlocked, role: row.role ?? null };
  // Tài khoản chủ trọ có thể chỉ nằm ở bảng landlords; không còn ở bảng nào = đã bị xóa → thu hồi phiên
  const landlord = await prisma.landlord.findUnique({ where: { id: userId }, select: { role: true } });
  return landlord ? { blocked: false, role: landlord.role ?? null } : { blocked: true, role: null };
}

function refresh(userId: string, entry?: Entry): Promise<AccountStatus> {
  if (entry?.refreshing) return entry.refreshing;
  const startedAt = Date.now();
  const promise = loadStatus(userId)
    .then((status) => {
      // Admin vừa khóa / mở khóa / đổi vai trò trong lúc đang đọc: giữ giá trị mới hơn đó
      const current = cache.get(userId);
      if (current && current.checkedAt >= startedAt) return { blocked: current.blocked, role: current.role };
      cache.set(userId, { ...status, checkedAt: Date.now() });
      return status;
    })
    .catch(() => {
      // CSDL tạm lỗi: giữ trạng thái đang biết (mặc định không khóa) và thử lại ở lần sau
      const fallback = { blocked: entry?.blocked ?? false, role: entry?.role ?? null };
      cache.set(userId, { ...fallback, checkedAt: entry?.checkedAt ?? 0 });
      return fallback;
    });
  cache.set(userId, {
    blocked: entry?.blocked ?? false,
    role: entry?.role ?? null,
    checkedAt: entry?.checkedAt ?? 0,
    refreshing: promise,
  });
  return promise;
}

async function getStatus(userId: string): Promise<AccountStatus> {
  const entry = cache.get(userId);
  // Chưa từng đọc được trạng thái: chờ đọc CSDL
  if (!entry || entry.checkedAt === 0) return entry?.refreshing ?? refresh(userId, entry);
  // Đã có trạng thái nhưng cũ: dùng ngay, làm mới ở nền
  if (Date.now() - entry.checkedAt > ACCOUNT_STATUS_REFRESH_MS) void refresh(userId, entry);
  return { blocked: entry.blocked, role: entry.role };
}

/** Tài khoản có đang bị khóa không. Lần đầu (chưa có trong bộ nhớ đệm) sẽ đọc CSDL. */
export async function isAccountBlocked(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  return (await getStatus(userId)).blocked;
}

/** Phiên mang vai trò `sessionRole` của tài khoản này có phải bị thu hồi không (khóa hoặc đổi vai trò). */
export async function isSessionRevoked(
  userId: string | null | undefined,
  sessionRole: string | null | undefined
): Promise<boolean> {
  if (!userId) return false;
  return isSessionRevokedFor(await getStatus(userId), sessionRole);
}

/**
 * Ghi trạng thái đã biết chắc (lúc đăng nhập, hoặc khi admin vừa khóa / mở khóa).
 * Không truyền `role` thì giữ vai trò đang biết.
 */
export function setAccountBlockedStatus(userId: string, blocked: boolean, role?: string) {
  const current = cache.get(userId);
  cache.set(userId, { blocked, role: role ?? current?.role ?? null, checkedAt: Date.now() });
}

/** Admin vừa đổi vai trò: phiên đang mở với vai trò cũ mất hiệu lực ở request kế tiếp. */
export function setAccountRoleStatus(userId: string, role: string) {
  const current = cache.get(userId);
  cache.set(userId, { blocked: current?.blocked ?? false, role, checkedAt: Date.now() });
}
