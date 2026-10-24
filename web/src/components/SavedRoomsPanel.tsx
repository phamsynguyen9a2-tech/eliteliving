'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, MapPin, Maximize2 } from 'lucide-react';
import type { Room } from '@/lib/types';

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Còn trống',
  BOOKED_VIEWING: 'Đã có lịch xem',
  RESERVED: 'Đang giữ chỗ',
  RENTED: 'Đã cho thuê',
};

/** Danh sách phòng khách thuê đã lưu (nút tim ở trang chi tiết phòng). */
export default function SavedRoomsPanel() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/user/saved-rooms');
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Không tải được danh sách phòng đã lưu.');
      setRooms(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách phòng đã lưu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (roomId: number) => {
    setRemovingId(roomId);
    try {
      const res = await fetch(`/api/user/saved-rooms?roomId=${roomId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Không bỏ lưu được phòng.');
      setRooms((prev) => prev.filter((room) => room.id !== roomId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không bỏ lưu được phòng.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-[#E5E3DE] p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-lg font-black text-[#0F223A] flex items-center gap-2">
          <Heart className="w-5 h-5 text-[#B89C66]" />
          Phòng đã lưu
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Những phòng bạn bấm tim sẽ nằm ở đây. Danh sách này cũng giúp hệ thống gợi ý phòng hợp với bạn hơn.
        </p>
      </div>

      {error && (
        <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-800">
          {error}
        </p>
      )}

      {loading ? (
        <p role="status" className="text-sm text-slate-500">Đang tải danh sách…</p>
      ) : rooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E3DE] bg-[#F8F8F6] p-6 text-center text-sm text-slate-600">
          Bạn chưa lưu phòng nào. Mở trang chi tiết phòng và bấm biểu tượng tim để lưu.
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rooms.map((room) => (
            <li key={room.id} className="rounded-2xl border border-[#E5E3DE] overflow-hidden flex flex-col">
              <Link href={`/phong/${room.id}`} className="block aspect-[16/9] bg-slate-100 overflow-hidden">
                {room.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={room.images[0]} alt={room.title} className="w-full h-full object-cover" loading="lazy" />
                ) : null}
              </Link>
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/phong/${room.id}`} className="font-bold text-sm text-[#0F223A] hover:text-[#8C6D37] line-clamp-2">
                    {room.title}
                  </Link>
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F2EE] text-[#0F223A]">
                    {STATUS_LABEL[room.status] || room.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" /> {room.district}
                  <span className="mx-1">·</span>
                  <Maximize2 className="w-3.5 h-3.5 shrink-0" /> {room.area} m²
                </p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <strong className="text-[#B89C66] font-black">{room.price.toLocaleString('vi-VN')} đ/tháng</strong>
                  <button
                    type="button"
                    onClick={() => handleRemove(room.id)}
                    disabled={removingId === room.id}
                    className="text-xs font-semibold text-rose-700 hover:text-rose-900 disabled:opacity-50 cursor-pointer"
                  >
                    {removingId === room.id ? 'Đang bỏ lưu…' : 'Bỏ lưu'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
