import { NextRequest, NextResponse } from 'next/server';
import { getRooms } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const district = searchParams.get('district') || undefined;
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  const status = searchParams.get('status') || undefined;
  const search = searchParams.get('search') || undefined;
  const sort = (searchParams.get('sort') as any) || undefined;
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 12;

  const amenities = searchParams.get('amenities') ? searchParams.get('amenities')!.split(',') : undefined;

  const result = await getRooms({
    district,
    minPrice,
    maxPrice,
    status,
    search,
    sort,
    page,
    limit,
    amenities
  });

  return NextResponse.json({
    success: true,
    data: result
  });
}
