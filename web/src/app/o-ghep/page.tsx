'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Users,
  Search,
  PlusCircle,
  Sparkles,
  UserCheck,
  Flame,
  Building2,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoommateCard from '@/components/RoommateCard';
import type { RoommatePost } from '@/lib/types';

const DISTRICTS = [
  { value: 'all', label: 'Tất cả khu vực (Tân Phú • Tân Bình • Bình Tân)' },
  { value: 'Tân Phú', label: 'Quận Tân Phú (Sát ĐH HUIT)' },
  { value: 'Tân Bình', label: 'Quận Tân Bình (Etown • Sân Bay)' },
  { value: 'Bình Tân', label: 'Quận Bình Tân (Khu Tên Lửa • Aeon Mall)' },
];

const GENDER_OPTIONS = [
  { value: 'all', label: 'Tất cả giới tính' },
  { value: 'Nữ', label: 'Tìm Nữ ở ghép' },
  { value: 'Nam', label: 'Tìm Nam ở ghép' },
  { value: 'Không yêu cầu', label: 'Nam / Nữ đều được' },
];

const PRICE_RANGES = [
  { value: 0, label: 'Mọi mức chi phí' },
  { value: 1800000, label: 'Dưới 1.8 triệu/tháng' },
  { value: 2500000, label: 'Dưới 2.5 triệu/tháng' },
  { value: 3500000, label: 'Dưới 3.5 triệu/tháng' },
];

const POPULAR_HABITS = [
  'Sạch sẽ',
  'Ngủ sớm',
  'Không hút thuốc',
  'Nấu ăn',
  'Yên tĩnh',
  'Thân thiện',
  'Thể thao',
];

export default function RoommateListingPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<RoommatePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [maxRent, setMaxRent] = useState(0);
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDistrict !== 'all') params.set('district', selectedDistrict);
      if (selectedGender !== 'all') params.set('gender', selectedGender);
      if (maxRent > 0) params.set('maxRent', String(maxRent));
      if (search) params.set('search', search);
      if (session?.user?.id) params.set('userId', session.user.id);

      const res = await fetch(`/api/roommate/posts?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        let list: RoommatePost[] = data.data;
        if (selectedHabit) {
          list = list.filter((p) =>
            p.required_habits?.some(
              (h) => h.toLowerCase() === selectedHabit.toLowerCase()
            )
          );
        }
        setPosts(list);
      }
    } catch (err) {
      console.error('Failed to fetch roommate posts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [selectedDistrict, selectedGender, maxRent, selectedHabit, session?.user?.id]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPosts();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F6] text-[#0F223A] font-sans selection:bg-[#B89C66]/20 selection:text-[#8C6D37]">
      <Navbar />

      {/* Hero Section — Luxury Deep Navy & Gold Elite Living */}
      <section className="relative bg-gradient-to-b from-[#0F223A] via-[#142A45] to-[#0F223A] text-white pt-12 pb-16 px-4 border-b border-[#B89C66]/20 overflow-hidden">
        {/* Subtle Ambient Gold Lighting */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#B89C66]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#B89C66]/8 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#B89C66]/15 border border-[#B89C66]/30 text-[#B89C66] text-xs font-bold mb-4 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#B89C66]" />
                <span className="tracking-wide">Elite Living • Kết Nối Ở Ghép Thông Minh</span>
              </div>

              {/* Title với font chuẩn không lỗi */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight font-sans text-white">
                Tìm Người Ở Ghép <br />
                <span className="text-[#B89C66]">Hợp Thói Quen &amp; Lối Sống</span>
              </h1>

              <p className="mt-3.5 text-slate-300 text-sm sm:text-base max-w-xl leading-relaxed">
                Hệ thống đề xuất bạn cùng phòng dựa trên thuật toán tương thích Jaccard: phân tích thói quen giờ giấc, lối sống, ngân sách chia sẻ và độ gần trường học ĐH HUIT / công sở.
              </p>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <Link
                  href="/o-ghep/dang-bai"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#B89C66] hover:bg-[#A38752] text-white text-sm font-bold shadow-lg shadow-[#B89C66]/25 transition-all active:scale-[0.99]"
                >
                  <PlusCircle className="w-4.5 h-4.5" />
                  <span>Đăng tin tìm bạn ở ghép</span>
                </Link>

                <Link
                  href="/o-ghep/ho-so"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-bold backdrop-blur-sm transition-all active:scale-[0.99]"
                >
                  <UserCheck className="w-4.5 h-4.5 text-[#B89C66]" />
                  <span>Hồ sơ cá nhân &amp; Yêu cầu kết nối</span>
                </Link>
              </div>
            </div>

            {/* Quick Metrics Card — Elite Luxury Style */}
            <div className="w-full lg:w-auto bg-[#0F223A]/80 backdrop-blur-xl border border-[#B89C66]/25 rounded-[24px] p-6 text-white shadow-2xl min-w-[290px]">
              <h3 className="text-xs uppercase tracking-[0.16em] text-[#B89C66] font-bold mb-4 flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#B89C66]" />
                Cộng đồng Sinh viên &amp; NVVP
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-xs text-slate-300">Bài tìm bạn đang mở:</span>
                  <span className="text-base font-black text-[#B89C66]">{posts.length} bài đăng</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-xs text-slate-300">Khu vực trọng điểm:</span>
                  <span className="text-xs font-bold text-white">Tân Phú • Tân Bình • Bình Tân</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Tỷ lệ tương thích TB:</span>
                  <span className="text-sm font-black text-[#B89C66]">92.5%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-[24px] border border-[#E5E3DE] shadow-[0_10px_30px_-5px_rgba(15,34,58,0.06)] p-5 sm:p-6 mb-8">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo khu vực, đường, trường học (VD: Lê Trọng Tấn, HUIT, Celadon, Tây Thạnh...)"
                className="w-full pl-11 pr-4 py-3 bg-[#FAF8F5] border border-[#E5E3DE] rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#B89C66] focus:ring-4 focus:ring-[#B89C66]/15 transition-all text-[#0F223A] placeholder-[#94A3B8]"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-[#0F223A] hover:bg-[#B89C66] text-white text-sm font-bold rounded-xl transition-colors cursor-pointer shadow-sm active:scale-95"
            >
              Tìm kiếm
            </button>
          </form>

          {/* Filter Selects */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 border-t border-[#E5E3DE]/70">
            {/* District */}
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">
                Khu vực
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5E3DE] rounded-xl text-xs font-bold text-[#0F223A] focus:outline-none focus:border-[#B89C66] focus:ring-2 focus:ring-[#B89C66]/15"
              >
                {DISTRICTS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">
                Giới tính cần tìm
              </label>
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5E3DE] rounded-xl text-xs font-bold text-[#0F223A] focus:outline-none focus:border-[#B89C66] focus:ring-2 focus:ring-[#B89C66]/15"
              >
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>

            {/* Max Rent */}
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">
                Ngân sách chia sẻ tối đa
              </label>
              <select
                value={maxRent}
                onChange={(e) => setMaxRent(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5E3DE] rounded-xl text-xs font-bold text-[#0F223A] focus:outline-none focus:border-[#B89C66] focus:ring-2 focus:ring-[#B89C66]/15"
              >
                {PRICE_RANGES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Habit Pills */}
          <div className="pt-4 border-t border-[#E5E3DE]/70 mt-3.5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#64748B] mr-1">Lọc theo thói quen:</span>
            {POPULAR_HABITS.map((habit) => {
              const active = selectedHabit === habit;
              return (
                <button
                  key={habit}
                  type="button"
                  onClick={() => setSelectedHabit(active ? null : habit)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#B89C66] text-white shadow-sm'
                      : 'bg-[#FAF8F5] border border-[#E5E3DE] text-[#0F223A] hover:border-[#B89C66] hover:text-[#B89C66]'
                  }`}
                >
                  {habit}
                </button>
              );
            })}
            {selectedHabit && (
              <button
                type="button"
                onClick={() => setSelectedHabit(null)}
                className="text-xs text-rose-600 font-bold hover:underline ml-2"
              >
                Xóa lọc thói quen
              </button>
            )}
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#0F223A] tracking-tight">
              Danh sách bài đăng tìm bạn ở ghép ({posts.length})
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              Phòng thực tế trong mạng lưới 24 tòa nhà Elite Living (Tân Phú, Tân Bình, Bình Tân)
            </p>
          </div>

          <Link
            href="/o-ghep/dang-bai"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 border-[1.5px] border-[#B89C66] text-[#B89C66] hover:bg-[#B89C66] hover:text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Đăng bài của bạn</span>
          </Link>
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E5E3DE] h-80 animate-pulse" />
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <RoommateCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[24px] border border-[#E5E3DE] p-12 text-center max-w-lg mx-auto my-8">
            <Building2 className="w-12 h-12 text-[#B89C66] mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-bold text-[#0F223A] mb-1">
              Chưa tìm thấy bài đăng phù hợp
            </h3>
            <p className="text-xs text-[#64748B] mb-5 leading-relaxed">
              Bạn có thể điều chỉnh lại bộ lọc ngân sách, khu vực hoặc trở thành người đầu tiên đăng bài tìm bạn ở ghép tại tòa nhà này!
            </p>
            <Link
              href="/o-ghep/dang-bai"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#B89C66] hover:bg-[#A38752] text-white text-xs font-bold rounded-xl shadow-md shadow-[#B89C66]/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Đăng tin tìm bạn ngay</span>
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
