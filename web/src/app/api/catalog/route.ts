import { NextResponse } from 'next/server';
import { getAmenityCatalog, getPricingDefaults } from '@/lib/db';

/** Danh mục tiện ích đang dùng + đơn giá mặc định (công khai, dùng cho form đăng phòng và bộ lọc). */
export async function GET() {
  const [amenities, pricing] = await Promise.all([getAmenityCatalog({ activeOnly: true }), getPricingDefaults()]);
  return NextResponse.json({ success: true, data: { amenities: amenities.map((a) => ({ name: a.name, category: a.category })), pricing } });
}
