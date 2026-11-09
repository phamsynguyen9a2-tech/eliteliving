import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { lifecycleErrorResponse } from '@/lib/lifecycle-errors';
import {
  forbidden,
  getSessionUser,
  getTenantScope,
  landlordOwnsRoom,
  unauthorized,
  type SessionUser,
} from '@/lib/tenant-access';
import {
  approveTransferRequest,
  closeTransferRequest,
  getApprovalPreview,
  getTransferRequestById,
  isTransferTableMissing,
  TRANSFER_TABLE_MISSING_MESSAGE,
  updateTransferSettlement,
} from '@/lib/room-transfer-db';
import {
  notifyTransferApproved,
  notifyTransferCancelled,
  notifyTransferPaymentReported,
  notifyTransferRejected,
  notifyTransferSettled,
} from '@/lib/room-transfer-notify';
import { describeTransferDiff, parseTransactionCode } from '@/lib/room-transfer';

/**
 * Một yêu cầu đổi phòng.
 * GET   — Chủ trọ: số liệu cho màn duyệt (chỉ số kỳ trước, ước tính). Khách: chi tiết yêu cầu của mình.
 * PATCH — { action }:
 *   CANCEL            khách hủy yêu cầu đang chờ
 *   REPORT_PAYMENT    khách báo đã chuyển khoản chênh lệch { transactionCode }
 *   APPROVE           chủ trọ duyệt { oldElectricFinal, oldWaterFinal, newElectricStart, newWaterStart,
 *                     oldElectricPrev?, oldWaterPrev?, damageCost? }
 *   REJECT            chủ trọ từ chối { reason }
 *   CONFIRM_SETTLEMENT chủ trọ xác nhận đã thu / đã hoàn chênh lệch
 * Chỉ khách đứng tên hợp đồng (SĐT đã xác minh) thao tác phía khách; chỉ chủ trọ sở hữu CẢ HAI phòng
 * (hoặc admin) thao tác phía chủ trọ.
 */
type Params = { params: Promise<{ id: string }> };

function errorResponse(err: unknown, fallback: string) {
  if (isTransferTableMissing(err)) {
    return NextResponse.json({ success: false, setupRequired: true, message: TRANSFER_TABLE_MISSING_MESSAGE }, { status: 503 });
  }
  const lifecycle = lifecycleErrorResponse(err);
  if (lifecycle) return lifecycle;
  console.error('[api/contracts/transfer/:id]', err);
  return NextResponse.json({ success: false, message: fallback }, { status: 500 });
}

async function loadAccess(user: SessionUser, id: string) {
  const request = await prisma.roomTransferRequest.findUnique({
    where: { id },
    select: { id: true, fromContractId: true, fromRoomId: true, toRoomId: true, tenantUserId: true },
  });
  if (!request) return { request: null, side: null as null | 'TENANT' | 'LANDLORD' };
  if (user.role === 'TENANT') {
    const scope = await getTenantScope(user.id);
    return { request, side: scope.contractIds.has(request.fromContractId) ? ('TENANT' as const) : null };
  }
  if (user.role === 'ADMIN') return { request, side: 'LANDLORD' as const };
  if (user.role === 'LANDLORD') {
    const [ownsFrom, ownsTo] = await Promise.all([
      landlordOwnsRoom(user.id, request.fromRoomId),
      landlordOwnsRoom(user.id, request.toRoomId),
    ]);
    return { request, side: ownsFrom && ownsTo ? ('LANDLORD' as const) : null };
  }
  return { request, side: null };
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để xem yêu cầu đổi phòng.');
    const { id } = await params;
    const { request, side } = await loadAccess(user, id);
    if (!request) return NextResponse.json({ success: false, message: 'Không tìm thấy yêu cầu đổi phòng.' }, { status: 404 });
    if (!side) return forbidden('Bạn không có quyền xem yêu cầu đổi phòng này.');
    if (side === 'LANDLORD') {
      const preview = await getApprovalPreview(id);
      return NextResponse.json({ success: true, data: preview });
    }
    return NextResponse.json({ success: true, data: await getTransferRequestById(id) });
  } catch (err) {
    return errorResponse(err, 'Không tải được yêu cầu đổi phòng.');
  }
}

const TENANT_ACTIONS = new Set(['CANCEL', 'REPORT_PAYMENT']);
const LANDLORD_ACTIONS = new Set(['APPROVE', 'REJECT', 'CONFIRM_SETTLEMENT']);

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để xử lý yêu cầu đổi phòng.');
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action.toUpperCase() : '';
    if (!TENANT_ACTIONS.has(action) && !LANDLORD_ACTIONS.has(action)) {
      return NextResponse.json({ success: false, message: 'Thao tác không hợp lệ.' }, { status: 400 });
    }

    const { request: transfer, side } = await loadAccess(user, id);
    if (!transfer) return NextResponse.json({ success: false, message: 'Không tìm thấy yêu cầu đổi phòng.' }, { status: 404 });
    if (!side) return forbidden('Bạn không có quyền xử lý yêu cầu đổi phòng này.');
    if (TENANT_ACTIONS.has(action) && side !== 'TENANT') {
      return forbidden('Chỉ khách đứng tên hợp đồng mới thực hiện được thao tác này.');
    }
    if (LANDLORD_ACTIONS.has(action) && side !== 'LANDLORD') {
      return forbidden('Chỉ chủ trọ sở hữu cả hai phòng mới duyệt được yêu cầu đổi phòng.');
    }

    if (action === 'CANCEL') {
      const view = await closeTransferRequest(id, 'CANCEL');
      if (view) await notifyTransferCancelled(view);
      return NextResponse.json({ success: true, message: 'Đã hủy yêu cầu đổi phòng.', data: view });
    }

    if (action === 'REJECT') {
      const view = await closeTransferRequest(id, 'REJECT', body.reason);
      if (view) await notifyTransferRejected(view, transfer.tenantUserId);
      return NextResponse.json({ success: true, message: 'Đã từ chối yêu cầu đổi phòng và báo cho khách.', data: view });
    }

    if (action === 'APPROVE') {
      const result = await approveTransferRequest(id, {
        oldElectricPrev: body.oldElectricPrev ?? null,
        oldWaterPrev: body.oldWaterPrev ?? null,
        oldElectricFinal: body.oldElectricFinal,
        oldWaterFinal: body.oldWaterFinal,
        newElectricStart: body.newElectricStart,
        newWaterStart: body.newWaterStart,
        damageCost: body.damageCost ?? 0,
      });
      await notifyTransferApproved(result.view, transfer.tenantUserId);
      return NextResponse.json({
        success: true,
        message: `Đã chuyển hợp đồng sang phòng ${result.view.to_room?.room_code || transfer.toRoomId}, giữ nguyên hạn ${result.newContract.endDate}. ${describeTransferDiff(result.settlement.totalDiff, 'LANDLORD')}`,
        data: result.view,
      });
    }

    if (action === 'REPORT_PAYMENT') {
      const code = parseTransactionCode(body.transactionCode);
      if (!code) {
        return NextResponse.json({ success: false, message: 'Mã giao dịch không hợp lệ (4–64 ký tự chữ, số, dấu gạch).' }, { status: 400 });
      }
      const view = await updateTransferSettlement(id, 'REPORT_PAYMENT', 'TENANT', code);
      if (view) await notifyTransferPaymentReported(view);
      return NextResponse.json({ success: true, message: 'Đã báo chuyển khoản. Chủ trọ sẽ đối soát và xác nhận.', data: view });
    }

    // CONFIRM_SETTLEMENT
    const view = await updateTransferSettlement(id, 'CONFIRM', 'LANDLORD');
    if (view) await notifyTransferSettled(view, transfer.tenantUserId);
    return NextResponse.json({ success: true, message: 'Đã xác nhận thanh toán chênh lệch đổi phòng.', data: view });
  } catch (err) {
    return errorResponse(err, 'Không xử lý được yêu cầu đổi phòng.');
  }
}
