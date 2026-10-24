/**
 * Chuyển thông báo cũ từ file .data/notifications.json sang bảng `notifications` (chạy một lần).
 *
 *   npx tsx scripts/import-notifications-json.ts          # xem trước
 *   npx tsx scripts/import-notifications-json.ts --apply  # ghi vào CSDL (bỏ qua id đã có)
 *
 * File cũ được giữ nguyên; sau khi kiểm tra hộp thư hiển thị đúng có thể xóa thủ công.
 * Cần chạy `npx prisma db push` trước để có bảng notifications.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient, type Prisma } from '@prisma/client';

interface LegacyNotification {
  id?: unknown;
  recipientEmail?: unknown;
  recipientName?: unknown;
  recipientUserId?: unknown;
  recipientPhone?: unknown;
  subject?: unknown;
  type?: unknown;
  contentHtml?: unknown;
  summary?: unknown;
  sentAt?: unknown;
  isRead?: unknown;
  metadata?: unknown;
  link?: unknown;
}

const str = (value: unknown) => (typeof value === 'string' ? value : '');
const optStr = (value: unknown) => (typeof value === 'string' && value ? value : null);

async function main() {
  const apply = process.argv.includes('--apply');
  const file = path.join(process.cwd(), '.data', 'notifications.json');
  if (!fs.existsSync(file)) {
    console.log('Không có file .data/notifications.json — không cần chuyển.');
    return;
  }
  const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = Array.isArray(parsed) ? (parsed as LegacyNotification[]) : [];

  const prisma = new PrismaClient();
  try {
    const ids = list.map((n) => str(n.id)).filter(Boolean);
    const existing = new Set(
      (await prisma.notification.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((r) => r.id)
    );

    const rows: Prisma.NotificationCreateManyInput[] = [];
    let skipped = 0;
    for (const n of list) {
      const id = str(n.id);
      const sentAt = new Date(str(n.sentAt));
      if (!id || Number.isNaN(sentAt.getTime()) || !str(n.subject)) {
        skipped++;
        continue;
      }
      if (existing.has(id)) {
        skipped++;
        continue;
      }
      rows.push({
        id,
        recipientEmail: str(n.recipientEmail),
        recipientName: str(n.recipientName) || 'Khách thuê',
        recipientUserId: optStr(n.recipientUserId),
        recipientPhone: optStr(n.recipientPhone),
        type: str(n.type) || 'APPOINTMENT_UPDATE',
        subject: str(n.subject),
        summary: str(n.summary),
        contentHtml: str(n.contentHtml),
        link: optStr(n.link),
        metadata:
          n.metadata && typeof n.metadata === 'object' ? (n.metadata as Prisma.InputJsonValue) : undefined,
        isRead: n.isRead === true,
        sentAt,
      });
    }

    console.log(`File có ${list.length} thông báo: ${rows.length} cần chuyển, ${skipped} đã có hoặc không hợp lệ.`);
    for (const r of rows) console.log(`  - ${r.sentAt instanceof Date ? r.sentAt.toISOString() : r.sentAt} | ${r.type} | ${r.recipientEmail}`);
    if (!apply) {
      console.log('Đây là bản xem trước. Chạy lại với --apply để ghi vào cơ sở dữ liệu.');
      return;
    }
    if (rows.length > 0) {
      const result = await prisma.notification.createMany({ data: rows, skipDuplicates: true });
      console.log(`Đã chuyển ${result.count} thông báo vào bảng notifications.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
