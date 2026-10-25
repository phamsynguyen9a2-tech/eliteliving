'use client';

import React, { useEffect, useState } from 'react';
import { scopedFetch as fetch } from '@/lib/scoped-fetch';
import { Search, Flame } from 'lucide-react';

interface Insights {
  windowDays: number;
  totalSearches: number;
  districts: Array<{ district: string; searches: number; share: number; avgMaxPrice: number | null }>;
  topRooms: Array<{ roomId: number; roomCode: string; title: string; district: string; views: number; saves: number; bookings: number; score: number }>;
}

/** Dashboard: khu vực có nhu cầu tìm kiếm cao + phòng nhận nhiều lượt quan tâm (đề cương 6a). */
export default function DemandInsights({ refreshKey = 0 }: { refreshKey?: number }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/insights?days=${days}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'Không tải được thống kê nhu cầu.');
        setData(json.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không tải được thống kê nhu cầu.');
      }
    })();
  }, [days, refreshKey]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <section className="bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-base text-[#0F223A] flex items-center gap-2"><Search className="w-4 h-4 text-[#B89C66]" /> Khu vực được tìm kiếm nhiều</h3>
            <p className="text-sm text-slate-500">{data ? `${data.totalSearches.toLocaleString('vi-VN')} lượt tìm có tiêu chí trong ${data.windowDays} ngày` : 'Đang tải…'}</p>
          </div>
          <select aria-label="Khoảng thời gian thống kê" value={days} onChange={(e) => setDays(Number(e.target.value))}
            className="px-2.5 py-1.5 text-sm border border-[#E5E3DE] rounded-xl bg-white font-medium">
            <option value={7}>7 ngày</option>
            <option value={30}>30 ngày</option>
            <option value={90}>90 ngày</option>
          </select>
        </div>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        {data && data.districts.length === 0 && (
          <p className="text-sm text-slate-500">Chưa có lượt tìm kiếm theo khu vực. Số liệu được ghi khi người thuê lọc phòng theo quận, giá, loại phòng hoặc từ khóa.</p>
        )}
        <ol className="space-y-2.5">
          {data?.districts.map((d, i) => (
            <li key={d.district}>
              <div className="flex justify-between gap-2 text-sm mb-1">
                <span><span className="text-slate-400 tabular-nums mr-1.5">{i + 1}.</span><strong className="text-[#0F223A]">{d.district}</strong>
                  {d.avgMaxPrice && <span className="text-xs text-slate-500 ml-1.5">ngân sách TB ≤ {(d.avgMaxPrice / 1_000_000).toFixed(1)} tr</span>}</span>
                <span className="tabular-nums font-semibold">{d.searches} lượt · {d.share}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#F3F2EE] overflow-hidden"><div className="h-full rounded-full bg-[#B89C66]" style={{ width: `${d.share}%` }} /></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-6 shadow-xs">
        <h3 className="font-bold text-base text-[#0F223A] flex items-center gap-2"><Flame className="w-4 h-4 text-[#B89C66]" /> Phòng nhận nhiều lượt quan tâm</h3>
        <p className="text-sm text-slate-500 mb-4">Điểm = lượt xem + 2 × lượt lưu + 3 × lượt đặt lịch của người thuê đã đăng nhập</p>
        {data && data.topRooms.length === 0 && <p className="text-sm text-slate-500">Chưa có tương tác trong khoảng thời gian này.</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            {data && data.topRooms.length > 0 && (
              <thead className="text-xs text-slate-500 uppercase">
                <tr><th className="py-2 pr-2">Phòng</th><th className="py-2 px-2 text-right">Xem</th><th className="py-2 px-2 text-right">Lưu</th><th className="py-2 px-2 text-right">Đặt lịch</th><th className="py-2 pl-2 text-right">Điểm</th></tr>
              </thead>
            )}
            <tbody className="divide-y divide-slate-100">
              {data?.topRooms.map((r) => (
                <tr key={r.roomId}>
                  <td className="py-2 pr-2"><a href={`/phong/${r.roomId}`} target="_blank" rel="noreferrer" className="font-bold text-[#8C6D37] hover:underline">{r.roomCode}</a><span className="block text-xs text-slate-500 line-clamp-1">{r.title} · {r.district}</span></td>
                  <td className="py-2 px-2 text-right tabular-nums">{r.views}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{r.saves}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{r.bookings}</td>
                  <td className="py-2 pl-2 text-right tabular-nums font-bold">{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
