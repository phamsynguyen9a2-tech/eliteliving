'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { scopedFetch as fetch } from '@/lib/scoped-fetch';
import { SIMULATED_PAYMENT_NOTE } from '@/lib/simulated-payment';

interface Row {
  id: string;
  kind: 'BILL' | 'DEPOSIT';
  room_code: string;
  reference: string;
  payer_name: string;
  payer_phone: string;
  amount: number;
  transaction_code: string;
  simulated: boolean;
  status: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'CANCELLED';
  reported_at: string;
  confirmed_at: string | null;
}

const STATUS_LABEL: Record<Row['status'], string> = {
  PENDING_CONFIRMATION: 'Chờ chủ trọ đối soát',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
};

/** Lịch sử giao dịch thanh toán mô phỏng (đề cương 6a: giám sát lịch sử giao dịch thanh toán giả lập). */
export default function PaymentsPanel({ search = '', refreshKey = 0 }: { search?: string; refreshKey?: number }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<{ count: number; confirmedAmount: number; pendingAmount: number; pendingCount: number } | null>(null);
  const [kind, setKind] = useState<'ALL' | 'BILL' | 'DEPOSIT'>('ALL');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/payments', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'Không tải được lịch sử giao dịch.');
        setRows(json.data.rows);
        setTotals(json.data.totals);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không tải được lịch sử giao dịch.');
      }
    })();
  }, [refreshKey]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => (kind === 'ALL' || r.kind === kind) && (!q || [r.room_code, r.payer_name, r.payer_phone, r.transaction_code, r.reference].some((v) => v.toLowerCase().includes(q))));
  }, [rows, kind, search]);

  return (
    <div className="space-y-4">
      <p role="note" className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-900">
        <strong>Giao dịch mô phỏng.</strong> {SIMULATED_PAYMENT_NOTE}
      </p>
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE]"><span className="text-xs text-slate-500 block">Tổng giao dịch</span><strong className="text-lg">{totals.count}</strong></div>
          <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE]"><span className="text-xs text-slate-500 block">Đã xác nhận</span><strong className="text-lg">{totals.confirmedAmount.toLocaleString('vi-VN')} đ</strong></div>
          <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE]"><span className="text-xs text-slate-500 block">Chờ đối soát</span><strong className="text-lg">{totals.pendingAmount.toLocaleString('vi-VN')} đ</strong></div>
          <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE]"><span className="text-xs text-slate-500 block">Số giao dịch chờ</span><strong className="text-lg">{totals.pendingCount}</strong></div>
        </div>
      )}
      <div className="inline-flex gap-1 p-1 rounded-xl bg-[#F3F2EE]" role="tablist" aria-label="Loại giao dịch">
        {(['ALL', 'BILL', 'DEPOSIT'] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold ${kind === k ? 'bg-white text-[#8C6D37] shadow-xs' : 'text-slate-600'}`}>
            {k === 'ALL' ? 'Tất cả' : k === 'BILL' ? 'Thanh toán hóa đơn' : 'Đặt cọc'}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8F8F6] border-b border-[#E5E3DE] text-slate-600 uppercase font-semibold">
            <tr>
              <th className="py-3 px-4">Thời điểm</th>
              <th className="py-3 px-4">Loại / Nội dung</th>
              <th className="py-3 px-4">Phòng</th>
              <th className="py-3 px-4">Người nộp</th>
              <th className="py-3 px-4">Số tiền</th>
              <th className="py-3 px-4">Mã giao dịch</th>
              <th className="py-3 px-4">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {visible.map((r) => (
              <tr key={`${r.kind}-${r.id}`}>
                <td data-label="Thời điểm" className="py-3 px-4 whitespace-nowrap">{new Date(r.reported_at).toLocaleString('vi-VN')}</td>
                <td data-label="Loại / Nội dung" className="py-3 px-4"><span className="font-bold text-[#0F223A] block">{r.kind === 'BILL' ? 'Hóa đơn' : 'Đặt cọc'}</span><span className="text-xs text-slate-500">{r.reference}</span></td>
                <td data-label="Phòng" className="py-3 px-4 font-mono font-bold text-[#8C6D37]">{r.room_code}</td>
                <td data-label="Người nộp" className="py-3 px-4"><span className="block font-semibold">{r.payer_name}</span><span className="text-xs text-slate-500">{r.payer_phone}</span></td>
                <td data-label="Số tiền" className="py-3 px-4 font-bold whitespace-nowrap">{r.amount.toLocaleString('vi-VN')} đ</td>
                <td data-label="Mã giao dịch" className="py-3 px-4 font-mono text-xs">{r.transaction_code}{r.simulated && <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-sans font-bold">mô phỏng</span>}</td>
                <td data-label="Trạng thái" className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.status === 'CONFIRMED' ? 'bg-[#F3E2BE] text-[#0F223A]' : r.status === 'CANCELLED' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-900'}`}>{STATUS_LABEL[r.status]}</span>
                  {r.confirmed_at && <span className="block text-xs text-slate-500 mt-0.5">{new Date(r.confirmed_at).toLocaleString('vi-VN')}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className="text-sm text-slate-500 text-center py-8">Chưa có giao dịch nào.</p>}
      </div>
    </div>
  );
}
