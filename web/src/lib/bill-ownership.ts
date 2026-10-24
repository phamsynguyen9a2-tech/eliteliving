/**
 * Hóa đơn thuộc hợp đồng nào (hàm thuần, không truy cập CSDL).
 *
 * Hóa đơn mới lưu contractId ngay khi lập. Với hóa đơn cũ (contractId = null), suy ra theo thứ tự:
 * 1. Hợp đồng cùng phòng có thời hạn (ngày bắt đầu → ngày kết thúc) bao trùm kỳ hóa đơn (MM/YYYY).
 *    Nếu nhiều hợp đồng cùng bao trùm (khách cũ thanh lý sớm, khách mới vào), lấy hợp đồng bắt đầu muộn nhất.
 * 2. Nếu không có: hợp đồng cùng phòng được tạo gần nhất TRƯỚC thời điểm lập hóa đơn.
 * Không khớp quy tắc nào → hóa đơn không thuộc khách thuê nào.
 * Khách thuê cũ vì vậy không thấy hóa đơn của khách mới và ngược lại.
 * Script scripts/backfill-bill-contracts.ts dùng đúng các quy tắc này để ghi contractId.
 */

export interface BillOwnershipRow {
  roomId: number;
  createdAt: Date | string;
  /** Kỳ hóa đơn dạng MM/YYYY */
  month?: string | null;
  contractId?: string | null;
}

export interface ContractOwnershipRow {
  id: string;
  roomId: number;
  createdAt: Date | string;
  /** YYYY-MM-DD */
  startDate?: string | null;
  /** YYYY-MM-DD */
  endDate?: string | null;
}

const toTime = (value: Date | string) => (value instanceof Date ? value.getTime() : new Date(value).getTime());

/**
 * Chuẩn hóa kỳ hóa đơn về 'MM/YYYY' ('9/2026', '09/2026', '2026-09' → '09/2026').
 * Trả null nếu không phải một tháng hợp lệ. Nhờ vậy ràng buộc unique (phòng, kỳ) không bị lách
 * bằng cách viết kỳ theo kiểu khác.
 */
export function normalizeBillMonth(input: unknown): string | null {
  const text = String(input ?? '').trim();
  let m: number;
  let y: number;
  let match = /^(\d{1,2})\s*[/\-.]\s*(\d{4})$/.exec(text);
  if (match) {
    m = Number(match[1]);
    y = Number(match[2]);
  } else {
    match = /^(\d{4})-(\d{1,2})$/.exec(text);
    if (!match) return null;
    y = Number(match[1]);
    m = Number(match[2]);
  }
  if (m < 1 || m > 12 || y < 2000 || y > 2100) return null;
  return `${String(m).padStart(2, '0')}/${y}`;
}

/** 'MM/YYYY' → [ngày đầu tháng, ngày cuối tháng] dạng 'YYYY-MM-DD', hoặc null nếu sai định dạng. */
export function billMonthRange(month: string | null | undefined): [string, string] | null {
  const match = /^(\d{1,2})\/(\d{4})$/.exec((month || '').trim());
  if (!match) return null;
  const m = Number(match[1]);
  const y = Number(match[2]);
  if (m < 1 || m > 12) return null;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, '0');
  return [`${y}-${mm}-01`, `${y}-${mm}-${String(lastDay).padStart(2, '0')}`];
}

const isIsoDate = (value: string | null | undefined): value is string => /^\d{4}-\d{2}-\d{2}/.test(value || '');

/** Hợp đồng sở hữu hóa đơn, hoặc null nếu không có hợp đồng nào phù hợp. */
export function inferBillContractId(bill: BillOwnershipRow, roomContracts: ContractOwnershipRow[]): string | null {
  if (bill.contractId) return bill.contractId;
  const sameRoom = roomContracts.filter((contract) => contract.roomId === bill.roomId);

  // 1. Theo thời hạn hợp đồng bao trùm kỳ hóa đơn
  const range = billMonthRange(bill.month);
  if (range) {
    const [monthStart, monthEnd] = range;
    const covering = sameRoom.filter(
      (contract) =>
        isIsoDate(contract.startDate) &&
        isIsoDate(contract.endDate) &&
        contract.startDate.slice(0, 10) <= monthEnd &&
        contract.endDate.slice(0, 10) >= monthStart
    );
    if (covering.length > 0) {
      covering.sort(
        (a, b) =>
          b.startDate!.localeCompare(a.startDate!) || toTime(b.createdAt) - toTime(a.createdAt)
      );
      return covering[0].id;
    }
  }

  // 2. Hợp đồng đang ở phòng lúc lập hóa đơn
  const billTime = toTime(bill.createdAt);
  let best: ContractOwnershipRow | null = null;
  for (const contract of sameRoom) {
    const contractTime = toTime(contract.createdAt);
    if (contractTime > billTime) continue;
    if (!best || contractTime > toTime(best.createdAt)) best = contract;
  }
  return best?.id ?? null;
}
