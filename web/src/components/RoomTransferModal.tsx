'use client';

/**
 * Khách thuê: chọn một phòng trống khác của cùng chủ trọ và gửi yêu cầu đổi phòng.
 * Hợp đồng nối tiếp giữ nguyên ngày hết hạn; giá thuê và tiền cọc theo phòng mới.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRightLeft, BedDouble, CalendarDays, Loader2, X } from 'lucide-react';
import { scopedFetch } from '@/lib/scoped-fetch';
import {
  billMonthOf,
  computeTransferSettlement,
  todayInVietnam,
  type RoomTransferView,
  type TransferOption,
} from '@/lib/room-transfer';
import { formatDateVi, formatSigned, formatVnd, TransferSettlementTable } from './RoomTransferParts';

interface TransferContract {
  id: string;
  room_id: number;
  room_title: string;
  monthly_rent: number;
  deposit_amount: number;
  end_date: string;
}

interface OptionsPayload {
  contract: TransferContract & { room_code: string; start_date: string };
  estimate_date: string;
  month_already_billed: boolean;
  has_pending_request: boolean;
  options: TransferOption[];
  requests: RoomTransferView[];
}

interface RoomTransferModalProps {
  contract: TransferContract;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const dayBefore = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

export default function RoomTransferModal({ contract, onClose, onSuccess }: RoomTransferModalProps) {
  const [data, setData] = useState<OptionsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [desiredDate, setDesiredDate] = useState(todayInVietnam());
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await scopedFetch(`/api/contracts/transfer?contractId=${encodeURIComponent(contract.id)}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Không tải được danh sách phòng trống.');
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách phòng trống.');
    } finally {
      setLoading(false);
    }
  }, [contract.id]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [submitting, onClose]);

  const selected = data?.options.find((o) => o.room.id === selectedId) ?? null;
  const pending = data?.requests.find((r) => r.status === 'PENDING') ?? null;
  const minDate = data?.estimate_date ?? todayInVietnam();
  const maxDate = dayBefore(data?.contract.end_date ?? contract.end_date);

  // Ước tính theo ngày khách chọn; tháng sau tháng hiện tại coi như phòng cũ đã lập hóa đơn đầu kỳ
  const estimate = useMemo(() => {
    if (!selected || !data) return null;
    try {
      return computeTransferSettlement({
        oldRent: data.contract.monthly_rent,
        newRent: selected.room.price,
        oldDeposit: data.contract.deposit_amount,
        newDeposit: selected.room.deposit,
        transferDate: desiredDate,
        monthAlreadyBilled: billMonthOf(desiredDate) === billMonthOf(data.estimate_date) ? data.month_already_billed : true,
        contractStartDate: data.contract.start_date,
      });
    } catch {
      return selected.estimate;
    }
  }, [selected, data, desiredDate]);

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await scopedFetch('/api/contracts/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId: contract.id, toRoomId: selected.room.id, desiredDate, note }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Không gửi được yêu cầu đổi phòng.');
      onSuccess(json.message || 'Đã gửi yêu cầu đổi phòng.');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không gửi được yêu cầu đổi phòng.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F223A]/45 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] shadow-2xl border border-[#E5E3DE] overflow-hidden flex flex-col font-sans">
        <div className="bg-[#0F223A] text-white p-6 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 pr-10">
            <div className="w-12 h-12 rounded-2xl bg-[#B89C66]/20 border border-[#B89C66]/40 flex items-center justify-center text-[#B89C66] shrink-0">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#B89C66] uppercase tracking-wider">Yêu cầu đổi phòng</span>
              <h2 className="text-lg font-black text-white">Đang thuê: {contract.room_title}</h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            Chọn một phòng còn trống của cùng chủ trọ. Hợp đồng và tiền cọc chuyển sang phòng mới,{' '}
            <strong className="text-white">giữ nguyên ngày hết hạn {formatDateVi(data?.contract.end_date ?? contract.end_date)}</strong>.
            Hợp đồng hiện tại giữ nguyên cho tới khi chủ trọ duyệt.
          </p>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto text-xs text-slate-700">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tải phòng trống của chủ trọ...
            </div>
          ) : pending ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 space-y-1">
              <p className="font-bold">Bạn đã có một yêu cầu đổi phòng đang chờ chủ trọ duyệt</p>
              <p>
                Chuyển sang {pending.to_room?.room_code} — {pending.to_room?.title}, dự kiến {formatDateVi(pending.desired_date)}. Bạn có thể
                hủy yêu cầu đó trong mục &quot;Yêu cầu đổi phòng&quot; rồi gửi lại.
              </p>
            </div>
          ) : data && data.options.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#F8F8F6] border border-dashed border-[#E5E3DE] text-center space-y-1">
              <BedDouble className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold text-[#0F223A]">Chủ trọ hiện chưa có phòng trống nào khác</p>
              <p className="text-slate-500">Khi có phòng trống (tin đã duyệt), phòng sẽ hiện ở đây.</p>
            </div>
          ) : data ? (
            <>
              {!data.month_already_billed && (
                <div className="p-3 rounded-xl bg-[#B89C66]/10 border border-[#B89C66]/40 text-[#0F223A]">
                  Phòng bạn đang ở chưa có hóa đơn tháng {billMonthOf(data.estimate_date)}. Sau khi đổi phòng, tiền thuê tháng này
                  được thu luôn trong quyết toán, tính theo ngày: những ngày ở phòng cũ theo giá cũ, những ngày còn lại theo giá mới. Vì vậy
                  số tiền ước tính bên dưới gồm cả tiền thuê tháng này, không chỉ phần chênh lệch.
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.options.map((option) => {
                  const active = option.room.id === selectedId;
                  return (
                    <button
                      key={option.room.id}
                      type="button"
                      onClick={() => setSelectedId(option.room.id)}
                      className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                        active
                          ? 'border-[#B89C66] bg-[#B89C66]/10 shadow-md shadow-[#B89C66]/25'
                          : 'border-[#E5E3DE] bg-white hover:border-[#B89C66]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-[#0F223A]">{option.room.room_code}</span>
                        <span className="text-[11px] text-slate-500">{option.room.area ? `${option.room.area} m²` : ''}</span>
                      </div>
                      <p className="text-[#0F223A] font-semibold line-clamp-1">{option.room.title}</p>
                      {option.room.project_name && <p className="text-[11px] text-slate-500 line-clamp-1">{option.room.project_name}</p>}
                      <div className="flex items-center justify-between text-[11px]">
                        <span>
                          Giá <strong className="text-[#0F223A]">{formatVnd(option.room.price)}</strong> • Cọc{' '}
                          <strong className="text-[#0F223A]">{formatVnd(option.room.deposit)}</strong>
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-[#A38752]">
                        {data.month_already_billed ? 'Ước tính chênh lệch' : 'Ước tính cần thanh toán'}: {formatSigned(option.estimate.totalDiff)}
                      </p>
                    </button>
                  );
                })}
              </div>

              {selected && estimate && (
                <div className="space-y-3 pt-2 border-t border-[#E5E3DE]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="font-bold text-[#0F223A] uppercase text-[11px] flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5 text-[#B89C66]" /> Ngày muốn chuyển
                      </span>
                      <input
                        type="date"
                        value={desiredDate}
                        min={minDate}
                        max={maxDate}
                        onChange={(e) => setDesiredDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#E5E3DE] focus:border-[#B89C66] focus:ring-2 focus:ring-[#B89C66]/25 outline-none text-[#0F223A]"
                      />
                    </label>
                    <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE] space-y-1">
                      <p>
                        Giá thuê: {formatVnd(data.contract.monthly_rent)} → <strong className="text-[#0F223A]">{formatVnd(selected.room.price)}</strong>
                      </p>
                      <p>
                        Tiền cọc: {formatVnd(data.contract.deposit_amount)} → <strong className="text-[#0F223A]">{formatVnd(selected.room.deposit)}</strong>
                      </p>
                      <p>
                        Hạn hợp đồng: <strong className="text-[#0F223A]">{formatDateVi(data.contract.end_date)}</strong> (giữ nguyên)
                      </p>
                    </div>
                  </div>
                  <label className="block space-y-1">
                    <span className="font-bold text-[#0F223A] uppercase text-[11px]">Lời nhắn cho chủ trọ (không bắt buộc)</span>
                    <textarea
                      value={note}
                      maxLength={500}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="VD: Muốn chuyển sang phòng có ban công, có thể chuyển vào cuối tuần."
                      className="w-full px-3 py-2 rounded-xl border border-[#E5E3DE] focus:border-[#B89C66] focus:ring-2 focus:ring-[#B89C66]/25 outline-none text-[#0F223A]"
                    />
                  </label>
                  <TransferSettlementTable settlement={estimate} viewer="TENANT" estimate />
                  <p className="text-[11px] text-slate-500">
                    Ngày chuyển là ngày chủ trọ duyệt (nếu hợp đồng chưa bắt đầu thì là ngày nhận phòng); số tiền cuối cùng được tính lại theo ngày đó. Kỳ hóa đơn
                    đầu tiên của phòng mới là tháng sau tháng chuyển.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="p-4 border-t border-[#E5E3DE] bg-[#F8F8F6] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl border border-[#E5E3DE] bg-white text-[#0F223A] font-semibold text-xs hover:bg-[#F8F8F6] cursor-pointer disabled:opacity-60"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!selected || submitting || Boolean(pending)}
            className="px-4 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-extrabold text-xs shadow-md shadow-[#B89C66]/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Gửi yêu cầu đổi phòng
          </button>
        </div>
      </div>
    </div>
  );
}
