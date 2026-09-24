'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Room, Appointment, Contract, UtilityBill } from '@/lib/types';
import {
  Building2,
  CalendarCheck,
  Zap,
  FileText,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Droplets,
  Layers,
  Search,
  UserCheck
} from 'lucide-react';

export default function LandlordPortalPage() {
  const [activeTab, setActiveTab] = useState<'rooms' | 'appointments' | 'billing' | 'contracts'>('rooms');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  // Billing form state
  const [selectedRoomForBill, setSelectedRoomForBill] = useState<number>(1);
  const [electricOld, setElectricOld] = useState(1200);
  const [electricNew, setElectricNew] = useState(1350);
  const [waterOld, setWaterOld] = useState(40);
  const [waterNew, setWaterNew] = useState(46);
  const [billStatusMsg, setBillStatusMsg] = useState('');

  // Contract form state
  const [selectedRoomForContract, setSelectedRoomForContract] = useState<number>(2);
  const [tenantName, setTenantName] = useState('Nguyễn Tuấn Anh');
  const [tenantPhone, setTenantPhone] = useState('0908112233');
  const [contractStartDate, setContractStartDate] = useState('2026-10-01');
  const [contractEndDate, setContractEndDate] = useState('2027-10-01');
  const [contractStatusMsg, setContractStatusMsg] = useState('');

  const loadLandlordData = async () => {
    setLoading(true);
    try {
      // 1. Load rooms of landlord_1
      const resRooms = await fetch('/api/landlords?landlordId=landlord_1');
      const jsonRooms = await resRooms.json();
      if (jsonRooms.success) setRooms(jsonRooms.data);

      // 2. Load appointments
      const resApts = await fetch('/api/appointments');
      const jsonApts = await resApts.json();
      if (jsonApts.success) setAppointments(jsonApts.data);

      // 3. Load bills
      const resBills = await fetch('/api/landlords?type=bills');
      const jsonBills = await resBills.json();
      if (jsonBills.success) setBills(jsonBills.data);

      // 4. Load contracts
      const resContracts = await fetch('/api/landlords?type=contracts');
      const jsonContracts = await resContracts.json();
      if (jsonContracts.success) setContracts(jsonContracts.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLandlordData();
  }, []);

  const handleUpdateAppointment = async (id: string, status: Appointment['status']) => {
    try {
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status } : a))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const room = rooms.find((r) => r.id === Number(selectedRoomForBill)) || rooms[0];
    if (!room) return;

    const electricUsed = Math.max(0, electricNew - electricOld);
    const electricCost = electricUsed * (room.electricity_rate || 3800);
    const waterUsed = Math.max(0, waterNew - waterOld);
    const waterCost = waterUsed * 25000;
    const internetCost = room.internet_fee || 100000;
    const serviceCost = room.service_fee || 150000;
    const rentCost = room.price;
    const totalAmount = rentCost + electricCost + waterCost + internetCost + serviceCost;

    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_BILL',
          billData: {
            room_id: room.id,
            room_code: room.room_code,
            month: '10/2026',
            electric_old: electricOld,
            electric_new: electricNew,
            electric_used: electricUsed,
            electric_cost: electricCost,
            water_old: waterOld,
            water_new: waterNew,
            water_used: waterUsed,
            water_cost: waterCost,
            internet_cost: internetCost,
            service_cost: serviceCost,
            rent_cost: rentCost,
            total_amount: totalAmount,
            status: 'UNPAID'
          }
        })
      });
      const json = await res.json();
      if (json.success) {
        setBills((prev) => [json.data, ...prev]);
        setBillStatusMsg('✅ Đã chốt số điện nước và xuất hóa đơn tự động thành công!');
        setTimeout(() => setBillStatusMsg(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    const room = rooms.find((r) => r.id === Number(selectedRoomForContract)) || rooms[0];
    if (!room) return;

    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_CONTRACT',
          contractData: {
            room_id: room.id,
            room_title: room.title,
            tenant_name: tenantName,
            tenant_phone: tenantPhone,
            landlord_name: 'Nguyễn Văn Hùng',
            start_date: contractStartDate,
            end_date: contractEndDate,
            monthly_rent: room.price,
            deposit_amount: room.deposit || room.price,
            status: 'ACTIVE'
          }
        })
      });
      const json = await res.json();
      if (json.success) {
        setContracts((prev) => [json.data, ...prev]);
        // Update local room status
        setRooms((prev) =>
          prev.map((r) => (r.id === room.id ? { ...r, status: 'RENTED' } : r))
        );
        setContractStatusMsg('✅ Đã tạo hợp đồng điện tử thành công! Trạng thái phòng chuyển sang "Đang thuê".');
        setTimeout(() => setContractStatusMsg(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      {/* Header Banner */}
      <div className="bg-indigo-900 text-white py-8 border-b border-indigo-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">
                <Building2 className="w-4 h-4" />
                <span>Web Portal Chủ Trọ (Khu trọ Nguyễn Văn Hùng)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Bảng Điều Khiển Quản Lý Khu Trọ
              </h1>
              <p className="text-xs text-indigo-200 mt-1">
                Quản lý trạng thái phòng, duyệt lịch hẹn xem, chốt chỉ số điện nước &amp; lập hợp đồng điện tử
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-indigo-800/60 border border-indigo-700 rounded-xl px-4 py-2 text-right">
                <span className="text-[10px] text-indigo-300 block font-semibold">TỔNG PHÒNG QUẢN LÝ</span>
                <span className="text-xl font-extrabold text-white">{rooms.length} phòng</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-8 overflow-x-auto pb-1 text-sm font-semibold">
            <button
              onClick={() => setActiveTab('rooms')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'rooms'
                  ? 'bg-white text-indigo-900 shadow-md font-bold'
                  : 'text-indigo-200 hover:bg-indigo-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Danh mục Phòng ({rooms.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('appointments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'appointments'
                  ? 'bg-white text-indigo-900 shadow-md font-bold'
                  : 'text-indigo-200 hover:bg-indigo-800'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Lịch hẹn xem phòng ({appointments.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('billing')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'billing'
                  ? 'bg-white text-indigo-900 shadow-md font-bold'
                  : 'text-indigo-200 hover:bg-indigo-800'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Tính tiền Điện Nước ({bills.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('contracts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'contracts'
                  ? 'bg-white text-indigo-900 shadow-md font-bold'
                  : 'text-indigo-200 hover:bg-indigo-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Hợp đồng thuê ({contracts.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Contents */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* TAB 1: ROOMS */}
        {activeTab === 'rooms' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Danh sách phòng trọ đang vận hành</h2>
                <p className="text-xs text-slate-500">Tự động chuyển trạng thái: Còn trống &rarr; Đã đặt lịch &rarr; Giữ chỗ &rarr; Đang thuê</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rooms.slice(0, 12).map((room) => (
                <div key={room.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-blue-600 text-sm">{room.room_code}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          room.status === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : room.status === 'BOOKED_VIEWING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {room.status === 'AVAILABLE'
                          ? 'Còn trống'
                          : room.status === 'BOOKED_VIEWING'
                          ? 'Đã đặt lịch'
                          : room.status === 'RESERVED'
                          ? 'Giữ chỗ'
                          : 'Đang thuê'}
                      </span>
                    </div>

                    <h3 className="font-semibold text-xs text-slate-800 line-clamp-1">{room.title}</h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{room.address}</p>

                    <div className="mt-3 py-2 border-t border-b border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Giá thuê:</span>
                      <span className="font-bold text-slate-900">{room.price.toLocaleString('vi-VN')} đ/tháng</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-400">Điện: {room.electricity_rate} đ/kWh</span>
                    <span>•</span>
                    <span className="text-slate-400">Nước: 25k/khối</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 2: APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">Lịch hẹn xem phòng từ Người thuê</h2>
              <p className="text-xs text-slate-500">Tiếp nhận, phê duyệt hoặc từ chối lịch hẹn trực tuyến</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Mã lịch</th>
                    <th className="py-3 px-4">Phòng</th>
                    <th className="py-3 px-4">Người đặt</th>
                    <th className="py-3 px-4">Số điện thoại</th>
                    <th className="py-3 px-4">Ngày hẹn</th>
                    <th className="py-3 px-4">Khung giờ</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {appointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-bold text-slate-900">{apt.id}</td>
                      <td className="py-3 px-4">Phòng #{apt.room_id}</td>
                      <td className="py-3 px-4 font-semibold">{apt.user_name}</td>
                      <td className="py-3 px-4">{apt.user_phone}</td>
                      <td className="py-3 px-4">{apt.date}</td>
                      <td className="py-3 px-4 font-bold text-blue-600">{apt.time_slot}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            apt.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : apt.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {apt.status === 'CONFIRMED' ? 'Đã xác nhận' : apt.status === 'PENDING' ? 'Chờ duyệt' : 'Đã hủy'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {apt.status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleUpdateAppointment(apt.id, 'CONFIRMED')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold cursor-pointer"
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={() => handleUpdateAppointment(apt.id, 'CANCELLED')}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-[11px] font-semibold cursor-pointer"
                            >
                              Hủy
                            </button>
                          </div>
                        )}
                        {apt.status === 'CONFIRMED' && (
                          <span className="text-[11px] text-emerald-600 font-semibold">Đã lên lịch</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 3: BILLING */}
        {activeTab === 'billing' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form calculate bill */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs h-fit">
              <h3 className="font-bold text-base text-slate-900 mb-1">Chốt chỉ số Điện Nước tháng</h3>
              <p className="text-xs text-slate-500 mb-4">Tự động tính thành tiền và lưu hóa đơn</p>

              {billStatusMsg && (
                <div className="p-3 mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  {billStatusMsg}
                </div>
              )}

              <form onSubmit={handleCreateBill} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chọn phòng trọ</label>
                  <select
                    value={selectedRoomForBill}
                    onChange={(e) => setSelectedRoomForBill(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden font-medium"
                  >
                    {rooms.slice(0, 10).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.room_code} - {r.title} ({r.price.toLocaleString('vi-VN')} đ)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <span className="font-bold text-amber-900 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    Chỉ số Điện (3.800 đ/kWh)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500">Chỉ số cũ:</span>
                      <input
                        type="number"
                        value={electricOld}
                        onChange={(e) => setElectricOld(Number(e.target.value))}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-semibold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Chỉ số mới:</span>
                      <input
                        type="number"
                        value={electricNew}
                        onChange={(e) => setElectricNew(Number(e.target.value))}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-semibold"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-700 font-medium pt-1">
                    Sử dụng: <strong className="text-amber-700">{Math.max(0, electricNew - electricOld)} kWh</strong> &rarr; Tiền điện: {((Math.max(0, electricNew - electricOld)) * 3800).toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                  <span className="font-bold text-blue-900 flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-blue-600" />
                    Chỉ số Nước (25.000 đ/m³)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500">Chỉ số cũ:</span>
                      <input
                        type="number"
                        value={waterOld}
                        onChange={(e) => setWaterOld(Number(e.target.value))}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-semibold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Chỉ số mới:</span>
                      <input
                        type="number"
                        value={waterNew}
                        onChange={(e) => setWaterNew(Number(e.target.value))}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-semibold"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-700 font-medium pt-1">
                    Sử dụng: <strong className="text-blue-700">{Math.max(0, waterNew - waterOld)} m³</strong> &rarr; Tiền nước: {((Math.max(0, waterNew - waterOld)) * 25000).toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  Xuất Hóa Đơn Tháng
                </button>
              </form>
            </div>

            {/* List of bills */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h3 className="font-bold text-base text-slate-900 mb-1">Lịch sử Hóa Đơn Đã Xuất</h3>
              <p className="text-xs text-slate-500 mb-4">Người thuê có thể xem và thanh toán giả lập trên Web / Mobile App</p>

              <div className="space-y-3">
                {bills.map((b) => (
                  <div key={b.id} className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">Phòng {b.room_code}</span>
                        <span className="text-slate-500">• Tháng {b.month}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${b.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {b.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                        </span>
                      </div>
                      <div className="mt-1 text-slate-600 flex flex-wrap gap-2 text-[11px]">
                        <span>Tiền phòng: {b.rent_cost.toLocaleString('vi-VN')} đ</span>
                        <span>•</span>
                        <span>Điện ({b.electric_used} kWh): {b.electric_cost.toLocaleString('vi-VN')} đ</span>
                        <span>•</span>
                        <span>Nước ({b.water_used} m³): {b.water_cost.toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>

                    <div className="text-right sm:border-l sm:pl-4 border-slate-200">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Tổng thanh toán</span>
                      <span className="text-base font-extrabold text-blue-600">
                        {b.total_amount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CONTRACTS */}
        {activeTab === 'contracts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create contract form */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs h-fit">
              <h3 className="font-bold text-base text-slate-900 mb-1">Tạo Hợp Đồng Thuê Mới</h3>
              <p className="text-xs text-slate-500 mb-4">Tự động chuyển phòng sang trạng thái "Đang thuê"</p>

              {contractStatusMsg && (
                <div className="p-3 mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  {contractStatusMsg}
                </div>
              )}

              <form onSubmit={handleCreateContract} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chọn phòng trọ</label>
                  <select
                    value={selectedRoomForContract}
                    onChange={(e) => setSelectedRoomForContract(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden font-medium"
                  >
                    {rooms.filter((r) => r.status !== 'RENTED').slice(0, 8).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.room_code} - {r.title} ({r.price.toLocaleString('vi-VN')} đ)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Họ tên người thuê</label>
                  <input
                    type="text"
                    required
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số điện thoại người thuê</label>
                  <input
                    type="tel"
                    required
                    value={tenantPhone}
                    onChange={(e) => setTenantPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ngày bắt đầu</label>
                    <input
                      type="date"
                      value={contractStartDate}
                      onChange={(e) => setContractStartDate(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ngày kết thúc</label>
                    <input
                      type="date"
                      value={contractEndDate}
                      onChange={(e) => setContractEndDate(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer mt-2"
                >
                  Ký Hợp Đồng Điện Tử
                </button>
              </form>
            </div>

            {/* Contracts list */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h3 className="font-bold text-base text-slate-900 mb-1">Danh Sách Hợp Đồng Điện Tử</h3>
              <p className="text-xs text-slate-500 mb-4">Lưu trữ thời hạn thuê, giá thuê và tiền cọc phòng</p>

              <div className="space-y-3">
                {contracts.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{c.room_title}</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                          Đang hiệu lực
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">
                        Người thuê: <strong className="text-slate-900">{c.tenant_name}</strong> ({c.tenant_phone})
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Thời hạn: {c.start_date} &rarr; {c.end_date}
                      </p>
                    </div>

                    <div className="text-right sm:border-l sm:pl-4 border-slate-200">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Giá thuê / Cọc</span>
                      <span className="text-sm font-extrabold text-indigo-600">
                        {c.monthly_rent.toLocaleString('vi-VN')} đ/tháng
                      </span>
                      <span className="text-[10px] text-slate-500 block">Cọc: {c.deposit_amount.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
