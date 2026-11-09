import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { lifecycleErrorResponse } from '@/lib/lifecycle-errors';
import {
  canAccessContract,
  forbidden,
  getSessionUser,
  getTenantScope,
  unauthorized,
} from '@/lib/tenant-access';
import {
  createTransferRequest,
  getTransferRequests,
  isTransferTableMissing,
  listTransferOptions,
  TRANSFER_TABLE_MISSING_MESSAGE,
} from '@/lib/room-transfer-db';
import { notifyTransferRequested } from '@/lib/room-transfer-notify';

/**
 * Đổi phòng.
 * GET  — Khách: danh sách yêu cầu của các hợp đồng mình đứng tên; kèm `?contractId=` thì trả thêm các
 *        phòng trống cùng chủ trọ có thể chuyển sang và ước tính chênh lệch.
 *        Chủ trọ: yêu cầu gửi tới các phòng của mình. Admin: tất cả (lọc `?landlordId=`).
 * POST — Khách đứng tên hợp đồng ACTIVE gửi yêu cầu { contractId, toRoomId, desiredDate, note }.
 */
function errorResponse(err: unknown, fallback: string) {
  if (isTransferTableMissing(err)) {
    return NextResponse.json({ success: false, setupRequired: true, message: TRANSFER_TABLE_MISSING_MESSAGE }, { status: 503 });
  }
  const lifecycle = lifecycleErrorResponse(err);
  if (lifecycle) return lifecycle;
  console.error('[api/contracts/transfer]', err);
  return NextResponse.json({ success: false, message: fallback }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để xem yêu cầu đổi phòng.');
    const { searchParams } = new URL(request.url);

    if (user.role === 'TENANT') {
      const scope = await getTenantScope(user.id);
      const contractId = searchParams.get('contractId');
      if (contractId) {
        if (!scope.contractIds.has(contractId)) return forbidden('Bạn không đứng tên hợp đồng này.');
        const [options, requests] = await Promise.all([
          listTransferOptions(contractId),
          getTransferRequests({ contractIds: [contractId] }),
        ]);
        return NextResponse.json({ success: true, data: { ...options, requests } });
      }
      const requests = await getTransferRequests({ contractIds: scope.contractIds });
      return NextResponse.json({ success: true, data: requests });
    }

    if (user.role !== 'LANDLORD' && user.role !== 'ADMIN') {
      return forbidden('Bạn không có quyền xem yêu cầu đổi phòng.');
    }
    const landlordId = user.role === 'LANDLORD' ? user.id : searchParams.get('landlordId') || null;
    const requests = await getTransferRequests({ landlordId });
    return NextResponse.json({ success: true, data: requests });
  } catch (err) {
    return errorResponse(err, 'Không tải được yêu cầu đổi phòng.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để gửi yêu cầu đổi phòng.');
    if (user.role !== 'TENANT') return forbidden('Chỉ khách thuê đứng tên hợp đồng mới gửi được yêu cầu đổi phòng.');

    const body = await request.json().catch(() => ({}));
    const contractId = typeof body.contractId === 'string' ? body.contractId : '';
    const toRoomId = Number(body.toRoomId);
    const desiredDate = typeof body.desiredDate === 'string' ? body.desiredDate.trim() : '';
    if (!contractId || !Number.isInteger(toRoomId) || toRoomId <= 0) {
      return NextResponse.json({ success: false, message: 'Thiếu hợp đồng hoặc phòng muốn chuyển sang.' }, { status: 400 });
    }

    const contract = await prisma.contract.findUnique({ where: { id: contractId }, select: { id: true, roomId: true } });
    if (!contract) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy hợp đồng.' }, { status: 404 });
    }
    if (!(await canAccessContract(user, contract))) {
      return forbidden('Bạn không đứng tên hợp đồng này nên không thể yêu cầu đổi phòng.');
    }

    const created = await createTransferRequest({
      contractId,
      toRoomId,
      desiredDate,
      note: typeof body.note === 'string' ? body.note : null,
      tenantUserId: user.id,
    });

    // Ước tính chênh lệch (chưa gồm điện nước) để chủ trọ thấy ngay trong thông báo
    let estimateTotal: number | null = null;
    try {
      const options = await listTransferOptions(contractId);
      estimateTotal = options.options.find((o) => o.room.id === toRoomId)?.estimate.totalDiff ?? null;
    } catch {
      estimateTotal = null;
    }
    await notifyTransferRequested(created.view, estimateTotal);

    return NextResponse.json({
      success: true,
      message: `Đã gửi yêu cầu đổi sang phòng ${created.view.to_room?.room_code || toRoomId}. Hợp đồng hiện tại giữ nguyên cho tới khi chủ trọ duyệt.`,
      data: created.view,
    });
  } catch (err) {
    return errorResponse(err, 'Không gửi được yêu cầu đổi phòng.');
  }
}
