// Tên phòng để hiển thị, cùng quy tắc với web (web/src/lib/room-type.ts):
// "P.102 (Phòng trọ gác lửng sinh viên (…)) - Nhà trọ …" → "102 - Phòng có gác Tân Kỳ Tân Quý".

final RegExp _variantSuffix = RegExp(
  r'\s*\((?:gác lửng tiêu chuẩn|nội thất tiêu chuẩn|kệ bếp tiện nghi|có ban công[^)]*)\)\s*$',
  caseSensitive: false,
);

/// Bỏ phần biến thể ở cuối, giữ tên loại phòng chính.
String roomTypeBase(String? roomType) {
  var base = (roomType ?? '').trim();
  while (_variantSuffix.hasMatch(base)) {
    base = base.replaceFirst(_variantSuffix, '').trim();
  }
  return base;
}

/// Tên loại phòng gọn: bỏ "(1PN)", viết thường "phòng ngủ" / "gác lửng" ở giữa câu.
String roomTypeDisplayName(String? roomType) {
  final text = roomTypeBase(roomType)
      .replaceAll(RegExp(r'\s*\(\d+\s*PN\)\s*', caseSensitive: false), ' ')
      .replaceAll('Phòng ngủ', 'phòng ngủ')
      .replaceAllMapped(RegExp(r'(\S)\s+Gác lửng'), (m) => '${m[1]} gác lửng')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
  if (text.isEmpty) return '';
  return text[0].toUpperCase() + text.substring(1);
}

/// Phần biến thể ở cuối loại phòng (không ngoặc), ví dụ "Kệ bếp tiện nghi".
String roomTypeVariant(String? roomType) {
  final full = (roomType ?? '').trim();
  final rest = full.substring(roomTypeBase(full).length).trim();
  final match = RegExp(r'^\((.*)\)$').firstMatch(rest);
  return match == null ? '' : match.group(1)!.trim();
}

/// Loại phòng nói đơn giản: "Phòng có gác", "Phòng duplex", "Studio", "Căn 1 phòng ngủ", "Căn 2 phòng ngủ"…
String roomTypeSimpleLabel(String? roomType) {
  final base = roomTypeBase(roomType).toLowerCase();
  final bedrooms = RegExp(
    r'(^|\D)([1-9])\s*(phòng ngủ|pn(?![a-z]))',
  ).firstMatch(base);
  if (bedrooms != null) return 'Căn ${bedrooms.group(2)} phòng ngủ';
  if (base.contains('studio')) return 'Studio';
  if (base.contains('duplex') || base.contains('penthouse')) {
    return 'Phòng duplex';
  }
  return 'Phòng có gác';
}

/// Tên đường lấy từ địa chỉ: "Số 481/23/10 Đường Tân Kỳ Tân Quý, …" → "Tân Kỳ Tân Quý";
/// đường đánh số / mã (Số 72, 3/2, 339, D2) → "đường số 72", "đường 3/2"…
String streetOf(String? address) {
  final match = RegExp(
    r'Đường\s+([^,]+)',
    caseSensitive: false,
  ).firstMatch(address ?? '');
  final street = match?.group(1)?.trim() ?? '';
  if (street.isEmpty) return '';
  final numbered = RegExp(
    r'^(Số\s|\d|[A-Z]\d)',
    caseSensitive: false,
  ).hasMatch(street);
  if (!numbered) return street;
  return 'đường ${street.replaceFirst(RegExp(r'^Số(?=\s)'), 'số')}';
}

/// Số phòng: "P.102" → "102"; mã khác giữ nguyên.
String roomNumberOf(String? roomCode) => (roomCode ?? '').trim().replaceFirst(
  RegExp(r'^P\.\s*', caseSensitive: false),
  '',
);

/// Tiêu đề do hệ thống sinh theo mẫu "P.404 (loại phòng) - Tên tòa"; tiêu đề chủ trọ tự đặt thì giữ nguyên.
bool isGeneratedRoomTitle(String? title, String? roomCode) {
  final t = (title ?? '').trim();
  if (!RegExp(r'^\S+ \(.+\) - .+$').hasMatch(t)) return false;
  return roomCode == null || roomCode.isEmpty || t.startsWith('$roomCode (');
}

/// Tên phòng hiển thị: "102 - Phòng có gác Tân Kỳ Tân Quý"; tiêu đề chủ trọ tự đặt giữ nguyên.
String roomShortTitle(Map room) {
  final code = '${room['room_code'] ?? ''}'.trim();
  final title = '${room['title'] ?? ''}'.trim();
  final roomType = room['room_type']?.toString() ?? '';
  final generated = title.isEmpty || isGeneratedRoomTitle(title, code);
  if (!generated || roomType.trim().isEmpty) {
    return title.isNotEmpty ? title : code;
  }
  final kind = [
    roomTypeSimpleLabel(roomType),
    streetOf(room['address']?.toString()),
  ].where((part) => part.isNotEmpty).join(' ');
  final number = roomNumberOf(code);
  return number.isEmpty ? kind : '$number - $kind';
}
