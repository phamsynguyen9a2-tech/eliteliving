import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/request-session';
import { isPushConfigured, registerDeviceToken, unregisterDeviceToken } from '@/lib/push';

async function tenantId() {
  const session = await getRequestSession().catch(() => null);
  return session?.user?.id && session.user.role === 'TENANT' ? session.user.id : null;
}

/** App người thuê đăng ký mã thiết bị FCM sau khi đăng nhập: { token, platform } */
export async function POST(request: NextRequest) {
  const userId = await tenantId();
  if (!userId) return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  try {
    await registerDeviceToken(userId, String(body.token || ''), String(body.platform || 'android'));
    return NextResponse.json({ success: true, pushConfigured: isPushConfigured() });
  } catch (err) {
    return NextResponse.json({ success: false, message: err instanceof Error ? err.message.replace(/^[A-Z_]+:\s*/, '') : 'Lỗi.' }, { status: 400 });
  }
}

/** Đăng xuất trên app: gỡ mã thiết bị { token } */
export async function DELETE(request: NextRequest) {
  const userId = await tenantId();
  if (!userId) return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  await unregisterDeviceToken(userId, String(body.token || ''));
  return NextResponse.json({ success: true });
}
