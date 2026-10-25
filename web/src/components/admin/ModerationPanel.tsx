'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { scopedFetch as fetch } from '@/lib/scoped-fetch';
import { runListingChecks } from '@/lib/listing-checks';
import type { Room } from '@/lib/types';
import { CheckCircle2, XCircle, ExternalLink, MapPin, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { EmptyStateCard } from '@/components/landlord/LandlordPrimitives';

type QueueStatus = 'PENDING' | 'REJECTED' | 'APPROVED';
const TABS: Array<{ id: QueueStatus; label: string }> = [
  { id: 'PENDING', label: 'Chờ duyệt' },
  { id: 'REJECTED', label: 'Đã từ chối' },
  { id: 'APPROVED', label: 'Đã duyệt gần đây' },
];

const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} đ`;
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('vi-VN') : '—');

/** Kiểm duyệt tin đăng của chủ trọ trước khi công khai (đề cương mục 6a). */
export default function ModerationPanel({ onChanged, refreshKey = 0 }: { onChanged?: () => void; refreshKey?: number }) {
  const [status, setStatus] = useState<QueueStatus>('PENDING');
  const [items, setItems] = useState<Room[]>([]);
  const [counts, setCounts] = useState<Record<QueueStatus, number>>({ PENDING: 0, REJECTED: 0, APPROVED: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/moderation?status=${status}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Không tải được hàng đợi kiểm duyệt.');
      setItems(json.data.items);
      setCounts(json.data.counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được hàng đợi kiểm duyệt.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const decide = async (room: Room, decision: 'APPROVED' | 'REJECTED') => {
    if (busyId) return;
    if (decision === 'REJECTED' && reason.trim().length < 5) {
      setError('Vui lòng ghi lý do từ chối (tối thiểu 5 ký tự).');
      return;
    }
    setBusyId(room.id);
    setError(null);
    try {
      const res = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, decision, note: decision === 'REJECTED' ? reason : undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Không lưu được quyết định.');
      setNotice(json.message);
      setRejecting(null);
      setReason('');
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được quyết định.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg text-[#0F223A]">Kiểm duyệt tin đăng</h3>
          <p className="text-sm text-slate-500">
            Tin chủ trọ đăng mới hoặc sửa nội dung chỉ hiện công khai sau khi được duyệt. Kiểm tra thông tin phòng, tọa độ,
            giá thuê, diện tích, tiện ích và hình ảnh.
          </p>
        </div>
        <button type="button" onClick={load} className="self-start px-3 py-1.5 rounded-xl border border-[#E5E3DE] text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-[#F8F8F6]">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Tải lại
        </button>
      </div>

      <div role="tablist" aria-label="Lọc tin theo trạng thái duyệt" className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-[#F3F2EE]">
        {TABS.map((tab) => (
          <button key={tab.id} role="tab" type="button" aria-selected={status === tab.id} onClick={() => setStatus(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold ${status === tab.id ? 'bg-white text-[#8C6D37] shadow-xs' : 'text-slate-600'}`}>
            {tab.label}
            {tab.id !== 'APPROVED' && <span className="ml-1.5 tabular-nums">({counts[tab.id]})</span>}
          </button>
        ))}
      </div>

      {notice && <p role="status" className="p-3 rounded-xl border border-[#E5D7B7] bg-[#FAF0DC] text-sm text-[#0F223A]">{notice}</p>}
      {error && <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</p>}

      {!loading && items.length === 0 && (
        <EmptyStateCard
          title={status === 'PENDING' ? 'Không có tin nào chờ duyệt' : 'Danh sách trống'}
          description={status === 'PENDING' ? 'Tin mới của chủ trọ sẽ xuất hiện ở đây.' : 'Chưa có tin ở trạng thái này.'}
        />
      )}

      <div className="space-y-4">
        {items.map((room) => {
          const checks = runListingChecks(room);
          const failed = checks.filter((c) => !c.ok).length;
          return (
            <article key={room.id} className="rounded-2xl border border-[#E5E3DE] overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-0">
                <div className="bg-[#F8F8F6] p-2 grid grid-cols-2 gap-1.5 content-start">
                  {(room.images || []).slice(0, 4).map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src} alt={`Ảnh ${i + 1} của ${room.room_code}`} className="w-full h-20 object-cover rounded-lg border border-[#E5E3DE]" />
                  ))}
                  {(!room.images || room.images.length === 0) && (
                    <div className="col-span-2 h-24 grid place-items-center text-xs text-slate-500">Chưa có ảnh</div>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="inline-block text-xs font-extrabold px-2 py-0.5 rounded-md bg-[#0F223A] text-[#B89C66]">{room.room_code}</span>
                      <h4 className="mt-1 font-bold text-[#0F223A]">{room.title}</h4>
                      <p className="text-sm text-slate-600">{room.address} · {room.district}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Chủ trọ: <strong>{room.landlord_name}</strong> · {room.landlord_phone} · Gửi lúc {when(room.submitted_at)}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${failed === 0 ? 'bg-[#F3E2BE] text-[#0F223A]' : 'bg-amber-100 text-amber-900'}`}>
                      {failed === 0 ? 'Đạt 6/6 tiêu chí' : `${failed} tiêu chí cần xem lại`}
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div><dt className="text-xs text-slate-500">Giá thuê</dt><dd className="font-bold text-[#0F223A]">{vnd(room.price)}</dd></div>
                    <div><dt className="text-xs text-slate-500">Tiền cọc</dt><dd className="font-semibold">{vnd(room.deposit || 0)}</dd></div>
                    <div><dt className="text-xs text-slate-500">Diện tích</dt><dd className="font-semibold">{room.area} m² · {room.room_type}</dd></div>
                    <div>
                      <dt className="text-xs text-slate-500">Tọa độ</dt>
                      <dd>
                        <a className="inline-flex items-center gap-1 text-[#8C6D37] font-semibold hover:underline" target="_blank" rel="noreferrer"
                          href={`https://www.google.com/maps?q=${room.latitude},${room.longitude}`}>
                          <MapPin className="w-3.5 h-3.5" /> Xem bản đồ
                        </a>
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap gap-1.5">
                    {(room.amenities || []).map((a) => (
                      <span key={a} className="px-2 py-0.5 rounded-full text-xs bg-[#F3F2EE] text-[#0F223A] border border-[#E5E3DE]">{a}</span>
                    ))}
                  </div>
                  {room.description && <p className="text-sm text-slate-600 line-clamp-3">{room.description}</p>}

                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm" aria-label="Kiểm tra tự động">
                    {checks.map((c) => (
                      <li key={c.key} className="flex items-start gap-1.5">
                        {c.ok ? <ShieldCheck className="w-4 h-4 text-[#8C6D37] shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                        <span><strong>{c.label}:</strong> <span className={c.ok ? 'text-slate-600' : 'text-amber-800'}>{c.detail}</span></span>
                      </li>
                    ))}
                  </ul>

                  {room.listing_status === 'REJECTED' && room.moderation_note && (
                    <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-2.5">Lý do từ chối: {room.moderation_note}</p>
                  )}

                  {rejecting === room.id ? (
                    <div className="space-y-2">
                      <label htmlFor={`reject-${room.id}`} className="block text-sm font-bold text-slate-700">Lý do từ chối (chủ trọ sẽ thấy):</label>
                      <textarea id={`reject-${room.id}`} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500}
                        placeholder="Ví dụ: Ảnh không phải ảnh thực tế của phòng; tọa độ lệch so với địa chỉ."
                        className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl text-sm focus:border-[#B89C66] outline-hidden" />
                      <div className="flex gap-2">
                        <button type="button" disabled={busyId === room.id} onClick={() => decide(room, 'REJECTED')}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-sm font-bold disabled:opacity-60">Xác nhận từ chối</button>
                        <button type="button" onClick={() => { setRejecting(null); setReason(''); }} className="px-3 py-1.5 rounded-xl border border-[#E5E3DE] text-sm font-semibold">Hủy</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <a href={`/phong/${room.id}`} target="_blank" rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl border border-[#E5E3DE] text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-[#F8F8F6]">
                        <ExternalLink className="w-3.5 h-3.5" /> Xem trang phòng
                      </a>
                      {room.listing_status !== 'APPROVED' && (
                        <button type="button" disabled={busyId === room.id} onClick={() => decide(room, 'APPROVED')}
                          className="px-3 py-1.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-60">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt và công khai
                        </button>
                      )}
                      {room.listing_status !== 'REJECTED' && (
                        <button type="button" onClick={() => { setRejecting(room.id); setReason(''); }}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm font-bold inline-flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5" /> {room.listing_status === 'APPROVED' ? 'Gỡ tin' : 'Từ chối'}
                        </button>
                      )}
                    </div>
                  )}
                  {room.listing_status === 'APPROVED' && room.moderated_at && (
                    <p className="text-xs text-slate-500">Duyệt lúc {when(room.moderated_at)}</p>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
