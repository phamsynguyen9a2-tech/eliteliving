'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Edit,
  ExternalLink,
  FileText,
  Home,
  KeyRound,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import type { Room, RoomStatus } from '@/lib/types';
import EliteSelect, { type EliteSelectOption } from '@/components/EliteSelect';
import {
  formatVND,
  ROOM_STATUS_META,
  ROOM_STATUS_ORDER,
  roomBuildingLabel,
} from './landlord-format';
import { EmptyStateCard, StatusBadge } from './LandlordPrimitives';

interface LandlordRoomsTabProps {
  rooms: Room[];
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  buildingFilter: string;
  onBuildingFilterChange: (building: string) => void;
  onOpenCreateRoom: () => void;
  onOpenEditRoom: (room: Room) => void;
  onRequestDeleteRoom: (room: Room) => void;
  onUpdateRoomStatus: (room: Room, status: RoomStatus) => void;
  onOpenCheckIn: (room: Room) => void;
  onOpenCancelDeposit: (room: Room) => void;
  onOpenBillingForRoom: (room: Room) => void;
  onOpenContractForRoom: (room: Room) => void;
}

/** Trạng thái kiểm duyệt tin đăng (chỉ hiện khi tin chưa được duyệt). */
function ListingReviewBadge({ room, size = 'md' }: { room: Room; size?: 'sm' | 'md' }) {
  if (!room.listing_status || room.listing_status === 'APPROVED') return null;
  const pending = room.listing_status === 'PENDING';
  return (
    <div className="mt-1.5 space-y-1">
      <StatusBadge label={pending ? 'Chờ duyệt tin' : 'Tin bị từ chối'} tone={pending ? 'amber' : 'rose'} size={size} />
      {!pending && room.moderation_note && (
        <p className="text-xs text-rose-700 max-w-[240px] whitespace-normal">Lý do: {room.moderation_note}</p>
      )}
      {pending && <p className="text-xs text-slate-500 max-w-[240px] whitespace-normal">Chưa hiện công khai cho người thuê</p>}
    </div>
  );
}

export default function LandlordRoomsTab({
  rooms,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  buildingFilter,
  onBuildingFilterChange,
  onOpenCreateRoom,
  onOpenEditRoom,
  onRequestDeleteRoom,
  onUpdateRoomStatus,
  onOpenCheckIn,
  onOpenCancelDeposit,
  onOpenBillingForRoom,
  onOpenContractForRoom,
}: LandlordRoomsTabProps) {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [openMenuRoomId, setOpenMenuRoomId] = useState<number | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (openMenuRoomId === null) return;
    const handleOutside = (e: PointerEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenuRoomId(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuRoomId(null);
    };
    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [openMenuRoomId]);

  // Distinct buildings for filter
  const buildingNames = Array.from(
    new Set(rooms.map((r) => roomBuildingLabel(r)).filter(Boolean))
  );

  const buildingOptions: EliteSelectOption[] = [
    { value: 'ALL', label: 'Tất cả khu trọ', badge: `${rooms.length}` },
    ...buildingNames.map((name) => ({
      value: name,
      label: name,
      badge: `${rooms.filter((r) => roomBuildingLabel(r) === name).length}`,
    })),
  ];

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (buildingFilter !== 'ALL' && roomBuildingLabel(r) !== buildingFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        r.room_code.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        roomBuildingLabel(r).toLowerCase().includes(q)
      );
    }
    return true;
  });

  const hasActiveFilters =
    statusFilter !== 'ALL' || buildingFilter !== 'ALL' || searchQuery.trim().length > 0;

  const clearAllFilters = () => {
    onStatusFilterChange('ALL');
    onBuildingFilterChange('ALL');
    onSearchQueryChange('');
  };

  const renderPrimaryAction = (room: Room) => {
    if (room.status === 'RESERVED') {
      return (
        <button
          type="button"
          onClick={() => onOpenCheckIn(room)}
          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
        >
          <KeyRound className="w-4 h-4" />
          <span>Nhận phòng</span>
        </button>
      );
    }
    if (room.status === 'RENTED') {
      return (
        <button
          type="button"
          onClick={() => onOpenBillingForRoom(room)}
          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#FAF0DC] hover:bg-[#F3E2BE] text-[#0F223A] border border-[#B89C66]/50 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Zap className="w-4 h-4 text-[#8C6D37]" />
          <span>Ghi điện nước</span>
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => onOpenEditRoom(room)}
        className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F8F8F6] text-[#0F223A] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
      >
        <Edit className="w-3.5 h-3.5 text-[#8C6D37]" />
        <span>Chỉnh sửa</span>
      </button>
    );
  };

  const renderMoreMenu = (room: Room) => {
    const isOpen = openMenuRoomId === room.id;
    return (
      <div
        ref={isOpen ? menuContainerRef : undefined}
        className="relative inline-block text-left"
      >
        <button
          type="button"
          onClick={() => setOpenMenuRoomId(isOpen ? null : room.id)}
          aria-expanded={isOpen}
          aria-label={`Tác vụ khác cho phòng ${room.room_code}`}
          className="min-w-[40px] min-h-[40px] px-2.5 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F8F8F6] text-slate-700 inline-flex items-center justify-center transition-colors cursor-pointer"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {isOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-1.5 w-60 rounded-2xl bg-white border border-[#E5E3DE] shadow-xl p-1.5 z-40 space-y-0.5 animate-in fade-in zoom-in-95 duration-150"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpenMenuRoomId(null);
                onOpenEditRoom(room);
              }}
              className="w-full px-3 py-2 rounded-xl text-left text-sm font-medium text-[#0F223A] hover:bg-[#F8F8F6] flex items-center gap-2.5 cursor-pointer"
            >
              <Edit className="w-4 h-4 text-[#8C6D37]" />
              <span>Chỉnh sửa thông tin phòng</span>
            </button>

            {room.status !== 'RENTED' && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpenMenuRoomId(null);
                  onOpenContractForRoom(room);
                }}
                className="w-full px-3 py-2 rounded-xl text-left text-sm font-medium text-[#0F223A] hover:bg-[#F8F8F6] flex items-center gap-2.5 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#8C6D37]" />
                <span>Lập hợp đồng thuê</span>
              </button>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpenMenuRoomId(null);
                onOpenBillingForRoom(room);
              }}
              className="w-full px-3 py-2 rounded-xl text-left text-sm font-medium text-[#0F223A] hover:bg-[#F8F8F6] flex items-center gap-2.5 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-[#8C6D37]" />
              <span>Ghi số điện nước</span>
            </button>

            {room.status === 'RESERVED' && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpenMenuRoomId(null);
                  onOpenCancelDeposit(room);
                }}
                className="w-full px-3 py-2 rounded-xl text-left text-sm font-medium text-amber-900 hover:bg-amber-50 flex items-center gap-2.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-amber-700" />
                <span>Hủy giữ chỗ / Xử lý cọc</span>
              </button>
            )}

            <Link
              href={`/phong/${room.id}`}
              target="_blank"
              onClick={() => setOpenMenuRoomId(null)}
              className="w-full px-3 py-2 rounded-xl text-left text-sm font-medium text-[#0F223A] hover:bg-[#F8F8F6] flex items-center gap-2.5"
            >
              <ExternalLink className="w-4 h-4 text-slate-400" />
              <span>Xem trang đăng công khai</span>
            </Link>

            {/* Quick status change section inside secondary menu */}
            <div className="pt-1.5 mt-1 border-t border-[#E5E3DE] px-2.5 py-1.5">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                Chuyển nhanh trạng thái:
              </span>
              <div className="grid grid-cols-2 gap-1">
                {ROOM_STATUS_ORDER.map((st) => {
                  const active = room.status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={active}
                      onClick={() => {
                        setOpenMenuRoomId(null);
                        onUpdateRoomStatus(room, st);
                      }}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#FAF0DC] text-[#0F223A] font-bold cursor-default'
                          : 'hover:bg-[#F8F8F6] text-slate-700'
                      }`}
                    >
                      {ROOM_STATUS_META[st].label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-1 border-t border-[#E5E3DE]">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpenMenuRoomId(null);
                  onRequestDeleteRoom(room);
                }}
                className="w-full px-3 py-2 rounded-xl text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa phòng này</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* ============================================================ */}
      {/* SEARCH, STATUS FILTER PILLS & VIEW TOGGLE                    */}
      {/* ============================================================ */}
      <div className="bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Tìm theo mã phòng, tên phòng, địa chỉ..."
                aria-label="Tìm kiếm phòng cho thuê"
                className="w-full min-h-[44px] pl-10 pr-9 py-2 text-sm bg-[#F8F8F6] focus:bg-white border border-[#E5E3DE] focus:border-[#B89C66] rounded-xl outline-hidden text-[#0F223A]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchQueryChange('')}
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#0F223A] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {buildingNames.length > 1 && (
              <div className="w-full sm:w-64">
                <EliteSelect
                  value={buildingFilter}
                  onChange={onBuildingFilterChange}
                  options={buildingOptions}
                  ariaLabel="Lọc theo khu trọ"
                />
              </div>
            )}
          </div>

          {/* Right: Desktop View Switcher + Add Room */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div
              className="hidden md:inline-flex items-center p-1 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE]"
              role="group"
              aria-label="Chế độ hiển thị danh sách phòng"
            >
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-[#0F223A] shadow-2xs'
                    : 'text-slate-600 hover:text-[#0F223A]'
                }`}
              >
                <List className="w-4 h-4 text-[#8C6D37]" />
                <span>Dạng bảng</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                aria-pressed={viewMode === 'cards'}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-[#0F223A] shadow-2xs'
                    : 'text-slate-600 hover:text-[#0F223A]'
                }`}
              >
                <LayoutGrid className="w-4 h-4 text-[#8C6D37]" />
                <span>Dạng thẻ</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenCreateRoom}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-sm font-bold shadow-sm shadow-[#B89C66]/25 inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm phòng mới</span>
            </button>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { key: 'ALL', label: 'Tất cả phòng', count: rooms.length },
            ...ROOM_STATUS_ORDER.map((st) => ({
              key: st,
              label: ROOM_STATUS_META[st].label,
              count: rooms.filter((r) => r.status === st).length,
            })),
          ].map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onStatusFilterChange(tab.key)}
                aria-pressed={active}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0F223A] text-white font-bold shadow-2xs'
                    : 'bg-[#F8F8F6] text-slate-700 hover:bg-[#EFECE6]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    active ? 'bg-[#B89C66] text-[#0F223A]' : 'bg-white text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Filter Indicator Strip */}
        {hasActiveFilters && (
          <div className="pt-3 border-t border-[#F1EFEA] flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2 flex-wrap text-slate-600">
              <span>
                Đang hiển thị <strong className="text-[#0F223A]">{filteredRooms.length}</strong> / {rooms.length} phòng
              </span>
              {statusFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF0DC] text-[#0F223A] font-semibold">
                  Trạng thái: {ROOM_STATUS_META[statusFilter as RoomStatus]?.label}
                </span>
              )}
              {buildingFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF0DC] text-[#0F223A] font-semibold">
                  Khu trọ: {buildingFilter}
                </span>
              )}
              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF0DC] text-[#0F223A] font-semibold">
                  Từ khóa: &ldquo;{searchQuery.trim()}&rdquo;
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs sm:text-sm font-bold text-[#8C6D37] hover:text-[#0F223A] inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* EMPTY / FILTERED EMPTY STATES                                */}
      {/* ============================================================ */}
      {rooms.length === 0 ? (
        <EmptyStateCard
          icon={<Home className="w-6 h-6" />}
          title="Chưa có phòng cho thuê nào"
          description="Hãy thêm phòng đầu tiên để bắt đầu nhận lịch xem phòng, ký hợp đồng và quản lý hóa đơn điện nước."
          actionLabel="Thêm phòng mới"
          onAction={onOpenCreateRoom}
        />
      ) : filteredRooms.length === 0 ? (
        <EmptyStateCard
          isFilterEmpty
          title="Không tìm thấy phòng phù hợp với bộ lọc"
          description="Hãy thử đổi từ khóa tìm kiếm hoặc xóa bộ lọc trạng thái để xem toàn bộ danh sách phòng."
          onClearFilter={clearAllFilters}
        />
      ) : (
        <>
          {/* ============================================================ */}
          {/* DESKTOP TABLE VIEW (default on md+ when viewMode === 'table')*/}
          {/* ============================================================ */}
          {viewMode === 'table' && (
            <div className="hidden md:block bg-white rounded-2xl border border-[#E5E3DE] shadow-2xs overflow-visible">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F8F8F6] border-b border-[#E5E3DE] text-xs font-bold text-slate-600">
                    <tr>
                      <th className="py-3.5 px-5">Mã &amp; Tên phòng</th>
                      <th className="py-3.5 px-4">Khu trọ &amp; Địa chỉ</th>
                      <th className="py-3.5 px-4">Giá thuê &amp; Cọc</th>
                      <th className="py-3.5 px-4">Diện tích</th>
                      <th className="py-3.5 px-4">Trạng thái</th>
                      <th className="py-3.5 px-5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1EFEA]">
                    {filteredRooms.map((room) => {
                      const statusMeta = ROOM_STATUS_META[room.status] || ROOM_STATUS_META.AVAILABLE;
                      const buildingLabel = roomBuildingLabel(room);
                      return (
                        <tr
                          key={room.id}
                          className="hover:bg-[#FAF8F5] transition-colors"
                        >
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3.5">
                              <img
                                src={
                                  room.images?.[0] ||
                                  'https://res.cloudinary.com/dmdfi6nq7/image/upload/v1781103062/room-images/wwif5ftkfoiztzxtorof.webp'
                                }
                                alt={room.title}
                                className="w-14 h-12 rounded-xl object-cover border border-[#E5E3DE] shrink-0 bg-[#F8F8F6]"
                              />
                              <div className="min-w-0">
                                <span className="inline-block text-xs font-extrabold px-2 py-0.5 rounded-md bg-[#0F223A] text-[#B89C66]">
                                  {room.room_code}
                                </span>
                                <p className="text-sm font-bold text-[#0F223A] mt-1 line-clamp-1 max-w-xs">
                                  {room.title}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-[#0F223A]">
                              <Building2 className="w-4 h-4 text-[#8C6D37] shrink-0" />
                              <span className="truncate max-w-[200px]">{buildingLabel}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-[240px]">
                              {room.address}
                            </p>
                          </td>

                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="text-sm font-extrabold text-[#0F223A] block">
                              {formatVND(room.price)}/tháng
                            </span>
                            <span className="text-xs text-slate-500 block mt-0.5">
                              Cọc: {formatVND(room.deposit || room.price)}
                            </span>
                          </td>

                          <td className="py-4 px-4 whitespace-nowrap text-sm font-medium text-slate-700">
                            {room.area} m²
                          </td>

                          <td className="py-4 px-4 whitespace-nowrap">
                            <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                            <ListingReviewBadge room={room} size="sm" />
                          </td>

                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2">
                              {renderPrimaryAction(room)}
                              {renderMoreMenu(room)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* CARDS VIEW (Always on mobile < md, or when viewMode='cards') */}
          {/* ============================================================ */}
          <div
            className={`${
              viewMode === 'table' ? 'md:hidden' : ''
            } grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`}
          >
            {filteredRooms.map((room) => {
              const statusMeta = ROOM_STATUS_META[room.status] || ROOM_STATUS_META.AVAILABLE;
              const buildingLabel = roomBuildingLabel(room);

              return (
                <article
                  key={`card-${room.id}`}
                  className="bg-white rounded-2xl border border-[#E5E3DE] shadow-2xs overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-44 bg-[#F8F8F6]">
                      <img
                        src={
                          room.images?.[0] ||
                          'https://res.cloudinary.com/dmdfi6nq7/image/upload/v1781103062/room-images/wwif5ftkfoiztzxtorof.webp'
                        }
                        alt={room.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 bg-[#0F223A]/90 text-[#B89C66] text-xs font-extrabold px-2.5 py-1 rounded-lg">
                        {room.room_code}
                      </div>
                      <div className="absolute top-3 right-3">
                        <StatusBadge label={statusMeta.label} tone={statusMeta.tone} size="sm" />
                      </div>
                    </div>

                    <div className="p-4 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8C6D37]">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{buildingLabel}</span>
                      </div>

                      <h3 className="text-base font-bold text-[#0F223A] line-clamp-1">
                        {room.title}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-1">{room.address}</p>
                      <ListingReviewBadge room={room} size="sm" />

                      <div className="pt-2.5 border-t border-[#F1EFEA] flex items-baseline justify-between">
                        <span className="text-xs text-slate-500">Giá thuê:</span>
                        <span className="text-base font-extrabold text-[#0F223A]">
                          {formatVND(room.price)}/tháng
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Diện tích: <strong>{room.area} m²</strong></span>
                        <span>Tiền cọc: <strong>{formatVND(room.deposit || room.price)}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#F8F8F6] border-t border-[#E5E3DE] flex items-center justify-between gap-2">
                    <div className="flex-1">{renderPrimaryAction(room)}</div>
                    {renderMoreMenu(room)}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
