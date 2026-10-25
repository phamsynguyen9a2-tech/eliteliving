import { NextRequest, NextResponse } from 'next/server';
import { businessErrorResponse, requireAdmin } from '@/lib/admin-guard';
import { addAmenity, deleteAmenity, updateAmenity } from '@/lib/admin-crud';
import { getAmenityCatalog, getPricingDefaults, savePricingDefaults } from '@/lib/db';
import prisma from '@/lib/prisma';

const ERRORS = { INVALID_INPUT: 400, DUPLICATE: 409, INVALID_PRICE: 400 };

/** Danh mục tiện ích (kèm số phòng đang dùng) + đơn giá dịch vụ mặc định */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const [amenities, pricing, usage] = await Promise.all([
    getAmenityCatalog(),
    getPricingDefaults(),
    prisma.$queryRaw<Array<{ name: string; count: bigint }>>`SELECT unnest(amenities) AS name, COUNT(*) AS count FROM rooms GROUP BY 1`,
  ]);
  const usageByName = new Map(usage.map((u) => [u.name, Number(u.count)]));
  return NextResponse.json({
    success: true,
    data: {
      amenities: amenities.map((a) => ({ ...a, roomCount: usageByName.get(a.name) ?? 0 })),
      pricing,
    },
  });
}

/**
 * POST { action: 'ADD_AMENITY', name, category }
 *      { action: 'UPDATE_AMENITY', id, name?, category?, isActive? }
 *      { action: 'DELETE_AMENITY', id }
 *      { action: 'SAVE_PRICING', pricing: { electricityRate, waterRate, internetFee, serviceFee, parkingFee } }
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const body = await request.json().catch(() => ({}));
  try {
    switch (body.action) {
      case 'ADD_AMENITY':
        return NextResponse.json({ success: true, data: await addAmenity(body.name, body.category), message: 'Đã thêm tiện ích.' });
      case 'UPDATE_AMENITY': {
        const row = await updateAmenity(Number(body.id), body);
        if (!row) return NextResponse.json({ success: false, message: 'Không tìm thấy tiện ích.' }, { status: 404 });
        return NextResponse.json({ success: true, data: row, message: 'Đã lưu tiện ích.' });
      }
      case 'DELETE_AMENITY': {
        const ok = await deleteAmenity(Number(body.id));
        return NextResponse.json({ success: ok, message: ok ? 'Đã xóa tiện ích khỏi danh mục.' : 'Không tìm thấy tiện ích.' }, { status: ok ? 200 : 404 });
      }
      case 'SAVE_PRICING':
        return NextResponse.json({ success: true, data: await savePricingDefaults(body.pricing || {}), message: 'Đã lưu đơn giá mặc định. Áp dụng cho phòng thêm mới.' });
      default:
        return NextResponse.json({ success: false, message: 'Thao tác không hợp lệ.' }, { status: 400 });
    }
  } catch (err) {
    const mapped = businessErrorResponse(err, ERRORS);
    if (mapped) return mapped;
    throw err;
  }
}
