/**
 * Kiểm tra tự động hỗ trợ admin thẩm định tin đăng: thông tin phòng, tọa độ, giá thuê,
 * diện tích, tiện ích, hình ảnh. Chỉ là gợi ý — quyết định duyệt vẫn do admin.
 */
export interface ListingCheckInput {
  title?: string | null;
  price?: number | null;
  deposit?: number | null;
  area?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  district?: string | null;
  amenities?: string[] | null;
  images?: string[] | null;
  description?: string | null;
}

export interface ListingCheck {
  key: 'info' | 'location' | 'price' | 'area' | 'amenities' | 'images';
  label: string;
  ok: boolean;
  detail: string;
}

/** Khung tọa độ TP.HCM (kể cả TP. Thủ Đức, Củ Chi, Cần Giờ) */
export const HCMC_BOUNDS = { minLat: 10.3, maxLat: 11.2, minLng: 106.3, maxLng: 107.1 };

export function runListingChecks(room: ListingCheckInput): ListingCheck[] {
  const price = Number(room.price);
  const deposit = Number(room.deposit);
  const area = Number(room.area);
  const lat = Number(room.latitude);
  const lng = Number(room.longitude);
  const images = (room.images || []).filter((url) => /^(https?:\/\/|data:image\/)/i.test(String(url).trim()));
  const amenities = (room.amenities || []).filter((a) => String(a).trim());
  const titleOk = String(room.title || '').trim().length >= 10;
  const addressOk = String(room.address || '').trim().length >= 10 && String(room.district || '').trim().length > 0;
  const inHcmc =
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= HCMC_BOUNDS.minLat && lat <= HCMC_BOUNDS.maxLat &&
    lng >= HCMC_BOUNDS.minLng && lng <= HCMC_BOUNDS.maxLng;
  const priceOk = Number.isFinite(price) && price >= 500_000 && price <= 50_000_000;
  const depositOk = !Number.isFinite(deposit) || deposit <= 0 || (deposit >= price * 0.5 && deposit <= price * 3);
  const areaOk = Number.isFinite(area) && area >= 8 && area <= 200;
  const pricePerM2 = areaOk && priceOk ? price / area : 0;

  return [
    {
      key: 'info',
      label: 'Thông tin phòng',
      ok: titleOk && addressOk,
      detail: !titleOk ? 'Tiêu đề quá ngắn (cần ≥ 10 ký tự)' : !addressOk ? 'Thiếu địa chỉ chi tiết hoặc quận' : 'Đủ tiêu đề, địa chỉ, quận',
    },
    {
      key: 'location',
      label: 'Tọa độ vị trí',
      ok: inHcmc,
      detail: inHcmc ? `${lat.toFixed(5)}, ${lng.toFixed(5)} nằm trong TP.HCM` : 'Tọa độ trống hoặc nằm ngoài TP.HCM',
    },
    {
      key: 'price',
      label: 'Bảng giá thuê',
      ok: priceOk && depositOk,
      detail: !priceOk
        ? 'Giá thuê ngoài khoảng 0,5 – 50 triệu/tháng'
        : !depositOk
        ? 'Tiền cọc nên từ 0,5 đến 3 tháng tiền phòng'
        : `${Math.round(pricePerM2).toLocaleString('vi-VN')} đ/m²`,
    },
    {
      key: 'area',
      label: 'Diện tích',
      ok: areaOk,
      detail: areaOk ? `${area} m²` : 'Diện tích ngoài khoảng 8 – 200 m²',
    },
    {
      key: 'amenities',
      label: 'Tiện ích',
      ok: amenities.length >= 2,
      detail: amenities.length >= 2 ? `${amenities.length} tiện ích` : 'Cần ít nhất 2 tiện ích',
    },
    {
      key: 'images',
      label: 'Hình ảnh thực tế',
      ok: images.length >= 1,
      detail: images.length >= 1 ? `${images.length} ảnh` : 'Chưa có ảnh thực tế của phòng',
    },
  ];
}

/** Các trường nội dung tin đăng: chủ trọ sửa một trong các trường này thì tin phải được duyệt lại. */
const LISTING_CONTENT_FIELDS = [
  ['title', 'title'],
  ['price', 'price'],
  ['deposit', 'deposit'],
  ['area', 'area'],
  ['room_type', 'roomType'],
  ['address', 'address'],
  ['district', 'district'],
  ['latitude', 'latitude'],
  ['longitude', 'longitude'],
  ['amenities', 'amenities'],
  ['images', 'images'],
  ['description', 'description'],
] as const;

export function listingContentChanged(existing: Record<string, unknown>, data: Record<string, unknown>): boolean {
  return LISTING_CONTENT_FIELDS.some(([inKey, dbKey]) => {
    if (data[inKey] === undefined) return false;
    const next = data[inKey];
    const prev = existing[dbKey];
    if (Array.isArray(next) || Array.isArray(prev)) {
      const a = Array.isArray(next) ? next.map((v) => String(v).trim()).filter(Boolean) : [];
      const b = Array.isArray(prev) ? prev.map((v) => String(v).trim()).filter(Boolean) : [];
      return a.length !== b.length || a.some((v, i) => v !== b[i]);
    }
    if (typeof prev === 'number') return Number(next) !== prev;
    return String(next ?? '').trim() !== String(prev ?? '').trim();
  });
}
