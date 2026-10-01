'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Phone, User, KeyRound, Building2, Shield, Sparkles, LogIn, ExternalLink } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
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

            {/* RIGHT ACTIONS: REGISTER / LOGIN BUTTON */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 border-[1.5px] border-[#B89C66] text-[#B89C66] hover:bg-[#B89C66] hover:text-white transition-all text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-xs hover:shadow-md"
              >
                <User className="w-3.5 h-3.5" />
                <span>ĐĂNG NHẬP / ĐĂNG KÝ</span>
              </button>

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
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAuthModalOpen(true);
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 border-[1.5px] border-[#B89C66] text-[#B89C66] hover:bg-[#B89C66] hover:text-white font-bold uppercase tracking-wider text-xs transition-colors rounded-xs"
              >
                <User className="w-3.5 h-3.5" />
                <span>ĐĂNG NHẬP / ĐĂNG KÝ</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* AUTH & ACCOUNT MODAL */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-[#FAF9F7] border-b border-[#EAE8E3] p-6 text-center relative">
              <button
                onClick={() => setAuthModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-sm border border-[#E5E3DE] mb-3">
                <img src="/logo-icon-transparent.png" alt="Emblem" className="w-6 h-auto" />
              </div>
              <h3 className="text-lg font-black text-[#0F223A] tracking-wider uppercase font-sans">
                ELITE LIVING
              </h3>
              <p className="text-xs text-[#B89C66] uppercase font-semibold tracking-widest mt-0.5">
                Đăng Nhập / Đăng Ký Hệ Thống
              </p>
            </div>

            {/* Tenant Client Login Content */}
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Cổng Tra Cứu Khách Thuê Phòng
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Dành cho sinh viên &amp; người thuê theo dõi lịch hẹn, phòng yêu thích
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nhập Số điện thoại hoặc Mã sinh viên tra cứu:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="0965616660 hoặc user_1"
                      defaultValue="0965616660"
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-hidden focus:border-[#B89C66]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        alert('✅ Đã xác thực thành công Khách thuê: Sinh viên K14 HUIT! Bạn có thể đặt lịch và lưu phòng yêu thích.');
                        setAuthModalOpen(false);
                      }}
                      className="px-3 py-1.5 bg-blue-900 text-white font-bold text-xs rounded-lg hover:bg-blue-800 transition-colors cursor-pointer"
                    >
                      Tra cứu
                    </button>
                  </div>
                </div>
              </div>

              {/* Customer Benefits & Notes */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#B89C66]" />
                  <span>Quyền lợi dành cho Khách thuê:</span>
                </div>
                <ul className="text-[11px] text-slate-500 list-disc list-inside space-y-0.5 pl-0.5">
                  <li>Tra cứu lịch hẹn xem phòng và nhận thông báo xác nhận từ chủ nhà</li>
                  <li>Lưu danh sách căn hộ yêu thích để nhận gợi ý Top-K cá nhân hóa</li>
                  <li>Xem hóa đơn điện nước và hợp đồng thuê phòng trực tuyến</li>
                </ul>
              </div>

              {/* Direct Hotline */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 px-1">
                <span>Hỗ trợ kỹ thuật 24/7:</span>
                <a
                  href="tel:0903123456"
                  className="font-bold text-[#B89C66] hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>0903.123.456</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

