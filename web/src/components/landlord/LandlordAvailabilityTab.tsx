'use client';

import React, { useState } from 'react';
import { Calendar, Check, CheckCircle2, Clock, Loader2, Sparkles } from 'lucide-react';
import type { LandlordAvailability } from '@/lib/types';
import { FormField } from './LandlordPrimitives';

interface LandlordAvailabilityTabProps {
  availability: LandlordAvailability | null;
  saving: boolean;
  onToggleDay: (dayKey: string) => void;
  onToggleSlot: (slotId: string) => void;
  onChangeNoticeHours: (hours: number) => void;
  onChangeInstructions: (instructions: string) => void;
  onSave: () => void;
}

const WEEK_DAYS = [
  { key: 'T2', label: 'Thứ Hai' },
  { key: 'T3', label: 'Thứ Ba' },
  { key: 'T4', label: 'Thứ Tư' },
  { key: 'T5', label: 'Thứ Năm' },
  { key: 'T6', label: 'Thứ Sáu' },
  { key: 'T7', label: 'Thứ Bảy' },
  { key: 'CN', label: 'Chủ nhật' },
];

export default function LandlordAvailabilityTab({
  availability,
  saving,
  onToggleDay,
  onToggleSlot,
  onChangeNoticeHours,
  onChangeInstructions,
  onSave,
}: LandlordAvailabilityTabProps) {
  const [noticeError, setNoticeError] = useState<string>('');

  if (!availability) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E3DE] p-8 text-center">
        <Clock className="w-8 h-8 text-[#8C6D37] mx-auto mb-2" />
        <p className="text-sm font-semibold text-[#0F223A]">
          Chưa tải được cấu hình khung giờ đón khách
        </p>
      </div>
    );
  }

  const enabledSlotsCount = availability.slots.filter((s) => s.enabled).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !Number.isFinite(availability.notice_hours) ||
      availability.notice_hours < 1 ||
      availability.notice_hours > 24
    ) {
      setNoticeError('Thời gian báo trước cần nằm trong khoảng từ 1 đến 24 tiếng.');
      return;
    }
    setNoticeError('');
    onSave();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-[#E5E3DE] p-5 sm:p-8 shadow-2xs max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E3DE]">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#0F223A]">
            Cài đặt khung giờ đón khách xem phòng
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Khách thuê chỉ có thể đặt lịch xem phòng vào những ngày và khung giờ bạn đã bật bên dưới.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="min-h-[44px] px-5 py-2.5 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-bold rounded-xl text-sm shadow-sm shadow-[#B89C66]/25 transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang lưu...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Lưu thay đổi</span>
            </>
          )}
        </button>
      </div>

      {/* Step 1: Days of week */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-bold text-[#0F223A] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#8C6D37]" />
            <span>1. Chọn các ngày trong tuần có thể đón khách</span>
          </label>
          <span className="text-xs font-semibold text-slate-500">
            Đã bật {availability.available_days.length}/7 ngày
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {WEEK_DAYS.map((day) => {
            const isSelected = availability.available_days.includes(day.key);
            return (
              <button
                key={day.key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggleDay(day.key)}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0F223A] text-white border-[#0F223A] font-bold shadow-2xs'
                    : 'bg-[#F8F8F6] text-slate-600 border-[#E5E3DE] hover:bg-[#EFECE6]'
                }`}
              >
                <span>{day.label}</span>
                {isSelected && <Check className="w-4 h-4 text-[#B89C66]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Time Slots */}
      <div className="space-y-3 pt-2 border-t border-[#F1EFEA]">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-bold text-[#0F223A] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#8C6D37]" />
            <span>2. Bật hoặc tắt các khung giờ xem phòng trong ngày</span>
          </label>
          <span className="text-xs font-semibold text-slate-500">
            Đang mở {enabledSlotsCount}/{availability.slots.length} khung giờ
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {availability.slots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              aria-pressed={slot.enabled}
              onClick={() => onToggleSlot(slot.id)}
              className={`min-h-[52px] p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                slot.enabled
                  ? 'bg-[#FAF0DC]/80 border-[#B89C66] text-[#0F223A] font-bold shadow-2xs'
                  : 'bg-[#F8F8F6] border-[#E5E3DE] text-slate-500 font-medium hover:bg-[#EFECE6]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock
                  className={`w-4 h-4 shrink-0 ${
                    slot.enabled ? 'text-[#8C6D37]' : 'text-slate-400'
                  }`}
                />
                <span className="text-sm">{slot.timeSlot}</span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  slot.enabled
                    ? 'bg-[#0F223A] text-[#B89C66]'
                    : 'bg-white text-slate-400 border border-[#E5E3DE]'
                }`}
              >
                {slot.enabled ? 'Đang mở' : 'Tạm tắt'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 3 & 4: Notice hours & Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2 border-t border-[#F1EFEA]">
        <div className="md:col-span-5">
          <FormField
            label="3. Thời gian khách cần báo trước"
            htmlFor="availability-notice-hours"
            unit="tiếng"
            hint="Giúp bạn chủ động sắp xếp người mở cửa đón khách."
            error={noticeError}
          >
            <div className="flex items-center gap-2.5">
              <input
                id="availability-notice-hours"
                type="number"
                min={1}
                max={24}
                value={availability.notice_hours}
                onChange={(e) => {
                  setNoticeError('');
                  onChangeNoticeHours(Number(e.target.value));
                }}
                className="w-28 min-h-[44px] px-3.5 py-2 text-sm font-bold text-[#0F223A] bg-[#F8F8F6] focus:bg-white border border-[#E5E3DE] focus:border-[#B89C66] rounded-xl outline-hidden"
              />
              <span className="text-sm text-slate-600">tiếng trước giờ hẹn</span>
            </div>
          </FormField>
        </div>

        <div className="md:col-span-7">
          <FormField
            label="4. Hướng dẫn khi khách đến xem phòng"
            htmlFor="availability-instructions"
            hint="Hiển thị trong phiếu hẹn của khách sau khi lịch được xác nhận."
          >
            <textarea
              id="availability-instructions"
              rows={3}
              value={availability.instructions}
              onChange={(e) => onChangeInstructions(e.target.value)}
              placeholder="Ví dụ: Khi đến cổng vui lòng gọi điện trước 5 phút để quản lý xuống đón và hướng dẫn chỗ để xe."
              className="w-full px-3.5 py-2.5 text-sm text-[#0F223A] bg-[#F8F8F6] focus:bg-white border border-[#E5E3DE] focus:border-[#B89C66] rounded-xl outline-hidden leading-relaxed"
            />
          </FormField>
        </div>
      </div>

      <div className="pt-4 border-t border-[#E5E3DE] flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#B89C66] shrink-0" />
          <span>Hệ thống tự động khóa khung giờ ngay khi đã có khách đặt lịch trên cùng một phòng.</span>
        </p>

        <button
          type="submit"
          disabled={saving}
          className="min-h-[44px] px-5 py-2.5 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-bold rounded-xl text-sm shadow-sm shadow-[#B89C66]/25 transition-colors cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
        </button>
      </div>
    </form>
  );
}
