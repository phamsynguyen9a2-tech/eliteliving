/**
 * Phân loại loại phòng cho bộ lọc "Gác lửng / Studio / 1PN / 2PN".
 *
 * Dữ liệu `room_type` có dạng "<tên loại chính> (<biến thể>)", ví dụ
 * "Studio Full nội thất cao cấp (Gác lửng tiêu chuẩn)". Phần biến thể ở cuối
 * mô tả cách bày trí và gắn cho mọi loại phòng, nên nếu dò chữ "gác" trên cả
 * chuỗi thì Studio/1PN/2PN đều bị coi là phòng gác lửng. Bộ lọc chỉ được dựa
 * vào tên loại chính.
 */
export type RoomTypeClass = 'gac_lung' | 'studio' | '1pn' | '2pn';

export const ROOM_TYPE_FILTERS: readonly RoomTypeClass[] = ['gac_lung', 'studio', '1pn', '2pn'];

const VARIANT_SUFFIX = /\s*\((?:gác lửng tiêu chuẩn|nội thất tiêu chuẩn|kệ bếp tiện nghi|có ban công[^)]*)\)\s*$/i;

/** Bỏ phần biến thể ở cuối, giữ tên loại phòng chính. */
export function roomTypeBase(roomType: string | null | undefined): string {
  let base = (roomType || '').trim();
  // Lặp phòng trường hợp bị nối nhiều biến thể
  while (VARIANT_SUFFIX.test(base)) base = base.replace(VARIANT_SUFFIX, '').trim();
  return base;
}

export function classifyRoomType(roomType: string | null | undefined): RoomTypeClass {
  const base = roomTypeBase(roomType).toLowerCase();
  // Không dùng \b: trong JS \b không nhận chữ có dấu tiếng Việt ("ngủ")
  // Từ 2 phòng ngủ trở lên (2PN, 3PN…) đều thuộc nhóm lọc "2 phòng ngủ"
  if (/(^|\D)[2-9]\s*(phòng ngủ|pn(?![a-z]))/.test(base)) return '2pn';
  if (/(^|\D)1\s*(phòng ngủ|pn(?![a-z]))/.test(base)) return '1pn';
  if (base.includes('studio')) return 'studio';
  // Duplex, gác lửng, gác cao và các phòng trọ thường còn lại đều là phòng có gác
  return 'gac_lung';
}

export function matchesRoomTypeFilter(roomType: string | null | undefined, requested?: string | null): boolean {
  if (!requested || requested === 'all') return true;
  const rt = requested.toLowerCase();
  if (!(ROOM_TYPE_FILTERS as readonly string[]).includes(rt)) return true;
  return classifyRoomType(roomType) === rt;
}

/** Phòng không thuộc loại gác lửng thì không hiển thị tiện ích "Gác lửng". */
export function isLoftAmenity(amenity: string): boolean {
  return /^gác lửng/i.test(amenity.trim());
}

export function amenitiesForRoomType(amenities: string[], roomType: string | null | undefined): string[] {
  if (classifyRoomType(roomType) === 'gac_lung') return amenities;
  return amenities.filter((a) => !isLoftAmenity(a));
}

/** Nhãn ngắn cho ô phòng: "Duplex", "Gác lửng", "Studio", "1PN", "2PN". */
export function roomTypeShortLabel(roomType: string | null | undefined): string {
  const cls = classifyRoomType(roomType);
  if (cls === '2pn') {
    const n = roomTypeBase(roomType).match(/([2-9])\s*(?:phòng ngủ|pn)/i)?.[1] ?? '2';
    return `${n}PN`;
  }
  if (cls === '1pn') return '1PN';
  if (cls === 'studio') return 'Studio';
  return /duplex|penthouse/i.test(roomTypeBase(roomType)) ? 'Duplex' : 'Gác lửng';
}

/** Tiện ích của tòa: chỉ giữ "Gác lửng" khi tòa thật sự có phòng loại gác lửng. */
export function buildingAmenitiesForRoomTypes(amenities: string[], roomTypes: readonly (string | null | undefined)[]): string[] {
  if (roomTypes.length === 0 || roomTypes.some((t) => classifyRoomType(t) === 'gac_lung')) return amenities;
  return amenities.filter((a) => !isLoftAmenity(a));
}

const SHORT_LABEL_ORDER = ['Gác lửng', 'Duplex', 'Studio', '1PN', '2PN', '3PN', '4PN'];

/** Danh sách tag loại phòng (không trùng, theo thứ tự cố định) cho thẻ tòa nhà. */
export function roomTypeTags(roomTypes: readonly (string | null | undefined)[]): string[] {
  const tags = [...new Set(roomTypes.filter(Boolean).map((t) => roomTypeShortLabel(t)))];
  const rank = (tag: string) => { const i = SHORT_LABEL_ORDER.indexOf(tag); return i < 0 ? SHORT_LABEL_ORDER.length : i; };
  return tags.sort((a, b) => rank(a) - rank(b));
}

/**
 * Tên loại phòng để hiển thị: bỏ mã "(1PN)" và phần biến thể ở cuối, viết thường "phòng ngủ" / "gác lửng".
 * Ví dụ "1 Phòng ngủ (1PN) riêng biệt (Kệ bếp tiện nghi)" → "1 phòng ngủ riêng biệt".
 */
export function roomTypeDisplayName(roomType: string | null | undefined): string {
  const text = roomTypeBase(roomType)
    .replace(/\s*\(\d+\s*PN\)\s*/gi, ' ')
    .replace(/Phòng ngủ/g, 'phòng ngủ')
    .replace(/(\S)\s+Gác lửng/g, '$1 gác lửng')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

/** Phần biến thể ở cuối loại phòng (không ngoặc), ví dụ "Kệ bếp tiện nghi"; không có thì chuỗi rỗng. */
export function roomTypeVariant(roomType: string | null | undefined): string {
  const full = (roomType || '').trim();
  const rest = full.slice(roomTypeBase(full).length).trim();
  const match = rest.match(/^\((.*)\)$/);
  return match ? match[1].trim() : '';
}

type RoomTitleInput = {
  room_code?: string | null;
  room_type?: string | null;
  title?: string | null;
  address?: string | null;
};

/** Tiêu đề do hệ thống sinh theo mẫu "P.404 (loại phòng) - Tên tòa"; tiêu đề chủ trọ tự đặt thì giữ nguyên. */
export function isGeneratedRoomTitle(title: string | null | undefined, roomCode?: string | null): boolean {
  const t = (title || '').trim();
  if (!/^\S+ \(.+\) - .+$/.test(t)) return false;
  return !roomCode || t.startsWith(`${roomCode} (`);
}

/** Loại phòng nói đơn giản: "Phòng có gác", "Phòng duplex", "Studio", "Căn 1 phòng ngủ", "Căn 2 phòng ngủ"… */
export function roomTypeSimpleLabel(roomType: string | null | undefined): string {
  const cls = classifyRoomType(roomType);
  const label = roomTypeShortLabel(roomType);
  if (cls === '1pn' || cls === '2pn') return `Căn ${label.replace('PN', '')} phòng ngủ`;
  if (cls === 'studio') return 'Studio';
  return label === 'Duplex' ? 'Phòng duplex' : 'Phòng có gác';
}

/** Tên đường lấy từ địa chỉ: "Số 481/23/10 Đường Tân Kỳ Tân Quý, …" → "Tân Kỳ Tân Quý"; đường đánh số → "đường số 72". */
export function streetOf(address: string | null | undefined): string {
  const match = (address || '').normalize('NFC').match(/Đường\s+([^,]+)/i);
  const street = match ? match[1].trim() : '';
  if (!street) return '';
  // Đường đánh số / mã (Số 72, 3/2, 339, D2, N8, C34): thêm chữ "đường" cho dễ đọc
  return /^(Số\s|\d|[A-Z]\d)/i.test(street) ? `đường ${street.replace(/^Số(?=\s)/i, 'số')}` : street;
}

/** Số phòng: "P.102" → "102"; mã khác giữ nguyên. */
export function roomNumberOf(roomCode: string | null | undefined): string {
  const code = (roomCode || '').trim();
  return code.replace(/^P\.\s*/i, '');
}

/** Tên phòng hiển thị: "102 - Phòng có gác Tân Kỳ Tân Quý". Tiêu đề chủ trọ tự đặt thì giữ nguyên. */
export function roomShortTitle(room: RoomTitleInput): string {
  if (!isGeneratedRoomTitle(room.title, room.room_code) || !room.room_type) {
    return room.title || room.room_code || '';
  }
  const kind = [roomTypeSimpleLabel(room.room_type), streetOf(room.address)].filter(Boolean).join(' ');
  const number = roomNumberOf(room.room_code);
  return number ? `${number} - ${kind}` : kind;
}

/** Tiêu đề trang chi tiết / popup: cùng dạng với thẻ phòng. */
export function roomHeading(room: RoomTitleInput): string {
  return roomShortTitle(room);
}

/**
 * Tách tiêu đề phòng lưu sẵn (hợp đồng, lịch hẹn lưu tên phòng lúc tạo) thành tên gọn + tên tòa.
 * "P.105 (1 Phòng ngủ (1PN) riêng biệt (Kệ bếp tiện nghi)) - Chung cư mini Hồ Đắc Di"
 *   → { heading: "105 - Căn 1 phòng ngủ", building: "Chung cư mini Hồ Đắc Di" }.
 * Tiêu đề không theo mẫu thì giữ nguyên.
 */
export function splitRoomTitle(title: string | null | undefined): { heading: string; building: string } {
  const text = (title || '').trim();
  const match = text.match(/^(\S+) \((.+)\) - (.+)$/);
  if (!match) return { heading: text, building: '' };
  return {
    heading: roomShortTitle({ room_code: match[1], room_type: match[2], title: text }),
    building: match[3].trim(),
  };
}
