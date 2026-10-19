'use client';

import React, { useEffect, useState } from 'react';
import {
  Check,
  Loader2,
  Plus,
  Printer,
  Save,
  X,
} from 'lucide-react';
import type { Room, RoomStatus, UtilityBill } from '@/lib/types';
import EliteSelect, { type EliteSelectOption } from '@/components/EliteSelect';
import {
  BILL_STATUS_META,
  formatVND,
  ROOM_STATUS_META,
  ROOM_STATUS_ORDER,
} from './landlord-format';
import { FormField, SlideOverDrawer, StatusBadge } from './LandlordPrimitives';

const DISTRICT_OPTIONS: EliteSelectOption[] = [
  'Quận Tân Phú',
  'Quận Tân Bình',
  'Quận Bình Tân',
  'Quận Gò Vấp',
  'Quận Bình Thạnh',
  'Thành phố Thủ Đức',
  'Quận 7',
  'Quận 10',
  'Quận Phú Nhuận',
  'Quận 12',
  'Quận 3',
  'Quận 1',
  'Quận 8',
  'Quận 6',
].map((d) => ({ value: d, label: d }));

const ROOM_TYPE_OPTIONS: EliteSelectOption[] = [
  { value: 'Phòng Studio cao cấp', label: 'Phòng Studio cao cấp' },
  { value: 'Phòng có gác lửng', label: 'Phòng có gác lửng' },
  { value: 'Căn hộ dịch vụ 1PN', label: 'Căn hộ dịch vụ 1 phòng ngủ' },
  { value: 'Phòng tiêu chuẩn sinh viên', label: 'Phòng tiêu chuẩn sinh viên' },
];

const ROOM_STATUS_OPTIONS: EliteSelectOption[] = ROOM_STATUS_ORDER.map((status) => ({
  value: status,
  label: ROOM_STATUS_META[status].label,
}));

const AMENITY_CHOICES = [
  'Máy lạnh',
  'Gác lửng',
  'WC riêng',
  'Tủ lạnh',
  'Máy giặt',
  'Ban công',
  'Thang máy',
  'Khóa vân tay',
  'Wifi miễn phí',
];

export interface RoomFormSubmitData {
  room_code: string;
  title: string;
  price: number;
  deposit: number;
  area: number;
  room_type: string;
  address: string;
  district: string;
  building_name?: string;
  amenities: string[];
  status: RoomStatus;
  electricity_rate: number;
  water_rate: number;
  internet_fee: number;
  service_fee: number;
  parking_fee: number;
}

interface CreateEditRoomDrawerProps {
  open: boolean;
  mode: 'create' | 'edit';
  editingRoom: Room | null;
  defaultAddress?: string;
  defaultDistrict?: string;
  defaultBuildingName?: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: RoomFormSubmitData) => Promise<boolean>;
}

export function CreateEditRoomDrawer({
  open,
  mode,
  editingRoom,
  defaultAddress = '140 Lê Trọng Tấn, Phường Tây Thạnh, Quận Tân Phú',
  defaultDistrict = 'Quận Tân Phú',
  defaultBuildingName = '',
  submitting,
  onClose,
  onSubmit,
}: CreateEditRoomDrawerProps) {
  const [roomCode, setRoomCode] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState<number>(4500000);
  const [deposit, setDeposit] = useState<number>(4500000);
  const [area, setArea] = useState<number>(28);
  const [roomType, setRoomType] = useState('Phòng Studio cao cấp');
  const [buildingName, setBuildingName] = useState('');
  const [address, setAddress] = useState(defaultAddress);
  const [district, setDistrict] = useState(defaultDistrict);
  const [status, setStatus] = useState<RoomStatus>('AVAILABLE');
  const [amenities, setAmenities] = useState<string[]>([
    'Máy lạnh',
    'Gác lửng',
    'WC riêng',
    'Wifi miễn phí',
    'Khóa vân tay',
  ]);
  const [electricityRate, setElectricityRate] = useState<number>(3800);
  const [waterRate, setWaterRate] = useState<number>(25000);
  const [errors, setErrors] = useState<{
    roomCode?: string;
    title?: string;
    price?: string;
    area?: string;
    address?: string;
  }>({});

  // Sync fields when opening in create vs edit mode
  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && editingRoom) {
      setRoomCode(editingRoom.room_code || '');
      setTitle(editingRoom.title || '');
      setPrice(Number(editingRoom.price) || 0);
      setDeposit(Number(editingRoom.deposit ?? editingRoom.price) || 0);
      setArea(Number(editingRoom.area) || 25);
      setRoomType(editingRoom.room_type || 'Phòng Studio cao cấp');
      setBuildingName(editingRoom.project_name || defaultBuildingName || '');
      setAddress(editingRoom.address || defaultAddress);
      setDistrict(editingRoom.district || defaultDistrict);
      setStatus(editingRoom.status || 'AVAILABLE');
      setAmenities(
        Array.isArray(editingRoom.amenities) && editingRoom.amenities.length > 0
          ? editingRoom.amenities
          : ['Máy lạnh', 'WC riêng', 'Wifi miễn phí']
      );
      setElectricityRate(Number(editingRoom.electricity_rate) || 3800);
      setWaterRate(Number(editingRoom.water_rate) || 25000);
      setErrors({});
    } else if (mode === 'create') {
      setRoomCode('');
      setTitle('');
      setPrice(4500000);
      setDeposit(4500000);
      setArea(28);
      setRoomType('Phòng Studio cao cấp');
      setBuildingName(defaultBuildingName);
      setAddress(defaultAddress);
      setDistrict(defaultDistrict);
      setStatus('AVAILABLE');
      setAmenities(['Máy lạnh', 'Gác lửng', 'WC riêng', 'Wifi miễn phí', 'Khóa vân tay']);
      setElectricityRate(3800);
      setWaterRate(25000);
      setErrors({});
    }
  }, [open, mode, editingRoom, defaultAddress, defaultDistrict, defaultBuildingName]);

  const toggleAmenity = (am: string) => {
    setAmenities((prev) =>
      prev.includes(am) ? prev.filter((item) => item !== am) : [...prev, am]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof errors = {};

    const cleanCode = roomCode.trim();
    const cleanTitle = title.trim();
    const cleanAddress = address.trim();

    if (!cleanCode) {
      nextErrors.roomCode = 'Vui lòng nhập mã phòng (ví dụ: P.201 hoặc A-102).';
    }
    if (!cleanTitle || cleanTitle.length < 5) {
      nextErrors.title = 'Vui lòng nhập tên hiển thị của phòng (tối thiểu 5 ký tự).';
    }
    if (!Number.isFinite(price) || price < 500000) {
      nextErrors.price = 'Giá thuê cần tối thiểu từ 500.000 đ/tháng.';
    }
    if (!Number.isFinite(area) || area < 8 || area > 250) {
      nextErrors.area = 'Diện tích phòng cần nằm trong khoảng từ 8 đến 250 m².';
    }
    if (!cleanAddress) {
      nextErrors.address = 'Vui lòng nhập địa chỉ khu trọ.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    await onSubmit({
      room_code: cleanCode,
      title: cleanTitle,
      price: Number(price),
      deposit: Number(deposit) || Number(price),
      area: Number(area),
      room_type: roomType,
      building_name: buildingName.trim() || undefined,
      address: cleanAddress,
      district,
      amenities,
      status,
      electricity_rate: Number(electricityRate) || 3800,
      water_rate: Number(waterRate) || 25000,
      internet_fee: editingRoom?.internet_fee ?? 100000,
      service_fee: editingRoom?.service_fee ?? 150000,
      parking_fee: editingRoom?.parking_fee ?? 120000,
    });
  };

  return (
    <SlideOverDrawer
      open={open}
      onClose={onClose}
      title={
        mode === 'edit' && editingRoom
          ? `Chỉnh sửa thông tin phòng ${editingRoom.room_code}`
          : 'Thêm phòng cho thuê mới'
      }
      subtitle={
        mode === 'edit'
          ? 'Cập nhật giá thuê, diện tích, tiện ích hoặc trạng thái phòng hiện tại.'
          : 'Nhập thông tin cơ bản để niêm yết phòng vào danh sách quản lý khu trọ.'
      }
      widthClass="max-w-xl"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F8F8F6] text-slate-700 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="landlord-room-drawer-form"
            disabled={submitting}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-sm font-bold shadow-sm shadow-[#B89C66]/25 inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : mode === 'edit' ? (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu thay đổi</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Tạo phòng mới</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <form id="landlord-room-drawer-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Mã phòng"
            htmlFor="room-code-input"
            required
            error={errors.roomCode}
            hint="Mã ngắn gọn để dễ gọi tên (VD: P.201)"
          >
            <input
              id="room-code-input"
              type="text"
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value);
                if (errors.roomCode) setErrors((prev) => ({ ...prev, roomCode: undefined }));
              }}
              placeholder="Ví dụ: P.201"
              className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border bg-white text-sm font-bold text-[#0F223A] focus:outline-none focus:ring-2 ${
                errors.roomCode
                  ? 'border-rose-400 focus:ring-rose-500/30'
                  : 'border-[#E5E3DE] focus:border-[#B89C66] focus:ring-[#B89C66]/25'
              }`}
            />
          </FormField>

          <FormField label="Loại phòng">
            <EliteSelect
              value={roomType}
              onChange={setRoomType}
              options={ROOM_TYPE_OPTIONS}
              ariaLabel="Chọn loại phòng"
            />
          </FormField>
        </div>

        <FormField
          label="Tên hiển thị của phòng"
          htmlFor="room-title-input"
          required
          error={errors.title}
        >
          <input
            id="room-title-input"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
            }}
            placeholder="Ví dụ: Phòng Studio ban công thoáng mát tầng 2"
            className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border bg-white text-sm font-medium text-[#0F223A] focus:outline-none focus:ring-2 ${
              errors.title
                ? 'border-rose-400 focus:ring-rose-500/30'
                : 'border-[#E5E3DE] focus:border-[#B89C66] focus:ring-[#B89C66]/25'
            }`}
          />
        </FormField>

        {/* Price, Deposit, Area */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <FormField
            label="Giá thuê"
            htmlFor="room-price-input"
            unit="đ/tháng"
            required
            error={errors.price}
          >
            <input
              id="room-price-input"
              type="number"
              min={500000}
              step={100000}
              value={price}
              onChange={(e) => {
                const next = Number(e.target.value);
                setPrice(next);
                if (mode === 'create' && deposit === price) {
                  setDeposit(next);
                }
                if (errors.price) setErrors((prev) => ({ ...prev, price: undefined }));
              }}
              className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border bg-white text-sm font-bold text-[#0F223A] focus:outline-none focus:ring-2 ${
                errors.price
                  ? 'border-rose-400 focus:ring-rose-500/30'
                  : 'border-[#E5E3DE] focus:border-[#B89C66] focus:ring-[#B89C66]/25'
              }`}
            />
          </FormField>

          <FormField label="Tiền đặt cọc" htmlFor="room-deposit-input" unit="đ">
            <input
              id="room-deposit-input"
              type="number"
              min={0}
              step={100000}
              value={deposit}
              onChange={(e) => setDeposit(Number(e.target.value))}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E5E3DE] bg-white text-sm font-semibold text-[#0F223A] focus:outline-none focus:border-[#B89C66] focus:ring-2 focus:ring-[#B89C66]/25"
            />
          </FormField>

          <FormField
            label="Diện tích"
            htmlFor="room-area-input"
            unit="m²"
            required
            error={errors.area}
          >
            <input
              id="room-area-input"
              type="number"
              min={8}
              max={250}
              value={area}
              onChange={(e) => {
                setArea(Number(e.target.value));
                if (errors.area) setErrors((prev) => ({ ...prev, area: undefined }));
              }}
              className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border bg-white text-sm font-semibold text-[#0F223A] focus:outline-none focus:ring-2 ${
                errors.area
                  ? 'border-rose-400 focus:ring-rose-500/30'
                  : 'border-[#E5E3DE] focus:border-[#B89C66] focus:ring-[#B89C66]/25'
              }`}
            />
          </FormField>
        </div>

        {/* Status (when editing) */}
        {mode === 'edit' && (
          <FormField
            label="Trạng thái phòng hiện tại"
            hint={ROOM_STATUS_META[status]?.description}
          >
            <EliteSelect
              value={status}
              onChange={(val) => setStatus(val as RoomStatus)}
              options={ROOM_STATUS_OPTIONS}
              ariaLabel="Chọn trạng thái phòng"
            />
          </FormField>
        )}

        {/* Building & District */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Tên tòa nhà / Khu trọ" htmlFor="room-building-input">
            <input
              id="room-building-input"
              type="text"
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
              placeholder="Ví dụ: Khu trọ Elite Tây Thạnh"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E5E3DE] bg-white text-sm font-medium text-[#0F223A] focus:outline-none focus:border-[#B89C66] focus:ring-2 focus:ring-[#B89C66]/25"
            />
          </FormField>

          <FormField label="Quận / Khu vực">
            <EliteSelect
              value={district}
              onChange={setDistrict}
              options={DISTRICT_OPTIONS}
              ariaLabel="Chọn quận huyện"
            />
          </FormField>
        </div>

        <FormField
          label="Địa chỉ chi tiết"
          htmlFor="room-address-input"
          required
          error={errors.address}
        >
          <input
            id="room-address-input"
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              if (errors.address) setErrors((prev) => ({ ...prev, address: undefined }));
            }}
            placeholder="Số nhà, tên đường, phường, quận..."
            className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border bg-white text-sm font-medium text-[#0F223A] focus:outline-none focus:ring-2 ${
              errors.address
                ? 'border-rose-400 focus:ring-rose-500/30'
                : 'border-[#E5E3DE] focus:border-[#B89C66] focus:ring-[#B89C66]/25'
            }`}
          />
        </FormField>

        {/* Electricity & Water unit rates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Đơn giá điện" htmlFor="room-elec-rate" unit="đ/kWh">
            <input
              id="room-elec-rate"
              type="number"
              min={0}
              step={100}
              value={electricityRate}
              onChange={(e) => setElectricityRate(Number(e.target.value))}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E5E3DE] bg-white text-sm font-semibold text-[#0F223A] focus:outline-none focus:border-[#B89C66]"
            />
          </FormField>

          <FormField label="Đơn giá nước" htmlFor="room-water-rate" unit="đ/m³">
            <input
              id="room-water-rate"
              type="number"
              min={0}
              step={1000}
              value={waterRate}
              onChange={(e) => setWaterRate(Number(e.target.value))}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E5E3DE] bg-white text-sm font-semibold text-[#0F223A] focus:outline-none focus:border-[#B89C66]"
            />
          </FormField>
        </div>

        {/* Amenities */}
        <div className="space-y-2">
          <span className="block text-sm font-semibold text-[#0F223A]">
            Tiện ích có sẵn trong phòng
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AMENITY_CHOICES.map((am) => {
              const checked = amenities.includes(am);
              return (
                <button
                  key={am}
                  type="button"
                  onClick={() => toggleAmenity(am)}
                  aria-pressed={checked}
                  className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    checked
                      ? 'bg-[#FAF5EB] border-[#B89C66] text-[#0F223A]'
                      : 'bg-white border-[#E5E3DE] text-slate-600 hover:bg-[#F8F8F6]'
                  }`}
                >
                  <span className="truncate">{am}</span>
                  <span
                    className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                      checked
                        ? 'bg-[#B89C66] text-[#0F223A]'
                        : 'border border-slate-300 bg-white'
                    }`}
                  >
                    {checked && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </SlideOverDrawer>
  );
}

// ============================================================
// Bill Receipt Print Preview Modal (Accessible, Escape support)
// ============================================================

export function BillReceiptPrintModal({
  bill,
  landlordName,
  onClose,
}: {
  bill: UtilityBill | null;
  landlordName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!bill) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [bill, onClose]);

  if (!bill) return null;

  const statusMeta = BILL_STATUS_META[bill.status] || BILL_STATUS_META.UNPAID;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F223A]/55 backdrop-blur-xs animate-in fade-in duration-150 motion-reduce:animate-none"
      role="dialog"
      aria-modal="true"
      aria-label={`Phiếu thu tiền phòng ${bill.room_code} kỳ ${bill.month}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E5E3DE]">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DE] print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#8C6D37] uppercase tracking-wider">
              Phiếu báo thu tiền phòng &amp; điện nước
            </span>
            <StatusBadge label={statusMeta.label} tone={statusMeta.tone} size="sm" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng phiếu thu"
            className="min-w-[40px] min-h-[40px] rounded-xl inline-flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-[#F8F8F6] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Content */}
        <div className="pt-4 text-[#0F223A] font-sans text-xs">
          <div className="text-center pb-4 border-b border-dashed border-[#D6D2C8]">
            <h2 className="text-base font-black uppercase text-[#0F223A]">
              HỆ THỐNG NHÀ TRỌ &amp; CĂN HỘ ELITE LIVING
            </h2>
            <h3 className="text-sm font-bold text-[#8C6D37] mt-0.5">
              PHIẾU THU TIỀN PHÒNG &amp; DỊCH VỤ HÀNG THÁNG
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Kỳ thu: <strong>Tháng {bill.month}</strong> • Phòng:{' '}
              <strong className="text-[#0F223A]">{bill.room_code}</strong>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Mã phiếu: {bill.id}</p>
          </div>

          <div className="py-4 space-y-2.5 border-b border-dashed border-[#D6D2C8] text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-slate-600">1. Tiền thuê phòng cố định:</span>
              <span className="font-bold text-[#0F223A]">{formatVND(bill.rent_cost)}</span>
            </div>

            <div className="flex justify-between gap-2">
              <span className="text-slate-600">
                2. Tiền điện ({bill.electric_used} kWh: {bill.electric_old} → {bill.electric_new}):
              </span>
              <span className="font-bold text-[#0F223A]">{formatVND(bill.electric_cost)}</span>
            </div>

            <div className="flex justify-between gap-2">
              <span className="text-slate-600">
                3. Tiền nước ({bill.water_used} m³: {bill.water_old} → {bill.water_new}):
              </span>
              <span className="font-bold text-[#0F223A]">{formatVND(bill.water_cost)}</span>
            </div>

            <div className="flex justify-between gap-2">
              <span className="text-slate-600">4. Internet &amp; Wifi:</span>
              <span className="font-bold text-[#0F223A]">{formatVND(bill.internet_cost)}</span>
            </div>

            <div className="flex justify-between gap-2">
              <span className="text-slate-600">5. Dịch vụ chung (vệ sinh, rác, thang máy):</span>
              <span className="font-bold text-[#0F223A]">{formatVND(bill.service_cost)}</span>
            </div>
          </div>

          <div className="py-4 flex justify-between items-baseline border-b border-dashed border-[#D6D2C8]">
            <span className="text-sm font-bold text-[#0F223A]">TỔNG SỐ TIỀN CẦN THANH TOÁN:</span>
            <span className="text-xl font-black text-[#0F223A]">
              {formatVND(bill.total_amount)}
            </span>
          </div>

          <div className="pt-4 grid grid-cols-2 text-center text-xs text-slate-500">
            <div>
              <p className="font-semibold text-[#0F223A]">Người thanh toán</p>
              <p className="text-[11px] mt-8 text-slate-400">(Ký và ghi rõ họ tên)</p>
            </div>
            <div>
              <p className="font-semibold text-[#0F223A]">Người lập phiếu / Quản lý</p>
              <p className="text-xs mt-8 font-bold text-[#0F223A]">{landlordName}</p>
            </div>
          </div>
        </div>

        {/* Print actions */}
        <div className="pt-5 mt-4 border-t border-[#E5E3DE] flex justify-end gap-2.5 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-4 py-2 border border-[#E5E3DE] rounded-xl text-slate-700 font-semibold hover:bg-[#F8F8F6] cursor-pointer text-xs"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[42px] px-5 py-2 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-sm shadow-[#B89C66]/25 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In phiếu thu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
