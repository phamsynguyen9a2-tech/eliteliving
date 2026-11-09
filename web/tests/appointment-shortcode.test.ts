import assert from 'node:assert/strict';
import test from 'node:test';
import { createAppointmentShortCode, matchesAppointmentShortCode } from '../src/lib/appointment-lookup';

test('mã tra cứu 6 số: cố định theo lịch hẹn, chỉ khớp đúng mã', () => {
  const secret = 'khoa-thu-nghiem';
  const code = createAppointmentShortCode('cm_lich_hen_1', secret);
  assert.match(code ?? '', /^\d{6}$/);
  assert.equal(createAppointmentShortCode('cm_lich_hen_1', secret), code);
  assert.notEqual(createAppointmentShortCode('cm_lich_hen_2', secret), code);
  assert.equal(matchesAppointmentShortCode('cm_lich_hen_1', code, secret), true);
  assert.equal(matchesAppointmentShortCode('cm_lich_hen_1', ` ${code?.slice(0, 3)} ${code?.slice(3)} `, secret), true);
  const wrong = String((Number(code) + 1) % 1_000_000).padStart(6, '0');
  assert.equal(matchesAppointmentShortCode('cm_lich_hen_1', wrong, secret), false);
  assert.equal(matchesAppointmentShortCode('cm_lich_hen_1', '12345', secret), false);
  // Khóa khác cho mã khác: không suy ra được mã nếu không có khóa bí mật
  assert.notEqual(createAppointmentShortCode('cm_lich_hen_1', 'khoa-khac'), code);
});
