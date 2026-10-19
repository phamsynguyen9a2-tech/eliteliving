'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileText,
  Loader2,
  LogOut,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import type { Appointment, Contract, Room } from '@/lib/types';
import EliteSelect, { type EliteSelectOption } from '@/components/EliteSelect';
import {
  addMonthsToDateKey,
  CONTRACT_STATUS_META,
  contractDaysRemaining,
  formatDate,
  formatVND,
  isContractExpiringSoon,
  isValidCitizenId,
  isValidVnPhone,
  ROOM_STATUS_META,
  todayKey,
} from './landlord-format';
import {
  EmptyStateCard,
  FormField,
  SlideOverDrawer,
  StatusBadge,
} from './LandlordPrimitives';

export interface ContractPrefill {
  roomId?: number;
  tenantName?: string;
  tenantPhone?: string;
}

interface LandlordContractsTabProps {
  contracts: Contract[];
  rooms: Room[];
  appointments: Appointment[];
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  drawerOpen: boolean;
  prefill: ContractPrefill | null;
  onOpenDrawer: (prefill?: ContractPrefill) => void;
  onCloseDrawer: () => void;
  submittingContract: boolean;
  onCreateContract: (payload: {
    room: Room;
    tenantName: string;
    tenantPhone: string;
    tenantCitizenId: string;
    tenantAddress: string;
    vehicleCount: number;
    startDate: string;
    endDate: string;
  }) => Promise<boolean>;
  onPrintContract: (contract: Contract) => void;
  onOpenRenewContract: (contract: Contract) => void;
  onOpenCheckOutContract: (contract: Contract) => void;
  onRequestTerminateContract: (contract: Contract) => void;
}

export default function LandlordContractsTab({
  contracts,
  rooms,
  appointments,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  drawerOpen,
  prefill,
  onOpenDrawer,
  onCloseDrawer,
  submittingContract,
  onCreateContract,
  onPrintContract,
  onOpenRenewContract,
  onOpenCheckOutContract,
  onRequestTerminateContract,
}: LandlordContractsTabProps) {
  const selectableRooms = rooms.filter((r) => r.status !== 'RENTED');
  const candidateRooms = selectableRooms.length > 0 ? selectableRooms : rooms;

  const [selectedRoomId, setSelectedRoomId] = useState<number>(
    prefill?.roomId || candidateRooms[0]?.id || 0
  );
  const [tenantName, setTenantName] = useState<string>('');
  const [tenantPhone, setTenantPhone] = useState<string>('');
  const [tenantCitizenId, setTenantCitizenId] = useState<string>('');
  const [tenantAddress, setTenantAddress] = useState<string>('');
  const [vehicleCount, setVehicleCount] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(todayKey());
  const [endDate, setEndDate] = useState<string>(addMonthsToDateKey(todayKey(), 12));
  const [errors, setErrors] = useState<{
    tenantName?: string;
    tenantPhone?: string;
    tenantCitizenId?: string;
    tenantAddress?: string;
    dates?: string;
  }>({});

  // When drawer opens or prefill changes, populate only known real data (never fake sample PII)
  useEffect(() => {
    if (!drawerOpen) return;
    const targetRoomId = prefill?.roomId || candidateRooms[0]?.id || 0;
    setSelectedRoomId(targetRoomId);

    if (prefill?.tenantName || prefill?.tenantPhone) {
      setTenantName(prefill.tenantName || '');
      setTenantPhone(prefill.tenantPhone || '');
    } else {
      // Check if this room has a recent completed/confirmed appointment to prefill guest name/phone
      const knownApt = appointments.find(
        (a) =>
          a.room_id === targetRoomId &&
          (a.status === 'COMPLETED' || a.status === 'CONFIRMED' || a.status === 'PENDING')
      );
      setTenantName(knownApt?.user_name || '');
      setTenantPhone(knownApt?.user_phone || '');
    }

    setTenantCitizenId('');
    setTenantAddress('');
    setVehicleCount(1);
    const today = todayKey();
    setStartDate(today);
    setEndDate(addMonthsToDateKey(today, 12));
    setErrors({});
  }, [drawerOpen, prefill]);

  const handleRoomSelectionChange = (newRoomId: number) => {
    setSelectedRoomId(newRoomId);
    // Only auto-fill guest name & phone if fields are currently empty or user hasn't typed custom info
    const knownApt = appointments.find(
      (a) =>
        a.room_id === newRoomId &&
        (a.status === 'COMPLETED' || a.status === 'CONFIRMED' || a.status === 'PENDING')
    );
    if (knownApt) {
      setTenantName(knownApt.user_name);
      setTenantPhone(knownApt.user_phone);
    } else if (!prefill?.tenantName) {
      setTenantName('');
      setTenantPhone('');
    }
  };

  const selectedRoom =
    rooms.find((r) => r.id === Number(selectedRoomId)) || candidateRooms[0];

  // Appointments for the selected room so landlord can pick with 1 click if multiple guests viewed
  const roomAppointments = selectedRoom
    ? appointments.filter(
        (a) => a.room_id === selectedRoom.id && a.status !== 'CANCELLED'
      )
    : [];

  // Summary counts
  const activeContracts = contracts.filter((c) => c.status === 'ACTIVE');
  const expiringContracts = contracts.filter(isContractExpiringSoon);
  const terminatedContracts = contracts.filter((c) => c.status !== 'ACTIVE');

  // Filtered contracts
  const filteredContracts = contracts.filter((c) => {
    if (statusFilter === 'ACTIVE' && c.status !== 'ACTIVE') return false;
    if (statusFilter === 'EXPIRING' && !isContractExpiringSoon(c)) return false;
    if (statusFilter === 'TERMINATED' && c.status === 'ACTIVE') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        c.tenant_name.toLowerCase().includes(q) ||
        c.tenant_phone.toLowerCase().includes(q) ||
        c.room_title.toLowerCase().includes(q) ||
        String(c.room_id).includes(q)
      );
    }
    return true;
  });

  const hasFilters = statusFilter !== 'ALL' || searchQuery.trim().length > 0;

  const roomOptions: EliteSelectOption[] = candidateRooms.map((r) => ({
    value: String(r.id),
    label: `Phòng ${r.room_code} — ${r.title}`,
    sublabel: `Giá thuê: ${formatVND(r.price)}/tháng • Tiền cọc: ${formatVND(r.deposit || r.price)}`,
    badge: ROOM_STATUS_META[r.status]?.label,
  }));

  const handleSubmitContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    const nextErrors: typeof errors = {};
    if (!tenantName.trim() || tenantName.trim().length < 2) {
      nextErrors.tenantName = 'Vui lòng nhập họ và tên đầy đủ của người thuê.';
    }
    if (!isValidVnPhone(tenantPhone)) {
      nextErrors.tenantPhone = 'Vui lòng nhập số điện thoại di động hợp lệ (10 chữ số, ví dụ 0908123456).';
    }
    if (!isValidCitizenId(tenantCitizenId)) {
      nextErrors.tenantCitizenId = 'Số CCCD/CMND cần gồm 9 hoặc 12 chữ số.';
    }
    if (!tenantAddress.trim() || tenantAddress.trim().length < 5) {
      nextErrors.tenantAddress = 'Vui lòng nhập địa chỉ thường trú theo CCCD.';
    }
    if (!startDate || !endDate || endDate <= startDate) {
      nextErrors.dates = 'Ngày kết thúc hợp đồng phải sau ngày bắt đầu.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const ok = await onCreateContract({
      room: selectedRoom,
      tenantName: tenantName.trim(),
      tenantPhone: tenantPhone.trim(),
      tenantCitizenId: tenantCitizenId.trim(),
      tenantAddress: tenantAddress.trim(),
      vehicleCount: Math.max(0, Number(vehicleCount) || 0),
      startDate,
      endDate,
    });
    if (ok) {
      onCloseDrawer();
    }
  };

  return (
    <div className="space-y-5">
      {/* ============================================================ */}
      {/* SUMMARY STRIP                                                */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onStatusFilterChange('ACTIVE')}
          className={`text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'ACTIVE'
              ? 'bg-[#FAF0DC]/60 border-[#B89C66]'
              : 'bg-white border-[#E5E3DE] hover:border-[#B89C66]'
          }`}
        >
          <span className="text-xs sm:text-sm font-semibold text-slate-600 block">
            Hợp đồng đang hiệu lực
          </span>
          <p className="text-2xl font-extrabold text-[#0F223A] mt-1">
            {activeContracts.length} hợp đồng
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            Đang thu tiền thuê hàng tháng
          </span>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange('EXPIRING')}
          className={`text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'EXPIRING'
              ? 'bg-[#FAF0DC]/60 border-[#B89C66]'
              : 'bg-white border-[#E5E3DE] hover:border-[#B89C66]'
          }`}
        >
          <span className="text-xs sm:text-sm font-semibold text-slate-600 block">
            Sắp đến hạn (trong 30 ngày)
          </span>
          <p
            className={`text-2xl font-extrabold mt-1 ${
              expiringContracts.length > 0 ? 'text-amber-700' : 'text-[#0F223A]'
            }`}
          >
            {expiringContracts.length} hợp đồng
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            Cần liên hệ gia hạn hoặc trả phòng
          </span>
        </button>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E3DE] flex items-center justify-between gap-3">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-slate-600 block">
              Phòng sẵn sàng ký mới
            </span>
            <p className="text-2xl font-extrabold text-[#0F223A] mt-1">
              {selectableRooms.length} phòng
            </p>
            <span className="text-xs text-slate-500 mt-1 block">
              Đính kèm tự động 10 điều nội quy PCCC
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpenDrawer()}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-sm font-bold shadow-sm shadow-[#B89C66]/25 inline-flex items-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Lập hợp đồng</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* FILTER & SEARCH BAR                                          */}
      {/* ============================================================ */}
      <div className="bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Tìm theo tên người thuê, số điện thoại, tên phòng..."
            aria-label="Tìm kiếm hợp đồng"
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

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { key: 'ALL', label: 'Tất cả', count: contracts.length },
            { key: 'ACTIVE', label: 'Đang hiệu lực', count: activeContracts.length },
            { key: 'EXPIRING', label: 'Sắp hết hạn', count: expiringContracts.length },
            { key: 'TERMINATED', label: 'Đã thanh lý', count: terminatedContracts.length },
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
                    ? 'bg-[#0F223A] text-white font-bold'
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

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                onStatusFilterChange('ALL');
                onSearchQueryChange('');
              }}
              className="min-h-[40px] px-3 py-2 text-xs sm:text-sm font-bold text-[#8C6D37] hover:text-[#0F223A] inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* CONTRACTS LIST (Primary full-width content)                  */}
      {/* ============================================================ */}
      {contracts.length === 0 ? (
        <EmptyStateCard
          icon={<FileText className="w-6 h-6" />}
          title="Chưa có hợp đồng thuê nào"
          description="Bấm Lập hợp đồng để tạo hợp đồng điện tử kèm 10 điều nội quy PCCC và chuyển phòng sang trạng thái Đang thuê."
          actionLabel="Lập hợp đồng mới"
          onAction={() => onOpenDrawer()}
        />
      ) : filteredContracts.length === 0 ? (
        <EmptyStateCard
          isFilterEmpty
          title="Không tìm thấy hợp đồng phù hợp"
          description="Hãy thử xóa bộ lọc hoặc đổi từ khóa tìm kiếm."
          onClearFilter={() => {
            onStatusFilterChange('ALL');
            onSearchQueryChange('');
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredContracts.map((contract) => {
            const room = rooms.find((r) => r.id === contract.room_id);
            const roomCode = room?.room_code || `#${contract.room_id}`;
            const statusMeta =
              CONTRACT_STATUS_META[contract.status] || CONTRACT_STATUS_META.ACTIVE;
            const daysRemaining = contractDaysRemaining(contract);
            const expiringSoon = isContractExpiringSoon(contract);

            return (
              <article
                key={contract.id}
                className="bg-white rounded-2xl border border-[#E5E3DE] hover:border-[#B89C66]/60 p-4 sm:p-5 shadow-2xs transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left: Room, Tenant, Lease Term */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-[#0F223A] text-[#B89C66]">
                      Phòng {roomCode}
                    </span>
                    <h3 className="text-base font-bold text-[#0F223A] truncate">
                      {contract.room_title}
                    </h3>
                    <StatusBadge label={statusMeta.label} tone={statusMeta.tone} size="sm" />
                    {expiringSoon && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        <span>
                          {daysRemaining !== null && daysRemaining > 0
                            ? `Còn ${daysRemaining} ngày hết hạn`
                            : 'Đã đến hạn hợp đồng'}
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-700 pt-0.5">
                    <span>
                      Người thuê: <strong className="text-[#0F223A]">{contract.tenant_name}</strong>
                    </span>
                    <a
                      href={`tel:${contract.tenant_phone}`}
                      className="inline-flex items-center gap-1 font-semibold text-[#8C6D37] hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{contract.tenant_phone}</span>
                    </a>
                    {contract.tenant_citizen_id && (
                      <span className="text-xs text-slate-500">
                        CCCD: <strong className="text-slate-700">{contract.tenant_citizen_id}</strong>
                      </span>
                    )}
                    {contract.vehicle_count !== undefined && (
                      <span className="text-xs text-slate-500">
                        Xe máy: <strong className="text-slate-700">{contract.vehicle_count} chiếc</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#8C6D37]" />
                      <span>
                        Thời hạn: <strong>{formatDate(contract.start_date)}</strong> &rarr;{' '}
                        <strong>{formatDate(contract.end_date)}</strong>
                      </span>
                    </span>
                    {contract.tenant_signed && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#8C6D37] bg-[#FAF0DC] px-2.5 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Khách đã ký điện tử</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Rent / Deposit & Actions */}
                <div className="pt-3 lg:pt-0 border-t lg:border-t-0 lg:border-l border-[#F1EFEA] lg:pl-5 flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 shrink-0">
                  <div className="lg:text-right">
                    <span className="text-xs text-slate-500 block">Giá thuê &amp; Tiền cọc</span>
                    <span className="text-base sm:text-lg font-extrabold text-[#0F223A] block">
                      {formatVND(contract.monthly_rent)}/tháng
                    </span>
                    <span className="text-xs text-slate-600 block">
                      Tiền cọc: <strong>{formatVND(contract.deposit_amount)}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={() => onPrintContract(contract)}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F8F8F6] text-[#0F223A] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-[#8C6D37]" />
                      <span>Bản in hợp đồng</span>
                    </button>

                    {contract.status === 'ACTIVE' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenRenewContract(contract)}
                          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Gia hạn</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenCheckOutContract(contract)}
                          className="min-h-[40px] px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Trả phòng &amp; Quyết toán</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onRequestTerminateContract(contract)}
                          className="min-h-[40px] px-3 py-2 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F8F8F6] text-slate-600 hover:text-rose-700 text-xs font-medium transition-colors cursor-pointer"
                          title="Thanh lý nhanh hợp đồng và chuyển phòng về Còn trống"
                        >
                          Thanh lý nhanh
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* SLIDE-OVER DRAWER: LẬP HỢP ĐỒNG THUÊ MỚI                     */}
      {/* ============================================================ */}
      <SlideOverDrawer
        open={drawerOpen}
        onClose={onCloseDrawer}
        title="Lập hợp đồng thuê điện tử"
        subtitle="Tự động điền giá phòng, tiền cọc và đính kèm 10 điều nội quy PCCC"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={submittingContract}
              onClick={onCloseDrawer}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F8F8F6] text-sm font-semibold text-[#0F223A] cursor-pointer disabled:opacity-50"
            >
              Đóng
            </button>
            <button
              type="submit"
              form="landlord-create-contract-form"
              disabled={submittingContract || !selectedRoom}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-sm font-bold shadow-sm shadow-[#B89C66]/25 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submittingContract ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu hợp đồng...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ký &amp; Lưu hợp đồng</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <form id="landlord-create-contract-form" onSubmit={handleSubmitContract} className="space-y-4">
          <FormField label="1. Chọn phòng cho thuê" required>
            <EliteSelect
              value={selectedRoom ? String(selectedRoom.id) : ''}
              onChange={(val) => handleRoomSelectionChange(Number(val))}
              options={roomOptions}
              searchable
              searchPlaceholder="Tìm theo mã phòng hoặc tên phòng..."
              ariaLabel="Chọn phòng lập hợp đồng"
            />
          </FormField>

          {selectedRoom && (
            <div className="p-3.5 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE] flex items-center justify-between text-xs sm:text-sm">
              <div>
                <span className="text-slate-500 block">Giá thuê theo tháng:</span>
                <strong className="text-[#0F223A] text-sm">{formatVND(selectedRoom.price)}/tháng</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Tiền đặt cọc hợp đồng:</span>
                <strong className="text-[#8C6D37] text-sm">
                  {formatVND(selectedRoom.deposit || selectedRoom.price)}
                </strong>
              </div>
            </div>
          )}

          {/* Quick prefill chips from existing viewing appointments of this room */}
          {roomAppointments.length > 0 && (
            <div className="p-3 rounded-xl bg-[#FAF0DC]/60 border border-[#B89C66]/40 space-y-2">
              <span className="text-xs font-bold text-[#0F223A] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#8C6D37]" />
                <span>Chọn nhanh khách đã đặt lịch xem phòng này:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {roomAppointments.slice(0, 4).map((apt) => (
                  <button
                    key={apt.id}
                    type="button"
                    onClick={() => {
                      setTenantName(apt.user_name);
                      setTenantPhone(apt.user_phone);
                      setErrors((prev) => ({
                        ...prev,
                        tenantName: undefined,
                        tenantPhone: undefined,
                      }));
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#FAF0DC] border border-[#E5E3DE] text-xs font-semibold text-[#0F223A] cursor-pointer"
                  >
                    {apt.user_name} ({apt.user_phone})
                  </button>
                ))}
              </div>
            </div>
          )}

          <FormField
            label="Họ và tên người thuê"
            htmlFor="contract-tenant-name"
            required
            error={errors.tenantName}
          >
            <input
              id="contract-tenant-name"
              type="text"
              value={tenantName}
              onChange={(e) => {
                setErrors((prev) => ({ ...prev, tenantName: undefined }));
                setTenantName(e.target.value);
              }}
              placeholder="Nhập họ tên theo CCCD..."
              className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-[#F8F8F6] focus:bg-white border border-[#E5E3DE] focus:border-[#B89C66] rounded-xl outline-hidden text-[#0F223A]"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField
              label="Số điện thoại liên hệ"
              htmlFor="contract-tenant-phone"
              required
              error={errors.tenantPhone}
            >
              <input
                id="contract-tenant-phone"
                type="tel"
                value={tenantPhone}
                onChange={(e) => {
                  setErrors((prev) => ({ ...prev, tenantPhone: undefined }));
                  setTenantPhone(e.target.value);
                }}
                placeholder="Ví dụ: 0908123456"
                className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-[#F8F8F6] focus:bg-white border border-[#E5E3DE] focus:border-[#B89C66] rounded-xl outline-hidden text-[#0F223A]"
              />
            </FormField>

            <FormField
              label="Số CCCD / CMND"
              htmlFor="contract-tenant-cccd"
              required
              error={errors.tenantCitizenId}
            >
              <input
                id="contract-tenant-cccd"
                type="text"
                inputMode="numeric"
                value={tenantCitizenId}
                onChange={(e) => {
                  setErrors((prev) => ({ ...prev, tenantCitizenId: undefined }));
                  setTenantCitizenId(e.target.value);
                }}
                placeholder="12 chữ số trên thẻ CCCD"
                className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-[#F8F8F6] focus:bg-white border border-[#E5E3DE] focus:border-[#B89C66] rounded-xl outline-hidden text-[#0F223A]"
              />
            </FormField>
          </div>

          <FormField
            label="Địa chỉ thường trú (theo CCCD)"
            htmlFor="contract-tenant-address"
            required
            error={errors.tenantAddress}
          >
            <input
              id="contract-tenant-address"
              type="text"
              value={tenantAddress}
              onChange={(e) => {
                setErrors((prev) => ({ ...prev, tenantAddress: undefined }));
                setTenantAddress(e.target.value);
              }}
              placeholder="Nhập xã/phường, quận/huyện, tỉnh/thành phố..."
              className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-[#F8F8F6] focus:bg-white border border-[#E5E3DE] focus:border-[#B89C66] rounded-xl outline-hidden text-[#0F223A]"
            />
          </FormField>

          <FormField
            label="Số lượng xe máy đăng ký gửi"
            htmlFor="contract-vehicle-count"
            unit="chiếc"
          >
            <input
              id="contract-vehicle-count"
              type="number"
              min={0}
              max={4}
              value={vehicleCount}
              onChange={(e) => setVehicleCount(Number(e.target.value))}
              className="w-32 min-h-[44px] px-3.5 py-2 text-sm font-bold bg-[#F8F8F6] focus:bg-white border border-[#E5E3DE] focus:border-[#B89C66] rounded-xl outline-hidden text-[#0F223A]"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField label="Ngày bắt đầu thuê" htmlFor="contract-start-date" required>
              <input
                id="contract-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setErrors((prev) => ({ ...prev, dates: undefined }));
                  setStartDate(e.target.value);
                }}
                className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-[#F8F8F6] focus:bg-white border border-[#E5E3DE] focus:border-[#B89C66] rounded-xl outline-hidden text-[#0F223A]"
              />
            </FormField>

            <FormField
              label="Ngày kết thúc hợp đồng"
              htmlFor="contract-end-date"
              required
              error={errors.dates}
            >
              <input
                id="contract-end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setErrors((prev) => ({ ...prev, dates: undefined }));
                  setEndDate(e.target.value);
                }}
                className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-[#F8F8F6] focus:bg-white border border-[#E5E3DE] focus:border-[#B89C66] rounded-xl outline-hidden text-[#0F223A]"
              />
            </FormField>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF0DC]/60 border border-[#B89C66]/40 text-xs sm:text-sm text-[#0F223A] flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#8C6D37] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Tự động đính kèm nội quy:</strong> Hợp đồng sẽ gắn liền với{' '}
              <strong>Bộ 10 điều nội quy nhà trọ &amp; an toàn PCCC</strong> và chuyển trạng thái phòng sang{' '}
              <strong>Đang thuê</strong> ngay khi lưu.
            </div>
          </div>
        </form>
      </SlideOverDrawer>
    </div>
  );
}
