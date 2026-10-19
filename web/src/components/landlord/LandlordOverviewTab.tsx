'use client';

import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileText,
  Home,
  KeyRound,
  Loader2,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  Wallet,
  Zap,
} from 'lucide-react';
import type { Appointment, Contract, Room, RoomStatus, UtilityBill } from '@/lib/types';
import {
  APPOINTMENT_STATUS_META,
  AppointmentView,
  compareAppointmentsAsc,
  contractDaysRemaining,
  formatDate,
  formatDateWithWeekday,
  formatShortVND,
  formatVND,
  greetingForHour,
  isContractExpiringSoon,
  isOverdueConfirmed,
  LandlordTab,
  normalizeDateKey,
  ROOM_STATUS_META,
  ROOM_STATUS_ORDER,
  roomBuildingLabel,
  todayKey,
  zaloLink,
} from './landlord-format';
import { StatusBadge } from './LandlordPrimitives';

interface LandlordOverviewTabProps {
  managerName: string;
  rooms: Room[];
  appointments: Appointment[];
  bills: UtilityBill[];
  contracts: Contract[];
  busyActionId: string | null;
  onNavigateRooms: (statusFilter: 'ALL' | RoomStatus) => void;
  onNavigateAppointments: (view: AppointmentView) => void;
  onNavigateBilling: (statusFilter: 'ALL' | 'UNPAID' | 'PAID') => void;
  onNavigateContracts: () => void;
  onConfirmAppointment: (apt: Appointment) => void;
  onRequestCancelAppointment: (apt: Appointment) => void;
  onCompleteAppointment: (apt: Appointment) => void;
  onCreateContractFromAppointment: (apt: Appointment) => void;
  onOpenCheckIn: (room: Room) => void;
  onToggleBillPaid: (bill: UtilityBill) => void;
  onOpenRenewContract: (contract: Contract) => void;
  onOpenCreateRoom: () => void;
}

export default function LandlordOverviewTab({
  managerName,
  rooms,
  appointments,
  bills,
  contracts,
  busyActionId,
  onNavigateRooms,
  onNavigateAppointments,
  onNavigateBilling,
  onNavigateContracts,
  onConfirmAppointment,
  onRequestCancelAppointment,
  onCompleteAppointment,
  onCreateContractFromAppointment,
  onOpenCheckIn,
  onToggleBillPaid,
  onOpenRenewContract,
  onOpenCreateRoom,
}: LandlordOverviewTabProps) {
  const today = todayKey();
  const greeting = greetingForHour(new Date().getHours());

  // Room counts (strictly separated: RENTED does NOT include BOOKED_VIEWING)
  const totalRooms = rooms.length;
  const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE');
  const bookedViewingRooms = rooms.filter((r) => r.status === 'BOOKED_VIEWING');
  const reservedRooms = rooms.filter((r) => r.status === 'RESERVED');
  const rentedRooms = rooms.filter((r) => r.status === 'RENTED');

  const trueOccupancyPercent =
    totalRooms > 0 ? Math.round((rentedRooms.length / totalRooms) * 100) : 0;

  // Financial figures: clearly distinguish expected monthly rent vs actual collected bills vs unpaid bills
  const expectedMonthlyRent = rentedRooms.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
  const unpaidBills = bills.filter((b) => b.status === 'UNPAID');
  const paidBills = bills.filter((b) => b.status === 'PAID');
  const unpaidBillsAmount = unpaidBills.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
  const collectedBillsAmount = paidBills.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);

  // Appointments: pending vs today's schedule
  const pendingAppointments = appointments
    .filter((a) => a.status === 'PENDING')
    .sort(compareAppointmentsAsc);

  const overdueConfirmedAppointments = appointments
    .filter((a) => isOverdueConfirmed(a, today))
    .sort(compareAppointmentsAsc);

  const todayAppointments = appointments
    .filter(
      (a) =>
        normalizeDateKey(a.date) === today &&
        (a.status === 'PENDING' || a.status === 'CONFIRMED' || a.status === 'COMPLETED')
    )
    .sort(compareAppointmentsAsc);

  const upcomingAfterToday = appointments
    .filter(
      (a) =>
        normalizeDateKey(a.date) > today &&
        (a.status === 'PENDING' || a.status === 'CONFIRMED')
    )
    .sort(compareAppointmentsAsc);

  // Expiring contracts (within 30 days)
  const expiringContracts = contracts.filter(isContractExpiringSoon);

  const roomById = new Map<number, Room>();
  for (const r of rooms) roomById.set(r.id, r);

  const totalActionItems =
    pendingAppointments.length +
    overdueConfirmedAppointments.length +
    reservedRooms.length +
    unpaidBills.length +
    expiringContracts.length;

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* GREETING & DAILY SUMMARY BAR                                 */}
      {/* ============================================================ */}
      <div className="bg-white rounded-2xl border border-[#E5E3DE] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <p className="text-xs sm:text-sm font-medium text-[#8C6D37]">
            {formatDateWithWeekday(today)}
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F223A] mt-0.5">
            {greeting}, {managerName}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {totalActionItems > 0 ? (
              <>
                Hiện có <strong className="text-[#0F223A]">{totalActionItems} việc cần xử lý</strong> để vận hành khu trọ trơn tru.
              </>
            ) : (
              'Mọi lịch hẹn, hóa đơn và hợp đồng đều đã được xử lý gọn gàng.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {pendingAppointments.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigateAppointments('PENDING')}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FAF0DC] hover:bg-[#F3E2BE] text-[#0F223A] border border-[#B89C66]/50 text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4 text-[#8C6D37]" />
              <span>Duyệt {pendingAppointments.length} lịch hẹn</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigateRooms('AVAILABLE')}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F8F8F6] hover:bg-[#EFECE6] text-[#0F223A] border border-[#E5E3DE] text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 text-[#8C6D37]" />
            <span>Xem {availableRooms.length} phòng trống</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4 CLICKABLE TASK-FIRST STAT CARDS                            */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Available rooms */}
        <button
          type="button"
          onClick={() => onNavigateRooms('AVAILABLE')}
          className="text-left bg-white hover:bg-[#FAF8F5] rounded-2xl border border-[#E5E3DE] hover:border-[#B89C66] p-5 shadow-2xs transition-all cursor-pointer group flex flex-col justify-between min-h-[136px]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-sm font-semibold text-slate-600 block">
                Phòng còn trống
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#0F223A]">
                  {availableRooms.length}
                </span>
                <span className="text-sm font-medium text-slate-500">
                  / {totalRooms} phòng
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#FAF0DC] text-[#8C6D37] flex items-center justify-center shrink-0">
              <Home className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F1EFEA] flex items-center justify-between text-xs font-semibold text-[#8C6D37] group-hover:text-[#0F223A]">
            <span>
              {bookedViewingRooms.length > 0
                ? `Thêm ${bookedViewingRooms.length} phòng đang có lịch xem`
                : 'Sẵn sàng đón khách xem phòng'}
            </span>
            <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>

        {/* Card 2: Pending Appointments */}
        <button
          type="button"
          onClick={() => onNavigateAppointments(pendingAppointments.length > 0 ? 'PENDING' : 'UPCOMING')}
          className="text-left bg-white hover:bg-[#FAF8F5] rounded-2xl border border-[#E5E3DE] hover:border-[#B89C66] p-5 shadow-2xs transition-all cursor-pointer group flex flex-col justify-between min-h-[136px]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-sm font-semibold text-slate-600 block">
                Lịch hẹn cần xử lý
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span
                  className={`text-2xl sm:text-3xl font-extrabold ${
                    pendingAppointments.length > 0 ? 'text-amber-700' : 'text-[#0F223A]'
                  }`}
                >
                  {pendingAppointments.length}
                </span>
                <span className="text-sm font-medium text-slate-500">
                  chờ xác nhận
                </span>
              </div>
            </div>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                pendingAppointments.length > 0
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-[#F8F8F6] text-[#0F223A]'
              }`}
            >
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F1EFEA] flex items-center justify-between text-xs font-semibold text-[#8C6D37] group-hover:text-[#0F223A]">
            <span>
              {todayAppointments.length > 0
                ? `Hôm nay có ${todayAppointments.length} lịch hẹn xem phòng`
                : `Tổng cộng ${appointments.length} lịch hẹn`}
            </span>
            <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>

        {/* Card 3: Unpaid Bills */}
        <button
          type="button"
          onClick={() => onNavigateBilling(unpaidBills.length > 0 ? 'UNPAID' : 'ALL')}
          title={`Chưa thu: ${formatVND(unpaidBillsAmount)} • Đã thu: ${formatVND(collectedBillsAmount)}`}
          className="text-left bg-white hover:bg-[#FAF8F5] rounded-2xl border border-[#E5E3DE] hover:border-[#B89C66] p-5 shadow-2xs transition-all cursor-pointer group flex flex-col justify-between min-h-[136px]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-sm font-semibold text-slate-600 block">
                Tiền hóa đơn chưa thu
              </span>
              <div className="mt-1.5">
                <span
                  className={`text-xl sm:text-2xl font-extrabold block truncate ${
                    unpaidBillsAmount > 0 ? 'text-rose-700' : 'text-[#0F223A]'
                  }`}
                >
                  {formatShortVND(unpaidBillsAmount)}
                </span>
              </div>
            </div>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                unpaidBills.length > 0
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-[#F8F8F6] text-[#0F223A]'
              }`}
            >
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F1EFEA] flex items-center justify-between text-xs font-semibold text-[#8C6D37] group-hover:text-[#0F223A]">
            <span>
              {unpaidBills.length > 0
                ? `${unpaidBills.length} hóa đơn chưa thanh toán`
                : `Đã thu đủ (${paidBills.length} hóa đơn)`}
            </span>
            <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>

        {/* Card 4: Rented rooms & Expected Rent vs Actual Collected */}
        <button
          type="button"
          onClick={() => onNavigateRooms('RENTED')}
          title={`Tiền phòng dự kiến từ ${rentedRooms.length} phòng đang thuê: ${formatVND(expectedMonthlyRent)}/tháng • Tiền hóa đơn đã thực thu: ${formatVND(collectedBillsAmount)}`}
          className="text-left bg-white hover:bg-[#FAF8F5] rounded-2xl border border-[#E5E3DE] hover:border-[#B89C66] p-5 shadow-2xs transition-all cursor-pointer group flex flex-col justify-between min-h-[136px]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-sm font-semibold text-slate-600 block">
                Phòng đang cho thuê
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#0F223A]">
                  {rentedRooms.length}
                </span>
                <span className="text-sm font-medium text-slate-500">
                  phòng ({trueOccupancyPercent}%)
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#0F223A] text-[#B89C66] flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F1EFEA] flex items-center justify-between text-xs text-slate-600 group-hover:text-[#0F223A]">
            <span className="truncate">
              Dự kiến: <strong className="text-[#0F223A]">{formatShortVND(expectedMonthlyRent)}/th</strong>
              {' • '}
              Thực thu: <strong className="text-[#8C6D37]">{formatShortVND(collectedBillsAmount)}</strong>
            </span>
            <ArrowRight className="w-4 h-4 shrink-0 text-[#8C6D37] transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>
      </div>

      {/* ============================================================ */}
      {/* MAIN WORKBENCH: ACTION QUEUE (LEFT) + TODAY'S VIEWINGS (RIGHT)*/}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (7 cols): VIỆC CẦN XỬ LÝ */}
        <section
          aria-labelledby="overview-tasks-heading"
          className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E3DE] p-5 sm:p-6 shadow-2xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#E5E3DE]">
              <div>
                <h3 id="overview-tasks-heading" className="text-base sm:text-lg font-bold text-[#0F223A]">
                  Việc cần xử lý
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  Các yêu cầu đang chờ xác nhận, thu tiền hoặc hoàn tất thủ tục
                </p>
              </div>
              <StatusBadge
                label={totalActionItems > 0 ? `${totalActionItems} việc cần làm` : 'Đã xử lý hết'}
                tone={totalActionItems > 0 ? 'amber' : 'gold'}
              />
            </div>

            {totalActionItems === 0 ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF0DC] text-[#8C6D37] flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-base font-bold text-[#0F223A]">
                  Hiện không có công việc tồn đọng
                </p>
                <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                  Tất cả lịch hẹn xem phòng đã được phản hồi và không có hóa đơn quá hạn chưa thu.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F1EFEA] mt-2">
                {/* 1. Pending viewing appointments */}
                {pendingAppointments.slice(0, 3).map((apt) => {
                  const room = roomById.get(apt.room_id);
                  const roomCode = apt.room_code || room?.room_code || `#${apt.room_id}`;
                  const isBusy = busyActionId === `apt-${apt.id}`;
                  return (
                    <div
                      key={`task-apt-${apt.id}`}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                          <CalendarCheck className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                              Chờ xác nhận lịch
                            </span>
                            <span className="text-sm font-bold text-[#0F223A]">
                              Phòng {roomCode}
                            </span>
                          </div>
                          <p className="text-sm text-[#0F223A] mt-1">
                            Khách: <strong>{apt.user_name}</strong> ({apt.user_phone})
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Ngày hẹn: {formatDate(apt.date)} • Khung giờ: <strong>{apt.time_slot}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => onConfirmAppointment(apt)}
                          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <span>Xác nhận lịch</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => onRequestCancelAppointment(apt)}
                          className="min-h-[40px] px-3 py-2 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F8F8F6] text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* 2. Reserved rooms waiting for check-in */}
                {reservedRooms.slice(0, 2).map((room) => (
                  <div
                    key={`task-reserved-${room.id}`}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#FAF0DC] border border-[#B89C66]/40 text-[#8C6D37] flex items-center justify-center shrink-0 mt-0.5">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#FAF0DC] text-[#0F223A]">
                            Chờ nhận phòng
                          </span>
                          <span className="text-sm font-bold text-[#0F223A]">
                            Phòng {room.room_code}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 mt-1 truncate">
                          {room.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Khách đã đặt cọc giữ chỗ ({formatVND(room.deposit || room.price)})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenCheckIn(room)}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Làm thủ tục nhận phòng</span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* 3. Unpaid utility bills */}
                {unpaidBills.slice(0, 3).map((bill) => {
                  const isBusy = busyActionId === `bill-${bill.id}`;
                  return (
                    <div
                      key={`task-bill-${bill.id}`}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-900">
                              Chưa thanh toán
                            </span>
                            <span className="text-sm font-bold text-[#0F223A]">
                              Phòng {bill.room_code} • Kỳ {bill.month}
                            </span>
                          </div>
                          <p className="text-sm text-[#0F223A] mt-1">
                            Cần thu: <strong className="text-rose-700">{formatVND(bill.total_amount)}</strong>
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Điện: {bill.electric_used} kWh • Nước: {bill.water_used} m³
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => onToggleBillPaid(bill)}
                          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#0F223A] hover:bg-[#193354] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <span>Xác nhận đã thu</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* 4. Expiring contracts */}
                {expiringContracts.slice(0, 2).map((contract) => {
                  const days = contractDaysRemaining(contract);
                  return (
                    <div
                      key={`task-contract-${contract.id}`}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                              {days !== null && days < 0
                                ? 'Đã quá hạn hợp đồng'
                                : `Sắp hết hạn (${days ?? 0} ngày)`}
                            </span>
                            <span className="text-sm font-bold text-[#0F223A] truncate">
                              {contract.room_title}
                            </span>
                          </div>
                          <p className="text-sm text-[#0F223A] mt-1">
                            Khách thuê: <strong>{contract.tenant_name}</strong> ({contract.tenant_phone})
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Ngày kết thúc: {formatDate(contract.end_date)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenRenewContract(contract)}
                          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Gia hạn</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer shortcuts */}
          <div className="pt-4 mt-4 border-t border-[#F1EFEA] flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => onNavigateAppointments('ALL')}
              className="font-semibold text-[#8C6D37] hover:text-[#0F223A] inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Xem tất cả lịch hẹn ({appointments.length})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateBilling('ALL')}
              className="font-semibold text-[#8C6D37] hover:text-[#0F223A] inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Quản lý hóa đơn ({bills.length})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* RIGHT COLUMN (5 cols): LỊCH XEM PHÒNG HÔM NAY */}
        <section
          aria-labelledby="overview-today-heading"
          className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E3DE] p-5 sm:p-6 shadow-2xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#E5E3DE]">
              <div>
                <h3 id="overview-today-heading" className="text-base sm:text-lg font-bold text-[#0F223A]">
                  Lịch xem phòng hôm nay
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  Ngày {formatDate(today)}
                </p>
              </div>
              <StatusBadge
                label={`${todayAppointments.length} lịch hôm nay`}
                tone={todayAppointments.length > 0 ? 'gold' : 'neutral'}
              />
            </div>

            {todayAppointments.length === 0 ? (
              <div className="py-6 space-y-4">
                <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE] text-center">
                  <Clock className="w-6 h-6 text-[#8C6D37] mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#0F223A]">
                    Hôm nay không có lịch khách hẹn xem phòng
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Các lịch đặt mới trong ngày sẽ hiển thị tại đây ngay khi khách đăng ký.
                  </p>
                </div>

                {upcomingAfterToday.length > 0 && (
                  <div className="space-y-2.5">
                    <p className="text-xs font-bold text-slate-500">
                      Lịch hẹn gần nhất sắp tới ({upcomingAfterToday.length}):
                    </p>
                    {upcomingAfterToday.slice(0, 2).map((apt) => {
                      const room = roomById.get(apt.room_id);
                      const roomCode = apt.room_code || room?.room_code || `#${apt.room_id}`;
                      const statusMeta = APPOINTMENT_STATUS_META[apt.status];
                      return (
                        <div
                          key={`upcoming-${apt.id}`}
                          className="p-3.5 rounded-xl border border-[#E5E3DE] bg-white flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#8C6D37]">
                                {formatDate(apt.date)} • {apt.time_slot}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-[#0F223A] mt-0.5 truncate">
                              Phòng {roomCode} — {apt.user_name}
                            </p>
                          </div>
                          <StatusBadge label={statusMeta.label} tone={statusMeta.tone} size="sm" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {todayAppointments.map((apt) => {
                  const room = roomById.get(apt.room_id);
                  const roomCode = apt.room_code || room?.room_code || `#${apt.room_id}`;
                  const buildingName = apt.building_name || roomBuildingLabel(room);
                  const statusMeta = APPOINTMENT_STATUS_META[apt.status];
                  const isBusy = busyActionId === `apt-${apt.id}`;

                  return (
                    <div
                      key={`today-${apt.id}`}
                      className="p-4 rounded-xl border border-[#E5E3DE] bg-[#F8F8F6]/70 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#0F223A]">
                            <Clock className="w-4 h-4 text-[#8C6D37]" />
                            <span>{apt.time_slot}</span>
                          </span>
                          <p className="text-sm font-bold text-[#0F223A] mt-1">
                            Phòng {roomCode}
                            {buildingName ? (
                              <span className="font-normal text-slate-600"> • {buildingName}</span>
                            ) : null}
                          </p>
                        </div>
                        <StatusBadge label={statusMeta.label} tone={statusMeta.tone} size="sm" />
                      </div>

                      <div className="flex items-center justify-between gap-2 text-sm text-slate-700 pt-2 border-t border-[#E5E3DE]/80">
                        <div>
                          <span className="font-semibold text-[#0F223A]">{apt.user_name}</span>
                          <span className="mx-1.5 text-slate-300">•</span>
                          <a
                            href={`tel:${apt.user_phone}`}
                            className="font-semibold text-[#8C6D37] hover:underline inline-flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>{apt.user_phone}</span>
                          </a>
                        </div>
                        <a
                          href={zaloLink(apt.user_phone)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-[#0F223A] hover:text-[#8C6D37] underline"
                        >
                          Nhắn Zalo
                        </a>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        {apt.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => onConfirmAppointment(apt)}
                              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-xs font-bold cursor-pointer disabled:opacity-50"
                            >
                              Xác nhận lịch
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => onRequestCancelAppointment(apt)}
                              className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F8F8F6] text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
                            >
                              Hủy
                            </button>
                          </>
                        )}
                        {apt.status === 'CONFIRMED' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => onCompleteAppointment(apt)}
                            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#0F223A] hover:bg-[#193354] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                          >
                            Đã đón khách xem
                          </button>
                        )}
                        {apt.status === 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => onCreateContractFromAppointment(apt)}
                            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-xs font-bold cursor-pointer"
                          >
                            Lập hợp đồng
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-[#F1EFEA] flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Tự động chặn đặt trùng khung giờ cùng phòng
            </span>
            <button
              type="button"
              onClick={() => onNavigateAppointments('UPCOMING')}
              className="text-xs sm:text-sm font-semibold text-[#8C6D37] hover:text-[#0F223A] inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Lịch sắp diễn ra</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </div>

      {/* ============================================================ */}
      {/* ROOM STATUS DISTRIBUTION BAR & BREAKDOWN                     */}
      {/* ============================================================ */}
      <section
        aria-labelledby="overview-distribution-heading"
        className="bg-white rounded-2xl border border-[#E5E3DE] p-5 sm:p-6 shadow-2xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 id="overview-distribution-heading" className="text-base sm:text-lg font-bold text-[#0F223A]">
              Tổng hợp trạng thái phòng ({totalRooms} phòng)
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Bấm vào từng trạng thái để xem danh sách phòng tương ứng
            </p>
          </div>

          {totalRooms === 0 && (
            <button
              type="button"
              onClick={onOpenCreateRoom}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm phòng đầu tiên</span>
            </button>
          )}
        </div>

        {/* Segmented Progress Bar */}
        {totalRooms > 0 && (
          <div
            className="h-3.5 w-full rounded-full bg-[#F1EFEA] overflow-hidden flex p-0.5 gap-0.5"
            role="img"
            aria-label={`Phân bố ${totalRooms} phòng: ${availableRooms.length} còn trống, ${bookedViewingRooms.length} có lịch xem, ${reservedRooms.length} đã giữ chỗ, ${rentedRooms.length} đang thuê`}
          >
            {ROOM_STATUS_ORDER.map((status) => {
              const count = rooms.filter((r) => r.status === status).length;
              if (count === 0) return null;
              const pct = Math.max(4, Math.round((count / totalRooms) * 100));
              const meta = ROOM_STATUS_META[status];
              return (
                <div
                  key={status}
                  style={{ width: `${pct}%`, backgroundColor: meta.barColor }}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-200"
                  title={`${meta.label}: ${count} phòng`}
                />
              );
            })}
          </div>
        )}

        {/* 4 Clickable Status Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {ROOM_STATUS_ORDER.map((status) => {
            const count = rooms.filter((r) => r.status === status).length;
            const pct = totalRooms > 0 ? Math.round((count / totalRooms) * 100) : 0;
            const meta = ROOM_STATUS_META[status];
            return (
              <button
                key={status}
                type="button"
                onClick={() => onNavigateRooms(status)}
                className="p-4 rounded-xl border border-[#E5E3DE] bg-[#F8F8F6]/60 hover:bg-white hover:border-[#B89C66] text-left transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: meta.barColor }}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-bold text-[#0F223A]">{meta.label}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 truncate">{meta.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-lg font-extrabold text-[#0F223A] block">
                    {count}
                  </span>
                  <span className="text-xs text-slate-500">{pct}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
