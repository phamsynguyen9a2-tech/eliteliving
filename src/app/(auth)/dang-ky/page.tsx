import type { Metadata } from 'next'
import { ArrowRight, User, Home as HomeIcon } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Đăng ký – NhàTrọTop' }

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-purple-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/tim-phong" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white text-2xl font-bold border border-white/30">N</div>
            <span className="text-white font-bold text-xl">NhàTrọTop</span>
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-dark-900 mb-1">Tạo tài khoản</h1>
          <p className="text-slate-500 text-sm mb-5">Đăng ký miễn phí, tìm phòng nhanh chóng</p>

          {/* Role selection */}
          <div className="mb-5">
            <p className="form-label">Bạn đăng ký với vai trò</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 border-2 border-dark-100 rounded-xl cursor-pointer hover:border-primary-400 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 transition-all">
                <input type="radio" name="role" value="tenant" defaultChecked className="accent-primary-600" />
                <User className="w-4 h-4 text-primary-500" />
                <div>
                  <p className="text-sm font-semibold text-dark-800">Người thuê</p>
                  <p className="text-xs text-slate-400">Tìm & thuê phòng</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border-2 border-dark-100 rounded-xl cursor-pointer hover:border-orange-400 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50 transition-all">
                <input type="radio" name="role" value="landlord" className="accent-orange-600" />
                <HomeIcon className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-sm font-semibold text-dark-800">Chủ trọ</p>
                  <p className="text-xs text-slate-400">Đăng & cho thuê phòng</p>
                </div>
              </label>
            </div>
          </div>

          <form id="register-form" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label" htmlFor="reg-fullname">Họ và tên</label>
                <input id="reg-fullname" type="text" className="form-input" placeholder="Nguyễn Văn A" />
              </div>
              <div>
                <label className="form-label" htmlFor="reg-phone">Số điện thoại</label>
                <input id="reg-phone" type="tel" className="form-input" placeholder="0901234567" />
              </div>
            </div>
            <div>
              <label className="form-label" htmlFor="reg-email">Email</label>
              <input id="reg-email" type="email" className="form-input" placeholder="email@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label" htmlFor="reg-password">Mật khẩu</label>
                <input id="reg-password" type="password" className="form-input" placeholder="Tối thiểu 8 ký tự" />
              </div>
              <div>
                <label className="form-label" htmlFor="reg-confirm-password">Xác nhận mật khẩu</label>
                <input id="reg-confirm-password" type="password" className="form-input" placeholder="Nhập lại mật khẩu" />
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input id="reg-terms" type="checkbox" className="w-4 h-4 rounded mt-0.5 accent-primary-600" />
              <span className="text-sm text-slate-600">
                Tôi đồng ý với <Link href="/dieu-khoan" className="text-primary-600 hover:underline">Điều khoản sử dụng</Link> và <Link href="/chinh-sach" className="text-primary-600 hover:underline">Chính sách bảo mật</Link>
              </span>
            </label>

            <button id="btn-register" type="submit" className="btn btn-primary w-full justify-center py-3 text-base">
              Tạo tài khoản <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-4">
            Đã có tài khoản?{' '}
            <Link href="/dang-nhap" className="text-primary-600 font-semibold hover:underline">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
