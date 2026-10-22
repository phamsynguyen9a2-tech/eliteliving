/** Keep deployment overrides intact; bound the local Prisma pool for Supabase. */
export function getRuntimeDatabaseUrl(value: string | undefined): string | undefined {
  if (!value) return value;
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname.endsWith('.pooler.supabase.com')) return value;
    for (const [name, fallback] of Object.entries({ connection_limit: '3', connect_timeout: '15', pool_timeout: '20' })) {
      if (!url.searchParams.has(name)) url.searchParams.set(name, fallback);
    }
    return url.toString();
  } catch {
    // Let Prisma report invalid configuration through the usual server error path.
    return value;
  }
}

const transientCodes = new Set(['P1001', 'P1002', 'P1017', 'P2024']);

export function isTransientDatabaseError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const details = error as { code?: unknown; errorCode?: unknown; message?: unknown };
  const code = details.code ?? details.errorCode;
  if (typeof code === 'string') return transientCodes.has(code);
  return typeof details.message === 'string' && /can't reach database server|server has closed the connection|timed out fetching a new connection from the connection pool/i.test(details.message);
}

/** For idempotent reads only. Never wrap writes, transactions or external effects. */
export async function withDatabaseReadRetry<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (!isTransientDatabaseError(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 300));
    return read();
  }
}

export function getAdminErrorResponse(error: unknown) {
  if (isTransientDatabaseError(error)) {
    return {
      status: 503,
      body: {
        success: false,
        code: 'DATABASE_UNAVAILABLE',
        message: 'Kết nối dữ liệu đang gián đoạn hoặc phản hồi chậm. Vui lòng đợi một lát rồi bấm Thử lại.',
      },
    };
  }
  return {
    status: 500,
    body: {
      success: false,
      code: 'ADMIN_REQUEST_FAILED',
      message: 'Hệ thống chưa thể xử lý yêu cầu. Vui lòng thử lại; nếu lỗi tiếp tục, hãy liên hệ người quản trị kỹ thuật.',
    },
  };
}
