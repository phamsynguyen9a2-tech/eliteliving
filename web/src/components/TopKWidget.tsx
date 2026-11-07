'use client';

import React, { useEffect, useState } from 'react';
import { scopedFetch } from '@/lib/scoped-fetch';
import { useDiscoveryQuery } from '@/lib/use-discovery-query';
import {
  Sparkles,
  MapPin,
  ArrowRight,
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
  RotateCw,
} from 'lucide-react';
import { Room } from '@/lib/types';
import Link from 'next/link';
import EliteSelect from './EliteSelect';

interface TopKWidgetProps {
  /** recommendationId: mã lượt hiển thị gợi ý, gửi kèm khi đặt lịch để đo tỉ lệ chuyển đổi */
  onBookRoom: (room: Room, recommendationId?: string | null) => void;
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
  { id: 'all', label: 'Tất cả', icon: Sparkles },
  { id: 'student', label: 'Sinh viên (dưới 4,5 triệu)', icon: GraduationCap },
  { id: 'office', label: 'Người đi làm', icon: Briefcase },
  { id: 'couple', label: 'Ở 2 người, cần phòng rộng', icon: Users },
  { id: 'pet', label: 'Cho nuôi thú cưng', icon: Heart },
  { id: 'balcony', label: 'Có ban công hoặc cửa sổ lớn', icon: Sun },
  { id: 'flexible', label: 'Giờ giấc tự do', icon: Key },
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
  // Người thuê đã đăng nhập: bộ lọc khởi tạo từ hồ sơ nhu cầu đã lưu
  const [usingProfile, setUsingProfile] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await scopedFetch('/api/user/preferences', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        const p = json?.data?.profile;
        if (cancelled || !p?.budget_max) return;
        setBudget(p.budget_max);
        if (p.max_radius_km) setRadius(p.max_radius_km);
        if (p.target_lat && p.target_lng) {
          setCustomCoords({ lat: p.target_lat, lng: p.target_lng, label: p.preferred_district || 'Vị trí trong hồ sơ nhu cầu' });
          setIsUsingGPS(true);
        }
        setUsingProfile(true);
      } catch {
        // chưa đăng nhập hoặc chưa có hồ sơ: giữ bộ lọc mặc định
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Results State


  const activeLandmark = LANDMARK_OPTIONS.find((l) => l.id === selectedLandmarkId) || LANDMARK_OPTIONS[0];

  const currentLat = isUsingGPS && customCoords ? customCoords.lat : activeLandmark.lat;
  const currentLng = isUsingGPS && customCoords ? customCoords.lng : activeLandmark.lng;
  const currentOriginName = isUsingGPS && customCoords ? customCoords.label : activeLandmark.shortName;

  const recommendationParams = new URLSearchParams({
    budget: String(budget), radius: String(radius), lat: String(currentLat), lng: String(currentLng), k: '4', sortBy,
    source: 'WEB_TOPK',
  });
  if (activeLifestyle !== 'all') recommendationParams.set('lifestyle', activeLifestyle);
  const query = useDiscoveryQuery<Room[], { latency_ms: number; recommendation_id?: string | null }>('/api/rooms/recommend?' + recommendationParams, 300);
  const recommendations = query.data ?? [];
  // Mã lượt hiển thị danh sách này: gắn vào link chi tiết và lượt đặt lịch để đo CTR / chuyển đổi
  const recommendationId = query.metadata?.recommendation_id ?? null;
  const loading = query.loading;
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

  const sortLabel = { smart: 'Phù hợp nhất', distance: 'Gần nhất', price: 'Giá thấp nhất', area: 'Rộng nhất' } as const;

  return (
    <section
      id="goi-y-thong-minh"
      className="bg-gradient-to-b from-[#E2CDA4] via-[#F1E5CF] to-[#FBF8F2] rounded-3xl border border-[#D9C29A] p-5 sm:p-8 mb-12 font-sans text-[#0F223A]"
    >
      {/* Tiêu đề */}
      <div data-reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-[#6E5428] mb-1.5">Gợi ý cho bạn</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Phòng gần nơi bạn học, làm việc</h2>
          <p className="text-sm text-[#4B5563] mt-2 leading-relaxed">
            Chọn phòng phù hợp với ngân sách, sở thích và nhu cầu của bạn.
          </p>
        </div>
        {onOpenRadarMap && (
          <button
            type="button"
            onClick={onOpenRadarMap}
            className="self-start sm:self-auto shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E3DE] bg-white text-sm font-semibold text-[#0F223A] hover:border-[#B89C66] hover:text-[#8C6D37] transition-colors cursor-pointer"
          >
            <Compass className="w-4 h-4 text-[#B89C66]" aria-hidden="true" />
            <span>Xem trên bản đồ</span>
          </button>
        )}
      </div>

      {/* Bộ lọc chính */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5 rounded-2xl bg-white border border-[#E8D4B0]/70 shadow-sm shadow-[#B89C66]/10 p-4 sm:p-5 mb-5">
        <div className="space-y-2">
          <label htmlFor="topk-landmark" className="block text-sm font-semibold">Gần đâu</label>
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
                  ? 'Tuyến đường'
                  : 'Trường ĐH, TTTM & Khu văn phòng',
            }))}
            searchable
            searchPlaceholder="Tìm trường ĐH, TTTM, tuyến đường..."
            variant="light"
            ariaLabel="Chọn điểm đo khoảng cách"
          />
          <div className="flex items-center justify-between gap-3 text-xs text-[#64748B]">
            <span className="truncate">
              Tính từ <span className="font-semibold text-[#0F223A]">{currentOriginName}</span>
              {usingProfile && <> · <Link href="/ho-so?tab=preferences" className="text-[#8C6D37] hover:underline">theo hồ sơ nhu cầu</Link></>}
            </span>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              className="shrink-0 inline-flex items-center gap-1 font-semibold text-[#8C6D37] hover:underline cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Vị trí của tôi</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="topk-budget" className="text-sm font-semibold">Giá tối đa</label>
            <span className="text-sm font-bold">{(budget / 1_000_000).toLocaleString('vi-VN')} triệu/tháng</span>
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
          <div className="flex justify-between text-xs text-[#94A3B8]">
            <span>2,5 triệu</span>
            <span>12 triệu</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="topk-radius" className="text-sm font-semibold">Bán kính</label>
            <span className="text-sm font-bold">{radius.toLocaleString('vi-VN')} km</span>
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
          <div className="flex justify-between text-xs text-[#94A3B8]">
            <span>1 km</span>
            <span>15 km</span>
          </div>
        </div>
      </div>

      {/* Nhu cầu */}
      <div className="flex flex-wrap items-center gap-2 mb-6" role="group" aria-label="Nhu cầu của bạn">
        <span className="text-sm font-semibold mr-1">Nhu cầu:</span>
        {LIFESTYLE_TABS.map((tab) => {
          const active = activeLifestyle === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveLifestyle(tab.id)}
              aria-pressed={active}
              className={`px-3.5 py-2 rounded-full text-sm transition-colors cursor-pointer ${
                active
                  ? 'bg-[#0F223A] text-white font-semibold'
                  : 'bg-white text-[#475569] border border-[#E5E3DE] hover:border-[#B89C66] hover:text-[#0F223A]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tóm tắt & sắp xếp */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#E8D4B0]/70 text-sm">
        <p className="text-[#64748B]">
          <span className="font-semibold text-[#0F223A]">{loading && !query.data ? '…' : recommendations.length} phòng</span>{' '}
          trong bán kính {radius.toLocaleString('vi-VN')} km từ {currentOriginName}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="topk-sort" className="text-[#64748B]">Sắp xếp</label>
          <select
            id="topk-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as keyof typeof sortLabel)}
            className="h-10 px-3 rounded-xl border border-[#E5E3DE] bg-white text-sm font-semibold text-[#0F223A] outline-none focus:border-[#B89C66] cursor-pointer"
          >
            {(Object.keys(sortLabel) as Array<keyof typeof sortLabel>).map((key) => (
              <option key={key} value={key}>{sortLabel[key]}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={fetchRecommendations}
            aria-label="Làm mới gợi ý"
            title="Làm mới gợi ý"
            className="w-10 h-10 grid place-items-center rounded-xl border border-[#E5E3DE] bg-white text-[#0F223A] hover:border-[#B89C66] hover:text-[#8C6D37] transition-colors cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Danh sách phòng gợi ý */}
      <div>
        {query.error && (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E8D4B0] bg-[#FAF0DC] p-4 text-sm text-[#0F223A]">
            <span>{query.error}{recommendations.length ? ' Đang hiển thị kết quả trước đó.' : ''}</span>
            <button type="button" onClick={fetchRecommendations} className="rounded-xl bg-[#B89C66] px-4 py-2 text-xs font-bold text-white hover:bg-[#A38752]">Thử lại</button>
          </div>
        )}
        {loading && recommendations.length > 0 && <p role="status" className="mb-4 text-xs text-[#64748B]">Đang cập nhật gợi ý…</p>}
        {loading && recommendations.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#B89C66] animate-spin" aria-hidden="true" />
            <span className="text-sm text-[#64748B]">Đang tìm phòng…</span>
          </div>
        ) : query.error && recommendations.length === 0 ? null : recommendations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5E3DE] p-10 text-center">
            <Building2 className="w-8 h-8 text-[#B89C66] mx-auto mb-3" aria-hidden="true" />
            <h4 className="text-base font-semibold">Chưa có phòng phù hợp trong bán kính này</h4>
            <p className="text-sm text-[#64748B] mt-1 max-w-md mx-auto">
              Thử tăng bán kính lên 7–10 km hoặc nâng mức giá tối đa.
            </p>
          </div>
        ) : (
          <div data-reveal-group className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recommendations.map((room, index) => {
              const matchPercent = Math.max(0, Math.min(100, Math.round((room.score ?? 0) * 100)));
              const isBookable = room.status === 'AVAILABLE' || room.status === 'BOOKED_VIEWING';
              const distance = typeof room.calculated_distance === 'number' ? room.calculated_distance : null;
              return (
                <article
                  key={room.id}
                  className="elite-spotlight-card elite-tilt-card group flex flex-col rounded-2xl border border-[#E5E3DE] bg-white overflow-hidden hover:border-[#B89C66]/60 hover:shadow-lg transition-all duration-300"
                >
                  <div className="relative h-44 bg-[#F1EFEA] overflow-hidden">
                    <img
                      src={room.images?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80'}
                      alt={room.title}
                      className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500"
                    />
                    <span className="absolute top-3 left-3 rounded-lg bg-[#0F223A]/90 border border-[#B89C66]/50 backdrop-blur-xs px-2.5 py-0.5 text-xs font-extrabold text-[#FAF0DC] shadow-sm">
                      TOP #{index + 1}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-[#8C6D37] transition-colors">
                      {room.title}
                    </h3>
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-[#64748B]">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-[#B89C66]" aria-hidden="true" />
                      <span className="truncate">
                        {room.district}
                        {distance !== null && <> · cách {distance.toLocaleString('vi-VN')} km</>}
                      </span>
                    </p>

                    {/* Mức phù hợp */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#64748B]">Độ tương thích</span>
                        <span className="font-bold text-[#8C6D37]">{matchPercent}%</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-[#F1EFEA] overflow-hidden">
                        <div className="h-full rounded-full elite-progress-shimmer" style={{ width: `${matchPercent}%` }} />
                      </div>
                    </div>

                    {room.amenities?.length ? (
                      <p className="mt-3 text-xs text-[#64748B] line-clamp-1">
                        {room.amenities.slice(0, 3).join(' · ')}
                        {room.amenities.length > 3 && ` · +${room.amenities.length - 3}`}
                      </p>
                    ) : null}

                    <div className="mt-auto pt-4">
                      <p className="text-base font-bold">
                        {formatPrice(room.price)}
                        <span className="text-xs font-normal text-[#64748B]">/tháng</span>
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Link
                          href={recommendationId ? `/phong/${room.id}?rec=${recommendationId}` : `/phong/${room.id}`}
                          className="h-10 grid place-items-center rounded-xl border border-[#E5E3DE] text-sm font-semibold text-[#0F223A] hover:border-[#0F223A] transition-colors"
                        >
                          Chi tiết
                        </Link>
                        <button
                          type="button"
                          onClick={() => onBookRoom(room, recommendationId)}
                          disabled={!isBookable}
                          className="elite-btn-shimmer h-10 inline-flex items-center justify-center gap-1 rounded-xl bg-[#B89C66] text-sm font-semibold text-white hover:bg-[#A38752] disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
                          {isBookable && <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
