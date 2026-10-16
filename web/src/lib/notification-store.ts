/**
 * Elite Living — Notification Store (server-only)
 *
 * Vì sao cần file này:
 * - `inMemoryNotifications` trước đây là một mảng module-level. Trong Next.js mỗi
 *   route handler có thể được bundle/khởi tạo lại riêng (đặc biệt ở dev + HMR),
 *   nên thông báo do /api/rooms/checkin tạo ra có thể KHÔNG xuất hiện ở
 *   /api/notifications. Ta neo mảng vào `globalThis` để mọi route dùng chung.
 * - Lưu bền vào `.data/notifications.json` để khởi động lại server không mất hộp thư.
 *   Nếu môi trường chỉ đọc (serverless), việc ghi file bị bỏ qua an toàn.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { StoredNotification } from '@/lib/email-service';

const MAX_NOTIFICATIONS = 1000;
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'notifications.json');

interface NotificationStoreState {
  list: StoredNotification[];
  loaded: boolean;
  persistDisabled: boolean;
  persistTimer: ReturnType<typeof setTimeout> | null;
}

const globalForNotifications = globalThis as typeof globalThis & {
  __eliteNotificationStore?: NotificationStoreState;
};

if (!globalForNotifications.__eliteNotificationStore) {
  globalForNotifications.__eliteNotificationStore = {
    list: [],
    loaded: false,
    persistDisabled: false,
    persistTimer: null,
  };
}

const store = globalForNotifications.__eliteNotificationStore;

function loadFromDisk() {
  if (store.loaded) return;
  store.loaded = true;
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const parsed: unknown = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!Array.isArray(parsed)) return;
    const knownIds = new Set(store.list.map((n) => n.id));
    for (const item of parsed) {
      if (item && typeof item.id === 'string' && typeof item.sentAt === 'string' && !knownIds.has(item.id)) {
        store.list.push(item as StoredNotification);
        knownIds.add(item.id);
      }
    }
    store.list.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  } catch (err) {
    console.warn('[notification-store] Không đọc được file thông báo:', err);
  }
}

loadFromDisk();

/** Mảng dùng chung — KHÔNG gán lại tham chiếu, chỉ mutate (unshift/splice). */
export const notificationList: StoredNotification[] = store.list;

/** Ghi xuống đĩa (debounce 250ms). An toàn khi file system chỉ đọc. */
export function persistNotifications() {
  if (store.persistDisabled) return;
  if (store.persistTimer) clearTimeout(store.persistTimer);
  store.persistTimer = setTimeout(() => {
    store.persistTimer = null;
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = `${DATA_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(store.list), 'utf8');
      fs.renameSync(tmp, DATA_FILE);
    } catch (err) {
      store.persistDisabled = true;
      console.warn('[notification-store] Tắt lưu file (môi trường chỉ đọc?):', err);
    }
  }, 250);
}

/** Thêm thông báo mới lên đầu hộp thư, giới hạn kích thước và lưu bền. */
export function pushNotification(notif: StoredNotification): StoredNotification {
  store.list.unshift(notif);
  if (store.list.length > MAX_NOTIFICATIONS) {
    store.list.splice(MAX_NOTIFICATIONS);
  }
  persistNotifications();
  return notif;
}

/** Xóa thông báo theo id. Trả về true nếu có xóa. */
export function removeNotification(id: string): boolean {
  const index = store.list.findIndex((n) => n.id === id);
  if (index === -1) return false;
  store.list.splice(index, 1);
  persistNotifications();
  return true;
}

/** Sinh id thông báo không trùng (tránh `notif_${Date.now()}_renew` trùng nhau). */
export function createNotificationId(suffix = '') {
  const random = Math.random().toString(36).substring(2, 8);
  return `notif_${Date.now()}_${random}${suffix ? `_${suffix}` : ''}`;
}

export interface NotificationViewer {
  id: string;
  email?: string | null;
  /** Chỉ truyền SĐT ĐÃ XÁC MINH — SĐT là bằng chứng sở hữu thông báo. */
  verifiedPhone?: string | null;
}

/**
 * Một thông báo thuộc về người xem khi khớp email, userId, hoặc SĐT đã xác minh.
 * Điều này sửa lỗi chủ trọ nhập email khác email tài khoản khiến khách không thấy thông báo.
 */
export function notificationBelongsTo(notif: StoredNotification, viewer: NotificationViewer) {
  const email = (viewer.email || '').toLowerCase();
  if (email && notif.recipientEmail?.toLowerCase() === email) return true;
  if (notif.recipientUserId && notif.recipientUserId === viewer.id) return true;
  if (viewer.verifiedPhone && notif.recipientPhone && notif.recipientPhone === viewer.verifiedPhone) {
    return true;
  }
  return false;
}
