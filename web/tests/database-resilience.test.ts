import assert from 'node:assert/strict';
import test from 'node:test';
import { getRuntimeDatabaseUrl, getAdminErrorResponse, withDatabaseReadRetry } from '../src/lib/database-resilience';

test('Supabase runtime settings preserve credentials, PgBouncer and explicit overrides', () => {
  const source = 'postgresql://test.user:p%40ss@aws-0-test.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5';
  const result = new URL(getRuntimeDatabaseUrl(source)!);
  const original = new URL(source);
  assert.equal(result.username, original.username);
  assert.equal(result.password, original.password);
  assert.equal(result.port, '6543');
  assert.equal(result.searchParams.get('pgbouncer'), 'true');
  assert.equal(result.searchParams.get('connection_limit'), '5');
  assert.equal(result.searchParams.get('connect_timeout'), '15');
  assert.equal(result.searchParams.get('pool_timeout'), '20');
  const custom = source + '&connect_timeout=9&pool_timeout=0';
  assert.equal(getRuntimeDatabaseUrl(custom), custom);
});

test('Unrelated, missing and invalid connection configurations are left intact', () => {
  for (const value of [undefined, '', 'not-a-url', 'postgresql://localhost:5432/test', 'postgresql://test.pooler.supabase.com.example.org/test']) {
    assert.equal(getRuntimeDatabaseUrl(value), value);
  }
});

test('A temporary connection failure retries the read once and returns its real result', async () => {
  let attempts = 0;
  const result = await withDatabaseReadRetry(async () => {
    if (++attempts === 1) throw Object.assign(new Error('offline'), { errorCode: 'P1001' });
    return { count: 12 };
  });
  assert.deepEqual(result, { count: 12 });
  assert.equal(attempts, 2);
});

test('Persistent connection failure stops after two attempts without substituting data', async () => {
  let attempts = 0;
  const failure = { code: 'P2024', message: 'pool timeout' };
  await assert.rejects(withDatabaseReadRetry(async () => { attempts++; throw failure; }), (error) => error === failure);
  assert.equal(attempts, 2);
});

test('Authentication and validation errors are not retried', async () => {
  for (const code of ['P1000', 'P2002', 'P2003']) {
    let attempts = 0;
    await assert.rejects(withDatabaseReadRetry(async () => { attempts++; throw { code }; }));
    assert.equal(attempts, 1);
  }
});

test('API error responses never disclose stack traces, URLs or database details', () => {
  const sensitive = 'postgresql://user:secret@private-host/db D:\\project\\.next\\server\\chunks';
  for (const error of [{ code: 'P1001', message: sensitive }, new Error(sensitive), null]) {
    const result = getAdminErrorResponse(error);
    assert.equal(result.body.success, false);
    assert.doesNotMatch(JSON.stringify(result), /secret|private-host|chunks|postgresql/);
  }
  assert.equal(getAdminErrorResponse({ code: 'P1001' }).status, 503);
  assert.equal(getAdminErrorResponse(new Error('other')).status, 500);
});
