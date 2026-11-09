/**
 * Thông báo của nghiệp vụ đổi phòng cho hai bên. Không ném lỗi: thông báo hỏng không làm hỏng nghiệp vụ.
 */
import prisma from './prisma';
import { notifyTenant, resolveTenantRecipient, type TenantRecipient } from './tenant-notifications';
import { describeTransferDiff, type RoomTransferView } from './room-transfer';

const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} đ`;
const signed = (n: number) => (n > 0 ? `+${vnd(n)}` : n < 0 ? `−${vnd(Math.abs(n))}` : '0 đ');
const roomLabel = (room: RoomTransferView['from_room'], fallbackId: number) =>
  room ? `${room.room_code} — ${room.title}` : `Phòng #${fallbackId}`;
const formatDateVi = (date: string | null | undefined) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date || ''));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(date || '');
};

async function landlordRecipient(landlordId: string): Promise<TenantRecipient | null> {
  try {
    const landlord = await prisma.landlord.findUnique({
      where: { id: landlordId },
      select: { id: true, name: true, email: true },
    });
    return { email: landlord?.email || '', name: landlord?.name || 'Chủ trọ', userId: landlord?.id || landlordId };
  } catch {
    return null;
  }
}

async function tenantRecipient(view: RoomTransferView, tenantUserId?: string | null) {
  return resolveTenantRecipient({
    userId: tenantUserId ?? null,
    phone: view.tenant_phone,
    email: null,
    name: view.tenant_name,
  });
}

const baseMetadata = (view: RoomTransferView) => ({
  transferId: view.id,
  contractId: view.from_contract_id,
  newContractId: view.new_contract_id,
  fromRoomId: view.from_room_id,
  toRoomId: view.to_room_id,
  roomId: view.from_room_id,
});

async function safely(task: () => Promise<unknown>) {
  try {
    await task();
  } catch (err) {
    console.error('[room-transfer] Không gửi được thông báo:', err);
  }
}

/** Khách gửi yêu cầu → chủ trọ. */
export function notifyTransferRequested(view: RoomTransferView, estimateTotal?: number | null) {
  return safely(async () => {
    const recipient = await landlordRecipient(view.landlord_id);
    if (!recipient) return;
    const estimate = typeof estimateTotal === 'number' ? ` Ước tính chênh lệch: ${signed(estimateTotal)} (chưa gồm điện nước).` : '';
    await notifyTenant({
      recipient,
      type: 'ROOM_TRANSFER_REQUEST',
      subject: `Yêu cầu đổi phòng ${view.from_room?.room_code || view.from_room_id} → ${view.to_room?.room_code || view.to_room_id}`,
      summary: `${view.tenant_name} xin chuyển từ ${roomLabel(view.from_room, view.from_room_id)} sang ${roomLabel(view.to_room, view.to_room_id)}, dự kiến ngày ${formatDateVi(view.desired_date)}.${estimate}`,
      link: '/chu-tro',
      metadata: baseMetadata(view),
    });
  });
}

/** Khách hủy yêu cầu → chủ trọ. */
export function notifyTransferCancelled(view: RoomTransferView) {
  return safely(async () => {
    const recipient = await landlordRecipient(view.landlord_id);
    if (!recipient) return;
    await notifyTenant({
      recipient,
      type: 'ROOM_TRANSFER_REQUEST',
      subject: `Khách đã hủy yêu cầu đổi phòng ${view.from_room?.room_code || view.from_room_id}`,
      summary: `${view.tenant_name} đã hủy yêu cầu chuyển sang ${roomLabel(view.to_room, view.to_room_id)}.`,
      link: '/chu-tro',
      metadata: baseMetadata(view),
    });
  });
}

/** Chủ trọ từ chối → khách. */
export function notifyTransferRejected(view: RoomTransferView, tenantUserId?: string | null) {
  return safely(async () => {
    const recipient = await tenantRecipient(view, tenantUserId);
    await notifyTenant({
      recipient,
      type: 'ROOM_TRANSFER_UPDATE',
      subject: `Yêu cầu đổi sang phòng ${view.to_room?.room_code || view.to_room_id} chưa được chấp nhận`,
      summary: `Chủ trọ từ chối yêu cầu đổi phòng. Lý do: ${view.reject_reason || 'không ghi'}. Hợp đồng hiện tại giữ nguyên.`,
      link: '/ho-so?tab=contracts',
      metadata: baseMetadata(view),
    });
  });
}

/** Chủ trọ duyệt → khách (kèm bảng quyết toán). */
export function notifyTransferApproved(view: RoomTransferView, tenantUserId?: string | null) {
  return safely(async () => {
    const s = view.settlement;
    if (!s) return;
    const recipient = await tenantRecipient(view, tenantUserId);
    const diffText = describeTransferDiff(s.totalDiff, 'TENANT');
    await notifyTenant({
      recipient,
      type: 'ROOM_TRANSFER_UPDATE',
      subject: `Đã đổi phòng sang ${view.to_room?.room_code || view.to_room_id} — hợp đồng giữ nguyên hạn ${formatDateVi(view.contract_end_date)}`,
      summary: `Hợp đồng đã chuyển sang ${roomLabel(view.to_room, view.to_room_id)} từ ngày ${formatDateVi(view.transfer_date)}. ${diffText} Vui lòng ký hợp đồng mới và biên bản bàn giao.`,
      link: '/ho-so?tab=contracts',
      metadata: { ...baseMetadata(view), totalDiff: s.totalDiff },
      email: {
        badge: 'Elite Living • Đổi phòng',
        title: 'XÁC NHẬN ĐỔI PHÒNG & QUYẾT TOÁN CHÊNH LỆCH',
        paragraphs: [
          `Chủ trọ đã duyệt yêu cầu đổi phòng của quý khách. Hợp đồng cũ đã được thanh lý và hợp đồng nối tiếp tại phòng mới giữ nguyên ngày hết hạn ${formatDateVi(view.contract_end_date)}.`,
          diffText,
          'Quý khách vui lòng ký số hợp đồng mới, ký biên bản trả phòng cũ và biên bản nhận phòng mới trong mục Hợp đồng.',
        ],
        details: [
          { label: 'Phòng cũ → phòng mới', value: `${view.from_room?.room_code || view.from_room_id} → ${view.to_room?.room_code || view.to_room_id}` },
          { label: 'Ngày chuyển', value: formatDateVi(view.transfer_date) },
          { label: 'Hạn hợp đồng (giữ nguyên)', value: formatDateVi(view.contract_end_date) },
          { label: 'Giá thuê mới', value: `${vnd(s.new_rent)}/tháng (cũ ${vnd(s.old_rent)})` },
          { label: 'Chênh lệch tiền cọc', value: signed(s.depositDiff) },
          {
            label: s.monthAlreadyBilled ? `Chênh lệch tiền thuê ${s.remainingDays}/${s.daysInMonth} ngày` : 'Tiền thuê tháng chuyển (tính theo ngày)',
            value: signed(s.rentDiff),
          },
          { label: 'Điện nước phòng cũ', value: signed(s.utilityCost) },
          { label: 'Chi phí hư hỏng', value: signed(s.damageCost) },
          { label: 'Tổng chênh lệch', value: signed(s.totalDiff) },
        ],
        ctaLabel: 'Xem hợp đồng mới',
        ctaHref: '/ho-so?tab=contracts',
      },
    });
  });
}

/** Khách báo đã chuyển khoản chênh lệch → chủ trọ. */
export function notifyTransferPaymentReported(view: RoomTransferView) {
  return safely(async () => {
    const recipient = await landlordRecipient(view.landlord_id);
    if (!recipient) return;
    await notifyTenant({
      recipient,
      type: 'ROOM_TRANSFER_REQUEST',
      subject: `Khách báo đã chuyển khoản chênh lệch đổi phòng ${view.to_room?.room_code || view.to_room_id}`,
      summary: `${view.tenant_name} báo đã chuyển ${vnd(Math.abs(view.settlement?.totalDiff ?? 0))}, mã giao dịch ${view.settlement_tx_code || '—'}. Vui lòng đối soát và xác nhận.`,
      link: '/chu-tro',
      metadata: baseMetadata(view),
    });
  });
}

/** Chủ trọ xác nhận đã thu / đã hoàn chênh lệch → khách. */
export function notifyTransferSettled(view: RoomTransferView, tenantUserId?: string | null) {
  return safely(async () => {
    const recipient = await tenantRecipient(view, tenantUserId);
    const total = view.settlement?.totalDiff ?? 0;
    await notifyTenant({
      recipient,
      type: 'ROOM_TRANSFER_UPDATE',
      subject: total < 0 ? 'Chủ trọ đã hoàn chênh lệch đổi phòng' : 'Chủ trọ đã xác nhận nhận tiền chênh lệch đổi phòng',
      summary:
        total < 0
          ? `Chủ trọ xác nhận đã hoàn cho bạn ${vnd(Math.abs(total))} chênh lệch khi đổi sang phòng ${view.to_room?.room_code || view.to_room_id}.`
          : `Chủ trọ xác nhận đã nhận ${vnd(total)} chênh lệch khi đổi sang phòng ${view.to_room?.room_code || view.to_room_id}.`,
      link: '/ho-so?tab=contracts',
      metadata: baseMetadata(view),
    });
  });
}
