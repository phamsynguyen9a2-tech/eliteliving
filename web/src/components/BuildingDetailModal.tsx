'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bike,
  Building2,
  Calendar,
  CheckCircle2,
  Droplets,
  ExternalLink,
  Layers,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { Building, Room } from '@/lib/types';

interface BuildingDetailModalProps {
  building: Building | null;
  isOpen: boolean;
  onClose: () => void;
  onBookRoom: (room: Room) => void;
}

export default function BuildingDetailModal({
  building,
  isOpen,
  onClose,
  onBookRoom
}: BuildingDetailModalProps) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [floorFilter, setFloorFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'AVAILABLE' | 'BALCONY'>('all');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (building && building.rooms && building.rooms.length > 0) {
      // Pick first available room by default, or first room
      const firstAvailable = building.rooms.find((r) => r.status === 'AVAILABLE') || building.rooms[0];
      setSelectedRoom(firstAvailable);
      setActiveImageIndex(0);
      setFloorFilter('all');
      setStatusFilter('all');
    }
  }, [building]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen || !building) return null;

  const allRooms = building.rooms || [];

  // Filter rooms
  const filteredRooms = allRooms.filter((room) => {
    if (floorFilter !== 'all' && room.floor !== floorFilter) return false;
    if (statusFilter === 'AVAILABLE' && room.status !== 'AVAILABLE') return false;
    if (statusFilter === 'BALCONY' && !room.has_balcony) return false;
    return true;
  });

  // Group filtered rooms by floor
  const floors = [1, 2, 3, 4, 5];
  const roomsByFloor: Record<number, Room[]> = {};
  floors.forEach((f) => {
    roomsByFloor[f] = filteredRooms.filter((r) => r.floor === f);
  });

  const handleSelectRoom = (room: Room) => {
    setSelectedRoom(room);
    setActiveImageIndex(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#0F223A]/45 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="building-detail-title"
        className="bg-white w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl border border-[#E5E3DE] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-[#0F223A] via-[#142A45] to-[#0F223A] text-white flex items-center justify-between gap-3 border-b border-[#B89C66]/25">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#B89C66]/20 border border-[#B89C66]/40 flex items-center justify-center text-[#B89C66] shrink-0">
              <Building2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#B89C66]/20 text-[#E5D7B7] font-semibold border border-[#B89C66]/35">
                  {building.code}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white font-semibold border border-white/15 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#B89C66]" aria-hidden="true" />
                  Còn trống {building.available_rooms} / {building.total_rooms} phòng
                </span>
                <span className="text-xs text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#B89C66]" aria-hidden="true" />
                  <strong className="text-[#E5D7B7]">{building.district}</strong> • Cách ĐH HUIT: <strong>{building.distance_to_huit_km} km</strong>
                </span>
              </div>
              <h2 id="building-detail-title" className="text-lg sm:text-xl font-bold text-white tracking-tight mt-1 line-clamp-1">
                {building.name}
              </h2>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Đóng chi tiết tòa nhà"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content Body: 2 Columns */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* LEFT COLUMN: Floor & Room Matrix (7 cols) */}
          <div className="lg:col-span-7 p-5 overflow-y-auto border-b lg:border-b-0 lg:border-r border-[#E5E3DE] bg-[#F8F8F6] flex flex-col gap-4">
            {/* Quick overview & Landlord banner */}
            <div className="bg-white rounded-2xl p-4 border border-[#E5E3DE] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 font-medium">Địa chỉ chính xác tòa nhà:</p>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-4 h-4 text-[#B89C66] shrink-0" aria-hidden="true" />
                  <span>{building.address}</span>
                </p>
              </div>
              <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto">
                <span className="text-[11px] text-slate-500 block">Chủ tòa nhà:</span>
                <span className="text-xs font-bold text-slate-800 block">{building.landlord_name}</span>
                <a
                  href={`tel:${building.landlord_phone}`}
                  className="text-xs text-[#8C6D37] hover:text-[#A38752] hover:underline font-semibold flex items-center sm:justify-end gap-1 mt-0.5"
                >
                  <Phone className="w-3 h-3" aria-hidden="true" />
                  {building.landlord_phone}
                </a>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-[#E5E3DE]">
              {/* Status & Type filters */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-500 font-semibold mr-1">Bộ lọc:</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  aria-pressed={statusFilter === 'all'}
                  className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-[#B89C66] border-[#B89C66] text-white shadow-xs'
                      : 'bg-[#F8F8F6] border-[#E5E3DE] text-slate-600 hover:border-[#B89C66] hover:text-[#0F223A]'
                  }`}
                >
                  Tất cả ({allRooms.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('AVAILABLE')}
                  aria-pressed={statusFilter === 'AVAILABLE'}
                  className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'AVAILABLE'
                      ? 'bg-[#B89C66] border-[#B89C66] text-white shadow-xs'
                      : 'bg-[#FAF7F2] border-[#B89C66]/30 text-[#8C6D37] hover:border-[#B89C66]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Còn trống ({building.available_rooms})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('BALCONY')}
                  aria-pressed={statusFilter === 'BALCONY'}
                  className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'BALCONY'
                      ? 'bg-[#B89C66] border-[#B89C66] text-white shadow-xs'
                      : 'bg-[#F8F8F6] border-[#E5E3DE] text-[#0F223A] hover:border-[#B89C66]'
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${statusFilter === 'BALCONY' ? 'text-white' : 'text-[#B89C66]'}`} aria-hidden="true" />
                  Có ban công
                </button>
              </div>

              {/* Floor tabs */}
              <div className="flex items-center gap-1">
                <label htmlFor="building-floor-filter" className="text-[11px] text-slate-400 font-medium">Tầng:</label>
                <select
                  id="building-floor-filter"
                  value={floorFilter}
                  onChange={(e) => setFloorFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  aria-label="Lọc theo tầng"
                  className="bg-[#F8F8F6] border border-[#E5E3DE] text-xs font-semibold text-slate-700 rounded-lg px-2 py-1 outline-hidden cursor-pointer"
                >
                  <option value="all">Tất cả tầng</option>
                  {floors.map((f) => (
                    <option key={f} value={f}>
                      Tầng {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Room Matrix Grid by Floor */}
            <div className="space-y-4">
              {floors.map((floorNum) => {
                const floorRooms = roomsByFloor[floorNum] || [];
                if (floorRooms.length === 0) return null;

                return (
                  <div key={floorNum} className="bg-white rounded-2xl p-3.5 border border-[#E5E3DE] shadow-xs">
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#B89C66]" aria-hidden="true" />
                        <span>Tầng {floorNum}</span>
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        {floorRooms.filter((r) => r.status === 'AVAILABLE').length} phòng trống
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {floorRooms.map((r) => {
                        const isSelected = selectedRoom?.id === r.id;
                        const isAvailable = r.status === 'AVAILABLE';
                        const isBooked = r.status === 'BOOKED_VIEWING';
                        const isReserved = r.status === 'RESERVED';
                        const roomStatusText = isAvailable
                          ? 'Còn trống'
                          : isBooked
                          ? 'Đã có lịch hẹn xem'
                          : isReserved
                          ? 'Đang giữ chỗ'
                          : 'Đang thuê';

                        const statusBg = isAvailable
                          ? 'border-[#B89C66]/40 bg-[#FAF7F2] text-[#0F223A]'
                          : isBooked
                          ? 'border-[#0F223A]/20 bg-[#F0F4F8] text-[#0F223A]'
                          : isReserved
                          ? 'border-[#B89C66]/35 bg-[#FAF0DC]/60 text-[#8C6D37]'
                          : 'border-slate-200 bg-slate-100/70 text-slate-500 opacity-60';

                        const statusBadge = isAvailable
                          ? 'bg-[#B89C66]'
                          : isBooked
                          ? 'bg-[#0F223A]'
                          : isReserved
                          ? 'bg-[#B89C66]'
                          : 'bg-slate-400';

                        return (
                          <button
                            type="button"
                            key={r.id}
                            onClick={() => handleSelectRoom(r)}
                            aria-pressed={isSelected}
                            aria-label={`Chọn phòng ${r.room_code}, ${roomStatusText}, giá ${(r.price / 1000000).toFixed(1)} triệu đồng mỗi tháng`}
                            className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${statusBg} ${
                              isSelected
                                ? 'ring-2 ring-[#B89C66] border-[#B89C66] bg-[#FAF0DC]/60 shadow-md scale-[1.02]'
                                : 'hover:border-[#B89C66]/60 hover:shadow-xs'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-extrabold text-xs">{r.room_code}</span>
                              <span
                                className={`w-2 h-2 rounded-full ${statusBadge}`}
                                title={roomStatusText}
                              ></span>
                            </div>

                            <div className="mt-1.5">
                              <span className="text-[10px] text-slate-600 font-medium line-clamp-1 block">
                                {r.has_balcony ? 'Có ban công' : 'Gác lửng'} • {r.area}m²
                              </span>
                              <span className="text-xs font-black text-[#8C6D37] block mt-0.5">
                                {(r.price / 1000000).toFixed(1)} Tr/th
                              </span>
                            </div>

                            {isSelected && (
                              <div className="absolute -top-1.5 -right-1.5 bg-[#B89C66] text-white rounded-full p-0.5 shadow-sm">
                                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Selected Room Preview & Dynamic Gallery (5 cols) */}
          <div className="lg:col-span-5 p-5 overflow-y-auto flex flex-col justify-between bg-white">
            {selectedRoom ? (
              <div className="space-y-4">
                {/* Room Title & Status Header */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FAF0DC] text-[#8C6D37] border border-[#B89C66]/30">
                      Mã phòng: {selectedRoom.room_code}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        selectedRoom.status === 'AVAILABLE'
                          ? 'bg-[#FAF7F2] text-[#8C6D37] border border-[#B89C66]/35'
                          : selectedRoom.status === 'BOOKED_VIEWING'
                          ? 'bg-[#F0F4F8] text-[#0F223A] border border-[#0F223A]/15'
                          : selectedRoom.status === 'RESERVED'
                          ? 'bg-[#FAF0DC] text-[#8C6D37] border border-[#B89C66]/35'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {selectedRoom.status === 'AVAILABLE'
                        ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Còn trống</span>
                        : selectedRoom.status === 'BOOKED_VIEWING'
                        ? <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" aria-hidden="true" /> Đã đặt lịch</span>
                        : selectedRoom.status === 'RESERVED'
                        ? <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" aria-hidden="true" /> Đang giữ chỗ</span>
                        : <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" aria-hidden="true" /> Đang thuê</span>}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-2 line-clamp-2">
                    {selectedRoom.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tầng {selectedRoom.floor} • Diện tích: <strong>{selectedRoom.area} m²</strong> •{' '}
                    {selectedRoom.has_balcony ? (
                      <span className="text-[#8C6D37] font-semibold">Có ban công riêng</span>
                    ) : (
                      'Cửa sổ thông thoáng'
                    )}
                  </p>
                </div>

                {/* Dynamic Image Viewer: Updates instantly when room selection changes */}
                <div className="space-y-2">
                  <div className="relative h-56 sm:h-64 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner group">
                    <img
                      src={
                        selectedRoom.images[activeImageIndex] ||
                        selectedRoom.images[0] ||
                        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600'
                      }
                      alt={selectedRoom.title}
                      className="w-full h-full object-cover transition-transform duration-300"
                    />

                    <div className="absolute top-2.5 left-2.5 bg-[#0F223A]/80 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                      Ảnh {activeImageIndex + 1} / {selectedRoom.images.length}
                    </div>

                    {selectedRoom.has_balcony && (
                      <div className="absolute top-2.5 right-2.5 bg-[#0F223A]/90 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md border border-[#B89C66]/40">
                        <Sparkles className="w-3 h-3 text-[#B89C66]" aria-hidden="true" />
                        Ban công đón nắng
                      </div>
                    )}
                  </div>

                  {/* Thumbnails of this specific room */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                    {selectedRoom.images.map((img, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        aria-label={`Xem ảnh ${idx + 1} của phòng ${selectedRoom.room_code}`}
                        aria-pressed={activeImageIndex === idx}
                        className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                          activeImageIndex === idx
                            ? 'border-[#B89C66] ring-1 ring-[#B89C66] scale-105'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rent Price & Details */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium block">Giá thuê hằng tháng</span>
                    <span className="text-xl font-extrabold text-[#8C6D37]">
                      {selectedRoom.price.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 font-medium block">Tiền đặt cọc</span>
                    <span className="text-sm font-bold text-slate-700">
                      {selectedRoom.deposit.toLocaleString('vi-VN')} đ (1 tháng)
                    </span>
                  </div>
                </div>

                {/* Specific Amenities for this selected room */}
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-1.5">Tiện ích phòng này:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRoom.amenities.map((a, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                          a === 'Ban công'
                            ? 'bg-[#FAF0DC] text-[#8C6D37] font-bold border border-[#B89C66]/35'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Rates info */}
                <div className="text-[11px] text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#F8F8F6] border border-[#E5E3DE] p-3 rounded-xl">
                  <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-[#B89C66]" aria-hidden="true" /> Điện: 3.800 đ/kWh</span>
                  <span className="flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5 text-[#B89C66]" aria-hidden="true" /> Nước: 25.000 đ/m³</span>
                  <span className="flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5 text-[#B89C66]" aria-hidden="true" /> Wifi: 100.000 đ/tháng</span>
                  <span className="flex items-center gap-1.5"><Bike className="w-3.5 h-3.5 text-[#B89C66]" aria-hidden="true" /> Giữ xe: 120.000 đ/xe</span>
                </div>

                {/* Booking & Full Page Action Buttons */}
                <div className="pt-2 space-y-2">
                  <a
                    href={`/phong/${selectedRoom.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold border border-[#B89C66]/50 text-[#8C6D37] bg-[#FAF7F2] hover:bg-[#FAF0DC] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Mở xem trang chi tiết căn {selectedRoom.room_code} riêng biệt</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>

                  <button
                    type="button"
                    onClick={() => onBookRoom(selectedRoom)}
                    disabled={selectedRoom.status === 'RENTED' || selectedRoom.status === 'RESERVED'}
                    className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      selectedRoom.status === 'AVAILABLE'
                        ? 'bg-[#B89C66] hover:bg-[#A38752] text-white shadow-[#B89C66]/25'
                        : selectedRoom.status === 'BOOKED_VIEWING'
                        ? 'bg-[#B89C66] hover:bg-[#A38752] text-white shadow-[#B89C66]/25'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <Calendar className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {selectedRoom.status === 'AVAILABLE'
                        ? `Đặt lịch xem ${selectedRoom.room_code} ngay`
                        : selectedRoom.status === 'BOOKED_VIEWING'
                        ? `Chọn khung giờ khác cho ${selectedRoom.room_code}`
                        : selectedRoom.status === 'RESERVED'
                        ? 'Phòng đang được giữ chỗ'
                        : 'Phòng đã có người thuê'}
                    </span>
                  </button>
                  <p className="text-[10px] text-center text-slate-400 mt-1.5">
                    Hệ thống tự động khóa lịch (Mutex Lock) chống trùng lịch với người khác
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center p-8 text-slate-400">
                <p>Vui lòng chọn một phòng trong danh sách bên trái để xem chi tiết ảnh và tiện ích.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
