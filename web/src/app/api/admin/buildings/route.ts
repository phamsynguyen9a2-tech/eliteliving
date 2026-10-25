import { NextRequest, NextResponse } from 'next/server';
import { businessErrorResponse, requireAdmin } from '@/lib/admin-guard';
import { createBuilding, deleteBuilding, updateBuilding } from '@/lib/admin-crud';

const ERRORS = { INVALID_INPUT: 400, DUPLICATE: 409, HAS_RECORDS: 409 };

/** Thêm khu trọ / tòa nhà */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const body = await request.json().catch(() => ({}));
  try {
    const building = await createBuilding(body);
    return NextResponse.json({ success: true, data: building, message: `Đã thêm tòa nhà ${building.name}.` });
  } catch (err) {
    const mapped = businessErrorResponse(err, ERRORS);
    if (mapped) return mapped;
    throw err;
  }
}

/** Sửa tòa nhà: { code, ...fields } */
export async function PUT(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code : '';
  try {
    const building = code ? await updateBuilding(code, body) : null;
    if (!building) return NextResponse.json({ success: false, message: 'Không tìm thấy tòa nhà.' }, { status: 404 });
    return NextResponse.json({ success: true, data: building, message: `Đã lưu tòa nhà ${building.name}.` });
  } catch (err) {
    const mapped = businessErrorResponse(err, ERRORS);
    if (mapped) return mapped;
    throw err;
  }
}

/** Xóa tòa nhà trống: DELETE ?code= */
export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const code = new URL(request.url).searchParams.get('code') || '';
  try {
    const ok = await deleteBuilding(code);
    if (!ok) return NextResponse.json({ success: false, message: 'Không tìm thấy tòa nhà.' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Đã xóa tòa nhà.' });
  } catch (err) {
    const mapped = businessErrorResponse(err, ERRORS);
    if (mapped) return mapped;
    throw err;
  }
}
