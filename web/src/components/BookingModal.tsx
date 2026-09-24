'use client';

import React, { useState } from 'react';
import { X, Calendar, Clock, User, Phone, FileText, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
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

export default function BookingModal({ room, isOpen, onClose, onSuccess }: BookingModalProps) {
  const [userName, setUserName] = useState('Phạm Sỹ Nguyên');
  const [userPhone, setUserPhone] = useState('0912345678');
  const [date, setDate] = useState('2026-09-25');
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[1]);
  const [notes, setNotes] = useState('Tôi muốn xem phòng vào cuối tuần.');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen || !room) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: room.id,
          user_id: 'user_current',
          user_name: userName,
          user_phone: userPhone,
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
          text: `⚠️ [Concurrency Control] ${data.message || 'Khung giờ này đã được người khác đặt trước!'}`
        });
      } else if (!res.ok) {
        setStatusMessage({
          type: 'error',
          text: data.message || 'Có lỗi xảy ra khi đặt lịch.'
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: '✅ Đặt lịch xem phòng thành công! Trạng thái phòng đã tự động chuyển sang "Đã đặt lịch".'
        });
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
          setStatusMessage(null);
        }, 2000);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div>
            <h3 className="text-lg font-bold">Đặt lịch xem phòng trực tuyến</h3>
            <p className="text-xs text-blue-100 mt-0.5">Kiểm soát tương tranh (Concurrency Control) chống trùng khung giờ</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
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
            <p className="text-xs font-bold text-blue-600 mt-0.5">{room.price.toLocaleString('vi-VN')} đ/tháng</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                <User className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Họ và tên người xem
              </label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                <Phone className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Số điện thoại
              </label>
              <input
                type="tel"
                required
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Ngày hẹn xem
              </label>
              <input
                type="date"
                required
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                <Clock className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Khung giờ rảnh
              </label>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              <FileText className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
              Ghi chú thêm cho chủ trọ
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Tôi đi cùng bạn, nhờ chủ trọ đón ở đầu ngõ..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Xác nhận Đặt lịch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
