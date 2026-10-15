import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateRequestStatus } from '@/lib/roommate-store';
import { requireRoommateSession, authorizeRequestStatusChange } from '@/lib/roommate-request-auth';

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

    // Giữ in-memory store đồng bộ với DB
    updateRequestStatus(id, status);

    try {
      const updated = await prisma.roommateRequest.update({
        where: { id },
        data: { status: status as any },
      });
      return NextResponse.json({ success: true, data: updated });
    } catch {
      return NextResponse.json({ success: true, message: `Cập nhật trạng thái thành ${status}` });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// /ho-so gọi PATCH /api/roommate/requests/[id] — dùng chung logic với PUT
export const PATCH = PUT;
