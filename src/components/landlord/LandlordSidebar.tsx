'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Home, CalendarDays,
  FileText, Receipt, Zap, Bell, LogOut, Settings, ChevronRight, PlusCircle
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { section: 'Tổng quan' },
  { href: '/landlord/dashboard', label: 'Dashboard', icon: LayoutDashboard },

  { section: 'Bất động sản' },
  { href: '/landlord/areas', label: 'Khu trọ', icon: Building2 },
  { href: '/landlord/rooms', label: 'Phòng trọ', icon: Home },
  { href: '/landlord/rooms/new', label: 'Đăng phòng mới', icon: PlusCircle },

  { section: 'Quản lý thuê' },
  { href: '/landlord/schedules', label: 'Lịch xem phòng', icon: CalendarDays },
  { href: '/landlord/contracts', label: 'Hợp đồng', icon: FileText },
  { href: '/landlord/invoices', label: 'Hóa đơn', icon: Receipt },
  { href: '/landlord/utilities', label: 'Ghi điện nước', icon: Zap },

  { section: 'Tiện ích' },
  { href: '/landlord/notifications', label: 'Thông báo', icon: Bell },
]

export default function LandlordSidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" style={{ background: 'linear-gradient(135deg,#f97316,#ef4444)' }}>C</div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">NhàTrọTop</p>
          <p className="text-slate-400 text-xs">Cổng Chủ Trọ</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, i) => {
          if ('section' in item && !item.href) {
            return <p key={i} className="sidebar-section-title">{item.section}</p>
          }
          const Icon = item.icon!
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href!} className={clsx('sidebar-link', active && 'active')}>
              <Icon className="icon" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-4 h-4 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-1">
        <Link href="/landlord/settings" className="sidebar-link">
          <Settings className="icon" />
          <span>Cài đặt</span>
        </Link>
        <button className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut className="icon" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  )
}
