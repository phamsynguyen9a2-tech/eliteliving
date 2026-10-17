'use client';

import { scopedFetch as fetch } from '@/lib/scoped-fetch';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { portalSignOut } from '@/lib/portal-auth-client';
import { useRouter, usePathname } from 'next/navigation';
import {
  Shield,
  Building2,
  LogOut,
  ExternalLink,
  ChevronDown,
  ArrowRightLeft,
  Check
} from 'lucide-react';
import { AuthSession, Landlord } from '@/lib/types';
import DropdownPanel from '@/components/DropdownPanel';

interface PortalHeaderProps {
  currentLandlordId?: string;
  onLandlordChange?: (newId: string) => void;
}

export default function PortalHeader({ onLandlordChange }: PortalHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('elite_auth_user');
    if (!saved) return null;
    try {
      return JSON.parse(saved) as AuthSession;
    } catch {
      return null;
    }
  });
  const [allLandlords, setAllLandlords] = useState<Landlord[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    // Fetch landlords allowed for this authenticated operator.
    fetch('/api/landlords?type=landlords')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setAllLandlords(res.data);
      })
      .catch((e) => console.error(e));
  }, []);

  const handleLogout = async () => {
    await portalSignOut();
    localStorage.removeItem('elite_auth_user');
    document.cookie = 'elite_role=; path=/; max-age=0';
    router.push('/portal/login');
    router.refresh();
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
                id="portal-account-trigger"
                aria-expanded={dropdownOpen}
                aria-controls="portal-account-dropdown"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="elite-dropdown-trigger flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition-all cursor-pointer"
                title="Chuyển đổi nhanh tài khoản chủ trọ demo"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#B89C66]" />
                <span className="hidden sm:inline font-medium max-w-[140px] truncate">
                  {session?.name || 'Tài khoản vận hành'}
                </span>
                <ChevronDown className="elite-dropdown-chevron w-3.5 h-3.5 text-[#B89C66]" />
              </button>

                <DropdownPanel
                  id="portal-account-dropdown"
                  triggerId="portal-account-trigger"
                  open={dropdownOpen}
                  onOpenChange={setDropdownOpen}
                  className="absolute right-0 mt-2 w-72 sm:w-80 p-2 z-50"
                >
                  <div className="px-3 py-2 border-b border-[#E5E3DE]">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Đang đăng nhập với vai trò:
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                        session?.role === 'ADMIN' ? 'bg-[#0F223A] text-white' : 'bg-[#B89C66]/20 text-[#796138]'
                      }`}>
                        {session?.role === 'ADMIN' ? 'QUẢN TRỊ VIÊN' : 'CHỦ TRỌ'}
                      </span>
                      <span className="text-xs font-bold text-[#0F223A] truncate">{session?.name}</span>
                    </div>
                  </div>

                  <div className="py-2">
                    <span className="text-[10px] font-semibold text-slate-500 px-3 block mb-1">
                      CHUYỂN NHANH CHỦ TRỌ DEMO:
                    </span>
                    <div className="max-h-56 overflow-y-auto space-y-1">
                      {allLandlords.slice(0, 6).map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          aria-pressed={session?.landlordId === l.id}
                          onClick={() => handleSwitchLandlord(l)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            session?.landlordId === l.id
                              ? 'bg-[#B89C66]/20 text-[#796138] font-bold'
                              : 'text-[#0F223A] hover:bg-[#F8F8F6]'
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

                  <div className="pt-2 border-t border-[#E5E3DE] flex items-center justify-between text-xs">
                    <Link
                      href="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="px-2.5 py-1.5 text-[#796138] hover:text-[#0F223A] rounded-lg font-semibold flex items-center gap-1.5"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Admin Console</span>
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-2.5 py-1.5 text-rose-700 hover:text-rose-800 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </DropdownPanel>
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
