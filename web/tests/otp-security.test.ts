import assert from 'node:assert/strict';
import test from 'node:test';
import { canExposeDevOtp, isDeliverableEmail } from '../src/lib/otp-delivery';
import { issueOtpChallenge, OTP_MAX_ISSUES_PER_HOUR, verifyOtpChallenge } from '../src/lib/otp-store';

const env = process.env as Record<string, string | undefined>;

function withEnv(values: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(values)) {
    saved[key] = env[key];
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  try {
    fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  }
}

test('chế độ demo: chỉ tài khoản demo mới thấy mã OTP trên màn hình', () => {
  withEnv({ NODE_ENV: 'development', DEMO_OTP_IN_RESPONSE: undefined, DEMO_OTP_ALLOWLIST: undefined }, () => {
    assert.equal(canExposeDevOtp(['nguyen.pham.huit@gmail.com']), true);
    assert.equal(canExposeDevOtp(['0912345678']), true);
    assert.equal(canExposeDevOtp(['nguoi.khac@gmail.com', '0901234567']), false);
  });
  withEnv({ NODE_ENV: 'development', DEMO_OTP_ALLOWLIST: 'sv1@gmail.com, 0901234567' }, () => {
    assert.equal(canExposeDevOtp(['SV1@gmail.com']), true);
    assert.equal(canExposeDevOtp(['+84901234567']), true);
  });
});

test('production: không bao giờ trả mã OTP về trình duyệt', () => {
  withEnv({ NODE_ENV: 'production', ENABLE_DEMO_LOGIN: undefined, ENABLE_DEMO_PORTAL: undefined, DEMO_OTP_IN_RESPONSE: 'true' }, () => {
    assert.equal(canExposeDevOtp(['nguyen.pham.huit@gmail.com']), false);
  });
});

test('email giả tự sinh từ SĐT không được coi là email nhận được thư', () => {
  assert.equal(isDeliverableEmail('0901234567@khachthue.nhatrotop.vn'), false);
  assert.equal(isDeliverableEmail('0901234567@khachthue.eliteliving.vn'), false);
  assert.equal(isDeliverableEmail('sv@gmail.com'), true);
  assert.equal(isDeliverableEmail(''), false);
});

test('giới hạn số mã OTP mỗi giờ cho một định danh', () => {
  const key = `limit-${Date.now()}@test.vn`;
  for (let i = 0; i < OTP_MAX_ISSUES_PER_HOUR; i++) {
    assert.equal(issueOtpChallenge(key, key, 'LOGIN', 0).ok, true);
  }
  const blocked = issueOtpChallenge(key, key, 'LOGIN', 0);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.status, 429);
});

test('mã OTP chỉ dùng được một lần và sai quá 5 lần thì bị hủy', () => {
  const key = `once-${Date.now()}@test.vn`;
  const issued = issueOtpChallenge(key, key, 'RESET_PASSWORD', 0);
  assert.equal(issued.ok, true);
  if (!issued.ok) return;
  const wrong = issued.code === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) assert.equal(verifyOtpChallenge(key, wrong, 'RESET_PASSWORD').ok, false);
  assert.equal(verifyOtpChallenge(key, issued.code, 'RESET_PASSWORD').ok, false, 'sau 5 lần sai, mã đúng cũng bị từ chối');

  const second = issueOtpChallenge(`${key}.2`, key, 'RESET_PASSWORD', 0);
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(verifyOtpChallenge(`${key}.2`, second.code, 'RESET_PASSWORD').ok, true);
  assert.equal(verifyOtpChallenge(`${key}.2`, second.code, 'RESET_PASSWORD').ok, false, 'mã đã dùng không dùng lại được');
});
