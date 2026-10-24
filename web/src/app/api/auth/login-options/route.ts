import { NextResponse } from 'next/server';
import { isDemoLoginEnabled, isGoogleOAuthConfigured } from '@/lib/demo-mode';

/** Cho form đăng nhập biết nút Google nên là Google thật, Google demo, hay ẩn đi. */
export async function GET() {
  const google = isGoogleOAuthConfigured();
  return NextResponse.json({
    success: true,
    data: {
      google,
      demoGoogle: !google && isDemoLoginEnabled(),
    },
  });
}
