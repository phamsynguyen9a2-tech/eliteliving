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

export async function portalSignOut() {
  const csrfToken = await portalCsrf();
  const response = await fetch(`${basePath}/signout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken, json: 'true', callbackUrl: '/portal/login' }),
  });
  if (!response.ok) throw new Error('Chưa thể đăng xuất cổng vận hành. Vui lòng thử lại.');
}
