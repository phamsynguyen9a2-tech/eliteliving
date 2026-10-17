'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import TopKWidget from '@/components/TopKWidget';
import BookingModal from '@/components/BookingModal';
import BuildingDetailModal from '@/components/BuildingDetailModal';
import Footer from '@/components/Footer';
import TenantJourney from '@/components/TenantJourney';
import { Room, Building } from '@/lib/types';
import { Search, MapPin, SlidersHorizontal, Home, Sparkles, Filter, ChevronLeft, ChevronRight, Zap, CheckCircle2, Building2, Grid, LayoutGrid, Eye, Coins, Flame, ShieldCheck, X, PawPrint } from 'lucide-react';
import Link from 'next/link';

const DISTRICTS = [
  { id: 'all', name: 'Tất cả khu vực (73 tòa nhà)', label: 'Tất cả TP.HCM', count: '73 Cụm' },
  { id: 'tân phú', name: 'Quận Tân Phú (10 tòa nhà)', label: 'Quận Tân Phú', count: '10 Cụm' },
  { id: 'tân bình', name: 'Quận Tân Bình (8 tòa nhà)', label: 'Quận Tân Bình', count: '8 Cụm' },
  { id: 'bình tân', name: 'Quận Bình Tân (6 tòa nhà)', label: 'Quận Bình Tân', count: '6 Cụm' },
  { id: 'gò vấp', name: 'Quận Gò Vấp (5 tòa nhà)', label: 'Quận Gò Vấp', count: '5 Cụm' },
  { id: 'bình thạnh', name: 'Quận Bình Thạnh (5 tòa nhà)', label: 'Quận Bình Thạnh', count: '5 Cụm' },
  { id: 'thủ đức', name: 'TP. Thủ Đức (5 tòa nhà)', label: 'TP. Thủ Đức', count: '5 Cụm' },
  { id: 'quận 7', name: 'Quận 7 (5 tòa nhà)', label: 'Quận 7', count: '5 Cụm' },
  { id: 'quận 12', name: 'Quận 12 (5 tòa nhà)', label: 'Quận 12', count: '5 Cụm' },
  { id: 'phú nhuận', name: 'Quận Phú Nhuận (4 tòa nhà)', label: 'Quận Phú Nhuận', count: '4 Cụm' },
  { id: 'quận 10', name: 'Quận 10 (4 tòa nhà)', label: 'Quận 10', count: '4 Cụm' },
  { id: 'quận 3', name: 'Quận 3 (4 tòa nhà)', label: 'Quận 3', count: '4 Cụm' },
  { id: 'quận 1', name: 'Quận 1 (4 tòa nhà)', label: 'Quận 1', count: '4 Cụm' },
  { id: 'quận 6', name: 'Quận 6 (4 tòa nhà)', label: 'Quận 6', count: '4 Cụm' },
  { id: 'quận 8', name: 'Quận 8 (4 tòa nhà)', label: 'Quận 8', count: '4 Cụm' },
];

const PRICE_RANGES = [
  { label: 'Mọi mức ngân sách', min: 0, max: 0 },
  { label: 'Tiết kiệm (Dưới 4tr)', min: 0, max: 4000000 },
  { label: 'Tiêu chuẩn (4 - 6tr)', min: 4000000, max: 6000000 },
  { label: 'Thoải mái (6 - 9tr)', min: 6000000, max: 9000000 },
  { label: 'Cao cấp (Trên 9tr)', min: 9000000, max: 20000000 }
];

export default function TenantHomePage() {
  const [viewMode, setViewMode] = useState<'BUILDING' | 'ROOM'>('BUILDING');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<Room | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  // Fetch Buildings (Grouped View)
  const fetchBuildings = async () => {
    try {
      const priceFilter = PRICE_RANGES[selectedPriceRange];
      let url = `/api/buildings?district=${selectedDistrict}`;
      if (priceFilter.min > 0) url += `&minPrice=${priceFilter.min}`;
      if (priceFilter.max > 0) url += `&maxPrice=${priceFilter.max}`;
      if (searchKeyword) url += `&search=${encodeURIComponent(searchKeyword)}`;
      if (roomType !== 'all') url += `&roomType=${roomType}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setBuildings(json.data.items);
      }
    } catch (err) {
      console.error('Error fetching buildings:', err);
    }
  };

  // Fetch Rooms (Individual View)
  const fetchRooms = async () => {
    try {
      const priceFilter = PRICE_RANGES[selectedPriceRange];
      let url = `/api/rooms?page=${page}&limit=12&district=${selectedDistrict}&sort=${sortBy}`;
      if (priceFilter.min > 0) url += `&minPrice=${priceFilter.min}`;
      if (priceFilter.max > 0) url += `&maxPrice=${priceFilter.max}`;
      if (searchKeyword) url += `&search=${encodeURIComponent(searchKeyword)}`;
      if (roomType !== 'all') url += `&roomType=${roomType}`;
      if (electricityType === 'cheap') url += `&maxElectricity=3800`;
      if (serviceFeeType === 'free') url += `&freeService=true`;
      if (petFriendly === 'true') url += `&petFriendly=true`;
      if (occupants !== 'all') url += `&occupants=${occupants}`;
      if (bikes !== 'all') url += `&bikes=${bikes}`;
      if (moveInTime !== 'all') url += `&moveInTime=${moveInTime}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setRooms(json.data.items);
        setTotal(json.data.total);
        setTotalPages(json.data.totalPages);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchBuildings(), fetchRooms()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [page, selectedDistrict, selectedPriceRange, sortBy, roomType, electricityType, serviceFeeType, petFriendly, occupants, bikes, moveInTime]);

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
    loadData();
    setTimeout(() => {
      const el = document.getElementById('danh-sach-toa-nha');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  };

  const handleOpenBuildingModal = (b: Building) => {
    setSelectedBuilding(b);
    setIsBuildingModalOpen(true);
  };

  const handleOpenBooking = (room: Room) => {
    if (room.status === 'RESERVED' || room.status === 'RENTED') return;
    setSelectedRoomForBooking(room);
    setIsBookingOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#0F223A] flex flex-col font-sans">
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
              HỆ THỐNG CĂN HỘ CHO THUÊ CAO CẤP | NÂNG TẦM PHONG CÁCH SỐNG
            </p>
          </div>
        </div>

        {/* Search Bar & Quick Filters Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Header Texts */}
          <div className="text-center max-w-3xl mx-auto mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FAF0DC] text-[#8C6D34] text-xs font-bold mb-3 border border-[#E8D4B0] shadow-xs">
              <Home className="w-3.5 h-3.5" aria-hidden="true" />
              <span>MẠNG LƯỚI AN CƯ TOÀN TP.HCM • 14 QUẬN &amp; TP. THỦ ĐỨC</span>
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-[#0F223A] tracking-tight leading-[1.18]">
              Tìm phòng trọ và căn hộ dịch vụ tại TP.HCM
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mt-3 max-w-2xl mx-auto leading-relaxed">
              Hơn 1.335 căn hộ &amp; studio thuộc 73 tòa nhà khắp 14 quận TP.HCM (Tân Phú, Tân Bình, Bình Tân, Gò Vấp, Bình Thạnh, Phú Nhuận, Thủ Đức, Q.1, Q.3, Q.7, Q.10, Q.12, Q.6, Q.8). Xem ảnh thật 100%, khóa vân tay an toàn tuyệt đối.
            </p>

            {/* Micro Trust Pills */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap mt-4 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-[#B89C66]" />
                <span>Ảnh thật chuẩn xác từng góc phòng</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <ShieldCheck className="w-4 h-4 text-[#B89C66]" />
                <span>Giá cố định minh bạch, không phí ẩn</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Hẹn giờ xem phòng chỉ trong 30 giây</span>
              </span>
            </div>
          </div>

          {/* Luxury Integrated Search Card */}
          <div className="max-w-5xl mx-auto bg-white rounded-[28px] p-4 sm:p-6 shadow-2xl shadow-slate-900/10 border border-[#E5E3DE]">
            {/* 1. Seamless Segmented District Tabs (14 Quận/TP.HCM) */}
            <div className="flex flex-wrap gap-1.5 p-2 bg-[#FAF8F5] border border-[#E5E3DE] rounded-2xl mb-4">
              {DISTRICTS.map((d) => {
                const active = selectedDistrict === d.id;
                const Icon = d.id === 'all' ? Building2 : MapPin;
                return (
                  <button
                    key={d.id}
                    type="button"
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
            </div>

            {/* 2. Primary Search Bar & Actions */}
            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div className="flex flex-col md:flex-row gap-2.5 items-stretch">
                {/* Field 1: Keyword / Street / Building */}
                <div className="flex-1 flex items-center gap-3 px-3.5 py-2.5 bg-[#FAF8F5] focus-within:bg-white focus-within:border-[#B89C66] focus-within:ring-4 focus-within:ring-[#B89C66]/15 border border-[#E5E3DE] rounded-2xl transition-all">
                  <Search className="w-5 h-5 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <label htmlFor="tenant-search-keyword" className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider leading-none mb-1">
                      BẠN MUỐN Ở ĐÂU?
                    </label>
                    <input
                      id="tenant-search-keyword"
                      type="text"
                      placeholder="Gõ tên đường hoặc tòa nhà gần nơi bạn làm việc, học tập..."
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

                {/* Field 2: Price Filter */}
                <div className="w-full md:w-56 flex items-center gap-3 px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5E3DE] rounded-2xl transition-all">
                  <Coins className="w-5 h-5 text-[#B89C66] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <label htmlFor="tenant-price-range" className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider leading-none mb-1">
                      TẦM GIÁ MONG MUỐN
                    </label>
                    <select
                      id="tenant-price-range"
                      value={selectedPriceRange}
                      onChange={(e) => {
                        setSelectedPriceRange(Number(e.target.value));
                        setPage(1);
                      }}
                      className="w-full text-xs sm:text-sm bg-transparent outline-none font-bold text-[#0F223A] cursor-pointer"
                    >
                      {PRICE_RANGES.map((r, i) => (
                        <option key={i} value={i}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Field 3: Advanced Filter Toggle Button */}
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
                  <span>Bộ lọc chi tiết</span>
                  {activeAdvancedCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#B89C66] text-white text-[10px] flex items-center justify-center font-bold">
                      {activeAdvancedCount}
                    </span>
                  )}
                </button>

                {/* Field 4: Submit Button */}
                <button
                  type="submit"
                  className="w-full md:w-auto px-7 py-3.5 bg-[#B89C66] hover:bg-[#A38752] text-white text-xs sm:text-sm font-bold uppercase tracking-wider rounded-2xl shadow-lg shadow-[#B89C66]/25 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-95"
                >
                  <Search className="w-4 h-4 text-white" />
                  <span>Tìm Căn Hộ Ngay</span>
                </button>
              </div>

              {/* 3. Deep Advanced Filter Drawer (Khách hàng cần: Người ở, Số xe, Giá điện, Thú cưng, Ngày vào, Dạng phòng) */}
              {isAdvancedFilterOpen && (
                <div className="pt-4 mt-3 border-t border-[#E5E3DE] animate-in fade-in duration-200 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E5E3DE]">
                    {/* Dạng phòng */}
                    <div>
                      <p className="block text-[11px] font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                        Dạng phòng cần tìm
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'all', label: 'Tất cả' },
                          { id: 'gac_lung', label: 'Gác lửng đúc' },
                          { id: 'studio', label: 'Studio không gác' },
                          { id: '1pn', label: '1 Phòng ngủ (1PN)' },
                          { id: '2pn', label: '2 Phòng ngủ (2PN)' },
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
                        Số lượng người ở
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'all', label: 'Tất cả' },
                          { id: '1', label: '1 người' },
                          { id: '2', label: '2 người' },
                          { id: '3-4', label: '3 - 4 người' },
                          { id: 'family', label: '5 người trở len' },
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
                        Phương tiện &amp; Chỗ gửi xe
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
                        Chính sách thú cưng (Pet-friendly)
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
                        Chi phí điện &amp; Phí dịch vụ
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
                      Đặt lại tất cả bộ lọc nâng cao
                    </button>

                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#0F223A] hover:bg-[#142A45] text-white font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Áp dụng tiêu chí ({activeAdvancedCount} tiêu chí)
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
              <span>Gần trường &amp; nơi làm việc:</span>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mt-8 pt-6 border-t border-[#E5E3DE] text-center">
            <div className="flex flex-col items-center">
              <span className="text-xl sm:text-2xl font-black text-[#0F223A]">73</span>
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mt-0.5">
                Tòa nhà an ninh chính chủ
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl sm:text-2xl font-black text-[#B89C66]">1.335+</span>
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mt-0.5">
                Căn hộ sẵn sàng dọn vào
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl sm:text-2xl font-black text-[#0F223A]">14 Quận</span>
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mt-0.5">
                Mạng lưới toàn TP.HCM
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl sm:text-2xl font-black text-[#B89C66]">0 VNĐ</span>
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mt-0.5">
                Hoàn toàn miễn phí dịch vụ
              </span>
            </div>
          </div>
        </div>
      </section>

      <TenantJourney />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* TOP-K RECOMMENDATION MODULE */}
        <TopKWidget onBookRoom={handleOpenBooking} />

        {/* LISTING HEADER & VIEW MODE TOGGLE */}
        <div id="danh-sach-toa-nha" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-4 scroll-mt-24">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#B89C66]" />
              <span>
                {viewMode === 'BUILDING'
                  ? `Danh sách Cụm Căn hộ & Studio (${buildings.length} tòa nhà)`
                  : `Danh sách Tất cả Căn hộ lẻ (${total} phòng)`}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {viewMode === 'BUILDING'
                ? 'Nhấn vào tòa nhà để xem bảng ma trận phòng trống và bộ ảnh riêng biệt từng mã phòng'
                : 'Hiển thị danh sách tất cả các phòng lẻ độc lập'}
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
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
                <span>Xem theo Tòa nhà (Khuyên dùng)</span>
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
                <span>Xem từng phòng lẻ</span>
              </button>
            </div>

            {viewMode === 'ROOM' && (
              <>
                <label htmlFor="tenant-room-sort" className="sr-only">Sắp xếp danh sách phòng</label>
                <select
                  id="tenant-room-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-hidden cursor-pointer"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="price_asc">Giá: Thấp &rarr; Cao</option>
                  <option value="price_desc">Giá: Cao &rarr; Thấp</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs animate-pulse h-96"></div>
            ))}
          </div>
        ) : viewMode === 'BUILDING' ? (
          /* ========================================================= */
          /* MODE 1: BUILDINGS VIEW (Nhóm theo Tòa nhà / Dự án)        */
          /* ========================================================= */
          buildings.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <p className="text-base font-semibold text-slate-700">Không tìm thấy tòa nhà nào phù hợp</p>
              <p className="text-xs text-slate-500 mt-1">Hãy thử xóa bộ lọc tìm kiếm để xem tất cả dự án.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      {b.images.length} ảnh thực tế
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
                        <span className="text-[10px] text-slate-400 block font-medium">Dải giá thuê phòng</span>
                        <span className="text-sm font-extrabold text-[#8C6D37]">
                          {(b.min_price / 1000000).toFixed(1)} - {(b.max_price / 1000000).toFixed(1)} Tr/th
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenBuildingModal(b)}
                        className="px-4 py-2 bg-[#B89C66] hover:bg-[#A38752] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#B89C66]/25 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem chi tiết phòng trống ({b.available_rooms})</span>
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
                Không tìm thấy căn hộ nào khớp với tất cả tiêu chí
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
                Các tiêu chí tìm kiếm hiện tại (khu vực, mức giá, dạng phòng hoặc chỗ để xe) có thể quá chặt chẽ. Hãy thử nới lỏng hoặc đặt lại bộ lọc.
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
                Đặt lại tất cả bộ lọc &amp; Xem 600+ căn hộ sẵn có
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* TRUST PILLARS & SERVICES SECTION */}
      <section id="services" className="bg-white border-y border-slate-200/80 py-14 mt-12 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#B89C66] bg-[#FAF0DC] px-3.5 py-1 rounded-full border border-[#E8D4B0]">
              Dịch Vụ &amp; Tiêu Chuẩn Elite Living
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F223A] mt-2">
              Tiêu Chuẩn Không Gian Sống Tiện Nghi &amp; An Toàn
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Đem đến trải nghiệm thuê phòng hiện đại, minh bạch và an tâm tuyệt đối cho khách thuê.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#FAF0DC] text-[#8C6D37] flex items-center justify-center font-bold mb-3.5">
                <Eye className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Xác Thực 100% Ảnh Thật</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Từng góc chụp phòng, ban công, gác lửng và nhà xe được kiểm duyệt thực tế tại từng tòa nhà trước khi hiển thị.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#0F223A] text-[#B89C66] flex items-center justify-center font-bold mb-3.5">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Khóa Lịch Chống Trùng Lặp</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Hệ thống đặt lịch tự động khóa khung giờ tức thì, ngăn chặn hoàn toàn việc nhiều khách bị trùng giờ xem phòng.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#FAF0DC] text-[#8C6D37] flex items-center justify-center font-bold mb-3.5">
                <Coins className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Chi Phí Cố Định Minh Bạch</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Giá thuê, định mức điện 3.800đ, nước 25.000đ và tiền cọc được niêm yết rõ ràng trong hợp đồng, không phụ phí ẩn.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#0F223A] text-[#B89C66] flex items-center justify-center font-bold mb-3.5">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">An Ninh Vân Tay 24/7</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Cổng khóa từ vân tay hiện đại, camera an ninh từng tầng, giờ giấc tự do không chung chủ, đảm bảo riêng tư.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT US SECTION */}
      <section id="about-us" className="bg-[#FAF9F7] border-b border-[#E5E3DE] py-16 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#B89C66] bg-[#FAF0DC] px-3.5 py-1.5 rounded-full border border-[#E8D4B0]">
                Về Chúng Tôi • ABOUT US
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-[#0F223A] mt-4 tracking-tight leading-snug">
                Mạng Lưới Quản Lý &amp; Cho Thuê Căn Hộ Dịch Vụ Cao Cấp
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-4 leading-relaxed">
                Elite Living được xây dựng nhằm mang đến chuẩn mực sống mới cho người đi làm và sinh viên tại khu vực Quận Tân Phú (đặc biệt quanh ĐH Công Thương TP.HCM - HUIT) và các quận lân cận.
              </p>
              <p className="text-slate-600 text-sm mt-3 leading-relaxed">
                Mỗi tòa nhà trong hệ thống đều được kiểm định nghiêm ngặt về phòng cháy chữa cháy (PCCC), trang bị hệ sinh thái khóa vân tay an ninh cao cấp, hợp đồng minh bạch và đội ngũ hỗ trợ vận hành chuyên nghiệp 24/7.
              </p>

              <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-200">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-[#0F223A]">100%</div>
                  <div className="text-xs text-slate-500 mt-0.5">Xác thực ảnh thật</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-[#B89C66]">24/7</div>
                  <div className="text-xs text-slate-500 mt-0.5">Hỗ trợ &amp; xem phòng</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-[#0F223A]">0đ</div>
                  <div className="text-xs text-slate-500 mt-0.5">Phí môi giới xem phòng</div>
                </div>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-200/80 group">
              <img
                src="/hero-living-room-hd.jpg"
                alt="Elite Living Interior"
                className="w-full h-80 sm:h-96 object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-end p-6 text-white">
                <span className="text-[#E8D4B0] text-xs font-bold uppercase tracking-widest">
                  Tiêu Chuẩn Không Gian Sống Sang Trọng
                </span>
                <p className="text-lg font-bold mt-1">
                  Không chỉ là nơi ở, mà là phong cách sống tinh tế
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER: ELITE LIVING COMMERCIAL FOOTER */}
      <Footer onSelectDistrict={(dist) => { setSelectedDistrict(dist); setPage(1); }} />
    </div>
  );
}
