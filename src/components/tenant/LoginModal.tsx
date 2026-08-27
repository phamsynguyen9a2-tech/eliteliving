'use client'
import { useState, useEffect } from 'react'
import { X, Mail, Lock, Eye, EyeOff, User, Phone, ArrowRight } from 'lucide-react'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  roomName?: string
  onSuccess?: () => void
}

export default function LoginModal({ isOpen, onClose, roomName, onSuccess }: LoginModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-[420px] bg-white rounded-3xl shadow-2xl overflow-hidden animate-modal-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Green header */}
        <div className="bg-gradient-to-br from-[#1b6b3a] via-[#2d8653] to-[#34a05f] px-6 pt-8 pb-10 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-2xl font-bold text-white mb-1">Chào mừng trở lại!</h2>
          <p className="text-white/80 text-sm leading-relaxed">
            Đăng nhập để tìm phòng &amp; đặt lịch xem phòng<br />nhanh chóng
          </p>
          {roomName && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5 text-white/90 text-xs">
              🏠 Đặt lịch xem: <span className="font-semibold ml-1">{roomName}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-6 pt-0 pb-6 -mt-4">
          {/* Tab switcher */}
          <div className="bg-slate-100 rounded-2xl p-1 flex gap-1 mb-5">
            <button
              id="modal-tab-login"
              onClick={() => setTab('login')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                tab === 'login'
                  ? 'bg-white text-[#1b6b3a] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Đăng nhập
            </button>
            <button
              id="modal-tab-register"
              onClick={() => setTab('register')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                tab === 'register'
                  ? 'bg-white text-[#1b6b3a] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Đăng ký
            </button>
          </div>

          {tab === 'login' ? (
            <form
              id="modal-login-form"
              onSubmit={e => { e.preventDefault(); onSuccess?.(); onClose() }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="modal-email">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="modal-email"
                    type="email"
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2d8653]/30 focus:border-[#2d8653] transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="modal-password">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="modal-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2d8653]/30 focus:border-[#2d8653] transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="modal-btn-login"
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-[#1b6b3a] to-[#2d8653] text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-md"
              >
                Đăng nhập <ArrowRight className="w-4 h-4" />
              </button>

              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative text-center text-xs text-slate-400 bg-white px-3 mx-auto w-fit">
                  hoặc tiếp tục với
                </div>
              </div>

              <button
                id="modal-btn-google"
                type="button"
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Tiếp tục với Google
              </button>
            </form>
          ) : (
            <form
              id="modal-register-form"
              onSubmit={e => { e.preventDefault(); onSuccess?.(); onClose() }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="modal-name">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="modal-name"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2d8653]/30 focus:border-[#2d8653] transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="modal-phone">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="modal-phone"
                    type="tel"
                    placeholder="09xxxxxxxx"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2d8653]/30 focus:border-[#2d8653] transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="modal-reg-email">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="modal-reg-email"
                    type="email"
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2d8653]/30 focus:border-[#2d8653] transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="modal-reg-password">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="modal-reg-password"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2d8653]/30 focus:border-[#2d8653] transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="modal-btn-register"
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-[#1b6b3a] to-[#2d8653] text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-md"
              >
                Tạo tài khoản <ArrowRight className="w-4 h-4" />
              </button>

              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative text-center text-xs text-slate-400 bg-white px-3 mx-auto w-fit">
                  hoặc tiếp tục với
                </div>
              </div>

              <button
                id="modal-btn-google-register"
                type="button"
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Tiếp tục với Google
              </button>
            </form>
          )}

          <p className="text-center text-xs text-slate-500 mt-4">
            {tab === 'login' ? (
              <>Chưa có tài khoản?{' '}
                <button onClick={() => setTab('register')} className="text-[#1b6b3a] font-semibold hover:underline">
                  Đăng ký ngay
                </button>
              </>
            ) : (
              <>Đã có tài khoản?{' '}
                <button onClick={() => setTab('login')} className="text-[#1b6b3a] font-semibold hover:underline">
                  Đăng nhập
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-in {
          animation: modal-in 0.22s cubic-bezier(0.34,1.56,0.64,1) both;
        }
      `}</style>
    </div>
  )
}
