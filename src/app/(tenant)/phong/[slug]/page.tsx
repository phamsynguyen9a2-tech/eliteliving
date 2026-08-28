import type { Metadata } from 'next'
import { MapPin, Home, Zap, Wifi, WashingMachine, Refrigerator, Tv2, Car, AirVent, CalendarDays, Phone, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import Link from 'next/link'
import RoomDetailActions from '@/components/tenant/RoomDetailActions'

export const metadata: Metadata = {
  title: 'Chi tiết phòng – NhàTrọTop',
}

// In real app, fetch from DB by slug
export default function RoomDetailPage({ params }: { params: { slug: string } }) {
  const room = {
    code: params.slug.toUpperCase(),
    name: 'Phòng Studio Tân Phú – Full Nội Thất',
    areaName: 'Khu trọ Tân Phú',
    address: '22 Tân Quý, P. Tân Sơn Nhì, Q. Tân Phú, TP.HCM',
    price: 4500000,
    deposit: 9000000,
    size: 28,
    floor: 1,
    status: 'AVAILABLE',
    electric: 3500,
    water: 15000,
    description: 'Phòng studio thiết kế hiện đại, thoáng mát, đầy đủ nội thất cao cấp. Khu vực an ninh 24/7, camera giám sát. Gần chợ Tân Phú, siêu thị Co.opmart, dễ dàng di chuyển.',
    amenities: ['Máy lạnh', 'Wifi', 'Máy giặt riêng', 'Tủ lạnh', 'Giường', 'Tủ quần áo', 'Bàn & ghế', 'Bình nóng lạnh'],
    images: [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    ],
    landlord: { name: 'Nguyễn Văn Hùng', phone: '0923456789', rating: 4.8, totalRooms: 6 },
    reviews: [
      { user: 'Trần Thị Mai', rating: 5, comment: 'Phòng rất sạch sẽ, chủ trọ nhiệt tình. Giá cả hợp lý!', date: '01/08/2026' },
      { user: 'Lê Văn Nam', rating: 4, comment: 'Vị trí thuận tiện, gần trường học. Sẽ giới thiệu cho bạn bè.', date: '15/07/2026' },
    ],
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Link href="/tim-phong" className="hover:text-primary-600 transition-colors">Tìm phòng</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-dark-700 font-medium">{room.name}</span>
      </nav>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left: images + details */}
        <div className="xl:col-span-2 space-y-6">
          {/* Image gallery */}
          <div className="bg-dark-900 rounded-2xl overflow-hidden relative aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={room.images[0]} alt={room.name} className="w-full h-full object-cover" />
            <button className="absolute left-4 top-1/2 -translate-y-1/2 btn-icon bg-white/90 backdrop-blur-sm hover:bg-white shadow-md">
              <ChevronLeft className="w-5 h-5 text-dark-800" />
            </button>
            <button className="absolute right-4 top-1/2 -translate-y-1/2 btn-icon bg-white/90 backdrop-blur-sm hover:bg-white shadow-md">
              <ChevronRight className="w-5 h-5 text-dark-800" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {room.images.map((_, i) => (
                <button key={i} className={`w-2 h-2 rounded-full transition-all ${i === 0 ? 'bg-white w-5' : 'bg-white/50'}`} />
              ))}
            </div>
            <div className="absolute top-4 right-4">
              <RoomDetailActions roomId={room.code} roomName={room.name} />
            </div>
            <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
              1/{room.images.length} ảnh
            </div>
          </div>

          {/* Thumbnails */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {room.images.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={img} alt="" className={`w-20 h-16 object-cover rounded-xl shrink-0 cursor-pointer border-2 ${i === 0 ? 'border-primary-500' : 'border-transparent hover:border-dark-300'}`} />
            ))}
          </div>

          {/* Info */}
          <div className="card space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="badge-green mb-2">Còn trống</span>
                <h1 className="text-2xl font-bold text-dark-900 mt-1">{room.name}</h1>
                <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-2">
                  <MapPin className="w-4 h-4 text-red-400" />
                  {room.address}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-3xl font-bold text-primary-600">{(room.price / 1000000).toFixed(1)}M</p>
                <p className="text-sm text-slate-400">/tháng</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-dark-100">
              <div className="text-center">
                <p className="text-xs text-slate-400">Diện tích</p>
                <p className="font-bold text-dark-900">{room.size} m²</p>
              </div>
              <div className="text-center border-x border-dark-100">
                <p className="text-xs text-slate-400">Đặt cọc</p>
                <p className="font-bold text-dark-900">{(room.deposit / 1000000).toFixed(0)}M đ</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">Tầng</p>
                <p className="font-bold text-dark-900">{room.floor}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-dark-800 mb-2">Mô tả</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{room.description}</p>
            </div>

            {/* Amenities */}
            <div>
              <h3 className="font-semibold text-dark-800 mb-3">Tiện ích & Nội thất</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {room.amenities.map(a => (
                  <div key={a} className="flex items-center gap-2 px-3 py-2.5 bg-dark-50 rounded-xl text-sm text-dark-700 border border-dark-100">
                    <Home className="w-4 h-4 text-primary-400 shrink-0" />
                    {a}
                  </div>
                ))}
              </div>
            </div>

            {/* Utility rates */}
            <div>
              <h3 className="font-semibold text-dark-800 mb-3">Chi phí phát sinh</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-xs text-slate-400">Giá điện</p>
                    <p className="font-semibold text-dark-800">{room.electric.toLocaleString('vi-VN')} đ/kWh</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <Wifi className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-xs text-slate-400">Giá nước</p>
                    <p className="font-semibold text-dark-800">{room.water.toLocaleString('vi-VN')} đ/m³</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Map placeholder */}
          <div className="card">
            <h3 className="font-semibold text-dark-800 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" /> Vị trí trên bản đồ
            </h3>
            <div className="aspect-video bg-gradient-to-br from-blue-100 to-green-100 rounded-xl flex items-center justify-center border border-dark-100 relative overflow-hidden">
              <div className="text-center text-slate-400">
                <MapPin className="w-12 h-12 mx-auto mb-2 text-red-400" />
                <p className="font-medium text-dark-600">Bản đồ tương tác</p>
                <p className="text-sm">{room.address}</p>
                <p className="text-xs mt-1 text-slate-300">(Tích hợp Google Maps / Leaflet)</p>
              </div>
            </div>
          </div>

          {/* Reviews */}
          <div className="card">
            <h3 className="font-semibold text-dark-800 mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Đánh giá từ người thuê
            </h3>
            <div className="space-y-4">
              {room.reviews.map((r, i) => (
                <div key={i} className="p-4 bg-dark-50 rounded-xl border border-dark-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">{r.user.charAt(0)}</div>
                      <p className="font-medium text-dark-800 text-sm">{r.user}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: r.rating }).map((_, j) => (
                        <Star key={j} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{r.comment}</p>
                  <p className="text-xs text-slate-400 mt-1">{r.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: booking panel */}
        <div className="space-y-4">
          {/* Booking card */}
          <div className="card sticky top-20 space-y-4">
            <div>
              <p className="text-3xl font-bold text-primary-600">{(room.price / 1000000).toFixed(1)}M <span className="text-base font-normal text-slate-400">/tháng</span></p>
              <p className="text-sm text-slate-400">Cọc: {(room.deposit / 1000000).toFixed(0)}M đ</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <p className="text-sm text-green-700 font-medium">Phòng đang còn trống</p>
            </div>

            <Link
              href={`/dat-lich/${room.code}`}
              id="btn-book-schedule"
              className="btn btn-primary w-full justify-center text-base py-3"
            >
              <CalendarDays className="w-5 h-5" /> Đặt lịch xem phòng
            </Link>

            <Link
              href={`/dang-ky-thue/${room.code}`}
              id="btn-apply-rent"
              className="btn btn-secondary w-full justify-center text-base py-3"
            >
              <Home className="w-5 h-5" /> Đăng ký thuê ngay
            </Link>

            <div className="border-t border-dark-100 pt-4">
              <h4 className="font-semibold text-dark-800 mb-3">Chủ trọ</h4>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">{room.landlord.name.charAt(0)}</div>
                <div>
                  <p className="font-medium text-dark-800 text-sm">{room.landlord.name}</p>
                  <p className="text-xs text-slate-400">{room.landlord.totalRooms} phòng • ⭐ {room.landlord.rating}</p>
                </div>
              </div>
              <a href={`tel:${room.landlord.phone}`} id="btn-call-landlord" className="btn btn-secondary w-full justify-center text-sm">
                <Phone className="w-4 h-4" /> {room.landlord.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
