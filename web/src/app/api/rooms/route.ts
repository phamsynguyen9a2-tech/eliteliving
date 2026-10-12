import { NextRequest, NextResponse } from 'next/server';
import { getRooms } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parseNonNegativeNumber = (value: string | null) => {
    if (value === null || value.trim() === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  };

  const district = searchParams.get('district') || undefined;
  const rawMinPrice = parseNonNegativeNumber(searchParams.get('minPrice'));
  const rawMaxPrice = parseNonNegativeNumber(searchParams.get('maxPrice'));
  const minPrice = rawMinPrice !== undefined && rawMaxPrice !== undefined
    ? Math.min(rawMinPrice, rawMaxPrice)
    : rawMinPrice;
  const maxPrice = rawMinPrice !== undefined && rawMaxPrice !== undefined
    ? Math.max(rawMinPrice, rawMaxPrice)
    : rawMaxPrice;
  // Đây là endpoint tìm kiếm công khai cho khách thuê: không cho query string
  // mở rộng sang phòng giữ chỗ/đang thuê hoặc các trạng thái nội bộ.
  const status = 'AVAILABLE';
  const search = searchParams.get('search')?.trim().slice(0, 100) || undefined;
  const requestedSort = searchParams.get('sort');
  const sort = requestedSort === 'price_asc' || requestedSort === 'price_desc' || requestedSort === 'newest'
    ? requestedSort
    : undefined;
  const requestedPage = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
  const requestedLimit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 12;
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(48, Math.max(1, Math.floor(requestedLimit)))
    : 12;

  const amenities = searchParams.get('amenities')
    ?.split(',')
    .map((amenity) => amenity.trim())
    .filter(Boolean)
    .slice(0, 20);
  const roomType = searchParams.get('roomType') || undefined;
  const maxElectricity = parseNonNegativeNumber(searchParams.get('maxElectricity'));
  const petFriendly = searchParams.get('petFriendly') === 'true' ? true : undefined;
  const occupants = searchParams.get('occupants') || undefined;
  const bikes = searchParams.get('bikes') || undefined;
  const freeService = searchParams.get('freeService') === 'true' || searchParams.get('serviceFeeType') === 'free';
  const moveInTime = searchParams.get('moveInTime') || undefined;

  const result = await getRooms({
    district,
    minPrice,
    maxPrice,
    status,
    search,
    sort,
    page,
    limit,
    amenities,
    roomType,
    maxElectricity,
    petFriendly,
    occupants,
    bikes,
    freeService,
    moveInTime,
  });

  return NextResponse.json({
    success: true,
    data: result
  });
}
