'use client';

import MotionPage from '@/components/MotionPage';

import React, { useState, useEffect, useRef } from 'react';
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
  MessageSquare,
  GraduationCap,
  ShoppingBag,
  Bus,
  HeartPulse,
  Droplets,
  Bike,
  Loader2
} from 'lucide-react';
import { Room, HouseRule } from '@/lib/types';
import RoomImageCarousel from '@/components/RoomImageCarousel';
import RoomReviews from '@/components/reviews/RoomReviews';
import { useRealtime } from '@/lib/use-realtime';

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

const toLocalDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function RoomDetailClient({ room, relatedRooms }: RoomDetailClientProps) {
  const router = useRouter();
  // Đồng bộ thời gian thực: phòng vừa được giữ chỗ / cho thuê, đánh giá mới
  const [reviewsTick, setReviewsTick] = useState(0);
  useRealtime(['room', 'review', 'appointment', 'contract'], (changes) => {
    const mine = changes.filter((c) => c.roomId === room.id);
    if (mine.some((c) => c.type === 'review')) setReviewsTick((t) => t + 1);
    if (mine.some((c) => c.type !== 'review')) router.refresh();
  });
  const { data: session } = useSession();

  // Gallery & Lightbox states
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const lightboxPreviousFocusRef = useRef<HTMLElement | null>(null);

  // Social actions
  const [isCopied, setIsCopied] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSavingLike, setIsSavingLike] = useState(false);
  const [likeNotice, setLikeNotice] = useState<string | null>(null);
  // Mã lượt hiển thị gợi ý Top-K (?rec=...) khi khách mở phòng từ danh sách gợi ý
  const [recommendationId, setRecommendationId] = useState<string | null>(null);
  const isTenant = session?.user?.role === 'TENANT' && Boolean(session?.user?.id);

  // Ghi lượt xem phòng (VIEW cho gợi ý cá nhân hóa; CLICK nếu mở từ danh sách gợi ý)
  useEffect(() => {
    const rec = new URLSearchParams(window.location.search).get('rec');
    setRecommendationId(rec);
    fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'VIEW', roomId: room.id, ...(rec ? { recommendationId: rec } : {}) }),
      keepalive: true,
    }).catch(() => {});
  }, [room.id, session?.user?.id]);

  // Trạng thái "đã lưu" thật từ cơ sở dữ liệu
  useEffect(() => {
    if (!isTenant) {
      setIsLiked(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/user/saved-rooms?roomId=${room.id}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.success) setIsLiked(Boolean(json.data?.saved));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isTenant, room.id]);

  const handleToggleLike = async () => {
    if (isSavingLike) return;
    if (!isTenant) {
      setLikeNotice('Vui lòng đăng nhập tài khoản khách thuê để lưu phòng yêu thích.');
      setTimeout(() => setLikeNotice(null), 4000);
      return;
    }
    const next = !isLiked;
    setIsLiked(next);
    setIsSavingLike(true);
    try {
      const res = await fetch(
        next ? '/api/user/saved-rooms' : `/api/user/saved-rooms?roomId=${room.id}`,
        next
          ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId: room.id }) }
          : { method: 'DELETE' }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Không lưu được phòng.');
      setLikeNotice(next ? 'Đã lưu phòng. Xem lại trong Hồ sơ › Phòng đã lưu.' : 'Đã bỏ lưu phòng.');
    } catch (err) {
      setIsLiked(!next);
      setLikeNotice(err instanceof Error ? err.message : 'Không lưu được phòng. Vui lòng thử lại.');
    } finally {
      setIsSavingLike(false);
      setTimeout(() => setLikeNotice(null), 4000);
    }
  };

  // Booking Form State
  const [bookingName, setBookingName] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingDate, setBookingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toLocalDateInputValue(d);
  });
  const [availableSlots, setAvailableSlots] = useState<string[]>(TIME_SLOTS);
  const [availableDays, setAvailableDays] = useState<string[]>(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']);
  const [noticeHours, setNoticeHours] = useState<number>(1);
  const [landlordInstructions, setLandlordInstructions] = useState<string>('');
  const [liveHouseRules, setLiveHouseRules] = useState<HouseRule[]>([]);
  const [bookingTimeSlot, setBookingTimeSlot] = useState(TIME_SLOTS[1]);
  const [bookingNotes, setBookingNotes] = useState('Tôi muốn xem căn hộ trực tiếp vào khung giờ đã chọn.');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    status: 'success' | 'error';
    message: string;
    appointmentId?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadLandlordConfig = async () => {
      try {
        const baseParams = new URLSearchParams({ roomId: String(room.id) });
        if (room.landlord_id) baseParams.set('landlordId', room.landlord_id);

        const [availRes, rulesRes] = await Promise.all([
          fetch(`/api/landlords?type=availability&${baseParams.toString()}`),
          fetch(`/api/landlords?type=rules&${baseParams.toString()}`),
        ]);

        const availJson = await availRes.json().catch(() => null);
        if (!cancelled && availRes.ok && availJson?.success && availJson.data) {
          const enabled = Array.isArray(availJson.data.slots)
            ? availJson.data.slots.filter((s: any) => s.enabled).map((s: any) => String(s.timeSlot))
            : TIME_SLOTS;
          setAvailableSlots(enabled);
          if (enabled.length > 0) {
            setBookingTimeSlot((prev) => (enabled.includes(prev) ? prev : enabled[0]));
          } else {
            setBookingTimeSlot('');
          }
          if (Array.isArray(availJson.data.available_days)) {
            setAvailableDays(availJson.data.available_days);
          }
          if (typeof availJson.data.notice_hours === 'number') {
            setNoticeHours(availJson.data.notice_hours);
          }
          if (typeof availJson.data.instructions === 'string') {
            setLandlordInstructions(availJson.data.instructions);
          }
        }

        const rulesJson = await rulesRes.json().catch(() => null);
        if (!cancelled && rulesRes.ok && rulesJson?.success && Array.isArray(rulesJson.data)) {
          setLiveHouseRules(rulesJson.data.filter((r: HouseRule) => r.isActive));
        }
      } catch {
        // Fallback to default TIME_SLOTS
      }
    };
    loadLandlordConfig();
    return () => {
      cancelled = true;
    };
  }, [room.id, room.landlord_id]);

  const isBookingAllowed = room.status === 'AVAILABLE' || room.status === 'BOOKED_VIEWING';
  const bookingCtaLabel =
    room.status === 'AVAILABLE'
      ? `Xác nhận đặt lịch xem ${room.room_code}`
      : room.status === 'BOOKED_VIEWING'
      ? `Chọn khung giờ khác cho ${room.room_code}`
      : room.status === 'RESERVED'
      ? 'Phòng đang được giữ chỗ'
      : 'Phòng đang có khách thuê';

  useEffect(() => {
    if (session?.user) {
      if (session.user.name) setBookingName(session.user.name);
      if (session.user.phone) setBookingPhone(session.user.phone);
    }
  }, [session]);

  // Copy link helper
  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      // Link chia sẻ không mang mã gợi ý (?rec=) để lượt mở từ link chia sẻ không bị tính là bấm vào gợi ý
      navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}`);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  // Submit appointment with Mutex Lock
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBookingAllowed) {
      setBookingResult({
        status: 'error',
        message:
          room.status === 'RESERVED'
            ? 'Phòng đang được giữ chỗ và chưa nhận thêm lịch xem.'
            : 'Phòng đang có khách thuê và chưa nhận lịch xem mới.'
      });
      return;
    }
    if (!bookingName.trim() || !bookingPhone.trim()) {
      setBookingResult({
        status: 'error',
        message: 'Vui lòng điền đầy đủ Họ tên và Số điện thoại liên hệ.'
      });
      return;
    }

    const normalizedPhone = bookingPhone.replace(/[\s-]/g, '');
    if (!/^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-689]|9[0-46-9])\d{7}$/.test(normalizedPhone)) {
      setBookingResult({
        status: 'error',
        message: 'Số điện thoại chưa đúng định dạng Việt Nam. Ví dụ: 0901234567.'
      });
      return;
    }

    if (availableSlots.length === 0 || !bookingTimeSlot) {
      setBookingResult({
        status: 'error',
        message: 'Chủ trọ hiện đang tạm ngưng khung giờ đón khách trực tuyến. Vui lòng liên hệ trực tiếp qua SĐT.'
      });
      return;
    }

    if (bookingDate) {
      const [y, m, d] = bookingDate.split('-').map(Number);
      const selectedDate = new Date(y, m - 1, d);
      const dayCode = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][selectedDate.getDay()];
      if (availableDays.length > 0 && !availableDays.includes(dayCode)) {
        setBookingResult({
          status: 'error',
          message: `Chủ trọ không đón khách vào ${dayCode}. Ngày mở cửa xem phòng: ${availableDays.join(', ')}.`
        });
        return;
      }
    }

    setIsBookingSubmitting(true);
    setBookingResult(null);

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: room.id,
          user_id: session?.user?.id,
          user_name: bookingName.trim(),
          user_phone: normalizedPhone,
          date: bookingDate,
          time_slot: bookingTimeSlot,
          notes: bookingNotes.trim(),
          ...(recommendationId ? { recommendation_id: recommendationId } : {}),
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
          message: `Đã đặt lịch xem căn hộ ${room.room_code}. Nhân viên sẽ gọi cho bạn trước giờ hẹn 30 phút.`,
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
    if (lower.includes('lạnh') || lower.includes('điều hòa')) return <Wind className="w-4 h-4 text-[#B89C66]" />;
    if (lower.includes('giường') || lower.includes('nệm')) return <Bed className="w-4 h-4 text-[#B89C66]" />;
    if (lower.includes('tủ lạnh')) return <Zap className="w-4 h-4 text-[#B89C66]" />;
    if (lower.includes('máy giặt')) return <Sparkles className="w-4 h-4 text-[#B89C66]" />;
    if (lower.includes('wifi') || lower.includes('mạng')) return <Wifi className="w-4 h-4 text-[#B89C66]" />;
    if (lower.includes('bếp') || lower.includes('nấu')) return <Utensils className="w-4 h-4 text-[#B89C66]" />;
    if (lower.includes('khóa') || lower.includes('vân tay')) return <KeyRound className="w-4 h-4 text-[#B89C66]" />;
    if (lower.includes('camera') || lower.includes('an ninh')) return <Camera className="w-4 h-4 text-[#B89C66]" />;
    if (lower.includes('tivi') || lower.includes('tv')) return <Tv className="w-4 h-4 text-[#B89C66]" />;
    if (lower.includes('ban công')) return <Sparkles className="w-4 h-4 text-[#B89C66]" />;
    if (lower.includes('gác')) return <Layers className="w-4 h-4 text-[#B89C66]" />;
    if (lower.includes('tự do')) return <Clock className="w-4 h-4 text-[#B89C66]" />;
    return <CheckCircle2 className="w-4 h-4 text-[#B89C66]" />;
  };

  const images = room.images && room.images.length > 0 ? room.images : [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800'
  ];

  useEffect(() => {
    if (!isLightboxOpen) return;

    lightboxPreviousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => lightboxCloseRef.current?.focus());

    const handleLightboxKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (event.key === 'ArrowLeft') {
        setActivePhotoIndex((previous) => (previous === 0 ? images.length - 1 : previous - 1));
      } else if (event.key === 'ArrowRight') {
        setActivePhotoIndex((previous) => (previous === images.length - 1 ? 0 : previous + 1));
      }
    };

    window.addEventListener('keydown', handleLightboxKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', handleLightboxKeyDown);
      lightboxPreviousFocusRef.current?.focus();
    };
  }, [isLightboxOpen, images.length]);

  const statusLabel =
    room.status === 'AVAILABLE'
      ? { text: 'Còn trống — Sẵn sàng vào ở', bg: 'bg-[#FAF0DC] text-[#8C6D37] border-[#B89C66]/40' }
      : room.status === 'BOOKED_VIEWING'
      ? { text: 'Đã có lịch hẹn — Vẫn còn khung giờ khác', bg: 'bg-[#F0F4F8] text-[#0F223A] border-[#0F223A]/15' }
      : room.status === 'RESERVED'
      ? { text: 'Đang giữ chỗ — Chờ hoàn tất hợp đồng', bg: 'bg-[#FAF7F2] text-[#8C6D37] border-[#B89C66]/35' }
      : { text: 'Đang thuê — Chưa nhận lịch mới', bg: 'bg-slate-100 text-slate-600 border-slate-200' };

  return (
    <MotionPage className="bg-[#F8F8F6] min-h-screen text-[#0F223A]">
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
          <div className="relative flex items-center gap-2">
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
                  ? 'bg-[#FAF0DC] text-[#8C6D37] border-[#B89C66]/40'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              {isCopied ? <CheckCheck className="w-3.5 h-3.5 text-[#B89C66]" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Đã sao chép link' : 'Chia sẻ'}</span>
            </button>

            <button
              onClick={handleToggleLike}
              type="button"
              disabled={isSavingLike}
              title={isLiked ? 'Bỏ lưu phòng' : 'Lưu phòng'}
              aria-label={isLiked ? 'Bỏ tin khỏi danh sách yêu thích' : 'Lưu tin vào danh sách yêu thích'}
              aria-pressed={isLiked}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isLiked
                  ? 'bg-[#FAF0DC] text-[#8C6D37] border-[#B89C66]/40 shadow-xs'
                  : 'border-slate-200 hover:bg-[#FAF7F2] text-slate-400 hover:text-[#B89C66]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            {likeNotice && (
              <span role="status" className="absolute right-4 top-full mt-2 z-30 max-w-[260px] rounded-xl border border-[#E5E3DE] bg-white px-3 py-2 text-xs font-semibold text-[#0F223A] shadow-lg">
                {likeNotice}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* 3. IMAGE GALLERY LEFT + ROOM SUMMARY RIGHT */}
        <div className="mb-10 grid min-w-0 grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)] xl:grid-cols-[minmax(0,1.8fr)_380px]">
          <RoomImageCarousel
            key={room.id}
            images={images}
            roomTitle={room.title}
            roomCode={room.room_code}
            latitude={room.latitude}
            longitude={room.longitude}
            address={room.address}
            projectName={room.project_name}
            onOpen={(index) => {
              setActivePhotoIndex(index);
              setIsLightboxOpen(true);
            }}
          />

          <aside className="relative flex min-w-0 flex-col overflow-hidden rounded-[28px] border border-[#E5E3DE] bg-white p-5 shadow-[0_24px_60px_-34px_rgba(15,34,58,0.45)] sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#B89C66]/10 blur-3xl" />

            <div className="relative flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#0F223A] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                {room.room_code}
              </span>
              <span className={`rounded-full border px-3 py-1 text-[10px] font-bold ${statusLabel.bg}`}>
                {statusLabel.text}
              </span>
            </div>

            <div className="relative mt-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#B89C66]">
                Elite Living Residence
              </p>
              <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight text-[#0F223A] xl:text-[28px]">
                {room.title}
              </h1>

              {room.project_name && (
                <p className="mt-3 flex items-start gap-2 text-xs font-semibold text-slate-600">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[#B89C66]" aria-hidden="true" />
                  <span>{room.project_name}</span>
                </p>
              )}
              <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#B89C66]" aria-hidden="true" />
                <span>{room.address}</span>
              </p>
            </div>

            <div className="relative mt-5 rounded-2xl bg-gradient-to-br from-[#0F223A] to-[#1E3A5B] p-4 text-white shadow-lg">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5D7B7]">Giá thuê niêm yết</span>
              <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                <strong className="text-3xl font-black text-[#E5D7B7]">{room.price.toLocaleString('vi-VN')}</strong>
                <span className="text-xs font-bold text-slate-300">đ / tháng</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-300">Tiền cọc: {room.deposit.toLocaleString('vi-VN')} đ</p>
            </div>

            <div className="relative mt-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-[#E5E3DE] bg-[#F8F8F6] p-3">
                <Maximize2 className="h-4 w-4 text-[#B89C66]" aria-hidden="true" />
                <strong className="mt-2 block text-sm text-[#0F223A]">{room.area} m²</strong>
                <span className="text-[10px] text-slate-500">Diện tích sử dụng</span>
              </div>
              <div className="rounded-2xl border border-[#E5E3DE] bg-[#F8F8F6] p-3">
                <Layers className="h-4 w-4 text-[#B89C66]" aria-hidden="true" />
                <strong className="mt-2 block text-sm text-[#0F223A]">Tầng {room.floor || 1}</strong>
                <span className="text-[10px] text-slate-500">Vị trí căn hộ</span>
              </div>
              <div className="rounded-2xl border border-[#E5E3DE] bg-[#F8F8F6] p-3">
                <Bed className="h-4 w-4 text-[#B89C66]" aria-hidden="true" />
                <strong className="mt-2 block truncate text-sm text-[#0F223A]" title={room.room_type}>{room.room_type}</strong>
                <span className="text-[10px] text-slate-500">Loại phòng</span>
              </div>
              <div className="rounded-2xl border border-[#E5E3DE] bg-[#F8F8F6] p-3">
                <GraduationCap className="h-4 w-4 text-[#B89C66]" aria-hidden="true" />
                <strong className="mt-2 block text-sm text-[#0F223A]">{room.distance_to_huit_km || '2.5'} km</strong>
                <span className="text-[10px] text-slate-500">Đến HUIT</span>
              </div>
            </div>

            {room.amenities.length > 0 && (
              <div className="relative mt-4 flex flex-wrap gap-1.5">
                {room.amenities.slice(0, 4).map((amenity) => (
                  <span key={amenity} className="rounded-full border border-[#B89C66]/25 bg-[#FAF0DC] px-2.5 py-1 text-[10px] font-bold text-[#6F552D]">
                    {amenity}
                  </span>
                ))}
              </div>
            )}

            <div className="relative mt-auto grid grid-cols-[1fr_auto] gap-2 pt-5">
              <button
                type="button"
                disabled={!isBookingAllowed}
                onClick={() => document.getElementById('booking-section')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#B89C66] px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-[#B89C66]/25 transition-all hover:-translate-y-0.5 hover:bg-[#A38752] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <span>{isBookingAllowed ? 'Đặt lịch xem phòng' : bookingCtaLabel}</span>
              </button>
              <a
                href={`tel:${room.landlord_phone}`}
                aria-label="Gọi tư vấn phòng"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E5E3DE] bg-white text-[#0F223A] transition-all hover:border-[#B89C66] hover:text-[#B89C66]"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </aside>
        </div>

        {/* 4. TWO-COLUMN LAYOUT: CONTENT & BOOKING SIDEBAR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ========================================================= */}
          {/* LEFT COLUMN: MAIN ROOM DETAILS (7 COLS)                   */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            {/* QUICK SPECS GRID (4 BLOCKS) */}
            <div data-reveal-group className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Diện tích</span>
                <span className="text-xl font-black text-[#0F223A] mt-1 block">{room.area} m²</span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Diện tích sử dụng</span>
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
                <span className="text-base font-extrabold text-[#8C6D37] mt-1 block">
                  {room.has_balcony ? 'Có ban công' : 'Cửa sổ lớn'}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Đón sáng tự nhiên</span>
              </div>
            </div>

            {/* COST BREAKDOWN CARD (TRANSPARENT UTILITIES) */}
            <div data-reveal className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FAF0DC] text-[#B89C66] flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#0F223A]">Chi phí hàng tháng</h3>
                    <p className="text-xs text-slate-500">Đúng như ghi trong hợp đồng, không thu thêm khoản khác</p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#FAF0DC] text-[#8C6D37] font-bold border border-[#B89C66]/40">
                  Giá niêm yết
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 block">Giá thuê niêm yết</span>
                    <span className="text-lg font-black text-[#8C6D37] mt-0.5 block">
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
                  <span className="text-[10px] font-bold text-[#8C6D37] bg-[#FAF0DC] px-2 py-1 rounded-lg border border-[#B89C66]/40">
                    Hoàn trả khi hết HĐ
                  </span>
                </div>
              </div>

              {/* Specific Utility Rates */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-slate-500 text-[11px] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#B89C66]" aria-hidden="true" /> Tiền điện:
                  </span>
                  <strong className="text-slate-800 font-bold mt-0.5 block">
                    {(room.electricity_rate || 3800).toLocaleString('vi-VN')} đ/kWh
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-slate-500 text-[11px] flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-[#B89C66]" aria-hidden="true" /> Tiền nước:
                  </span>
                  <strong className="text-slate-800 font-bold mt-0.5 block">
                    {(room.water_rate || 25000).toLocaleString('vi-VN')} đ/m³
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-slate-500 text-[11px] flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-[#B89C66]" aria-hidden="true" /> Wifi cáp quang:
                  </span>
                  <strong className="text-slate-800 font-bold mt-0.5 block">
                    {(room.internet_fee || 100000).toLocaleString('vi-VN')} đ/phòng
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-slate-500 text-[11px] flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5 text-[#B89C66]" aria-hidden="true" /> Phí gửi xe máy:
                  </span>
                  <strong className="text-slate-800 font-bold mt-0.5 block">
                    {(room.parking_fee || 120000).toLocaleString('vi-VN')} đ/xe
                  </strong>
                </div>
              </div>
            </div>

            {/* FULL AMENITIES GRID */}
            <div data-reveal className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-[#0F223A] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#B89C66]" />
                  <span>Nội thất và tiện nghi trong phòng</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Có sẵn khi bạn dọn vào
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {room.amenities.map((amenity, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-[#FAF0DC]/50 hover:border-[#B89C66]/40 transition-colors"
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
            <div data-reveal className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-extrabold text-[#0F223A] mb-2">Mô tả phòng</h3>
                <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2 whitespace-pre-line">
                  {room.description ||
                    `Căn hộ ${room.room_code} do Elite Living quản lý. Phòng có cửa sổ, thoáng và có nắng. Tòa nhà có thang máy, bảo vệ và cửa ra vào bằng vân tay.`}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0F223A] mb-3">
                  Quy định và an ninh tòa nhà
                </h4>
                {liveHouseRules.length > 0 ? (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-600">
                    {liveHouseRules.map((rule) => (
                      <li key={rule.id} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                        <CheckCircle2 className="w-4 h-4 text-[#B89C66] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[#0F223A] block">{rule.title}</strong>
                          <span className="text-slate-600 text-[11px] leading-snug block mt-0.5">{rule.content}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#B89C66] shrink-0" />
                      <span>Giờ giấc tự do 24/7, không chung chủ</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#B89C66] shrink-0" />
                      <span>Hệ thống khóa cửa cổng vân tay &amp; thẻ từ</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#B89C66] shrink-0" />
                      <span>Camera an ninh đa góc hành lang 24/24</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#B89C66] shrink-0" />
                      <span>Trang bị đầy đủ hệ thống PCCC tiêu chuẩn</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#B89C66] shrink-0" />
                      <span>Khu vực để xe rộng rãi, phân chia rõ ràng</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#B89C66] shrink-0" />
                      <span>Dịch vụ dọn dẹp vệ sinh khu vực chung 3 lần/tuần</span>
                    </li>
                  </ul>
                )}
              </div>
            </div>

            {/* ĐÁNH GIÁ & PHẢN HỒI CỦA NGƯỜI THUÊ */}
            <RoomReviews roomId={room.id} refreshKey={reviewsTick} />

            {/* LOCATION & NEARBY POIS */}
            <div data-reveal className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-[#0F223A]">Vị trí và tiện ích xung quanh</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{room.address}</p>
                </div>
                <span className="text-xs font-bold text-[#8C6D37] bg-[#FAF0DC] px-3 py-1 rounded-full border border-[#B89C66]/40">
                  {room.district}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-[#B89C66]" aria-hidden="true" />
                    Trường ĐH Công Thương TP.HCM (HUIT)
                  </span>
                  <p className="text-slate-500">
                    Khoảng cách: <strong>{room.distance_to_huit_km || '2.5'} km</strong> (~5-7 phút đi xe máy)
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-[#B89C66]" aria-hidden="true" />
                    Trung tâm thương mại &amp; Siêu thị
                  </span>
                  <p className="text-slate-500">
                    Gần Aeon Mall, Bách Hóa Xanh, Chợ dân sinh chỉ trong bán kính 500m
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Bus className="w-4 h-4 text-[#B89C66]" aria-hidden="true" />
                    Giao thông &amp; Trạm xe buýt
                  </span>
                  <p className="text-slate-500">
                    Gần các tuyến đường chính, trạm xe buýt cách 150m
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-[#B89C66]" aria-hidden="true" />
                    Y tế &amp; Dịch vụ tiện ích
                  </span>
                  <p className="text-slate-500">
                    Gần bệnh viện quận, phòng khám đa khoa, quầy thuốc 24/7
                  </p>
                </div>
              </div>
            </div>

            {/* BRAND COMMITMENT BADGE */}
            <div className="bg-gradient-to-r from-[#0F223A] to-[#1E3A5B] text-white p-6 rounded-3xl shadow-md flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                <ShieldCheck className="w-6 h-6 text-[#B89C66]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold tracking-wide text-[#E5D7B7]">
                  Cam kết của Elite Living
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ảnh do nhân viên chụp tại phòng. Bạn ký hợp đồng trực tiếp với đơn vị quản lý hoặc chủ nhà, được hỗ trợ sửa chữa 24/7 và nhận lại tiền cọc theo đúng hợp đồng.
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: STICKY BOOKING CARD & LANDLORD (5 COLS)     */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-28">
            {/* BOOKING CARD */}
            <div id="booking-section" className="bg-white rounded-3xl p-6 border-2 border-[#B89C66]/30 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#B89C66]/8 rounded-bl-full pointer-events-none"></div>

              {/* Price Header */}
              <div className="border-b border-slate-100 pb-4 mb-4">
                <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                  Giá thuê chính thức
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-[#B89C66]">
                    {room.price.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-sm font-bold text-slate-600">đ / tháng</span>
                </div>
                <p className="text-[11px] text-[#8C6D37] font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Cọc 1 tháng • Giữ chỗ online chống trùng lịch
                </p>
              </div>

              {/* BOOKING RESULT NOTIFICATION */}
              {bookingResult && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`p-4 rounded-2xl mb-4 text-xs ${
                    bookingResult.status === 'success'
                      ? 'bg-[#FAF0DC] border border-[#B89C66]/40 text-[#0F223A]'
                      : 'bg-rose-50 border border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {bookingResult.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-[#B89C66] shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <strong className="block font-bold">
                        {bookingResult.status === 'success' ? 'Đặt lịch thành công!' : 'Thông báo lịch hẹn'}
                      </strong>
                      <p className="mt-0.5 leading-relaxed">{bookingResult.message}</p>
                      {bookingResult.appointmentId && (
                        <div className="mt-2 pt-2 border-t border-[#B89C66]/30 font-mono text-[11px]">
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
                  <label htmlFor="booking-date" className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#B89C66]" />
                    <span>Chọn ngày xem phòng</span>
                  </label>
                  <input
                    id="booking-date"
                    type="date"
                    required
                    value={bookingDate}
                    min={toLocalDateInputValue(new Date())}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#B89C66] focus:ring-2 focus:ring-[#B89C66]/15 text-xs font-semibold text-slate-800 outline-hidden transition-all bg-slate-50/50"
                  />
                </div>

                {/* Time Slots Grid */}
                <div>
                  <p id="booking-time-slot-label" className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#B89C66]" />
                    <span>Chọn khung giờ hẹn</span>
                  </p>
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-1.5" role="group" aria-labelledby="booking-time-slot-label">
                      {availableSlots.map((slot) => (
                        <button
                          type="button"
                          key={slot}
                          onClick={() => setBookingTimeSlot(slot)}
                          aria-pressed={bookingTimeSlot === slot}
                          className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                            bookingTimeSlot === slot
                              ? 'bg-[#B89C66] text-white border-[#B89C66] shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                      Chủ trọ hiện đang tạm khóa toàn bộ khung giờ đặt lịch trực tuyến. Vui lòng liên hệ qua số điện thoại.
                    </p>
                  )}
                  {(availableDays.length > 0 || landlordInstructions) && (
                    <div className="mt-2 p-2.5 rounded-xl bg-[#FAF8F4] border border-[#E5E3DE] text-[11px] text-slate-600 space-y-0.5">
                      <p className="font-semibold text-[#0F223A]">
                        Ngày đón khách: <span className="text-[#8C6D37]">{availableDays.join(', ')}</span>
                        {noticeHours > 0 ? ` • Báo trước ${noticeHours}h` : ''}
                      </p>
                      {landlordInstructions && (
                        <p className="text-slate-500 italic">{landlordInstructions}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label htmlFor="booking-name" className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#B89C66]" />
                    <span>Họ và tên của bạn</span>
                  </label>
                  <input
                    id="booking-name"
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn A"
                    value={bookingName}
                    onChange={(e) => setBookingName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#B89C66] focus:ring-2 focus:ring-[#B89C66]/15 text-xs text-slate-800 outline-hidden transition-all bg-slate-50/50"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="booking-phone" className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#B89C66]" />
                    <span>Số điện thoại nhận xác nhận</span>
                  </label>
                  <input
                    id="booking-phone"
                    type="tel"
                    required
                    placeholder="Ví dụ: 0903123456"
                    value={bookingPhone}
                    onChange={(e) => setBookingPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#B89C66] focus:ring-2 focus:ring-[#B89C66]/15 text-xs text-slate-800 outline-hidden transition-all bg-slate-50/50"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="booking-notes" className="block text-xs font-bold text-slate-700 mb-1">
                    Ghi chú thêm (không bắt buộc)
                  </label>
                  <textarea
                    id="booking-notes"
                    rows={2}
                    placeholder="Nhu cầu ở ghép, thời điểm dọn vào..."
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-[#B89C66] focus:ring-2 focus:ring-[#B89C66]/15 text-xs text-slate-800 outline-hidden transition-all bg-slate-50/50 resize-none"
                  ></textarea>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isBookingSubmitting || !isBookingAllowed}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    !isBookingAllowed
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-[#B89C66] hover:bg-[#A38752] text-white shadow-[#B89C66]/25 hover:shadow-[#B89C66]/35 hover:-translate-y-0.5'
                  }`}
                >
                  {isBookingSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Đang giữ khung giờ…</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      <span>
                        {bookingCtaLabel}
                      </span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-slate-400 flex items-center justify-center gap-1.5">
                  <Shield className="w-3 h-3 text-[#B89C66]" aria-hidden="true" />
                  <span>Khung giờ được giữ cho bạn ngay, không ai đặt trùng</span>
                </p>
              </form>
            </div>

            {/* LANDLORD & CONTACT CARD */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0F223A] to-[#1E3A5B] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {room.landlord_name ? room.landlord_name.charAt(0) : 'E'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 line-clamp-1">
                      {room.landlord_name || 'Elite Living'}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#8C6D37] flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Chủ trọ xác thực • Quản lý trực tiếp
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={`tel:${room.landlord_phone || '0903123456'}`}
                  className="py-2.5 px-3 rounded-xl bg-[#FAF0DC] hover:bg-[#B89C66]/20 text-[#8C6D37] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Gọi hotline</span>
                </a>

                <a
                  href={`https://zalo.me/${room.landlord_phone || '0903123456'}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-[#0F223A] hover:bg-[#1E3A5B] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
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
                  <Building2 className="w-5 h-5 text-[#B89C66]" />
                  <span>Phòng khác cùng khu vực</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phòng còn trống khác ở {room.district}
                </p>
              </div>
              <Link
                href={`/?district=${encodeURIComponent(room.district)}#danh-sach-toa-nha`}
                className="text-xs font-bold text-[#8C6D37] hover:text-[#A38752] flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Xem tất cả phòng tại {room.district}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div data-reveal-group className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
                      <div className="absolute top-2.5 right-2.5 bg-[#0F223A]/90 border border-[#B89C66]/40 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        Ban công
                      </div>
                    )}
                  </Link>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <Link
                        href={`/phong/${relRoom.id}`}
                        className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1 group-hover:text-[#A38752] transition-colors block"
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
                        <span className="text-sm font-extrabold text-[#8C6D37]">
                          {relRoom.price.toLocaleString('vi-VN')} đ
                        </span>
                      </div>

                      <Link
                        href={`/phong/${relRoom.id}`}
                        className="px-3 py-1.5 bg-[#FAF0DC] hover:bg-[#B89C66] hover:text-white text-[#8C6D37] text-xs font-bold rounded-lg transition-colors"
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
          <span className="text-lg font-black text-[#B89C66]">
            {room.price.toLocaleString('vi-VN')} đ
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`tel:${room.landlord_phone || '0903123456'}`}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            aria-label="Gọi điện cho chủ trọ"
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
          </a>

          {isBookingAllowed ? (
            <a
              href="#booking-section"
              className="px-4 py-2.5 bg-[#B89C66] hover:bg-[#A38752] text-white text-xs font-bold rounded-xl shadow-md shadow-[#B89C66]/25"
            >
              {room.status === 'BOOKED_VIEWING' ? 'Chọn giờ khác' : 'Đặt lịch xem ngay'}
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="px-4 py-2.5 bg-slate-200 text-slate-500 text-xs font-bold rounded-xl cursor-not-allowed"
            >
              {room.status === 'RESERVED' ? 'Đang giữ chỗ' : 'Đang có khách thuê'}
            </button>
          )}
        </div>
      </div>

      {/* 7. FULLSCREEN LIGHTBOX MODAL */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="room-lightbox-title"
          className="fixed inset-0 z-50 bg-[#0F223A]/95 backdrop-blur-md flex flex-col justify-between p-4 animate-in fade-in duration-200"
        >
          <h2 id="room-lightbox-title" className="sr-only">
            Bộ ảnh phòng {room.room_code}
          </h2>
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
              ref={lightboxCloseRef}
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Đóng bộ ảnh phòng"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Main Slide with Nav Arrows */}
          <div className="relative flex-1 flex items-center justify-center max-w-6xl mx-auto w-full overflow-hidden my-4">
            <button
              type="button"
              onClick={() => setActivePhotoIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
              className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all cursor-pointer"
              aria-label="Xem ảnh trước"
            >
              <ChevronLeft className="w-6 h-6" aria-hidden="true" />
            </button>

            <img
              src={images[activePhotoIndex]}
              alt={`Ảnh chi tiết ${activePhotoIndex + 1}`}
              className="max-h-[78vh] max-w-full object-contain rounded-2xl shadow-2xl transition-all duration-300"
            />

            <button
              type="button"
              onClick={() => setActivePhotoIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
              className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all cursor-pointer"
              aria-label="Xem ảnh tiếp theo"
            >
              <ChevronRight className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>

          {/* Thumbnails strip */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 max-w-4xl mx-auto w-full scrollbar-thin">
            {images.map((img, i) => (
              <button
                type="button"
                key={i}
                onClick={() => setActivePhotoIndex(i)}
                aria-label={`Xem ảnh ${i + 1} của phòng ${room.room_code}`}
                aria-pressed={activePhotoIndex === i}
                className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                  activePhotoIndex === i
                    ? 'border-[#B89C66] scale-105'
                    : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </MotionPage>
  );
}
