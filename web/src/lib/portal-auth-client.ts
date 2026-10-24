'use client';

const basePath = '/api/portal-auth';

async function portalCsrf() {
  const response = await fetch(`${basePath}/csrf`, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok || typeof data.csrfToken !== 'string') {
    throw new Error('Không thể xác thực cổng vận hành. Vui lòng thử lại.');
  }
  return data.csrfToken as string;
}

export async function portalSignIn(credentials: { role: string; email: string; password: string }) {
  const csrfToken = await portalCsrf();
  const response = await fetch(`${basePath}/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...credentials, loginType: 'INTERNAL', csrfToken, json: 'true', callbackUrl: '/portal/login' }),
  });
  const data = await response.json();
  const resultUrl = new URL(data.url, window.location.origin);
  const error = resultUrl.searchParams.get('error');
  return { ok: response.ok && !error && !resultUrl.searchParams.has('csrf'), error };
}

export async function portalSignOut(options?: { callbackUrl?: string; redirect?: boolean }) {
  try {
    const csrfToken = await portalCsrf();
    await fetch(`${basePath}/signout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      credentials: 'include',
      body: new URLSearchParams({ csrfToken, json: 'true', callbackUrl: options?.callbackUrl || '/portal/login' }),
    });
  } catch {
    // Continue to explicit cookie wipe endpoint below
  }

  const logoutRes = await fetch('/api/auth/logout', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'include',
  });

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem('elite_auth_user');
      window.localStorage.removeItem('nhatro_landlord_session');
      window.localStorage.removeItem('elite_living_auth_session_v1');
    } catch {
      // Ignore storage error
    }
    document.cookie = 'elite_role=; path=/; max-age=0; SameSite=Lax';
  }

  if (!logoutRes.ok) {
    throw new Error('Chưa thể đăng xuất cổng vận hành. Vui lòng thử lại.');
  }

  if (options?.redirect && typeof window !== 'undefined') {
    window.location.href = options.callbackUrl || '/portal/login';
  }
}
