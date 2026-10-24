'use client';

import React, { useState } from 'react';
import { Contract } from '@/lib/types';
import {
  X,
  LogOut,
  Zap,
  Droplets,
  DollarSign,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileCheck2,
} from 'lucide-react';

interface CheckOutModalProps {
  contract: Contract;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export default function CheckOutModal({ contract, onClose, onSuccess }: CheckOutModalProps) {
  const [finalElectric, setFinalElectric] = useState(1450);
  const [finalWater, setFinalWater] = useState(52);
  const [damageCost, setDamageCost] = useState(0);
  const [deductionNotes, setDeductionNotes] = useState('Thiết bị nguyên vẹn, hao mòn tự nhiên thông thường.');
  const [tenantBankInfo, setTenantBankInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [loading, onClose]);

  const originalDeposit = contract.deposit_amount || 4500000;
  const finalRefund = Math.max(0, originalDeposit - Number(damageCost));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/contracts/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: contract.id,
          roomId: contract.room_id,
          finalElectric: Number(finalElectric),
          finalWater: Number(finalWater),
          damageCost: Number(damageCost),
          deductionNotes,
          tenantBankInfo,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Lỗi khi thanh lý trả phòng');
      }

      onSuccess(json);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể thanh lý hợp đồng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F223A]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#E5E3DE] flex flex-col font-sans">
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
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#B89C66] uppercase tracking-wider">
                Quy trình nghiệm thu &amp; trả phòng
              </span>
              <h2 className="text-lg font-black text-white">
                Trả phòng &amp; quyết toán cọc phòng #{contract.room_id}
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            Sau khi hoàn tất, hợp đồng sẽ được kết thúc, lập biên bản bàn giao trả phòng và <strong>phòng sẽ giải phóng về trạng thái &quot;Còn trống&quot;</strong>.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tenant Summary */}
          <div className="p-3.5 bg-[#F8F8F6] border border-[#E5E3DE] rounded-2xl flex items-center justify-between">
            <div>
              <div className="font-bold text-[#0F223A]">{contract.tenant_name}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">SĐT: {contract.tenant_phone}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Tiền cọc ban đầu</span>
              <span className="font-black text-sm text-[#0F223A]">
                {originalDeposit.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          {/* Final Meter Readings */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#0F223A] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#B89C66]" />
              1. Chốt Số Điện Nước Cuối Cùng Lúc Trả Phòng
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                <label className="block font-bold text-amber-900 mb-1 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  Chỉ số Điện cuối (kWh)
                </label>
                <input
                  type="number"
                  required
                  value={finalElectric}
                  onChange={(e) => setFinalElectric(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-bold text-amber-900"
                />
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                <label className="block font-bold text-blue-900 mb-1 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-blue-600" />
                  Chỉ số Nước cuối (m³)
                </label>
                <input
                  type="number"
                  required
                  value={finalWater}
                  onChange={(e) => setFinalWater(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg font-bold text-blue-900"
                />
              </div>
            </div>
          </div>

          {/* Damages & Deductions */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#0F223A] flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-[#B89C66]" />
              2. Kiểm Kê Hao Mòn &amp; Khấu Trừ Hư Hại Tài Sản
            </h3>

            <div>
              <label className="block font-semibold mb-1 text-slate-700">
                Chi phí bồi thường hư hỏng thiết bị (đ) — Nếu không có nhập 0:
              </label>
              <input
                type="number"
                min={0}
                value={damageCost}
                onChange={(e) => setDamageCost(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl outline-hidden font-bold focus:border-[#B89C66]"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700">
                Ghi chú tình trạng biên bản trả phòng
              </label>
              <input
                type="text"
                value={deductionNotes}
                onChange={(e) => setDeductionNotes(e.target.value)}
                placeholder="VD: Điều hòa, tủ lạnh tốt. Sơn tường dơ nhẹ đã sơn lại..."
                className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl outline-hidden focus:border-[#B89C66]"
              />
            </div>
          </div>

          {/* Settlement Refund Calculation */}
          <div className="p-4 bg-[#0F223A] text-white rounded-2xl space-y-2">
            <div className="text-[11px] font-bold text-[#B89C66] uppercase tracking-wider">
              Bảng Quyết Toán Hoàn Trả Tiền Cọc
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">Tiền cọc ban đầu:</span>
              <span className="font-bold">{originalDeposit.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">Khấu trừ hư hỏng / sửa chữa:</span>
              <span className="font-bold text-rose-300">-{Number(damageCost).toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="pt-2 border-t border-white/20 flex justify-between items-center text-sm">
              <span className="font-bold text-white">TIỀN CỌC HOÀN TRẢ KHÁCH NHẬN:</span>
              <span className="font-black text-base text-[#B89C66]">
                {finalRefund.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          {/* Tenant Refund Bank Info */}
          <div>
            <label className="block font-semibold mb-1 text-slate-700 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-[#B89C66]" />
              Tài khoản ngân hàng của khách nhận hoàn cọc:
            </label>
            <input
              type="text"
              required
              value={tenantBankInfo}
              onChange={(e) => setTenantBankInfo(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl outline-hidden font-medium focus:border-[#B89C66]"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-[#E5E3DE] text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#0F223A] hover:bg-[#1E3A5B] text-white font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý trả phòng...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#B89C66]" />
                  <span>Xác nhận trả phòng</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
