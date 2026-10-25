import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/request-session';
import { businessErrorResponse } from '@/lib/admin-guard';
import { getDistrictCenters, getPreferenceProfile, savePreferenceProfile } from '@/lib/preferences';
import { getAmenityCatalog } from '@/lib/db';

async function tenantId() {
  const session = await getRequestSession().catch(() => null);
  return session?.user?.id && session.user.role === 'TENANT' ? session.user.id : null;
}

/** Hồ sơ nhu cầu của người thuê + danh mục để chọn (quận, tiện ích). */
export async function GET() {
  const userId = await tenantId();
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập tài khoản người thuê.' }, { status: 401 });
  }
  const [profile, districts, amenities] = await Promise.all([
    getPreferenceProfile(userId),
    getDistrictCenters(),
    getAmenityCatalog({ activeOnly: true }),
  ]);
  return NextResponse.json({
    success: true,
    data: { profile, options: { districts, amenities: amenities.map((a) => a.name) } },
  });
}

/** Lưu hồ sơ nhu cầu: { budget_max, max_radius_km, target_lat, target_lng, preferred_district, preferred_amenities } */
export async function PUT(request: NextRequest) {
  const userId = await tenantId();
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập tài khoản người thuê.' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  try {
    const profile = await savePreferenceProfile(userId, body);
    return NextResponse.json({ success: true, data: profile, message: 'Đã lưu hồ sơ nhu cầu. Gợi ý Top-K sẽ dùng hồ sơ này.' });
  } catch (err) {
    const mapped = businessErrorResponse(err, { INVALID_PREFERENCE: 400 });
    if (mapped) return mapped;
    throw err;
  }
}
