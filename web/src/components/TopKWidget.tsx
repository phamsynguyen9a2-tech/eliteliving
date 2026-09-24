'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, DollarSign, SlidersHorizontal, ArrowRight, ShieldCheck, Heart } from 'lucide-react';
import { Room } from '@/lib/types';
import Link from 'next/link';

interface TopKWidgetProps {
  onBookRoom: (room: Room) => void;
}

export default function TopKWidget({ onBookRoom }: TopKWidgetProps) {
  const [budget, setBudget] = useState(5500000);
  const [radius, setRadius] = useState(5.0);
  const [recommendations, setRecommendations] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<any>(null);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/recommend?budget=${budget}&radius=${radius}&k=4`);
      const json = await res.json();
      if (json.success) {
        setRecommendations(json.data);
        setMetadata(json.metadata);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [budget, radius]);

  return (
    <section id="goi-y-thong-minh" className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden mb-12 border border-slate-800">
      {/* Background glow & accents */}
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Công Nghệ Đề Xuất Thông Minh (AI Smart Matching)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Gợi Ý Căn Hộ &amp; Phòng Trọ Phù Hợp Nhất
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Hệ thống tự động phân tích dựa trên <strong className="text-blue-300">ngân sách thực tế</strong>, <strong className="text-amber-300">khoảng cách di chuyển</strong> &amp; <strong className="text-slate-200">tiện ích mong muốn</strong> của bạn.
          </p>
        </div>

        {/* Performance metrics badge */}
        {metadata && (
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 px-4 flex items-center gap-4 text-xs shrink-0 shadow-inner">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Tốc độ tìm kiếm</span>
              <span className="font-extrabold text-emerald-400 text-sm">{metadata.latency_ms} ms</span>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Mức độ tương thích</span>
              <span className="font-extrabold text-amber-300 text-sm">Chuẩn xác cao</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter sliders */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 mb-6 text-xs">
        <div>
          <div className="flex justify-between font-semibold mb-1">
            <span>Ngân sách tối đa</span>
            <span className="text-amber-400 font-bold">{budget.toLocaleString('vi-VN')} đ/tháng</span>
          </div>
          <input
            type="range"
            min={2500000}
            max={12000000}
            step={500000}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between font-semibold mb-1">
            <span>Bán kính từ ĐH Công Thương (HUIT)</span>
            <span className="text-blue-300 font-bold">{radius} km</span>
          </div>
          <input
            type="range"
            min={1.0}
            max={15.0}
            step={0.5}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between sm:col-span-2 lg:col-span-1 pt-2 sm:pt-0">
          <div className="text-[11px] text-slate-300">
            <MapPin className="w-3.5 h-3.5 inline text-rose-400 mr-1" />
            Khu vực: Tân Phú • Tân Bình • Bình Tân
          </div>
          <button
            onClick={fetchRecommendations}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Làm mới gợi ý
          </button>
        </div>
      </div>

      {/* Recommended Rooms Cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-white/5 animate-pulse"></div>
          ))
        ) : recommendations.length === 0 ? (
          <div className="col-span-full py-8 text-center text-sm text-slate-400">
            Không tìm thấy phòng phù hợp với tiêu chí hiện tại. Hãy tăng ngân sách hoặc mở rộng bán kính!
          </div>
        ) : (
          recommendations.map((room, idx) => {
            const matchPercent = Math.round((room.score || 0.85) * 100);
            return (
              <div
                key={room.id}
                className="group bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 hover:border-blue-400/50 transition-all duration-300 overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-xl"
              >
                {/* Image */}
                <Link href={`/phong/${room.id}`} className="relative h-36 w-full overflow-hidden bg-slate-800 block">
                  <img
                    src={room.images[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600'}
                    alt={room.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-blue-600/90 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Top {idx + 1} • {matchPercent}% phù hợp</span>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded">
                    {room.district} • {(room as any).calculated_distance || 2.4} km
                  </div>
                </Link>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <Link
                      href={`/phong/${room.id}`}
                      className="font-bold text-sm text-white line-clamp-1 group-hover:text-blue-300 transition-colors block"
                    >
                      {room.title}
                    </Link>
                    <p className="text-[11px] text-slate-300 line-clamp-1 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>{room.address}</span>
                    </p>

                    {/* Amenities pills */}
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {room.amenities.slice(0, 2).map((a, i) => (
                        <span key={i} className="text-[10px] bg-white/10 text-blue-200 px-1.5 py-0.5 rounded">
                          {a}
                        </span>
                      ))}
                      {room.amenities.length > 2 && (
                        <span className="text-[10px] bg-white/10 text-slate-300 px-1.5 py-0.5 rounded">
                          +{room.amenities.length - 2}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-white/10 flex items-center justify-between gap-1.5">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Giá thuê</span>
                      <span className="text-sm font-extrabold text-amber-400">
                        {room.price.toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/phong/${room.id}`}
                        className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Chi tiết
                      </Link>
                      <button
                        onClick={() => onBookRoom(room)}
                        className="px-3 py-1.5 bg-white text-slate-900 hover:bg-blue-50 text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>Đặt lịch</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
