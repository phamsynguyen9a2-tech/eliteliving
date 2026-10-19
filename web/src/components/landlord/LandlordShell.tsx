'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRightLeft,
  Building2,
  CalendarCheck,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock,
  ExternalLink,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import type { AuthSession, Landlord } from '@/lib/types';
import DropdownPanel from '@/components/DropdownPanel';
import { initialsOf, LandlordTab, TAB_TITLES } from './landlord-format';

export interface LandlordNavCounts {
  totalRooms: number;
  availableRooms: number;
  pendingAppointments: number;
  unpaidBills: number;
  expiringContracts: number;
  totalContracts: number;
}

interface LandlordShellProps {
  activeTab: LandlordTab;
  onSelectTab: (tab: LandlordTab) => void;
  counts: LandlordNavCounts;
  session: AuthSession | null;
  currentLandlord: Landlord | null;
  allLandlords: Landlord[];
  propertySummary: {
    primaryBuildingName: string;
    buildingCount: number;
    districtsLabel: string;
  };
  onSwitchLandlord: (landlord: Landlord) => void;
  onLogout: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  onQuickCreateRoom: () => void;
  onQuickCreateBill: () => void;
  onQuickCreateContract: () => void;
  children: React.ReactNode;
}

interface NavItemConfig {
  id: LandlordTab;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'daily' | 'finance' | 'compliance';
  badge?: number;
  badgeTone?: 'urgent' | 'neutral';
}

export default function LandlordShell({
  activeTab,
  onSelectTab,
  counts,
  session,
  currentLandlord,
  allLandlords,
  propertySummary,
  onSwitchLandlord,
  onLogout,
  onRefresh,
  refreshing,
  onQuickCreateRoom,
  onQuickCreateBill,
  onQuickCreateContract,
  children,
}: LandlordShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

  const isAdmin = session?.role === 'ADMIN';
  const canSwitchLandlord = isAdmin && allLandlords.length > 1;
  const managerName = currentLandlord?.name || session?.name || 'Chủ trọ';
  const managerPhone = currentLandlord?.phone || session?.phone || '';

  const navItems: NavItemConfig[] = [
    {
      id: 'overview',
      label: 'Tổng quan',
      shortLabel: 'Tổng quan',
      description: 'Việc cần làm & số liệu hôm nay',
      icon: LayoutDashboard,
      group: 'daily',
      badge: counts.pendingAppointments + counts.unpaidBills > 0
        ? counts.pendingAppointments + counts.unpaidBills
        : undefined,
      badgeTone: 'urgent',
    },
    {
      id: 'rooms',
      label: 'Phòng cho thuê',
      shortLabel: 'Phòng',
      description: `${counts.availableRooms} trống / ${counts.totalRooms} phòng`,
      icon: Home,
      group: 'daily',
      badge: counts.totalRooms,
      badgeTone: 'neutral',
    },
    {
      id: 'appointments',
      label: 'Lịch xem phòng',
      shortLabel: 'Lịch xem',
      description: 'Xác nhận & đón khách xem phòng',
      icon: CalendarCheck,
      group: 'daily',
      badge: counts.pendingAppointments > 0 ? counts.pendingAppointments : undefined,
      badgeTone: 'urgent',
    },
    {
      id: 'availability',
      label: 'Khung giờ đón khách',
      shortLabel: 'Giờ rảnh',
      description: 'Cài đặt ngày & giờ nhận khách',
      icon: Clock,
      group: 'daily',
    },
    {
      id: 'billing',
      label: 'Hóa đơn điện nước',
      shortLabel: 'Hóa đơn',
      description: 'Ghi chỉ số & theo dõi thu tiền',
      icon: Zap,
      group: 'finance',
      badge: counts.unpaidBills > 0 ? counts.unpaidBills : undefined,
      badgeTone: 'urgent',
    },
    {
      id: 'contracts',
      label: 'Hợp đồng',
      shortLabel: 'Hợp đồng',
      description: 'Ký mới, gia hạn & trả phòng',
      icon: FileText,
      group: 'finance',
      badge: counts.expiringContracts > 0 ? counts.expiringContracts : counts.totalContracts || undefined,
      badgeTone: counts.expiringContracts > 0 ? 'urgent' : 'neutral',
    },
    {
      id: 'rules',
      label: 'Nội quy & PCCC',
      shortLabel: 'Nội quy',
      description: '10 điều khoản an toàn & cư trú',
      icon: ShieldAlert,
      group: 'compliance',
    },
    {
      id: 'handover',
      label: 'Bàn giao tài sản',
      shortLabel: 'Bàn giao',
      description: 'Kiểm kê thiết bị lúc nhận/trả',
      icon: ClipboardCheck,
      group: 'compliance',
    },
  ];

  const groups: { key: NavItemConfig['group']; title: string }[] = [
    { key: 'daily', title: 'Vận hành hàng ngày' },
    { key: 'finance', title: 'Hóa đơn & Hợp đồng' },
    { key: 'compliance', title: 'Nội quy & Tài sản' },
  ];

  const renderPrimaryQuickAction = () => {
    if (activeTab === 'billing') {
      return (
        <button
          type="button"
          onClick={onQuickCreateBill}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-sm font-bold shadow-sm shadow-[#B89C66]/25 inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Zap className="w-4 h-4" />
          <span>Ghi điện nước</span>
        </button>
      );
    }
    if (activeTab === 'contracts') {
      return (
        <button
          type="button"
          onClick={onQuickCreateContract}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-sm font-bold shadow-sm shadow-[#B89C66]/25 inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Lập hợp đồng mới</span>
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={onQuickCreateRoom}
        className="min-h-[44px] px-4 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-sm font-bold shadow-sm shadow-[#B89C66]/25 inline-flex items-center gap-2 transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Thêm phòng mới</span>
        <span className="sm:hidden">Thêm phòng</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#0F223A] flex flex-col lg:flex-row font-sans overflow-x-hidden">
      {/* ============================================================ */}
      {/* DESKTOP SIDEBAR                                              */}
      {/* ============================================================ */}
      <aside
        aria-label="Điều hướng cổng chủ trọ"
        className="hidden lg:flex lg:flex-col lg:w-72 lg:shrink-0 bg-[#0F223A] text-white border-r border-[#1E3A5B] sticky top-0 h-screen"
      >
        {/* Brand Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <Link href="/chu-tro" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B89C66] text-[#0F223A] flex items-center justify-center shadow-sm shadow-[#B89C66]/25 font-black">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wide text-base text-white">
                  ELITE LIVING
                </span>
              </div>
              <span className="text-xs text-[#E5D7B7] font-medium block">
                Cổng quản lý chủ trọ
              </span>
            </div>
          </Link>
        </div>

        {/* Distinct Manager vs Property Scope Card */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#B89C66]/20 border border-[#B89C66]/40 text-[#B89C66] font-bold text-xs flex items-center justify-center shrink-0">
                {initialsOf(managerName)}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] text-slate-300 block">Người quản lý</span>
                <p className="text-sm font-bold text-white truncate">{managerName}</p>
              </div>
            </div>

            <div className="pt-2.5 border-t border-white/10">
              <span className="text-[11px] text-slate-300 block">Phạm vi khu trọ đang quản lý</span>
              <p className="text-sm font-semibold text-[#E5D7B7] truncate mt-0.5">
                {propertySummary.primaryBuildingName}
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                {propertySummary.buildingCount > 1
                  ? `${propertySummary.buildingCount} khu trọ • ${counts.totalRooms} phòng`
                  : `${counts.totalRooms} phòng • ${propertySummary.districtsLabel}`}
              </p>
            </div>
          </div>
        </div>

        {/* Grouped Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((group) => {
            const items = navItems.filter((item) => item.group === group.key);
            return (
              <div key={group.key} className="space-y-1">
                <p className="px-3 text-xs font-semibold text-slate-400 mb-1.5">
                  {group.title}
                </p>
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectTab(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-2.5 text-left transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-[#B89C66] text-[#0F223A] font-bold shadow-sm shadow-[#B89C66]/25'
                          : 'text-slate-200 hover:bg-white/8 hover:text-white font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-5 h-5 shrink-0 ${
                            isActive ? 'text-[#0F223A]' : 'text-[#B89C66]'
                          }`}
                        />
                        <div className="min-w-0">
                          <span className="text-sm block truncate">{item.label}</span>
                        </div>
                      </div>

                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            isActive
                              ? 'bg-[#0F223A] text-[#B89C66]'
                              : item.badgeTone === 'urgent'
                              ? 'bg-amber-400 text-[#0F223A]'
                              : 'bg-white/10 text-slate-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer Links (Role-aware) */}
        <div className="p-4 border-t border-white/10 space-y-2">
          {isAdmin && (
            <Link
              href="/admin"
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white text-sm font-medium flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#B89C66]" />
                <span>Cổng Quản trị viên</span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          )}

          <Link
            href="/"
            target="_blank"
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white text-sm font-medium flex items-center justify-between transition-colors"
          >
            <span>Trang web người thuê</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>

          <button
            type="button"
            onClick={onLogout}
            className="w-full min-h-[42px] px-3.5 py-2 rounded-xl text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MAIN COLUMN (TOP HEADER + WORKSPACE + MOBILE BOTTOM BAR)     */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* TOP HEADER */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E3DE]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[72px] flex items-center justify-between gap-3">
            {/* Left: Mobile Menu Button + Screen Title + Scope */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Mở danh mục quản lý"
                className="lg:hidden min-w-[44px] min-h-[44px] rounded-xl border border-[#E5E3DE] bg-[#F8F8F6] hover:bg-[#EFECE6] text-[#0F223A] inline-flex items-center justify-center cursor-pointer shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-[#0F223A] truncate">
                    {TAB_TITLES[activeTab]}
                  </h1>
                  {refreshing && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#8C6D37] bg-[#FAF0DC] px-2.5 py-0.5 rounded-full">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span className="hidden sm:inline">Đang cập nhật</span>
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 truncate">
                  <span className="font-medium text-[#0F223A]">{propertySummary.primaryBuildingName}</span>
                  <span className="mx-1.5 text-slate-300">•</span>
                  <span>Quản lý: {managerName}</span>
                </p>
              </div>
            </div>

            {/* Right: Refresh + Account/Scope Switcher + Primary Action */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                title="Làm mới dữ liệu"
                aria-label="Làm mới dữ liệu"
                className="min-w-[44px] min-h-[44px] px-3 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F8F8F6] text-sm font-semibold text-[#0F223A] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-[#8C6D37] ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden xl:inline">Làm mới</span>
              </button>

              {/* Account / Landlord Scope Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  id="landlord-scope-trigger"
                  aria-expanded={accountDropdownOpen}
                  aria-controls="landlord-scope-dropdown"
                  onClick={() => setAccountDropdownOpen((prev) => !prev)}
                  className="elite-dropdown-trigger min-h-[44px] px-3 py-2 rounded-xl border border-[#E5E3DE] bg-[#F8F8F6] hover:bg-[#EFECE6] text-sm text-[#0F223A] inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-[#8C6D37] shrink-0" />
                  <span className="hidden md:inline font-semibold max-w-[150px] truncate">
                    {managerName}
                  </span>
                  <ChevronDown className="elite-dropdown-chevron w-4 h-4 text-[#8C6D37] shrink-0" />
                </button>

                <DropdownPanel
                  id="landlord-scope-dropdown"
                  triggerId="landlord-scope-trigger"
                  open={accountDropdownOpen}
                  onOpenChange={setAccountDropdownOpen}
                  className="absolute right-0 mt-2 w-80 p-3 z-50"
                >
                  {/* Distinct Identity vs Property Info */}
                  <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-500">Tài khoản đăng nhập</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#FAF0DC] text-[#0F223A] border border-[#B89C66]/40">
                        {isAdmin ? 'Quản trị viên' : 'Chủ trọ'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0F223A]">{managerName}</p>
                      {managerPhone && (
                        <p className="text-xs text-slate-600 mt-0.5">SĐT: {managerPhone}</p>
                      )}
                    </div>
                    <div className="pt-2 border-t border-[#E5E3DE]">
                      <span className="text-xs text-slate-500 block">Khu trọ đang quản lý</span>
                      <p className="text-sm font-semibold text-[#0F223A] mt-0.5">
                        {propertySummary.primaryBuildingName}
                      </p>
                      <p className="text-xs text-slate-600">
                        {counts.totalRooms} phòng ({counts.availableRooms} phòng trống)
                      </p>
                    </div>
                  </div>

                  {/* Admin-only Landlord Switcher */}
                  {canSwitchLandlord && (
                    <div className="mt-3 pt-2 border-t border-[#E5E3DE]">
                      <div className="px-2 pb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-[#8C6D37]" />
                        <span>Chuyển khu trọ quản lý (Quyền Quản trị)</span>
                      </div>
                      <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                        {allLandlords.map((l) => {
                          const selected = currentLandlord?.id === l.id;
                          return (
                            <button
                              key={l.id}
                              type="button"
                              onClick={() => {
                                onSwitchLandlord(l);
                                setAccountDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 rounded-xl text-left text-sm flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                selected
                                  ? 'bg-[#FAF0DC] text-[#0F223A] font-bold'
                                  : 'text-[#0F223A] hover:bg-[#F8F8F6] font-medium'
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="truncate">{l.name}</p>
                                <p className="text-xs text-slate-500 truncate">{l.phone}</p>
                              </div>
                              {selected && <Check className="w-4 h-4 text-[#8C6D37] shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 pt-2 border-t border-[#E5E3DE] flex items-center justify-between gap-2">
                    <Link
                      href="/"
                      target="_blank"
                      onClick={() => setAccountDropdownOpen(false)}
                      className="min-h-[40px] px-3 py-2 rounded-xl text-sm font-medium text-[#0F223A] hover:bg-[#F8F8F6] inline-flex items-center gap-1.5"
                    >
                      <span>Trang người thuê</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </Link>

                    <button
                      type="button"
                      onClick={onLogout}
                      className="min-h-[40px] px-3 py-2 rounded-xl text-sm font-semibold text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </DropdownPanel>
              </div>

              {renderPrimaryQuickAction()}
            </div>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
      </div>

      {/* ============================================================ */}
      {/* MOBILE BOTTOM NAVIGATION BAR (4 Primary + Full Menu)         */}
      {/* ============================================================ */}
      <nav
        aria-label="Điều hướng nhanh trên điện thoại"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#E5E3DE] px-2 py-1.5 grid grid-cols-5 gap-1 shadow-lg"
      >
        {(['overview', 'rooms', 'appointments', 'billing'] as LandlordTab[]).map((tabId) => {
          const item = navItems.find((n) => n.id === tabId)!;
          const Icon = item.icon;
          const isActive = activeTab === tabId;
          return (
            <button
              key={tabId}
              type="button"
              onClick={() => onSelectTab(tabId)}
              aria-current={isActive ? 'page' : undefined}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 px-1 py-1 relative transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#FAF0DC] text-[#0F223A] font-bold'
                  : 'text-slate-600 hover:text-[#0F223A] font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#8C6D37]' : 'text-slate-500'}`} />
              <span className="text-[11px] leading-tight truncate max-w-full">{item.shortLabel}</span>
              {item.badge !== undefined && item.badge > 0 && item.badgeTone === 'urgent' && (
                <span className="absolute top-1 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-[#0F223A] text-[10px] font-extrabold flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-expanded={mobileMenuOpen}
          className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 px-1 py-1 transition-colors cursor-pointer ${
            ['availability', 'contracts', 'rules', 'handover'].includes(activeTab)
              ? 'bg-[#FAF0DC] text-[#0F223A] font-bold'
              : 'text-slate-600 hover:text-[#0F223A] font-medium'
          }`}
        >
          <Menu className="w-5 h-5 text-[#8C6D37]" />
          <span className="text-[11px] leading-tight">Menu đủ</span>
        </button>
      </nav>

      {/* ============================================================ */}
      {/* MOBILE FULL NAVIGATION DRAWER (All 8 Modules)                */}
      {/* ============================================================ */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex bg-[#0F223A]/50 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-label="Danh mục quản lý nhà trọ"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMobileMenuOpen(false);
          }}
        >
          <div className="w-full max-w-xs bg-[#0F223A] text-white h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#B89C66] text-[#0F223A] flex items-center justify-center font-black">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-white block">ELITE LIVING</span>
                  <span className="text-xs text-[#E5D7B7]">Cổng quản lý chủ trọ</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Đóng menu"
                className="min-w-[44px] min-h-[44px] rounded-xl inline-flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope card */}
            <div className="px-4 py-3.5 border-b border-white/10 bg-white/5 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Người quản lý:</span>
                <strong className="text-white">{managerName}</strong>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Khu trọ:</span>
                <strong className="text-[#E5D7B7] truncate max-w-[170px]">
                  {propertySummary.primaryBuildingName}
                </strong>
              </div>
            </div>

            {/* All 8 items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#B89C66] text-[#0F223A] font-bold'
                        : 'text-slate-200 hover:bg-white/10 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#0F223A]' : 'text-[#B89C66]'}`} />
                      <div className="min-w-0">
                        <span className="text-sm block">{item.label}</span>
                        <span
                          className={`text-xs block truncate ${
                            isActive ? 'text-[#0F223A]/80' : 'text-slate-400'
                          }`}
                        >
                          {item.description}
                        </span>
                      </div>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isActive
                            ? 'bg-[#0F223A] text-[#B89C66]'
                            : item.badgeTone === 'urgent'
                            ? 'bg-amber-400 text-[#0F223A]'
                            : 'bg-white/10 text-slate-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-white/10 space-y-2">
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/5 text-sm font-medium text-white flex items-center justify-between"
                >
                  <span>Cổng Quản trị viên</span>
                  <ExternalLink className="w-4 h-4 text-[#B89C66]" />
                </Link>
              )}
              <button
                type="button"
                onClick={onLogout}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-rose-950/60 text-rose-200 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
