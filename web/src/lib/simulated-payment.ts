/**
 * Thanh toán MÔ PHỎNG (đề cương: "thanh toán giả lập", "lịch sử giao dịch thanh toán giả lập").
 * Hệ thống không kết nối ngân hàng: người thuê bấm "Tạo mã giao dịch mô phỏng" (hoặc tự nhập mã),
 * chủ trọ đối soát rồi xác nhận. Mã sinh ra có tiền tố SIM để phân biệt với mã ngân hàng thật.
 */
export const SIMULATED_PAYMENT_NOTE =
  'Thanh toán mô phỏng phục vụ khóa luận: không trừ tiền thật, không kết nối ngân hàng. Mã QR và tài khoản chỉ để minh họa.';

export function generateSimulatedTransactionCode(prefix: 'HD' | 'COC', now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${String(now.getFullYear()).slice(-2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SIM-${prefix}-${stamp}-${random}`;
}

export function isSimulatedTransactionCode(code: string | null | undefined): boolean {
  return /^SIM-/i.test(String(code || ''));
}
