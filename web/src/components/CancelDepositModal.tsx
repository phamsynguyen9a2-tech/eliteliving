'use client';

import React, { useState } from 'react';
import { Room } from '@/lib/types';
import {
  X,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HelpCircle,
} from 'lucide-react';

interface CancelDepositModalProps {
  room: Room;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export default function CancelDepositModal({ room, onClose, onSuccess }: CancelDepositModalProps) {
  const [reason, setReason] = useState<'EXPIRED_NO_SHOW' | 'TENANT_REQUEST' | 'MUTUAL_AGREEMENT'>('EXPIRED_NO_SHOW');
  const [forfeitDeposit, setForfeitDeposit] = useState(true);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/rooms/deposit/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          reason,
          forfeitDeposit,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Lỗi khi hủy cọc');
      }

      onSuccess(json);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể hủy cọc phòng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F223A]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#E5E3DE] overflow-hidden font-sans">
        {/* Header */}
        <div className="bg-[#0F223A] text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#B89C66] uppercase tracking-wider">
                Xử Lý Giữ Chỗ &amp; Quá Hạn
              </span>
              <h2 className="text-lg font-black text-white">
                Hủy Giữ Cọc Phòng {room.room_code}
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            Sau khi hủy, trạng thái phòng sẽ <strong>ngay lập tức chuyển về &quot;Còn trống&quot; (AVAILABLE)</strong> để khách hàng khác có thể xem và đặt phòng.
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

          {/* Reason Selection */}
          <div>
            <label className="block font-bold text-[#0F223A] mb-1.5 uppercase text-[11px]">
              Lý do hủy giữ cọc phòng:
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[#E5E3DE] hover:border-[#B89C66] cursor-pointer transition-colors bg-[#F8F8F6]">
                <input
                  type="radio"
                  name="reason"
                  checked={reason === 'EXPIRED_NO_SHOW'}
                  onChange={() => {
                    setReason('EXPIRED_NO_SHOW');
                    setForfeitDeposit(true);
                  }}
                  className="mt-0.5 text-[#B89C66] focus:ring-[#B89C66]"
                />
                <div>
                  <div className="font-bold text-[#0F223A]">Quá hạn lịch hẹn dọn vào (Không đến nhận phòng)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Đã quá ngày hẹn check-in thỏa thuận nhưng khách không liên lạc hoặc không đến nhận phòng.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[#E5E3DE] hover:border-[#B89C66] cursor-pointer transition-colors bg-[#F8F8F6]">
                <input
                  type="radio"
                  name="reason"
                  checked={reason === 'TENANT_REQUEST'}
                  onChange={() => setReason('TENANT_REQUEST')}
                  className="mt-0.5 text-[#B89C66] focus:ring-[#B89C66]"
                />
                <div>
                  <div className="font-bold text-[#0F223A]">Khách thuê chủ động xin hủy giữ cọc</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Khách có việc đột xuất, đổi kế hoạch và báo trước cho ban quản lý tòa nhà.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[#E5E3DE] hover:border-[#B89C66] cursor-pointer transition-colors bg-[#F8F8F6]">
                <input
                  type="radio"
                  name="reason"
                  checked={reason === 'MUTUAL_AGREEMENT'}
                  onChange={() => setReason('MUTUAL_AGREEMENT')}
                  className="mt-0.5 text-[#B89C66] focus:ring-[#B89C66]"
                />
                <div>
                  <div className="font-bold text-[#0F223A]">Thỏa thuận chấm dứt giữa hai bên</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Hai bên thống nhất hủy để đổi phòng khác hoặc điều chỉnh hợp đồng.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Deposit Settlement Policy */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-950">
              <input
                type="checkbox"
                checked={forfeitDeposit}
                onChange={(e) => setForfeitDeposit(e.target.checked)}
                className="rounded text-[#B89C66] focus:ring-[#B89C66]"
              />
              <span>Tịch thu khoản tiền cọc theo cam kết thỏa thuận giữ chỗ</span>
            </label>
            <p className="text-[10px] text-amber-800 leading-relaxed">
              Theo quy định giữ phòng Elite Living: Nếu khách quá hạn hẹn không đến nhận phòng mà không có lý do bất khả kháng, tiền cọc sẽ không được hoàn lại để bù đắp chi phí cơ hội giữ phòng.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Ghi chú bổ sung (nếu có)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập ghi chú hoặc lý do chi tiết..."
              className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl outline-hidden focus:border-[#B89C66]"
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
              Đóng lại
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang hủy cọc...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Xác Nhận Hủy &amp; Giải Phóng Phòng</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
