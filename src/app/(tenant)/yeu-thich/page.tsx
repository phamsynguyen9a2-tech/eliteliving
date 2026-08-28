'use client'
import { useFavorites } from '@/hooks/useFavorites'
import { Heart, MapPin, Trash2, Search, AirVent, Wifi, WashingMachine, CarFront, BedDouble } from 'lucide-react'
import Link from 'next/link'
import FavoriteButton from '@/components/tenant/FavoriteButton'

// Dữ liệu mẫu – giống tim-phong/page.tsx, thực tế sẽ fetch từ API
const ALL_ROOMS = [
  { id: '1', code: 'TP-101', name: 'Phòng Studio Tân Phú', area: 'Khu trọ Tân Phú', district: 'Tân Phú', price: 4500000, size: 28, status: 'AVAILABLE', amenities: ['Máy lạnh', 'Wifi', 'Máy giặt', 'Tủ lạnh'], img: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=80', featured: false },
  { id: '2', code: 'TP-301', name: 'Phòng Cao Cấp Tân Phú', area: 'Khu trọ Tân Phú', district: 'Tân Phú', price: 6500000, size: 40, status: 'AVAILABLE', amenities: ['Máy lạnh', 'Wifi', 'Máy giặt', 'Tủ lạnh', 'Sofa', 'Tivi'], img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80', featured: true },
  { id: '3', code: 'BT-203', name: 'Phòng Bình Tân Giá Rẻ', area: 'Khu trọ Bình Tân', district: 'Bình Tân', price: 3200000, size: 22, status: 'AVAILABLE', amenities: ['Máy lạnh', 'Wifi'], img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80', featured: false },
  { id: '4', code: 'TB-105', name: 'Studio Full Nội Thất Tân Bình', area: 'Khu trọ Tân Bình', district: 'Tân Bình', price: 5500000, size: 35, status: 'AVAILABLE', amenities: ['Máy lạnh', 'Wifi', 'Máy giặt', 'Tủ lạnh', 'Giường'], img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80', featured: true },
  { id: '5', code: 'GV-201', name: 'Phòng Gò Vấp Rộng Rãi', area: 'Khu trọ Gò Vấp', district: 'Gò Vấp', price: 4200000, size: 30, status: 'AVAILABLE', amenities: ['Máy lạnh', 'Wifi', 'Hầm xe'], img: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80', featured: false },
  { id: '6', code: 'Q7-301', name: 'Căn Hộ Quận 7 Sang Trọng', area: 'Khu căn hộ Quận 7', district: 'Quận 7', price: 8500000, size: 55, status: 'AVAILABLE', amenities: ['Máy lạnh', 'Wifi', 'Máy giặt', 'Tủ lạnh', 'Tivi', 'Sofa', 'Hầm xe'], img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80', featured: true },
  { id: '7', code: 'Q1-401', name: 'Studio Quận 1 Trung Tâm', area: 'Trung tâm Quận 1', district: 'Quận 1', price: 9500000, size: 45, status: 'AVAILABLE', amenities: ['Máy lạnh', 'Wifi', 'Máy giặt', 'Hầm xe', 'Tivi'], img: 'https://images.unsplash.com/photo-1501183638710-841dd1904471?w=600&q=80', featured: true },
  { id: '8', code: 'BT-302', name: 'Phòng Bình Tân View Đẹp', area: 'Khu trọ Bình Tân', district: 'Bình Tân', price: 2800000, size: 20, status: 'AVAILABLE', amenities: ['Wifi'], img: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=600&q=80', featured: false },
  { id: '9', code: 'GV-102', name: 'Phòng Gò Vấp Tiện Nghi', area: 'Khu trọ Gò Vấp', district: 'Gò Vấp', price: 3800000, size: 25, status: 'AVAILABLE', amenities: ['Máy lạnh', 'Wifi', 'Giường'], img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80', featured: false },
]

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  'Wifi': <Wifi className="w-3 h-3" />,
  'Máy lạnh': <AirVent className="w-3 h-3" />,
  'Máy giặt': <WashingMachine className="w-3 h-3" />,
  'Hầm xe': <CarFront className="w-3 h-3" />,
  'Giường': <BedDouble className="w-3 h-3" />,
}

export default function FavoritesPage() {
  const { favorites, clearAll } = useFavorites()

  const favoriteRooms = ALL_ROOMS.filter(r => favorites.includes(r.id))

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#0d4a26] via-[#1b6b3a] to-[#2d8653] text-white py-12 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm mb-4 backdrop-blur-sm border border-white/20">
            <Heart className="w-4 h-4 text-red-300 fill-red-300" />
            <span>Phòng đã lưu của bạn</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Danh sách <span className="text-red-300">Yêu thích</span>
          </h1>
          <p className="text-white/70">
            {favoriteRooms.length > 0
              ? `Bạn đang lưu ${favoriteRooms.length} phòng trọ`
              : 'Chưa có phòng nào được lưu'}
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {favoriteRooms.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-red-50 border-2 border-red-100 rounded-3xl flex items-center justify-center mb-5">
              <Heart className="w-10 h-10 text-red-300" />
            </div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">Chưa có phòng yêu thích</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-xs">
              Bấm vào icon ❤️ trên bất kỳ phòng nào để lưu vào đây. Không cần đăng nhập!
            </p>
            <Link
              href="/tim-phong"
              id="btn-go-search"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1b6b3a] to-[#2d8653] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <Search className="w-4 h-4" /> Tìm phòng ngay
            </Link>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-semibold text-slate-800">
                  {favoriteRooms.length} phòng đã lưu
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Dữ liệu được lưu trên thiết bị này</p>
              </div>
              <button
                id="btn-clear-favorites"
                onClick={clearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xoá tất cả
              </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {favoriteRooms.map(room => (
                <div key={room.id} className="room-card group flex flex-col">
                  {/* Image */}
                  <Link href={`/phong/${room.code.toLowerCase()}`} className="block">
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={room.img}
                        alt={room.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {room.featured && (
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                          ⭐ Nổi bật
                        </div>
                      )}
                      {/* Favorite button */}
                      <div className="absolute top-3 right-3">
                        <FavoriteButton roomId={room.id} roomName={room.name} variant="overlay" />
                      </div>
                      {/* Price overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                        <span className="text-white font-bold text-lg">{(room.price / 1_000_000).toFixed(1)}M</span>
                        <span className="text-white/70 text-xs">/tháng</span>
                      </div>
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="p-4 flex-1 flex flex-col">
                    <Link href={`/phong/${room.code.toLowerCase()}`}>
                      <h3 className="font-semibold text-slate-900 text-base leading-snug mb-1 hover:text-[#1b6b3a] transition-colors">
                        {room.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{room.district} • {room.size}m²</span>
                    </div>

                    {/* Amenities */}
                    <div className="flex flex-wrap gap-1.5 mb-4 flex-1">
                      {room.amenities.slice(0, 5).map(a => (
                        <span key={a} className="inline-flex items-center gap-1 text-xs bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                          {AMENITY_ICONS[a] ?? null}
                          {a}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/phong/${room.code.toLowerCase()}`}
                        id={`btn-view-fav-room-${room.id}`}
                        className="flex-1 flex items-center justify-center py-2.5 rounded-xl bg-gradient-to-r from-[#1b6b3a] to-[#2d8653] text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-sm"
                      >
                        Xem chi tiết
                      </Link>
                      <FavoriteButton roomId={room.id} roomName={room.name} variant="inline" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="mt-10 text-center">
              <Link
                href="/tim-phong"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[#2d8653] text-[#1b6b3a] font-semibold text-sm hover:bg-[#2d8653]/5 transition-colors"
              >
                <Search className="w-4 h-4" /> Tiếp tục tìm phòng
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
