import type { Metadata } from 'next'
import LandlordSidebar from '@/components/landlord/LandlordSidebar'
import { Bell, Search } from 'lucide-react'

export const metadata: Metadata = { title: { template: '%s | Chủ trọ – NhàTrọTop', default: 'Cổng Chủ Trọ' } }

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-layout">
      <LandlordSidebar />
      <div className="main-content">
        <header className="topbar">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="landlord-search" type="text" placeholder="Tìm phòng, hợp đồng..." className="form-input pl-9 w-64 text-sm" />
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-icon btn-secondary relative" title="Thông báo">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-white text-xs flex items-center justify-center font-bold">2</span>
            </button>
            <div className="flex items-center gap-2.5 cursor-pointer">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg,#f97316,#ef4444)' }}>H</div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-dark-800 leading-tight">Nguyễn Văn Hùng</p>
                <p className="text-xs text-slate-400">Chủ trọ</p>
              </div>
            </div>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  )
}
