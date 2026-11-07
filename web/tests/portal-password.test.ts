import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword } from '../src/lib/password';
import { checkAdminPassword, checkPortalPassword, DEMO_PORTAL_PASSWORDS } from '../src/lib/demo-mode';

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

test('admin password: same rule for login and password change (own → ADMIN_PORTAL_PASSWORD → demo admin123)', async () => {
  // Chưa có mật khẩu riêng, bật demo: đúng mật khẩu demo của admin, không nhận mật khẩu demo của chủ trọ
  assert.equal(await checkAdminPassword({ password: DEMO_PORTAL_PASSWORDS.ADMIN, storedHash: null, demoEnabled: true }), true);
  assert.equal(await checkAdminPassword({ password: DEMO_PORTAL_PASSWORDS.LANDLORD, storedHash: null, demoEnabled: true }), false);
  assert.equal(await checkAdminPassword({ password: DEMO_PORTAL_PASSWORDS.ADMIN, storedHash: null, demoEnabled: false }), false);
  // Có ADMIN_PORTAL_PASSWORD trong .env thì chỉ nhận giá trị đó
  assert.equal(await checkAdminPassword({ password: 'CauHinh@2026', storedHash: null, configuredPassword: 'CauHinh@2026', demoEnabled: true }), true);
  assert.equal(await checkAdminPassword({ password: DEMO_PORTAL_PASSWORDS.ADMIN, storedHash: null, configuredPassword: 'CauHinh@2026', demoEnabled: true }), false);
  // Có mật khẩu riêng thì chỉ nhận mật khẩu riêng
  const storedHash = await hashPassword('Rieng@2026');
  assert.equal(await checkAdminPassword({ password: 'Rieng@2026', storedHash, configuredPassword: 'CauHinh@2026', demoEnabled: true }), true);
  assert.equal(await checkAdminPassword({ password: DEMO_PORTAL_PASSWORDS.ADMIN, storedHash, demoEnabled: true }), false);
});
