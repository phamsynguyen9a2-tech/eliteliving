'use client';

import React, { useState } from 'react';
import { Room } from '@/lib/types';
import {
  X,
  KeyRound,
  ShieldCheck,
  Zap,
  Droplets,
  Calendar,
  User,
  Phone,
  Mail,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react';

interface CheckInModalProps {
  room: Room;
  onClose: () => void;
  onSuccess: (data: any) => void;
  defaultTenantName?: string;
  defaultTenantPhone?: string;
  defaultElectric?: number;
  defaultWater?: number;
}

export default function CheckInModal({
  room,
  onClose,
  onSuccess,
  defaultTenantName = '',
  defaultTenantPhone = '',
  defaultElectric = 0,
  defaultWater = 0,
}: CheckInModalProps) {
  const [tenantName, setTenantName] = useState(defaultTenantName);
  const [tenantPhone, setTenantPhone] = useState(defaultTenantPhone);
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantCitizenId, setTenantCitizenId] = useState('');
  const [tenantAddress, setTenantAddress] = useState('');
  const [initialElectric, setInitialElectric] = useState(defaultElectric);
  const [initialWater, setInitialWater] = useState(defaultWater);
  const [moveInDate, setMoveInDate] = useState(new Date().toISOString().slice(0, 10));
  const [contractDurationMonths, setContractDurationMonths] = useState(12);
  const [vehicleCount, setVehicleCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [loading, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/rooms/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          tenantName,
          tenantPhone,
          tenantEmail,
          tenantCitizenId,
          tenantAddress,
          initialElectric: Number(initialElectric),
          initialWater: Number(initialWater),
          moveInDate,
          contractDurationMonths: Number(contractDurationMonths),
          vehicleCount: Number(vehicleCount),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Lỗi khi xử lý nhận phòng');
      }

      onSuccess(json);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể hoàn tất nhận phòng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F223A]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#E5E3DE] flex flex-col font-sans">
        {/* Header */}
        <div className="bg-[#0F223A] text-white p-6 rounded-t-3xl relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#B89C66]/20 border border-[#B89C66]/40 flex items-center justify-center text-[#B89C66]">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#B89C66] uppercase tracking-wider">
                Quy trình nhận phòng thực tế
              </span>
              <h2 className="text-lg font-black text-white">
                Nhận phòng &amp; bàn giao phòng {room.room_code}
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            Hệ thống sẽ chuyển trạng thái phòng sang <strong>&quot;Đang thuê&quot;</strong>, kích hoạt hợp đồng điện tử, lập biên bản bàn giao tài sản và gửi email đính kèm 10 điều nội quy PCCC cho khách thuê.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs text-slate-700">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Room Summary */}
          <div className="p-3.5 bg-[#F8F8F6] border border-[#E5E3DE] rounded-2xl flex items-center justify-between">
            <div>
              <div className="font-bold text-[#0F223A]">{room.title}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{room.address}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Giá thuê</span>
              <span className="font-black text-sm text-[#0F223A]">
                {room.price.toLocaleString('vi-VN')} đ/tháng
              </span>
            </div>
          </div>

          {/* Tenant Information */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#0F223A] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#B89C66]" />
              1. Thông tin khách thuê nhận phòng
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Họ tên người nhận phòng *</label>
                <input
                  type="text"
                  required
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Nhập họ và tên người thuê"
                  className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl outline-hidden focus:border-[#B89C66]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Số điện thoại liên hệ *</label>
                <input
                  type="tel"
                  required
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value)}
                  placeholder="Ví dụ: 0908123456"
                  className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl outline-hidden focus:border-[#B89C66]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Email nhận hợp đồng &amp; nội quy *</label>
                <input
                  type="email"
                  required
                  value={tenantEmail}
                  onChange={(e) => setTenantEmail(e.target.value)}
                  placeholder="Ví dụ: khachthue@gmail.com"
                  className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl outline-hidden focus:border-[#B89C66]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Số CCCD / CMND (Khai báo tạm trú) *</label>
                <input
                  type="text"
                  required
                  value={tenantCitizenId}
                  onChange={(e) => setTenantCitizenId(e.target.value)}
                  placeholder="Nhập 12 chữ số CCCD"
                  className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl outline-hidden focus:border-[#B89C66]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Địa chỉ thường trú theo CCCD</label>
                <input
                  type="text"
                  value={tenantAddress}
                  onChange={(e) => setTenantAddress(e.target.value)}
                  placeholder="Ví dụ: Phường Tây Thạnh, Quận Tân Phú, TP. Hồ Chí Minh"
                  className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl outline-hidden focus:border-[#B89C66]"
                />
              </div>
            </div>
          </div>

          {/* Initial Meters */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#0F223A] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#B89C66]" />
              2. Chốt Chỉ Số Điện Nước Ban Đầu Lúc Bàn Giao
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                <label className="block font-bold text-amber-900 mb-1 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  Chỉ số Điện ban đầu (kWh)
                </label>
                <input
                  type="number"
                  required
                  value={initialElectric}
                  onChange={(e) => setInitialElectric(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg font-bold text-amber-900"
                />
                <span className="text-[10px] text-amber-700 mt-1 block">
                  Đơn giá: {room.electricity_rate.toLocaleString('vi-VN')} đ/kWh
                </span>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                <label className="block font-bold text-blue-900 mb-1 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-blue-600" />
                  Chỉ số Nước ban đầu (m³)
                </label>
                <input
                  type="number"
                  required
                  value={initialWater}
                  onChange={(e) => setInitialWater(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg font-bold text-blue-900"
                />
                <span className="text-[10px] text-blue-700 mt-1 block">
                  Đơn giá: {room.water_rate.toLocaleString('vi-VN')} đ/m³
                </span>
              </div>
            </div>
          </div>

          {/* Move-in Date & Lease Term */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Ngày nhận phòng</label>
              <input
                type="date"
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl outline-hidden focus:border-[#B89C66]"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Thời hạn hợp đồng</label>
              <select
                value={contractDurationMonths}
                onChange={(e) => setContractDurationMonths(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl outline-hidden bg-white"
              >
                <option value={6}>6 tháng</option>
                <option value={12}>12 tháng (1 năm)</option>
                <option value={24}>24 tháng (2 năm)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Số lượng xe máy</label>
              <input
                type="number"
                min={0}
                max={4}
                value={vehicleCount}
                onChange={(e) => setVehicleCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl outline-hidden"
              />
            </div>
          </div>

          {/* PCCC & Handover Checklist Notice */}
          <div className="p-3.5 bg-[#F8F8F6] border border-[#E5E3DE] rounded-2xl flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#B89C66] shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-600 leading-relaxed">
              <strong className="text-[#0F223A]">Bảo đảm pháp lý &amp; tiêu chuẩn PCCC 2026:</strong> Sau khi bấm xác nhận, hệ thống tự động thiết lập Biên bản kiểm kê 08 hạng mục cơ sở vật chất (Điều hòa, Tủ lạnh, Khóa vân tay, Bình chữa cháy ABC...) và gửi email đầy đủ 10 điều nội quy PCCC để khách ký số trực tiếp.
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-[#E5E3DE] text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-bold shadow-lg shadow-[#B89C66]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý nhận phòng...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác nhận nhận phòng &amp; gửi email</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
