import { NextResponse } from 'next/server';
import { getRequestSession } from './request-session';

/** Trả về phiên quản trị viên, hoặc phản hồi 401/403 để route trả thẳng về. */
export async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const session = await getRequestSession();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (user?.id && user.role === 'ADMIN') return { ok: true, userId: user.id };
  return {
    ok: false,
    response: NextResponse.json(
      { success: false, message: user?.id ? 'Chỉ quản trị viên được thực hiện thao tác này.' : 'Vui lòng đăng nhập cổng quản trị.' },
      { status: user?.id ? 403 : 401 }
    ),
  };
}

/** Lỗi nghiệp vụ dạng "MÃ_LỖI: thông điệp" → phản hồi JSON với mã HTTP tương ứng. */
export function businessErrorResponse(err: unknown, codes: Record<string, number>) {
  const message = err instanceof Error ? err.message : '';
  for (const [code, status] of Object.entries(codes)) {
    if (message.startsWith(`${code}:`)) {
      return NextResponse.json({ success: false, message: message.slice(code.length + 1).trim() }, { status });
    }
  }
  return null;
}
