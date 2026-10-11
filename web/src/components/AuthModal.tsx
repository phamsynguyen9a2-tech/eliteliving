'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  RotateCcw,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

export default function AuthModal({
  isOpen,
  onClose,
  defaultTab = 'login',
}: AuthModalProps) {
  const router = useRouter();

  // Tab: 'login' | 'register'
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultTab);

  // Form Đăng nhập
  const [loginIdentifier, setLoginIdentifier] = useState('nguyen.pham.huit@gmail.com');
  const [loginPassword, setLoginPassword] = useState('123456');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Form Đăng ký
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Trạng thái xử lý
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Đồng bộ tab khi defaultTab thay đổi
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, defaultTab]);

  // Đóng bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 1. Xử lý ĐĂNG NHẬP (Email / Số điện thoại + Mật khẩu)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!loginIdentifier.trim()) {
      setErrorMsg('Vui lòng nhập Email hoặc Số điện thoại.');
      return;
    }
    if (!loginPassword) {
      setErrorMsg('Vui lòng nhập mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const res = await signIn('credentials', {
        redirect: false,
        loginType: 'TENANT_PASSWORD',
        email: loginIdentifier.trim(),
        password: loginPassword,
      });

      if (res?.error) {
        setErrorMsg(res.error);
        setLoading(false);
      } else {
        // Query user session to check role for role-based portal routing
        try {
          const sessRes = await fetch('/api/auth/session');
          const sess = await sessRes.json();
          const userRole = sess?.user?.role;

          if (userRole === 'ADMIN') {
            localStorage.setItem('elite_auth_user', JSON.stringify(sess.user));
            document.cookie = `elite_role=ADMIN; path=/; max-age=86400; SameSite=Lax`;
            setSuccessMsg('Đăng nhập Quản trị viên thành công! Đang chuyển hướng vào Web Admin...');
            setTimeout(() => {
              window.location.href = '/admin';
            }, 500);
            return;
          }

          if (userRole === 'LANDLORD') {
            localStorage.setItem('elite_auth_user', JSON.stringify(sess.user));
            document.cookie = `elite_role=LANDLORD; path=/; max-age=86400; SameSite=Lax`;
            setSuccessMsg('Đăng nhập Chủ trọ thành công! Đang chuyển hướng vào Cổng Chủ trọ...');
            setTimeout(() => {
              window.location.href = '/chu-tro';
            }, 500);
            return;
          }
        } catch {
          // Fall through to normal tenant refresh
        }

        setSuccessMsg('Đăng nhập thành công! Chào mừng bạn trở lại.');
        setTimeout(() => {
          onClose();
          router.refresh();
        }, 600);
      }
    } catch {
      setErrorMsg('Không thể kết nối đến máy chủ xác thực.');
      setLoading(false);
    }
  };

  // 2. Xử lý ĐĂNG KÝ
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regName.trim()) {
      setErrorMsg('Vui lòng nhập Họ và tên.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ Email hợp lệ.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMsg('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
      return;
    }

    setLoading(true);
    try {
      const res = await signIn('credentials', {
        redirect: false,
        loginType: 'TENANT_REGISTER',
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        password: regPassword,
      });

      if (res?.error) {
        setErrorMsg(res.error);
        setLoading(false);
      } else {
        setSuccessMsg('Đăng ký tài khoản thành công! Đang kích hoạt phiên làm việc...');
        setTimeout(() => {
          onClose();
          router.refresh();
        }, 700);
      }
    } catch {
      setErrorMsg('Đã có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại.');
      setLoading(false);
    }
  };

  // 3. Xử lý ĐĂNG NHẬP / ĐĂNG KÝ VỚI GOOGLE (Tức thì, không bị đơ spinner)
  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Khi ở tab Đăng ký: nếu người dùng đã điền email/tên/sđt riêng thì ưu tiên dùng, không gán SĐT tĩnh của tài khoản khác
      const safeGoogleEmail =
        activeTab === 'register' && regEmail.trim()
          ? regEmail.trim().toLowerCase()
          : activeTab === 'register' && regName.trim()
          ? `${regName.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'}.${Date.now().toString().slice(-4)}@gmail.com`
          : 'nguyen.pham.huit@gmail.com';

      const safeGoogleName =
        activeTab === 'register' && regName.trim()
          ? regName.trim()
          : 'Phạm Sỹ Nguyên (Google)';

      const safeGooglePhone =
        activeTab === 'register' && regPhone.trim()
          ? regPhone.trim()
          : '';

      const res = await signIn('credentials', {
        redirect: false,
        loginType: 'GOOGLE_DEMO',
        email: safeGoogleEmail,
        name: safeGoogleName,
        phone: safeGooglePhone,
      });

      if (res?.error) {
        setErrorMsg(res.error);
        setGoogleLoading(false);
      } else {
        setSuccessMsg('Xác thực Google thành công!');
        setTimeout(() => {
          onClose();
          router.refresh();
        }, 600);
      }
    } catch {
      setErrorMsg('Không thể kết nối đến tài khoản Google.');
      setGoogleLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0F223A]/45 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
    >
      <div className="relative w-full max-w-[440px] my-auto bg-white rounded-[28px] border border-[#E5E3DE] shadow-[0_20px_60px_-15px_rgba(15,34,58,0.25)] p-6 sm:p-7 animate-in zoom-in-95 duration-200">
        
        {/* Nút Đóng Modal */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer z-10"
          aria-label="Đóng cửa sổ"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header — Đúng Emblem & Màu chủ đạo Elite Living (Vàng Champagne & Navy) */}
        <div className="text-center mb-5">
          <div className="relative inline-flex items-center justify-center w-14 h-16 mb-1.5">
            {/* SVG Shield Silhouette */}
            <svg
              viewBox="0 0 64 100"
              className="absolute inset-0 w-full h-full text-white fill-current filter drop-shadow-[0_4px_8px_rgba(15,34,58,0.15)]"
              preserveAspectRatio="none"
            >
              <path d="M 4 0 H 60 V 75 L 64 77 L 32 99 L 0 77 L 4 75 Z" />
            </svg>
            <img
              src="/logo-icon-transparent.png"
              alt="Elite Living Emblem"
              className="relative z-10 w-9 h-auto object-contain drop-shadow-xs"
            />
          </div>
          <h2 className="text-xl font-black text-[#0F223A] tracking-[0.06em] uppercase leading-none font-sans">
            ELITE LIVING
          </h2>
          <p className="text-[10px] font-bold text-[#B89C66] tracking-[0.2em] uppercase mt-1.5 font-sans">
            HỆ THỐNG PHÒNG TRỌ CHO THUÊ
          </p>
        </div>

        {/* TAB SWITCHER PILL (Màu chủ đạo Elite Gold #B89C66) */}
        <div className="bg-[#F1F3F5] rounded-2xl p-1.5 grid grid-cols-2 gap-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 rounded-xl text-[14.5px] font-bold transition-all text-center cursor-pointer ${
              activeTab === 'login'
                ? 'bg-white text-[#B89C66] shadow-sm'
                : 'text-[#64748B] hover:text-[#0F223A]'
            }`}
          >
            Đăng nhập
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 rounded-xl text-[14.5px] font-bold transition-all text-center cursor-pointer ${
              activeTab === 'register'
                ? 'bg-white text-[#B89C66] shadow-sm'
                : 'text-[#64748B] hover:text-[#0F223A]'
            }`}
          >
            Đăng ký
          </button>
        </div>

        {/* Thông báo Lỗi / Thành công */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start gap-2 text-xs text-rose-700 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-[#FAF7F2] border border-[#B89C66]/40 rounded-xl flex items-start gap-2 text-xs text-[#8C6D37] animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-[#B89C66] shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{successMsg}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 1: FORM ĐĂNG NHẬP (Màu chủ đạo #B89C66) */}
        {/* ======================================================== */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            {/* Field: Email / SĐT */}
            <div>
              <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                Email *
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4.5 h-4.5 text-[#9CA3AF] pointer-events-none" />
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[14px] text-[#0F223A] placeholder-[#9CA3AF] focus:border-[#B89C66] focus:ring-4 focus:ring-[#B89C66]/15 transition-all outline-none"
                />
              </div>
            </div>

            {/* Field: Mật khẩu */}
            <div>
              <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                Mật khẩu *
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4.5 h-4.5 text-[#B89C66] pointer-events-none" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#B89C66] ring-2 ring-[#B89C66]/15 rounded-xl text-[14px] text-[#0F223A] placeholder-[#9CA3AF] focus:border-[#B89C66] focus:ring-4 focus:ring-[#B89C66]/20 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 text-[#9CA3AF] hover:text-[#0F223A] transition-colors p-1"
                  title={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showLoginPassword ? (
                    <EyeOff className="w-4.5 h-4.5" />
                  ) : (
                    <Eye className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Nút Đăng nhập Màu Vàng Đồng #B89C66 */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3 px-4 bg-[#B89C66] hover:bg-[#A38752] text-white font-bold text-[15px] rounded-2xl shadow-lg shadow-[#B89C66]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99] mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập</span>
                  <span className="w-5.5 h-5.5 rounded-full bg-white/20 flex items-center justify-center">
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  </span>
                </>
              )}
            </button>

            {/* Divider: hoặc tiếp tục với */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E5E7EB]"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-[#9CA3AF] font-medium">
                  hoặc tiếp tục với
                </span>
              </div>
            </div>

            {/* Nút Tiếp tục với Google */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading || googleLoading}
              className="w-full py-2.5 px-4 bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] hover:border-[#D1D5DB] rounded-2xl flex items-center justify-center gap-2.5 text-[14px] font-semibold text-[#1F2937] transition-all shadow-xs cursor-pointer disabled:opacity-60 active:scale-[0.99]"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#6B7280]" />
              ) : (
                <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{googleLoading ? 'Đang kết nối...' : 'Tiếp tục với Google'}</span>
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* TAB 2: FORM ĐĂNG KÝ (Màu chủ đạo #B89C66) */}
        {/* ======================================================== */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            {/* Field: Họ và tên * */}
            <div>
              <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                Họ và tên *
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 w-4.5 h-4.5 text-[#9CA3AF] pointer-events-none" />
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[14px] text-[#0F223A] placeholder-[#9CA3AF] focus:border-[#B89C66] focus:ring-4 focus:ring-[#B89C66]/15 transition-all outline-none"
                />
              </div>
            </div>

            {/* Field: Số điện thoại */}
            <div>
              <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                Số điện thoại
              </label>
              <div className="relative flex items-center">
                <Phone className="absolute left-3.5 w-4.5 h-4.5 text-[#9CA3AF] pointer-events-none" />
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="0901234567"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[14px] text-[#0F223A] placeholder-[#9CA3AF] focus:border-[#B89C66] focus:ring-4 focus:ring-[#B89C66]/15 transition-all outline-none"
                />
              </div>
            </div>

            {/* Field: Email * */}
            <div>
              <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                Email *
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4.5 h-4.5 text-[#9CA3AF] pointer-events-none" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="pmtanphu@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[14px] text-[#0F223A] placeholder-[#9CA3AF] focus:border-[#B89C66] focus:ring-4 focus:ring-[#B89C66]/15 transition-all outline-none"
                />
              </div>
            </div>

            {/* Field: Mật khẩu * */}
            <div>
              <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                Mật khẩu *
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4.5 h-4.5 text-[#9CA3AF] pointer-events-none" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[14px] text-[#0F223A] placeholder-[#9CA3AF] focus:border-[#B89C66] focus:ring-4 focus:ring-[#B89C66]/15 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 text-[#9CA3AF] hover:text-[#0F223A] transition-colors p-1"
                  title={showRegPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showRegPassword ? (
                    <EyeOff className="w-4.5 h-4.5" />
                  ) : (
                    <Eye className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Field: Xác nhận mật khẩu * */}
            <div>
              <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                Xác nhận mật khẩu *
              </label>
              <div className="relative flex items-center">
                <RotateCcw className="absolute left-3.5 w-4.5 h-4.5 text-[#9CA3AF] pointer-events-none" />
                <input
                  type={showRegConfirmPassword ? 'text' : 'password'}
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[14px] text-[#0F223A] placeholder-[#9CA3AF] focus:border-[#B89C66] focus:ring-4 focus:ring-[#B89C66]/15 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                  className="absolute right-3 text-[#9CA3AF] hover:text-[#0F223A] transition-colors p-1"
                  title={showRegConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showRegConfirmPassword ? (
                    <EyeOff className="w-4.5 h-4.5" />
                  ) : (
                    <Eye className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Nút Tạo tài khoản Màu Vàng Đồng #B89C66 */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3 px-4 bg-[#B89C66] hover:bg-[#A38752] text-white font-bold text-[15px] rounded-2xl shadow-lg shadow-[#B89C66]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99] mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang khởi tạo...</span>
                </>
              ) : (
                <>
                  <span>Tạo tài khoản</span>
                  <span className="w-5.5 h-5.5 rounded-full bg-white/20 flex items-center justify-center">
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  </span>
                </>
              )}
            </button>

            {/* Divider: hoặc tiếp tục với */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E5E7EB]"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-[#9CA3AF] font-medium">
                  hoặc tiếp tục với
                </span>
              </div>
            </div>

            {/* Nút Đăng ký với Google */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading || googleLoading}
              className="w-full py-2.5 px-4 bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] hover:border-[#D1D5DB] rounded-2xl flex items-center justify-center gap-2.5 text-[14px] font-semibold text-[#1F2937] transition-all shadow-xs cursor-pointer disabled:opacity-60 active:scale-[0.99]"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#6B7280]" />
              ) : (
                <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{googleLoading ? 'Đang kết nối...' : 'Đăng ký với Google'}</span>
            </button>
          </form>
        )}

        {/* Footer riêng cho Chủ trọ & Quản trị viên */}
        <div className="mt-5 pt-3.5 border-t border-[#F1F3F5] text-center">
          <p className="text-[11.5px] text-[#64748B]">
            Dành cho Chủ trọ & Quản trị viên:{' '}
            <Link
              href="/portal/login"
              onClick={onClose}
              className="font-bold text-[#B89C66] hover:text-[#0F223A] hover:underline inline-flex items-center gap-0.5"
            >
              Cổng vận hành nội bộ
              <ArrowRight className="w-3 h-3 inline" />
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
