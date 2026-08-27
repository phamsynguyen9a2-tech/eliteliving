import type { Metadata } from 'next'
import { Eye, EyeOff, Lock, Mail, Home, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Đăng nhập – NhàTrọTop' }

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-purple-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/tim-phong" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white text-2xl font-bold border border-white/30">N</div>
            <div className="text-left">
              <p className="text-white font-bold text-xl leading-tight">NhàTrọTop</p>
              <p className="text-primary-200 text-xs">Tìm phòng dễ dàng</p>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-dark-900 mb-1">Đăng nhập</h1>
          <p className="text-slate-500 text-sm mb-6">Chào mừng bạn quay lại!</p>

          <form id="login-form" className="space-y-4">
            <div>
              <label className="form-label" htmlFor="login-email">Email hoặc Số điện thoại</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="login-email" type="email" className="form-input pl-9" placeholder="email@example.com" autoComplete="email" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="form-label mb-0" htmlFor="login-password">Mật khẩu</label>
                <Link href="/quen-mat-khau" className="text-xs text-primary-600 hover:underline">Quên mật khẩu?</Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="login-password" type="password" className="form-input pl-9 pr-10" placeholder="••••••••" autoComplete="current-password" />
                <button type="button" id="toggle-password" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-dark-600">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input id="login-remember" type="checkbox" className="w-4 h-4 rounded accent-primary-600" />
              <span className="text-sm text-slate-600">Ghi nhớ đăng nhập</span>
            </label>

            <button id="btn-login" type="submit" className="btn btn-primary w-full justify-center py-3 text-base">
              Đăng nhập <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dark-100" /></div>
            <div className="relative text-center text-xs text-slate-400 bg-white px-3 mx-auto w-fit">Hoặc đăng nhập với</div>
          </div>

          {/* Portal options */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { label: 'Admin', href: '/admin/dashboard', cls: 'border-purple-200 text-purple-700 hover:bg-purple-50' },
              { label: 'Chủ trọ', href: '/landlord/dashboard', cls: 'border-orange-200 text-orange-700 hover:bg-orange-50' },
              { label: 'Người thuê', href: '/tai-khoan/dashboard', cls: 'border-blue-200 text-blue-700 hover:bg-blue-50' },
            ].map(p => (
              <Link key={p.label} href={p.href} className={`text-center py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${p.cls}`}>
                {p.label}
              </Link>
            ))}
          </div>

          <p className="text-center text-sm text-slate-500">
            Chưa có tài khoản?{' '}
            <Link href="/dang-ky" className="text-primary-600 font-semibold hover:underline">Đăng ký ngay</Link>
          </p>
        </div>

        {/* Demo note */}
        <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
          <p className="text-white/80 text-xs">
            <span className="font-semibold text-yellow-300">Demo:</span> Nhấn trực tiếp vào portal ở trên để xem giao diện không cần đăng nhập
          </p>
        </div>
      </div>
    </div>
  )
}
