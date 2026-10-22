'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Building2, Home, Users, LayoutDashboard, CalendarCheck, Sparkles, ShieldCheck, LogOut, ExternalLink, RefreshCw, Menu, Plus, ChevronDown } from 'lucide-react';
import DropdownPanel from '@/components/DropdownPanel';
import AdminPanel from './AdminPanel';
import type { AuthSession } from '@/lib/types';

export type AdminTab = 'analytics' | 'buildings' | 'rooms' | 'users' | 'operations' | 'recommender';

const navigation = [
  { id: 'analytics', label: 'Tổng quan', short: 'Tổng quan', description: 'Theo dõi toàn hệ thống và những việc cần xử lý', icon: LayoutDashboard, group: 'Vận hành hàng ngày' },
  { id: 'buildings', label: 'Khu trọ & tòa nhà', short: 'Khu trọ', description: 'Danh mục khu trọ, vị trí và chủ trọ phụ trách', icon: Building2, group: 'Vận hành hàng ngày' },
  { id: 'rooms', label: 'Phòng cho thuê', short: 'Phòng', description: 'Tìm phòng, theo dõi giá và trạng thái cho thuê', icon: Home, group: 'Vận hành hàng ngày' },
  { id: 'operations', label: 'Lịch hẹn & hồ sơ thuê', short: 'Vận hành', description: 'Lịch xem phòng, hợp đồng và hóa đơn toàn hệ thống', icon: CalendarCheck, group: 'Vận hành hàng ngày' },
  { id: 'users', label: 'Tài khoản & phân quyền', short: 'Tài khoản', description: 'Quản lý người thuê, chủ trọ và quyền truy cập', icon: Users, group: 'Quản trị hệ thống' },
  { id: 'recommender', label: 'Chất lượng gợi ý', short: 'Gợi ý', description: 'Theo dõi chỉ số và đánh giá gợi ý phòng', icon: Sparkles, group: 'Quản trị hệ thống' },
] as const;

interface Props {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  session: AuthSession | null;
  counts: Partial<Record<AdminTab, number>>;
  refreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
  onCreateUser: () => void;
  children: React.ReactNode;
}

export default function AdminShell({ activeTab, onSelectTab, session, counts, refreshing, onRefresh, onLogout, onCreateUser, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const current = navigation.find((item) => item.id === activeTab)!;
  const name = session?.name || 'Quản trị viên';
  const initials = name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase();
  const menu = (mobile = false) => (
    <nav aria-label={mobile ? 'Danh mục quản trị trên điện thoại' : 'Điều hướng quản trị'} className="space-y-5">
      {['Vận hành hàng ngày', 'Quản trị hệ thống'].map((group) => (
        <div key={group} className="space-y-1">
          <p className={`px-3 mb-1.5 text-xs font-semibold ${mobile ? 'text-slate-500' : 'text-slate-400'}`}>{group}</p>
          {navigation.filter((item) => item.group === group).map((item) => {
            const Icon = item.icon;
            const selected = item.id === activeTab;
            return (
              <button key={item.id} type="button" aria-current={selected ? 'page' : undefined}
                onClick={() => { onSelectTab(item.id); setMobileOpen(false); }}
                className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-left text-sm transition-colors duration-150 motion-reduce:transition-none cursor-pointer ${selected ? 'bg-[#B89C66] text-[#0F223A] font-bold shadow-sm shadow-[#B89C66]/25' : mobile ? 'text-[#0F223A] hover:bg-[#F8F8F6] font-medium' : 'text-slate-200 hover:bg-white/10 hover:text-white font-medium'}`}>
                <Icon className={`w-5 h-5 shrink-0 ${selected ? 'text-[#0F223A]' : 'text-[#B89C66]'}`} />
                <span className="flex-1 min-w-0">{item.label}</span>
                {counts[item.id] !== undefined && <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${selected ? 'bg-[#0F223A] text-[#E5D7B7]' : mobile ? 'bg-[#F3F2EE] text-slate-600' : 'bg-white/10 text-slate-200'}`}>{counts[item.id]?.toLocaleString('vi-VN')}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
  const links = (mobile = false) => (
    <div className="space-y-2">
      <Link href="/chu-tro" className={`min-h-[44px] px-3.5 py-2 rounded-xl flex items-center justify-between text-sm font-medium ${mobile ? 'bg-[#F8F8F6] text-[#0F223A]' : 'bg-white/5 hover:bg-white/10 text-slate-200'}`}>Cổng chủ trọ <Building2 className="w-4 h-4 text-[#B89C66]" /></Link>
      <Link href="/" target="_blank" rel="noopener noreferrer" className={`min-h-[44px] px-3.5 py-2 rounded-xl flex items-center justify-between text-sm font-medium ${mobile ? 'bg-[#F8F8F6] text-[#0F223A]' : 'bg-white/5 hover:bg-white/10 text-slate-200'}`}>Trang web người thuê <ExternalLink className="w-4 h-4" /></Link>
      <button type="button" onClick={onLogout} className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold cursor-pointer ${mobile ? 'text-rose-700 hover:bg-rose-50' : 'text-rose-300 hover:bg-white/5'}`}><LogOut className="w-4 h-4" />Đăng xuất</button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-x-clip bg-[#F8F8F6] text-[#0F223A] font-sans">
      <aside className="hidden lg:flex flex-col w-72 shrink-0 sticky top-0 h-dvh min-h-0 self-start bg-[#0F223A] border-r border-[#1E3A5B] text-white" aria-label="Cổng quản trị ELITE LIVING">
        <Link href="/admin" className="shrink-0 px-6 py-5 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-[#B89C66] flex items-center justify-center"><Building2 className="w-5 h-5 text-[#0F223A]" /></div>
          <div><span className="text-base font-extrabold tracking-wide">ELITE LIVING</span><span className="block text-xs font-medium text-[#E5D7B7]">Cổng quản trị hệ thống</span></div>
        </Link>
        <div className="shrink-0 px-4 py-4 border-b border-white/10">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5">
            <div className="flex items-center gap-2.5"><span className="w-9 h-9 rounded-xl shrink-0 bg-[#B89C66]/20 border border-[#B89C66]/40 text-[#B89C66] text-xs font-bold grid place-items-center">{initials}</span><div className="min-w-0"><span className="text-[11px] text-slate-300">Quản trị viên</span><p className="text-sm font-bold truncate">{name}</p></div></div>
            <div className="mt-3 pt-3 border-t border-white/10"><p className="text-[11px] text-slate-300">Phạm vi quản lý</p><p className="text-sm font-semibold text-[#E5D7B7] mt-0.5">Toàn hệ thống ELITE LIVING</p></div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [scrollbar-width:thin] [scrollbar-color:var(--brand-primary)_transparent] px-3 py-4">{menu()}</div>
        <div className="shrink-0 p-4 border-t border-white/10">{links()}</div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E3DE]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[72px] py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button type="button" onClick={() => setMobileOpen(true)} aria-label="Mở danh mục quản trị" aria-expanded={mobileOpen} className="lg:hidden w-11 h-11 shrink-0 grid place-items-center border border-[#E5E3DE] bg-[#F8F8F6] rounded-xl"><Menu className="w-5 h-5" /></button>
              <div className="min-w-0"><h1 className="text-lg sm:text-xl font-bold truncate">{current.label}</h1><p className="hidden sm:block text-xs text-slate-500 mt-0.5">Quản trị hệ thống <span className="mx-1">/</span> ELITE LIVING</p></div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={onRefresh} disabled={refreshing} aria-label="Làm mới dữ liệu" className="min-w-11 min-h-11 px-3 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F8F8F6] flex items-center gap-2 text-sm font-semibold disabled:opacity-50 cursor-pointer"><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin motion-reduce:animate-none' : ''}`} /><span className="hidden xl:inline">Làm mới</span></button>
              {activeTab === 'users' && <button type="button" onClick={onCreateUser} className="hidden sm:flex min-h-11 items-center gap-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] px-4 text-sm font-bold shadow-sm shadow-[#B89C66]/25"><Plus className="w-4 h-4" />Thêm tài khoản</button>}
              <div className="relative">
                <button id="admin-account-trigger" type="button" aria-expanded={accountOpen} aria-controls="admin-account-menu" aria-label="Tài khoản quản trị" onClick={() => setAccountOpen(!accountOpen)} className="elite-dropdown-trigger min-h-11 flex items-center gap-2 px-3 rounded-xl border border-[#E5E3DE] bg-[#F8F8F6] text-sm font-semibold"><ShieldCheck className="w-4 h-4 text-[#8C6D37]" /><span className="hidden md:inline max-w-32 truncate">{name}</span><ChevronDown className="w-4 h-4 elite-dropdown-chevron" /></button>
                <DropdownPanel id="admin-account-menu" triggerId="admin-account-trigger" open={accountOpen} onOpenChange={setAccountOpen} className="absolute right-0 top-full mt-2 w-64 p-3 z-40"><p className="text-sm font-bold break-words mb-1">{name}</p><p className="text-xs text-slate-500 mb-3">Quản trị viên · Toàn hệ thống</p>{links(true)}</DropdownPanel>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <p className="text-sm text-slate-500 mb-5">{current.description}</p>
          {children}
        </main>
      </div>

      <nav aria-label="Điều hướng nhanh quản trị" className="lg:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-5 gap-1 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] border-t border-[#E5E3DE] bg-white shadow-lg">
        {(['analytics', 'rooms', 'operations', 'users'] as AdminTab[]).map((id) => {
          const item = navigation.find((item) => item.id === id)!;
          const Icon = item.icon;
          return <button key={id} type="button" aria-current={activeTab === id ? 'page' : undefined} onClick={() => onSelectTab(id)} className={`min-h-12 flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold ${activeTab === id ? 'bg-[#FAF0DC] text-[#0F223A]' : 'text-slate-600'}`}><Icon className="w-5 h-5" />{item.short}</button>;
        })}
        <button type="button" onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen} className={`min-h-12 flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold ${['buildings', 'recommender'].includes(activeTab) ? 'bg-[#FAF0DC] text-[#0F223A]' : 'text-slate-600'}`}><Menu className="w-5 h-5" />Tất cả</button>
      </nav>
      <AdminPanel open={mobileOpen} onClose={() => setMobileOpen(false)} title="Danh mục quản trị" subtitle="ELITE LIVING · Toàn hệ thống" side="left">{menu(true)}<div className="mt-6 pt-4 border-t border-[#E5E3DE]">{links(true)}</div></AdminPanel>
    </div>
  );
}
