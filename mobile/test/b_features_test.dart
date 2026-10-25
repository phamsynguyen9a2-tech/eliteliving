import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/tenant_api.dart';

void main() {
  group('Khung giờ đón khách (đặt / đổi lịch)', () {
    final availability = LandlordAvailability.fromJson({
      'available_days': ['T2', 'T3', 'T4', 'T5', 'T6'],
      'slots': [
        {'timeSlot': '08:30 - 09:30', 'enabled': true},
        {'timeSlot': '14:00 - 15:00', 'enabled': true},
        {'timeSlot': '20:00 - 21:00', 'enabled': false},
      ],
      'notice_hours': 2,
    });

    test('chỉ lấy khung giờ đang bật', () {
      expect(availability.slots, ['08:30 - 09:30', '14:00 - 15:00']);
    });

    test('ngày nghỉ của chủ trọ không đặt được', () {
      // 2026-10-25 là Chủ nhật, 2026-10-26 là Thứ hai
      expect(availability.isOpenOn(DateTime(2026, 10, 25)), isFalse);
      expect(availability.isOpenOn(DateTime(2026, 10, 26)), isTrue);
      expect(LandlordAvailability.dayCode(DateTime(2026, 10, 25)), 'CN');
    });

    test('trong ngày phải đặt trước số giờ chủ trọ yêu cầu', () {
      final now = DateTime(2026, 10, 26, 11, 30);
      expect(availability.slotsFor(DateTime(2026, 10, 26), now: now), ['14:00 - 15:00']);
      expect(availability.slotsFor(DateTime(2026, 10, 27), now: now).length, 2);
    });
  });

  test('mã giao dịch mô phỏng có tiền tố SIM', () {
    final code = simulatedTransactionCode('HD', DateTime(2026, 10, 25, 14, 5));
    expect(code, startsWith('SIM-HD-2610251405-'));
    expect(code.length, greaterThanOrEqualTo(4));
  });

  test('hồ sơ nhu cầu đọc / ghi đúng trường API', () {
    final p = PreferenceProfile.fromJson({
      'budget_max': 5000000,
      'max_radius_km': 3.5,
      'preferred_amenities': ['Máy lạnh', 'Wifi'],
      'preferred_district': 'Quận Tân Phú',
      'target_lat': 10.8,
      'target_lng': 106.6,
    });
    expect(p.budgetMax, 5000000);
    expect(p.toJson()['max_radius_km'], 3.5);
    expect(p.copyWith(budgetMax: 6000000).toJson()['budget_max'], 6000000);
    expect(p.toJson()['preferred_amenities'], ['Máy lạnh', 'Wifi']);
  });
}
