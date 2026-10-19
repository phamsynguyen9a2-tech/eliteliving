import { NextRequest, NextResponse } from 'next/server';
import { getBuildings, getBuildingSummaries } from '@/lib/db';

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

  return NextResponse.json({
    success: true,
    data: {
      total: buildings.length,
      items: buildings
    }
  });
}
