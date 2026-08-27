'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Building2, Home, CalendarDays,
  FileText, Receipt, CreditCard, Star, BarChart3, Bell, Settings,
  ChevronRight, LogOut, UserCheck
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { section: 'Tổng quan' },
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },

  { section: 'Quản lý người dùng' },
  { href: '/admin/users', label: 'Người dùng', icon: Users },
  { href: '/admin/landlords', label: 'Chủ trọ', icon: UserCheck },

  { section: 'Bất động sản' },
  { href: '/admin/areas', label: 'Khu trọ', icon: Building2 },
  { href: '/admin/rooms', label: 'Phòng trọ', icon: Home },

  { section: 'Hoạt động thuê' },
  { href: '/admin/schedules', label: 'Lịch xem phòng', icon: CalendarDays },
  { href: '/admin/contracts', label: 'Hợp đồng', icon: FileText },
  { href: '/admin/invoices', label: 'Hóa đơn', icon: Receipt },
  { href: '/admin/payments', label: 'Thanh toán', icon: CreditCard },
  { href: '/admin/reviews', label: 'Phản hồi', icon: Star },

  { section: 'Phân tích' },
  { href: '/admin/reports', label: 'Báo cáo', icon: BarChart3 },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">N</div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">NhàTrọTop</p>
          <p className="text-slate-400 text-xs">Web Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map((item, i) => {
          if ('section' in item && !item.href) {
            return (
              <p key={i} className="sidebar-section-title">{item.section}</p>
            )
          }
          const Icon = item.icon!
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={clsx('sidebar-link', active && 'active')}
            >
              <Icon className="icon" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-4 h-4 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 space-y-1">
        <Link href="/admin/settings" className="sidebar-link">
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
