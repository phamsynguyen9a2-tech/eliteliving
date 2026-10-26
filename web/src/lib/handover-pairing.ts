/**
 * Ghép biên bản nhận phòng (CHECK_IN) với biên bản trả phòng (CHECK_OUT) để đối soát.
 *
 * Ưu tiên biên bản cùng hợp đồng. Biên bản cũ chưa gắn đúng hợp đồng thì chỉ ghép với biên bản
 * cùng phòng, CÙNG người thuê (SĐT) và đúng thứ tự thời gian của một lượt thuê — không bao giờ lấy
 * ảnh / tên của người thuê trước hoặc người thuê sau ở cùng phòng.
 */
export interface PairableHandover {
  id: string;
  contractId: string;
  roomId: number;
  type: 'CHECK_IN' | 'CHECK_OUT' | string;
  tenantPhone: string;
  handoverDate: Date;
  createdAt: Date;
}

const normalizePhone = (phone?: string | null) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\s|-/g, '').trim();
  return cleaned.startsWith('+84') ? `0${cleaned.slice(3)}` : cleaned;
};

const newestFirst = (a: PairableHandover, b: PairableHandover) => b.createdAt.getTime() - a.createdAt.getTime();

export function pickPairedHandover<T extends PairableHandover>(
  target: PairableHandover,
  candidates: T[],
  type: 'CHECK_IN' | 'CHECK_OUT'
): T | null {
  const ofType = candidates.filter((h) => h.type === type && h.id !== target.id);

  const sameContract = ofType.filter((h) => h.contractId === target.contractId).sort(newestFirst);
  if (sameContract.length > 0) return sameContract[0];

  const phone = normalizePhone(target.tenantPhone);
  if (!phone) return null;
  const sameTenant = ofType.filter(
    (h) => h.roomId === target.roomId && normalizePhone(h.tenantPhone) === phone
  );

  if (type === 'CHECK_IN') {
    // Biên bản nhận phòng gần nhất trước (hoặc cùng ngày) lúc trả phòng
    const before = sameTenant
      .filter((h) => h.handoverDate.getTime() <= target.handoverDate.getTime())
      .sort((a, b) => b.handoverDate.getTime() - a.handoverDate.getTime());
    return before[0] ?? null;
  }
  // Biên bản trả phòng sớm nhất sau (hoặc cùng ngày) lúc nhận phòng
  const after = sameTenant
    .filter((h) => h.handoverDate.getTime() >= target.handoverDate.getTime())
    .sort((a, b) => a.handoverDate.getTime() - b.handoverDate.getTime());
  return after[0] ?? null;
}
