'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { scopedFetch as fetch } from '@/lib/scoped-fetch';
import { SlideOverDrawer } from './LandlordPrimitives';
import { currentBillingMonth, formatVND } from './landlord-format';

interface SheetRow {
  room_id: number;
  room_code: string;
  room_title: string;
  tenant_name: string;
  rent: number;
  electricity_rate: number;
  water_rate: number;
  internet_fee: number;
  service_fee: number;
  prev_electric: number;
  prev_water: number;
  prev_source: string;
  billed: boolean;
}

interface Entry {
  selected: boolean;
  electricOld: string;
  electricNew: string;
  waterOld: string;
  waterNew: string;
  result?: { ok: boolean; message: string };
}

function monthOptions() {
  const now = new Date();
  return [0, 1].map((back) => {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });
}

/**
 * Lập hóa đơn hàng loạt cho mọi phòng đang có hợp đồng trong một kỳ: chỉ số kỳ trước được điền sẵn,
 * chủ trọ chỉ nhập chỉ số mới; tiền được tính ở máy chủ theo đơn giá phòng và tiền thuê trên hợp đồng.
 */
export default function BulkBillingDrawer({
  open,
  landlordId,
  onClose,
  onDone,
}: {
  open: boolean;
  landlordId: string;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [month, setMonth] = useState(currentBillingMonth());
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [entries, setEntries] = useState<Record<number, Entry>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/landlords?type=bulk-billing&landlordId=${encodeURIComponent(landlordId)}&month=${encodeURIComponent(month)}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Không tải được danh sách phòng.');
      const nextRows: SheetRow[] = json.data.rows;
      setRows(nextRows);
      setEntries(Object.fromEntries(nextRows.map((r) => [r.room_id, {
        selected: !r.billed,
        electricOld: String(r.prev_electric),
        electricNew: '',
        waterOld: String(r.prev_water),
        waterNew: '',
      }])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách phòng.');
    } finally {
      setLoading(false);
    }
  }, [landlordId, month]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const update = (roomId: number, patch: Partial<Entry>) => setEntries((cur) => ({ ...cur, [roomId]: { ...cur[roomId], ...patch } }));

  const estimate = (row: SheetRow, e?: Entry) => {
    if (!e || e.electricNew === '' || e.waterNew === '') return null;
    const eu = Number(e.electricNew) - Number(e.electricOld);
    const wu = Number(e.waterNew) - Number(e.waterOld);
    if (!Number.isFinite(eu) || !Number.isFinite(wu) || eu < 0 || wu < 0) return 'invalid' as const;
    return row.rent + Math.round(eu * row.electricity_rate) + Math.round(wu * row.water_rate) + row.internet_fee + row.service_fee;
  };

  const ready = useMemo(
    () => rows.filter((r) => !r.billed && entries[r.room_id]?.selected && typeof estimate(r, entries[r.room_id]) === 'number'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, entries]
  );

  const submit = async () => {
    if (submitting || ready.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_BILLS_BULK',
          landlordId,
          month,
          items: ready.map((r) => ({
            room_id: r.room_id,
            electric_old: Number(entries[r.room_id].electricOld),
            electric_new: Number(entries[r.room_id].electricNew),
            water_old: Number(entries[r.room_id].waterOld),
            water_new: Number(entries[r.room_id].waterNew),
          })),
        }),
      });
      const json = await res.json();
      const results: Array<{ room_id: number; ok: boolean; message: string }> = json.data?.results || [];
      for (const r of results) update(r.room_id, { result: { ok: r.ok, message: r.message } });
      if (json.data?.created > 0) {
        onDone(json.message);
        await load();
      } else {
        setError(json.message || 'Chưa lập được hóa đơn nào.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lập được hóa đơn.');
    } finally {
      setSubmitting(false);
    }
  };

  const cell = 'w-20 px-2 py-1.5 border border-[#E5E3DE] rounded-lg text-sm tabular-nums focus:border-[#B89C66] outline-hidden';

  return (
    <SlideOverDrawer
      open={open}
      onClose={onClose}
      title="Lập hóa đơn cả tháng"
      subtitle="Nhập chỉ số điện nước mới cho các phòng đang có hợp đồng; tiền được tính tự động"
      widthClass="max-w-5xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-slate-600">{ready.length} phòng sẵn sàng lập hóa đơn</span>
          <button type="button" disabled={submitting || ready.length === 0} onClick={submit}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Lập {ready.length} hóa đơn kỳ {month}
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="bulk-month" className="font-bold text-[#0F223A]">Kỳ hóa đơn</label>
          <select id="bulk-month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 border border-[#E5E3DE] rounded-xl bg-white">
            {monthOptions().map((m) => <option key={m} value={m}>Tháng {m}</option>)}
          </select>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-[#8C6D37]" />}
        </div>
        {error && <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800">{error}</p>}
        {!loading && rows.length === 0 && <p className="text-slate-500">Không có phòng nào đang có hợp đồng hiệu lực.</p>}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs uppercase text-slate-500 border-b border-[#E5E3DE]">
                <tr>
                  <th className="py-2 pr-2">Lập</th>
                  <th className="py-2 pr-2">Phòng / Khách thuê</th>
                  <th className="py-2 px-2">Điện cũ → mới (kWh)</th>
                  <th className="py-2 px-2">Nước cũ → mới (m³)</th>
                  <th className="py-2 pl-2 text-right">Tạm tính</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const e = entries[r.room_id];
                  const est = estimate(r, e);
                  return (
                    <tr key={r.room_id} className={r.billed ? 'opacity-60' : ''}>
                      <td className="py-2 pr-2">
                        <input type="checkbox" aria-label={`Lập hóa đơn phòng ${r.room_code}`} disabled={r.billed} checked={Boolean(e?.selected) && !r.billed}
                          onChange={(ev) => update(r.room_id, { selected: ev.target.checked })} className="w-4 h-4 accent-[#B89C66]" />
                      </td>
                      <td className="py-2 pr-2">
                        <span className="font-bold text-[#0F223A]">{r.room_code}</span> <span className="text-slate-500">· {r.tenant_name}</span>
                        <span className="block text-xs text-slate-500">Chỉ số cũ: {r.prev_source} · Tiền thuê {formatVND(r.rent)}</span>
                        {r.billed && <span className="block text-xs font-bold text-[#8C6D37]">Đã có hóa đơn kỳ này</span>}
                        {e?.result && <span className={`block text-xs font-bold ${e.result.ok ? 'text-[#8C6D37]' : 'text-rose-700'}`}>{e.result.message}</span>}
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">
                        <input aria-label={`Điện cũ ${r.room_code}`} className={cell} inputMode="decimal" disabled={r.billed} value={e?.electricOld ?? ''} onChange={(ev) => update(r.room_id, { electricOld: ev.target.value })} />
                        <span className="mx-1 text-slate-400">→</span>
                        <input aria-label={`Điện mới ${r.room_code}`} className={cell} inputMode="decimal" disabled={r.billed} value={e?.electricNew ?? ''} onChange={(ev) => update(r.room_id, { electricNew: ev.target.value })} />
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">
                        <input aria-label={`Nước cũ ${r.room_code}`} className={cell} inputMode="decimal" disabled={r.billed} value={e?.waterOld ?? ''} onChange={(ev) => update(r.room_id, { waterOld: ev.target.value })} />
                        <span className="mx-1 text-slate-400">→</span>
                        <input aria-label={`Nước mới ${r.room_code}`} className={cell} inputMode="decimal" disabled={r.billed} value={e?.waterNew ?? ''} onChange={(ev) => update(r.room_id, { waterNew: ev.target.value })} />
                      </td>
                      <td className="py-2 pl-2 text-right font-bold tabular-nums whitespace-nowrap">
                        {est === null ? <span className="text-slate-400 font-normal">—</span> : est === 'invalid' ? <span className="text-rose-700 text-xs">Chỉ số mới nhỏ hơn cũ</span> : formatVND(est)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-slate-500">Tạm tính = tiền thuê theo hợp đồng + điện + nước + internet + dịch vụ. Số tiền chính thức do máy chủ tính khi lập.</p>
      </div>
    </SlideOverDrawer>
  );
}
