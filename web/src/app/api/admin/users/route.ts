import { NextRequest, NextResponse } from 'next/server';
import { businessErrorResponse, requireAdmin } from '@/lib/admin-guard';
import { deleteAccount, updateAccount } from '@/lib/admin-crud';
import { setAccountBlockedStatus } from '@/lib/account-status';

const ERRORS = { INVALID_INPUT: 400, DUPLICATE: 409, HAS_RECORDS: 409, FORBIDDEN: 403 };

/** Sửa thông tin tài khoản: { userId, name, email, phone } */
export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === 'string' ? body.userId : '';
  try {
    const result = userId ? await updateAccount(userId, body) : null;
    if (!result) return NextResponse.json({ success: false, message: 'Không tìm thấy tài khoản.' }, { status: 404 });
    return NextResponse.json({
      success: true,
      data: result,
      message: result.phoneReverification
        ? 'Đã lưu tài khoản. Số điện thoại mới cần được người dùng xác minh lại.'
        : 'Đã lưu thông tin tài khoản.',
    });
  } catch (err) {
    const mapped = businessErrorResponse(err, ERRORS);
    if (mapped) return mapped;
    throw err;
  }
}

/** Xóa tài khoản không còn dữ liệu nghiệp vụ: DELETE ?id= */
export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const id = new URL(request.url).searchParams.get('id') || '';
  try {
    const ok = await deleteAccount(id, guard.userId);
    if (!ok) return NextResponse.json({ success: false, message: 'Không tìm thấy tài khoản.' }, { status: 404 });
    setAccountBlockedStatus(id, true); // thu hồi ngay phiên đang mở của tài khoản đã xóa
    return NextResponse.json({ success: true, message: 'Đã xóa tài khoản.' });
  } catch (err) {
    const mapped = businessErrorResponse(err, ERRORS);
    if (mapped) return mapped;
    throw err;
  }
}
