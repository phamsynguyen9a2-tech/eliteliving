import { NextRequest, NextResponse } from 'next/server';
import { endActiveContractInTx, getRoomById, invalidateRoomsCache } from '@/lib/db';
import prisma from '@/lib/prisma';
import { notifyTenant, resolveTenantRecipient } from '@/lib/tenant-notifications';
import {
  canAccessContract,
  forbidden,
  getSessionUser,
  unauthorized,
} from '@/lib/tenant-access';
import { publishRoomEvent } from '@/lib/realtime-bus';
import { parseMeterReading } from '@/lib/room-lifecycle';
import { lifecycleErrorResponse } from '@/lib/lifecycle-errors';

/**
 * Trả phòng & quyết toán cọc.
 * - Chủ trọ / admin: kết thúc hợp đồng, lập biên bản trả phòng (chủ trọ đã ký) và giải phóng phòng
 *   trong một transaction. Khách thuê ký biên bản sau.
 * - Khách thuê: chỉ GỬI YÊU CẦU trả phòng — biên bản trả phòng khách đã ký, chờ chủ trọ ký.
 *   Hợp đồng vẫn hiệu lực đến khi chủ trọ ký xác nhận (xem signHandover trong lib/db.ts).
 * Số liệu (chỉ số điện nước, tiền cọc) lấy từ người dùng nhập và từ hợp đồng, không có giá trị mặc định giả.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized('Vui lòng đăng nhập để thanh lý trả phòng.');

    const body = await request.json();
    const {
      contractId,
      roomId,
      finalElectric,
      finalWater,
      damageCost = 0,
      deductionNotes = 'Không có hư hỏng tài sản nghiêm trọng',
      tenantBankInfo = '',
    } = body;

    if (!contractId || !roomId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu mã hợp đồng hoặc mã phòng cần thanh lý trả phòng' },
        { status: 400 }
      );
    }

    const contract = await prisma.contract.findUnique({
      where: { id: String(contractId) },
      include: { room: true },
    });
    if (!contract) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy hợp đồng cần thanh lý trả phòng.' },
        { status: 404 }
      );
    }
    if (!(await canAccessContract(user, contract))) {
      return forbidden('Bạn không có quyền thanh lý hợp đồng này.');
    }
    if (Number(roomId) !== contract.roomId) {
      return NextResponse.json(
        { success: false, message: 'Mã phòng không khớp với hợp đồng cần thanh lý.' },
        { status: 400 }
      );
    }
    if (contract.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, message: 'Hợp đồng này đã kết thúc, không thể trả phòng lại.' },
        { status: 409 }
      );
    }

    const electric = parseMeterReading(finalElectric);
    const water = parseMeterReading(finalWater);
    if (electric === null || water === null) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập chỉ số điện và nước cuối kỳ (số không âm).' },
        { status: 400 }
      );
    }
    const damage = Number(damageCost);
    if (!Number.isFinite(damage) || damage < 0) {
      return NextResponse.json(
        { success: false, message: 'Chi phí hư hỏng không hợp lệ.' },
        { status: 400 }
      );
    }

    const bankInfo = typeof tenantBankInfo === 'string' && tenantBankInfo.trim()
      ? tenantBankInfo.trim()
      : 'Chưa cung cấp tài khoản nhận hoàn cọc';
    const originalDeposit = contract.depositAmount;
    const finalRefund = Math.max(0, originalDeposit - damage);
    const numericRoomId = contract.roomId;
    const notes = `Biên bản trả phòng: Chỉ số điện cuối ${electric} kWh. Chỉ số nước cuối ${water} m³. Chi phí hư hỏng khấu trừ: ${damage.toLocaleString('vi-VN')} đ. Tiền cọc hoàn trả: ${finalRefund.toLocaleString('vi-VN')} đ. Tài khoản nhận hoàn cọc: ${bankInfo}. Ghi chú: ${deductionNotes}`;
    const isTenant = user.role === 'TENANT';

    // Yêu cầu trả phòng của khách thuê đang chờ chủ trọ ký (nếu có)
    const pendingRequest = await prisma.handover.findFirst({
      where: { contractId: contract.id, type: 'CHECK_OUT', landlordConfirmed: false, status: { not: 'CONFIRMED' } },
      orderBy: { createdAt: 'desc' },
    });

    if (isTenant) {
      if (pendingRequest) {
        return NextResponse.json(
          { success: false, message: 'Bạn đã gửi yêu cầu trả phòng cho hợp đồng này, đang chờ chủ trọ xác nhận.' },
          { status: 409 }
        );
      }
      const requestHandover = await prisma.handover.create({
        data: {
          contractId: contract.id,
          roomId: numericRoomId,
          type: 'CHECK_OUT',
          tenantName: contract.tenantName,
          tenantPhone: contract.tenantPhone,
          landlordName: contract.landlordName,
          status: 'PENDING_CONFIRMATION',
          tenantConfirmed: true,
          landlordConfirmed: false,
          damageCost: damage,
          handoverDate: new Date(),
          notes: `[YÊU CẦU TRẢ PHÒNG TỪ KHÁCH THUÊ] ${notes}`,
        },
      });

      const recipient = await resolveTenantRecipient({
        userId: user.id,
        phone: contract.tenantPhone,
        email: user.email,
        name: contract.tenantName,
      });
      await notifyTenant({
        recipient,
        type: 'CHECKOUT_SETTLEMENT',
        subject: `Đã gửi yêu cầu trả phòng #${numericRoomId}`,
        summary: `Yêu cầu trả phòng #${numericRoomId} đã được gửi. Hợp đồng kết thúc và tiền cọc được quyết toán khi chủ trọ ký biên bản trả phòng.`,
        link: '/ho-so?tab=contracts',
        metadata: { contractId: contract.id, roomId: numericRoomId, handoverId: requestHandover.id },
      });

      publishRoomEvent('contract', numericRoomId);
      return NextResponse.json({
        success: true,
        message: `Đã gửi yêu cầu trả phòng #${numericRoomId}. Hợp đồng vẫn còn hiệu lực cho đến khi chủ trọ ký xác nhận biên bản trả phòng.`,
        data: {
          contract,
          room: null,
          handover: requestHandover,
          refundSummary: { originalDeposit, damageCost: damage, finalRefund, tenantBankInfo: bankInfo },
        },
      });
    }

    // Chủ trọ / admin: kết thúc hợp đồng + biên bản trả phòng + trạng thái phòng cùng commit hoặc rollback
    const settled = await prisma.$transaction(async (tx) => {
      const ended = await endActiveContractInTx(tx, contract.id);
      if (!ended) throw new Error('CONTRACT_NOT_FOUND: Không tìm thấy hợp đồng cần thanh lý trả phòng.');
      const handoverData = {
        status: 'PENDING_CONFIRMATION' as const,
        landlordConfirmed: true,
        damageCost: damage,
        handoverDate: new Date(),
        notes,
      };
      // Khách đã gửi yêu cầu trả phòng: chủ trọ hoàn tất chính biên bản đó (cả hai bên đã ký)
      const handover = pendingRequest
        ? await tx.handover.update({
            where: { id: pendingRequest.id },
            data: { ...handoverData, status: pendingRequest.tenantConfirmed ? 'CONFIRMED' : 'PENDING_CONFIRMATION' },
          })
        : await tx.handover.create({
            data: {
              ...handoverData,
              contractId: contract.id,
              roomId: numericRoomId,
              type: 'CHECK_OUT',
              tenantName: contract.tenantName,
              tenantPhone: contract.tenantPhone,
              landlordName: contract.landlordName,
              tenantConfirmed: false,
            },
          });
      return { contract: ended.contract, handover };
    });
    invalidateRoomsCache();
    const updatedRoom = await getRoomById(numericRoomId);

    // Lưu thông báo thanh lý và quyết toán cọc
    const recipient = await resolveTenantRecipient({
      userId: null,
      phone: contract.tenantPhone,
      email: null,
      name: contract.tenantName,
    });

    await notifyTenant({
      recipient,
      type: 'CHECKOUT_SETTLEMENT',
      subject: `Biên bản trả phòng & Quyết toán tiền cọc phòng #${numericRoomId}`,
      summary: `Hoàn tất trả phòng #${numericRoomId}. Quyết toán hoàn cọc: ${finalRefund.toLocaleString('vi-VN')} đ.`,
      link: '/ho-so?tab=contracts',
      metadata: {
        contractId: contract.id,
        roomId: numericRoomId,
        damageCost: damage,
        finalRefund,
        originalDeposit,
      },
      email: {
        badge: 'Elite Living • Quyết toán trả phòng',
        title: `BIÊN BẢN TRẢ PHÒNG & QUYẾT TOÁN CỌC #${numericRoomId}`,
        paragraphs: [
          `Quý khách đã hoàn tất bàn giao và thủ tục thanh lý hợp đồng trả phòng #${numericRoomId}.`,
          `Biên bản kiểm kê thiết bị và quyết toán tiền cọc đã được lưu trữ trên hệ thống.`
        ],
        details: [
          { label: 'Mã phòng', value: `#${numericRoomId}` },
          { label: 'Tiền cọc ban đầu', value: `${originalDeposit.toLocaleString('vi-VN')} đ` },
          { label: 'Khấu trừ hư hỏng', value: `${damage.toLocaleString('vi-VN')} đ` },
          { label: 'Tiền cọc thực nhận', value: `${finalRefund.toLocaleString('vi-VN')} đ` },
          { label: 'Tài khoản nhận', value: bankInfo },
        ],
        ctaLabel: 'Xem lịch sử hợp đồng',
        ctaHref: '/ho-so?tab=contracts',
      }
    });

    publishRoomEvent('contract', numericRoomId);
    return NextResponse.json({
      success: true,
      message: `✅ Đã hoàn tất trả phòng và quyết toán cọc thành công! Hoàn trả tiền cọc: ${finalRefund.toLocaleString('vi-VN')} đ.`,
      data: {
        contract: settled.contract,
        room: updatedRoom ?? null,
        handover: settled.handover,
        refundSummary: {
          originalDeposit,
          damageCost: damage,
          finalRefund,
          tenantBankInfo: bankInfo,
        },
      },
    });
  } catch (err: any) {
    const errorResponse = lifecycleErrorResponse(err);
    if (errorResponse) return errorResponse;
    return NextResponse.json(
      { success: false, message: err.message || 'Lỗi khi xử lý trả phòng' },
      { status: 500 }
    );
  }
}
