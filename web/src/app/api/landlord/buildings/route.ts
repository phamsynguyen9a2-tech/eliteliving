import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/request-session';
import prisma from '@/lib/prisma';
import { createBuilding, deleteBuilding, updateBuilding, type BuildingInput } from '@/lib/admin-crud';

async function requireLandlord() {
  const session = await getRequestSession();
  if (!session?.user) return { ok: false as const, response: NextResponse.json({ success: false, message: 'Vui lòng đăng nhập.' }, { status: 401 }) };
  if (session.user.role !== 'LANDLORD' && session.user.role !== 'ADMIN') return { ok: false as const, response: NextResponse.json({ success: false, message: 'Chỉ chủ trọ hoặc quản trị viên được quản lý khu trọ.' }, { status: 403 }) };
  return { ok: true as const, landlordId: session.user.id, role: session.user.role };
}

const targetLandlordId = (guard: { landlordId: string; role: string }, requested?: unknown) =>
  guard.role === 'ADMIN' && typeof requested === 'string' && requested.trim()
    ? requested.trim()
    : guard.landlordId;

function businessError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Không xử lý được khu trọ.';
  const status = message.startsWith('INVALID_INPUT:') ? 400
    : message.startsWith('DUPLICATE:') || message.startsWith('HAS_RECORDS:') ? 409
    : 500;
  return NextResponse.json({ success: false, message: message.replace(/^[A-Z_]+:\s*/, '') }, { status });
}

export async function GET(request: NextRequest) {
  const guard = await requireLandlord();
  if (!guard.ok) return guard.response;
  const landlordId = targetLandlordId(guard, new URL(request.url).searchParams.get('landlordId'));
  const items = await prisma.project.findMany({
    where: { landlordId },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    include: { _count: { select: { rooms: true } } },
  });
  return NextResponse.json({ success: true, data: items });
}

export async function POST(request: NextRequest) {
  const guard = await requireLandlord();
  if (!guard.ok) return guard.response;
  const body = await request.json().catch(() => ({}));
  const landlordId = targetLandlordId(guard, body.landlordId || body.data?.landlordId);
  try {
    const created = await createBuilding({ ...(body as BuildingInput), landlordId });
    return NextResponse.json({ success: true, data: created, message: 'Đã tạo khu trọ.' }, { status: 201 });
  } catch (error) {
    return businessError(error);
  }
}

export async function PUT(request: NextRequest) {
  const guard = await requireLandlord();
  if (!guard.ok) return guard.response;
  const body = await request.json().catch(() => ({}));
  const landlordId = targetLandlordId(guard, body.landlordId || body.data?.landlordId);
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const owned = code ? await prisma.project.findFirst({ where: { code, landlordId }, select: { code: true } }) : null;
  if (!owned) return NextResponse.json({ success: false, message: 'Không tìm thấy khu trọ thuộc tài khoản này.' }, { status: 404 });
  try {
    const updated = await updateBuilding(code, { ...(body.data || {}), landlordId });
    return NextResponse.json({ success: true, data: updated, message: 'Đã cập nhật khu trọ.' });
  } catch (error) {
    return businessError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const guard = await requireLandlord();
  if (!guard.ok) return guard.response;
  const searchParams = new URL(request.url).searchParams;
  const landlordId = targetLandlordId(guard, searchParams.get('landlordId'));
  const code = searchParams.get('code')?.trim() || '';
  const owned = code ? await prisma.project.findFirst({ where: { code, landlordId }, select: { code: true } }) : null;
  if (!owned) return NextResponse.json({ success: false, message: 'Không tìm thấy khu trọ thuộc tài khoản này.' }, { status: 404 });
  try {
    await deleteBuilding(code);
    return NextResponse.json({ success: true, message: 'Đã xóa khu trọ chưa có phòng.' });
  } catch (error) {
    return businessError(error);
  }
}
