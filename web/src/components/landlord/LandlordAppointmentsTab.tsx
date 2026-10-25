'use client';

import React from 'react';
import {
  Building2,
  Calendar,
  CalendarCheck,
  Check,
  ClipboardCheck,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  Phone,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import type { Appointment, Room } from '@/lib/types';
import {
  APPOINTMENT_STATUS_META,
  appointmentMatchesView,
  AppointmentView,
  compareAppointmentsAsc,
  formatDate,
  isOverdueConfirmed,
  normalizeDateKey,
  relativeDayLabel,
  roomBuildingLabel,
  todayKey,
  zaloLink,
} from './landlord-format';
import { EmptyStateCard, StatusBadge } from './LandlordPrimitives';

interface LandlordAppointmentsTabProps {
  appointments: Appointment[];
  rooms: Room[];
  activeView: AppointmentView;
  onViewChange: (view: AppointmentView) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onlyToday: boolean;
  onOnlyTodayChange: (val: boolean) => void;
  busyActionId: string | null;
  onConfirmAppointment: (apt: Appointment) => void;
  onRequestCancelAppointment: (apt: Appointment) => void;
  onCompleteAppointment: (apt: Appointment) => void;
  onCreateContractFromAppointment: (apt: Appointment) => void;
  onSendHandoverFromAppointment: (apt: Appointment) => void;
  /** Mở hộp thoại đổi lịch (tùy chọn) */
  onRescheduleAppointment?: (apt: Appointment) => void;
}

export default function LandlordAppointmentsTab({
  appointments,
  rooms,
  activeView,
  onViewChange,
  searchQuery,
  onSearchQueryChange,
  onlyToday,
  onOnlyTodayChange,
  busyActionId,
  onConfirmAppointment,
  onRequestCancelAppointment,
  onCompleteAppointment,
  onCreateContractFromAppointment,
  onSendHandoverFromAppointment,
  onRescheduleAppointment,
}: LandlordAppointmentsTabProps) {
  const today = todayKey();
  const roomById = new Map<number, Room>();
  for (const r of rooms) roomById.set(r.id, r);

  const pendingCount = appointments.filter((a) => a.status === 'PENDING').length;
  const upcomingCount = appointments.filter((a) => a.status === 'CONFIRMED').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;
  const cancelledCount = appointments.filter((a) => a.status === 'CANCELLED').length;
  const todayCount = appointments.filter((a) => normalizeDateKey(a.date) === today).length;

  const viewTabs: { id: AppointmentView; label: string; count: number; urgent?: boolean }[] = [
    { id: 'PENDING', label: 'Chờ xác nhận', count: pendingCount, urgent: pendingCount > 0 },
    { id: 'UPCOMING', label: 'Sắp diễn ra', count: upcomingCount },
    { id: 'COMPLETED', label: 'Đã hoàn tất', count: completedCount },
    { id: 'CANCELLED', label: 'Đã hủy', count: cancelledCount },
    { id: 'ALL', label: 'Tất cả lịch', count: appointments.length },
  ];

  const filteredAppointments = appointments
    .filter((apt) => {
      if (!appointmentMatchesView(apt, activeView)) return false;
      if (onlyToday && normalizeDateKey(apt.date) !== today) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const room = roomById.get(apt.room_id);
        const roomCode = (apt.room_code || room?.room_code || `#${apt.room_id}`).toLowerCase();
        const roomTitle = (apt.room_title || room?.title || '').toLowerCase();
        return (
          apt.user_name.toLowerCase().includes(q) ||
          apt.user_phone.toLowerCase().includes(q) ||
          roomCode.includes(q) ||
          roomTitle.includes(q)
        );
      }
      return true;
    })
    .sort(compareAppointmentsAsc);

  const hasFilters = activeView !== 'ALL' || onlyToday || searchQuery.trim().length > 0;

  const resetFilters = () => {
    onViewChange('ALL');
    onOnlyTodayChange(false);
    onSearchQueryChange('');
  };

  const renderActions = (apt: Appointment) => {
    const isBusy = busyActionId === `apt-${apt.id}`;
    const isHandoverBusy = busyActionId === `handover-apt-${apt.id}`;

    if (apt.status === 'PENDING') {
      return (
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onConfirmAppointment(apt)}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Xác nhận lịch</span>
          </button>

          {onRescheduleAppointment && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onRescheduleAppointment(apt)}
              className="min-h-[40px] px-3 py-2 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#FAF0DC] text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Đổi lịch
            </button>
          )}

          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRequestCancelAppointment(apt)}
            className="min-h-[40px] px-3 py-2 rounded-xl border border-[#E5E3DE] bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy lịch
          </button>
        </div>
      );
    }

    if (apt.status === 'CONFIRMED') {
      return (
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onCompleteAppointment(apt)}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#0F223A] hover:bg-[#193354] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4 text-[#B89C66]" />}
            <span>Hoàn tất xem phòng</span>
          </button>

          {onRescheduleAppointment && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onRescheduleAppointment(apt)}
              className="min-h-[40px] px-3 py-2 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#FAF0DC] text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Đổi lịch
            </button>
          )}

          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRequestCancelAppointment(apt)}
            className="min-h-[40px] px-3 py-2 rounded-xl border border-[#E5E3DE] bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy lịch
          </button>
        </div>
      );
    }

    if (apt.status === 'COMPLETED') {
      return (
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => onCreateContractFromAppointment(apt)}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Lập hợp đồng</span>
          </button>

          <button
            type="button"
            disabled={isHandoverBusy}
            onClick={() => onSendHandoverFromAppointment(apt)}
            className="min-h-[40px] px-3 py-2 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F8F8F6] text-[#0F223A] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isHandoverBusy ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#8C6D37]" />
            ) : (
              <ClipboardCheck className="w-4 h-4 text-[#8C6D37]" />
            )}
            <span>Lập bàn giao</span>
          </button>
        </div>
      );
    }

    return <span className="text-xs text-slate-400">Lịch đã hủy</span>;
  };

  return (
    <div className="space-y-5">
      {/* ============================================================ */}
      {/* GROUPED VIEW TABS & SEARCH BAR                               */}
      {/* ============================================================ */}
      <div className="bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-5 shadow-2xs space-y-4">
        {/* View Tabs: Chờ xác nhận | Sắp diễn ra | Đã hoàn tất | Đã hủy | Tất cả */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {viewTabs.map((tab) => {
            const active = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onViewChange(tab.id)}
                aria-pressed={active}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0F223A] text-white font-bold shadow-2xs'
                    : 'bg-[#F8F8F6] text-slate-700 hover:bg-[#EFECE6]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    active
                      ? 'bg-[#B89C66] text-[#0F223A]'
                      : tab.urgent
                      ? 'bg-amber-200 text-amber-950'
                      : 'bg-white text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Today Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#F1EFEA]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Tìm theo tên khách, số điện thoại, mã phòng..."
              aria-label="Tìm kiếm lịch hẹn xem phòng"
              className="w-full min-h-[44px] pl-10 pr-9 py-2 text-sm bg-[#F8F8F6] focus:bg-white border border-[#E5E3DE] focus:border-[#B89C66] rounded-xl outline-hidden text-[#0F223A]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange('')}
                aria-label="Xóa từ khóa"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#0F223A] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onOnlyTodayChange(!onlyToday)}
              aria-pressed={onlyToday}
              className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 border transition-colors cursor-pointer ${
                onlyToday
                  ? 'bg-[#FAF0DC] text-[#0F223A] border-[#B89C66] font-bold'
                  : 'bg-white text-slate-700 border-[#E5E3DE] hover:bg-[#F8F8F6]'
              }`}
            >
              <Calendar className="w-4 h-4 text-[#8C6D37]" />
              <span>Chỉ xem hôm nay ({todayCount})</span>
            </button>

            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="min-h-[42px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#8C6D37] hover:text-[#0F223A] inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xem toàn bộ</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* APPOINTMENTS LIST                                            */}
      {/* ============================================================ */}
      {appointments.length === 0 ? (
        <EmptyStateCard
          icon={<CalendarCheck className="w-6 h-6" />}
          title="Chưa có lịch hẹn xem phòng nào"
          description="Khi khách thuê đặt lịch xem phòng trên trang web hoặc ứng dụng, lịch hẹn sẽ tự động xuất hiện tại đây để bạn xác nhận."
        />
      ) : filteredAppointments.length === 0 ? (
        <EmptyStateCard
          isFilterEmpty
          title="Không có lịch hẹn nào trong mục này"
          description="Hãy chuyển sang nhóm trạng thái khác hoặc bấm Xem toàn bộ lịch hẹn."
          onClearFilter={resetFilters}
        />
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((apt) => {
            const room = roomById.get(apt.room_id);
            const roomCode = apt.room_code || room?.room_code || `#${apt.room_id}`;
            const roomTitle = apt.room_title || room?.title || `Phòng ${roomCode}`;
            const buildingName = apt.building_name || roomBuildingLabel(room);
            const statusMeta = APPOINTMENT_STATUS_META[apt.status];
            const overdue = isOverdueConfirmed(apt, today);

            return (
              <article
                key={apt.id}
                className="bg-white rounded-2xl border border-[#E5E3DE] hover:border-[#B89C66]/60 p-4 sm:p-5 shadow-2xs transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left: Time, Room, Guest & Contact */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 min-w-0 flex-1">
                  {/* Date & Time Slot Pill */}
                  <div className="sm:w-44 shrink-0 p-3 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE]">
                    <div className="flex items-center gap-1.5 text-sm font-extrabold text-[#0F223A]">
                      <Clock className="w-4 h-4 text-[#8C6D37] shrink-0" />
                      <span>{apt.time_slot}</span>
                    </div>
                    <p className="text-xs font-semibold text-[#8C6D37] mt-1">
                      {relativeDayLabel(apt.date)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ngày {formatDate(apt.date)}
                    </p>
                  </div>

                  {/* Guest & Room Details */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-[#0F223A] text-[#B89C66]">
                        Phòng {roomCode}
                      </span>
                      {buildingName && (
                        <span className="text-xs font-semibold text-slate-600 inline-flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-[#8C6D37]" />
                          <span>{buildingName}</span>
                        </span>
                      )}
                      <StatusBadge label={statusMeta.label} tone={statusMeta.tone} size="sm" />
                      {overdue && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                          Đã qua ngày hẹn • Cần cập nhật
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-slate-700 truncate">
                      {roomTitle}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm">
                      <span className="text-[#0F223A]">
                        Khách hẹn: <strong>{apt.user_name}</strong>
                      </span>

                      <a
                        href={`tel:${apt.user_phone}`}
                        className="inline-flex items-center gap-1.5 font-bold text-[#0F223A] hover:text-[#8C6D37]"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#8C6D37]" />
                        <span>Gọi {apt.user_phone}</span>
                      </a>

                      <a
                        href={zaloLink(apt.user_phone)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#8C6D37] hover:underline"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Nhắn Zalo</span>
                      </a>
                    </div>

                    {apt.notes && (
                      <p className="text-xs text-slate-600 bg-[#F8F8F6] px-3 py-1.5 rounded-lg border border-[#E5E3DE] mt-1">
                        Ghi chú của khách: &ldquo;{apt.notes}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Contextual Actions */}
                <div className="pt-3 lg:pt-0 border-t lg:border-t-0 lg:border-l border-[#F1EFEA] lg:pl-4 flex items-center justify-end shrink-0">
                  {renderActions(apt)}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
