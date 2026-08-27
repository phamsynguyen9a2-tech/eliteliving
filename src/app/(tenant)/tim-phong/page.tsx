'use client'
import { useState, useMemo } from 'react'
import { Search, MapPin, SlidersHorizontal, Sparkles, ChevronDown, X, BedDouble, Wifi, AirVent, WashingMachine, CarFront } from 'lucide-react'
import Link from 'next/link'
import LoginModal from '@/components/tenant/LoginModal'

// ─── Data ───────────────────────────────────────────────────────────────────
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

const DISTRICTS = ['Tất cả', 'Tân Phú', 'Bình Tân', 'Tân Bình', 'Gò Vấp', 'Quận 7', 'Quận 1']
const PRICE_RANGES = [
  { label: 'Mọi mức giá', min: 0, max: Infinity },
  { label: 'Dưới 3 triệu', min: 0, max: 3_000_000 },
  { label: '3 – 5 triệu', min: 3_000_000, max: 5_000_000 },
  { label: '5 – 8 triệu', min: 5_000_000, max: 8_000_000 },
  { label: 'Trên 8 triệu', min: 8_000_000, max: Infinity },
]
const AMENITY_ICONS: Record<string, React.ReactNode> = {
  'Wifi': <Wifi className="w-3 h-3" />,
  'Máy lạnh': <AirVent className="w-3 h-3" />,
  'Máy giặt': <WashingMachine className="w-3 h-3" />,
  'Hầm xe': <CarFront className="w-3 h-3" />,
  'Giường': <BedDouble className="w-3 h-3" />,
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function TenantSearchPage() {
  const [search, setSearch] = useState('')
  const [district, setDistrict] = useState('Tất cả')
  const [priceIdx, setPriceIdx] = useState(0)
  const [modal, setModal] = useState<{ open: boolean; roomName?: string }>({ open: false })

  const filtered = useMemo(() => {
    const { min, max } = PRICE_RANGES[priceIdx]
    return ALL_ROOMS.filter(r => {
      const matchDistrict = district === 'Tất cả' || r.district === district
      const matchPrice = r.price >= min && r.price <= max
      const matchSearch = search === '' ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.district.toLowerCase().includes(search.toLowerCase()) ||
        r.area.toLowerCase().includes(search.toLowerCase())
      return matchDistrict && matchPrice && matchSearch
    })
  }, [search, district, priceIdx])

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-[#0d4a26] via-[#1b6b3a] to-[#2d8653] text-white py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm mb-6 backdrop-blur-sm border border-white/20">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>Tìm phòng dễ dàng với AI gợi ý thông minh</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Tìm phòng trọ phù hợp<br />
            <span className="text-yellow-300">nhanh chóng &amp; tin cậy</span>
          </h1>
          <p className="text-white/70 text-lg mb-8">Hơn 500+ phòng trọ được xác thực, cập nhật thực tế tại TP.HCM</p>

          {/* Search bar */}
          <div className="bg-white rounded-2xl shadow-2xl p-3 flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="tenant-location-search"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tên phòng, quận, khu vực..."
                className="w-full pl-9 pr-4 py-2.5 text-dark-800 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d8653]/30 bg-slate-50"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="relative">
              <select
                id="tenant-price-filter"
                value={priceIdx}
                onChange={e => setPriceIdx(Number(e.target.value))}
                className="pl-4 pr-8 py-2.5 text-dark-800 text-sm rounded-xl bg-slate-50 border-0 focus:outline-none focus:ring-2 focus:ring-[#2d8653]/30 cursor-pointer appearance-none"
              >
                {PRICE_RANGES.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <button
              id="btn-search-rooms"
              onClick={() => {}}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1b6b3a] to-[#2d8653] text-white font-semibold text-sm hover:opacity-90 transition-opacity shrink-0"
            >
              <Search className="w-4 h-4" /> Tìm phòng
            </button>
          </div>
        </div>
      </section>

      {/* ── Main ── */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-dark-800">Phòng trọ đang có sẵn</h2>
            <p className="text-sm text-slate-400">
              {filtered.length} phòng phù hợp
              {district !== 'Tất cả' && <> tại <span className="text-[#1b6b3a] font-medium">{district}</span></>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {DISTRICTS.map(d => (
              <button
                key={d}
                id={`filter-district-${d}`}
                onClick={() => setDistrict(d)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all font-medium ${
                  district === d
                    ? 'border-[#2d8653] text-[#1b6b3a] bg-[#2d8653]/10'
                    : 'border-slate-200 text-slate-600 hover:border-[#2d8653]/60 hover:text-[#1b6b3a] hover:bg-[#2d8653]/5'
                }`}
              >
                {d}
              </button>
            ))}
            <button id="btn-advanced-filter" className="btn btn-secondary text-sm flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4" /> Lọc nâng cao
            </button>
          </div>
        </div>

        {/* Room grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-3xl">🏠</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">Không tìm thấy phòng phù hợp</h3>
            <p className="text-slate-400 text-sm mb-4">Thử thay đổi bộ lọc hoặc tìm kiếm với từ khoá khác</p>
            <button
              onClick={() => { setSearch(''); setDistrict('Tất cả'); setPriceIdx(0) }}
              className="px-4 py-2 rounded-xl border border-[#2d8653] text-[#1b6b3a] text-sm font-medium hover:bg-[#2d8653]/5 transition-colors"
            >
              Xoá bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(room => (
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
                    <div className="absolute top-3 right-3 badge-green">
                      {room.status === 'AVAILABLE' ? 'Còn trống' : 'Đã thuê'}
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
                    <h3 className="font-semibold text-dark-900 text-base leading-snug mb-1 hover:text-[#1b6b3a] transition-colors">
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
                    {room.amenities.length > 5 && (
                      <span className="text-xs bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full border border-slate-200">
                        +{room.amenities.length - 5}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/phong/${room.code.toLowerCase()}`}
                      id={`btn-view-room-${room.id}`}
                      className="flex-1 flex items-center justify-center py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-all"
                    >
                      Xem chi tiết
                    </Link>
                    <button
                      id={`btn-rent-room-${room.id}`}
                      onClick={() => setModal({ open: true, roomName: room.name })}
                      className="flex-1 flex items-center justify-center py-2.5 rounded-xl bg-gradient-to-r from-[#1b6b3a] to-[#2d8653] text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-sm"
                    >
                      Thuê ngay
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI suggestion banner */}
        <div className="mt-12 bg-gradient-to-r from-[#0d4a26] to-[#1b6b3a] rounded-3xl p-8 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
          <div className="relative">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-yellow-300" />
            <h2 className="text-2xl font-bold mb-2">Gợi ý phòng cá nhân hóa</h2>
            <p className="text-white/70 mb-6 max-w-xl mx-auto">
              Đăng ký và điền thông tin nhu cầu. AI sẽ gợi ý Top-K phòng phù hợp nhất với bạn theo vị trí, ngân sách và tiện ích.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => setModal({ open: true })}
                className="px-6 py-2.5 rounded-xl bg-white text-[#1b6b3a] font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Đăng ký miễn phí
              </button>
              <Link href="/goi-y" className="px-6 py-2.5 rounded-xl bg-white/10 text-white border border-white/30 font-semibold text-sm hover:bg-white/20 transition-colors">
                Xem phòng gợi ý
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Login Modal ── */}
      <LoginModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false })}
        roomName={modal.roomName}
        onSuccess={() => {
          // TODO: redirect to đặt lịch sau khi đăng nhập
          setModal({ open: false })
        }}
      />
    </div>
  )
}

