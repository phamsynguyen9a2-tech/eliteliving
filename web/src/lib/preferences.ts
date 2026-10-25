/**
 * Hồ sơ nhu cầu của người thuê (đề cương 6b: "Đăng ký, thiết lập hồ sơ nhu cầu cá nhân").
 * Được bộ gợi ý Top-K dùng làm mặc định khi người thuê không chỉnh bộ lọc trên giao diện.
 */
import prisma from './prisma';

export interface PreferenceProfile {
  budget_max: number | null;
  preferred_district: string | null;
  preferred_amenities: string[];
  target_lat: number | null;
  target_lng: number | null;
  /** Nhãn mô tả vị trí mong muốn (VD: "Gần ĐH Công Thương", "Vị trí hiện tại", tên quận) */
  target_label: string | null;
  max_radius_km: number | null;
}

export const PREFERENCE_LIMITS = {
  budgetMin: 500_000,
  budgetMax: 50_000_000,
  radiusMin: 0.5,
  radiusMax: 30,
  amenitiesMax: 15,
};

/** Kiểm tra & chuẩn hóa dữ liệu gửi lên. Ném lỗi "INVALID_PREFERENCE: …" khi sai. */
export function validatePreferenceInput(body: Record<string, unknown>): Omit<PreferenceProfile, 'target_label'> {
  const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));
  const budget = num(body.budget_max);
  if (budget === null || !Number.isFinite(budget) || budget < PREFERENCE_LIMITS.budgetMin || budget > PREFERENCE_LIMITS.budgetMax) {
    throw new Error('INVALID_PREFERENCE: Ngân sách tối đa phải từ 500.000 đ đến 50.000.000 đ/tháng.');
  }
  const radius = num(body.max_radius_km);
  if (radius === null || !Number.isFinite(radius) || radius < PREFERENCE_LIMITS.radiusMin || radius > PREFERENCE_LIMITS.radiusMax) {
    throw new Error('INVALID_PREFERENCE: Bán kính tìm phòng phải từ 0,5 đến 30 km.');
  }
  const lat = num(body.target_lat);
  const lng = num(body.target_lng);
  const hasCoords = lat !== null && lng !== null;
  if ((lat === null) !== (lng === null) || (hasCoords && (!Number.isFinite(lat) || !Number.isFinite(lng) || lat! < 8 || lat! > 24 || lng! < 102 || lng! > 110))) {
    throw new Error('INVALID_PREFERENCE: Vị trí mong muốn không hợp lệ.');
  }
  const amenities = Array.isArray(body.preferred_amenities)
    ? Array.from(new Set(body.preferred_amenities.map((a) => String(a).trim()).filter(Boolean))).slice(0, PREFERENCE_LIMITS.amenitiesMax)
    : [];
  const district = typeof body.preferred_district === 'string' && body.preferred_district.trim() ? body.preferred_district.trim().slice(0, 60) : null;
  return {
    budget_max: Math.round(budget),
    max_radius_km: Number(radius.toFixed(1)),
    target_lat: hasCoords ? Number(lat!.toFixed(6)) : null,
    target_lng: hasCoords ? Number(lng!.toFixed(6)) : null,
    preferred_amenities: amenities,
    preferred_district: district,
  };
}

export async function getPreferenceProfile(userId: string): Promise<PreferenceProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { budgetMax: true, preferredDistrict: true, preferredAmenities: true, targetLat: true, targetLng: true, maxRadiusKm: true },
  });
  if (!user) return null;
  return {
    budget_max: user.budgetMax,
    preferred_district: user.preferredDistrict,
    preferred_amenities: user.preferredAmenities,
    target_lat: user.targetLat,
    target_lng: user.targetLng,
    target_label: user.preferredDistrict,
    max_radius_km: user.maxRadiusKm,
  };
}

export async function savePreferenceProfile(userId: string, body: Record<string, unknown>): Promise<PreferenceProfile> {
  const data = validatePreferenceInput(body);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      budgetMax: data.budget_max,
      maxRadiusKm: data.max_radius_km,
      targetLat: data.target_lat,
      targetLng: data.target_lng,
      preferredAmenities: data.preferred_amenities,
      preferredDistrict: data.preferred_district,
    },
    select: { budgetMax: true, preferredDistrict: true, preferredAmenities: true, targetLat: true, targetLng: true, maxRadiusKm: true },
  });
  return {
    budget_max: updated.budgetMax,
    preferred_district: updated.preferredDistrict,
    preferred_amenities: updated.preferredAmenities,
    target_lat: updated.targetLat,
    target_lng: updated.targetLng,
    target_label: updated.preferredDistrict,
    max_radius_km: updated.maxRadiusKm,
  };
}

/** Tâm mỗi quận (trung bình tọa độ các tòa nhà) để người thuê chọn khu vực mong muốn. */
export async function getDistrictCenters(): Promise<Array<{ district: string; lat: number; lng: number }>> {
  const groups = await prisma.project.groupBy({ by: ['district'], _avg: { lat: true, lng: true }, orderBy: { district: 'asc' } });
  return groups
    .filter((g) => g._avg.lat !== null && g._avg.lng !== null)
    .map((g) => ({ district: g.district, lat: Number(g._avg.lat!.toFixed(6)), lng: Number(g._avg.lng!.toFixed(6)) }));
}
