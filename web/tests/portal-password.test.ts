import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword } from '../src/lib/password';
import { checkPortalPassword } from '../src/lib/demo-mode';

test('account with its own password accepts only that password, even in demo mode', async () => {
  const storedHash = await hashPassword('MatKhauRieng@2026');
  for (const demoEnabled of [true, false]) {
    assert.equal(await checkPortalPassword({ password: 'MatKhauRieng@2026', storedHash, demoPassword: '123456', demoEnabled }), true);
    assert.equal(await checkPortalPassword({ password: '123456', storedHash, demoPassword: '123456', demoEnabled }), false);
    assert.equal(await checkPortalPassword({ password: '', storedHash, demoPassword: '123456', demoEnabled }), false);
  }
});

test('account without a password accepts the demo password only in demo mode', async () => {
  assert.equal(await checkPortalPassword({ password: '123456', storedHash: null, demoPassword: '123456', demoEnabled: true }), true);
  assert.equal(await checkPortalPassword({ password: '123456', storedHash: null, demoPassword: '123456', demoEnabled: false }), false);
  assert.equal(await checkPortalPassword({ password: 'khac', storedHash: null, demoPassword: '123456', demoEnabled: true }), false);
  assert.equal(await checkPortalPassword({ password: undefined, storedHash: null, demoPassword: '123456', demoEnabled: true }), false);
});
