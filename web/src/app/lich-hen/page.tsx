'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Calendar, CalendarX2, ChevronRight, Clock, Trash2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  forgetGuestAppointment,
  readSavedGuestAppointments,
  type SavedGuestAppointment,
} from '@/lib/guest-appointment-store';

const formatDate = (iso: string) => iso.split('-').reverse().join('/');

/** "Lịch đã đặt" của khách vãng lai: các lịch hẹn đã đặt trên trình duyệt này (mã tra cứu lưu cục bộ). */
export default function GuestAppointmentsPage() {
  const { status } = useSession();
  const [items, setItems] = useState<SavedGuestAppointment[] | null>(null);

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
