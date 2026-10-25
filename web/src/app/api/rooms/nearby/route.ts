import { after, NextRequest, NextResponse } from 'next/server';
import { getRoomsNear } from '@/lib/db';
import { logSearch } from '@/lib/search-log';
import { getRequestSession } from '@/lib/request-session';

/**
 * Tìm phòng gần vị trí hiện tại: GET /api/rooms/nearby?lat=&lng=&radius=3&limit=20
 * (app người thuê lấy GPS của điện thoại rồi gọi API này).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ success: false, message: 'Thiếu hoặc sai tọa độ vị trí.' }, { status: 400 });
  }
  const radiusRaw = Number(searchParams.get('radius'));
  const radius = Number.isFinite(radiusRaw) && radiusRaw > 0 ? Math.min(radiusRaw, 15) : 3;
  const limitRaw = Number(searchParams.get('limit'));
  const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 20;

  const rooms = await getRoomsNear(lat, lng, radius, limit);

  after(async () => {
    const session = await getRequestSession().catch(() => null);
    await logSearch({
      userId: session?.user?.role === 'TENANT' ? session.user.id : null,
      source: 'MOBILE_NEARBY',
      district: rooms[0]?.district ?? null,
      resultCount: rooms.length,
    });
  });

  return NextResponse.json({ success: true, data: { radius_km: radius, center: { lat, lng }, items: rooms } });
}
