'use client';

import React, { useState } from 'react';
import { Appointment } from '@/lib/types';
import { DEFAULT_HOUSE_RULES, getCategoryBadge } from '@/lib/house-rules';
import {
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Flame,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  QrCode,
  Copy,
  Check,
  Loader2,
  Send,
} from 'lucide-react';
import { SIMULATED_PAYMENT_NOTE, generateSimulatedTransactionCode } from '@/lib/simulated-payment';

interface DepositBookingModalProps {
  appointment: Appointment;
  onClose: () => void;
  onSuccess: (receipt: any) => void;
}

export default function DepositBookingModal({
  appointment,
  onClose,
  onSuccess,
}: DepositBookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRulesDetail, setShowRulesDetail] = useState(false);
  const [rulesAgreed, setRulesAgreed] = useState(false);

  // Form state
  const defaultDeposit = appointment.price || 4500000;
  const [depositAmount, setDepositAmount] = useState<number>(defaultDeposit);
  const [tenantName, setTenantName] = useState(appointment.user_name || '');
  const [tenantPhone, setTenantPhone] = useState(appointment.user_phone || '');
  const [tenantCitizenId, setTenantCitizenId] = useState('');
  const [tenantAddress, setTenantAddress] = useState('');
  const [moveInDate, setMoveInDate] = useState(
    new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)
  );
  const [vehicleCount, setVehicleCount] = useState(1);
  const [transactionCode, setTransactionCode] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCopySTK = () => {
    navigator.clipboard.writeText('0908123456');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transactionCode.trim().length < 4) {
      setErrorMsg('Vui lòng nhập hoặc tạo mã giao dịch mô phỏng (tối thiểu 4 ký tự).');
      return;
    }
    if (!rulesAgreed) {
      setErrorMsg('Vui lòng đọc và tích cam kết tuân thủ 10 điều nội quy nhà trọ & an toàn PCCC.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/rooms/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: appointment.room_id,
          tenantName,
          tenantPhone,
          tenantCitizenId,
          tenantAddress,
          depositAmount,
          moveInDate,
          vehicleCount,
          transactionCode,
          notes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        onSuccess(json.data.receipt);
      } else {
        setErrorMsg(json.message || 'Lỗi khi ghi nhận đặt cọc');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#112338] text-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#1E3A5B] max-h-[92vh] overflow-y-auto font-sans">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1E3A5B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#B89C66]/20 border border-[#B89C66]/40 flex items-center justify-center text-[#B89C66]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Đặt Cọc Giữ Chỗ &amp; Thuê Phòng
              </h2>
              <p className="text-xs text-slate-400">
                Sau khi hoàn tất xem phòng • Phòng #{appointment.room_id} ({appointment.room_code || 'Elite Living'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmitDeposit} className="mt-5 space-y-5 text-xs">
          {/* ROOM SUMMARY CARD */}
          <div className="p-4 rounded-2xl bg-[#142842] border border-[#1E3A5B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-[#B89C66] font-extrabold uppercase tracking-wider block">
                Căn hộ đã xem thực tế
              </span>
              <h3 className="font-bold text-sm text-white mt-0.5">
                {appointment.room_title || 'Căn hộ dịch vụ cao cấp'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Địa chỉ: {appointment.address || 'Quận Tân Phú, TP.HCM'}
              </p>
            </div>
            <div className="text-right sm:border-l sm:pl-4 border-[#1E3A5B]">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">
                Tiền thuê niêm yết
              </span>
              <span className="text-base font-black text-[#B89C66]">
                {(appointment.price || defaultDeposit).toLocaleString('vi-VN')} đ/tháng
              </span>
            </div>
          </div>

          {/* TENANT INFORMATION FIELDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Họ tên người thuê *</label>
              <input
                type="text"
                required
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#142842] border border-[#1E3A5B] rounded-xl text-white outline-hidden font-medium focus:border-[#B89C66]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Số điện thoại *</label>
              <input
                type="tel"
                required
                value={tenantPhone}
                onChange={(e) => setTenantPhone(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#142842] border border-[#1E3A5B] rounded-xl text-white outline-hidden font-medium focus:border-[#B89C66]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Số CCCD gắn chip (Đưa vào HĐ) *</label>
              <input
                type="text"
                required
                value={tenantCitizenId}
                onChange={(e) => setTenantCitizenId(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#142842] border border-[#1E3A5B] rounded-xl text-white outline-hidden font-medium focus:border-[#B89C66]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Địa chỉ thường trú (theo CCCD)</label>
              <input
                type="text"
                value={tenantAddress}
                onChange={(e) => setTenantAddress(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#142842] border border-[#1E3A5B] rounded-xl text-white outline-hidden font-medium focus:border-[#B89C66]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Ngày dự kiến dọn vào ở *</label>
              <input
                type="date"
                required
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#142842] border border-[#1E3A5B] rounded-xl text-white outline-hidden font-medium focus:border-[#B89C66]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Số lượng xe máy gửi nhà xe</label>
              <select
                value={vehicleCount}
                onChange={(e) => setVehicleCount(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-[#142842] border border-[#1E3A5B] rounded-xl text-white outline-hidden font-medium focus:border-[#B89C66]"
              >
                <option value={0}>Không có xe</option>
                <option value={1}>1 xe máy</option>
                <option value={2}>2 xe máy</option>
                <option value={3}>3+ xe máy</option>
              </select>
            </div>
          </div>

          {/* PAYMENT & BANK ESCROW SECTION */}
          <div className="p-4 rounded-2xl bg-[#0F223A] border border-[#B89C66]/40 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E3A5B]">
              <span className="font-extrabold text-xs text-[#B89C66] uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>Thông tin tài khoản chuyển tiền cọc giữ chỗ</span>
              </span>
              <span className="text-[10px] bg-[#B89C66]/20 text-[#B89C66] border border-[#B89C66]/30 px-2 py-0.5 rounded-full font-bold">
                Tài khoản Chủ trọ đã xác thực
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div>
                <p className="text-slate-400">Ngân hàng thụ hưởng:</p>
                <p className="font-bold text-white text-xs">MB Bank (Ngân hàng Quân Đội)</p>
                <p className="text-slate-400 mt-1">Chủ tài khoản:</p>
                <p className="font-bold text-white text-xs">NGUYEN VAN HUNG (CHỦ TRỌ)</p>
              </div>

              <div>
                <p className="text-slate-400">Số tài khoản chuyển khoản:</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-black text-sm text-[#B89C66] tracking-wider">
                    0908123456
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySTK}
                    className="p-1 px-2 bg-[#1E3A5B] hover:bg-[#254870] text-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-[#B89C66]" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                </div>

                <p className="text-slate-400 mt-1.5">Nội dung chuyển khoản (Memo):</p>
                <p className="font-mono font-bold text-white text-[10.5px] bg-[#142842] p-1.5 rounded-lg border border-[#1E3A5B] select-all">
                  COC PHONG {appointment.room_code || appointment.room_id} {tenantPhone.slice(-4)}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1E3A5B] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-slate-400 text-[11px] block">Số tiền cọc giữ chỗ:</span>
                <span className="text-lg font-black text-[#B89C66]">
                  {depositAmount.toLocaleString('vi-VN')} đ
                </span>
                <span className="text-[10px] text-slate-400 block italic">
                  (Chủ trọ sẽ đối soát mã giao dịch trước khi kích hoạt Hợp đồng)
                </span>
              </div>

              <div className="w-full sm:w-64">
                <label htmlFor="deposit-transaction" className="block text-[10px] font-bold text-[#B89C66] mb-1">
                  Mã giao dịch (mô phỏng) *
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="deposit-transaction"
                    type="text"
                    required
                    placeholder="Tạo mã hoặc tự nhập"
                    value={transactionCode}
                    onChange={(e) => setTransactionCode(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 bg-[#142842] border border-[#1E3A5B] focus:border-[#B89C66] rounded-xl text-white font-mono outline-hidden text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => setTransactionCode(generateSimulatedTransactionCode('COC'))}
                    className="shrink-0 px-2 py-1 rounded-xl border border-[#B89C66] text-[#B89C66] text-[10px] font-bold hover:bg-[#1E3A5B] cursor-pointer"
                  >
                    Tạo mã
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-amber-200">{SIMULATED_PAYMENT_NOTE}</p>
              </div>
            </div>
          </div>

          {/* HOUSE RULES ACCORDION */}
          <div className="p-4 rounded-2xl bg-[#142842] border border-[#1E3A5B] space-y-2">
            <div
              onClick={() => setShowRulesDetail(!showRulesDetail)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#B89C66]" />
                <span className="font-bold text-white text-xs">
                  Xem trước 10 Điều Nội Quy Tòa Nhà &amp; An Toàn PCCC 2026
                </span>
              </div>
              <button type="button" className="text-slate-400">
                {showRulesDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showRulesDetail && (
              <div className="pt-3 border-t border-[#1E3A5B] space-y-2.5 max-h-56 overflow-y-auto text-[11px] text-slate-300 pr-1 animate-in fade-in">
                {DEFAULT_HOUSE_RULES.map((r) => (
                  <div key={r.id} className="p-2 rounded-xl bg-[#0F223A]/80 border border-[#1E3A5B]">
                    <p className="font-bold text-white">
                      Điều {r.order}: {r.title}
                    </p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">{r.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* MANDATORY CHECKBOX */}
            <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                checked={rulesAgreed}
                onChange={(e) => setRulesAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#B89C66] focus:ring-[#B89C66] cursor-pointer"
              />
              <span className="text-[11px] text-slate-300 font-medium">
                Tôi đã xem căn hộ thực tế, đọc kỹ và cam kết tuân thủ đầy đủ <strong>10 điều nội quy tòa nhà và quy định PCCC</strong> khi ký hợp đồng và nhận bàn giao phòng.
              </span>
            </label>
          </div>

          {/* SUBMIT BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E3A5B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-[#1E3A5B] hover:bg-[#142842] rounded-xl text-slate-400 hover:text-white font-bold transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-extrabold rounded-xl shadow-lg shadow-[#B89C66]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Gửi thông tin đặt cọc (Chờ chủ trọ xác nhận)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
