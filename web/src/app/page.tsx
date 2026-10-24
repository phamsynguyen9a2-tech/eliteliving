'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import TopKWidget from '@/components/TopKWidget';
import BookingModal from '@/components/BookingModal';
import BuildingDetailModal from '@/components/BuildingDetailModal';
import EliteRadarMapModal from '@/components/EliteRadarMapModal';
import EliteSelect from '@/components/EliteSelect';
import Footer from '@/components/Footer';
import TenantJourney from '@/components/TenantJourney';
import MotionPage from '@/components/MotionPage';
import SwipeRail from '@/components/SwipeRail';
import { useDiscoveryQuery } from '@/lib/use-discovery-query';
import { Room, Building } from '@/lib/types';
import { Search, MapPin, SlidersHorizontal, Home, Sparkles, Filter, ChevronLeft, ChevronRight, Zap, CheckCircle2, Building2, Grid, LayoutGrid, Eye, Coins, Flame, ShieldCheck, X, PawPrint, Compass } from 'lucide-react';
import Link from 'next/link';

const DISTRICTS = [
  { id: 'all', name: 'Tất cả khu vực (73 tòa nhà)', label: 'Tất cả TP.HCM', count: '73 tòa' },
  { id: 'tân phú', name: 'Quận Tân Phú (10 tòa nhà)', label: 'Quận Tân Phú', count: '10 tòa' },
  { id: 'tân bình', name: 'Quận Tân Bình (8 tòa nhà)', label: 'Quận Tân Bình', count: '8 tòa' },
  { id: 'bình tân', name: 'Quận Bình Tân (6 tòa nhà)', label: 'Quận Bình Tân', count: '6 tòa' },
  { id: 'gò vấp', name: 'Quận Gò Vấp (5 tòa nhà)', label: 'Quận Gò Vấp', count: '5 tòa' },
  { id: 'bình thạnh', name: 'Quận Bình Thạnh (5 tòa nhà)', label: 'Quận Bình Thạnh', count: '5 tòa' },
  { id: 'thủ đức', name: 'TP. Thủ Đức (5 tòa nhà)', label: 'TP. Thủ Đức', count: '5 tòa' },
  { id: 'quận 7', name: 'Quận 7 (5 tòa nhà)', label: 'Quận 7', count: '5 tòa' },
  { id: 'quận 12', name: 'Quận 12 (5 tòa nhà)', label: 'Quận 12', count: '5 tòa' },
  { id: 'phú nhuận', name: 'Quận Phú Nhuận (4 tòa nhà)', label: 'Quận Phú Nhuận', count: '4 tòa' },
  { id: 'quận 10', name: 'Quận 10 (4 tòa nhà)', label: 'Quận 10', count: '4 tòa' },
  { id: 'quận 3', name: 'Quận 3 (4 tòa nhà)', label: 'Quận 3', count: '4 tòa' },
  { id: 'quận 1', name: 'Quận 1 (4 tòa nhà)', label: 'Quận 1', count: '4 tòa' },
  { id: 'quận 6', name: 'Quận 6 (4 tòa nhà)', label: 'Quận 6', count: '4 tòa' },
  { id: 'quận 8', name: 'Quận 8 (4 tòa nhà)', label: 'Quận 8', count: '4 tòa' },
];

const PRICE_RANGES = [
  { label: 'Tất cả mức giá', min: 0, max: 0 },
  { label: 'Dưới 4 triệu', min: 0, max: 4000000 },
  { label: '4 – 6 triệu', min: 4000000, max: 6000000 },
  { label: '6 – 9 triệu', min: 6000000, max: 9000000 },
  { label: 'Trên 9 triệu', min: 9000000, max: 20000000 }
];

export default function TenantHomePage() {
  const [viewMode, setViewMode] = useState<'BUILDING' | 'ROOM'>('BUILDING');
  const [page, setPage] = useState(1);

  // Filters
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Advanced Tenant Search Filters (Người ở, Xe, Điện, Dịch vụ, Thú cưng, Ngày vào, Dạng phòng)
  const [occupants, setOccupants] = useState('all'); // 'all' | '1' | '2' | '3-4' | 'family'
  const [bikes, setBikes] = useState('all'); // 'all' | '1' | '2' | '3+' | 'car'
  const [electricityType, setElectricityType] = useState('all'); // 'all' | 'cheap' (< 3.8k)
  const [serviceFeeType, setServiceFeeType] = useState('all'); // 'all' | 'free'
  const [petFriendly, setPetFriendly] = useState('all'); // 'all' | 'true' | 'false'
  const [moveInTime, setMoveInTime] = useState('all'); // 'all' | 'immediate' | 'next_month'
  const [roomType, setRoomType] = useState('all'); // 'all' | 'gac_lung' | 'studio' | '1pn' | '2pn'
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);

  const activeAdvancedCount = [
    occupants !== 'all',
    bikes !== 'all',
    electricityType !== 'all',
    serviceFeeType !== 'all',
    petFriendly !== 'all',
    moveInTime !== 'all',
    roomType !== 'all',
  ].filter(Boolean).length;

  const handleResetAdvancedFilters = () => {
    setOccupants('all');
    setBikes('all');
    setElectricityType('all');
    setServiceFeeType('all');
    setPetFriendly('all');
    setMoveInTime('all');
    setRoomType('all');
    setPage(1);
  };

  // Modals
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
  const [isRadarMapOpen, setIsRadarMapOpen] = useState(false);

  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<Room | null>(null);
  // Mã lượt hiển thị gợi ý Top-K khi đặt lịch từ danh sách gợi ý (để đo tỉ lệ chuyển đổi)
  const [bookingRecommendationId, setBookingRecommendationId] = useState<string | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const priceFilter = PRICE_RANGES[selectedPriceRange];
  const commonParams = new URLSearchParams({ district: selectedDistrict });
  if (priceFilter.min > 0) commonParams.set('minPrice', String(priceFilter.min));
  if (priceFilter.max > 0) commonParams.set('maxPrice', String(priceFilter.max));
  if (searchKeyword) commonParams.set('search', searchKeyword);
  if (roomType !== 'all') commonParams.set('roomType', roomType);
  const buildingParams = new URLSearchParams(commonParams);
  buildingParams.set('summary', 'true');
  const roomParams = new URLSearchParams(commonParams);
  roomParams.set('page', String(page));
  roomParams.set('limit', '12');
  roomParams.set('sort', sortBy);
  if (electricityType === 'cheap') roomParams.set('maxElectricity', '3800');
  if (serviceFeeType === 'free') roomParams.set('freeService', 'true');
  if (petFriendly === 'true') roomParams.set('petFriendly', 'true');
  if (occupants !== 'all') roomParams.set('occupants', occupants);
  if (bikes !== 'all') roomParams.set('bikes', bikes);
  if (moveInTime !== 'all') roomParams.set('moveInTime', moveInTime);

  const buildingQuery = useDiscoveryQuery<{ total: number; items: Building[] }>(viewMode === 'BUILDING' ? '/api/buildings?' + buildingParams : null);
  const roomQuery = useDiscoveryQuery<{ total: number; totalPages: number; items: Room[] }>(viewMode === 'ROOM' ? '/api/rooms?' + roomParams : null);
  const isUnfilteredBuildingView = viewMode === 'BUILDING' && selectedDistrict === 'all' && !searchKeyword && selectedPriceRange === 0 && roomType === 'all';
  const radarQuery = useDiscoveryQuery<{ total: number; items: Building[] }>(isRadarMapOpen && !isUnfilteredBuildingView ? '/api/buildings?district=all&summary=true' : null);
  const buildings = buildingQuery.data?.items ?? [];
  const rooms = roomQuery.data?.items ?? [];
  const total = roomQuery.data?.total ?? 0;
  const totalPages = roomQuery.data?.totalPages ?? 1;
  const allBuildings = isUnfilteredBuildingView ? buildings : radarQuery.data?.items ?? [];
  const activeRadarQuery = isUnfilteredBuildingView ? buildingQuery : radarQuery;
  const radarReady = activeRadarQuery.data !== null && activeRadarQuery.isCurrent;
  const activeQuery = viewMode === 'BUILDING' ? buildingQuery : roomQuery;
  const loading = activeQuery.loading;
  const loadError = activeQuery.error;
  const hasResults = viewMode === 'BUILDING' ? buildings.length > 0 : rooms.length > 0;

  // Keep the existing refresh entry points, but only load the visible view.
  const fetchBuildings = async () => { buildingQuery.refresh(); };
  const fetchRooms = async () => { roomQuery.refresh(); };
  const loadData = async () => {
    if (viewMode === 'BUILDING') await fetchBuildings();
    else await fetchRooms();
  };

  useEffect(() => {
    const districtFromUrl = new URLSearchParams(window.location.search).get('district')?.toLowerCase();
    if (districtFromUrl && DISTRICTS.some((district) => district.id === districtFromUrl)) {
      const timer = window.setTimeout(() => setSelectedDistrict(districtFromUrl), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (activeAdvancedCount > 0) {
      const timer = window.setTimeout(() => setViewMode('ROOM'), 0);
      return () => window.clearTimeout(timer);
    }
  }, [activeAdvancedCount]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setViewMode('ROOM');
    if (viewMode === 'ROOM' && page === 1) roomQuery.refresh();
    setTimeout(() => {
      const el = document.getElementById('danh-sach-toa-nha');
      if (el) {
        el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      }
    }, 120);
  };

  const handleOpenBuildingModal = (b: Building) => {
    setSelectedBuilding(b);
    setIsBuildingModalOpen(true);
  };

  const handleOpenBooking = (room: Room, recommendationId?: string | null) => {
    if (room.status === 'RESERVED' || room.status === 'RENTED') return;
    setSelectedRoomForBooking(room);
    setBookingRecommendationId(recommendationId ?? null);
    setIsBookingOpen(true);
  };

  return (
    <MotionPage className="min-h-screen bg-[#F8F8F6] text-[#0F223A] flex flex-col font-sans">
      <Navbar />

      {/* LUXURY HERO BANNER MATCHING DESIGN */}
      <section className="relative w-full overflow-hidden bg-[#FAF9F7] border-b border-[#E5E3DE]">
        {/* Living Room Visual Canvas */}
        <div className="relative w-full h-[220px] sm:h-[280px] md:h-[330px] bg-slate-900 overflow-hidden flex flex-col justify-end">
          {/* Background image: Ultra-luxury penthouse apartment */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 hover:scale-105"
            style={{
              backgroundImage: `url('/hero-luxury-penthouse.jpg')`,
              backgroundPosition: 'center 45%'
            }}
          />

          {/* Gentle lighting vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/15 pointer-events-none" />

          {/* Sparkle Star Glint on the right */}
          <div className="absolute right-8 sm:right-16 top-1/2 -translate-y-1/2 pointer-events-none">
            <div className="relative w-7 h-7 flex items-center justify-center animate-pulse">
              <Sparkles className="w-6 h-6 text-white/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]" aria-hidden="true" />
            </div>
          </div>

          {/* Translucent Frosted Glass Ribbon at bottom of banner */}
          <div className="relative z-10 w-full bg-white/85 backdrop-blur-md border-t border-white/60 py-2.5 sm:py-3 px-4 shadow-xs text-center">
            <p className="text-[#B89C66] text-xs sm:text-sm md:text-base font-bold tracking-[0.18em] sm:tracking-[0.24em] uppercase font-sans">
              Căn hộ dịch vụ &amp; phòng trọ cho thuê tại TP.HCM
            </p>
          </div>
        </div>

        {/* Search Bar & Quick Filters Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Header Texts */}
          <div data-reveal className="text-center max-w-3xl mx-auto mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FAF0DC] text-[#8C6D34] text-xs font-bold mb-3 border border-[#E8D4B0] shadow-xs">
              <Home className="w-3.5 h-3.5" aria-hidden="true" />
              <span>73 tòa nhà · 14 khu vực tại TP.HCM</span>
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-[#0F223A] tracking-tight leading-[1.18]">
              Tìm phòng trọ và căn hộ dịch vụ tại TP.HCM
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mt-3 max-w-2xl mx-auto leading-relaxed">
              Hơn 1.335 căn hộ &amp; studio thuộc 73 tòa nhà ở 14 khu vực của TP.HCM (Tân Phú, Tân Bình, Bình Tân, Gò Vấp, Bình Thạnh, Phú Nhuận, Thủ Đức, Q.1, Q.3, Q.7, Q.10, Q.12, Q.6, Q.8). Dữ liệu &amp; hình ảnh căn hộ tổng hợp từ hệ thống đối tác vận hành, cửa khóa vân tay.
            </p>

            {/* Micro Trust Pills */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap mt-4 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-[#B89C66]" />
                <span>Hình ảnh &amp; thông tin đối tác rõ ràng</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <ShieldCheck className="w-4 h-4 text-[#B89C66]" />
                <span>Giá niêm yết, không phát sinh phí</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Đặt lịch xem phòng online</span>
              </span>
            </div>
          </div>

          {/* Luxury Integrated Search Card */}
          <div className="max-w-5xl mx-auto bg-white rounded-[28px] p-4 sm:p-6 shadow-2xl shadow-slate-900/10 border border-[#E5E3DE]">
            {/* 1. Seamless Segmented District Tabs (14 Quận/TP.HCM) */}
            <SwipeRail label="Khu vực tìm phòng" className="p-2 bg-[#FAF8F5] border border-[#E5E3DE] rounded-2xl mb-4">
              {DISTRICTS.map((d) => {
                const active = selectedDistrict === d.id;
                const Icon = d.id === 'all' ? Building2 : MapPin;
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setSelectedDistrict(d.id);
                      setPage(1);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                      active
                        ? 'bg-[#0F223A] text-white shadow-md scale-[1.01]'
                        : 'text-[#64748B] hover:text-[#0F223A] hover:bg-white border border-transparent hover:border-[#E5E3DE]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#B89C66]' : 'text-slate-400'}`} />
                    <span>{d.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                        active ? 'bg-[#B89C66]/25 text-[#FAF0DC]' : 'bg-[#E5E3DE]/70 text-[#64748B]'
                      }`}
                    >
                      {d.count}
                    </span>
                  </button>
                );
              })}
            </SwipeRail>

            {/* 2. Primary Search Bar & Actions */}
            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div className="flex flex-col md:flex-row gap-2.5 items-stretch">
                {/* Field 1: Keyword / Street / Building */}
                <div className="flex-1 flex items-center gap-3 px-3.5 py-2.5 bg-[#FAF8F5] focus-within:bg-white focus-within:border-[#B89C66] focus-within:ring-4 focus-within:ring-[#B89C66]/15 border border-[#E5E3DE] rounded-2xl transition-all">
                  <Search className="w-5 h-5 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <label htmlFor="tenant-search-keyword" className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider leading-none mb-1">
                      Bạn muốn ở đâu?
                    </label>
                    <input
                      id="tenant-search-keyword"
                      type="text"
                      placeholder="Tên đường, tòa nhà hoặc trường học"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className="w-full text-xs sm:text-sm font-semibold text-[#0F223A] placeholder:text-slate-400 outline-none bg-transparent truncate"
                    />
                  </div>
                  {searchKeyword && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchKeyword('');
                        setPage(1);
                      }}
                      className="text-slate-400 hover:text-[#0F223A] p-1.5 rounded-full hover:bg-[#E5E3DE]/70 cursor-pointer"
                      aria-label="Xóa từ khóa tìm kiếm"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                {/* Field 2: Price Filter (Custom Animated EliteSelect) */}
                <div className="w-full md:w-60 flex items-center gap-2.5 px-3 py-1.5 bg-[#FAF8F5] border border-[#E5E3DE] rounded-2xl transition-all">
                  <Coins className="w-5 h-5 text-[#B89C66] shrink-0 ml-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider leading-none mb-0.5">
                      Giá thuê
                    </span>
                    <EliteSelect
                      value={String(selectedPriceRange)}
                      onChange={(val) => {
                        setSelectedPriceRange(Number(val));
                        setPage(1);
                      }}
                      options={PRICE_RANGES.map((r, i) => ({
                        value: String(i),
                        label: r.label,
                      }))}
                      size="sm"
                      triggerClassName="!border-0 !bg-transparent !px-0 !py-0.5 !shadow-none"
                      panelClassName="!w-64"
                      ariaLabel="Chọn mức giá thuê"
                    />
                  </div>
                </div>

                {/* Field 3: Spatial Radar Map Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsRadarMapOpen(true)}
                  className="px-4 py-3 rounded-2xl bg-[#0F223A] hover:bg-[#193354] text-white border border-[#B89C66]/50 text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-md"
                >
                  <Compass className="w-4 h-4 text-[#B89C66] animate-spin" style={{ animationDuration: '9s' }} />
                  <span>Xem bản đồ</span>
                </button>

                {/* Field 4: Advanced Filter Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
                  className={`px-4 py-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
                    isAdvancedFilterOpen || activeAdvancedCount > 0
                      ? 'bg-[#FAF7F2] border-[#B89C66] text-[#8C6D37] shadow-xs'
                      : 'bg-[#FAF8F5] border-[#E5E3DE] text-[#64748B] hover:text-[#0F223A] hover:border-[#B89C66]'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 text-[#B89C66]" />
                  <span>Lọc thêm</span>
                  {activeAdvancedCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#B89C66] text-white text-[10px] flex items-center justify-center font-bold">
                      {activeAdvancedCount}
                    </span>
                  )}
                </button>

                {/* Field 5: Submit Button */}
                <button
                  type="submit"
                  className="w-full md:w-auto px-6 py-3.5 bg-[#B89C66] hover:bg-[#A38752] text-white text-xs sm:text-sm font-bold uppercase tracking-wider rounded-2xl shadow-lg shadow-[#B89C66]/25 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-95"
                >
                  <Search className="w-4 h-4 text-white" />
                  <span>Tìm phòng</span>
                </button>
              </div>

              {/* 3. Deep Advanced Filter Drawer (Khách hàng cần: Người ở, Số xe, Giá điện, Thú cưng, Ngày vào, Dạng phòng) */}
              {isAdvancedFilterOpen && (
                <div className="pt-4 mt-3 border-t border-[#E5E3DE] animate-in fade-in duration-200 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E5E3DE]">
                    {/* Dạng phòng */}
                    <div>
                      <p className="block text-[11px] font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                        Loại phòng
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'all', label: 'Tất cả' },
                          { id: 'gac_lung', label: 'Gác lửng đúc' },
                          { id: 'studio', label: 'Studio không gác' },
                          { id: '1pn', label: '1 phòng ngủ' },
                          { id: '2pn', label: '2 phòng ngủ' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setRoomType(item.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              roomType === item.id
                                ? 'bg-[#B89C66] text-white border-[#B89C66] shadow-xs'
                                : 'bg-white border-[#E5E3DE] text-[#64748B] hover:border-[#B89C66]'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Số người ở */}
                    <div>
                      <p className="block text-[11px] font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                        Số người ở
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'all', label: 'Tất cả' },
                          { id: '1', label: '1 người' },
                          { id: '2', label: '2 người' },
                          { id: '3-4', label: '3 - 4 người' },
                          { id: 'family', label: '5 người trở lên' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setOccupants(item.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              occupants === item.id
                                ? 'bg-[#B89C66] text-white border-[#B89C66] shadow-xs'
                                : 'bg-white border-[#E5E3DE] text-[#64748B] hover:border-[#B89C66]'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Số lượng xe máy & Ô tô */}
                    <div>
                      <p className="block text-[11px] font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                        Chỗ để xe
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'all', label: 'Tất cả' },
                          { id: '1', label: '1 xe máy' },
                          { id: '2', label: '2 xe máy' },
                          { id: '3+', label: '3+ xe máy' },
                          { id: 'car', label: 'Chỗ đỗ ô tô' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setBikes(item.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              bikes === item.id
                                ? 'bg-[#B89C66] text-white border-[#B89C66] shadow-xs'
                                : 'bg-white border-[#E5E3DE] text-[#64748B] hover:border-[#B89C66]'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Nuôi thú cưng */}
                    <div>
                      <p className="block text-[11px] font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                        Thú cưng
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'all', label: 'Tất cả', icon: null },
                          { id: 'true', label: 'Cho nuôi thú cưng', icon: PawPrint },
                          { id: 'false', label: 'Không nuôi thú cưng', icon: null },
                        ].map((item) => {
                          const OptionIcon = item.icon;
                          return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setPetFriendly(item.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              petFriendly === item.id
                                ? 'bg-[#B89C66] text-white border-[#B89C66] shadow-xs'
                                : 'bg-white border-[#E5E3DE] text-[#64748B] hover:border-[#B89C66]'
                            }`}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              {OptionIcon && <OptionIcon className="w-3.5 h-3.5" aria-hidden="true" />}
                              {item.label}
                            </span>
                          </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Ràng buộc giá điện & Dịch vụ */}
                    <div>
                      <p className="block text-[11px] font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                        Tiền điện &amp; phí dịch vụ
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'all', label: 'Tất cả mức giá', icon: null },
                          { id: 'cheap', label: 'Điện rẻ (< 3.800 đ/kWh)', icon: Zap },
                          { id: 'free', label: 'Miễn phí dịch vụ', icon: null },
                        ].map((item) => {
                          const OptionIcon = item.icon;
                          return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              if (item.id === 'cheap') setElectricityType('cheap');
                              else if (item.id === 'free') setServiceFeeType('free');
                              else {
                                setElectricityType('all');
                                setServiceFeeType('all');
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              (item.id === 'cheap' && electricityType === 'cheap') ||
                              (item.id === 'free' && serviceFeeType === 'free') ||
                              (item.id === 'all' && electricityType === 'all' && serviceFeeType === 'all')
                                ? 'bg-[#B89C66] text-white border-[#B89C66] shadow-xs'
                                : 'bg-white border-[#E5E3DE] text-[#64748B] hover:border-[#B89C66]'
                            }`}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              {OptionIcon && <OptionIcon className="w-3.5 h-3.5" aria-hidden="true" />}
                              {item.label}
                            </span>
                          </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Thời gian dọn vào ở */}
                    <div>
                      <p className="block text-[11px] font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                        Thời gian dọn vào ở
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'all', label: 'Tất cả', disabled: false },
                          { id: 'immediate', label: 'Dọn vào ngay tuần này', disabled: false },
                          { id: 'next_month', label: 'Đầu tháng tới (sắp hỗ trợ)', disabled: true },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setMoveInTime(item.id)}
                            disabled={item.disabled}
                            title={item.disabled ? 'Bộ lọc theo ngày sẵn sàng đang được hoàn thiện' : undefined}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              moveInTime === item.id
                                ? 'bg-[#B89C66] text-white border-[#B89C66] shadow-xs'
                                : 'bg-white border-[#E5E3DE] text-[#64748B] hover:border-[#B89C66] disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Reset & Apply Footer */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={handleResetAdvancedFilters}
                      className="text-[#64748B] hover:text-[#0F223A] font-semibold underline cursor-pointer"
                    >
                      Xóa bộ lọc
                    </button>

                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#0F223A] hover:bg-[#142A45] text-white font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Áp dụng ({activeAdvancedCount})
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Quick Hotspot Streets & Quick Tag discovery */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap mt-5 text-xs max-w-4xl mx-auto">
            <span className="inline-flex items-center gap-1 text-[#64748B] font-bold mr-1">
              <Flame className="w-3.5 h-3.5 text-[#B89C66]" />
              <span>Tìm theo tuyến đường:</span>
            </span>
            {[
              'Lê Trọng Tấn',
              'Tây Thạnh',
              'Cộng Hòa',
              'Lê Đức Thọ',
              'Đường D2',
              'Phan Xích Long',
              'Sư Vạn Hạnh',
              'Nguyễn Thị Thập',
              'Thảo Điền',
              'Lê Văn Sỹ',
              'Dương Bá Trạc',
              'Tân Hòa Đông',
            ].map((st) => {
              const isSelected = searchKeyword === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSearchKeyword('');
                    } else {
                      setSearchKeyword(st);
                    }
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-full border text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                    isSelected
                      ? 'bg-[#0F223A] text-white border-[#0F223A]'
                      : 'bg-white text-[#64748B] border-[#E5E3DE] hover:border-[#B89C66] hover:text-[#B89C66] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <MapPin className="w-3 h-3 text-[#B89C66]" />
                  <span>{st}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Platform Metrics Ribbon (Social Proof) - BRAND ROADMAP COMPLIANT */}
          <div data-reveal-group className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mt-8 pt-6 border-t border-[#E5E3DE] text-center">
            <div className="flex flex-col items-center">
              <span className="text-xl sm:text-2xl font-black text-[#0F223A]">73</span>
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mt-0.5">
                Tòa nhà
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl sm:text-2xl font-black text-[#B89C66]">1.335+</span>
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mt-0.5">
                Căn hộ &amp; studio
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl sm:text-2xl font-black text-[#0F223A]">14</span>
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mt-0.5">
                Khu vực
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl sm:text-2xl font-black text-[#B89C66]">0đ</span>
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mt-0.5">
                Phí môi giới
              </span>
            </div>
          </div>
        </div>
      </section>

      <TenantJourney />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* TOP-K RECOMMENDATION MODULE */}
        <TopKWidget onBookRoom={handleOpenBooking} onOpenRadarMap={() => setIsRadarMapOpen(true)} />

        {/* LISTING HEADER & VIEW MODE TOGGLE */}
        <div data-reveal id="danh-sach-toa-nha" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-4 scroll-mt-24">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#B89C66]" />
              <span>
                {viewMode === 'BUILDING'
                  ? `Danh sách tòa nhà (${loading && !buildingQuery.data ? '…' : buildings.length})`
                  : `Tất cả phòng (${loading && !roomQuery.data ? '…' : total})`}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {viewMode === 'BUILDING'
                ? 'Bấm vào một tòa nhà để xem phòng trống và ảnh từng phòng'
                : 'Xem từng phòng riêng lẻ'}
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
              <button
                onClick={() => setViewMode('BUILDING')}
                aria-pressed={viewMode === 'BUILDING'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'BUILDING'
                    ? 'bg-white text-[#8C6D37] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Theo tòa nhà</span>
              </button>
              <button
                onClick={() => setViewMode('ROOM')}
                aria-pressed={viewMode === 'ROOM'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'ROOM'
                    ? 'bg-white text-[#8C6D37] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Theo phòng</span>
              </button>
              <button
                type="button"
                onClick={() => setIsRadarMapOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F223A] text-[#FAF0DC] hover:bg-[#193354] transition-all cursor-pointer shadow-xs"
              >
                <Compass className="w-3.5 h-3.5 text-[#B89C66]" />
                <span>Bản đồ</span>
              </button>
            </div>

            {viewMode === 'ROOM' && (
              <div className="w-44">
                <EliteSelect
                  value={sortBy}
                  onChange={(val) => setSortBy(val)}
                  options={[
                    { value: 'newest', label: 'Mới nhất' },
                    { value: 'price_asc', label: 'Giá: Thấp → Cao' },
                    { value: 'price_desc', label: 'Giá: Cao → Thấp' },
                  ]}
                  size="sm"
                  ariaLabel="Sắp xếp danh sách phòng"
                />
              </div>
            )}
          </div>
        </div>

        {/* LOADING STATE */}
        {loadError && (
          <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#B89C66]/40 bg-[#FAF7F2] p-4 text-sm text-[#0F223A]">
            <span>{loadError}{hasResults ? ' Đang hiển thị kết quả trước đó.' : ''}</span>
            <button type="button" onClick={() => loadData()} className="rounded-xl bg-[#B89C66] px-4 py-2 text-xs font-bold text-white hover:bg-[#A38752]">Thử lại</button>
          </div>
        )}
        {loading && hasResults && <p role="status" className="mb-4 text-xs text-[#64748B]">Đang cập nhật kết quả…</p>}
        {loading && !hasResults ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs animate-pulse h-96"></div>
            ))}
          </div>
        ) : loadError && !hasResults ? null : viewMode === 'BUILDING' ? (
          /* ========================================================= */
          /* MODE 1: BUILDINGS VIEW (Nhóm theo Tòa nhà / Dự án)        */
          /* ========================================================= */
          buildings.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <p className="text-base font-semibold text-slate-700">Không tìm thấy tòa nhà nào phù hợp</p>
              <p className="text-xs text-slate-500 mt-1">Thử xóa bộ lọc để xem tất cả tòa nhà.</p>
            </div>
          ) : (
            <div data-reveal-group className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {buildings.map((b) => (
                <div
                  key={b.code}
                  className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-2xl transition-all duration-300 flex flex-col group hover:-translate-y-1"
                >
                  {/* Building Image Container */}
                  <div className="relative h-56 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={b.featured_image || b.images[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600'}
                      alt={b.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Available rooms badge */}
                    <div className="absolute top-3 left-3">
                      <span className="text-xs font-extrabold px-3 py-1 rounded-full shadow-md bg-[#0F223A]/90 text-white border border-[#B89C66]/40 flex items-center gap-1.5 backdrop-blur-xs">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                        Còn trống {b.available_rooms} / {b.total_rooms} phòng
                      </span>
                    </div>

                    {/* District & Distance badge */}
                    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#E5D7B7]" />
                      <span>{b.district} • {b.distance_to_huit_km} km</span>
                    </div>

                    {/* Building code tag */}
                    <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-xs text-white text-xs font-black px-2.5 py-1 rounded-lg border border-slate-800">
                      Mã DA: {b.code}
                    </div>

                    {/* Photos count */}
                    <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                      {b.images.length} ảnh
                    </div>
                  </div>

                  {/* Building Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3
                        onClick={() => handleOpenBuildingModal(b)}
                        className="font-bold text-base text-slate-900 line-clamp-1 group-hover:text-[#A38752] transition-colors cursor-pointer"
                        title={b.name}
                      >
                        {b.name}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span>{b.address}</span>
                      </p>

                      {/* Amenities chips */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {b.amenities.slice(0, 4).map((a, i) => (
                          <span
                            key={i}
                            className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                          >
                            {a}
                          </span>
                        ))}
                        {b.amenities.length > 4 && (
                          <span className="text-[11px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md">
                            +{b.amenities.length - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price Range & Action */}
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Giá thuê</span>
                        <span className="text-sm font-extrabold text-[#8C6D37]">
                          {(b.min_price / 1000000).toFixed(1)} - {(b.max_price / 1000000).toFixed(1)} Tr/th
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenBuildingModal(b)}
                        className="px-4 py-2 bg-[#B89C66] hover:bg-[#A38752] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#B89C66]/25 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem {b.available_rooms} phòng trống</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* ========================================================= */
          /* MODE 2: ROOMS VIEW (Xem từng phòng lẻ nếu cần)            */
          /* ========================================================= */
          rooms.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#E5E3DE] shadow-xs max-w-2xl mx-auto my-6">
              <div className="w-16 h-16 rounded-2xl bg-[#FAF8F5] border border-[#E5E3DE] flex items-center justify-center mx-auto mb-4 text-[#B89C66]">
                <Search className="w-8 h-8 text-[#B89C66]" />
              </div>
              <h3 className="text-lg font-bold text-[#0F223A] mb-1">
                Không có phòng nào khớp với bộ lọc
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
                Thử bỏ bớt điều kiện về khu vực, giá, loại phòng hoặc chỗ để xe.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchKeyword('');
                  setSelectedDistrict('all');
                  setSelectedPriceRange(0);
                  handleResetAdvancedFilters();
                }}
                className="px-6 py-2.5 bg-[#B89C66] hover:bg-[#A38752] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#B89C66]/20 cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <>
              <div data-reveal-group className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {rooms.map((room) => {
                  const isBookable = room.status === 'AVAILABLE' || room.status === 'BOOKED_VIEWING';
                  const statusColor =
                    room.status === 'AVAILABLE'
                      ? 'bg-[#FAF0DC] text-[#8C6D37]'
                      : room.status === 'BOOKED_VIEWING'
                      ? 'bg-[#F0F4F8] text-[#0F223A]'
                      : room.status === 'RESERVED'
                      ? 'bg-[#0F223A] text-white border border-[#B89C66]/40'
                      : 'bg-slate-200 text-slate-700';

                  const statusText =
                    room.status === 'AVAILABLE'
                      ? 'Còn trống'
                      : room.status === 'BOOKED_VIEWING'
                      ? 'Đã đặt lịch'
                      : room.status === 'RESERVED'
                      ? 'Giữ chỗ'
                      : 'Đang thuê';

                  return (
                    <div
                      key={room.id}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group hover:-translate-y-1"
                    >
                      <Link href={`/phong/${room.id}`} className="relative h-48 w-full bg-slate-100 overflow-hidden block">
                        <img
                          src={room.images[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600'}
                          alt={room.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs ${statusColor}`}>
                            {statusText}
                          </span>
                        </div>
                        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {room.district} • {room.area} m²
                        </div>
                        <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded">
                          {room.room_code}
                        </div>
                        {room.has_balcony && (
                          <div className="absolute bottom-2 right-2 bg-[#0F223A]/90 border border-[#B89C66]/40 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            Ban công
                          </div>
                        )}
                      </Link>

                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <Link
                            href={`/phong/${room.id}`}
                            className="font-bold text-sm text-slate-900 line-clamp-1 group-hover:text-[#A38752] transition-colors block"
                          >
                            {room.title}
                          </Link>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1 flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span>{room.address}</span>
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {room.amenities.slice(0, 3).map((a, i) => (
                              <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Giá thuê tháng</span>
                            <span className="text-base font-extrabold text-[#8C6D37]">
                              {room.price.toLocaleString('vi-VN')} đ
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/phong/${room.id}`}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                            >
                              Chi tiết
                            </Link>
                            <button
                              onClick={() => handleOpenBooking(room)}
                              disabled={!isBookable}
                              className="px-3 py-1.5 bg-[#B89C66] hover:bg-[#A38752] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                            >
                              {room.status === 'AVAILABLE'
                                ? 'Đặt lịch'
                                : room.status === 'BOOKED_VIEWING'
                                ? 'Chọn giờ khác'
                                : room.status === 'RESERVED'
                                ? 'Đang giữ chỗ'
                                : 'Đang thuê'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold text-slate-700 px-4">
                    Trang {page} / {totalPages} (Tổng {total} phòng)
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )
        )}
      </main>

      {/* SPATIAL RADAR MAP MODAL (Single-Point & Multi-Point Centroid Radar) */}
      {isRadarMapOpen && !radarReady && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F223A]/45 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="radar-loading-title" onKeyDown={(event) => { if (event.key === 'Escape') setIsRadarMapOpen(false); }} className="w-full max-w-md rounded-3xl bg-white p-6 text-[#0F223A] shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h2 id="radar-loading-title" className="font-bold">Bản đồ tòa nhà</h2>
              <button type="button" autoFocus onClick={() => setIsRadarMapOpen(false)} aria-label="Đóng bản đồ" className="rounded-xl p-2 hover:bg-[#F8F8F6]"><X className="h-5 w-5" /></button>
            </div>
            <p role={activeRadarQuery.error ? 'alert' : 'status'} className="mt-5 text-sm text-slate-500">{activeRadarQuery.error || 'Đang tải các tòa nhà trên bản đồ…'}</p>
            {activeRadarQuery.error && <button type="button" onClick={activeRadarQuery.refresh} className="mt-4 rounded-xl bg-[#B89C66] px-4 py-2 text-sm font-bold text-white hover:bg-[#A38752]">Thử lại</button>}
          </div>
        </div>
      )}
      <EliteRadarMapModal
        isOpen={isRadarMapOpen && radarReady}
        onClose={() => setIsRadarMapOpen(false)}
        buildings={allBuildings}
        onSelectBuilding={(b) => handleOpenBuildingModal(b)}
        initialQuery={searchKeyword}
      />

      {/* BUILDING DETAIL MODAL (Room Matrix & Dynamic Gallery) */}
      <BuildingDetailModal
        building={selectedBuilding}
        isOpen={isBuildingModalOpen}
        onClose={() => setIsBuildingModalOpen(false)}
        onBookRoom={(room) => {
          setIsBuildingModalOpen(false);
          handleOpenBooking(room);
        }}
      />

      {/* BOOKING MODAL (Concurrency Controlled) */}
      <BookingModal
        room={selectedRoomForBooking}
        recommendationId={bookingRecommendationId}
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* TRUST PILLARS & SERVICES SECTION */}
      <section id="services" className="bg-white border-y border-slate-200/80 py-14 mt-12 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-reveal className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#B89C66] bg-[#FAF0DC] px-3.5 py-1 rounded-full border border-[#E8D4B0]">
              Dịch vụ
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F223A] mt-2">
              Thuê qua Elite Living, bạn có gì
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Bốn điều áp dụng cho mọi tòa nhà trên trang.
            </p>
          </div>

          <div data-reveal-group className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#FAF0DC] text-[#8C6D37] flex items-center justify-center font-bold mb-3.5">
                <Eye className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Nguồn dữ liệu &amp; hình ảnh minh bạch</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Hình ảnh phòng, ban công, gác và tiện ích được đồng bộ từ đối tác vận hành (EZhouse) tại TP.HCM để khách thuê đối chiếu khi đi xem.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#0F223A] text-[#B89C66] flex items-center justify-center font-bold mb-3.5">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Không trùng lịch xem</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Khung giờ bạn đặt được giữ riêng cho bạn, người khác không đặt trùng được.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#FAF0DC] text-[#8C6D37] flex items-center justify-center font-bold mb-3.5">
                <Coins className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Giá ghi rõ từ đầu</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Tiền phòng, điện 3.800đ, nước 25.000đ và tiền cọc đều ghi trong hợp đồng. Không thu thêm khoản nào khác.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#0F223A] text-[#B89C66] flex items-center justify-center font-bold mb-3.5">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Cửa vân tay, camera từng tầng</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Cổng mở bằng vân tay, có camera ở mỗi tầng. Giờ giấc tự do, không ở chung chủ.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT US SECTION */}
      <section id="about-us" className="bg-[#FAF9F7] border-b border-[#E5E3DE] py-16 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div data-reveal="left">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#B89C66] bg-[#FAF0DC] px-3.5 py-1.5 rounded-full border border-[#E8D4B0]">
                Về chúng tôi
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-[#0F223A] mt-4 tracking-tight leading-snug">
                Elite Living quản lý và cho thuê căn hộ dịch vụ tại TP.HCM
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-4 leading-relaxed">
                Chúng tôi cho sinh viên và người đi làm thuê phòng, tập trung ở Tân Phú (quanh Đại học Công Thương TP.HCM – HUIT) và các khu vực lân cận.
              </p>
              <p className="text-slate-600 text-sm mt-3 leading-relaxed">
                Tòa nhà nào cũng đạt yêu cầu phòng cháy chữa cháy (PCCC), có khóa vân tay và người hỗ trợ 24/7. Giá và điều khoản ghi đủ trong hợp đồng trước khi bạn ký.
              </p>

              <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-200">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-[#0F223A]">1.335+</div>
                  <div className="text-xs text-slate-500 mt-0.5">Phòng &amp; căn hộ đối tác</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-[#B89C66]">24/7</div>
                  <div className="text-xs text-slate-500 mt-0.5">Hỗ trợ &amp; xem phòng</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-[#0F223A]">0đ</div>
                  <div className="text-xs text-slate-500 mt-0.5">Phí môi giới</div>
                </div>
              </div>
            </div>

            <div data-reveal="right" className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-200/80 group">
              <img
                src="/hero-living-room-hd.jpg"
                alt="Elite Living Interior"
                className="w-full h-80 sm:h-96 object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-end p-6 text-white">
                <span className="text-[#E8D4B0] text-xs font-bold uppercase tracking-widest">
                  Elite Living
                </span>
                <p className="text-lg font-bold mt-1">
                  Nội thất có sẵn, dọn vào là ở
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER: ELITE LIVING COMMERCIAL FOOTER */}
      <Footer onSelectDistrict={(dist) => { setSelectedDistrict(dist); setPage(1); }} />
    </MotionPage>
  );
}
