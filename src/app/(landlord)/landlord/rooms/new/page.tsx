import type { Metadata } from 'next'
import { Plus, Upload, MapPin, Home, Zap, Wifi, Car, AirVent, Refrigerator, Tv2, WashingMachine } from 'lucide-react'

export const metadata: Metadata = { title: 'Đăng phòng mới' }

const amenityOptions = [
  { id: 'ac', icon: AirVent, label: 'Máy lạnh' },
  { id: 'washer', icon: WashingMachine, label: 'Máy giặt' },
  { id: 'fridge', icon: Refrigerator, label: 'Tủ lạnh' },
  { id: 'tv', icon: Tv2, label: 'Tivi' },
  { id: 'wifi', icon: Wifi, label: 'Wifi' },
  { id: 'parking', icon: Car, label: 'Hầm xe' },
  { id: 'water-heater', icon: Zap, label: 'Bình nóng lạnh' },
]

export default function LandlordNewRoomPage() {
  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Đăng phòng mới</h1>
          <p className="page-subtitle">Điền đầy đủ thông tin để đăng tin cho thuê</p>
        </div>
      </div>

      <form className="space-y-6" id="new-room-form">
        {/* Basic info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-dark-800 text-lg flex items-center gap-2">
            <Home className="w-5 h-5 text-primary-500" /> Thông tin cơ bản
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="room-code">Mã phòng</label>
              <input id="room-code" type="text" className="form-input" placeholder="VD: A101" />
            </div>
            <div>
              <label className="form-label" htmlFor="room-name">Tên phòng</label>
              <input id="room-name" type="text" className="form-input" placeholder="VD: Phòng A.101" />
            </div>
            <div>
              <label className="form-label" htmlFor="room-area-id">Thuộc khu trọ</label>
              <select id="room-area-id" className="form-select">
                <option value="">-- Chọn khu trọ --</option>
                <option value="area-1">Khu trọ Tân Phú</option>
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="room-floor">Tầng</label>
              <input id="room-floor" type="number" className="form-input" placeholder="VD: 2" min="1" />
            </div>
            <div>
              <label className="form-label" htmlFor="room-size">Diện tích (m²)</label>
              <input id="room-size" type="number" className="form-input" placeholder="VD: 28" min="10" />
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="room-description">Mô tả phòng</label>
            <textarea id="room-description" className="form-input min-h-[100px] resize-none" placeholder="Mô tả chi tiết về phòng, vị trí, đặc điểm nổi bật..." />
          </div>
        </div>

        {/* Pricing */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-dark-800 text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" /> Giá thuê & Chi phí
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="room-price">Giá thuê/tháng (đ)</label>
              <input id="room-price" type="number" className="form-input" placeholder="VD: 4500000" />
            </div>
            <div>
              <label className="form-label" htmlFor="room-deposit">Tiền đặt cọc (đ)</label>
              <input id="room-deposit" type="number" className="form-input" placeholder="VD: 9000000" />
            </div>
            <div>
              <label className="form-label" htmlFor="room-electric-rate">Giá điện (đ/kWh)</label>
              <input id="room-electric-rate" type="number" className="form-input" defaultValue={3500} />
            </div>
            <div>
              <label className="form-label" htmlFor="room-water-rate">Giá nước (đ/m³)</label>
              <input id="room-water-rate" type="number" className="form-input" defaultValue={15000} />
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-dark-800 text-lg flex items-center gap-2">
            <Wifi className="w-5 h-5 text-green-500" /> Tiện ích & Nội thất
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {amenityOptions.map(a => {
              const Icon = a.icon
              return (
                <label key={a.id} className="flex flex-col items-center gap-2 p-3 border-2 border-dark-100 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50">
                  <input type="checkbox" name="amenities" value={a.id} className="sr-only" />
                  <Icon className="w-6 h-6 text-slate-500" />
                  <span className="text-xs text-center font-medium text-dark-700">{a.label}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Images */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-dark-800 text-lg flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-500" /> Hình ảnh phòng
          </h2>
          <div className="border-2 border-dashed border-dark-200 rounded-2xl p-8 text-center hover:border-primary-400 hover:bg-primary-50/30 transition-all cursor-pointer">
            <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-dark-600 mb-1">Kéo thả hoặc nhấn để tải ảnh lên</p>
            <p className="text-xs text-slate-400">PNG, JPG, WEBP tối đa 10MB mỗi ảnh (tối đa 20 ảnh)</p>
            <input id="room-images" type="file" multiple accept="image/*" className="hidden" />
            <button type="button" className="btn btn-secondary mt-4 text-sm" onClick={() => document.getElementById('room-images')?.click()}>
              Chọn ảnh
            </button>
          </div>
        </div>

        {/* Location */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-dark-800 text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" /> Lịch xem phòng
          </h2>
          <div>
            <label className="form-label" htmlFor="room-view-times">Khung giờ có thể xem phòng</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {['7:00–9:00', '9:00–11:00', '13:00–15:00', '15:00–17:00', '17:00–19:00', 'Thoả thuận'].map(t => (
                <label key={t} className="flex items-center gap-2 p-2.5 border border-dark-200 rounded-xl cursor-pointer hover:border-primary-400 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 text-sm">
                  <input type="checkbox" name="view-times" value={t} className="accent-primary-500" />
                  {t}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pb-6">
          <button type="button" id="btn-save-draft" className="btn btn-secondary">Lưu nháp</button>
          <button type="submit" id="btn-publish-room" className="btn btn-primary">
            <Plus className="w-4 h-4" /> Đăng tin ngay
          </button>
        </div>
      </form>
    </div>
  )
}
