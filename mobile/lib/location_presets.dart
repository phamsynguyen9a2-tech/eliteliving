import 'dart:math' as math;

import 'tenant_api.dart' show BuildingInfo;

class LocationPreset {
  const LocationPreset({
    required this.id,
    required this.name,
    required this.district,
    required this.lat,
    required this.lng,
    required this.group,
  });

  final String id;
  final String name;
  final String district;
  final double lat;
  final double lng;
  final String group;
}

/// Địa điểm của mục tìm phòng gần nơi học (`LANDMARK_OPTIONS` trong `TopKWidget.tsx`).
const List<LocationPreset> kTopKLandmarks = [
  LocationPreset(id: 'aeon_tan_phu', name: 'Aeon Mall Tân Phú (Celadon)', district: 'Quận Tân Phú', lat: 10.8016, lng: 106.6163, group: _landmarkGroup),
  LocationPreset(id: 'huit', name: 'ĐH Công Thương TP.HCM (HUIT)', district: 'Quận Tân Phú', lat: 10.8066, lng: 106.6286, group: _landmarkGroup),
  LocationPreset(id: 'aeon_binh_tan', name: 'Aeon Mall Bình Tân', district: 'Quận Bình Tân', lat: 10.7432, lng: 106.6125, group: _landmarkGroup),
  LocationPreset(id: 'tan_son_nhat', name: 'Sân bay Quốc tế Tân Sơn Nhất', district: 'Quận Tân Bình', lat: 10.8185, lng: 106.6588, group: _landmarkGroup),
  LocationPreset(id: 'dam_sen', name: 'Công viên Đầm Sen (Lạc Long Quân)', district: 'Quận Tân Phú / Q11', lat: 10.7684, lng: 106.6438, group: _landmarkGroup),
  LocationPreset(id: 'etown', name: 'Tòa nhà ETown Cộng Hòa', district: 'Quận Tân Bình', lat: 10.8015, lng: 106.6482, group: _landmarkGroup),
  LocationPreset(id: 'iuh_go_vap', name: 'ĐH Công Nghiệp TP.HCM (IUH - Gò Vấp)', district: 'Quận Gò Vấp', lat: 10.8223, lng: 106.6874, group: _landmarkGroup),
  LocationPreset(id: 'hutech_binh_thanh', name: 'ĐH HUTECH & Ngoại Thương (Ngã tư Hàng Xanh)', district: 'Quận Bình Thạnh', lat: 10.8016, lng: 106.7145, group: _landmarkGroup),
  LocationPreset(id: 'phan_xich_long', name: 'Phố ẩm thực Phan Xích Long (Phú Nhuận)', district: 'Quận Phú Nhuận', lat: 10.7992, lng: 106.6845, group: _landmarkGroup),
  LocationPreset(id: 'thao_dien_thu_duc', name: 'Khu Thảo Điền & ĐH SPKT (TP. Thủ Đức)', district: 'Thành phố Thủ Đức', lat: 10.8045, lng: 106.7385, group: _landmarkGroup),
  LocationPreset(id: 'tdtu_rmit_q7', name: 'ĐH Tôn Đức Thắng, RMIT & Phú Mỹ Hưng (Quận 7)', district: 'Quận 7', lat: 10.7326, lng: 106.6997, group: _landmarkGroup),
  LocationPreset(id: 'bach_khoa_van_hanh_q10', name: 'ĐH Bách Khoa, UEH & Vạn Hạnh Mall (Quận 10)', district: 'Quận 10', lat: 10.7705, lng: 106.6675, group: _landmarkGroup),
  LocationPreset(id: 'cvpm_quang_trung_q12', name: 'Công viên Phần mềm Quang Trung & An Phú Đông (Quận 12)', district: 'Quận 12', lat: 10.8538, lng: 106.6285, group: _landmarkGroup),
  LocationPreset(id: 'ben_thanh_q1', name: 'Chợ Bến Thành & Phố đi bộ Nguyễn Huệ (Quận 1)', district: 'Quận 1', lat: 10.7721, lng: 106.6983, group: _landmarkGroup),
  LocationPreset(id: 'ho_con_rua_q3', name: 'Hồ Con Rùa & ĐH Kinh Tế UEH (Quận 3)', district: 'Quận 3', lat: 10.7827, lng: 106.6959, group: _landmarkGroup),
  LocationPreset(id: 'st_le_trong_tan', name: 'Đường Lê Trọng Tấn (Tân Phú)', district: 'Quận Tân Phú', lat: 10.808, lng: 106.626, group: _streetGroup),
  LocationPreset(id: 'st_tay_thanh', name: 'Đường Tây Thạnh (Sát KCN Tân Bình)', district: 'Quận Tân Phú', lat: 10.8066, lng: 106.6278, group: _streetGroup),
  LocationPreset(id: 'st_cong_hoa', name: 'Đường Cộng Hòa (Tân Bình)', district: 'Quận Tân Bình', lat: 10.802, lng: 106.649, group: _streetGroup),
  LocationPreset(id: 'st_truong_chinh', name: 'Đường Trường Chinh (Mũi Tàu)', district: 'Quận Tân Bình', lat: 10.814, lng: 106.634, group: _streetGroup),
  LocationPreset(id: 'st_tan_ky_tan_quy', name: 'Đường Tân Kỳ Tân Quý', district: 'Quận Tân Phú', lat: 10.802, lng: 106.617, group: _streetGroup),
  LocationPreset(id: 'st_vuon_lai', name: 'Đường Vườn Lài (Tân Thành / An Phú Đông)', district: 'Quận Tân Phú / Q12', lat: 10.785, lng: 106.632, group: _streetGroup),
  LocationPreset(id: 'st_ten_lua', name: 'Đường Tên Lửa (Khu Tên Lửa)', district: 'Quận Bình Tân', lat: 10.755, lng: 106.613, group: _streetGroup),
  LocationPreset(id: 'st_au_co', name: 'Đường Âu Cơ (Tân Bình - Tân Phú)', district: 'Tân Bình / Tân Phú', lat: 10.788, lng: 106.645, group: _streetGroup),
  LocationPreset(id: 'st_le_duc_tho_gv', name: 'Đường Lê Đức Thọ & Lê Văn Thọ (Gò Vấp)', district: 'Quận Gò Vấp', lat: 10.842, lng: 106.663, group: _streetGroup),
  LocationPreset(id: 'st_d2_binh_thanh', name: 'Đường Nguyễn Gia Trí - D2 & Ung Văn Khiêm (Bình Thạnh)', district: 'Quận Bình Thạnh', lat: 10.804, lng: 106.715, group: _streetGroup),
  LocationPreset(id: 'st_le_van_sy_q3', name: 'Đường Lê Văn Sỹ (Quận 3 - Phú Nhuận)', district: 'Quận 3 / Phú Nhuận', lat: 10.7878, lng: 106.6772, group: _streetGroup),
  LocationPreset(id: 'st_su_van_hanh_q10', name: 'Đường Sư Vạn Hạnh & Thành Thái (Quận 10)', district: 'Quận 10', lat: 10.773, lng: 106.669, group: _streetGroup),
  LocationPreset(id: 'st_duong_ba_trac_q8', name: 'Đường Dương Bá Trạc & Tạ Quang Bửu (Quận 8)', district: 'Quận 8', lat: 10.7476, lng: 106.6886, group: _streetGroup),
];

const _landmarkGroup = 'Trường ĐH, TTTM & Khu văn phòng';
const _streetGroup = 'Tuyến đường';

/// Địa điểm của bản đồ tìm tòa nhà (`HCMC_PRESET_LOCATIONS` trong `EliteRadarMapModal.tsx`).
const List<LocationPreset> kMapPresets = [
  LocationPreset(id: 'le-thuc-hoach', name: 'Đường Lê Thúc Hoạch, Phú Thọ Hòa', district: 'Quận Tân Phú', lat: 10.7832, lng: 106.6258, group: 'Quận Tân Phú'),
  LocationPreset(id: 'huit', name: 'ĐH Công Thương TP.HCM (HUIT) - 140 Lê Trọng Tấn', district: 'Quận Tân Phú', lat: 10.8063, lng: 106.6286, group: 'Quận Tân Phú'),
  LocationPreset(id: 'aeon-tan-phu', name: 'Aeon Mall Tân Phú Celadon - Bờ Bao Tân Thắng', district: 'Quận Tân Phú', lat: 10.8016, lng: 106.6177, group: 'Quận Tân Phú'),
  LocationPreset(id: 'tay-thanh', name: 'Trục đường Tây Thạnh - KCN Tân Bình', district: 'Quận Tân Phú', lat: 10.8118, lng: 106.6295, group: 'Quận Tân Phú'),
  LocationPreset(id: 'tan-ky-tan-quy', name: 'Đường Tân Kỳ Tân Quý - Tân Sơn Nhì', district: 'Quận Tân Phú', lat: 10.8005, lng: 106.6312, group: 'Quận Tân Phú'),
  LocationPreset(id: 'luy-ban-bich', name: 'Đường Lũy Bán Bích - Hòa Thạnh', district: 'Quận Tân Phú', lat: 10.7798, lng: 106.6352, group: 'Quận Tân Phú'),
  LocationPreset(id: 'etown-cong-hoa', name: 'Tòa nhà Etown Cộng Hòa - Phường 13', district: 'Quận Tân Bình', lat: 10.8019, lng: 106.6417, group: 'Quận Tân Bình'),
  LocationPreset(id: 'bv-thong-nhat', name: 'Bệnh viện Thống Nhất - Ngã tư Bảy Hiền', district: 'Quận Tân Bình', lat: 10.7918, lng: 106.6531, group: 'Quận Tân Bình'),
  LocationPreset(id: 'san-bay-tsn', name: 'Sân bay Tân Sơn Nhất - Trường Sơn', district: 'Quận Tân Bình', lat: 10.8132, lng: 106.6625, group: 'Quận Tân Bình'),
  LocationPreset(id: 'bau-cat', name: 'Khu Bàu Cát - Đồng Đen', district: 'Quận Tân Bình', lat: 10.7915, lng: 106.6430, group: 'Quận Tân Bình'),
  LocationPreset(id: 'aeon-binh-tan', name: 'Aeon Mall Bình Tân - Khu Tên Lửa', district: 'Quận Bình Tân', lat: 10.7428, lng: 106.6119, group: 'Quận Bình Tân'),
  LocationPreset(id: 'le-van-quoi', name: 'Đường Lê Văn Quới - Bình Hưng Hòa A', district: 'Quận Bình Tân', lat: 10.7752, lng: 106.6038, group: 'Quận Bình Tân'),
  LocationPreset(id: 'iuh-go-vap', name: 'ĐH Công Nghiệp TP.HCM (IUH) - Nguyễn Văn Bảo', district: 'Quận Gò Vấp', lat: 10.8221, lng: 106.6868, group: 'Quận Gò Vấp'),
  LocationPreset(id: 'le-duc-tho', name: 'Trục Lê Đức Thọ - Phạm Văn Chiêu', district: 'Quận Gò Vấp', lat: 10.8442, lng: 106.6635, group: 'Quận Gò Vấp'),
  LocationPreset(id: 'emart-phan-van-tri', name: 'Emart Phan Văn Trị - Cityland Park Hills', district: 'Quận Gò Vấp', lat: 10.8285, lng: 106.6912, group: 'Quận Gò Vấp'),
  LocationPreset(id: 'hutech-d2', name: 'ĐH HUTECH / Đường D2 (Nguyễn Gia Trí)', district: 'Quận Bình Thạnh', lat: 10.8018, lng: 106.7145, group: 'Quận Bình Thạnh'),
  LocationPreset(id: 'hang-xanh', name: 'Ngã tư Hàng Xanh - Điện Biên Phủ (UEF / Hồng Bàng)', district: 'Quận Bình Thạnh', lat: 10.8012, lng: 106.7112, group: 'Quận Bình Thạnh'),
  LocationPreset(id: 'van-lang', name: 'ĐH Văn Lang Cơ sở 3 - Phan Văn Trị / Đặng Thùy Trâm', district: 'Quận Bình Thạnh', lat: 10.8271, lng: 106.6995, group: 'Quận Bình Thạnh'),
  LocationPreset(id: 'thao-dien', name: 'Khu Thảo Điền - Nguyễn Văn Hưởng / Quốc Hương', district: 'TP. Thủ Đức', lat: 10.8092, lng: 106.7335, group: 'TP. Thủ Đức'),
  LocationPreset(id: 'spkt-thu-duc', name: 'Ngã tư Thủ Đức - ĐH Sư Phạm Kỹ Thuật (HCMUTE)', district: 'TP. Thủ Đức', lat: 10.8506, lng: 106.7719, group: 'TP. Thủ Đức'),
  LocationPreset(id: 'gigamall', name: 'Gigamall Phạm Văn Đồng - Hiệp Bình Chánh', district: 'TP. Thủ Đức', lat: 10.8278, lng: 106.7214, group: 'TP. Thủ Đức'),
  LocationPreset(id: 'tdtu-rmit', name: 'ĐH Tôn Đức Thắng (TDTU) & RMIT - Nguyễn Hữu Thọ', district: 'Quận 7', lat: 10.7326, lng: 106.6998, group: 'Quận 7'),
  LocationPreset(id: 'lotte-q7', name: 'Lotte Mart Quận 7 - Lê Văn Lương / Nguyễn Thị Thập', district: 'Quận 7', lat: 10.7412, lng: 106.7021, group: 'Quận 7'),
  LocationPreset(id: 'crescent-mall', name: 'Khu đô thị Phú Mỹ Hưng - Crescent Mall', district: 'Quận 7', lat: 10.7291, lng: 106.7185, group: 'Quận 7'),
  LocationPreset(id: 'bach-khoa-q10', name: 'ĐH Bách Khoa (HCMUT) - Tô Hiến Thành', district: 'Quận 10', lat: 10.7726, lng: 106.6579, group: 'Quận 10 & Phú Nhuận'),
  LocationPreset(id: 'van-hanh-mall', name: 'Vạn Hạnh Mall - Sư Vạn Hạnh (ĐH HUFLIT / Y Phạm Ngọc Thạch)', district: 'Quận 10', lat: 10.7708, lng: 106.6698, group: 'Quận 10 & Phú Nhuận'),
  LocationPreset(id: 'phan-xich-long', name: 'Phố ẩm thực Phan Xích Long - Phú Nhuận', district: 'Quận Phú Nhuận', lat: 10.7982, lng: 106.6895, group: 'Quận 10 & Phú Nhuận'),
  LocationPreset(id: 'tan-dinh-q1', name: 'Chợ Tân Định - Hai Bà Trưng / Trần Quang Khải', district: 'Quận 1', lat: 10.7905, lng: 106.6902, group: 'Trung Tâm & Khác'),
  LocationPreset(id: 'le-van-sy-q3', name: 'Trục Lê Văn Sỹ - Cách Mạng Tháng 8 (Quận 3)', district: 'Quận 3', lat: 10.7852, lng: 106.6785, group: 'Trung Tâm & Khác'),
  LocationPreset(id: 'duong-ba-trac-q8', name: 'Cầu Nguyễn Văn Cừ - Dương Bá Trạc (Quận 8)', district: 'Quận 8', lat: 10.7458, lng: 106.6875, group: 'Trung Tâm & Khác'),
  LocationPreset(id: 'phu-lam-q6', name: 'Vòng xoay Phú Lâm - Tân Hòa Đông (Quận 6)', district: 'Quận 6', lat: 10.7525, lng: 106.6285, group: 'Trung Tâm & Khác'),
  LocationPreset(id: 'cvpm-quang-trung', name: 'CVPM Quang Trung - Tô Ký (Quận 12)', district: 'Quận 12', lat: 10.8552, lng: 106.6285, group: 'Trung Tâm & Khác'),

  // Địa danh nổi tiếng (tìm qua OpenStreetMap hay ra sai chỗ, ví dụ "Landmark 81" ra "PetroVietnam Landmark" ở Thủ Đức)
  LocationPreset(id: 'landmark-81', name: 'Landmark 81 - Vinhomes Central Park', district: 'Quận Bình Thạnh', lat: 10.7950, lng: 106.7218, group: 'Địa danh nổi tiếng'),
  LocationPreset(id: 'bitexco', name: 'Tòa nhà Bitexco Financial Tower', district: 'Quận 1', lat: 10.7716, lng: 106.7044, group: 'Địa danh nổi tiếng'),
  LocationPreset(id: 'cho-ben-thanh', name: 'Chợ Bến Thành', district: 'Quận 1', lat: 10.7725, lng: 106.6980, group: 'Địa danh nổi tiếng'),
  LocationPreset(id: 'nha-tho-duc-ba', name: 'Nhà thờ Đức Bà - Bưu điện Thành phố', district: 'Quận 1', lat: 10.7798, lng: 106.6990, group: 'Địa danh nổi tiếng'),
  LocationPreset(id: 'pho-di-bo-nguyen-hue', name: 'Phố đi bộ Nguyễn Huệ', district: 'Quận 1', lat: 10.7740, lng: 106.7036, group: 'Địa danh nổi tiếng'),
  LocationPreset(id: 'dinh-doc-lap', name: 'Dinh Độc Lập', district: 'Quận 1', lat: 10.7770, lng: 106.6953, group: 'Địa danh nổi tiếng'),
  LocationPreset(id: 'bui-vien', name: 'Phố Tây Bùi Viện', district: 'Quận 1', lat: 10.7674, lng: 106.6930, group: 'Địa danh nổi tiếng'),
  LocationPreset(id: 'dam-sen', name: 'Công viên Đầm Sen', district: 'Quận 11', lat: 10.7677, lng: 106.6371, group: 'Địa danh nổi tiếng'),
  LocationPreset(id: 'lang-dai-hoc', name: 'Làng Đại học - ĐH Quốc gia TP.HCM', district: 'TP. Thủ Đức', lat: 10.8704, lng: 106.8030, group: 'Địa danh nổi tiếng'),
  LocationPreset(id: 'suoi-tien', name: 'Khu du lịch Suối Tiên', district: 'TP. Thủ Đức', lat: 10.8668, lng: 106.8031, group: 'Địa danh nổi tiếng'),
];

/// Khoảng cách theo công thức Haversine, làm tròn 2 chữ số như web.
double haversineKm(double lat1, double lng1, double lat2, double lng2) {
  const earthRadiusKm = 6371.0;
  double rad(double deg) => deg * math.pi / 180;
  final dLat = rad(lat2 - lat1);
  final dLng = rad(lng2 - lng1);
  final a =
      math.pow(math.sin(dLat / 2), 2) +
      math.cos(rad(lat1)) * math.cos(rad(lat2)) * math.pow(math.sin(dLng / 2), 2);
  final km = earthRadiusKm * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
  return double.parse(km.toStringAsFixed(2));
}

/// Điểm giữa của nhiều người (trung bình tọa độ), như chế độ "Ở giữa" của web.
({double lat, double lng}) midpointOf(List<({double lat, double lng})> points) {
  if (points.isEmpty) return (lat: 0, lng: 0);
  final lat = points.fold<double>(0, (sum, p) => sum + p.lat) / points.length;
  final lng = points.fold<double>(0, (sum, p) => sum + p.lng) / points.length;
  return (
    lat: double.parse(lat.toStringAsFixed(5)),
    lng: double.parse(lng.toStringAsFixed(5)),
  );
}

/// Tòa nhà trong bán kính và khoảng giá (triệu đồng), gần nhất trước.
List<({BuildingInfo building, double distanceKm})> matchBuildings(
  List<BuildingInfo> buildings, {
  required double lat,
  required double lng,
  required double radiusKm,
  double? minPriceMillion,
  double? maxPriceMillion,
}) {
  final minVnd = (minPriceMillion ?? 0) * 1000000;
  final maxVnd = maxPriceMillion == null
      ? double.infinity
      : maxPriceMillion * 1000000;
  final matched = [
    for (final b in buildings)
      if (b.hasCoordinates)
        (
          building: b,
          distanceKm: haversineKm(lat, lng, b.latitude, b.longitude),
        ),
  ].where((m) {
    return m.distanceKm <= radiusKm &&
        m.building.maxPrice >= minVnd &&
        m.building.minPrice <= maxVnd;
  }).toList();
  matched.sort((a, b) => a.distanceKm.compareTo(b.distanceKm));
  return matched;
}

/// Tìm trong địa điểm có sẵn theo tên hoặc quận (không phân biệt hoa thường).
List<LocationPreset> searchPresets(
  List<LocationPreset> presets,
  String query, {
  int limit = 30,
}) {
  final q = normalizeSearchText(query);
  if (q.isEmpty) return presets.take(limit).toList();
  return presets
      .where(
        (p) =>
            normalizeSearchText(p.name).contains(q) ||
            normalizeSearchText(p.district).contains(q),
      )
      .take(limit)
      .toList();
}

const _vnFrom = 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ';
const _vnTo = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd';

/// Chuẩn hóa để so khớp: chữ thường, bỏ dấu tiếng Việt (gõ "cho ben thanh" vẫn ra "Chợ Bến Thành").
String normalizeSearchText(String text) {
  final lower = text.toLowerCase().trim();
  final buffer = StringBuffer();
  for (final rune in lower.runes) {
    final char = String.fromCharCode(rune);
    final i = _vnFrom.indexOf(char);
    buffer.write(i >= 0 ? _vnTo[i] : char);
  }
  return buffer.toString();
}
