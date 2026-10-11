'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Menu, X, Phone, User, KeyRound, Building2, Shield, Sparkles, LogIn, LogOut, ChevronDown, CheckCircle2, AlertTriangle, Users, Bell } from 'lucide-react';
import PhoneVerificationModal from '@/components/PhoneVerificationModal';
import AuthModal from '@/components/AuthModal';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [verifyPhoneModalOpen, setVerifyPhoneModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lắng nghe sự kiện mở modal từ mọi nơi trên website & kiểm tra query URL ?auth=
  useEffect(() => {
    const handleOpenAuth = (e: any) => {
      const tab = e?.detail?.tab || 'login';
      setAuthModalTab(tab);
      setAuthModalOpen(true);
    };
    window.addEventListener('open-auth-modal', handleOpenAuth);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const authQuery = params.get('auth');
      if (authQuery === 'login' || authQuery === 'register') {
        setAuthModalTab(authQuery);
        setAuthModalOpen(true);
      }
    }

    return () => window.removeEventListener('open-auth-modal', handleOpenAuth);
  }, []);

  // Smooth scroll helper for hash links
  const handleHashClick = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    if (pathname === '/') {
      e.preventDefault();
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      <header 
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-[#F8F8F6]/95 backdrop-blur-md shadow-md border-b border-[#E5E3DE]/90' 
            : 'bg-[#F8F8F6] shadow-xs border-b border-[#E5E3DE]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            className={`flex items-center justify-between transition-all duration-300 ${
              isScrolled ? 'h-16 sm:h-[68px]' : 'h-20 sm:h-[84px]'
            }`}
          >
            {/* BRAND LOGO & EMBLEM TAB */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-3.5 group py-1">
                {/* Hanging Shield Badge Container with scroll-shrink animation */}
                <div 
                  className={`relative flex-shrink-0 z-20 transition-all duration-300 ease-out origin-top ${
                    isScrolled 
                      ? 'mb-0 -translate-y-0.5' 
                      : '-mb-7 sm:-mb-9 translate-y-0'
                  }`}
                >
                  <div 
                    className={`relative flex items-center justify-center transition-all duration-300 ease-out ${
                      isScrolled 
                        ? 'w-10 sm:w-12 h-14 sm:h-16 pt-1' 
                        : 'w-13 sm:w-16 h-24 sm:h-28 pt-1.5 sm:pt-2'
                    }`}
                  >
                    {/* SVG Shield Tab Silhouette */}
                    <svg
                      viewBox="0 0 64 100"
                      className="absolute inset-0 w-full h-full text-white fill-current filter drop-shadow-[0_4px_6px_rgba(15,34,58,0.12)] transition-all duration-300"
                      preserveAspectRatio="none"
                    >
                      <path d="M 4 0 H 60 V 75 L 64 77 L 32 99 L 0 77 L 4 75 Z" />
                    </svg>

                    {/* Logo Key Emblem Icon */}
                    <img
                      src="/logo-icon-transparent.png"
                      alt="Elite Living Emblem"
                      className={`relative z-10 h-auto object-contain transition-all duration-300 group-hover:scale-105 drop-shadow-xs ${
                        isScrolled ? 'w-6 sm:w-8' : 'w-9 sm:w-11'
                      }`}
                    />
                  </div>
                </div>

                {/* Brand Titles */}
                <div className="flex flex-col justify-center select-none pl-1 transition-all duration-300">
                  <span 
                    className={`font-black tracking-[0.06em] text-[#0F223A] font-sans leading-none transition-all duration-300 ${
                      isScrolled ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
                    }`}
                  >
                    ELITE LIVING
                  </span>
                  <span 
                    className={`font-semibold tracking-[0.2em] text-[#B89C66] uppercase mt-1 leading-none transition-all duration-300 ${
                      isScrolled ? 'text-[8px] sm:text-[9.5px]' : 'text-[9.5px] sm:text-[11px]'
                    }`}
                  >
                    HỆ THỐNG PHÒNG TRỌ CHO THUÊ
                  </span>
                </div>
              </Link>
            </div>

            {/* DESKTOP NAVIGATION MENU (PIPE SEPARATED) */}
            <nav className="hidden lg:flex items-center gap-2.5 xl:gap-3.5 text-xs xl:text-[13px] font-bold uppercase tracking-wider text-[#0F223A]">
              <Link
                href="/"
                className={`transition-colors hover:text-[#B89C66] py-1 ${
                  pathname === '/' ? 'text-[#B89C66]' : ''
                }`}
              >
                TRANG CHỦ
              </Link>

              <span className="text-slate-300 font-light select-none">|</span>

              <a
                href={pathname === '/' ? '#danh-sach-toa-nha' : '/#danh-sach-toa-nha'}
                onClick={(e) => handleHashClick(e, '#danh-sach-toa-nha')}
                className="transition-colors hover:text-[#B89C66] py-1 cursor-pointer"
              >
                TÌM PHÒNG TRỌ
              </a>

              <span className="text-slate-300 font-light select-none">|</span>

              <Link
                href="/o-ghep"
                className={`transition-colors hover:text-[#B89C66] py-1 ${
                  pathname?.startsWith('/o-ghep') ? 'text-[#B89C66]' : ''
                }`}
              >
                Ở GHÉP
              </Link>

              <span className="text-slate-300 font-light select-none">|</span>

              <a
                href={pathname === '/' ? '#services' : '/#services'}
                onClick={(e) => handleHashClick(e, '#services')}
                className="transition-colors hover:text-[#B89C66] py-1 cursor-pointer"
              >
                DỊCH VỤ
              </a>

              <span className="text-slate-300 font-light select-none">|</span>

              <a
                href={pathname === '/' ? '#about-us' : '/#about-us'}
                onClick={(e) => handleHashClick(e, '#about-us')}
                className="transition-colors hover:text-[#B89C66] py-1 cursor-pointer"
              >
                GIỚI THIỆU
              </a>

              <span className="text-slate-300 font-light select-none">|</span>

              <a
                href={pathname === '/' ? '#contact' : '/#contact'}
                onClick={(e) => handleHashClick(e, '#contact')}
                className="transition-colors hover:text-[#B89C66] py-1 cursor-pointer"
              >
                LIÊN HỆ
              </a>
            </nav>

            {/* RIGHT ACTIONS: REGISTER / LOGIN BUTTON OR USER PROFILE */}
            <div className="flex items-center gap-3">
              {status === 'authenticated' && session?.user ? (
                <div className="relative">
                  <div className="flex items-center gap-2">
                    {!session.user.phoneVerified && (
                      <button
                        type="button"
                        onClick={() => setVerifyPhoneModalOpen(true)}
                        className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors shadow-xs animate-pulse"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Xác minh SĐT</span>
                      </button>
                    )}

                    {/* NOTIFICATION BELL FOR CONTRACTS & HANDOVERS */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                        className="relative p-2 rounded-xl border border-slate-200 bg-white hover:border-[#B89C66] text-slate-700 transition-all shadow-xs cursor-pointer"
                        title="Thông báo hợp đồng & bàn giao phòng"
                      >
                        <Bell className="w-4 h-4 text-slate-700" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#B89C66] text-[#0F223A] font-extrabold text-[9px] rounded-full flex items-center justify-center shadow-xs animate-pulse">
                          2
                        </span>
                      </button>

                      {notifDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                          <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                              Thông Báo Của Bạn
                            </span>
                            <span className="text-[10px] bg-[#B89C66]/20 text-[#0F223A] font-extrabold px-1.5 py-0.5 rounded-full">
                              2 mới
                            </span>
                          </div>

                          <div className="divide-y divide-slate-100 text-xs">
                            <Link
                              href="/ho-so?tab=contracts"
                              onClick={() => setNotifDropdownOpen(false)}
                              className="block p-3 hover:bg-[#FAF8F5] transition-colors"
                            >
                              <div className="flex items-start gap-2.5">
                                <span className="w-2 h-2 rounded-full bg-[#B89C66] mt-1 shrink-0" />
                                <div>
                                  <p className="font-bold text-slate-900 text-[11.5px]">
                                    Hợp đồng thuê điện tử mới
                                  </p>
                                  <p className="text-[10.5px] text-slate-500 mt-0.5">
                                    Chủ trọ đã gửi bản Hợp đồng kèm 10 Điều Nội Quy PCCC. Bấm để xem &amp; ký số.
                                  </p>
                                  <span className="text-[9.5px] text-[#B89C66] font-bold block mt-1">
                                    Vừa xong • Nhấn để ký
                                  </span>
                                </div>
                              </div>
                            </Link>

                            <Link
                              href="/ho-so?tab=contracts"
                              onClick={() => setNotifDropdownOpen(false)}
                              className="block p-3 hover:bg-[#FAF8F5] transition-colors"
                            >
                              <div className="flex items-start gap-2.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0" />
                                <div>
                                  <p className="font-bold text-slate-900 text-[11.5px]">
                                    Biên bản bàn giao nhận phòng
                                  </p>
                                  <p className="text-[10.5px] text-slate-500 mt-0.5">
                                    Chủ trọ đã lập danh mục kiểm kê cơ sở vật chất (Check-in). Bấm để xác nhận.
                                  </p>
                                  <span className="text-[9.5px] text-indigo-600 font-bold block mt-1">
                                    Vừa xong • Chờ xác nhận
                                  </span>
                                </div>
                              </div>
                            </Link>
                          </div>

                          <div className="pt-2 border-t border-slate-100 px-3 text-center">
                            <Link
                              href="/ho-so?tab=contracts"
                              onClick={() => setNotifDropdownOpen(false)}
                              className="text-[11px] font-bold text-[#B89C66] hover:underline"
                            >
                              Xem tất cả văn bản pháp lý &rarr;
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:border-[#B89C66] transition-all shadow-xs"
                    >
                      {session.user.image ? (
                        <img
                          src={session.user.image}
                          alt={session.user.name || 'User'}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                          {session.user.name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="hidden md:block text-left text-xs">
                        <p className="font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                          {session.user.name || session.user.email}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {session.user.role === 'ADMIN' ? 'Quản trị viên' : session.user.role === 'LANDLORD' ? 'Chủ trọ' : 'Người thuê'}
                        </p>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">{session.user.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{session.user.email}</p>
                        <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {session.user.role}
                        </span>
                      </div>

                      {session.user.role === 'ADMIN' && (
                        <Link
                          href="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                        >
                          <Shield className="w-4 h-4 text-indigo-500" />
                          <span>Bảng điều khiển Admin</span>
                        </Link>
                      )}

                      {(session.user.role === 'LANDLORD' || session.user.role === 'ADMIN') && (
                        <Link
                          href="/chu-tro"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                        >
                          <Building2 className="w-4 h-4 text-blue-500" />
                          <span>Cổng Quản lý Chủ trọ</span>
                        </Link>
                      )}

                      <Link
                        href="/ho-so"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-[#FAF8F5] hover:text-[#B89C66] transition-colors"
                      >
                        <User className="w-4 h-4 text-[#B89C66]" />
                        <span>Hồ sơ cá nhân</span>
                      </Link>

                      <Link
                        href="/o-ghep/ho-so"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-[#FAF8F5] hover:text-[#B89C66] transition-colors"
                      >
                        <Users className="w-4 h-4 text-purple-500" />
                        <span>Khảo sát lối sống Ở ghép</span>
                      </Link>

                      <Link
                        href="/o-ghep/dang-bai"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                      >
                        <Users className="w-4 h-4 text-emerald-500" />
                        <span>Đăng tin tìm bạn ở ghép</span>
                      </Link>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          signOut({ callbackUrl: '/' });
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalTab('login');
                    setAuthModalOpen(true);
                  }}
                  className="hidden sm:inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 border-[1.5px] border-[#B89C66] text-[#B89C66] hover:bg-[#B89C66] hover:text-white transition-all text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-xs hover:shadow-md active:scale-95"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>ĐĂNG NHẬP / ĐĂNG KÝ</span>
                </button>
              )}

              {/* Mobile Menu Hamburger Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-[#0F223A] hover:text-[#B89C66] transition-colors cursor-pointer"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE NAVIGATION DRAWER */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#F8F8F6] border-t border-[#E5E3DE] px-4 pt-4 pb-6 space-y-3 shadow-lg animate-in fade-in duration-200">
            <nav className="flex flex-col space-y-2 text-sm font-bold uppercase tracking-wider text-[#0F223A]">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-white hover:text-[#B89C66] transition-colors"
              >
                TRANG CHỦ
              </Link>
              <a
                href="/#danh-sach-toa-nha"
                onClick={(e) => handleHashClick(e, '#danh-sach-toa-nha')}
                className="px-3 py-2 rounded-md hover:bg-white hover:text-[#B89C66] transition-colors"
              >
                TÌM PHÒNG TRỌ
              </a>
              <Link
                href="/o-ghep"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-white hover:text-[#B89C66] transition-colors"
              >
                Ở GHÉP
              </Link>
              <a
                href="/#services"
                onClick={(e) => handleHashClick(e, '#services')}
                className="px-3 py-2 rounded-md hover:bg-white hover:text-[#B89C66] transition-colors"
              >
                DỊCH VỤ
              </a>
              <a
                href="/#about-us"
                onClick={(e) => handleHashClick(e, '#about-us')}
                className="px-3 py-2 rounded-md hover:bg-white hover:text-[#B89C66] transition-colors"
              >
                GIỚI THIỆU
              </a>
              <a
                href="/#contact"
                onClick={(e) => handleHashClick(e, '#contact')}
                className="px-3 py-2 rounded-md hover:bg-white hover:text-[#B89C66] transition-colors"
              >
                LIÊN HỆ
              </a>
            </nav>

            <div className="pt-3 border-t border-[#E5E3DE] flex flex-col gap-2.5">
              {status === 'authenticated' && session?.user ? (
                <div className="space-y-2">
                  <div className="px-3 py-2 bg-white rounded-lg border border-slate-200">
                    <p className="text-xs font-bold text-slate-800">{session.user.name}</p>
                    <p className="text-[11px] text-slate-500">{session.user.email}</p>
                  </div>
                  <Link
                    href="/ho-so"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2 px-3 bg-[#FAF8F5] text-[#0F223A] font-bold text-xs rounded-lg flex items-center gap-2 border border-[#E5E3DE]"
                  >
                    <User className="w-4 h-4 text-[#B89C66]" />
                    <span>Hồ sơ cá nhân của tôi</span>
                  </Link>
                  {!session.user.phoneVerified && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setVerifyPhoneModalOpen(true);
                      }}
                      className="w-full py-2 bg-amber-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Xác minh Số điện thoại</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="w-full py-2 bg-red-50 text-red-600 font-bold text-xs rounded-lg hover:bg-red-100"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAuthModalTab('login');
                    setAuthModalOpen(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 border-[1.5px] border-[#B89C66] text-[#B89C66] hover:bg-[#B89C66] hover:text-white font-bold uppercase tracking-wider text-xs transition-colors rounded-xs cursor-pointer active:scale-95"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>ĐĂNG NHẬP / ĐĂNG KÝ</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Phone Verification Modal */}
      <PhoneVerificationModal
        isOpen={verifyPhoneModalOpen}
        onClose={() => setVerifyPhoneModalOpen(false)}
        onVerified={() => setVerifyPhoneModalOpen(false)}
      />

      {/* AUTH & ACCOUNT MODAL (HIỆN NGAY TẠI TRANG WEB VỚI NỀN LÀM MỜ NHẸ) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </>
  );
}

