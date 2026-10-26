'use client';

import React, { useState } from 'react';
import { Contract } from '@/lib/types';
import { addMonthsClamped, isValidIsoDate } from '@/lib/contract-dates';
import {
  X,
  RefreshCw,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

interface RenewContractModalProps {
  contract: Contract;
  onClose: () => void;
  onSuccess: (data: any) => void;
  /** Khách thuê: chỉ gửi yêu cầu gia hạn, chủ trọ đồng ý mới đổi hạn hợp đồng */
  requestOnly?: boolean;
}

export default function RenewContractModal({ contract, onClose, onSuccess, requestOnly = false }: RenewContractModalProps) {
  const [monthsToExtend, setMonthsToExtend] = useState(6);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [loading, onClose]);

  // Ngày hết hạn mới: cùng cách tính với máy chủ (31/01 + 1 tháng = cuối tháng 02, không tràn sang 03)
  const currentEndStr = String(contract.end_date || '').slice(0, 10);
  const newEndDateStr = isValidIsoDate(currentEndStr)
    ? addMonthsClamped(currentEndStr, Number(monthsToExtend))
    : '—';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/contracts/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: contract.id,
          monthsToExtend: Number(monthsToExtend),
          newEndDate: newEndDateStr,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Lỗi khi gia hạn hợp đồng');
      }

      onSuccess(json);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể gia hạn hợp đồng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F223A]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#E5E3DE] overflow-hidden font-sans">
        {/* Header */}
        <div className="bg-[#0F223A] text-white p-6 relative">
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
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#B89C66] uppercase tracking-wider">
                Gia hạn hợp đồng thuê
              </span>
              <h2 className="text-lg font-black text-white">
                Gia hạn phòng #{contract.room_id}
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            {requestOnly ? (
              <>Yêu cầu gia hạn sẽ được gửi tới chủ trọ. <strong>Hạn hợp đồng chỉ thay đổi khi chủ trọ đồng ý gia hạn.</strong></>
            ) : (
              <>Hợp đồng của khách <strong>{contract.tenant_name}</strong> sẽ được tiếp tục duy trì hiệu lực với các chính sách giá thuê và đặt cọc hiện tại.</>
            )}
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

          {/* Current Info */}
          <div className="p-3.5 bg-[#F8F8F6] border border-[#E5E3DE] rounded-2xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Mã hợp đồng:</span>
              <span className="font-bold text-[#0F223A]">#{contract.id.slice(-8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Người thuê:</span>
              <span className="font-bold text-[#0F223A]">{contract.tenant_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Hạn hợp đồng hiện tại:</span>
              <span className="font-bold text-amber-700">{contract.end_date}</span>
            </div>
          </div>

          {/* Choose Extension */}
          <div>
            <label className="block font-bold text-[#0F223A] mb-1.5 uppercase text-[11px]">
              Chọn thời gian gia hạn thêm:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { months: 6, label: 'Thêm 06 tháng' },
                { months: 12, label: 'Thêm 12 tháng (1 năm)' },
              ].map((opt) => (
                <button
                  key={opt.months}
                  type="button"
                  onClick={() => setMonthsToExtend(opt.months)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                    monthsToExtend === opt.months
                      ? 'bg-[#0F223A] text-white border-[#0F223A] shadow-md'
                      : 'bg-[#F8F8F6] text-slate-700 border-[#E5E3DE] hover:border-[#B89C66]'
                  }`}
                >
                  <div>{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* New End Date Preview */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>Ngày hết hạn mới:</span>
            </div>
            <span className="font-black text-sm text-[#0F223A]">{newEndDateStr}</span>
          </div>

          <div className="p-3 bg-[#F8F8F6] rounded-xl border border-[#E5E3DE] text-[11px] text-slate-500 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#B89C66] shrink-0 mt-0.5" />
            <span>
              Cam kết 10 điều nội quy PCCC và điều khoản giữ cọc được tự động kế thừa trọn vẹn trong phụ lục gia hạn.
            </span>
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
              className="px-6 py-2.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-bold shadow-lg shadow-[#B89C66]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang gia hạn...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{requestOnly ? 'Gửi yêu cầu gia hạn' : 'Xác nhận gia hạn hợp đồng'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
