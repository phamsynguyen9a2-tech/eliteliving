'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { X, Calendar, Clock, User, Phone, FileText, ShieldAlert, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Room } from '@/lib/types';

interface BookingModalProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TIME_SLOTS = [
  '08:30 - 09:30',
  '09:30 - 10:30',
  '10:30 - 11:30',
  '14:00 - 15:00',
  '15:30 - 16:30',
  '17:00 - 18:00',
  '18:30 - 19:30'
];

const toLocalDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function BookingModal({ room, isOpen, onClose, onSuccess }: BookingModalProps) {
  const { data: session } = useSession();

  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[1]);
  const [notes, setNotes] = useState('Tôi muốn xem phòng vào cuối tuần.');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const isBookingAllowed = room?.status === 'AVAILABLE' || room?.status === 'BOOKED_VIEWING';

  useEffect(() => {
    if (session?.user) {
      if (session.user.name) setUserName(session.user.name);
      if (session.user.phone) setUserPhone(session.user.phone);
    } else {
      setUserName('');
      setUserPhone('');
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(toLocalDateInputValue(tomorrow));
  }, [session, isOpen]);

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
    const focusFrame = window.requestAnimationFrame(() => firstFieldRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen || !room) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBookingAllowed) {
      setStatusMessage({
        type: 'error',
        text:
          room.status === 'RESERVED'
            ? 'Phòng đang được giữ chỗ và chưa nhận thêm lịch xem.'
            : 'Phòng đang có khách thuê và chưa nhận lịch xem mới.'
      });
      return;
    }
    const normalizedPhone = userPhone.replace(/[\s-]/g, '');
    if (!/^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-689]|9[0-46-9])\d{7}$/.test(normalizedPhone)) {
      setStatusMessage({ type: 'error', text: 'Số điện thoại chưa đúng định dạng Việt Nam. Ví dụ: 0901234567.' });
      return;
    }
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: room.id,
          user_id: session?.user?.id,
          user_name: userName.trim(),
          user_phone: normalizedPhone,
          date,
          time_slot: timeSlot,
          notes
        })
      });

      const data = await res.json();

      if (res.status === 409) {
        // Concurrency conflict detected!
        setStatusMessage({
          type: 'error',
          text: data.message || 'Khung giờ này đã được người khác đặt trước. Vui lòng chọn giờ khác.'
        });
      } else if (!res.ok) {
        setStatusMessage({
          type: 'error',
          text: data.message || 'Có lỗi xảy ra khi đặt lịch.'
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: 'Đặt lịch xem phòng thành công! Lịch hẹn đã được lưu vào Hồ sơ cá nhân của bạn.'
        });
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
          setStatusMessage(null);
        }, 1800);
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F223A]/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div role="dialog" aria-modal="true" aria-labelledby="booking-modal-title" className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E5E3DE] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header (Elite Living Navy & Gold) */}
        <div className="flex items-center justify-between p-5 bg-[#0F223A] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B89C66] text-white flex items-center justify-center shadow-md shadow-[#B89C66]/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 id="booking-modal-title" className="text-base font-bold text-white leading-tight">Đặt lịch xem phòng trực tuyến</h3>
              <p className="text-[11px] text-[#B89C66] mt-0.5 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Kiểm soát tương tranh chống trùng khung giờ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại đặt lịch"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Room brief info */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
          {room.images && room.images[0] && (
            <img src={room.images[0]} alt={room.title} className="w-14 h-14 rounded-lg object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-slate-900 truncate">{room.title}</h4>
            <p className="text-xs text-slate-500 truncate">{room.address}</p>
            <p className="text-xs font-bold text-[#B89C66] mt-0.5">{room.price.toLocaleString('vi-VN')} đ/tháng</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {statusMessage && (
            <div
              role="status"
              aria-live="polite"
              className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-[#B89C66]/15 border border-[#B89C66]/40 text-[#8C6D37]'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#B89C66] mt-0.5" />
              ) : (
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="modal-booking-name" className="block text-xs font-semibold text-slate-700 mb-1">
                <User className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Họ và tên người xem
              </label>
              <input
                ref={firstFieldRef}
                id="modal-booking-name"
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#B89C66]/20 focus:border-[#B89C66] focus:outline-hidden"
              />
            </div>
            <div>
              <label htmlFor="modal-booking-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                <Phone className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Số điện thoại
              </label>
              <input
                id="modal-booking-phone"
                type="tel"
                required
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#B89C66]/20 focus:border-[#B89C66] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="modal-booking-date" className="block text-xs font-semibold text-slate-700 mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Ngày hẹn xem
              </label>
              <input
                id="modal-booking-date"
                type="date"
                required
                value={date}
                min={toLocalDateInputValue(new Date())}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#B89C66]/20 focus:border-[#B89C66] focus:outline-hidden"
              />
            </div>
            <div>
              <label htmlFor="modal-booking-time" className="block text-xs font-semibold text-slate-700 mb-1">
                <Clock className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Khung giờ rảnh
              </label>
              <select
                id="modal-booking-time"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#B89C66]/20 focus:border-[#B89C66] focus:outline-hidden bg-white"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="modal-booking-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              <FileText className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
              Ghi chú thêm cho chủ trọ
            </label>
            <textarea
              id="modal-booking-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Tôi đi cùng bạn, nhờ chủ trọ đón ở đầu ngõ..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#B89C66]/20 focus:border-[#B89C66] focus:outline-hidden resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading || !isBookingAllowed}
              className="px-5 py-2.5 text-sm font-bold text-white bg-[#B89C66] hover:bg-[#A38752] rounded-xl shadow-lg shadow-[#B89C66]/25 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-2 transition-all cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>
                {room.status === 'RESERVED'
                  ? 'Phòng đang được giữ chỗ'
                  : room.status === 'RENTED'
                  ? 'Phòng đang có khách thuê'
                  : room.status === 'BOOKED_VIEWING'
                  ? 'Chọn khung giờ khác'
                  : 'Xác nhận đặt lịch'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
