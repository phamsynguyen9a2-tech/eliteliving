'use client';

/**
 * Khách thuê: danh sách yêu cầu đổi phòng của mình (trang Hồ sơ → Hợp đồng). Hủy yêu cầu đang chờ,
 * xem bảng quyết toán khi đã duyệt, báo đã chuyển khoản phần chênh lệch (thanh toán giả lập).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRightLeft, Loader2, Wand2 } from 'lucide-react';
import { scopedFetch } from '@/lib/scoped-fetch';
import { generateSimulatedTransactionCode, SIMULATED_PAYMENT_NOTE } from '@/lib/simulated-payment';
import type { RoomTransferView } from '@/lib/room-transfer';
import { formatDateVi, TransferSettlementTable, TransferStatusBadge } from './RoomTransferParts';

interface TenantTransferRequestsProps {
  /** Đổi giá trị để tải lại (VD: khi trang tải lại hợp đồng) */
  refreshKey?: unknown;
  onChanged?: (message: string) => void;
}

export default function TenantTransferRequests({ refreshKey, onChanged }: TenantTransferRequestsProps) {
  const [requests, setRequests] = useState<RoomTransferView[]>([]);
  const [setupMessage, setSetupMessage] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await scopedFetch('/api/contracts/transfer', { cache: 'no-store' });
      const json = await res.json();
      if (json.setupRequired) {
        setSetupMessage(json.message);
        return;
      }
      if (res.ok && json.success && Array.isArray(json.data)) {
        setSetupMessage('');
        setRequests(json.data);
      }
    } catch {
      // Mất mạng tạm thời: giữ danh sách cũ
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const act = async (request: RoomTransferView, body: Record<string, unknown>) => {
    setBusyId(request.id);
    setErrors((e) => ({ ...e, [request.id]: '' }));
    try {
      const res = await scopedFetch(`/api/contracts/transfer/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Thao tác không thành công.');
      await load();
      onChanged?.(json.message || 'Đã cập nhật yêu cầu đổi phòng.');
    } catch (err) {
      setErrors((e) => ({ ...e, [request.id]: err instanceof Error ? err.message : 'Thao tác không thành công.' }));
    } finally {
      setBusyId(null);
    }
  };

  if (setupMessage) {
    return (
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px]">
        Tính năng đổi phòng: {setupMessage}
      </div>
    );
  }
  if (requests.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
        <ArrowRightLeft className="w-4 h-4 text-[#B89C66]" />
        <span>Yêu cầu đổi phòng</span>
      </h3>
      {requests.map((r) => {
        const s = r.settlement;
        const tenantPays = s && s.totalDiff > 0;
        const canReport = r.status === 'APPROVED' && tenantPays && (r.settlement_status === 'UNPAID' || r.settlement_status === 'PENDING_CONFIRMATION');
        return (
          <div key={r.id} className="p-5 rounded-2xl bg-[#142842] border border-[#1E3A5B] space-y-3 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-extrabold text-white">
                {r.from_room?.room_code || r.from_room_id} <span className="text-[#B89C66]">→</span> {r.to_room?.room_code || r.to_room_id}
                <span className="block text-[11px] font-medium text-slate-400">{r.to_room?.title}</span>
              </div>
              <TransferStatusBadge status={r.status} label={r.status_label} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[#0F223A] rounded-xl border border-[#1E3A5B]/80 text-xs">
              <div>
                <p className="text-[11px] text-slate-400">Gửi ngày</p>
                <p className="font-bold text-slate-200">{formatDateVi(r.created_at)}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">{r.transfer_date ? 'Ngày chuyển' : 'Dự kiến chuyển'}</p>
                <p className="font-bold text-slate-200">{formatDateVi(r.transfer_date || r.desired_date)}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Hạn hợp đồng (giữ nguyên)</p>
                <p className="font-bold text-slate-200">{formatDateVi(r.contract_end_date)}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Giá phòng mới</p>
                <p className="font-bold text-[#B89C66]">{(s?.new_rent ?? r.to_room?.price ?? 0).toLocaleString('vi-VN')} đ</p>
              </div>
            </div>

            {r.note && <p className="text-[11px] text-slate-400">Lời nhắn: {r.note}</p>}
            {r.status === 'REJECTED' && r.reject_reason && (
              <p className="text-xs text-rose-300">Lý do từ chối: {r.reject_reason}</p>
            )}

            {r.status === 'APPROVED' && s && (
              <>
                <TransferSettlementTable settlement={s} viewer="TENANT" tone="dark" />
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-400">
                    Thanh toán chênh lệch: <strong className="text-[#E5D7B7]">{r.settlement_status_label}</strong>
                    {r.settlement_tx_code ? ` • Mã GD: ${r.settlement_tx_code}` : ''}
                  </span>
                  <span className="text-slate-400">Vui lòng ký hợp đồng mới và hai biên bản bàn giao bên dưới.</span>
                </div>
              </>
            )}

            {canReport && (
              <div className="space-y-2 pt-2 border-t border-[#1E3A5B]/60">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={codes[r.id] ?? r.settlement_tx_code ?? ''}
                    onChange={(e) => setCodes((c) => ({ ...c, [r.id]: e.target.value }))}
                    placeholder="Mã giao dịch chuyển khoản"
                    className="flex-1 px-3 py-2 rounded-xl bg-[#0F223A] border border-[#1E3A5B] focus:border-[#B89C66] outline-none text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setCodes((c) => ({ ...c, [r.id]: generateSimulatedTransactionCode('DP') }))}
                    className="px-3 py-2 rounded-xl bg-[#0F223A] border border-[#1E3A5B] text-slate-200 text-xs font-semibold hover:border-[#B89C66] cursor-pointer flex items-center gap-1"
                  >
                    <Wand2 className="w-3.5 h-3.5" /> Tạo mã mô phỏng
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => act(r, { action: 'REPORT_PAYMENT', transactionCode: codes[r.id] ?? r.settlement_tx_code ?? '' })}
                    className="px-3.5 py-2 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-extrabold text-xs rounded-xl cursor-pointer disabled:opacity-60 flex items-center gap-1"
                  >
                    {busyId === r.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Báo đã chuyển khoản
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">{SIMULATED_PAYMENT_NOTE}</p>
              </div>
            )}

            {r.status === 'PENDING' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => act(r, { action: 'CANCEL' })}
                  className="px-3 py-1.5 bg-[#0F223A] hover:bg-[#1A3456] text-slate-200 border border-[#1E3A5B] font-semibold rounded-lg text-xs cursor-pointer disabled:opacity-60 flex items-center gap-1"
                >
                  {busyId === r.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Hủy yêu cầu
                </button>
              </div>
            )}

            {errors[r.id] && <p className="text-xs text-rose-300">{errors[r.id]}</p>}
          </div>
        );
      })}
    </div>
  );
}
