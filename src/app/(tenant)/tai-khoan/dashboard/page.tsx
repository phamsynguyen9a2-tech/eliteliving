import type { Metadata } from 'next'
import { CalendarDays, FileText, Receipt, Bell, User, Settings, LogOut, Home, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Tài khoản của tôi' }

export default function TenantDashboardPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      {/* Profile banner */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-500 rounded-3xl p-6 text-white mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">T</div>
          <div>
            <h1 className="text-xl font-bold">Trần Thị Mai</h1>
            <p className="text-primary-100 text-sm">mai.tran@email.com • 0901234567</p>
            <div className="flex gap-2 mt-2">
              <span className="bg-white/20 text-xs px-2.5 py-1 rounded-full border border-white/30">Người thuê</span>
              <span className="bg-green-400/20 text-xs px-2.5 py-1 rounded-full border border-green-400/30 text-green-200">Tài khoản đã xác thực</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left menu */}
        <div className="card h-fit">
          <nav className="space-y-1">
            {[
              { href: '/tai-khoan/dashboard', icon: Home, label: 'Tổng quan', active: true },
              { href: '/tai-khoan/lich-xem', icon: CalendarDays, label: 'Lịch xem phòng' },
              { href: '/tai-khoan/hop-dong', icon: FileText, label: 'Hợp đồng' },
              { href: '/tai-khoan/hoa-don', icon: Receipt, label: 'Hóa đơn' },
              { href: '/tai-khoan/thong-bao', icon: Bell, label: 'Thông báo' },
              { href: '/tai-khoan/cai-dat', icon: Settings, label: 'Cài đặt tài khoản' },
            ].map(item => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${item.active ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'text-dark-600 hover:bg-dark-50'}`}>
                  <Icon className="w-4 h-4" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                </Link>
              )
            })}
            <hr className="border-dark-100 my-2" />
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 w-full">
              <LogOut className="w-4 h-4" /><span>Đăng xuất</span>
            </button>
          </nav>
        </div>

        {/* Right: content */}
        <div className="xl:col-span-2 space-y-5">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Lịch xem', value: '2', cls: 'badge-yellow', sub: 'chờ xác nhận' },
              { label: 'Hợp đồng', value: '1', cls: 'badge-blue', sub: 'đang hiệu lực' },
              { label: 'Hóa đơn', value: '1', cls: 'badge-orange', sub: 'chưa thanh toán' },
            ].map(s => (
              <div key={s.label} className="card text-center py-4">
                <p className="text-3xl font-bold text-dark-900 mb-1">{s.value}</p>
                <p className="text-sm font-medium text-dark-600">{s.label}</p>
                <p className="text-xs text-slate-400">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Current contract */}
          <div className="card">
            <h2 className="font-semibold text-dark-800 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary-500" /> Hợp đồng hiện tại
            </h2>
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-dark-800">Phòng TP-102 – Khu trọ Tân Phú</p>
                  <p className="text-sm text-slate-500">22 Tân Quý, Tân Sơn Nhì, Tân Phú, TP.HCM</p>
                </div>
                <span className="badge-blue">Đang thuê</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-slate-400 text-xs">Ngày bắt đầu</p><p className="font-medium">01/06/2026</p></div>
                <div><p className="text-slate-400 text-xs">Ngày kết thúc</p><p className="font-medium">31/05/2027</p></div>
                <div><p className="text-slate-400 text-xs">Tiền thuê</p><p className="font-medium text-primary-600">5.2M/tháng</p></div>
              </div>
            </div>
          </div>

          {/* Upcoming events */}
          <div className="card">
            <h2 className="font-semibold text-dark-800 mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-500" /> Thông báo gần đây
            </h2>
            <div className="space-y-3">
              {[
                { icon: Receipt, color: 'text-orange-500 bg-orange-50', msg: 'Hóa đơn tháng 8 đã được lập: 6.8M đ', time: '2 giờ trước', urgent: true },
                { icon: CalendarDays, color: 'text-blue-500 bg-blue-50', msg: 'Lịch xem Phòng TP-201 đã được xác nhận: 26/08 lúc 09:00', time: '1 ngày trước', urgent: false },
                { icon: FileText, color: 'text-green-500 bg-green-50', msg: 'Hợp đồng HĐ-2026-089 sẽ hết hạn sau 30 ngày', time: '3 ngày trước', urgent: false },
              ].map((n, i) => {
                const Icon = n.icon
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${n.urgent ? 'bg-orange-50 border-orange-200' : 'bg-dark-50 border-dark-100'}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${n.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-dark-700">{n.msg}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
