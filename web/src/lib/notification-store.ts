/**
 * Elite Living — Hộp thư thông báo (server-only)
 *
 * Thông báo được lưu trong bảng Prisma `notifications`. Trước đây là một mảng trong bộ nhớ kèm file
 * `.data/notifications.json`: mất khi triển khai lên môi trường chỉ đọc (serverless), không dùng chung
 * được giữa nhiều tiến trình, và nằm ngoài cơ sở dữ liệu nên không sao lưu / truy vấn được.
 * Dữ liệu cũ trong file được chuyển sang bằng scripts/import-notifications-json.ts.
 */
import prisma from '@/lib/prisma';
import type { Notification as NotificationRow, Prisma } from '@prisma/client';
import type { NotificationType, StoredNotification } from '@/lib/email-service';
import { publishRealtime } from '@/lib/realtime-bus';
import { sendPushToUser } from '@/lib/push';

export interface NotificationViewer {
  id: string;
  email?: string | null;
  /** Chỉ truyền SĐT ĐÃ XÁC MINH — SĐT là bằng chứng sở hữu thông báo. */
  verifiedPhone?: string | null;
}

function toCreateInput(notif: StoredNotification): Prisma.NotificationCreateInput {
  return {
    id: notif.id,
    recipientEmail: notif.recipientEmail,
    recipientName: notif.recipientName,
    recipientUserId: notif.recipientUserId || null,
    recipientPhone: notif.recipientPhone || null,
    type: notif.type,
    subject: notif.subject,
    summary: notif.summary,
    contentHtml: notif.contentHtml,
    link: notif.link || null,
    metadata: notif.metadata ? (notif.metadata as Prisma.InputJsonValue) : undefined,
    isRead: Boolean(notif.isRead),
    sentAt: notif.sentAt ? new Date(notif.sentAt) : new Date(),
  };
}

function fromRow(row: NotificationRow): StoredNotification {
  return {
    id: row.id,
    recipientEmail: row.recipientEmail,
    recipientName: row.recipientName,
    subject: row.subject,
    type: row.type as NotificationType,
    contentHtml: row.contentHtml,
    summary: row.summary,
    sentAt: row.sentAt.toISOString(),
    isRead: row.isRead,
    ...(row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? { metadata: row.metadata as Record<string, any> }
      : {}),
    ...(row.recipientUserId ? { recipientUserId: row.recipientUserId } : {}),
    ...(row.recipientPhone ? { recipientPhone: row.recipientPhone } : {}),
    ...(row.link ? { link: row.link } : {}),
  };
}

/** Điều kiện "thông báo thuộc về người xem": khớp tài khoản, email (không phân biệt hoa thường) hoặc SĐT đã xác minh. */
function viewerWhere(viewer: NotificationViewer): Prisma.NotificationWhereInput {
  const or: Prisma.NotificationWhereInput[] = [{ recipientUserId: viewer.id }];
  if (viewer.email) or.push({ recipientEmail: { equals: viewer.email, mode: 'insensitive' } });
  if (viewer.verifiedPhone) or.push({ recipientPhone: viewer.verifiedPhone });
  return { OR: or };
}

/** Lưu thông báo mới. Không ném lỗi để không làm hỏng nghiệp vụ chính (lỗi chỉ ghi log). */
export async function pushNotification(notif: StoredNotification): Promise<StoredNotification> {
  try {
    await prisma.notification.create({ data: toCreateInput(notif) });
    // Báo trình duyệt của người nhận tải lại hộp thư (đồng bộ thời gian thực) và đẩy FCM tới app
    publishRealtime({ type: 'notification', userId: notif.recipientUserId ?? null });
    void sendPushToUser(notif.recipientUserId, {
      title: notif.subject.replace(/^\[ELITE LIVING\]\s*/, ''),
      body: notif.summary,
      data: { type: notif.type, link: notif.link || '', notificationId: notif.id },
    });
  } catch (err) {
    console.warn('[notification-store] Không lưu được thông báo:', err);
  }
  return notif;
}

export async function listNotifications(params: {
  /** null = quản trị viên xem tất cả (hoặc lọc theo email) */
  viewer: NotificationViewer | null;
  email?: string | null;
  type?: string | null;
  unreadOnly?: boolean;
  limit?: number | null;
}): Promise<{ items: StoredNotification[]; total: number; unreadCount: number }> {
  const where: Prisma.NotificationWhereInput = params.viewer
    ? viewerWhere(params.viewer)
    : params.email != null
    ? { recipientEmail: { equals: params.email, mode: 'insensitive' } }
    : {};
  if (params.type) where.type = params.type;
  const unreadWhere: Prisma.NotificationWhereInput = { AND: [where, { isRead: false }] };

  const [total, unreadCount, rows] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: unreadWhere }),
    prisma.notification.findMany({
      where: params.unreadOnly ? unreadWhere : where,
      orderBy: { sentAt: 'desc' },
      ...(params.limit ? { take: params.limit } : {}),
    }),
  ]);
  return { items: rows.map(fromRow), total, unreadCount };
}

export async function findNotification(id: string): Promise<StoredNotification | null> {
  const row = await prisma.notification.findUnique({ where: { id } });
  return row ? fromRow(row) : null;
}

export async function setNotificationRead(id: string, isRead: boolean): Promise<StoredNotification | null> {
  try {
    return fromRow(await prisma.notification.update({ where: { id }, data: { isRead } }));
  } catch {
    return null;
  }
}

/** Đánh dấu mọi thông báo chưa đọc của người xem là đã đọc; trả về số thông báo đã đổi. */
export async function markAllNotificationsRead(viewer: NotificationViewer): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { AND: [viewerWhere(viewer), { isRead: false }] },
    data: { isRead: true },
  });
  return result.count;
}

/** Xóa thông báo theo id. Trả về true nếu có xóa. */
export async function removeNotification(id: string): Promise<boolean> {
  const result = await prisma.notification.deleteMany({ where: { id } });
  return result.count > 0;
}

/** Đã có thông báo nhắc hạn cho khóa này chưa (để không nhắc trùng). */
export async function hasReminderNotification(reminderKey: string): Promise<boolean> {
  const row = await prisma.notification.findFirst({
    where: { type: 'CONTRACT_EXPIRY', metadata: { path: ['reminderKey'], equals: reminderKey } },
    select: { id: true },
  });
  return Boolean(row);
}

/** Sinh id thông báo không trùng (tránh `notif_${Date.now()}_renew` trùng nhau). */
export function createNotificationId(suffix = '') {
  const random = Math.random().toString(36).substring(2, 8);
  return `notif_${Date.now()}_${random}${suffix ? `_${suffix}` : ''}`;
}

/**
 * Một thông báo thuộc về người xem khi khớp email, userId, hoặc SĐT đã xác minh
 * (cùng điều kiện với viewerWhere, dùng khi đã có sẵn bản ghi).
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

/**
 * Gửi email thật qua Resend API nếu biến môi trường RESEND_API_KEY được cấu hình;
 * nếu chưa cấu hình dịch vụ mail ngoài, thông báo vẫn nằm trong Hộp thư nội bộ (In-App Inbox)
 * và trả về trạng thái trung thực để giao diện hiển thị rõ.
 */
export async function deliverNotificationEmailIfConfigured(
  notif: StoredNotification
): Promise<{ delivered: boolean; channel: 'RESEND_API' | 'IN_APP_INBOX' }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.EMAIL_FROM?.trim() || 'Elite Living <onboarding@resend.dev>';
  if (!apiKey || !notif.recipientEmail || !notif.recipientEmail.includes('@')) {
    return { delivered: false, channel: 'IN_APP_INBOX' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [notif.recipientEmail],
        subject: notif.subject,
        html: notif.contentHtml,
      }),
    });
    if (res.ok) {
      return { delivered: true, channel: 'RESEND_API' };
    }
  } catch (err) {
    console.warn('[notification-store] Không thể gửi qua Resend API:', err);
  }
  return { delivered: false, channel: 'IN_APP_INBOX' };
}
