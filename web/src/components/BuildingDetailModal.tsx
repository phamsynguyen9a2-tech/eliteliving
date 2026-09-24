'use client';

import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, Phone, ShieldCheck, CheckCircle2, ChevronRight, Zap, Eye, Calendar, Sparkles, Layers, Maximize2, ExternalLink } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                  {building.code}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Còn trống {building.available_rooms} / {building.total_rooms} phòng
                </span>
                <span className="text-xs text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  <strong className="text-amber-300">{building.district}</strong> • Cách ĐH HUIT: <strong>{building.distance_to_huit_km} km</strong>
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-1 line-clamp-1">
                {building.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: 2 Columns */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* LEFT COLUMN: Floor & Room Matrix (7 cols) */}
          <div className="lg:col-span-7 p-5 overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50 flex flex-col gap-4">
            {/* Quick overview & Landlord banner */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 font-medium">Địa chỉ chính xác tòa nhà:</p>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{building.address}</span>
                </p>
              </div>
              <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto">
                <span className="text-[11px] text-slate-500 block">Chủ tòa nhà:</span>
                <span className="text-xs font-bold text-slate-800 block">{building.landlord_name}</span>
                <a
                  href={`tel:${building.landlord_phone}`}
                  className="text-xs text-blue-600 hover:underline font-semibold flex items-center sm:justify-end gap-1 mt-0.5"
                >
                  <Phone className="w-3 h-3" />
                  {building.landlord_phone}
                </a>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-slate-200">
              {/* Status & Type filters */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-500 font-semibold mr-1">Bộ lọc:</span>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({allRooms.length})
                </button>
                <button
                  onClick={() => setStatusFilter('AVAILABLE')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'AVAILABLE'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Còn trống ({building.available_rooms})
                </button>
                <button
                  onClick={() => setStatusFilter('BALCONY')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'BALCONY'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Có ban công
                </button>
              </div>

              {/* Floor tabs */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-400 font-medium">Tầng:</span>
                <select
                  value={floorFilter}
                  onChange={(e) => setFloorFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-slate-100 border-none text-xs font-semibold text-slate-700 rounded-lg px-2 py-1 outline-hidden cursor-pointer"
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
                  <div key={floorNum} className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
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

                        const statusBg = isAvailable
                          ? 'border-emerald-200 bg-emerald-50/40 text-emerald-950'
                          : isBooked
                          ? 'border-amber-200 bg-amber-50/40 text-amber-950'
                          : 'border-slate-200 bg-slate-100/70 text-slate-500 opacity-60';

                        const statusBadge = isAvailable
                          ? 'bg-emerald-500'
                          : isBooked
                          ? 'bg-amber-500'
                          : 'bg-slate-400';

                        return (
                          <button
                            key={r.id}
                            onClick={() => handleSelectRoom(r)}
                            className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${statusBg} ${
                              isSelected
                                ? 'ring-2 ring-blue-600 border-blue-600 bg-blue-50/60 shadow-md scale-[1.02]'
                                : 'hover:border-slate-300 hover:shadow-xs'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-extrabold text-xs">{r.room_code}</span>
                              <span
                                className={`w-2 h-2 rounded-full ${statusBadge}`}
                                title={
                                  isAvailable ? 'Còn trống' : isBooked ? 'Đã có lịch hẹn xem' : 'Đang thuê'
                                }
                              ></span>
                            </div>

                            <div className="mt-1.5">
                              <span className="text-[10px] text-slate-600 font-medium line-clamp-1 block">
                                {r.has_balcony ? 'Có ban công' : 'Gác lửng'} • {r.area}m²
                              </span>
                              <span className="text-xs font-black text-blue-600 block mt-0.5">
                                {(r.price / 1000000).toFixed(1)} Tr/th
                              </span>
                            </div>

                            {isSelected && (
                              <div className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white rounded-full p-0.5 shadow-sm">
                                <CheckCircle2 className="w-3.5 h-3.5" />
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
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      Mã phòng: {selectedRoom.room_code}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        selectedRoom.status === 'AVAILABLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedRoom.status === 'BOOKED_VIEWING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {selectedRoom.status === 'AVAILABLE'
                        ? '🟢 Còn trống'
                        : selectedRoom.status === 'BOOKED_VIEWING'
                        ? '🟡 Đã đặt lịch'
                        : '⚪ Đang thuê'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-2 line-clamp-2">
                    {selectedRoom.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tầng {selectedRoom.floor} • Diện tích: <strong>{selectedRoom.area} m²</strong> •{' '}
                    {selectedRoom.has_balcony ? (
                      <span className="text-emerald-600 font-semibold">Có ban công riêng</span>
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

                    <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                      Ảnh {activeImageIndex + 1} / {selectedRoom.images.length}
                    </div>

                    {selectedRoom.has_balcony && (
                      <div className="absolute top-2.5 right-2.5 bg-emerald-600/90 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md">
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        Ban công đón nắng
                      </div>
                    )}
                  </div>

                  {/* Thumbnails of this specific room */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                    {selectedRoom.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                          activeImageIndex === idx
                            ? 'border-blue-600 ring-1 ring-blue-600 scale-105'
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
                    <span className="text-xl font-extrabold text-blue-600">
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
                            ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Rates info */}
                <div className="text-[11px] text-slate-500 grid grid-cols-2 gap-1.5 bg-slate-50 p-2.5 rounded-xl">
                  <span>⚡ Điện: 3.800 đ/kWh</span>
                  <span>💧 Nước: 25.000 đ/m³</span>
                  <span>📶 Wifi: 100.000 đ/tháng</span>
                  <span>🛵 Giữ xe: 120.000 đ/xe</span>
                </div>

                {/* Booking & Full Page Action Buttons */}
                <div className="pt-2 space-y-2">
                  <a
                    href={`/phong/${selectedRoom.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold border-2 border-blue-600/30 text-blue-700 bg-blue-50/50 hover:bg-blue-100/70 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Mở xem trang chi tiết căn {selectedRoom.room_code} riêng biệt</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => onBookRoom(selectedRoom)}
                    disabled={selectedRoom.status === 'RENTED'}
                    className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      selectedRoom.status === 'AVAILABLE'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25'
                        : selectedRoom.status === 'BOOKED_VIEWING'
                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/25'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>
                      {selectedRoom.status === 'AVAILABLE'
                        ? `Đặt lịch xem ${selectedRoom.room_code} ngay`
                        : selectedRoom.status === 'BOOKED_VIEWING'
                        ? `Đặt lịch hẹn xem ${selectedRoom.room_code} (Chờ)`
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
