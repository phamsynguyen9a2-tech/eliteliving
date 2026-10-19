'use client';

import React, { useState } from 'react';
import { useDiscoveryQuery } from '@/lib/use-discovery-query';
import SwipeRail from '@/components/SwipeRail';
import {
  Sparkles,
  MapPin,
  SlidersHorizontal,
  ArrowRight,
  ShieldCheck,
  Check,
  Compass,
  Navigation,
  Loader2,
  GraduationCap,
  Briefcase,
  Users,
  Heart,
  Sun,
  Key,
  Building2,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { Room } from '@/lib/types';
import Link from 'next/link';
import EliteSelect from './EliteSelect';

interface TopKWidgetProps {
  onBookRoom: (room: Room) => void;
  onOpenRadarMap?: () => void;
}

// 1. Landmark Presets (Bán kính từ các địa điểm trọng điểm trên toàn TP.HCM)
const LANDMARK_OPTIONS = [
  {
    id: 'aeon_tan_phu',
    name: 'Aeon Mall Tân Phú (Celadon)',
    shortName: 'Aeon Tân Phú',
    district: 'Quận Tân Phú',
    lat: 10.8016,
    lng: 106.6163,
    category: 'Trung tâm thương mại',
  },
  {
    id: 'huit',
    name: 'ĐH Công Thương TP.HCM (HUIT)',
    shortName: 'ĐH HUIT (140 Lê Trọng Tấn)',
    district: 'Quận Tân Phú',
    lat: 10.8066,
    lng: 106.6286,
    category: 'Trường Đại học',
  },
  {
    id: 'aeon_binh_tan',
    name: 'Aeon Mall Bình Tân',
    shortName: 'Aeon Bình Tân',
    district: 'Quận Bình Tân',
    lat: 10.7432,
    lng: 106.6125,
    category: 'Trung tâm thương mại',
  },
  {
    id: 'tan_son_nhat',
    name: 'Sân bay Quốc tế Tân Sơn Nhất',
    shortName: 'Sân bay Tân Sơn Nhất',
    district: 'Quận Tân Bình',
    lat: 10.8185,
    lng: 106.6588,
    category: 'Giao thông',
  },
  {
    id: 'dam_sen',
    name: 'Công viên Đầm Sen (Lạc Long Quân)',
    shortName: 'Đầm Sen',
    district: 'Quận Tân Phú / Q11',
    lat: 10.7684,
    lng: 106.6438,
    category: 'Điểm vui chơi',
  },
  {
    id: 'etown',
    name: 'Tòa nhà ETown Cộng Hòa',
    shortName: 'ETown Cộng Hòa',
    district: 'Quận Tân Bình',
    lat: 10.8015,
    lng: 106.6482,
    category: 'Khu văn phòng',
  },
  {
    id: 'iuh_go_vap',
    name: 'ĐH Công Nghiệp TP.HCM (IUH - Gò Vấp)',
    shortName: 'ĐH Công Nghiệp IUH',
    district: 'Quận Gò Vấp',
    lat: 10.8223,
    lng: 106.6874,
    category: 'Trường Đại học',
  },
  {
    id: 'hutech_binh_thanh',
    name: 'ĐH HUTECH & Ngoại Thương (Ngã tư Hàng Xanh)',
    shortName: 'ĐH HUTECH / Hàng Xanh',
    district: 'Quận Bình Thạnh',
    lat: 10.8016,
    lng: 106.7145,
    category: 'Trường Đại học',
  },
  {
    id: 'phan_xich_long',
    name: 'Phố ẩm thực Phan Xích Long (Phú Nhuận)',
    shortName: 'Phan Xích Long (Phú Nhuận)',
    district: 'Quận Phú Nhuận',
    lat: 10.7992,
    lng: 106.6845,
    category: 'Trung tâm thương mại',
  },
  {
    id: 'thao_dien_thu_duc',
    name: 'Khu Thảo Điền & ĐH SPKT (TP. Thủ Đức)',
    shortName: 'Thảo Điền / TP. Thủ Đức',
    district: 'Thành phố Thủ Đức',
    lat: 10.8045,
    lng: 106.7385,
    category: 'Khu đô thị',
  },
  {
    id: 'tdtu_rmit_q7',
    name: 'ĐH Tôn Đức Thắng, RMIT & Phú Mỹ Hưng (Quận 7)',
    shortName: 'ĐH TDTU & RMIT (Quận 7)',
    district: 'Quận 7',
    lat: 10.7326,
    lng: 106.6997,
    category: 'Trường Đại học',
  },
  {
    id: 'bach_khoa_van_hanh_q10',
    name: 'ĐH Bách Khoa, UEH & Vạn Hạnh Mall (Quận 10)',
    shortName: 'Bách Khoa & Vạn Hạnh Mall (Q10)',
    district: 'Quận 10',
    lat: 10.7705,
    lng: 106.6675,
    category: 'Trường Đại học',
  },
  {
    id: 'cvpm_quang_trung_q12',
    name: 'Công viên Phần mềm Quang Trung & An Phú Đông (Quận 12)',
    shortName: 'CVPM Quang Trung (Quận 12)',
    district: 'Quận 12',
    lat: 10.8538,
    lng: 106.6285,
    category: 'Khu văn phòng',
  },
  {
    id: 'ben_thanh_q1',
    name: 'Chợ Bến Thành & Phố đi bộ Nguyễn Huệ (Quận 1)',
    shortName: 'Trung tâm Quận 1',
    district: 'Quận 1',
    lat: 10.7721,
    lng: 106.6983,
    category: 'Trung tâm thương mại',
  },
  {
    id: 'ho_con_rua_q3',
    name: 'Hồ Con Rùa & ĐH Kinh Tế UEH (Quận 3)',
    shortName: 'Trung tâm Quận 3',
    district: 'Quận 3',
    lat: 10.7827,
    lng: 106.6959,
    category: 'Điểm vui chơi',
  },
  // Key Arterial Streets
  {
    id: 'st_le_trong_tan',
    name: 'Đường Lê Trọng Tấn (Tân Phú)',
    shortName: 'Đường Lê Trọng Tấn',
    district: 'Quận Tân Phú',
    lat: 10.808,
    lng: 106.626,
    category: 'Tuyến đường huyết mạch',
  },
  {
    id: 'st_tay_thanh',
    name: 'Đường Tây Thạnh (Sát KCN Tân Bình)',
    shortName: 'Đường Tây Thạnh',
    district: 'Quận Tân Phú',
    lat: 10.8066,
    lng: 106.6278,
    category: 'Tuyến đường huyết mạch',
  },
  {
    id: 'st_cong_hoa',
    name: 'Đường Cộng Hòa (Tân Bình)',
    shortName: 'Đường Cộng Hòa',
    district: 'Quận Tân Bình',
    lat: 10.802,
    lng: 106.649,
    category: 'Tuyến đường huyết mạch',
  },
  {
    id: 'st_truong_chinh',
    name: 'Đường Trường Chinh (Mũi Tàu)',
    shortName: 'Đường Trường Chinh',
    district: 'Quận Tân Bình',
    lat: 10.814,
    lng: 106.634,
    category: 'Tuyến đường huyết mạch',
  },
  {
    id: 'st_tan_ky_tan_quy',
    name: 'Đường Tân Kỳ Tân Quý',
    shortName: 'Đường Tân Kỳ Tân Quý',
    district: 'Quận Tân Phú',
    lat: 10.802,
    lng: 106.617,
    category: 'Tuyến đường huyết mạch',
  },
  {
    id: 'st_vuon_lai',
    name: 'Đường Vườn Lài (Tân Thành / An Phú Đông)',
    shortName: 'Đường Vườn Lài',
    district: 'Quận Tân Phú / Q12',
    lat: 10.785,
    lng: 106.632,
    category: 'Tuyến đường huyết mạch',
  },
  {
    id: 'st_ten_lua',
    name: 'Đường Tên Lửa (Khu Tên Lửa)',
    shortName: 'Đường Tên Lửa',
    district: 'Quận Bình Tân',
    lat: 10.755,
    lng: 106.613,
    category: 'Tuyến đường huyết mạch',
  },
  {
    id: 'st_au_co',
    name: 'Đường Âu Cơ (Tân Bình - Tân Phú)',
    shortName: 'Đường Âu Cơ',
    district: 'Tân Bình / Tân Phú',
    lat: 10.788,
    lng: 106.645,
    category: 'Tuyến đường huyết mạch',
  },
  {
    id: 'st_le_duc_tho_gv',
    name: 'Đường Lê Đức Thọ & Lê Văn Thọ (Gò Vấp)',
    shortName: 'Lê Đức Thọ (Gò Vấp)',
    district: 'Quận Gò Vấp',
    lat: 10.842,
    lng: 106.663,
    category: 'Tuyến đường huyết mạch',
  },
  {
    id: 'st_d2_binh_thanh',
    name: 'Đường Nguyễn Gia Trí - D2 & Ung Văn Khiêm (Bình Thạnh)',
    shortName: 'Đường D2 (Bình Thạnh)',
    district: 'Quận Bình Thạnh',
    lat: 10.804,
    lng: 106.715,
    category: 'Tuyến đường huyết mạch',
  },
  {
    id: 'st_le_van_sy_q3',
    name: 'Đường Lê Văn Sỹ (Quận 3 - Phú Nhuận)',
    shortName: 'Đường Lê Văn Sỹ',
    district: 'Quận 3 / Phú Nhuận',
    lat: 10.7878,
    lng: 106.6772,
    category: 'Tuyến đường huyết mạch',
  },
  {
    id: 'st_su_van_hanh_q10',
    name: 'Đường Sư Vạn Hạnh & Thành Thái (Quận 10)',
    shortName: 'Đường Sư Vạn Hạnh (Q10)',
    district: 'Quận 10',
    lat: 10.773,
    lng: 106.669,
    category: 'Tuyến đường huyết mạch',
  },
  {
    id: 'st_duong_ba_trac_q8',
    name: 'Đường Dương Bá Trạc & Tạ Quang Bửu (Quận 8)',
    shortName: 'Dương Bá Trạc (Quận 8)',
    district: 'Quận 8',
    lat: 10.7476,
    lng: 106.6886,
    category: 'Tuyến đường huyết mạch',
  },
];

// 2. Lifestyle Personas (Đa dạng hóa tiêu chí sống của khách thuê)
const LIFESTYLE_TABS = [
  { id: 'all', label: 'Tất cả đề xuất AI', icon: Sparkles },
  { id: 'student', label: 'Sinh viên HUIT tiết kiệm (< 4.5tr)', icon: GraduationCap },
  { id: 'office', label: 'Dân văn phòng / Chuyên gia IT', icon: Briefcase },
  { id: 'couple', label: 'Cặp đôi / Bạn bè ở chung (Rộng)', icon: Users },
  { id: 'pet', label: 'Cho nuôi thú cưng (Pet-friendly)', icon: Heart },
  { id: 'balcony', label: 'Ban công / Cửa sổ lớn thoáng mát', icon: Sun },
  { id: 'flexible', label: 'Giờ giấc tự do 100% vân tay', icon: Key },
];

export default function TopKWidget({ onBookRoom, onOpenRadarMap }: TopKWidgetProps) {
  // Primary Sliders & Filters
  const [budget, setBudget] = useState(6000000);
  const [radius, setRadius] = useState(5.0);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState('aeon_tan_phu');
  const [activeLifestyle, setActiveLifestyle] = useState('all');
  const [sortBy, setSortBy] = useState<'smart' | 'distance' | 'price' | 'area'>('smart');

  // Custom GPS Location
  const [isUsingGPS, setIsUsingGPS] = useState(false);
  const [customCoords, setCustomCoords] = useState<{ lat: number; lng: number; label: string } | null>(null);

  // Results State


  const activeLandmark = LANDMARK_OPTIONS.find((l) => l.id === selectedLandmarkId) || LANDMARK_OPTIONS[0];

  const currentLat = isUsingGPS && customCoords ? customCoords.lat : activeLandmark.lat;
  const currentLng = isUsingGPS && customCoords ? customCoords.lng : activeLandmark.lng;
  const currentOriginName = isUsingGPS && customCoords ? customCoords.label : activeLandmark.shortName;

  const recommendationParams = new URLSearchParams({
    budget: String(budget), radius: String(radius), lat: String(currentLat), lng: String(currentLng), k: '4', sortBy,
  });
  if (activeLifestyle !== 'all') recommendationParams.set('lifestyle', activeLifestyle);
  const query = useDiscoveryQuery<Room[], { latency_ms: number }>('/api/rooms/recommend?' + recommendationParams, 300);
  const recommendations = query.data ?? [];
  const loading = query.loading;
  const metadata = query.metadata;
  const fetchRecommendations = async () => { query.refresh(); };

  // Request browser GPS position
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'Vị trí hiện tại của bạn',
        });
        setIsUsingGPS(true);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        alert('Không thể lấy vị trí hiện tại. Vui lòng cho phép quyền truy cập vị trí trên trình duyệt.');
      }
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ';
  };

  return (
    <section
      id="goi-y-thong-minh"
      className="bg-gradient-to-br from-[#0F223A] via-[#142A45] to-[#0F223A] text-white rounded-[32px] p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden mb-12 border border-[#B89C66]/30 font-sans"
    >
      {/* Background Champagne Glow */}
      <div className="absolute -right-24 -top-24 w-96 h-96 bg-[#B89C66]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-[#B89C66]/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER SECTION */}
      <div data-reveal className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-white/10">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#B89C66]/20 border border-[#B89C66]/40 text-[#B89C66] text-xs font-bold mb-3 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#B89C66]" />
            <span>Công Nghệ Đề Xuất Thông Minh (Elite AI Smart Matching)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white font-sans">
            Gợi Ý Căn Hộ &amp; Phòng Trọ Phù Hợp Nhất
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Hệ thống phân tích tự động dựa trên <strong className="text-[#B89C66]">ngân sách thực tế</strong>,{' '}
            <strong className="text-[#FAF0DC]">khoảng cách đo theo GPS Haversine</strong> &amp;{' '}
            <strong className="text-white">tiêu chí sống cá nhân</strong> của bạn.
          </p>
        </div>

        {/* METRICS BADGE & RADAR MAP BUTTON */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {onOpenRadarMap && (
            <button
              type="button"
              onClick={onOpenRadarMap}
              className="px-4 py-3 rounded-2xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-black text-xs inline-flex items-center gap-2 shadow-lg shadow-[#B89C66]/25 transition-all cursor-pointer active:scale-95"
            >
              <Compass className="w-4 h-4" />
              <span>Mở Bản Đồ Radar Quanh Điểm</span>
            </button>
          )}
          {metadata && (
            <div className="bg-[#0F223A]/80 backdrop-blur-md border border-[#B89C66]/30 rounded-2xl p-3.5 px-5 flex items-center gap-4 text-xs shrink-0 shadow-lg">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Tốc độ tìm kiếm
                </span>
                <span className="font-black text-[#B89C66] text-base">{metadata.latency_ms} ms</span>
              </div>
              <div className="w-px h-8 bg-white/15" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Mức độ tương thích
                </span>
                <span className="font-black text-[#FAF0DC] text-base">Chuẩn xác cao</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 1. LANDMARKS & CORRIDORS CONTROLS */}
      <div className="relative z-20 grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 mb-6 text-xs">
        {/* Landmark Selector Dropdown */}
        <div className="space-y-1.5">
          <label htmlFor="topk-landmark" className="text-[11px] font-bold text-[#B89C66] uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>1. Điểm đo khoảng cách &amp; Bán kính (14 Quận)</span>
          </label>
          <EliteSelect
            value={selectedLandmarkId}
            onChange={(val) => {
              setIsUsingGPS(false);
              setSelectedLandmarkId(val);
            }}
            options={LANDMARK_OPTIONS.map((l) => ({
              value: l.id,
              label: l.name,
              sublabel: l.shortName,
              group:
                l.category === 'Tuyến đường huyết mạch'
                  ? 'Tuyến đường huyết mạch TP.HCM'
                  : 'Trường ĐH, TTTM & Khu văn phòng',
            }))}
            searchable
            searchPlaceholder="Tìm trường ĐH, TTTM, tuyến đường..."
            variant="navy"
            ariaLabel="Chọn điểm đo khoảng cách"
          />

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="truncate">Tâm điểm: <strong className="text-white">{currentOriginName}</strong></span>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              className="text-[#B89C66] hover:underline inline-flex items-center gap-1 font-semibold shrink-0 cursor-pointer"
            >
              <Navigation className="w-3 h-3" />
              <span>Dùng GPS</span>
            </button>
          </div>
        </div>

        {/* Budget Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between font-bold">
            <label htmlFor="topk-budget" className="text-[11px] text-[#B89C66] uppercase tracking-wider">2. Ngân sách tối đa</label>
            <span className="text-white font-black">{budget.toLocaleString('vi-VN')} đ/tháng</span>
          </div>
          <input
            id="topk-budget"
            type="range"
            min={2500000}
            max={12000000}
            step={500000}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full accent-[#B89C66] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>2.5 triệu</span>
            <span>7 triệu</span>
            <span>12 triệu</span>
          </div>
        </div>

        {/* Radius Slider & Sort */}
        <div className="space-y-1.5">
          <div className="flex justify-between font-bold">
            <label htmlFor="topk-radius" className="text-[11px] text-[#B89C66] uppercase tracking-wider">3. Bán kính tối đa</label>
            <span className="text-[#FAF0DC] font-black">{radius} km</span>
          </div>
          <input
            id="topk-radius"
            type="range"
            min={1.0}
            max={15.0}
            step={0.5}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full accent-[#B89C66] cursor-pointer"
          />
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Bán kính: 1 km</span>
            <span>8 km</span>
            <span>15 km</span>
          </div>
        </div>
      </div>

      {/* 2. LIFESTYLE TABS (Đa dạng hóa tiêu chí lối sống) */}
      <div className="relative z-10 mb-6">
        <span className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2.5">
          Khách hàng đang tìm phòng theo phong cách nào?
        </span>
        <SwipeRail label="Phong cách sống" tone="dark">
          {LIFESTYLE_TABS.map((tab) => {
            const active = activeLifestyle === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveLifestyle(tab.id)}
                aria-pressed={active}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#B89C66] text-white shadow-md shadow-[#B89C66]/25 scale-[1.02]'
                    : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white border border-white/10'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#B89C66]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </SwipeRail>
      </div>

      {/* 3. SORT & SUMMARY BAR */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 text-xs mb-6 pt-3 border-t border-white/10">
        <div className="text-slate-300 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#B89C66]" />
          <span>
            Tìm thấy <strong className="text-white">{loading && !query.data ? '…' : recommendations.length} phòng tối ưu</strong> trong bán kính{' '}
            <strong className="text-[#FAF0DC]">{radius} km</strong> từ {currentOriginName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="topk-sort" className="text-slate-400 text-[11px]">Sắp xếp theo:</label>
          <select
            id="topk-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'smart' | 'distance' | 'price' | 'area')}
            className="px-3 py-1.5 bg-[#0F223A] border border-[#B89C66]/40 rounded-xl text-xs font-bold text-white outline-none cursor-pointer"
          >
            <option value="smart">Điểm tương thích AI (Tối ưu)</option>
            <option value="distance">Khoảng cách gần nhất</option>
            <option value="price">Giá thuê tiết kiệm nhất</option>
            <option value="area">Diện tích rộng rãi nhất</option>
          </select>

          <button
            type="button"
            onClick={fetchRecommendations}
            className="px-3.5 py-1.5 bg-[#B89C66] hover:bg-[#A38752] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Làm mới
          </button>
        </div>
      </div>

      {/* 4. TOP-K ROOM CARDS (4 Cards Grid) */}
      <div className="relative z-10">
        {query.error && (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#B89C66]/40 bg-white/5 p-4 text-sm text-white">
            <span>{query.error}{recommendations.length ? ' Đang hiển thị kết quả trước đó.' : ''}</span>
            <button type="button" onClick={fetchRecommendations} className="rounded-xl bg-[#B89C66] px-4 py-2 text-xs font-bold text-white hover:bg-[#A38752]">Thử lại</button>
          </div>
        )}
        {loading && recommendations.length > 0 && <p role="status" className="mb-4 text-xs text-slate-300">Đang cập nhật gợi ý…</p>}
        {loading && recommendations.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 text-[#B89C66] animate-spin" />
            <span className="text-xs text-slate-300 font-medium">Hệ thống AI đang so khớp phòng tối ưu...</span>
          </div>
        ) : query.error && recommendations.length === 0 ? null : recommendations.length === 0 ? (
          <div className="bg-white/5 rounded-2xl p-10 text-center border border-white/10 space-y-2">
            <Building2 className="w-10 h-10 text-[#B89C66] mx-auto opacity-70" />
            <h4 className="text-base font-bold text-white">Không tìm thấy phòng phù hợp trong bán kính này</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Hãy thử tăng bán kính di chuyển lên 7 - 10km hoặc tăng mức ngân sách tối đa để xem thêm căn hộ.
            </p>
          </div>
        ) : (
          <div data-reveal-group className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recommendations.map((room, index) => {
              const matchPercent = Math.round((room.score || 0.85) * 100);
              const isBookable = room.status === 'AVAILABLE' || room.status === 'BOOKED_VIEWING';
              return (
                <div
                  key={room.id}
                  className="bg-white rounded-[24px] overflow-hidden border border-[#E5E3DE] shadow-xl flex flex-col justify-between group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >
                  {/* Top Image & Badge */}
                  <div>
                    <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                      <img
                        src={room.images?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80'}
                        alt={room.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Top Rank Badge */}
                      <div className="absolute top-2.5 left-2.5 bg-[#B89C66] text-white px-3 py-1 rounded-full text-[11px] font-black shadow-md flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-white" />
                        <span>Top {index + 1} • {matchPercent}% phù hợp</span>
                      </div>

                      {/* Distance pill */}
                      <div className="absolute bottom-2.5 right-2.5 bg-[#0F223A]/85 backdrop-blur-md text-white px-2.5 py-0.5 rounded-md text-[10px] font-bold">
                        {room.district} • {room.calculated_distance ?? 1.2} km
                      </div>
                    </div>

                    {/* Room Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-[#0F223A] text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-[#B89C66] transition-colors mb-1.5">
                        {room.title}
                      </h3>

                      <p className="text-[11px] text-[#64748B] line-clamp-1 mb-2.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#B89C66] shrink-0" />
                        <span>{room.address}</span>
                      </p>

                      {/* Amenities Pills */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {room.amenities?.slice(0, 3).map((am, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-[#FAF7F2] text-[#8C6D37] text-[10px] font-bold border border-[#B89C66]/25"
                          >
                            {am}
                          </span>
                        ))}
                        {room.amenities && room.amenities.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-semibold self-center">
                            +{room.amenities.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price & Action Buttons */}
                  <div className="p-4 pt-0 border-t border-[#E5E3DE]/60 mt-auto">
                    <div className="flex items-baseline justify-between py-2.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Giá thuê</span>
                      <strong className="text-base font-black text-[#B89C66]">
                        {formatPrice(room.price)}
                      </strong>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Link
                        href={`/rooms/${room.id}`}
                        className="py-2 rounded-xl border border-[#0F223A]/20 hover:border-[#0F223A] text-[#0F223A] hover:bg-slate-50 text-[11px] font-bold text-center transition-all cursor-pointer"
                      >
                        Chi tiết
                      </Link>

                      <button
                        type="button"
                        onClick={() => onBookRoom(room)}
                        disabled={!isBookable}
                        className="py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed text-white text-[11px] font-bold shadow-md shadow-[#B89C66]/20 transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                      >
                        <span>
                          {room.status === 'AVAILABLE'
                            ? 'Đặt lịch'
                            : room.status === 'BOOKED_VIEWING'
                            ? 'Chọn giờ khác'
                            : room.status === 'RESERVED'
                            ? 'Đang giữ chỗ'
                            : 'Đang thuê'}
                        </span>
                        {isBookable && <ArrowRight className="w-3 h-3" aria-hidden="true" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
