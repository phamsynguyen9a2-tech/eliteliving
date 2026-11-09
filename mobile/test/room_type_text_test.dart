import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/room_type_text.dart';

void main() {
  test('tên loại phòng gọn, cùng quy tắc với web', () {
    expect(
      roomTypeDisplayName('1 Phòng ngủ (1PN) riêng biệt (Kệ bếp tiện nghi)'),
      '1 phòng ngủ riêng biệt',
    );
    expect(
      roomTypeVariant('1 Phòng ngủ (1PN) riêng biệt (Kệ bếp tiện nghi)'),
      'Kệ bếp tiện nghi',
    );
    expect(
      roomTypeDisplayName(
        'Duplex Gác lửng ban công view thoáng (Gác lửng tiêu chuẩn)',
      ),
      'Duplex gác lửng ban công view thoáng',
    );
    expect(roomTypeVariant('Căn hộ 2 Phòng ngủ cao cấp'), '');
    expect(
      roomTypeDisplayName(
        'Phòng sinh viên tiết kiệm (Có gác lửng) (Kệ bếp tiện nghi)',
      ),
      'Phòng sinh viên tiết kiệm (Có gác lửng)',
    );
  });

  test('tiêu đề ngắn cho thẻ phòng', () {
    expect(
      roomShortTitle({
        'room_code': 'P.404',
        'room_type': '1 Phòng ngủ (1PN) riêng biệt (Kệ bếp tiện nghi)',
        'title':
            'P.404 (1 Phòng ngủ (1PN) riêng biệt (Kệ bếp tiện nghi)) - Chung cư mini Hồ Đắc Di',
        'address': 'Số 11/20 Đường Hồ Đắc Di, Phường Tây Thạnh, Quận Tân Phú',
      }),
      '404 - Căn 1 phòng ngủ Hồ Đắc Di',
    );
    expect(
      roomShortTitle({
        'room_code': 'P.102',
        'room_type': 'Phòng trọ gác lửng sinh viên (Gác lửng tiêu chuẩn)',
        'title':
            'P.102 (Phòng trọ gác lửng sinh viên (Gác lửng tiêu chuẩn)) - Nhà trọ Sinh viên Tân Kỳ Tân Quý',
        'address':
            'Số 481/23/10 Đường Tân Kỳ Tân Quý, Phường Tân Quý, Quận Tân Phú',
      }),
      '102 - Phòng có gác Tân Kỳ Tân Quý',
    );
    expect(streetOf('Số 33 Đường Số 72, Phường Thạnh Mỹ Lợi'), 'đường số 72');
    expect(streetOf('Số 3 Đường Số B2, Phường 7, Quận 8'), 'đường số B2');
    expect(streetOf('Số 606/56 Đường 3/2, Phường 14'), 'đường 3/2');
    expect(roomTypeSimpleLabel('Penthouse 3 Phòng ngủ'), 'Căn 3 phòng ngủ');
    expect(
      roomTypeSimpleLabel('Duplex Gác lửng ban công view thoáng'),
      'Phòng duplex',
    );
    expect(roomShortTitle({'title': 'Phòng A', 'room_code': 'P.1'}), 'Phòng A');
    // Tiêu đề chủ trọ tự đặt: giữ nguyên
    expect(
      roomShortTitle({
        'room_code': 'P.999',
        'room_type': 'Studio Full nội thất cao cấp',
        'title': 'Phòng góc nhiều nắng gần chợ',
      }),
      'Phòng góc nhiều nắng gần chợ',
    );
  });
}
