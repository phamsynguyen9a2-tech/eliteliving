'use client';

import React from 'react';
import Link from 'next/link';
import { Users, MapPin, Sparkles, ShieldCheck, Heart, ArrowRight } from 'lucide-react';
import type { RoommatePost } from '@/lib/types';

interface RoommateCardProps {
  post: RoommatePost;
  onBookmark?: (id: string) => void;
  isBookmarked?: boolean;
}

export default function RoommateCard({ post, onBookmark, isBookmarked }: RoommateCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ/tháng';
  };

  const getGenderBadge = (gender: string) => {
    switch (gender) {
      case 'Nữ':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FAF7F2] text-[#8C6D37] border border-[#B89C66]/30 backdrop-blur-sm">
            Tìm Nữ
          </span>
        );
      case 'Nam':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F0F4F8] text-[#0F223A] border border-[#0F223A]/20 backdrop-blur-sm">
            Tìm Nam
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 text-[#0F223A] border border-[#E5E3DE] backdrop-blur-sm">
            Nam / Nữ
          </span>
        );
    }
  };

  const score = post.compatibility_score ? Math.round(post.compatibility_score * 100) : null;

  return (
    <div className="group bg-white rounded-[24px] border border-[#E5E3DE] shadow-[0_10px_30px_-5px_rgba(15,34,58,0.06)] hover:shadow-[0_20px_45px_-8px_rgba(184,156,102,0.18)] hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between">
      {/* Top Image Banner */}
      <div>
        <div className="relative h-48 w-full overflow-hidden bg-slate-100">
          <img
            src={post.images?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80'}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <div>{getGenderBadge(post.gender_preference)}</div>
            {onBookmark && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onBookmark(post.id);
                }}
                className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-700 hover:text-rose-500 hover:bg-white transition-colors cursor-pointer shadow-xs"
              >
                <Heart className={`w-4 h-4 ${isBookmarked ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            )}
          </div>

          {/* Compatibility Score Tag (if available) */}
          {score !== null && (
            <div className="absolute bottom-3 left-3 bg-[#B89C66] backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>Phù hợp {score}%</span>
            </div>
          )}

          {/* Roommate count badge */}
          <div className="absolute bottom-3 right-3 bg-[#0F223A]/80 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-[#B89C66]" />
            <span>{post.current_people}/{post.max_people} người</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Location */}
          <div className="flex items-center gap-1.5 text-[#64748B] text-xs font-semibold mb-2">
            <MapPin className="w-3.5 h-3.5 text-[#B89C66] shrink-0" />
            <span className="truncate">{post.district} • {post.address}</span>
          </div>

          {/* Title */}
          <h3 className="text-[15px] font-bold text-[#0F223A] line-clamp-2 group-hover:text-[#B89C66] transition-colors mb-3 leading-snug">
            {post.title}
          </h3>

          {/* Habits Tags */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {post.required_habits?.slice(0, 3).map((habit, idx) => (
              <span
                key={idx}
                className="px-2.5 py-0.5 rounded-lg bg-[#FAF8F5] text-[#0F223A] border border-[#E5E3DE] text-[11px] font-medium"
              >
                {habit}
              </span>
            ))}
            {post.required_habits?.length > 3 && (
              <span className="px-1.5 py-0.5 rounded-lg bg-[#FAF8F5] text-[#94A3B8] text-[11px] border border-[#E5E3DE]">
                +{post.required_habits.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer: Price & Poster Info */}
      <div className="p-5 pt-0">
        <div className="pt-3 border-t border-[#E5E3DE]/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={post.user_image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
              alt={post.user_name || 'Người đăng'}
              className="w-8 h-8 rounded-full object-cover border border-[#B89C66]/40"
            />
            <div className="text-xs">
              <p className="font-bold text-[#0F223A] truncate max-w-[110px] leading-tight">
                {post.user_name || 'Người thuê'}
              </p>
              <span className="text-[10px] text-[#B89C66] font-semibold flex items-center gap-0.5 mt-0.5">
                <ShieldCheck className="w-3 h-3 text-[#B89C66]" /> Đã xác thực
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10.5px] text-[#94A3B8] block leading-none font-medium">Chia sẻ chỉ</span>
            <span className="text-base sm:text-lg font-black text-[#B89C66] leading-tight mt-0.5 block">
              {formatPrice(post.shared_rent)}
            </span>
          </div>
        </div>

        <Link
          href={`/o-ghep/${post.id}`}
          className="mt-3.5 w-full py-2.5 bg-[#0F223A] hover:bg-[#B89C66] text-white text-xs font-bold uppercase tracking-wider text-center rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
        >
          <span>Xem chi tiết &amp; Liên hệ</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
