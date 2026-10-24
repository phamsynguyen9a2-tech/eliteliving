// Run against the local dev server: node --env-file=.env tests/auth-session-local.mjs
// Uses an isolated cookie jar, a demo landlord login, and a synthetic tenant JWT.
// Does not create accounts or change application data.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { encode } = createRequire(import.meta.url)('next-auth/jwt');
const origin = 'http://localhost:3000';
const jar = new Map();

async function request(path, init = {}) {
  const response = await fetch(origin + path, {
    ...init,
    redirect: 'manual',
    signal: AbortSignal.timeout(90000),
    headers: { Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; '), ...init.headers },
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';')[0];
    const index = pair.indexOf('=');
    const name = pair.slice(0, index);
    const value = pair.slice(index + 1);
    if (value) jar.set(name, value); else jar.delete(name);
  }
  return response;
}

async function session(scope) {
  const response = await request(`/api/${scope === 'portal' ? 'portal-auth' : 'auth'}/session`);
  assert.equal(response.status, 200);
  return response.json();
}

async function authAction(scope, action, fields = {}) {
  const base = `/api/${scope === 'portal' ? 'portal-auth' : 'auth'}`;
  const csrfResponse = await request(`${base}/csrf`);
  assert.equal(csrfResponse.status, 200);
  const { csrfToken } = await csrfResponse.json();
  const response = await request(`${base}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...fields, csrfToken, json: 'true', callbackUrl: origin }),
  });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(new URL(data.url).searchParams.has('error'), false);
  assert.equal(new URL(data.url).searchParams.has('csrf'), false);
}

const portalLogin = () => authAction('portal', 'callback/credentials', {
  loginType: 'INTERNAL', role: 'LANDLORD',
  email: 'hung.taythanh@eliteliving.vn',
  // Tài khoản demo chưa có mật khẩu riêng → mật khẩu demo; đã cấp mật khẩu → đặt LANDLORD_TEST_PASSWORD
  password: process.env.LANDLORD_TEST_PASSWORD || '123456',
});

await portalLogin();
assert.equal((await session('portal')).user?.role, 'LANDLORD');
assert.equal((await session('tenant')).user, undefined);
assert.equal((await request('/chu-tro')).status, 200);
assert.equal((await request('/admin')).status, 307);
console.log('PASS: landlord login leaves tenant signed out; portal RBAC enforced');

const tenantCookie = 'next-auth.session-token';
const portalCookie = 'next-auth.portal.session-token';
const portalToken = jar.get(portalCookie);
assert.ok(portalToken);
jar.set(tenantCookie, portalToken);
assert.equal((await session('tenant')).user, undefined);
assert.equal((await session('portal')).user?.role, 'LANDLORD');
console.log('PASS: copying an operator token into the tenant cookie is rejected');

jar.set(tenantCookie, await encode({
  secret: process.env.NEXTAUTH_SECRET || 'nhatrotop_local_development_only_secret',
  token: { id: 'auth_scope_test_tenant', name: 'Session isolation test', role: 'TENANT', authScope: 'tenant' },
}));
assert.equal((await session('tenant')).user?.id, 'auth_scope_test_tenant');
assert.equal((await session('portal')).user?.role, 'LANDLORD');
const portalApi = await request('/api/landlords?type=landlords', { headers: { 'x-auth-scope': 'portal' } });
assert.equal(portalApi.status, 200);
assert.equal((await portalApi.json()).success, true);
assert.equal((await request('/api/landlords?type=landlords')).status, 403);
console.log('PASS: concurrent tenant/operator sessions use the correct API identity');

await authAction('portal', 'signout');
assert.equal((await session('portal')).user, undefined);
assert.equal((await session('tenant')).user?.id, 'auth_scope_test_tenant');
assert.equal((await request('/chu-tro')).status, 307);
await portalLogin();
assert.equal((await session('tenant')).user?.id, 'auth_scope_test_tenant');
await authAction('tenant', 'signout');
assert.equal((await session('tenant')).user, undefined);
assert.equal((await session('portal')).user?.role, 'LANDLORD');
await authAction('portal', 'signout');
console.log('PASS: login/logout in either area preserves the other session');
