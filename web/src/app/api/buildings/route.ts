import { after, NextRequest, NextResponse } from 'next/server';
import { getBuildings, getBuildingSummaries } from '@/lib/db';
import { logSearch } from '@/lib/search-log';
import { getRequestSession } from '@/lib/request-session';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const district = searchParams.get('district') || undefined;
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  const search = searchParams.get('search') || undefined;
  const rawAmenities = searchParams.get('amenities');
  const amenities = rawAmenities ? rawAmenities.split(',') : undefined;

  const readBuildings = searchParams.get('summary') === 'true' ? getBuildingSummaries : getBuildings;
  const buildings = await readBuildings({
    district,
    minPrice,
    maxPrice,
    search,
    amenities,
    roomType: searchParams.get('roomType') || undefined,
  });

  // Lượt tìm theo tòa nhà cũng tính vào thống kê nhu cầu tìm kiếm (không tính bản đồ tổng quan / tải mặc định)
  if (searchParams.get('log') !== '0') {
    after(async () => {
      const session = await getRequestSession().catch(() => null);
      await logSearch({
        userId: session?.user?.role === 'TENANT' ? session.user.id : null,
        source: 'WEB_SEARCH',
        district,
        keyword: search,
        minPrice,
        maxPrice,
        roomType: searchParams.get('roomType'),
        amenities,
        resultCount: buildings.reduce((sum, b) => sum + (b.available_rooms || 0), 0),
      });
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      total: buildings.length,
      items: buildings
    }
  });
}
