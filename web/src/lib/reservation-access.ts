/**
 * Ai được tự hủy giữ chỗ (phòng RESERVED) từ phía khách thuê.
 *
 * Chỉ người đang giữ chỗ: chủ của phiếu đặt cọc còn hiệu lực, hoặc người đứng tên hợp đồng ACTIVE
 * của phòng (khớp SĐT đã xác minh). Từng xem phòng (lịch hẹn COMPLETED) KHÔNG đủ: nhiều người cùng
 * xem một phòng, nhưng chỉ một người đặt cọc.
 */
export interface ReservationClaimLike {
  status: string;
  tenant_id: string;
  tenant_phone: string;
}

const normalizePhone = (phone?: string | null) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\s|-/g, '').trim();
  return cleaned.startsWith('+84') ? `0${cleaned.slice(3)}` : cleaned;
};

export function tenantHoldsReservation(input: {
  tenantId: string;
  /** SĐT đã xác minh của khách thuê (chưa xác minh thì truyền null) */
  verifiedPhone: string | null;
  claim: ReservationClaimLike | null | undefined;
  /** Phòng có hợp đồng ACTIVE đứng tên SĐT đã xác minh của khách thuê */
  hasOwnActiveContract: boolean;
}): boolean {
  const { tenantId, verifiedPhone, claim, hasOwnActiveContract } = input;
  if (!verifiedPhone) return false;
  if (hasOwnActiveContract) return true;
  if (!claim || claim.status === 'CANCELLED') return false;
  if (claim.tenant_id && claim.tenant_id === tenantId) return true;
  return normalizePhone(claim.tenant_phone) !== '' && normalizePhone(claim.tenant_phone) === normalizePhone(verifiedPhone);
}
