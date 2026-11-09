'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Calendar, CalendarX2, ChevronRight, Clock, Search, Trash2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  forgetGuestAppointment,
  readSavedGuestAppointments,
  saveGuestAppointment,
  type SavedGuestAppointment,
} from '@/lib/guest-appointment-store';

const formatDate = (iso: string) => iso.split('-').reverse().join('/');

/** "Lịch đã đặt" của khách vãng lai: các lịch hẹn đã đặt trên trình duyệt này (mã tra cứu lưu cục bộ). */
export default function GuestAppointmentsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<SavedGuestAppointment[] | null>(null);
  const [findPhone, setFindPhone] = useState('');
  const [findCode, setFindCode] = useState('');
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);

  // Mở lại lịch trên máy khác: số điện thoại đặt lịch + mã tra cứu 6 số
  const findAppointment = async (event: React.FormEvent) => {
    event.preventDefault();
    setFindError(null);
    setFinding(true);
    try {
      const res = await fetch('/api/appointments/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'FIND', phone: findPhone, code: findCode }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json.data?.lookup_token) {
        setFindError(json?.message || 'Không tìm thấy lịch hẹn. Vui lòng kiểm tra lại.');
        return;
      }
      saveGuestAppointment({
        token: json.data.lookup_token,
        room_code: json.data.room_code,
        room_title: json.data.room_title,
        date: json.data.date,
        time_slot: json.data.time_slot,
      });
      router.push(`/lich-hen/${encodeURIComponent(json.data.lookup_token)}`);
    } catch {
      setFindError('Không kết nối được máy chủ. Vui lòng thử lại.');
    } finally {
      setFinding(false);
    }
  };

  useEffect(() => {
    // localStorage chỉ có ở trình duyệt nên đọc sau khi trang đã gắn
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readSavedGuestAppointments());
  }, []);

  const forget = (token: string) => {
    forgetGuestAppointment(token);
    setItems(readSavedGuestAppointments());
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F6] text-[#0F223A]">
      <Navbar />
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#A38752]">Khách chưa đăng nhập</p>
        <h1 className="text-2xl font-black mt-1">Lịch đã đặt</h1>
        <p className="text-sm text-slate-600 mt-1 mb-6">
          Các lịch xem phòng bạn đã đặt trên trình duyệt này. Mỗi lịch có một link tra cứu riêng để xem trạng thái hoặc hủy lịch.
        </p>

        <form
          onSubmit={findAppointment}
          className="mb-6 rounded-2xl border border-[#E5E3DE] bg-white p-4 sm:p-5"
          aria-label="Tra cứu lịch hẹn bằng số điện thoại và mã tra cứu"
        >
          <h2 className="text-sm font-black">Tra cứu bằng mã 6 số</h2>
          <p className="mt-0.5 text-xs text-slate-600">Dùng khi đặt lịch trên máy khác: nhập số điện thoại đã đặt lịch và mã tra cứu.</p>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_140px_auto]">
            <input
              type="tel"
              inputMode="tel"
              required
              value={findPhone}
              onChange={(e) => setFindPhone(e.target.value)}
              placeholder="Số điện thoại"
              aria-label="Số điện thoại đã đặt lịch"
              className="rounded-xl border border-[#E5E3DE] px-3 py-2.5 text-sm outline-none focus:border-[#B89C66] focus:ring-2 focus:ring-[#B89C66]/20"
            />
            <input
              type="text"
              inputMode="numeric"
              required
              maxLength={6}
              value={findCode}
              onChange={(e) => setFindCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Mã 6 số"
              aria-label="Mã tra cứu 6 số"
              className="rounded-xl border border-[#E5E3DE] px-3 py-2.5 font-mono text-sm tracking-[0.2em] outline-none focus:border-[#B89C66] focus:ring-2 focus:ring-[#B89C66]/20"
            />
            <button
              type="submit"
              disabled={finding || findCode.length !== 6}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#B89C66] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#B89C66]/25 hover:bg-[#A38752] disabled:opacity-60"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              {finding ? 'Đang tìm...' : 'Xem lịch'}
            </button>
          </div>
          {findError && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">{findError}</p>}
        </form>

        {status === 'authenticated' && (
          <Link
            href="/ho-so?tab=appointments"
            className="mb-5 flex items-center justify-between rounded-2xl bg-[#0F223A] text-white px-5 py-4 text-sm font-bold"
          >
            Bạn đã đăng nhập: xem lịch hẹn trong hồ sơ
            <ChevronRight className="w-4 h-4 text-[#B89C66]" />
          </Link>
        )}

        {items === null ? null : items.length === 0 ? (
          <div className="bg-white border border-[#E5E3DE] rounded-2xl p-8 text-center">
            <CalendarX2 className="w-10 h-10 mx-auto text-[#B89C66] mb-3" />
            <h2 className="font-black">Chưa có lịch nào trên thiết bị này</h2>
            <p className="text-sm text-slate-600 mt-1">
              Nếu đã đặt lịch trên thiết bị khác, hãy mở link tra cứu đã lưu. Bạn cũng có thể đăng ký tài khoản và xác
              minh số điện thoại đã đặt lịch để xem toàn bộ lịch hẹn trong hồ sơ.
            </p>
            <Link
              href="/"
              className="inline-flex mt-5 px-5 py-2.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-white text-xs font-bold shadow-lg shadow-[#B89C66]/25"
            >
              Tìm phòng để đặt lịch
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.token} className="bg-white border border-[#E5E3DE] rounded-2xl flex items-center">
                <Link href={`/lich-hen/${encodeURIComponent(item.token)}`} className="flex-1 p-4 min-w-0">
                  <p className="font-black truncate">
                    {item.room_code ? `Phòng ${item.room_code}` : 'Lịch xem phòng'}
                    {item.room_title ? <span className="font-medium text-slate-500"> · {item.room_title}</span> : null}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#B89C66]" />
                      {formatDate(item.date)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#B89C66]" />
                      {item.time_slot}
                    </span>
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => forget(item.token)}
                  title="Bỏ khỏi danh sách trên thiết bị này (không hủy lịch)"
                  aria-label="Bỏ khỏi danh sách"
                  className="p-4 text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}
