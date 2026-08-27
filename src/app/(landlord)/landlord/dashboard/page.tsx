import type { Metadata } from 'next'
import { Home, FileText, Receipt, Bell, TrendingUp, CalendarDays, Plus, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Dashboard Chủ trọ' }

export default function LandlordDashboardPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Xin chào, Nguyễn Văn Hùng! 👋</h1>
          <p className="page-subtitle">Hôm nay, Thứ 2 – 25/08/2026 • Bạn có 2 yêu cầu đặt lịch mới</p>
        </div>
        <Link href="/landlord/rooms/new" className="btn btn-primary">
          <Plus className="w-4 h-4" /> Đăng phòng mới
        </Link>
      </div>

      {/* Alert */}
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
        <Bell className="w-5 h-5 text-orange-500 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-orange-800">Bạn có 2 yêu cầu xem phòng đang chờ xác nhận</p>
          <p className="text-xs text-orange-600 mt-0.5">Trần Thị Mai – Phòng TP.201 (26/08) và Nguyễn Thị Hoa – Phòng TP.101 (27/08)</p>
        </div>
        <Link href="/landlord/schedules" className="btn btn-sm text-orange-600 border-orange-300 hover:bg-orange-100">Xem ngay <ArrowRight className="w-3.5 h-3.5" /></Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Tổng phòng', value: '6', sub: '3 đang trống', icon: Home, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
          { label: 'Hợp đồng HĐ', value: '3', sub: '1 sắp hết hạn', icon: FileText, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
          { label: 'Hóa đơn chưa TT', value: '2', sub: 'Tổng 9.7M đ', icon: Receipt, iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
          { label: 'Thu nhập T8', value: '17.5M', sub: '+8% vs T7', icon: TrendingUp, iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="stat-card">
              <div className={`stat-icon ${s.iconBg}`}><Icon className={`w-6 h-6 ${s.iconColor}`} /></div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                <p className="text-2xl font-bold text-dark-900 mt-0.5">{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* My rooms */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-dark-800">Phòng của tôi</h2>
            <Link href="/landlord/rooms" className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1">
              Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { code: 'TP-101', size: 28, price: 4500000, status: 'AVAILABLE', statusCls: 'badge-green', statusLabel: 'Còn trống' },
              { code: 'TP-102', size: 32, price: 5200000, status: 'OCCUPIED', statusCls: 'badge-blue', statusLabel: 'Đang thuê' },
              { code: 'TP-201', size: 28, price: 4500000, status: 'AVAILABLE', statusCls: 'badge-green', statusLabel: 'Còn trống' },
              { code: 'TP-202', size: 35, price: 5800000, status: 'SCHEDULED', statusCls: 'badge-yellow', statusLabel: 'Có lịch xem' },
            ].map(r => (
              <div key={r.code} className="flex items-center justify-between py-2.5 border-b border-dark-100 last:border-0">
                <div>
                  <p className="font-medium text-dark-800">{r.code}</p>
                  <p className="text-xs text-slate-400">{r.size}m² • {r.price.toLocaleString('vi-VN')} đ/tháng</p>
                </div>
                <span className={r.statusCls}>{r.statusLabel}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming schedules */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-dark-800">Lịch xem sắp tới</h2>
            <Link href="/landlord/schedules" className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1">
              Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { tenant: 'Trần Thị Mai', room: 'TP-201', date: '26/08', time: '09:00', status: 'pending' },
              { tenant: 'Nguyễn Thị Hoa', room: 'TP-101', date: '27/08', time: '10:30', status: 'pending' },
              { tenant: 'Lê Văn Phúc', room: 'TP-301', date: '28/08', time: '14:00', status: 'confirmed' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-dark-100 last:border-0">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex flex-col items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4 text-primary-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-dark-800 text-sm">{s.tenant}</p>
                  <p className="text-xs text-slate-400">Phòng {s.room} • {s.date} lúc {s.time}</p>
                </div>
                <span className={s.status === 'pending' ? 'badge-yellow' : 'badge-blue'}>
                  {s.status === 'pending' ? 'Chờ XN' : 'Đã XN'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
