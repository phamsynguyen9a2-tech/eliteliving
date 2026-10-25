'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Droplets,
  Loader2,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RotateCcw,
  Search,
  Send,
  X,
  Zap,
} from 'lucide-react';
import type { Contract, Room, UtilityBill } from '@/lib/types';
import EliteSelect, { type EliteSelectOption } from '@/components/EliteSelect';
import {
  BILL_STATUS_META,
  currentBillingMonth,
  formatShortVND,
  formatVND,
  latestBillForRoom,
  ROOM_STATUS_META,
} from './landlord-format';
import {
  EmptyStateCard,
  FormField,
  SlideOverDrawer,
  StatusBadge,
} from './LandlordPrimitives';

interface LandlordBillingTabProps {
  bills: UtilityBill[];
  rooms: Room[];
  contracts: Contract[];
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  drawerOpen: boolean;
  onOpenDrawer: (roomId?: number) => void;
  onCloseDrawer: () => void;
  selectedRoomId: number;
  onSelectRoomId: (roomId: number) => void;
  submittingBill: boolean;
  busyBillId: string | null;
  sendingBillId: string | null;
  onCreateBill: (payload: {
    room: Room;
    electricOld: number;
    electricNew: number;
    waterOld: number;
    waterNew: number;
  }) => Promise<boolean>;
  onToggleBillStatus: (bill: UtilityBill) => void;
  /** Mở bảng lập hóa đơn hàng loạt cho cả tháng */
  onOpenBulkBilling?: () => void;
  onPrintBill: (bill: UtilityBill) => void;
  onSendBillEmail: (bill: UtilityBill) => void;
  onOpenPayQr: (bill: UtilityBill) => void;
}

export default function LandlordBillingTab({
  bills,
  rooms,
  contracts,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  drawerOpen,
  onOpenDrawer,
  onCloseDrawer,
  selectedRoomId,
  onSelectRoomId,
  submittingBill,
  busyBillId,
  sendingBillId,
  onCreateBill,
  onToggleBillStatus,
  onPrintBill,
  onSendBillEmail,
  onOpenPayQr,
  onOpenBulkBilling,
}: LandlordBillingTabProps) {
  const [electricOld, setElectricOld] = useState<number>(0);
  const [electricNew, setElectricNew] = useState<number>(0);
  const [waterOld, setWaterOld] = useState<number>(0);
  const [waterNew, setWaterNew] = useState<number>(0);
  const [errors, setErrors] = useState<{ electric?: string; water?: string }>({});

  const selectedRoom =
    rooms.find((r) => r.id === Number(selectedRoomId)) ||
    rooms.find((r) => r.status === 'RENTED') ||
    rooms[0];

  // Auto-fill meter readings from the room's most recent bill (without fake personal data)
  useEffect(() => {
    if (!selectedRoom) return;
    const latest = latestBillForRoom(bills, selectedRoom.id);
    if (latest) {
      setElectricOld(latest.electric_new);
      setElectricNew(latest.electric_new);
      setWaterOld(latest.water_new);
      setWaterNew(latest.water_new);
    } else {
      setElectricOld(0);
      setElectricNew(0);
      setWaterOld(0);
      setWaterNew(0);
    }
    setErrors({});
  }, [selectedRoom?.id, bills]);

  const activeContractByRoom = new Map<number, Contract>();
  for (const c of contracts) {
    if (c.status === 'ACTIVE' && !activeContractByRoom.has(c.room_id)) {
      activeContractByRoom.set(c.room_id, c);
    }
  }

  const roomById = new Map<number, Room>();
  for (const r of rooms) roomById.set(r.id, r);

  // Summary metrics
  const unpaidBills = bills.filter((b) => b.status === 'UNPAID');
  const paidBills = bills.filter((b) => b.status === 'PAID');
  const unpaidTotal = unpaidBills.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
  const paidTotal = paidBills.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);

  // Filtered bills
  const filteredBills = bills.filter((b) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const activeContract = activeContractByRoom.get(b.room_id);
      const tenantName = (activeContract?.tenant_name || '').toLowerCase();
      return (
        b.room_code.toLowerCase().includes(q) ||
        b.month.toLowerCase().includes(q) ||
        tenantName.includes(q)
      );
    }
    return true;
  });

  const hasFilters = statusFilter !== 'ALL' || searchQuery.trim().length > 0;

  // Room selector options for drawer (prioritize RENTED rooms at top)
  const sortedRoomsForSelect = [...rooms].sort((a, b) => {
    if (a.status === 'RENTED' && b.status !== 'RENTED') return -1;
    if (a.status !== 'RENTED' && b.status === 'RENTED') return 1;
    return a.room_code.localeCompare(b.room_code);
  });

  const roomSelectOptions: EliteSelectOption[] = sortedRoomsForSelect.map((r) => {
    const contract = activeContractByRoom.get(r.id);
    return {
      value: String(r.id),
      label: `Phòng ${r.room_code} — ${r.title}`,
      sublabel: contract
        ? `Khách đang thuê: ${contract.tenant_name} • Giá phòng: ${formatVND(r.price)}`
        : `Giá phòng: ${formatVND(r.price)}/tháng`,
      badge: ROOM_STATUS_META[r.status]?.label,
    };
  });

  // Live bill preview inside drawer
  const electricRate = selectedRoom?.electricity_rate || 3800;
  const waterRate = selectedRoom?.water_rate || 25000;
  const internetCost = selectedRoom?.internet_fee || 100000;
  const serviceCost = selectedRoom?.service_fee || 150000;
  // Tiền thuê lấy theo hợp đồng đang hiệu lực (máy chủ cũng tính như vậy)
  const rentCost = (selectedRoom && activeContractByRoom.get(selectedRoom.id)?.monthly_rent) || selectedRoom?.price || 0;
  const electricUsed = Math.max(0, electricNew - electricOld);
  const waterUsed = Math.max(0, waterNew - waterOld);
  const electricCost = electricUsed * electricRate;
  const waterCost = waterUsed * waterRate;
  const estimatedTotal = rentCost + electricCost + waterCost + internetCost + serviceCost;

  const activeMonth = currentBillingMonth();
  const existingBillInCurrentMonth = selectedRoom
    ? bills.find((b) => b.room_id === selectedRoom.id && b.month === activeMonth)
    : undefined;

  const handleSubmitDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    if (existingBillInCurrentMonth) {
      setErrors({
        electric: `Phòng ${selectedRoom.room_code} đã có hóa đơn kỳ Tháng ${activeMonth}. Không thể lập 2 hóa đơn cùng kỳ cho một phòng.`,
      });
      return;
    }

    const nextErrors: { electric?: string; water?: string } = {};
    if (!Number.isFinite(electricOld) || electricOld < 0) {
      nextErrors.electric = 'Chỉ số điện cũ không được nhỏ hơn 0.';
    } else if (!Number.isFinite(electricNew) || electricNew < electricOld) {
      nextErrors.electric = 'Chỉ số điện mới phải lớn hơn hoặc bằng chỉ số điện cũ.';
    }

    if (!Number.isFinite(waterOld) || waterOld < 0) {
      nextErrors.water = 'Chỉ số nước cũ không được nhỏ hơn 0.';
    } else if (!Number.isFinite(waterNew) || waterNew < waterOld) {
      nextErrors.water = 'Chỉ số nước mới phải lớn hơn hoặc bằng chỉ số nước cũ.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const ok = await onCreateBill({
      room: selectedRoom,
      electricOld,
      electricNew,
      waterOld,
      waterNew,
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
          onClick={() => onStatusFilterChange('UNPAID')}
          className={`text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'UNPAID'
              ? 'bg-[#FAF0DC]/60 border-[#B89C66]'
              : 'bg-white border-[#E5E3DE] hover:border-[#B89C66]'
          }`}
        >
          <span className="text-xs sm:text-sm font-semibold text-slate-600 block">
            Hóa đơn chưa thanh toán
          </span>
          <p className="text-xl sm:text-2xl font-extrabold text-rose-700 mt-1">
            {formatShortVND(unpaidTotal)}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            {unpaidBills.length} hóa đơn đang chờ thu
          </span>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange('PAID')}
          className={`text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'PAID'
              ? 'bg-[#FAF0DC]/60 border-[#B89C66]'
              : 'bg-white border-[#E5E3DE] hover:border-[#B89C66]'
          }`}
        >
          <span className="text-xs sm:text-sm font-semibold text-slate-600 block">
            Tiền hóa đơn đã thực thu
          </span>
          <p className="text-xl sm:text-2xl font-extrabold text-[#0F223A] mt-1">
            {formatShortVND(paidTotal)}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            {paidBills.length} hóa đơn đã thanh toán
          </span>
        </button>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E3DE] flex items-center justify-between gap-3">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-slate-600 block">
              Kỳ ghi sổ hiện tại
            </span>
            <p className="text-lg sm:text-xl font-extrabold text-[#0F223A] mt-1">
              Tháng {currentBillingMonth()}
            </p>
            <span className="text-xs text-slate-500 mt-1 block">
              Tổng {bills.length} hóa đơn đã lập
            </span>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenDrawer()}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-sm font-bold shadow-sm shadow-[#B89C66]/25 inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ghi điện nước</span>
            </button>
            {onOpenBulkBilling && (
              <button
                type="button"
                onClick={onOpenBulkBilling}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-[#B89C66] text-[#8C6D37] hover:bg-[#FAF0DC] text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <span>Lập cả tháng</span>
              </button>
            )}
          </div>
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
            placeholder="Tìm theo mã phòng, kỳ tháng (VD: 10/2026) hoặc tên khách..."
            aria-label="Tìm kiếm hóa đơn"
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
            { key: 'ALL', label: 'Tất cả', count: bills.length },
            { key: 'UNPAID', label: 'Chưa thanh toán', count: unpaidBills.length },
            { key: 'PAID', label: 'Đã thanh toán', count: paidBills.length },
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
      {/* BILLS LIST (Primary full-width content)                      */}
      {/* ============================================================ */}
      {bills.length === 0 ? (
        <EmptyStateCard
          icon={<Receipt className="w-6 h-6" />}
          title="Chưa có hóa đơn điện nước nào"
          description="Bấm Ghi điện nước để nhập chỉ số công tơ và lập phiếu thu hàng tháng cho từng phòng."
          actionLabel="Ghi điện nước & Xuất hóa đơn"
          onAction={() => onOpenDrawer()}
        />
      ) : filteredBills.length === 0 ? (
        <EmptyStateCard
          isFilterEmpty
          title="Không tìm thấy hóa đơn phù hợp"
          description="Hãy thử xóa bộ lọc trạng thái hoặc tìm theo mã phòng khác."
          onClearFilter={() => {
            onStatusFilterChange('ALL');
            onSearchQueryChange('');
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredBills.map((bill) => {
            const room = roomById.get(bill.room_id);
            const contract = activeContractByRoom.get(bill.room_id);
            const eRate = room?.electricity_rate || 3800;
            const wRate = room?.water_rate || 25000;
            const statusMeta = BILL_STATUS_META[bill.status];
            const isBusy = busyBillId === bill.id;
            const isSending = sendingBillId === bill.id;

            return (
              <article
                key={bill.id}
                className="bg-white rounded-2xl border border-[#E5E3DE] hover:border-[#B89C66]/60 p-4 sm:p-5 shadow-2xs transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left: Period, Room, Meter Details & Unit Rates */}
                <div className="space-y-2.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-extrabold px-3 py-1 rounded-lg bg-[#0F223A] text-[#B89C66]">
                      Phòng {bill.room_code}
                    </span>
                    <span className="text-sm font-bold text-[#0F223A]">
                      Kỳ thu: Tháng {bill.month}
                    </span>
                    <StatusBadge label={statusMeta.label} tone={statusMeta.tone} size="sm" />
                    {bill.status === 'UNPAID' && bill.payment_claim?.transaction_code && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#FAF0DC] text-[#0F223A] border border-[#B89C66]">
                        Khách báo đã CK • Mã GD: <span className="font-mono">{bill.payment_claim.transaction_code}</span>
                      </span>
                    )}
                    {contract && (
                      <span className="text-xs sm:text-sm text-slate-600">
                        • Khách thuê: <strong className="text-[#0F223A]">{contract.tenant_name}</strong>
                      </span>
                    )}
                  </div>

                  {/* Detailed Breakdown Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 pt-1 text-xs sm:text-sm">
                    <div className="p-2.5 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE]">
                      <span className="text-xs text-slate-500 block">Tiền thuê phòng</span>
                      <strong className="text-[#0F223A]">{formatVND(bill.rent_cost)}</strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE]">
                      <span className="text-xs text-slate-500 block">
                        Điện: {bill.electric_old} &rarr; {bill.electric_new} ({bill.electric_used} kWh &times; {formatVND(eRate)})
                      </span>
                      <strong className="text-[#0F223A]">{formatVND(bill.electric_cost)}</strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE]">
                      <span className="text-xs text-slate-500 block">
                        Nước: {bill.water_old} &rarr; {bill.water_new} ({bill.water_used} m³ &times; {formatVND(wRate)})
                      </span>
                      <strong className="text-[#0F223A]">{formatVND(bill.water_cost)}</strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE]">
                      <span className="text-xs text-slate-500 block">Internet &amp; Dịch vụ</span>
                      <strong className="text-[#0F223A]">
                        {formatVND((bill.internet_cost || 0) + (bill.service_cost || 0))}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Right: Total & Actions */}
                <div className="pt-3 lg:pt-0 border-t lg:border-t-0 lg:border-l border-[#F1EFEA] lg:pl-5 flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 shrink-0">
                  <div className="lg:text-right">
                    <span className="text-xs text-slate-500 block">Tổng cộng phiếu thu</span>
                    <span className="text-lg sm:text-xl font-extrabold text-[#0F223A]">
                      {formatVND(bill.total_amount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Primary action: Confirm paid or revert */}
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onToggleBillStatus(bill)}
                      className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                        bill.status === 'UNPAID'
                          ? 'bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] shadow-2xs'
                          : 'bg-[#F8F8F6] hover:bg-[#EFECE6] text-slate-700 border border-[#E5E3DE]'
                      }`}
                    >
                      {isBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>
                        {bill.status === 'UNPAID' ? 'Xác nhận đã thu' : 'Đổi về chưa thu'}
                      </span>
                    </button>

                    {bill.status === 'UNPAID' && (
                      <button
                        type="button"
                        onClick={() => onOpenPayQr(bill)}
                        title="Hiện mã VietQR thanh toán"
                        className="min-h-[40px] px-3 py-2 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F8F8F6] text-[#0F223A] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <QrCode className="w-4 h-4 text-[#8C6D37]" />
                        <span>Mã QR</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isSending}
                      onClick={() => onSendBillEmail(bill)}
                      title="Gửi thông báo hóa đơn vào hộp thư khách thuê & tạo bản xem trước phiếu báo"
                      className="min-h-[40px] px-3 py-2 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F8F8F6] text-[#0F223A] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#8C6D37]" />
                      ) : (
                        <Send className="w-4 h-4 text-[#8C6D37]" />
                      )}
                      <span>{isSending ? 'Đang gửi...' : 'Gửi thông báo'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onPrintBill(bill)}
                      className="min-h-[40px] px-3 py-2 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F8F8F6] text-[#0F223A] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-slate-500" />
                      <span>In phiếu</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* SLIDE-OVER DRAWER: GHI CHỈ SỐ ĐIỆN NƯỚC & XUẤT HÓA ĐƠN       */}
      {/* ============================================================ */}
      <SlideOverDrawer
        open={drawerOpen}
        onClose={onCloseDrawer}
        title="Ghi chỉ số điện nước & Xuất hóa đơn"
        subtitle={`Kỳ thu Tháng ${currentBillingMonth()} • Tự động lấy chỉ số kỳ trước của phòng`}
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={submittingBill}
              onClick={onCloseDrawer}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F8F8F6] text-sm font-semibold text-[#0F223A] cursor-pointer disabled:opacity-50"
            >
              Đóng
            </button>
            <button
              type="submit"
              form="landlord-create-bill-form"
              disabled={submittingBill || !selectedRoom || Boolean(existingBillInCurrentMonth)}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-sm font-bold shadow-sm shadow-[#B89C66]/25 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submittingBill ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xuất hóa đơn...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xuất hóa đơn tháng {currentBillingMonth()}</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <form id="landlord-create-bill-form" onSubmit={handleSubmitDrawer} className="space-y-5">
          <FormField label="Chọn phòng cần lập hóa đơn" required>
            <EliteSelect
              value={selectedRoom ? String(selectedRoom.id) : ''}
              onChange={(val) => onSelectRoomId(Number(val))}
              options={roomSelectOptions}
              searchable
              searchPlaceholder="Tìm theo mã phòng hoặc tên khách..."
              ariaLabel="Chọn phòng lập hóa đơn"
            />
          </FormField>

          {existingBillInCurrentMonth && selectedRoom && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-800 font-semibold">
              Phòng {selectedRoom.room_code} đã có hóa đơn kỳ Tháng {activeMonth} ({formatVND(existingBillInCurrentMonth.total_amount)}). Mỗi phòng chỉ được lập 1 hóa đơn trong cùng kỳ tháng.
            </div>
          )}

          {selectedRoom && (
            <div className="p-3.5 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE] text-xs sm:text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Tiền thuê phòng cố định:</span>
                <strong className="text-[#0F223A]">{formatVND(rentCost)}/tháng</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Đơn giá điện / nước áp dụng:</span>
                <strong className="text-[#0F223A]">
                  {formatVND(electricRate)}/kWh • {formatVND(waterRate)}/m³
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Phí Internet &amp; Dịch vụ:</span>
                <strong className="text-[#0F223A]">
                  {formatVND(internetCost + serviceCost)}/tháng
                </strong>
              </div>
            </div>
          )}

          {/* Electricity Meter */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-700" />
                <span>Chỉ số Điện công tơ</span>
              </span>
              <span className="text-xs font-semibold text-amber-900">
                Đơn giá: {formatVND(electricRate)}/kWh
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Chỉ số điện cũ" htmlFor="bill-electric-old" unit="kWh" required>
                <input
                  id="bill-electric-old"
                  type="number"
                  min={0}
                  value={electricOld}
                  onChange={(e) => {
                    setErrors((prev) => ({ ...prev, electric: undefined }));
                    setElectricOld(Number(e.target.value));
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 bg-white border border-amber-300 focus:border-[#B89C66] rounded-xl text-sm font-bold text-[#0F223A] outline-hidden"
                />
              </FormField>

              <FormField
                label="Chỉ số điện mới"
                htmlFor="bill-electric-new"
                unit="kWh"
                required
                error={errors.electric}
              >
                <input
                  id="bill-electric-new"
                  type="number"
                  min={0}
                  value={electricNew}
                  onChange={(e) => {
                    setErrors((prev) => ({ ...prev, electric: undefined }));
                    setElectricNew(Number(e.target.value));
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 bg-white border border-amber-300 focus:border-[#B89C66] rounded-xl text-sm font-bold text-[#0F223A] outline-hidden"
                />
              </FormField>
            </div>

            <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-xs sm:text-sm text-amber-950">
              <span>Tiêu thụ kỳ này: <strong>{electricUsed} kWh</strong></span>
              <span>Thành tiền điện: <strong>{formatVND(electricCost)}</strong></span>
            </div>
          </div>

          {/* Water Meter */}
          <div className="p-4 rounded-2xl bg-[#F8F8F6] border border-[#E5E3DE] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#0F223A] flex items-center gap-2">
                <Droplets className="w-4 h-4 text-[#8C6D37]" />
                <span>Chỉ số Nước đồng hồ</span>
              </span>
              <span className="text-xs font-semibold text-slate-600">
                Đơn giá: {formatVND(waterRate)}/m³
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Chỉ số nước cũ" htmlFor="bill-water-old" unit="m³" required>
                <input
                  id="bill-water-old"
                  type="number"
                  min={0}
                  value={waterOld}
                  onChange={(e) => {
                    setErrors((prev) => ({ ...prev, water: undefined }));
                    setWaterOld(Number(e.target.value));
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 bg-white border border-[#E5E3DE] focus:border-[#B89C66] rounded-xl text-sm font-bold text-[#0F223A] outline-hidden"
                />
              </FormField>

              <FormField
                label="Chỉ số nước mới"
                htmlFor="bill-water-new"
                unit="m³"
                required
                error={errors.water}
              >
                <input
                  id="bill-water-new"
                  type="number"
                  min={0}
                  value={waterNew}
                  onChange={(e) => {
                    setErrors((prev) => ({ ...prev, water: undefined }));
                    setWaterNew(Number(e.target.value));
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 bg-white border border-[#E5E3DE] focus:border-[#B89C66] rounded-xl text-sm font-bold text-[#0F223A] outline-hidden"
                />
              </FormField>
            </div>

            <div className="pt-2 border-t border-[#E5E3DE] flex items-center justify-between text-xs sm:text-sm text-[#0F223A]">
              <span>Tiêu thụ kỳ này: <strong>{waterUsed} m³</strong></span>
              <span>Thành tiền nước: <strong>{formatVND(waterCost)}</strong></span>
            </div>
          </div>

          {/* Total Preview */}
          <div className="p-4 rounded-2xl bg-[#0F223A] text-white flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-300 block">Tổng tiền hóa đơn tạm tính</span>
              <span className="text-xs text-[#E5D7B7]">
                (Gồm tiền phòng + điện + nước + phí dịch vụ)
              </span>
            </div>
            <span className="text-xl font-extrabold text-[#B89C66]">
              {formatVND(estimatedTotal)}
            </span>
          </div>
        </form>
      </SlideOverDrawer>
    </div>
  );
}
