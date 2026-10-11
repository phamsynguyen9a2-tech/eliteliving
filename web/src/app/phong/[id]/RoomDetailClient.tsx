'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Share2,
  Heart,
  ArrowLeft,
  Sparkles,
  Bed,
  Wind,
  Wifi,
  Tv,
  Utensils,
  KeyRound,
  Camera,
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Shield,
  Check,
  Info,
  Maximize2,
  Building2,
  Copy,
  CheckCheck,
  Zap,
  Home,
  MessageSquare
} from 'lucide-react';
import { Room } from '@/lib/types';

interface RoomDetailClientProps {
  room: Room;
  relatedRooms: Room[];
}

const TIME_SLOTS = [
  '08:30 - 09:30',
  '09:30 - 10:30',
  '10:30 - 11:30',
  '14:00 - 15:00',
  '15:30 - 16:30',
  '17:00 - 18:00',
  '18:30 - 19:30'
];

export default function RoomDetailClient({ room, relatedRooms }: RoomDetailClientProps) {
  const router = useRouter();
  const { data: session } = useSession();

  // Gallery & Lightbox states
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Social actions
  const [isCopied, setIsCopied] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // Booking Form State
  const [bookingName, setBookingName] = useState('Phạm Sỹ Nguyên');
  const [bookingPhone, setBookingPhone] = useState('0912345678');
  const [bookingDate, setBookingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [bookingTimeSlot, setBookingTimeSlot] = useState(TIME_SLOTS[1]);
  const [bookingNotes, setBookingNotes] = useState('Tôi muốn xem căn hộ trực tiếp vào khung giờ đã chọn.');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    status: 'success' | 'error';
    message: string;
    appointmentId?: string;
  } | null>(null);

  useEffect(() => {
    if (session?.user) {
      if (session.user.name) setBookingName(session.user.name);
      if (session.user.phone) setBookingPhone(session.user.phone);
    }
  }, [session]);

  // Copy link helper
  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  // Submit appointment with Mutex Lock
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingName.trim() || !bookingPhone.trim()) {
      setBookingResult({
        status: 'error',
        message: 'Vui lòng điền đầy đủ Họ tên và Số điện thoại liên hệ.'
      });
      return;
    }

    setIsBookingSubmitting(true);
    setBookingResult(null);

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: room.id,
          user_id: session?.user?.id || `user_${Date.now()}`,
          user_name: bookingName.trim(),
          user_phone: bookingPhone.trim(),
          date: bookingDate,
          time_slot: bookingTimeSlot,
          notes: bookingNotes.trim()
        })
      });

      const data = await res.json();

      if (res.status === 409) {
        setBookingResult({
          status: 'error',
          message: `Khung giờ ${bookingTimeSlot} ngày ${bookingDate} vừa được người khác giữ chỗ. Vui lòng chọn khung giờ khác.`
        });
      } else if (!res.ok) {
        setBookingResult({
          status: 'error',
          message: data.message || 'Không thể tạo lịch hẹn. Vui lòng thử lại sau.'
        });
      } else {
        setBookingResult({
          status: 'success',
          message: `Chúc mừng bạn đã đặt lịch thành công xem căn hộ ${room.room_code}! Nhân viên quản lý sẽ liên hệ trước 30 phút để đón bạn.`,
          appointmentId: data.data?.id || `APT-${Date.now().toString().slice(-6)}`
        });
      }
    } catch {
      setBookingResult({
        status: 'error',
        message: 'Lỗi kết nối máy chủ. Vui lòng kiểm tra lại mạng.'
      });
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  // Map amenities to icons
  const getAmenityIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('lạnh') || lower.includes('điều hòa')) return <Wind className="w-4 h-4 text-sky-500" />;
    if (lower.includes('giường') || lower.includes('nệm')) return <Bed className="w-4 h-4 text-indigo-500" />;
    if (lower.includes('tủ lạnh')) return <Zap className="w-4 h-4 text-emerald-500" />;
    if (lower.includes('máy giặt')) return <Sparkles className="w-4 h-4 text-blue-500" />;
    if (lower.includes('wifi') || lower.includes('mạng')) return <Wifi className="w-4 h-4 text-violet-500" />;
    if (lower.includes('bếp') || lower.includes('nấu')) return <Utensils className="w-4 h-4 text-amber-500" />;
    if (lower.includes('khóa') || lower.includes('vân tay')) return <KeyRound className="w-4 h-4 text-rose-500" />;
    if (lower.includes('camera') || lower.includes('an ninh')) return <Camera className="w-4 h-4 text-teal-500" />;
    if (lower.includes('tivi') || lower.includes('tv')) return <Tv className="w-4 h-4 text-purple-500" />;
    if (lower.includes('ban công')) return <Sparkles className="w-4 h-4 text-emerald-500" />;
    if (lower.includes('gác')) return <Layers className="w-4 h-4 text-amber-500" />;
    if (lower.includes('tự do')) return <Clock className="w-4 h-4 text-blue-500" />;
    return <CheckCircle2 className="w-4 h-4 text-slate-400" />;
  };

  const images = room.images && room.images.length > 0 ? room.images : [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800'
  ];

  const statusLabel =
    room.status === 'AVAILABLE'
      ? { text: 'Còn trống — Sẵn sàng vào ở', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
      : room.status === 'BOOKED_VIEWING'
      ? { text: 'Đã có lịch hẹn xem phòng', bg: 'bg-amber-50 text-amber-700 border-amber-200' }
      : { text: 'Đã có người thuê', bg: 'bg-slate-100 text-slate-600 border-slate-200' };

  return (
    <div className="bg-[#FAF9F6] min-h-screen text-slate-800">
      {/* 1. TOP BREADCRUMB & ACTION BAR */}
      <div className="bg-white border-b border-[#E5E3DE] sticky top-16 sm:top-[68px] z-30 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto py-1">
            <Link href="/" className="hover:text-[#0F223A] transition-colors flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />
              <span>Trang chủ</span>
            </Link>
            <span>/</span>
            <Link href={`/?district=${encodeURIComponent(room.district)}`} className="hover:text-[#0F223A] transition-colors">
              {room.district}
            </Link>
            <span>/</span>
            {room.project_name && (
              <>
                <span className="text-slate-600 max-w-[150px] truncate" title={room.project_name}>
                  {room.project_name}
                </span>
                <span>/</span>
              </>
            )}
            <span className="font-bold text-[#0F223A]">
              Phòng {room.room_code}
            </span>
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quay lại</span>
            </button>

            <button
              onClick={handleCopyLink}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isCopied
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              {isCopied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Đã sao chép link' : 'Chia sẻ'}</span>
            </button>

            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isLiked
                  ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-rose-500'
              }`}
              title="Lưu tin yêu thích"
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* ROOM TITLE HEADER */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-[#0F223A] text-white">
              Mã căn: {room.room_code}
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusLabel.bg}`}>
              {statusLabel.text}
            </span>
            {room.has_balcony && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Ban công riêng view thoáng
              </span>
            )}
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              Tầng {room.floor || 1}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {room.area} m²
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0F223A] tracking-tight leading-tight">
            {room.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2.5 text-xs sm:text-sm text-slate-600">
            <p className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{room.address}</span>
            </p>
            <p className="flex items-center gap-1 text-slate-700">
              <span>Đến ĐH Công Thương TP.HCM (HUIT):</span>
              <strong className="text-blue-700 font-bold">{room.distance_to_huit_km || '2.5'} km</strong>
            </p>
            {room.project_name && (
              <p className="flex items-center gap-1 text-slate-500">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Thuộc dự án: <strong>{room.project_name}</strong></span>
              </p>
            )}
          </div>
        </div>

        {/* 3. LUXURY 5-PHOTO GALLERY (AIRBNB STYLE) */}
        <section className="mb-10">
          <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200/80 bg-slate-900 group">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 h-[340px] sm:h-[420px] lg:h-[480px]">
              {/* Photo 1: Big Hero Photo */}
              <div
                onClick={() => { setActivePhotoIndex(0); setIsLightboxOpen(true); }}
                className="lg:col-span-2 relative h-full overflow-hidden cursor-pointer"
              >
                <img
                  src={images[0]}
                  alt={`${room.title} - Ảnh chính`}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60"></div>
                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-xs text-white text-xs font-semibold px-3 py-1 rounded-xl">
                  Góc nhìn chính toàn cảnh căn hộ
                </div>
              </div>

              {/* Photo 2 & 3: Middle Column */}
              <div className="hidden lg:grid grid-rows-2 gap-2 h-full">
                <div
                  onClick={() => { setActivePhotoIndex(1); setIsLightboxOpen(true); }}
                  className="relative h-full overflow-hidden cursor-pointer"
                >
                  <img
                    src={images[1] || images[0]}
                    alt={`${room.title} - Ảnh 2`}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
                <div
                  onClick={() => { setActivePhotoIndex(2); setIsLightboxOpen(true); }}
                  className="relative h-full overflow-hidden cursor-pointer"
                >
                  <img
                    src={images[2] || images[0]}
                    alt={`${room.title} - Ảnh 3`}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              </div>

              {/* Photo 4 & 5: Right Column */}
              <div className="hidden lg:grid grid-rows-2 gap-2 h-full">
                <div
                  onClick={() => { setActivePhotoIndex(3); setIsLightboxOpen(true); }}
                  className="relative h-full overflow-hidden cursor-pointer"
                >
                  <img
                    src={images[3] || images[0]}
                    alt={`${room.title} - Ảnh 4`}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
                <div
                  onClick={() => { setActivePhotoIndex(4 % images.length); setIsLightboxOpen(true); }}
                  className="relative h-full overflow-hidden cursor-pointer"
                >
                  <img
                    src={images[4] || images[0]}
                    alt={`${room.title} - Ảnh 5`}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              </div>
            </div>

            {/* View all photos trigger button */}
            <button
              onClick={() => { setActivePhotoIndex(0); setIsLightboxOpen(true); }}
              className="absolute bottom-4 right-4 bg-white/95 hover:bg-white text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md text-xs sm:text-sm font-bold flex items-center gap-2 transition-all hover:scale-105 cursor-pointer border border-slate-200"
            >
              <Camera className="w-4 h-4 text-blue-600" />
              <span>Xem tất cả {images.length} ảnh thực tế</span>
            </button>
          </div>
        </section>

        {/* 4. TWO-COLUMN LAYOUT: CONTENT & BOOKING SIDEBAR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ========================================================= */}
          {/* LEFT COLUMN: MAIN ROOM DETAILS (7 COLS)                   */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            {/* QUICK SPECS GRID (4 BLOCKS) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Diện tích</span>
                <span className="text-xl font-black text-[#0F223A] mt-1 block">{room.area} m²</span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Không gian tối ưu</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Tầng cao</span>
                <span className="text-xl font-black text-[#0F223A] mt-1 block">Tầng {room.floor || 1}</span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Thang máy tốc độ</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Kiểu phòng</span>
                <span className="text-base font-extrabold text-[#0F223A] mt-1 block truncate" title={room.room_type}>
                  {room.room_type}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Nội thất cao cấp</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Ban công & View</span>
                <span className="text-base font-extrabold text-emerald-700 mt-1 block">
                  {room.has_balcony ? 'Có ban công' : 'Cửa sổ lớn'}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Đón sáng tự nhiên</span>
              </div>
            </div>

            {/* COST BREAKDOWN CARD (TRANSPARENT UTILITIES) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#0F223A]">Bảng Chi Phí &amp; Dịch Vụ Minh Bạch</h3>
                    <p className="text-xs text-slate-500">Cam kết 100% không phát sinh phụ phí ẩn khi ký hợp đồng</p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  Niêm yết chuẩn
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 block">Giá thuê niêm yết</span>
                    <span className="text-lg font-black text-blue-600 mt-0.5 block">
                      {room.price.toLocaleString('vi-VN')} đ/tháng
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200">
                    Cố định
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 block">Tiền đặt cọc</span>
                    <span className="text-base font-bold text-slate-800 mt-0.5 block">
                      {room.deposit.toLocaleString('vi-VN')} đ (1 tháng)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                    Hoàn trả khi hết HĐ
                  </span>
                </div>
              </div>

              {/* Specific Utility Rates */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">⚡ Tiền điện:</span>
                  <strong className="text-slate-800 font-bold mt-0.5 block">
                    {(room.electricity_rate || 3800).toLocaleString('vi-VN')} đ/kWh
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">💧 Tiền nước:</span>
                  <strong className="text-slate-800 font-bold mt-0.5 block">
                    {(room.water_rate || 25000).toLocaleString('vi-VN')} đ/m³
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">📶 Wifi cáp quang:</span>
                  <strong className="text-slate-800 font-bold mt-0.5 block">
                    {(room.internet_fee || 100000).toLocaleString('vi-VN')} đ/phòng
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">🛵 Phí gửi xe máy:</span>
                  <strong className="text-slate-800 font-bold mt-0.5 block">
                    {(room.parking_fee || 120000).toLocaleString('vi-VN')} đ/xe
                  </strong>
                </div>
              </div>
            </div>

            {/* FULL AMENITIES GRID */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-[#0F223A] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#B89C66]" />
                  <span>Tiện Nghi &amp; Nội Thất Đi Kèm Tại Căn Hộ</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đầy đủ trang thiết bị đạt tiêu chuẩn lưu trú cao cấp, sẵn sàng dọn vào ở ngay
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {room.amenities.map((amenity, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-blue-50/40 hover:border-blue-200 transition-colors"
                  >
                    <div className="p-2 rounded-xl bg-white shadow-xs shrink-0">
                      {getAmenityIcon(amenity)}
                    </div>
                    <span className="text-xs font-semibold text-slate-800">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* DESCRIPTION & HOUSE RULES */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-extrabold text-[#0F223A] mb-2">Mô Tả Chi Tiết Không Gian Sống</h3>
                <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2 whitespace-pre-line">
                  {room.description ||
                    `Căn hộ ${room.room_code} thuộc tổ hợp lưu trú cao cấp được vận hành chuyên nghiệp bởi Elite Living. Không gian được thiết kế hiện đại, thông gió và ánh sáng tự nhiên ngập tràn. Tòa nhà có thang máy di chuyển nhanh chóng, bảo vệ trực ban và hệ thống kiểm soát ra vào vân tay bảo mật tuyệt đối.`}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0F223A] mb-3">
                  Quy Định Tòa Nhà &amp; An Ninh Lưu Trú
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Giờ giấc tự do 24/7, không chung chủ</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Hệ thống khóa cửa cổng vân tay &amp; thẻ từ</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Camera an ninh đa góc hành lang 24/24</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Trang bị đầy đủ hệ thống PCCC tiêu chuẩn</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Khu vực để xe rộng rãi, phân chia rõ ràng</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Dịch vụ dọn dẹp vệ sinh khu vực chung 3 lần/tuần</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* LOCATION & NEARBY POIS */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-[#0F223A]">Vị Trí &amp; Tiện Ích Xung Quanh</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{room.address}</p>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  {room.district}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    🎓 Trường ĐH Công Thương TP.HCM (HUIT)
                  </span>
                  <p className="text-slate-500">
                    Khoảng cách: <strong>{room.distance_to_huit_km || '2.5'} km</strong> (~5-7 phút đi xe máy)
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    🛍️ Trung tâm thương mại &amp; Siêu thị
                  </span>
                  <p className="text-slate-500">
                    Gần Aeon Mall, Bách Hóa Xanh, Chợ dân sinh chỉ trong bán kính 500m
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    🚌 Giao thông &amp; Trạm xe buýt
                  </span>
                  <p className="text-slate-500">
                    Kết nối nhanh các tuyến đường huyết mạch, trạm xe buýt cách 150m
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    🏥 Y tế &amp; Dịch vụ tiện ích
                  </span>
                  <p className="text-slate-500">
                    Gần bệnh viện quận, phòng khám đa khoa, quầy thuốc 24/7
                  </p>
                </div>
              </div>
            </div>

            {/* BRAND COMMITMENT BADGE */}
            <div className="bg-gradient-to-r from-[#0F223A] to-[#1E3A8A] text-white p-6 rounded-3xl shadow-md flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                <ShieldCheck className="w-6 h-6 text-amber-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold tracking-wide text-amber-300">
                  Cam Kết Chất Lượng Lưu Trú Từ ELITE LIVING
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Toàn bộ hình ảnh được đội ngũ khảo sát thực tế 100%. Khách thuê ký kết hợp đồng minh bạch trực tiếp với đơn vị vận hành hoặc chủ nhà, được hỗ trợ xử lý sự cố kỹ thuật 24/7 và cam kết hoàn tiền cọc đúng điều khoản hợp đồng.
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: STICKY BOOKING CARD & LANDLORD (5 COLS)     */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-28">
            {/* BOOKING CARD */}
            <div id="booking-section" className="bg-white rounded-3xl p-6 border-2 border-blue-600/20 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-bl-full pointer-events-none"></div>

              {/* Price Header */}
              <div className="border-b border-slate-100 pb-4 mb-4">
                <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                  Giá thuê chính thức
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-blue-600">
                    {room.price.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-sm font-bold text-slate-600">đ / tháng</span>
                </div>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Cọc 1 tháng • Giữ chỗ online chống trùng lịch
                </p>
              </div>

              {/* BOOKING RESULT NOTIFICATION */}
              {bookingResult && (
                <div
                  className={`p-4 rounded-2xl mb-4 text-xs ${
                    bookingResult.status === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {bookingResult.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <strong className="block font-bold">
                        {bookingResult.status === 'success' ? 'Đặt lịch thành công!' : 'Thông báo lịch hẹn'}
                      </strong>
                      <p className="mt-0.5 leading-relaxed">{bookingResult.message}</p>
                      {bookingResult.appointmentId && (
                        <div className="mt-2 pt-2 border-t border-emerald-200/80 font-mono text-[11px]">
                          Mã cuộc hẹn: <strong>{bookingResult.appointmentId}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* BOOKING FORM */}
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                {/* Date Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Chọn ngày xem phòng</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs font-semibold text-slate-800 outline-hidden transition-all bg-slate-50/50"
                  />
                </div>

                {/* Time Slots Grid */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Chọn khung giờ hẹn</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => setBookingTimeSlot(slot)}
                        className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          bookingTimeSlot === slot
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Họ và tên của bạn</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn A"
                    value={bookingName}
                    onChange={(e) => setBookingName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs text-slate-800 outline-hidden transition-all bg-slate-50/50"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>Số điện thoại nhận xác nhận</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ví dụ: 0903123456"
                    value={bookingPhone}
                    onChange={(e) => setBookingPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs text-slate-800 outline-hidden transition-all bg-slate-50/50"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ghi chú thêm (không bắt buộc)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Nhu cầu ở ghép, thời điểm dọn vào..."
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs text-slate-800 outline-hidden transition-all bg-slate-50/50 resize-none"
                  ></textarea>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isBookingSubmitting || room.status === 'RENTED'}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    room.status === 'RENTED'
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5'
                  }`}
                >
                  {isBookingSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Đang xác thực khóa khung giờ...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      <span>
                        {room.status === 'RENTED'
                          ? 'Căn hộ đã có người thuê'
                          : `Xác nhận đặt lịch xem ${room.room_code}`}
                      </span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-slate-400">
                  ⚡ Cơ chế Mutex Lock khóa khung giờ tức thì, cam kết không trùng lịch
                </p>
              </form>
            </div>

            {/* LANDLORD & CONTACT CARD */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0F223A] to-blue-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {room.landlord_name ? room.landlord_name.charAt(0) : 'E'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 line-clamp-1">
                      {room.landlord_name || 'Đơn Vị Quản Lý Elite Living'}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Chủ trọ xác thực • Quản lý trực tiếp
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={`tel:${room.landlord_phone || '0903123456'}`}
                  className="py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Gọi Hotline</span>
                </a>

                <a
                  href={`https://zalo.me/${room.landlord_phone || '0903123456'}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat Zalo</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 5. RELATED ROOMS IN SAME PROJECT OR AREA */}
        {relatedRooms && relatedRooms.length > 0 && (
          <section className="mt-16 pt-12 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-xl font-extrabold text-[#0F223A] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span>Các Căn Hộ Khác Cùng Khu Vực</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Khám phá thêm các lựa chọn phòng trống khác thuộc {room.district}
                </p>
              </div>
              <Link
                href={`/?district=${encodeURIComponent(room.district)}#danh-sach-toa-nha`}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Xem tất cả phòng tại {room.district}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedRooms.map((relRoom) => (
                <div
                  key={relRoom.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group hover:-translate-y-1"
                >
                  <Link href={`/phong/${relRoom.id}`} className="relative h-44 w-full bg-slate-100 overflow-hidden block">
                    <img
                      src={relRoom.images[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600'}
                      alt={relRoom.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      {relRoom.room_code}
                    </div>
                    {relRoom.has_balcony && (
                      <div className="absolute top-2.5 right-2.5 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        Ban công
                      </div>
                    )}
                  </Link>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <Link
                        href={`/phong/${relRoom.id}`}
                        className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors block"
                        title={relRoom.title}
                      >
                        {relRoom.title}
                      </Link>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        Tầng {relRoom.floor || 1} • {relRoom.area} m² • {relRoom.room_type}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Giá thuê</span>
                        <span className="text-sm font-extrabold text-blue-600">
                          {relRoom.price.toLocaleString('vi-VN')} đ
                        </span>
                      </div>

                      <Link
                        href={`/phong/${relRoom.id}`}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-bold rounded-lg transition-colors"
                      >
                        Chi tiết &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* 6. MOBILE FIXED BOTTOM ACTION BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-2xl flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] text-slate-400 block">Giá thuê tháng</span>
          <span className="text-lg font-black text-blue-600">
            {room.price.toLocaleString('vi-VN')} đ
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`tel:${room.landlord_phone || '0903123456'}`}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            title="Gọi điện"
          >
            <Phone className="w-4 h-4" />
          </a>

          <a
            href="#booking-section"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20"
          >
            Đặt lịch xem ngay
          </a>
        </div>
      </div>

      {/* 7. FULLSCREEN LIGHTBOX MODAL */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between text-white py-2 px-4 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">
                {room.room_code}
              </span>
              <span className="text-sm font-semibold text-slate-300">
                Ảnh {activePhotoIndex + 1} / {images.length}
              </span>
            </div>

            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Slide with Nav Arrows */}
          <div className="relative flex-1 flex items-center justify-center max-w-6xl mx-auto w-full overflow-hidden my-4">
            <button
              onClick={() => setActivePhotoIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
              className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <img
              src={images[activePhotoIndex]}
              alt={`Ảnh chi tiết ${activePhotoIndex + 1}`}
              className="max-h-[78vh] max-w-full object-contain rounded-2xl shadow-2xl transition-all duration-300"
            />

            <button
              onClick={() => setActivePhotoIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
              className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all cursor-pointer"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Thumbnails strip */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 max-w-4xl mx-auto w-full scrollbar-thin">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActivePhotoIndex(i)}
                className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                  activePhotoIndex === i
                    ? 'border-blue-500 scale-105'
                    : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`Thumb ${i}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
