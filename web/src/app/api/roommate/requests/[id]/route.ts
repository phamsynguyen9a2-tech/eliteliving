import { NextRequest, NextResponse } from 'next/server';
import {
  requireRoommateSession,
  authorizeRequestStatusChange,
  saveRequestStatus,
} from '@/lib/roommate-request-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRoommateSession();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['ACCEPTED', 'REJECTED', 'PENDING'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Trạng thái không hợp lệ' },
        { status: 400 }
      );
    }

    const forbidden = await authorizeRequestStatusChange(id, auth.session);
    if (forbidden) return forbidden;

    // Lưu CSDL trước rồi mới đồng bộ bộ nhớ; lỗi CSDL được báo thật, không báo thành công
    const saved = await saveRequestStatus(id, status);
    if ('error' in saved) return saved.error;
    return NextResponse.json({ success: true, data: saved.data, message: `Cập nhật trạng thái thành ${status}` });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// /ho-so gọi PATCH /api/roommate/requests/[id] — dùng chung logic với PUT
export const PATCH = PUT;
