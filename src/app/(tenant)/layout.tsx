import type { Metadata } from 'next'
import TenantHeader from '@/components/tenant/TenantHeader'
import { MapPin, Phone, Mail, Facebook } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: { template: '%s | NhàTrọTop', default: 'NhàTrọTop – Tìm phòng trọ nhanh chóng' },
}

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-dark-50">
      <TenantHeader />
      <main className="flex-1 pt-16">{children}</main>
      <footer className="bg-dark-900 text-slate-400 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-primary-500 rounded-xl flex items-center justify-center text-white font-bold">N</div>
              <span className="text-white font-bold text-lg">NhàTrọTop</span>
            </div>
            <p className="text-sm leading-relaxed">Hệ thống tìm kiếm và quản lý phòng trọ trực tuyến uy tín tại TP.HCM.</p>
            <div className="flex gap-3 mt-4">
              <a href="#" className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"><Facebook className="w-4 h-4" /></a>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Tìm phòng</h4>
            <ul className="space-y-2 text-sm">
              {['Quận Tân Phú', 'Quận Bình Tân', 'Quận Tân Bình', 'Quận Gò Vấp', 'Quận 7'].map(d => (
                <li key={d}><Link href="#" className="hover:text-white transition-colors">{d}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Dành cho chủ trọ</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/landlord/rooms/new" className="hover:text-white transition-colors">Đăng phòng</Link></li>
              <li><Link href="/landlord/dashboard" className="hover:text-white transition-colors">Quản lý phòng</Link></li>
              <li><Link href="/landlord/contracts" className="hover:text-white transition-colors">Quản lý hợp đồng</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Liên hệ</h4>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 shrink-0" />22 Tân Quý, P. Tân Sơn Nhì, Q. Tân Phú, TP.HCM</li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" />0904.080.406</li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4" />support@nhatrotop.vn</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-white/10 text-center text-xs">
          © 2026 NhàTrọTop – CNTT-KLCN111 | NHÓM: Phạm Sỹ Nguyên, Nguyễn Tuấn Anh, Võ Nguyễn Thành Đạt
        </div>
      </footer>
    </div>
  )
}
