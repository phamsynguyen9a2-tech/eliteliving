'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { AppointmentLookupView } from '@/lib/appointment-lookup';
import { saveGuestAppointment } from '@/lib/guest-appointment-store';

const STATUS_LABEL: Record<AppointmentLookupView['status'], { text: string; className: string }> = {
  PENDING: { text: 'Chờ chủ trọ xác nhận', className: 'bg-[#FAF0DC] text-[#A38752] border-[#B89C66]/40' },
  CONFIRMED: { text: 'Chủ trọ đã xác nhận', className: 'bg-[#0F223A] text-white border-[#0F223A]' },
  CANCELLED: { text: 'Đã hủy', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  COMPLETED: { text: 'Đã xem phòng', className: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const formatDate = (iso: string) => iso.split('-').reverse().join('/');

export default function GuestAppointmentPage() {
  const params = useParams<{ token: string }>();
  const token = decodeURIComponent(String(params?.token || ''));
  const [appointment, setAppointment] = useState<AppointmentLookupView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/appointments/lookup?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json();
        if (!active) return;
        if (!res.ok || !data.success) {
          setError(data.message || 'Không tìm thấy lịch hẹn.');
          return;
        }
        setAppointment(data.data);
        // Mở bằng link được chia sẻ trên thiết bị khác cũng lưu lại vào "Lịch đã đặt"
        saveGuestAppointment({
          token,
          room_code: data.data.room_code,
          room_title: data.data.room_title,
          date: data.data.date,
          time_slot: data.data.time_slot,
        });
      })
      .catch(() => {
        if (active) setError('Lỗi kết nối máy chủ. Vui lòng kiểm tra lại mạng.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice('Đã sao chép link tra cứu. Lưu link này để xem lại lịch trên thiết bị khác.');
    } catch {
      setNotice('Không sao chép được. Hãy lưu địa chỉ trang này để xem lại lịch.');
    }
  };

  const cancel = async () => {
    if (!appointment || !window.confirm('Bạn chắc chắn muốn hủy lịch xem phòng này?')) return;
    setCancelling(true);
    setNotice(null);
    try {
      const res = await fetch('/api/appointments/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'CANCEL' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotice(data.message || 'Không hủy được lịch hẹn.');
        return;
      }
      setAppointment(data.data);
      setNotice(data.message);
    } catch {
      setNotice('Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setCancelling(false);
    }
  };

  const status = appointment ? STATUS_LABEL[appointment.status] : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F6] text-[#0F223A]">
      <Navbar />
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <Link
          href="/lich-hen"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A38752] hover:text-[#B89C66] mb-5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Lịch đã đặt trên thiết bị này
        </Link>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-7 h-7 animate-spin text-[#B89C66]" />
          </div>
        ) : error || !appointment || !status ? (
          <div className="bg-white border border-[#E5E3DE] rounded-2xl p-8 text-center">
            <AlertCircle className="w-10 h-10 mx-auto text-rose-500 mb-3" />
            <h1 className="text-lg font-black mb-1">Không mở được lịch hẹn</h1>
            <p className="text-sm text-slate-600">{error}</p>
          </div>
        ) : (
          <div className="bg-white border border-[#E5E3DE] rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#E5E3DE]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#A38752]">Lịch xem phòng</p>
                  <h1 className="text-xl font-black mt-1">
                    {appointment.room_code ? `Phòng ${appointment.room_code}` : 'Phòng đã đặt'}
                  </h1>
                  {appointment.room_title && <p className="text-sm text-slate-600 mt-0.5">{appointment.room_title}</p>}
                </div>
                <span className={`px-3 py-1 rounded-full border text-xs font-bold ${status.className}`}>{status.text}</span>
              </div>
            </div>

            <dl className="p-6 grid gap-4 sm:grid-cols-2 text-sm">
              <div className="flex gap-2.5">
                <Calendar className="w-4 h-4 text-[#B89C66] mt-0.5 shrink-0" />
                <div>
                  <dt className="text-xs text-slate-500">Ngày xem</dt>
                  <dd className="font-bold">{formatDate(appointment.date)}</dd>
                </div>
              </div>
              <div className="flex gap-2.5">
                <Clock className="w-4 h-4 text-[#B89C66] mt-0.5 shrink-0" />
                <div>
                  <dt className="text-xs text-slate-500">Khung giờ</dt>
                  <dd className="font-bold">{appointment.time_slot}</dd>
                </div>
              </div>
              {appointment.building_name && (
                <div className="flex gap-2.5">
                  <Building2 className="w-4 h-4 text-[#B89C66] mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-xs text-slate-500">Tòa nhà</dt>
                    <dd className="font-bold">{appointment.building_name}</dd>
                  </div>
                </div>
              )}
              {appointment.address && (
                <div className="flex gap-2.5">
                  <MapPin className="w-4 h-4 text-[#B89C66] mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-xs text-slate-500">Địa chỉ</dt>
                    <dd className="font-bold">{appointment.address}</dd>
                  </div>
                </div>
              )}
              <div className="flex gap-2.5">
                <User className="w-4 h-4 text-[#B89C66] mt-0.5 shrink-0" />
                <div>
                  <dt className="text-xs text-slate-500">Người xem</dt>
                  <dd className="font-bold">{appointment.user_name}</dd>
                </div>
              </div>
              <div className="flex gap-2.5">
                <Phone className="w-4 h-4 text-[#B89C66] mt-0.5 shrink-0" />
                <div>
                  <dt className="text-xs text-slate-500">SĐT nhận xác nhận</dt>
                  <dd className="font-bold">{appointment.user_phone_masked}</dd>
                </div>
              </div>
            </dl>

            {notice && (
              <div className="mx-6 mb-4 flex items-start gap-2 rounded-xl bg-[#FAF0DC] border border-[#B89C66]/40 px-4 py-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-[#B89C66] shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            <div className="px-6 pb-6 flex flex-wrap gap-2.5">
              <Link
                href={`/phong/${appointment.room_id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-white text-xs font-bold shadow-lg shadow-[#B89C66]/25"
              >
                <Building2 className="w-4 h-4" />
                Xem lại phòng
              </Link>
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E5E3DE] hover:border-[#B89C66] text-xs font-bold cursor-pointer"
              >
                <Copy className="w-4 h-4 text-[#B89C66]" />
                Sao chép link tra cứu
              </button>
              {appointment.can_cancel && (
                <button
                  type="button"
                  onClick={cancel}
                  disabled={cancelling}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  <XCircle className="w-4 h-4" />
                  {cancelling ? 'Đang hủy...' : 'Hủy lịch'}
                </button>
              )}
            </div>

            <div className="px-6 py-4 bg-[#F8F8F6] border-t border-[#E5E3DE] flex gap-2.5 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-[#B89C66] shrink-0" />
              <p>
                Link này là mã riêng của lịch hẹn, đừng chia sẻ công khai. Đăng ký tài khoản và xác minh số điện thoại
                đã dùng khi đặt lịch, các lịch hẹn này sẽ tự chuyển vào mục Lịch hẹn trong hồ sơ của bạn.
              </p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
