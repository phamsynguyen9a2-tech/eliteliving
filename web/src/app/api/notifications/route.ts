import { NextRequest, NextResponse } from 'next/server';
import { inMemoryNotifications } from '@/lib/email-service';
import { forbidden, getSessionUser, unauthorized } from '@/lib/tenant-access';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để xem thông báo.');

    const { searchParams } = new URL(request.url);
    // Only ADMIN may read another inbox; everyone else is pinned to their own email.
    const email = user.role === 'ADMIN' ? searchParams.get('email') : user.email || '';
    const type = searchParams.get('type');

    let list = [...inMemoryNotifications];
    if (email !== null) {
      list = list.filter((n) => n.recipientEmail.toLowerCase() === email.toLowerCase());
    }
    if (type) {
      list = list.filter((n) => n.type === type);
    }

    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để cập nhật thông báo.');

    const body = await request.json();
    const { id } = body;
    const notif = inMemoryNotifications.find((n) => n.id === id);
    if (
      notif &&
      user.role !== 'ADMIN' &&
      notif.recipientEmail.toLowerCase() !== (user.email || '').toLowerCase()
    ) {
      return forbidden('Bạn không có quyền cập nhật thông báo này.');
    }
    if (notif) {
      notif.isRead = true;
    }
    return NextResponse.json({ success: true, data: notif });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
