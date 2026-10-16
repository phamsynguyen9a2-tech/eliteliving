import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { inMemoryNotifications, type StoredNotification } from '@/lib/email-service';
import {
  notificationBelongsTo,
  persistNotifications,
  removeNotification,
  type NotificationViewer,
} from '@/lib/notification-store';
import { ensureContractExpiryReminders } from '@/lib/tenant-notifications';
import {
  forbidden,
  getSessionUser,
  getTenantScope,
  unauthorized,
  type SessionUser,
} from '@/lib/tenant-access';

/** SĐT chỉ được dùng để khớp hộp thư khi đã xác minh trong DB. */
async function buildViewer(user: SessionUser): Promise<NotificationViewer> {
  let verifiedPhone: string | null = null;
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { phone: true, phoneVerified: true },
    });
    if (dbUser?.phone && dbUser.phoneVerified) verifiedPhone = dbUser.phone;
  } catch {
    if (user.phone && user.phoneVerified) verifiedPhone = user.phone;
  }
  return { id: user.id, email: user.email, verifiedPhone };
}

function canTouch(user: SessionUser, viewer: NotificationViewer, notif: StoredNotification) {
  return user.role === 'ADMIN' || notificationBelongsTo(notif, viewer);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để xem thông báo.');

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const unreadOnly = searchParams.get('unread') === 'true';
    const limitParam = Number(searchParams.get('limit'));
    const limit = Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : null;
    // scope=mine: hộp thư cá nhân (Navbar/Hồ sơ) — kể cả ADMIN chỉ xem thư của mình.
    const mineOnly = searchParams.get('scope') === 'mine';

    const viewer = await buildViewer(user);

    // Khách thuê: tự phát thông báo nhắc hạn cho hợp đồng sắp hết hạn (≤ 30 ngày).
    if (user.role === 'TENANT') {
      try {
        const scope = await getTenantScope(user.id);
        await ensureContractExpiryReminders({
          userId: user.id,
          email: user.email || '',
          contractIds: scope.contractIds,
        });
      } catch {
        // Không chặn việc đọc hộp thư nếu nhắc hạn lỗi.
      }
    }

    let list = [...inMemoryNotifications];
    if (user.role === 'ADMIN' && !mineOnly) {
      // Only ADMIN may read another inbox; giữ hành vi cũ: không truyền email = xem tất cả.
      const email = searchParams.get('email');
      if (email !== null) {
        list = list.filter((n) => n.recipientEmail.toLowerCase() === email.toLowerCase());
      }
    } else {
      list = list.filter((n) => notificationBelongsTo(n, viewer));
    }

    if (type) {
      list = list.filter((n) => n.type === type);
    }

    list.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    const unreadCount = list.filter((n) => !n.isRead).length;
    const total = list.length;
    if (unreadOnly) list = list.filter((n) => !n.isRead);
    if (limit) list = list.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: list,
      unreadCount,
      total,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/**
 * Body:
 * - `{ id }`                → đánh dấu đã đọc (giữ nguyên hành vi cũ)
 * - `{ id, isRead: false }` → đánh dấu chưa đọc
 * - `{ all: true }`         → đánh dấu tất cả thông báo của tôi đã đọc
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để cập nhật thông báo.');

    const body = await request.json();
    const { id, all } = body;
    const isRead = body.isRead === false ? false : true;
    const viewer = await buildViewer(user);

    if (all === true) {
      let updated = 0;
      for (const notif of inMemoryNotifications) {
        if (!notif.isRead && notificationBelongsTo(notif, viewer)) {
          notif.isRead = true;
          updated += 1;
        }
      }
      if (updated > 0) persistNotifications();
      return NextResponse.json({ success: true, data: { updated } });
    }

    const notif = inMemoryNotifications.find((n) => n.id === id);
    if (notif && !canTouch(user, viewer, notif)) {
      return forbidden('Bạn không có quyền cập nhật thông báo này.');
    }
    if (notif) {
      notif.isRead = isRead;
      persistNotifications();
    }
    return NextResponse.json({ success: true, data: notif });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/** Xóa (ẩn) một thông báo khỏi hộp thư: DELETE /api/notifications?id=... */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để xóa thông báo.');

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Thiếu mã thông báo.' }, { status: 400 });
    }

    const notif = inMemoryNotifications.find((n) => n.id === id);
    if (!notif) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy thông báo.' }, { status: 404 });
    }
    const viewer = await buildViewer(user);
    if (!canTouch(user, viewer, notif)) {
      return forbidden('Bạn không có quyền xóa thông báo này.');
    }

    removeNotification(id);
    return NextResponse.json({ success: true, data: { id } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
