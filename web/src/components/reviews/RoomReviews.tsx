'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquareQuote, Trash2 } from 'lucide-react';
import { scopedFetch as fetch } from '@/lib/scoped-fetch';
import StarRating from './StarRating';

interface ReviewView {
  id: string;
  rating: number;
  comment: string;
  author: string;
  is_mine: boolean;
  landlord_reply: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ReviewsData {
  summary: { average: number; count: number; distribution: number[] };
  items: ReviewView[];
  mine: ReviewView | null;
  canReview: boolean;
  signedIn: boolean;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

/** Đánh giá & phản hồi của người thuê trên trang chi tiết phòng. */
export default function RoomReviews({ roomId, refreshKey = 0 }: { roomId: number; refreshKey?: number }) {
  const [data, setData] = useState<ReviewsData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews?roomId=${roomId}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Không tải được đánh giá.');
      setData(json.data);
      setLoadError(null);
      if (json.data.mine) {
        setRating(json.data.mine.rating);
        setComment(json.data.mine.comment);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được đánh giá.');
    }
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!rating) {
      setMessage({ tone: 'error', text: 'Vui lòng chọn số sao.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, rating, comment }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Không gửi được đánh giá.');
      setMessage({ tone: 'ok', text: json.message });
      setEditing(false);
      await load();
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Không gửi được đánh giá.' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Xóa đánh giá của bạn?')) return;
    const res = await fetch(`/api/reviews?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    setMessage({ tone: res.ok ? 'ok' : 'error', text: json.message || (res.ok ? 'Đã xóa đánh giá.' : 'Không xóa được đánh giá.') });
    setRating(0);
    setComment('');
    await load();
  };

  const summary = data?.summary;
  const showForm = data?.canReview && (!data.mine || editing);

  return (
    <div data-reveal className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5" aria-labelledby={`reviews-${roomId}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 id={`reviews-${roomId}`} className="text-base font-extrabold text-[#0F223A] flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4 text-[#B89C66]" /> Đánh giá của người thuê
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Chỉ người đã thuê hoặc đã đi xem phòng mới viết được đánh giá.</p>
        </div>
        {summary && summary.count > 0 && (
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-2xl font-extrabold text-[#0F223A]">{summary.average.toFixed(1)}</span>
              <StarRating value={summary.average} />
            </div>
            <p className="text-xs text-slate-500">{summary.count} đánh giá</p>
          </div>
        )}
      </div>

      {loadError && <p role="alert" className="text-sm text-rose-700">{loadError}</p>}

      {summary && summary.count > 0 && (
        <div className="space-y-1" aria-label="Phân bố số sao">
          {[5, 4, 3, 2, 1].map((star) => {
            const n = summary.distribution[star - 1] || 0;
            const pct = summary.count ? (n / summary.count) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="w-8 tabular-nums">{star} sao</span>
                <div className="flex-1 h-1.5 rounded-full bg-[#F3F2EE] overflow-hidden"><div className="h-full bg-[#B89C66]" style={{ width: `${pct}%` }} /></div>
                <span className="w-6 text-right tabular-nums">{n}</span>
              </div>
            );
          })}
        </div>
      )}

      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-sm rounded-xl p-2.5 border ${message.tone === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-[#FAF0DC] border-[#E5D7B7] text-[#0F223A]'}`}>
          {message.text}
        </p>
      )}

      {data && !data.signedIn && (
        <p className="text-sm text-slate-600">
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { tab: 'login' } }))}
            className="font-bold text-[#8C6D37] hover:underline">Đăng nhập</button> để đánh giá phòng bạn đã thuê hoặc đã xem.
        </p>
      )}
      {data && data.signedIn && !data.canReview && !data.mine && (
        <p className="text-sm text-slate-500">Bạn có thể đánh giá sau khi hoàn tất lịch xem phòng hoặc ký hợp đồng thuê phòng này.</p>
      )}

      {data?.mine && !editing && (
        <div className="rounded-2xl border border-[#E5D7B7] bg-[#FAF8F3] p-3.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-[#0F223A]">Đánh giá của bạn</span>
            <div className="flex items-center gap-2">
              {data.canReview && <button type="button" onClick={() => setEditing(true)} className="text-xs font-bold text-[#8C6D37] hover:underline">Sửa</button>}
              <button type="button" onClick={() => remove(data.mine!.id)} aria-label="Xóa đánh giá của bạn" className="text-slate-500 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <StarRating value={data.mine.rating} size={14} />
          {data.mine.comment && <p className="mt-1 text-slate-700 whitespace-pre-line">{data.mine.comment}</p>}
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-200 p-4">
          <div>
            <span className="block text-sm font-bold text-[#0F223A] mb-1">Bạn chấm phòng này mấy sao?</span>
            <StarRating value={rating} onChange={setRating} size={22} label="Chọn số sao đánh giá" />
          </div>
          <div>
            <label htmlFor={`review-comment-${roomId}`} className="block text-sm font-bold text-[#0F223A] mb-1">Nhận xét (không bắt buộc)</label>
            <textarea id={`review-comment-${roomId}`} value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000}
              placeholder="Phòng có giống ảnh không? Chủ trọ hỗ trợ thế nào? An ninh, tiếng ồn, điện nước…"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-[#B89C66] outline-hidden" />
            <p className="text-xs text-slate-400 text-right">{comment.length}/1000</p>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-sm font-bold disabled:opacity-60">
              {saving ? 'Đang gửi…' : data?.mine ? 'Lưu đánh giá' : 'Gửi đánh giá'}
            </button>
            {editing && <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold">Hủy</button>}
          </div>
        </form>
      )}

      {data && data.items.filter((r) => !r.is_mine).length === 0 && !data.mine && (
        <p className="text-sm text-slate-500">Phòng chưa có đánh giá nào.</p>
      )}

      <ul className="space-y-4">
        {data?.items.filter((r) => !r.is_mine).map((r) => (
          <li key={r.id} className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-[#0F223A]">{r.author}</span>
              <span className="text-xs text-slate-400">{fmtDate(r.created_at)}</span>
            </div>
            <StarRating value={r.rating} size={14} />
            {r.comment && <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">{r.comment}</p>}
            {r.landlord_reply && (
              <div className="mt-2 ml-3 pl-3 border-l-2 border-[#B89C66] text-sm">
                <span className="text-xs font-bold text-[#8C6D37]">Chủ trọ phản hồi</span>
                <p className="text-slate-700 whitespace-pre-line">{r.landlord_reply}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
