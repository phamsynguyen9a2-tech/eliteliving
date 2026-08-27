import type { Metadata } from 'next'
import { CalendarDays, Clock, Info, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Đặt lịch xem phòng' }

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
]

// Simulate busy slots
const busySlots = ['09:00', '14:00', '15:30']

export default function BookSchedulePage({ params }: { params: { roomId: string } }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <Link href={`/phong/${params.roomId.toLowerCase()}`} className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Quay lại chi tiết phòng
      </Link>

      <div className="card space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary-500" /> Đặt lịch xem phòng
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Phòng: <span className="font-semibold text-dark-700">{params.roomId.toUpperCase()}</span></p>
        </div>

        {/* Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-700">Sau khi đặt lịch, chủ trọ sẽ xác nhận trong vòng 2 tiếng. Mỗi khung giờ chỉ cho phép 1 người đặt.</p>
        </div>

        <form id="book-schedule-form" className="space-y-5">
          {/* Date picker */}
          <div>
            <label className="form-label" htmlFor="schedule-date">Chọn ngày xem</label>
            <input id="schedule-date" type="date" className="form-input" min={new Date().toISOString().split('T')[0]} />
          </div>

          {/* Time slots */}
          <div>
            <label className="form-label">Chọn giờ xem</label>
            <p className="text-xs text-slate-400 mb-3">Màu xám = đã có người đặt, không thể chọn</p>
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map(t => {
                const isBusy = busySlots.includes(t)
                return (
                  <label key={t} className={`relative flex items-center justify-center p-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium
                    ${isBusy
                      ? 'border-dark-100 bg-dark-50 text-slate-300 cursor-not-allowed'
                      : 'border-dark-200 hover:border-primary-400 hover:bg-primary-50 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 has-[:checked]:text-primary-700'
                    }`}>
                    <input type="radio" name="schedule-time" value={t} disabled={isBusy} className="sr-only" />
                    <Clock className="w-3 h-3 mr-1" />{t}
                    {isBusy && <span className="absolute -top-1 -right-1 w-4 h-4 bg-dark-300 rounded-full text-white text-xs flex items-center justify-center">✕</span>}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="form-label" htmlFor="schedule-note">Ghi chú (tuỳ chọn)</label>
            <textarea id="schedule-note" className="form-input min-h-[80px] resize-none" placeholder="VD: Muốn xem cả khu trọ, hỏi về giá điện nước..." />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="schedule-name">Họ tên</label>
              <input id="schedule-name" type="text" className="form-input" placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className="form-label" htmlFor="schedule-phone">Số điện thoại</label>
              <input id="schedule-phone" type="tel" className="form-input" placeholder="0901234567" />
            </div>
          </div>

          <button type="submit" id="btn-confirm-schedule" className="btn btn-primary w-full justify-center py-3 text-base">
            <CalendarDays className="w-5 h-5" /> Xác nhận đặt lịch
          </button>
        </form>
      </div>
    </div>
  )
}
