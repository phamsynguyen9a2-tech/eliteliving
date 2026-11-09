import assert from 'node:assert/strict';
import test from 'node:test';
import { amenitiesForRoomType, classifyRoomType, matchesRoomTypeFilter, roomTypeBase } from '../src/lib/room-type';

test('roomTypeBase bỏ phần biến thể ở cuối tên loại phòng', () => {
  assert.equal(roomTypeBase('Studio Full nội thất cao cấp (Gác lửng tiêu chuẩn)'), 'Studio Full nội thất cao cấp');
  assert.equal(roomTypeBase('Căn hộ 2 Phòng ngủ cao cấp (Có ban công view thoáng)'), 'Căn hộ 2 Phòng ngủ cao cấp');
  assert.equal(roomTypeBase('Phòng sinh viên tiết kiệm (Có gác lửng) (Kệ bếp tiện nghi)'), 'Phòng sinh viên tiết kiệm (Có gác lửng)');
});

test('classifyRoomType dựa vào tên loại chính, không bị đuôi "(Gác lửng tiêu chuẩn)" làm sai', () => {
  assert.equal(classifyRoomType('Studio Full nội thất cao cấp (Gác lửng tiêu chuẩn)'), 'studio');
  assert.equal(classifyRoomType('1 Phòng ngủ (1PN) riêng biệt (Gác lửng tiêu chuẩn)'), '1pn');
  assert.equal(classifyRoomType('Căn hộ 1 Phòng ngủ hiện đại tách bếp (Kệ bếp tiện nghi)'), '1pn');
  assert.equal(classifyRoomType('Căn hộ 2 Phòng ngủ view Sân bay Tân Sơn Nhất (Gác lửng tiêu chuẩn)'), '2pn');
  assert.equal(classifyRoomType('Duplex Gác lửng ban công view thoáng (Kệ bếp tiện nghi)'), 'gac_lung');
  assert.equal(classifyRoomType('Penthouse Duplex 2 tầng sang trọng (Kệ bếp tiện nghi)'), 'gac_lung');
  assert.equal(classifyRoomType('Phòng gác lửng giờ giấc tự do 24/7 (Kệ bếp tiện nghi)'), 'gac_lung');
});

test('matchesRoomTypeFilter: mỗi phòng chỉ thuộc đúng một nhóm lọc', () => {
  const studio = 'Studio ban công cửa sổ lớn (Gác lửng tiêu chuẩn)';
  assert.equal(matchesRoomTypeFilter(studio, 'studio'), true);
  assert.equal(matchesRoomTypeFilter(studio, 'gac_lung'), false);
  assert.equal(matchesRoomTypeFilter('Penthouse Duplex 2 tầng sang trọng', '2pn'), false);
  assert.equal(matchesRoomTypeFilter(studio, 'all'), true);
  assert.equal(matchesRoomTypeFilter(studio, undefined), true);
});

test('amenitiesForRoomType ẩn tiện ích gác lửng với phòng không có gác', () => {
  const amenities = ['Máy lạnh', 'Gác lửng', 'Gác lửng cao', 'Wifi'];
  assert.deepEqual(amenitiesForRoomType(amenities, 'Studio Full nội thất cao cấp (Gác lửng tiêu chuẩn)'), ['Máy lạnh', 'Wifi']);
  assert.deepEqual(amenitiesForRoomType(amenities, 'Phòng trọ gác lửng sinh viên'), amenities);
});

test('roomTypeShortLabel và buildingAmenitiesForRoomTypes', async () => {
  const { roomTypeShortLabel, buildingAmenitiesForRoomTypes } = await import('../src/lib/room-type');
  assert.equal(roomTypeShortLabel('Căn hộ 2 Phòng ngủ cao cấp (Gác lửng tiêu chuẩn)'), '2PN');
  assert.equal(roomTypeShortLabel('Duplex Gác lửng ban công view thoáng (Kệ bếp tiện nghi)'), 'Duplex');
  assert.equal(roomTypeShortLabel('Phòng trọ gác lửng sinh viên'), 'Gác lửng');
  const amenities = ['Máy lạnh', 'Gác lửng', 'Wifi'];
  assert.deepEqual(buildingAmenitiesForRoomTypes(amenities, ['Căn hộ 2 Phòng ngủ cao cấp (Gác lửng tiêu chuẩn)']), ['Máy lạnh', 'Wifi']);
  assert.deepEqual(buildingAmenitiesForRoomTypes(amenities, ['Studio ban công cửa sổ lớn', 'Phòng trọ gác lửng sinh viên']), amenities);
});

test('3PN thuộc nhóm lọc 2 phòng ngủ, tag loại phòng không trùng và có thứ tự', async () => {
  const { classifyRoomType, roomTypeShortLabel, roomTypeTags } = await import('../src/lib/room-type');
  assert.equal(classifyRoomType('Penthouse 3 Phòng ngủ (Nội thất tiêu chuẩn)'), '2pn');
  assert.equal(roomTypeShortLabel('Penthouse 3 Phòng ngủ (Nội thất tiêu chuẩn)'), '3PN');
  assert.equal(classifyRoomType('Studio cửa sổ trời (Nội thất tiêu chuẩn)'), 'studio');
  assert.deepEqual(roomTypeTags([
    '1 Phòng ngủ (1PN) riêng biệt', 'Phòng trọ gác lửng sinh viên', '1 Phòng ngủ (1PN) riêng biệt (Kệ bếp tiện nghi)', 'Studio cửa sổ trời',
  ]), ['Gác lửng', 'Studio', '1PN']);
});

test('tên loại phòng để hiển thị gọn, không lặp mã và biến thể', async () => {
  const { roomTypeDisplayName, roomTypeVariant } = await import('../src/lib/room-type');
  assert.equal(roomTypeDisplayName('1 Phòng ngủ (1PN) riêng biệt (Kệ bếp tiện nghi)'), '1 phòng ngủ riêng biệt');
  assert.equal(roomTypeVariant('1 Phòng ngủ (1PN) riêng biệt (Kệ bếp tiện nghi)'), 'Kệ bếp tiện nghi');
  assert.equal(roomTypeDisplayName('Duplex Gác lửng ban công view thoáng (Gác lửng tiêu chuẩn)'), 'Duplex gác lửng ban công view thoáng');
  assert.equal(roomTypeDisplayName('Căn hộ 2 Phòng ngủ cao cấp'), 'Căn hộ 2 phòng ngủ cao cấp');
  assert.equal(roomTypeVariant('Căn hộ 2 Phòng ngủ cao cấp'), '');
  assert.equal(roomTypeDisplayName('Phòng sinh viên tiết kiệm (Có gác lửng) (Kệ bếp tiện nghi)'), 'Phòng sinh viên tiết kiệm (Có gác lửng)');
});

test('tên phòng ngắn chỉ áp dụng cho tiêu đề tự sinh, giữ tiêu đề chủ trọ tự đặt', async () => {
  const { roomShortTitle, roomHeading, isGeneratedRoomTitle } = await import('../src/lib/room-type');
  const generated = { room_code: 'P.404', room_type: '1 Phòng ngủ (1PN) riêng biệt (Kệ bếp tiện nghi)', title: 'P.404 (1 Phòng ngủ (1PN) riêng biệt (Kệ bếp tiện nghi)) - Chung cư mini Hồ Đắc Di (Khu phố sinh viên HUIT)', address: 'Số 11/20 Đường Hồ Đắc Di, Phường Tây Thạnh, Quận Tân Phú' };
  assert.equal(isGeneratedRoomTitle(generated.title, generated.room_code), true);
  // Dạng tên: số phòng - loại phòng nói đơn giản + tên đường
  assert.equal(roomShortTitle(generated), '404 - Căn 1 phòng ngủ Hồ Đắc Di');
  assert.equal(roomHeading(generated), '404 - Căn 1 phòng ngủ Hồ Đắc Di');
  const loft = { room_code: 'P.102', room_type: 'Phòng trọ gác lửng sinh viên (Gác lửng tiêu chuẩn)', title: 'P.102 (Phòng trọ gác lửng sinh viên (Gác lửng tiêu chuẩn)) - Nhà trọ Sinh viên Tân Kỳ Tân Quý', address: 'Số 481/23/10 Đường Tân Kỳ Tân Quý, Phường Tân Quý, Quận Tân Phú' };
  assert.equal(roomShortTitle(loft), '102 - Phòng có gác Tân Kỳ Tân Quý');
  const custom = { room_code: 'P.999', room_type: 'Studio Full nội thất cao cấp', title: 'Phòng góc nhiều nắng gần chợ' };
  assert.equal(roomShortTitle(custom), 'Phòng góc nhiều nắng gần chợ');
  assert.equal(roomHeading(custom), 'Phòng góc nhiều nắng gần chợ');
});

test('tên đường lấy từ địa chỉ, đường đánh số có thêm chữ "đường"', async () => {
  const { streetOf, roomTypeSimpleLabel } = await import('../src/lib/room-type');
  assert.equal(streetOf('Số 33 Đường Số 72, Phường Thạnh Mỹ Lợi, Thành phố Thủ Đức'), 'đường số 72');
  assert.equal(streetOf('Số 3 Đường Số B2, Phường 7, Quận 8'), 'đường số B2');
  assert.equal(streetOf('Số 606/56 Đường 3/2, Phường 14, Quận 10'), 'đường 3/2');
  assert.equal(streetOf('Số 36/70/22 Đường D2, Phường 25, Quận Bình Thạnh'), 'đường D2');
  assert.equal(streetOf('Không có tên đường'), '');
  assert.equal(roomTypeSimpleLabel('Penthouse 3 Phòng ngủ (Nội thất tiêu chuẩn)'), 'Căn 3 phòng ngủ');
  assert.equal(roomTypeSimpleLabel('Duplex Gác lửng ban công view thoáng'), 'Phòng duplex');
  assert.equal(roomTypeSimpleLabel('Studio cửa sổ trời'), 'Studio');
});

test('splitRoomTitle tách tên phòng lưu sẵn trong hợp đồng', async () => {
  const { splitRoomTitle } = await import('../src/lib/room-type');
  assert.deepEqual(
    splitRoomTitle('P.105 (1 Phòng ngủ (1PN) riêng biệt (Kệ bếp tiện nghi)) - Chung cư mini Hồ Đắc Di (Khu phố sinh viên HUIT)'),
    { heading: '105 - Căn 1 phòng ngủ', building: 'Chung cư mini Hồ Đắc Di (Khu phố sinh viên HUIT)' }
  );
  assert.deepEqual(splitRoomTitle('Phòng góc nhiều nắng'), { heading: 'Phòng góc nhiều nắng', building: '' });
});
