'use client';

import React, { useState } from 'react';
import { Handover, HandoverItem } from '@/lib/types';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Printer,
  X,
  Building2,
  Calendar,
  Layers,
  Check,
  Loader2,
  UserCheck,
} from 'lucide-react';

interface HandoverDetailModalProps {
  handover: Handover;
  onClose: () => void;
  onConfirmed?: () => void;
}

export default function HandoverDetailModal({
  handover,
  onClose,
  onConfirmed,
}: HandoverDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(handover.tenant_confirmed);

  const handleTenantConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CONFIRM_HANDOVER',
          handoverId: handover.id,
          role: 'TENANT',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setConfirmed(true);
        if (onConfirmed) onConfirmed();
        alert('✅ Bạn đã ký xác nhận Biên bản bàn giao cơ sở vật chất thành công!');
      } else {
        alert(json.message || 'Lỗi xác nhận bàn giao');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const items = handover.items && handover.items.length > 0 ? handover.items : [
    { id: '1', asset_name: 'Khóa cửa vân tay thông minh', category: 'An ninh', quantity: 1, condition: 'Tốt (Đã cấp quyền vân tay)', estimated_cost: 0, photos: [] },
    { id: '2', asset_name: 'Máy lạnh Inverter 1.5 HP', category: 'Điện lạnh', quantity: 1, condition: 'Tốt (Làm lạnh sâu, kèm remote)', estimated_cost: 0, photos: [] },
    { id: '3', asset_name: 'Tủ lạnh 2 cánh 180L', category: 'Điện lạnh', quantity: 1, condition: 'Tốt (Đông đá và mát tốt)', estimated_cost: 0, photos: [] },
    { id: '4', asset_name: 'Gác lửng đúc & Cầu thang sắt', category: 'Kết cấu', quantity: 1, condition: 'Chắc chắn, lan can an toàn', estimated_cost: 0, photos: [] },
    { id: '5', asset_name: 'Thiết bị vệ sinh & Vòi sen tắm', category: 'Vệ sinh', quantity: 1, condition: 'Hoạt động tốt, sạch sẽ', estimated_cost: 0, photos: [] },
    { id: '6', asset_name: 'Đồng hồ công tơ điện riêng', category: 'Điện nước', quantity: 1, condition: 'Nguyên niêm phong kiểm định', estimated_cost: 0, photos: [] },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto font-sans text-xs text-slate-800">
        {/* HEADER BAR */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B89C66] animate-pulse" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Biên Bản Bàn Giao Cơ Sở Vật Chất (Kiểm Kê Thiết Bị)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRINTABLE CONTENT */}
        <div className="pt-4 space-y-4 leading-relaxed">
          <div className="text-center space-y-1 pb-2 border-b border-slate-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </h2>
            <p className="text-[11px] font-semibold text-slate-500">Độc lập – Tự do – Hạnh phúc</p>
            <div className="w-24 h-0.5 bg-slate-300 mx-auto my-1" />
            <h1 className="text-base font-black uppercase text-[#0F223A] pt-1">
              BIÊN BẢN BÀN GIAO CƠ SỞ VẬT CHẤT &amp; HIỆN TRẠNG PHÒNG
            </h1>
            <p className="text-[11px] text-slate-500">
              Mã biên bản: <strong>{handover.id}</strong> • Phân loại:{' '}
              <strong className="text-[#B89C66]">{handover.type === 'CHECK_IN' ? 'BÀN GIAO NHẬN PHÒNG (CHECK-IN)' : 'BÀN GIAO TRẢ PHÒNG (CHECK-OUT)'}</strong>
            </p>
          </div>

          {/* TWO PARTIES INFO */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px]">
            <div>
              <p className="font-bold text-[#0F223A] uppercase">Bên bàn giao (Chủ trọ / Quản lý):</p>
              <p className="font-semibold text-slate-800 mt-0.5">{handover.landlord_name || 'Nguyễn Văn Hùng'}</p>
              <p className="text-slate-500">Hệ thống: Elite Living Residential</p>
            </div>
            <div>
              <p className="font-bold text-[#0F223A] uppercase">Bên tiếp nhận (Khách thuê):</p>
              <p className="font-semibold text-slate-800 mt-0.5">{handover.tenant_name}</p>
              <p className="text-slate-500">SĐT: {handover.tenant_phone}</p>
            </div>
          </div>

          {/* ROOM DETAILS */}
          <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 text-[11px] flex items-center justify-between">
            <div>
              <span className="font-bold text-[#0F223A]">Căn hộ bàn giao:</span>{' '}
              <strong>{handover.room_title || `Căn phòng #${handover.room_id}`}</strong>
            </div>
            <div>
              <span className="text-slate-500">Ngày lập biên bản:</span>{' '}
              <strong>{new Date(handover.handover_date).toLocaleDateString('vi-VN')}</strong>
            </div>
          </div>

          {/* ASSET ITEMS TABLE */}
          <div>
            <h4 className="font-bold text-xs text-[#0F223A] uppercase mb-2">
              DANH MỤC TRANG THIẾT BỊ &amp; TÌNH TRẠNG BÀN GIAO:
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">STT</th>
                    <th className="py-2.5 px-3">Tên thiết bị / Tài sản</th>
                    <th className="py-2.5 px-3">Phân loại</th>
                    <th className="py-2.5 px-3 text-center">Số lượng</th>
                    <th className="py-2.5 px-3">Hiện trạng kiểm kê</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-500 font-bold">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{item.asset_name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{item.category}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{item.quantity}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {item.condition}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {handover.notes && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
              <span className="font-bold text-slate-700">Ghi chú đặc biệt:</span> {handover.notes}
            </div>
          )}

          {/* SIGNATURE SECTION */}
          <div className="pt-4 grid grid-cols-2 text-center text-xs">
            <div>
              <p className="font-bold text-slate-800 uppercase">ĐẠI DIỆN BÊN TIẾP NHẬN (KHÁCH THUÊ)</p>
              {confirmed ? (
                <div className="mt-2 text-emerald-600 font-bold flex flex-col items-center gap-1">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-[11px]">Đã ký xác nhận tiếp nhận CSVC</span>
                  <span className="font-mono text-[9px] text-slate-400">SIG_VERIFIED_TENANT</span>
                </div>
              ) : (
                <p className="text-[10px] text-amber-600 mt-2 font-semibold">Chưa ký nhận bàn giao</p>
              )}
              <div className="my-4 font-bold text-slate-900">{handover.tenant_name}</div>
            </div>

            <div>
              <p className="font-bold text-slate-800 uppercase">ĐẠI DIỆN BÊN BÀN GIAO (CHỦ TRỌ)</p>
              <div className="mt-2 text-[#B89C66] font-bold flex flex-col items-center gap-1">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-[11px]">Chủ trọ đã ký bàn giao</span>
                <span className="font-mono text-[9px] text-slate-400">SIG_LANDLORD_CONFIRMED</span>
              </div>
              <div className="my-4 font-bold text-slate-900">{handover.landlord_name || 'Nguyễn Văn Hùng'}</div>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In Biên Bản</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-semibold cursor-pointer text-xs"
            >
              Đóng
            </button>

            {!confirmed && (
              <button
                type="button"
                disabled={loading}
                onClick={handleTenantConfirm}
                className="px-5 py-2 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-[#B89C66]/25 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                <span>Ký Nhận Bàn Giao CSVC</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
