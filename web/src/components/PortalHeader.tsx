'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Shield,
  Building2,
  LogOut,
  ExternalLink,
  ChevronDown,
  User,
  Sparkles,
  Layers,
  ArrowRightLeft,
  Check
} from 'lucide-react';
import { AuthSession, Landlord } from '@/lib/types';

interface PortalHeaderProps {
  currentLandlordId?: string;
  onLandlordChange?: (newId: string) => void;
}

export default function PortalHeader({ currentLandlordId, onLandlordChange }: PortalHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [allLandlords, setAllLandlords] = useState<Landlord[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    // 1. Read session from localStorage
    const saved = localStorage.getItem('elite_auth_user');
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Fetch all landlords for quick switcher
    fetch('/api/landlords?type=landlords')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setAllLandlords(res.data);
      })
      .catch((e) => console.error(e));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('elite_auth_user');
    document.cookie = 'elite_role=; path=/; max-age=0';
    router.push('/portal/login');
  };

  const handleSwitchLandlord = (landlord: Landlord) => {
    const updatedSession: AuthSession = {
      id: landlord.id,
      name: landlord.name,
      email: landlord.email,
      phone: landlord.phone,
      role: 'LANDLORD',
      landlordId: landlord.id,
      avatar: landlord.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    };
    localStorage.setItem('elite_auth_user', JSON.stringify(updatedSession));
    setSession(updatedSession);
    setDropdownOpen(false);

    if (onLandlordChange) {
      onLandlordChange(landlord.id);
    } else {
      window.location.reload();
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[70px]">
          {/* LEFT: BRAND & BADGE */}
          <div className="flex items-center gap-4">
            <Link href="/chu-tro" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B89C66] to-[#8E743F] flex items-center justify-center shadow-md shadow-[#B89C66]/20">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-wider text-base text-white font-sans">
                    ELITE LIVING
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-[#B89C66] border border-[#B89C66]/30 uppercase tracking-widest">
                    Portal
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  Cổng Vận Hành Chủ Trọ &amp; Quản Trị Hệ Thống
                </span>
              </div>
            </Link>

            {/* NAV LINKS */}
            <nav className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-slate-800 text-xs font-semibold">
              <Link
                href="/chu-tro"
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  pathname === '/chu-tro'
                    ? 'bg-[#B89C66] text-white font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Cổng Chủ Trọ
              </Link>

              <Link
                href="/admin"
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  pathname === '/admin'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Quản Trị Viên
              </Link>
            </nav>
          </div>

          {/* RIGHT: ACCOUNT CONTROLS & SWITCHER */}
          <div className="flex items-center gap-3">
            {/* Quick Landlord Switcher dropdown (handy for demo) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition-all cursor-pointer"
                title="Chuyển đổi nhanh tài khoản chủ trọ demo"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#B89C66]" />
                <span className="hidden sm:inline font-medium max-w-[140px] truncate">
                  {session?.name || 'Tài khoản vận hành'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Đang đăng nhập với vai trò:
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                        session?.role === 'ADMIN' ? 'bg-purple-900 text-purple-200' : 'bg-emerald-900 text-emerald-200'
                      }`}>
                        {session?.role === 'ADMIN' ? 'QUẢN TRỊ VIÊN' : 'CHỦ TRỌ'}
                      </span>
                      <span className="text-xs font-bold text-white truncate">{session?.name}</span>
                    </div>
                  </div>

                  <div className="py-2">
                    <span className="text-[10px] font-semibold text-slate-400 px-3 block mb-1">
                      CHUYỂN NHANH CHỦ TRỌ DEMO:
                    </span>
                    <div className="max-h-56 overflow-y-auto space-y-1">
                      {allLandlords.slice(0, 6).map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => handleSwitchLandlord(l)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            session?.landlordId === l.id
                              ? 'bg-[#B89C66]/20 text-[#B89C66] font-bold'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <div className="font-semibold truncate">{l.name}</div>
                            <div className="text-[10px] text-slate-500">{l.phone}</div>
                          </div>
                          {session?.landlordId === l.id && (
                            <Check className="w-4 h-4 text-[#B89C66] flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <Link
                      href="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="px-2.5 py-1.5 text-purple-300 hover:text-purple-200 hover:bg-slate-800 rounded-lg font-semibold flex items-center gap-1.5"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Admin Console</span>
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-2.5 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Link to public Client/Tenant website */}
            <Link
              href="/"
              target="_blank"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <span>Xem Web Khách Thuê</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-900/60 hover:bg-rose-900 text-rose-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              title="Đăng xuất khỏi cổng vận hành"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
