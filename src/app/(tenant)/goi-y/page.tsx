import type { Metadata } from 'next'
import { Sparkles, MapPin, SlidersHorizontal, TrendingUp, Heart } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Phòng gợi ý cho bạn' }

const suggestedRooms = [
  { rank: 1, id: '1', code: 'TP-101', name: 'Phòng Studio Tân Phú', district: 'Tân Phú', price: 4500000, size: 28, score: 95, matchReasons: ['Gần nơi làm việc 2.3km', 'Trong ngân sách', 'Đủ tiện ích yêu cầu'], img: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80' },
  { rank: 2, id: '2', code: 'TP-201', name: 'Phòng Tân Phú Tầng 2', district: 'Tân Phú', price: 4500000, size: 28, score: 91, matchReasons: ['Gần nơi làm việc 2.8km', 'Trong ngân sách', 'Tầng cao thoáng hơn'], img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80' },
  { rank: 3, id: '3', code: 'TB-105', name: 'Studio Tân Bình Full NT', district: 'Tân Bình', price: 5500000, size: 35, score: 87, matchReasons: ['Gần nơi làm việc 3.5km', 'Rộng hơn 7m²', 'Full nội thất cao cấp'], img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80' },
  { rank: 4, id: '4', code: 'GV-201', name: 'Phòng Gò Vấp Rộng Rãi', district: 'Gò Vấp', price: 4200000, size: 30, score: 82, matchReasons: ['Giá thấp hơn ngân sách', 'Có hầm xe'], img: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80' },
]

export default function SuggestedRoomsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 rounded-full px-4 py-2 text-sm font-medium mb-4 border border-primary-100">
          <Sparkles className="w-4 h-4 text-yellow-500" />
          Gợi ý cá nhân hóa bằng AI
        </div>
        <h1 className="text-3xl font-bold text-dark-900 mb-2">Phòng phù hợp với bạn</h1>
        <p className="text-slate-500">Dựa trên vị trí nơi làm việc, ngân sách và lịch sử tìm kiếm của bạn</p>
      </div>

      {/* User preferences summary */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-dark-800 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary-500" /> Nhu cầu của bạn
          </h2>
          <Link href="/tai-khoan/cai-dat" className="text-sm text-primary-600 hover:underline">Cập nhật</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Ngân sách', value: '3–6 triệu/tháng' },
            { label: 'Nơi làm việc', value: '123 Nguyễn Văn Linh, Q.7' },
            { label: 'Khu vực ưu tiên', value: 'Tân Phú, Tân Bình' },
            { label: 'Tiện ích cần', value: 'Máy lạnh, Wifi, Máy giặt' },
          ].map(p => (
            <div key={p.label} className="bg-dark-50 rounded-xl p-3 border border-dark-100">
              <p className="text-xs text-slate-400 mb-0.5">{p.label}</p>
              <p className="text-sm font-medium text-dark-700">{p.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested rooms */}
      <div className="space-y-4">
        {suggestedRooms.map(room => (
          <div key={room.id} className="card hover:shadow-card-hover transition-shadow duration-200 group">
            <div className="flex gap-4">
              {/* Rank badge */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${room.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-orange-400' : room.rank === 2 ? 'bg-gradient-to-br from-slate-400 to-slate-500' : room.rank === 3 ? 'bg-gradient-to-br from-orange-600 to-orange-700' : 'bg-dark-200 text-dark-600'}`}>
                #{room.rank}
              </div>

              {/* Image */}
              <div className="w-28 h-24 rounded-xl overflow-hidden shrink-0 bg-dark-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={room.img} alt={room.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-dark-900">{room.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <MapPin className="w-3 h-3" />{room.district} • {room.size}m²
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary-600">{(room.price / 1000000).toFixed(1)}M</p>
                    <p className="text-xs text-slate-400">/tháng</p>
                  </div>
                </div>

                {/* Match score */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-dark-100 rounded-full h-2">
                    <div className="bg-gradient-to-r from-primary-500 to-green-500 h-2 rounded-full transition-all" style={{ width: `${room.score}%` }} />
                  </div>
                  <span className="text-xs font-bold text-primary-600 shrink-0">
                    <TrendingUp className="w-3 h-3 inline mr-0.5" />{room.score}% phù hợp
                  </span>
                </div>

                {/* Match reasons */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {room.matchReasons.map(r => (
                    <span key={r} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">✓ {r}</span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 shrink-0">
                <Link href={`/phong/${room.code.toLowerCase()}`} id={`btn-view-suggested-${room.id}`} className="btn btn-primary btn-sm text-xs">Xem phòng</Link>
                <button id={`btn-save-${room.id}`} className="btn btn-secondary btn-sm text-xs flex items-center gap-1"><Heart className="w-3 h-3" /> Lưu</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA for non-logged in */}
      <div className="mt-8 text-center p-6 bg-gradient-to-r from-primary-50 to-purple-50 rounded-2xl border border-primary-100">
        <Sparkles className="w-8 h-8 text-primary-400 mx-auto mb-2" />
        <h3 className="font-semibold text-dark-800 mb-1">Muốn gợi ý chính xác hơn?</h3>
        <p className="text-sm text-slate-500 mb-4">Đăng nhập và cập nhật hồ sơ nhu cầu để nhận gợi ý cá nhân hóa dựa trên lịch sử tìm kiếm.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/dang-nhap" className="btn btn-secondary text-sm">Đăng nhập</Link>
          <Link href="/tai-khoan/cai-dat" className="btn btn-primary text-sm">Cập nhật nhu cầu</Link>
        </div>
      </div>
    </div>
  )
}
