import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeBillMonth } from '../src/lib/bill-ownership';
import {
  createSlidingWindowLimiter,
  getClientIp,
  guestUserIdForPhone,
  localDateString,
} from '../src/lib/guest-booking-limit';

// ------------------------------------------------------------
// Kỳ hóa đơn: mọi cách viết cùng một tháng đều về một khóa duy nhất
// ------------------------------------------------------------
test('kỳ hóa đơn được chuẩn hóa về MM/YYYY', () => {
  assert.equal(normalizeBillMonth('09/2026'), '09/2026');
  assert.equal(normalizeBillMonth('9/2026'), '09/2026');
  assert.equal(normalizeBillMonth(' 9 / 2026 '), '09/2026');
  assert.equal(normalizeBillMonth('2026-09'), '09/2026');
  assert.equal(normalizeBillMonth('9-2026'), '09/2026');
});

test('kỳ hóa đơn sai bị từ chối', () => {
  for (const bad of ['', '13/2026', '0/2026', '2026/09', 'tháng 9', '09/26', null, undefined]) {
    assert.equal(normalizeBillMonth(bad), null, String(bad));
  }
});

// ------------------------------------------------------------
// Giới hạn đặt lịch của khách vãng lai
// ------------------------------------------------------------
test('mỗi IP chỉ được số lượt cho phép trong cửa sổ thời gian', () => {
  const limiter = createSlidingWindowLimiter(3, 60_000);
  const t0 = 1_000_000;
  assert.equal(limiter.hit('1.1.1.1', t0), true);
  assert.equal(limiter.hit('1.1.1.1', t0 + 1), true);
  assert.equal(limiter.hit('1.1.1.1', t0 + 2), true);
  assert.equal(limiter.hit('1.1.1.1', t0 + 3), false, 'lượt thứ 4 bị chặn');
  assert.equal(limiter.hit('2.2.2.2', t0 + 3), true, 'IP khác không bị ảnh hưởng');
  assert.ok(limiter.retryAfterSeconds('1.1.1.1', t0 + 3) > 0);
  // Hết cửa sổ thì được đặt lại
  assert.equal(limiter.hit('1.1.1.1', t0 + 60_001), true);
});

test('lượt bị từ chối không kéo dài thời gian chờ', () => {
  const limiter = createSlidingWindowLimiter(1, 1_000);
  assert.equal(limiter.hit('ip', 0), true);
  for (let i = 1; i < 10; i++) assert.equal(limiter.hit('ip', i * 50), false);
  assert.equal(limiter.hit('ip', 1_000), true);
});

test('IP lấy từ x-forwarded-for (địa chỉ đầu) hoặc x-real-ip', () => {
  assert.equal(getClientIp(new Headers({ 'x-forwarded-for': '10.0.0.1, 172.16.0.1' })), '10.0.0.1');
  assert.equal(getClientIp(new Headers({ 'x-real-ip': '10.0.0.2' })), '10.0.0.2');
  assert.equal(getClientIp(new Headers()), 'unknown');
});

test('khách vãng lai dùng một mã người dùng cố định theo số điện thoại', () => {
  assert.equal(guestUserIdForPhone('0901 234 567'), 'user_guest_0901234567');
  assert.equal(guestUserIdForPhone('0901234567'), guestUserIdForPhone('0901-234-567'));
  assert.ok(guestUserIdForPhone('0901234567').startsWith('user_guest_'));
});

test('ngày hôm nay dạng YYYY-MM-DD so sánh được với ngày đặt lịch', () => {
  assert.equal(localDateString(new Date(2026, 0, 5)), '2026-01-05');
  assert.ok('2026-01-05' >= localDateString(new Date(2026, 0, 5)));
  assert.ok('2026-01-04' < localDateString(new Date(2026, 0, 5)));
});
