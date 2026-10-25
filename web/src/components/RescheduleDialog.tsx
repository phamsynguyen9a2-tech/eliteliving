'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, Loader2, X } from 'lucide-react';
import { scopedFetch as fetch } from '@/lib/scoped-fetch';
import type { Appointment, LandlordAvailability } from '@/lib/types';

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Đổi lịch xem phòng (người thuê, chủ trọ hoặc admin). Chỉ cho chọn ngày / khung giờ trong
 * lịch đón khách của chủ trọ; máy chủ kiểm tra lại và chặn trùng lịch.
 */
export default function RescheduleDialog({
  appointment,
  onClose,
  onDone,
  actor = 'tenant',
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onDone: (updated: Appointment, message: string) => void;
  actor?: 'tenant' | 'landlord';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [availability, setAvailability] = useState<LandlordAvailability | null>(null);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (appointment && !dialog.open) dialog.showModal();
    if (!appointment && dialog.open) dialog.close();
  }, [appointment]);

  useEffect(() => {
    if (!appointment) return;
    setDate('');
    setSlot('');
    setReason('');
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/landlords?type=availability&roomId=${appointment.room_id}`);
        const json = await res.json();
        setAvailability(json.success ? json.data : null);
      } catch {
        setAvailability(null);
      }
    })();
  }, [appointment]);

  const dateOptions = useMemo(() => {
    const out: Array<{ key: string; label: string }> = [];
    const allowed = availability?.available_days?.length ? availability.available_days : DAY_LABELS;
    const start = new Date();
    for (let i = 0; i < 30 && out.length < 21; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      if (!allowed.includes(DAY_LABELS[d.getDay()])) continue;
      out.push({ key: toKey(d), label: `${DAY_LABELS[d.getDay()]}, ${d.toLocaleDateString('vi-VN')}` });
    }
    return out;
  }, [availability]);

  const slotOptions = useMemo(() => {
    const slots = (availability?.slots || []).filter((s) => s.enabled).map((s) => s.timeSlot);
    if (date !== toKey(new Date())) return slots;
    const now = new Date();
    const minStart = now.getHours() * 60 + now.getMinutes() + (availability?.notice_hours || 0) * 60;
    return slots.filter((s) => {
      const m = /^(\d{2}):(\d{2})/.exec(s);
      return m ? Number(m[1]) * 60 + Number(m[2]) >= minStart : true;
    });
  }, [availability, date]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment || saving) return;
    if (!date || !slot) {
      setError('Vui lòng chọn ngày và khung giờ mới.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appointment.id, action: 'RESCHEDULE', date, time_slot: slot, reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Không đổi được lịch hẹn.');
      onDone(json.data, json.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đổi được lịch hẹn.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); onClose(); }}
      aria-labelledby="reschedule-title"
      className="w-[min(92vw,460px)] rounded-2xl p-0 text-[#0F223A] backdrop:bg-[#0F223A]/50 backdrop:backdrop-blur-sm">
      {appointment && (
        <form onSubmit={submit} className="p-5 space-y-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="reschedule-title" className="text-lg font-bold flex items-center gap-2"><CalendarClock className="w-5 h-5 text-[#B89C66]" /> Đổi lịch xem phòng</h2>
              <p className="text-slate-500 mt-0.5">
                {appointment.room_code || `Phòng #${appointment.room_id}`} · Lịch hiện tại: {appointment.date.split('-').reverse().join('/')} {appointment.time_slot}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Đóng" className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
          </div>

          <div>
            <label htmlFor="reschedule-date" className="block font-bold mb-1">Ngày mới</label>
            <select id="reschedule-date" value={date} onChange={(e) => { setDate(e.target.value); setSlot(''); }}
              className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl bg-white focus:border-[#B89C66] outline-hidden">
              <option value="">Chọn ngày</option>
              {dateOptions.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>

          <div>
            <span className="block font-bold mb-1">Khung giờ mới</span>
            {!date ? <p className="text-slate-500">Chọn ngày trước.</p> : slotOptions.length === 0 ? (
              <p className="text-slate-500">Không còn khung giờ phù hợp trong ngày này.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Khung giờ mới">
                {slotOptions.map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={slot === s} onClick={() => setSlot(s)}
                    className={`px-3 py-2 rounded-xl border text-sm font-semibold ${slot === s ? 'border-[#B89C66] bg-[#FAF0DC] text-[#0F223A]' : 'border-[#E5E3DE] hover:border-[#B89C66]'}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="reschedule-reason" className="block font-bold mb-1">Lý do (không bắt buộc)</label>
            <input id="reschedule-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200}
              placeholder={actor === 'tenant' ? 'VD: Bận việc đột xuất' : 'VD: Chủ trọ bận, hẹn lại giờ khác'}
              className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl focus:border-[#B89C66] outline-hidden" />
          </div>

          <p className="text-xs text-slate-500">
            {actor === 'tenant'
              ? 'Lịch mới sẽ chờ chủ trọ xác nhận lại. Khung giờ cũ được mở cho người khác.'
              : 'Người thuê sẽ nhận thông báo về lịch mới.'}
          </p>
          {error && <p role="alert" className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-[#E5E3DE] font-semibold">Đóng</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] font-bold inline-flex items-center gap-1.5 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Xác nhận đổi lịch
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
