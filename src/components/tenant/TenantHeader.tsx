'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Search, Bell, User, Menu, X, MapPin, Home, Sparkles, ChevronDown, Heart } from 'lucide-react'
import { useFavorites } from '@/hooks/useFavorites'

export default function TenantHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { favorites } = useFavorites()

  return (
    <header className="tenant-nav shadow-sm">
      <div className="w-full max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/tim-phong" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-glow">
            N
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-dark-900 text-base">NhàTrọTop</span>
            <span className="hidden md:inline text-slate-400 text-xs ml-1.5">– Tìm phòng dễ dàng</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/tim-phong" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-dark-600 hover:text-primary-600 hover:bg-primary-50 transition-all">
            <Home className="w-4 h-4" /> Tìm phòng
          </Link>
          <Link href="/goi-y" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-dark-600 hover:text-primary-600 hover:bg-primary-50 transition-all">
            <Sparkles className="w-4 h-4" /> Gợi ý cho tôi
          </Link>
          <Link href="/yeu-thich" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-dark-600 hover:text-red-500 hover:bg-red-50 transition-all">
            <Heart className={`w-4 h-4 ${favorites.length > 0 ? 'fill-red-400 text-red-500' : ''}`} />
            Yêu thích
            {favorites.length > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold px-1">
                {favorites.length}
              </span>
            )}
          </Link>
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-dark-600 hover:text-primary-600 hover:bg-primary-50 transition-all">
              <MapPin className="w-4 h-4" /> Khu vực <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button className="btn-icon btn-secondary hidden md:flex" title="Tìm kiếm">
            <Search className="w-4 h-4" />
          </button>
          {/* Favorite icon */}
          <Link href="/yeu-thich" id="btn-header-favorites" title="Phòng yêu thích" className="btn-icon btn-secondary relative">
            <Heart className={`w-4 h-4 transition-colors ${favorites.length > 0 ? 'fill-red-400 text-red-500' : ''}`} />
            {favorites.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                {favorites.length > 9 ? '9+' : favorites.length}
              </span>
            )}
          </Link>
          <button className="btn-icon btn-secondary relative" title="Thông báo">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">3</span>
          </button>
          <Link href="/dang-nhap" className="btn btn-secondary hidden md:flex">
            <User className="w-4 h-4" /> Đăng nhập
          </Link>
          <Link href="/dang-ky" className="btn btn-primary hidden md:flex">
            Đăng ký
          </Link>
          <button
            className="btn-icon btn-secondary md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-dark-100 shadow-xl py-4 px-4 space-y-2 animate-slide-up z-50">
          <Link href="/tim-phong" className="flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-dark-50 font-medium">
            <Home className="w-4 h-4 text-primary-500" /> Tìm phòng
          </Link>
          <Link href="/goi-y" className="flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-dark-50 font-medium">
            <Sparkles className="w-4 h-4 text-primary-500" /> Gợi ý cho tôi
          </Link>
          <Link href="/yeu-thich" className="flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-red-50 font-medium text-red-500">
            <Heart className={`w-4 h-4 ${favorites.length > 0 ? 'fill-red-400' : ''}`} />
            Yêu thích
            {favorites.length > 0 && (
              <span className="ml-auto min-w-[20px] h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold px-1">
                {favorites.length}
              </span>
            )}
          </Link>
          <hr className="border-dark-100" />
          <div className="flex gap-2">
            <Link href="/dang-nhap" className="btn btn-secondary flex-1 justify-center">Đăng nhập</Link>
            <Link href="/dang-ky" className="btn btn-primary flex-1 justify-center">Đăng ký</Link>
          </div>
        </div>
      )}
    </header>
  )
}
