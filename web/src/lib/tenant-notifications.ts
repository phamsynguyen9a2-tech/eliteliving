/**
 * Elite Living — Tenant notification helpers (server-only)
 *
 * Giải quyết lỗi "khách thuê không bao giờ thấy thông báo" do nhiều route gửi tới
 * email giữ chỗ `tenant@eliteliving.vn`. Người nhận được xác định từ dữ liệu thật:
 * userId của lịch hẹn, hoặc SĐT trên hợp đồng → tài khoản TENANT tương ứng.
 */
import prisma from '@/lib/prisma';
import {
  buildSimpleNotificationHtml,
  generateContractExpiryEmail,
  inMemoryNotifications,
  type NotificationType,
  type SimpleNotificationHtmlInput,
  type StoredNotification,
} from '@/lib/email-service';
import { createNotificationId, persistNotifications, pushNotification } from '@/lib/notification-store';

export const PLACEHOLDER_TENANT_EMAIL = 'tenant@eliteliving.vn';

export interface TenantRecipient {
  email: string;
  name: string;
  userId?: string;
  phone?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function usableEmail(email?: string | null) {
  if (!email) return null;
  const trimmed = email.trim();
  if (!EMAIL_PATTERN.test(trimmed) || trimmed.toLowerCase() === PLACEHOLDER_TENANT_EMAIL) return null;
  return trimmed;
}

/**
 * Xác định người nhận thông báo. Ưu tiên: userId → tài khoản TENANT theo SĐT → email
 * truyền vào → email giữ chỗ. Không bao giờ ném lỗi (DB offline vẫn trả fallback).
 */
export async function resolveTenantRecipient(input: {
  userId?: string | null;
  phone?: string | null;
  email?: string | null;
  name?: string | null;
}): Promise<TenantRecipient> {
  let account: { id: string; email: string; name: string; phone: string } | null = null;
  try {
    if (input.userId && !input.userId.startsWith('user_guest_')) {
      account = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, email: true, name: true, phone: true },
      });
    }
    if (!account && input.phone) {
      account = await prisma.user.findFirst({
        where: { phone: input.phone, role: 'TENANT' },
        select: { id: true, email: true, name: true, phone: true },
      });
    }
  } catch {
    // DB offline → dùng thông tin truyền vào.
  }

  return {
    email: usableEmail(account?.email) || usableEmail(input.email) || PLACEHOLDER_TENANT_EMAIL,
    name: input.name?.trim() || account?.name || 'Khách thuê',
    userId: account?.id,
    phone: input.phone || account?.phone || undefined,
  };
}

export interface TenantNotificationInput {
  recipient: TenantRecipient;
  type: NotificationType;
  subject: string;
  summary: string;
  link?: string;
  metadata?: Record<string, unknown>;
  /** Nội dung email; nếu bỏ trống, dùng `html` có sẵn. */
  email?: Omit<SimpleNotificationHtmlInput, 'recipientName'>;
  html?: string;
}

/** Tạo + lưu thông báo cho khách thuê. Không ném lỗi để không làm hỏng nghiệp vụ chính. */
export function notifyTenant(input: TenantNotificationInput): StoredNotification {
  const contentHtml = input.html
    ?? buildSimpleNotificationHtml({
      badge: input.email?.badge || 'Elite Living • Thông báo',
      title: input.email?.title || input.subject,
      paragraphs: input.email?.paragraphs || [input.summary],
      details: input.email?.details,
      ctaLabel: input.email?.ctaLabel,
      ctaHref: input.email?.ctaHref ?? input.link,
      recipientName: input.recipient.name,
    });

  return pushNotification({
    id: createNotificationId(input.type.toLowerCase()),
    recipientEmail: input.recipient.email,
    recipientName: input.recipient.name,
    recipientUserId: input.recipient.userId,
    recipientPhone: input.recipient.phone,
    subject: input.subject.startsWith('[ELITE LIVING]') ? input.subject : `[ELITE LIVING] ${input.subject}`,
    type: input.type,
    contentHtml,
    summary: input.summary,
    sentAt: new Date().toISOString(),
    isRead: false,
    metadata: input.metadata,
    link: input.link,
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const CONTRACT_EXPIRY_REMINDER_DAYS = 30;

function daysUntil(dateStr: string, now = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!match) return null;
  const end = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((end - today) / DAY_MS);
}

function formatDateVi(dateStr: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : dateStr;
}

/**
 * Tự động phát thông báo "Nhắc hạn hợp đồng" (generateContractExpiryEmail) cho các hợp
 * đồng ACTIVE sắp hết hạn trong 30 ngày. Mỗi hợp đồng + ngày kết thúc chỉ nhắc 1 lần.
 */
export async function ensureContractExpiryReminders(params: {
  userId: string;
  email: string;
  contractIds: Iterable<string>;
}) {
  const ids = [...params.contractIds];
  if (ids.length === 0) return 0;

  let contracts: Array<{
    id: string;
    tenantName: string;
    tenantPhone: string;
    endDate: string;
    room: { roomCode: string } | null;
  }> = [];
  try {
    contracts = await prisma.contract.findMany({
      where: { id: { in: ids }, status: 'ACTIVE' },
      select: {
        id: true,
        tenantName: true,
        tenantPhone: true,
        endDate: true,
        room: { select: { roomCode: true } },
      },
    });
  } catch {
    return 0;
  }

  let created = 0;
  for (const contract of contracts) {
    const remaining = daysUntil(contract.endDate);
    if (remaining === null || remaining < 0 || remaining > CONTRACT_EXPIRY_REMINDER_DAYS) continue;

    const reminderKey = `${contract.id}:${contract.endDate}`;
    const exists = inMemoryNotifications.some(
      (n) => n.type === 'CONTRACT_EXPIRY' && n.metadata?.reminderKey === reminderKey
    );
    if (exists) continue;

    const notif = generateContractExpiryEmail({
      tenantName: contract.tenantName,
      tenantEmail: params.email,
      roomCode: contract.room?.roomCode || contract.id.slice(-6).toUpperCase(),
      endDate: formatDateVi(contract.endDate),
      daysRemaining: remaining,
      contractId: contract.id,
    });
    notif.recipientUserId = params.userId;
    notif.recipientPhone = contract.tenantPhone || undefined;
    notif.metadata = { ...(notif.metadata || {}), reminderKey };
    created += 1;
  }

  if (created > 0) persistNotifications();
  return created;
}
