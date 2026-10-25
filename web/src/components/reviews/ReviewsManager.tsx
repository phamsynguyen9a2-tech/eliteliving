'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { EyeOff, Eye, MessageSquareReply, RefreshCw, Trash2 } from 'lucide-react';
import { scopedFetch as fetch } from '@/lib/scoped-fetch';
import StarRating from './StarRating';

interface ManagedReview {
  id: string;
  room_id: number;
  room_code?: string;
  room_title?: string;
  rating: number;
  comment: string;
  author: string;
  landlord_reply: string | null;
  replied_at: string | null;
  is_hidden: boolean;
  hidden_reason: string | null;
  created_at: string;
}

type Filter = 'all' | 'unreplied' | 'low' | 'hidden';
const FILTERS: Array<{ id: Filter; label: string; adminOnly?: boolean }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'unreplied', label: 'Chưa trả lời' },
  { id: 'low', label: '1–2 sao' },
  { id: 'hidden', label: 'Đã ẩn', adminOnly: true },
];

/**
 * Quản lý phản hồi / đánh giá: chủ trọ trả lời đánh giá về phòng của mình,
 * quản trị viên xem toàn hệ thống và ẩn đánh giá vi phạm.
 */
export default function ReviewsManager({ mode, refreshKey = 0 }: { mode: 'landlord' | 'admin'; refreshKey?: number }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<ManagedReview[]>([]);
  const [summary, setSummary] = useState<{ average: number; count: number; unreplied: number; distribution: number[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [hidingId, setHidingId] = useState<string | null>(null);
  const [hideReason, setHideReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?scope=manage&filter=${filter}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Không tải được đánh giá.');
      setItems(json.data.items);
      setSummary(json.data.summary);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được đánh giá.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const patch = async (payload: Record<string, unknown>) => {
    if (busy) return false;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Không lưu được.');
      setNotice(json.message);
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const remove = async (review: ManagedReview) => {
    if (!window.confirm(`Xóa vĩnh viễn đánh giá của ${review.author}?`)) return;
    const res = await fetch(`/api/reviews?id=${encodeURIComponent(review.id)}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (res.ok) setNotice(json.message || 'Đã xóa đánh giá.');
    else setError(json.message || 'Không xóa được đánh giá.');
    await load();
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg text-[#0F223A]">Đánh giá &amp; phản hồi của người thuê</h3>
          <p className="text-sm text-slate-500">
            {mode === 'landlord'
              ? 'Trả lời đánh giá về phòng của bạn. Câu trả lời hiện công khai trên trang phòng.'
              : 'Theo dõi chất lượng phòng toàn hệ thống, ẩn đánh giá vi phạm (spam, xúc phạm, lộ thông tin cá nhân).'}
          </p>
        </div>
        {summary && (
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-extrabold text-[#0F223A]">{summary.count ? summary.average.toFixed(1) : '—'}</div>
              <StarRating value={summary.average} size={12} />
            </div>
            <div><strong>{summary.count}</strong> đánh giá<br /><span className="text-slate-500">{summary.unreplied} chưa trả lời</span></div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Lọc đánh giá" className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-[#F3F2EE]">
          {FILTERS.filter((f) => mode === 'admin' || !f.adminOnly).map((f) => (
            <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold ${filter === f.id ? 'bg-white text-[#8C6D37] shadow-xs' : 'text-slate-600'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={load} className="px-3 py-1.5 rounded-xl border border-[#E5E3DE] text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-[#F8F8F6]">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Tải lại
        </button>
      </div>

      {notice && <p role="status" className="p-3 rounded-xl border border-[#E5D7B7] bg-[#FAF0DC] text-sm text-[#0F223A]">{notice}</p>}
      {error && <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</p>}
      {!loading && items.length === 0 && <p className="text-sm text-slate-500 py-6 text-center">Chưa có đánh giá nào ở mục này.</p>}

      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.id} className={`rounded-2xl border p-4 space-y-2 ${r.is_hidden ? 'border-dashed border-slate-300 bg-slate-50' : 'border-[#E5E3DE]'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-[#0F223A] text-[#B89C66]">{r.room_code || `#${r.room_id}`}</span>
                <span className="text-sm font-bold text-[#0F223A]">{r.author}</span>
                <StarRating value={r.rating} size={14} />
                {r.is_hidden && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">Đã ẩn</span>}
              </div>
              <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString('vi-VN')}</span>
            </div>
            {r.room_title && <p className="text-xs text-slate-500">{r.room_title}</p>}
            {r.comment ? <p className="text-sm text-slate-700 whitespace-pre-line">{r.comment}</p> : <p className="text-sm italic text-slate-400">Không có nhận xét</p>}
            {r.is_hidden && r.hidden_reason && <p className="text-xs text-slate-600">Lý do ẩn: {r.hidden_reason}</p>}
            {r.landlord_reply && replyingId !== r.id && (
              <div className="ml-3 pl-3 border-l-2 border-[#B89C66] text-sm">
                <span className="text-xs font-bold text-[#8C6D37]">Phản hồi của chủ trọ</span>
                <p className="text-slate-700 whitespace-pre-line">{r.landlord_reply}</p>
              </div>
            )}

            {replyingId === r.id ? (
              <div className="space-y-2">
                <label htmlFor={`reply-${r.id}`} className="block text-sm font-bold text-slate-700">Phản hồi công khai:</label>
                <textarea id={`reply-${r.id}`} rows={3} maxLength={1000} value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl text-sm focus:border-[#B89C66] outline-hidden" />
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={async () => { if (await patch({ id: r.id, reply: replyText })) setReplyingId(null); }}
                    className="px-3 py-1.5 rounded-xl bg-[#B89C66] text-[#0F223A] text-sm font-bold disabled:opacity-60">Lưu phản hồi</button>
                  <button type="button" onClick={() => setReplyingId(null)} className="px-3 py-1.5 rounded-xl border border-[#E5E3DE] text-sm font-semibold">Hủy</button>
                </div>
              </div>
            ) : hidingId === r.id ? (
              <div className="space-y-2">
                <label htmlFor={`hide-${r.id}`} className="block text-sm font-bold text-slate-700">Lý do ẩn đánh giá:</label>
                <input id={`hide-${r.id}`} value={hideReason} onChange={(e) => setHideReason(e.target.value)} maxLength={200}
                  placeholder="Ví dụ: Ngôn từ xúc phạm / quảng cáo / lộ số điện thoại"
                  className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl text-sm focus:border-[#B89C66] outline-hidden" />
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={async () => { if (await patch({ id: r.id, hidden: true, reason: hideReason })) setHidingId(null); }}
                    className="px-3 py-1.5 rounded-xl bg-[#0F223A] text-white text-sm font-bold disabled:opacity-60">Ẩn đánh giá</button>
                  <button type="button" onClick={() => setHidingId(null)} className="px-3 py-1.5 rounded-xl border border-[#E5E3DE] text-sm font-semibold">Hủy</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" onClick={() => { setReplyingId(r.id); setReplyText(r.landlord_reply || ''); }}
                  className="px-3 py-1.5 rounded-xl bg-[#FAF0DC] text-[#8C6D37] text-sm font-bold inline-flex items-center gap-1.5 hover:bg-[#F3E2BE]">
                  <MessageSquareReply className="w-3.5 h-3.5" /> {r.landlord_reply ? 'Sửa phản hồi' : 'Trả lời'}
                </button>
                {mode === 'admin' && (r.is_hidden ? (
                  <button type="button" disabled={busy} onClick={() => patch({ id: r.id, hidden: false })}
                    className="px-3 py-1.5 rounded-xl border border-[#E5E3DE] text-sm font-semibold inline-flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Hiện lại</button>
                ) : (
                  <button type="button" onClick={() => { setHidingId(r.id); setHideReason(''); }}
                    className="px-3 py-1.5 rounded-xl border border-[#E5E3DE] text-sm font-semibold inline-flex items-center gap-1.5"><EyeOff className="w-3.5 h-3.5" /> Ẩn</button>
                ))}
                {mode === 'admin' && (
                  <button type="button" onClick={() => remove(r)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-rose-100"><Trash2 className="w-3.5 h-3.5" /> Xóa</button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
