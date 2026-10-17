import assert from 'node:assert/strict';
import test from 'node:test';
import { encode } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';
import { authCookies, scopedAuthOptions, scopedDecode } from '../src/lib/auth-scope';

const secret = 'isolated-test-secret-not-used-by-the-app';

test('tenant and portal use different cookies for every auth operation', () => {
  const tenant = authCookies('tenant');
  const portal = authCookies('portal');
  for (const key of Object.keys(tenant) as (keyof typeof tenant)[]) {
    assert.notEqual(tenant[key]?.name, portal[key]?.name);
    assert.equal(portal[key]?.options.httpOnly, true);
    assert.equal(portal[key]?.options.sameSite, 'lax');
  }
});

test('signed sessions cannot be reused in another scope, including legacy landlords', async () => {
  for (const [role, authScope, tenantAllowed, portalAllowed] of [
    ['TENANT', 'tenant', true, false],
    ['TENANT', undefined, true, false],
    ['LANDLORD', undefined, false, false],
    ['ADMIN', undefined, false, false],
    ['LANDLORD', 'portal', false, true],
    ['ADMIN', 'portal', false, true],
    ['TENANT', 'portal', false, false],
    ['LANDLORD', 'tenant', false, false],
  ] as const) {
    const token = await encode({ secret, token: {
      id: 'fixture-user', phone: '', phoneVerified: false, isBlocked: false,
      role, authScope,
    } });
    assert.equal(Boolean(await scopedDecode('tenant')({ token, secret })), tenantAllowed);
    assert.equal(Boolean(await scopedDecode('portal')({ token, secret })), portalAllowed);
  }
});

test('credential adapter rejects wrong-scope login before business logic runs', async () => {
  let calls = 0;
  const base: NextAuthOptions = {
    providers: [CredentialsProvider({
      credentials: {},
      authorize: async () => { calls++; return { id: 'fixture-user', role: 'LANDLORD' }; },
    })],
  };
  const tenant = scopedAuthOptions(base, 'tenant').providers[0].options.authorize;
  const portal = scopedAuthOptions(base, 'portal').providers[0].options.authorize;
  const request = { method: 'POST', headers: {}, query: {}, body: {} };
  assert.equal(await tenant({ role: 'LANDLORD' }, request), null);
  assert.equal(await tenant({ role: 'ADMIN' }, request), null);
  assert.equal(await portal({ loginType: 'TENANT_REGISTER' }, request), null);
  assert.equal(await portal({ role: 'LANDLORD', loginType: 'TENANT_PASSWORD' }, request), null);
  assert.equal(calls, 0);
  assert.equal((await portal({ role: 'LANDLORD', loginType: 'INTERNAL' }, request)).id, 'fixture-user');
  assert.equal(calls, 1);
});
