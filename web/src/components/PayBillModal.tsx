'use client';

import { scopedFetch as fetch } from '@/lib/scoped-fetch';

import React, { useState } from 'react';
import { UtilityBill } from '@/lib/types';
import {
  X,
  CreditCard,
  Zap,
  Droplets,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building,
  Copy,
  Check,
  Send,
} from 'lucide-react';
import { SIMULATED_PAYMENT_NOTE, generateSimulatedTransactionCode } from '@/lib/simulated-payment';

interface PayBillModalProps {
  bill: UtilityBill;
  onClose: () => void;
  onSuccess: (data: any) => void;
  viewerRole?: 'TENANT' | 'LANDLORD' | 'ADMIN';
}

export default function PayBillModal({
  bill,
  onClose,
  onSuccess,
  viewerRole = 'TENANT',
}: PayBillModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedText, setCopiedText] = useState(false);
  const [transactionCode, setTransactionCode] = useState(
    bill.payment_claim?.transaction_code || ''
  );

  const isTenant = viewerRole === 'TENANT';

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [loading, onClose]);

  const bankName = 'MBBank (Ngân hàng Quân đội)';
  const accountNumber = '0908123456';
  const accountHolder = 'NGUYEN VAN HUNG (CHU TRO)';
  const transferContent = `TIENPHONG P${bill.room_code.replace(/[^0-9]/g, '') || bill.room_id} T${bill.month.replace('/', '')}`;

  // VietQR Quicklink generator
  const qrUrl = `https://img.vietqr.io/image/MB-${accountNumber}-compact2.png?amount=${bill.total_amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(accountHolder)}`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleConfirmPaid = async () => {
    setErrorMsg('');

    if (isTenant && transactionCode.trim().length < 4) {
      setErrorMsg(
        'Vui lòng nhập hoặc tạo mã giao dịch mô phỏng (tối thiểu 4 ký tự) để chủ trọ đối soát.'
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PAY_BILL',
          billId: bill.id,
          transactionCode: transactionCode.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Lỗi khi xử lý thanh toán hóa đơn');
      }

      onSuccess(json);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể xử lý hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F223A]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#E5E3DE] flex flex-col font-sans">
        {/* Header */}
        <div className="bg-[#0F223A] text-white p-6 rounded-t-3xl relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#B89C66]/20 border border-[#B89C66]/40 flex items-center justify-center text-[#B89C66]">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#B89C66] uppercase tracking-wider">
                {isTenant
                  ? 'Chuyển khoản & Báo đã thanh toán'
                  : 'Đối soát & Xác nhận thu tiền'}
              </span>
              <h2 className="text-lg font-black text-white">
                Hóa đơn phòng {bill.room_code} — Tháng {bill.month}
              </h2>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs text-slate-700">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!isTenant && bill.payment_claim && (
            <div className="p-3.5 rounded-xl bg-[#FAF0DC] border border-[#B89C66] text-[#0F223A] space-y-1">
              <div className="font-bold text-xs flex items-center justify-between">
                <span>Khách thuê đã báo chuyển khoản</span>
                <span className="font-mono font-extrabold bg-white px-2 py-0.5 rounded border border-[#B89C66]/50">
                  Mã GD: {bill.payment_claim.transaction_code}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Người gửi: {bill.payment_claim.tenant_name || 'Khách thuê'} • Thời gian:{' '}
                {new Date(bill.payment_claim.reported_at).toLocaleString('vi-VN')}
              </p>
            </div>
          )}

          {/* Bill Breakdown */}
          <div className="p-4 bg-[#F8F8F6] border border-[#E5E3DE] rounded-2xl space-y-2.5">
            <div className="text-[11px] font-bold text-[#0F223A] uppercase tracking-wider border-b border-[#E5E3DE] pb-1.5 flex justify-between">
              <span>Khoản mục chi phí</span>
              <span>Số tiền</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600">1. Tiền thuê phòng:</span>
              <span className="font-bold text-[#0F223A]">{bill.rent_cost.toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                2. Tiền điện ({bill.electric_used} kWh: {bill.electric_old} &rarr; {bill.electric_new}):
              </span>
              <span className="font-bold text-[#0F223A]">{bill.electric_cost.toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600 flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-blue-600" />
                3. Tiền nước ({bill.water_used} m³: {bill.water_old} &rarr; {bill.water_new}):
              </span>
              <span className="font-bold text-[#0F223A]">{bill.water_cost.toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600">4. Phí internet &amp; wifi:</span>
              <span className="font-bold text-[#0F223A]">{bill.internet_cost.toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600">5. Dịch vụ chung (vệ sinh, rác, thang máy):</span>
              <span className="font-bold text-[#0F223A]">{bill.service_cost.toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="pt-2 border-t border-[#E5E3DE] flex justify-between items-baseline">
              <span className="font-black text-sm text-[#0F223A]">TỔNG THANH TOÁN:</span>
              <span className="font-black text-lg text-[#0F223A]">
                {bill.total_amount.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          <p role="note" className="p-3 rounded-2xl border border-amber-200 bg-amber-50 text-xs text-amber-900">
            <strong>Thanh toán mô phỏng.</strong> {SIMULATED_PAYMENT_NOTE}
          </p>

          {/* VietQR Bank Transfer Box (minh họa) */}
          <div className="p-4 bg-white border border-[#E5E3DE] rounded-2xl flex flex-col sm:flex-row items-center gap-5 shadow-xs">
            <div className="w-36 h-36 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
              <img
                src={qrUrl}
                alt="VietQR Chuyển Khoản"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-1.5 flex-1 text-xs">
              <div className="font-bold text-[#0F223A] text-sm flex items-center gap-1.5">
                <Building className="w-4 h-4 text-[#B89C66]" />
                {bankName}
              </div>
              <div>
                <span className="text-slate-500">Số tài khoản: </span>
                <strong className="text-[#0F223A] font-mono text-sm">{accountNumber}</strong>
              </div>
              <div>
                <span className="text-slate-500">Chủ tài khoản: </span>
                <strong className="text-[#0F223A]">{accountHolder}</strong>
              </div>
              <div className="pt-1">
                <span className="text-slate-500">Nội dung chuyển khoản: </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                    {transferContent}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(transferContent)}
                    className="p-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    title="Sao chép nội dung"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-amber-700" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {isTenant && (
            <div className="p-4 bg-[#F8F8F6] border border-[#E5E3DE] rounded-2xl space-y-2">
              <label htmlFor="pay-bill-transaction" className="block font-bold text-[#0F223A]">
                Mã giao dịch (mô phỏng) *
              </label>
              <div className="flex gap-2">
                <input
                  id="pay-bill-transaction"
                  type="text"
                  required
                  value={transactionCode}
                  onChange={(e) => setTransactionCode(e.target.value)}
                  placeholder="Bấm “Tạo mã mô phỏng” hoặc tự nhập"
                  className="flex-1 min-w-0 px-3.5 py-2.5 bg-white border border-[#E5E3DE] focus:border-[#B89C66] rounded-xl text-[#0F223A] font-mono text-xs outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setTransactionCode(generateSimulatedTransactionCode('HD'))}
                  className="shrink-0 px-3 py-2 rounded-xl border border-[#B89C66] text-[#8C6D37] text-xs font-bold hover:bg-[#FAF0DC] cursor-pointer"
                >
                  Tạo mã mô phỏng
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Sau khi bạn gửi mã giao dịch, chủ trọ đối soát và xác nhận chuyển trạng thái hóa đơn sang &quot;Đã thanh toán&quot;.
              </p>
            </div>
          )}

          {/* Action Confirmation */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-[#E5E3DE] text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Đóng lại
            </button>
            <button
              type="button"
              onClick={handleConfirmPaid}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-bold shadow-lg shadow-[#B89C66]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : isTenant ? (
                <>
                  <Send className="w-4 h-4" />
                  <span>Báo đã chuyển khoản (Chờ chủ trọ xác nhận)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác nhận đã thu tiền</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
