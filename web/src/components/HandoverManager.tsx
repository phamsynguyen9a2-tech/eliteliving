'use client';

import { scopedFetch as fetch } from '@/lib/scoped-fetch';

import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  Eye,
  SlidersHorizontal,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Calendar,
  X,
  Loader2,
  Trash2,
  Camera,
  Check,
  Building,
  Clock,
} from 'lucide-react';
import type { Handover, HandoverItem, HandoverComparison, Room } from '@/lib/types';
import { DEFAULT_ASSET_TEMPLATES } from '@/data/sample_handovers';

interface HandoverManagerProps {
  rooms: Room[];
  currentLandlordName?: string;
  onToast?: (msg: string, type?: 'success' | 'error') => void;
}

export default function HandoverManager({
  rooms,
  currentLandlordName = 'Nguyễn Văn Hùng',
  onToast,
}: HandoverManagerProps) {
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedHandover, setSelectedHandover] = useState<Handover | null>(null);
  const [comparisonData, setComparisonData] = useState<{
    room_code: string;
    room_title: string;
    tenant_name: string;
    check_in_date: string;
    check_out_date: string;
    total_damage_cost: number;
    comparisons: HandoverComparison[];
  } | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // Form State
  const [formRoomId, setFormRoomId] = useState<number>(rooms[0]?.id || 101);
  const [formType, setFormType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [formTenantName, setFormTenantName] = useState('Trần Văn Minh');
  const [formTenantPhone, setFormTenantPhone] = useState('0908123456');
  const [formNotes, setFormNotes] = useState('Bàn giao phòng sạch sẽ, đầy đủ chìa khóa và thẻ từ.');
  const [formItems, setFormItems] = useState<any[]>(
    DEFAULT_ASSET_TEMPLATES.map((t, idx) => ({
      ...t,
      id: `new_item_${idx}`,
      photos: [],
      note: '',
    }))
  );
  const [submitting, setSubmitting] = useState(false);

  // Fetch list
  const fetchHandovers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/handover');
      const data = await res.json();
      if (data.success && data.data) {
        setHandovers(data.data);
      }
    } catch (err) {
      console.error('Failed to load handovers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandovers();
  }, []);

  // Handle open comparison
  const handleOpenCompare = async (handoverId: string) => {
    setCompareLoading(true);
    setShowCompareModal(true);
    try {
      const res = await fetch(`/api/handover/${handoverId}/compare`);
      const data = await res.json();
      if (data.success && data.data) {
        setComparisonData(data.data);
      }
    } catch {
      onToast?.('Lỗi khi tải dữ liệu đối soát', 'error');
    } finally {
      setCompareLoading(false);
    }
  };

  // Handle confirm
  const handleConfirmHandover = async (id: string) => {
    try {
      const res = await fetch(`/api/handover/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'LANDLORD' }),
      });
      const data = await res.json();
      if (data.success) {
        onToast?.('✅ Chủ trọ đã ký xác nhận biên bản bàn giao thành công!');
        fetchHandovers();
        if (selectedHandover) {
          setSelectedHandover({
            ...selectedHandover,
            landlord_confirmed: true,
            status: selectedHandover.tenant_confirmed ? 'CONFIRMED' : 'PENDING_CONFIRMATION',
          });
        }
      }
    } catch {
      onToast?.('Lỗi xác nhận biên bản', 'error');
    }
  };

  // Add asset item to form
  const handleAddFormItem = () => {
    setFormItems([
      ...formItems,
      {
        name: '',
        category: 'Nội thất',
        quantity: 1,
        condition: 'Tốt',
        estimated_cost: 0,
        note: '',
        photos: [],
      },
    ]);
  };

  // Remove asset item from form
  const handleRemoveFormItem = (idx: number) => {
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  // Submit Create Handover
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const room = rooms.find((r) => r.id === Number(formRoomId)) || rooms[0];

    try {
      const res = await fetch('/api/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_id: `ct_${room?.id || 101}`,
          room_id: room?.id || 101,
          room_code: room?.room_code || 'P-101',
          room_title: room?.title || 'Phòng cho thuê',
          type: formType,
          tenant_name: formTenantName,
          tenant_phone: formTenantPhone,
          landlord_name: currentLandlordName,
          notes: formNotes,
          items: formItems,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onToast?.(`✅ Tạo biên bản bàn giao ${formType === 'CHECK_IN' ? 'Nhận phòng' : 'Trả phòng'} thành công!`);
        setShowCreateModal(false);
        fetchHandovers();
      } else {
        onToast?.(data.message || 'Lỗi khi tạo biên bản', 'error');
      }
    } catch {
      onToast?.('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filters
  const filteredHandovers = handovers.filter((h) => {
    if (filterType !== 'ALL' && h.type !== filterType) return false;
    if (filterStatus !== 'ALL' && h.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        h.tenant_name.toLowerCase().includes(q) ||
        h.tenant_phone.includes(q) ||
        (h.room_code && h.room_code.toLowerCase().includes(q)) ||
        (h.room_title && h.room_title.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <ClipboardCheck className="w-4 h-4" />
            <span>Quy Trình Quản Lý Tài Sản &amp; Cơ Sở Vật Chất</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">
            Biên Bản Bàn Giao CSVC (Check-in &amp; Check-out)
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Lập danh mục kiểm kê trang thiết bị khi khách nhận phòng và tự động đối soát hư hại khi khách trả phòng để khấu trừ tiền cọc minh bạch, tránh tranh chấp.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Biên Bản Bàn Giao Mới</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên khách thuê, SĐT hoặc mã phòng..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">Tất cả loại biên bản</option>
            <option value="CHECK_IN">Nhận phòng (Check-in)</option>
            <option value="CHECK_OUT">Trả phòng (Check-out)</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="CONFIRMED">Đã xác nhận 2 bên</option>
            <option value="PENDING_CONFIRMATION">Chờ xác nhận</option>
          </select>
        </div>
      </div>

      {/* Handovers Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Đang tải danh sách biên bản bàn giao...</p>
          </div>
        ) : filteredHandovers.length === 0 ? (
          <div className="text-center py-16 p-6">
            <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700 mb-1">Chưa có biên bản bàn giao nào</h4>
            <p className="text-xs text-slate-400 mb-4">
              Hãy tạo biên bản bàn giao CSVC đầu tiên khi có khách thuê nhận phòng.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700"
            >
              + Tạo biên bản ngay
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Mã &amp; Phòng</th>
                  <th className="py-3.5 px-4">Loại biên bản</th>
                  <th className="py-3.5 px-4">Khách thuê</th>
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4">Tài sản &amp; Hư hao</th>
                  <th className="py-3.5 px-4">Ký xác nhận</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHandovers.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Mã & Phòng */}
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900">{h.room_code || 'P-101'}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[160px]">{h.room_title}</div>
                    </td>

                    {/* Loại biên bản */}
                    <td className="py-3.5 px-4">
                      {h.type === 'CHECK_IN' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                          🟢 NHẬN PHÒNG
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                          🔴 TRẢ PHÒNG
                        </span>
                      )}
                    </td>

                    {/* Khách thuê */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{h.tenant_name}</div>
                      <div className="text-[11px] text-slate-500">{h.tenant_phone}</div>
                    </td>

                    {/* Thời gian */}
                    <td className="py-3.5 px-4 text-slate-600">
                      {new Date(h.handover_date).toLocaleDateString('vi-VN')}
                    </td>

                    {/* Tài sản & Hư hao */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-700">
                        {h.items?.length || 8} hạng mục
                      </div>
                      {h.damage_cost > 0 ? (
                        <div className="text-[11px] font-bold text-red-600">
                          Bồi thường: {h.damage_cost.toLocaleString('vi-VN')} đ
                        </div>
                      ) : (
                        <div className="text-[11px] text-emerald-600 font-medium">CSVC nguyên vẹn</div>
                      )}
                    </td>

                    {/* Xác nhận */}
                    <td className="py-3.5 px-4">
                      {h.status === 'CONFIRMED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Đã ký 2 bên
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Chờ khách ký
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {h.type === 'CHECK_OUT' && (
                          <button
                            type="button"
                            onClick={() => handleOpenCompare(h.id)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                            title="So sánh với biên bản Nhận phòng lúc đầu"
                          >
                            📊 Đối soát
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedHandover(h);
                            setShowDetailModal(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          👁️ Xem &amp; Ký
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: TẠO BIÊN BẢN BÀN GIAO MỚI                           */}
      {/* ============================================================ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Lập Biên Bản Bàn Giao Cơ Sở Vật Chất
                </h3>
                <p className="text-xs text-slate-500">
                  Kiểm kê chi tiết trang thiết bị nội thất và điện máy bàn giao cho khách thuê
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-5 text-xs mt-5">
              {/* Loại biên bản & Chọn phòng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Loại biên bản <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormType('CHECK_IN')}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        formType === 'CHECK_IN'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Nhận phòng (Check-in)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('CHECK_OUT')}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        formType === 'CHECK_OUT'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Trả phòng (Check-out)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Chọn phòng bàn giao <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formRoomId}
                    onChange={(e) => setFormRoomId(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.room_code} — {r.title} ({r.district})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Thông tin người thuê */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Họ tên người thuê <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTenantName}
                    onChange={(e) => setFormTenantName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Số điện thoại người thuê <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formTenantPhone}
                    onChange={(e) => setFormTenantPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Danh sách tài sản kiểm kê */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-700 uppercase tracking-wider">
                    Danh mục tài sản &amp; Tình trạng CSVC ({formItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddFormItem}
                    className="px-2.5 py-1 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    + Thêm tài sản
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Tên tài sản</th>
                        <th className="py-2.5 px-2 w-16">SL</th>
                        <th className="py-2.5 px-3 w-28">Tình trạng</th>
                        <th className="py-2.5 px-3 w-28">Ước tính hư hại (đ)</th>
                        <th className="py-2.5 px-2 text-right">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              required
                              value={item.name}
                              onChange={(e) => {
                                const copy = [...formItems];
                                copy[idx].name = e.target.value;
                                setFormItems(copy);
                              }}
                              placeholder="Tên trang thiết bị"
                              className="w-full p-1.5 border border-slate-200 rounded font-semibold text-slate-900"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => {
                                const copy = [...formItems];
                                copy[idx].quantity = Number(e.target.value);
                                setFormItems(copy);
                              }}
                              className="w-12 p-1.5 border border-slate-200 rounded text-center text-slate-900"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={item.condition}
                              onChange={(e) => {
                                const copy = [...formItems];
                                copy[idx].condition = e.target.value;
                                setFormItems(copy);
                              }}
                              className="w-full p-1.5 border border-slate-200 rounded font-medium text-slate-900"
                            >
                              <option value="Tốt">Tốt</option>
                              <option value="Bình thường">Bình thường</option>
                              <option value="Hư hỏng">Hư hỏng</option>
                              <option value="Mất">Mất</option>
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min={0}
                              step={10000}
                              value={item.estimated_cost}
                              onChange={(e) => {
                                const copy = [...formItems];
                                copy[idx].estimated_cost = Number(e.target.value);
                                setFormItems(copy);
                              }}
                              className="w-full p-1.5 border border-slate-200 rounded text-right text-slate-900 font-bold"
                            />
                          </td>
                          <td className="py-2 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveFormItem(idx)}
                              className="p-1 text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Ghi chú tổng kết bàn giao
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Lưu &amp; Ký Biên Bản</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: SO SÁNH ĐỐI SOÁT CHECK_IN VS CHECK_OUT              */}
      {/* ============================================================ */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Đối soát hao mòn &amp; hư hỏng tài sản
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  So Sánh CSVC Lúc Nhận Phòng vs Trả Phòng
                </h3>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {compareLoading ? (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Đang đối chiếu dữ liệu hình ảnh và biên bản...</p>
              </div>
            ) : comparisonData ? (
              <div className="mt-5 space-y-6">
                {/* Meta summary */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Phòng</span>
                    <strong className="text-slate-900">{comparisonData.room_code}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Khách thuê</span>
                    <strong className="text-slate-900">{comparisonData.tenant_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Ngày nhận phòng</span>
                    <span className="text-slate-700">{new Date(comparisonData.check_in_date).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Ngày trả phòng</span>
                    <span className="text-slate-700">{new Date(comparisonData.check_out_date).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>

                {/* Table Comparison */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-3">Tài sản kiểm tra</th>
                        <th className="py-3 px-3">Lúc Nhận phòng</th>
                        <th className="py-3 px-3">Lúc Trả phòng</th>
                        <th className="py-3 px-3">Đánh giá hao mòn</th>
                        <th className="py-3 px-3 text-right">Chi phí trừ cọc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {comparisonData.comparisons.map((c, idx) => (
                        <tr
                          key={idx}
                          className={c.has_damage ? 'bg-red-50/50' : 'hover:bg-slate-50'}
                        >
                          <td className="py-3 px-3 font-semibold text-slate-900">{c.asset_name}</td>
                          <td className="py-3 px-3 text-emerald-700 font-medium">
                            ✅ {c.check_in_condition} (SL: {c.check_in_quantity})
                          </td>
                          <td className="py-3 px-3">
                            {c.has_damage ? (
                              <span className="font-bold text-red-600">
                                ⚠️ {c.check_out_condition} (SL: {c.check_out_quantity})
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-medium">
                                ✅ {c.check_out_condition}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {c.has_damage ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                                Hư hại / Thất lạc
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
                                Khớp 100%
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-extrabold text-slate-900">
                            {c.damage_cost > 0 ? (
                              <span className="text-red-600">
                                +{c.damage_cost.toLocaleString('vi-VN')} đ
                              </span>
                            ) : (
                              <span className="text-slate-400">0 đ</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total Damage Compensation Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-300 block">
                      Tổng chi phí bồi thường hư hao cơ sở vật chất:
                    </span>
                    <span className="text-2xl font-black text-amber-400">
                      {comparisonData.total_damage_cost.toLocaleString('vi-VN')} đ
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      (Được tự động khấu trừ vào số tiền hoàn trả cọc cho người thuê)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onToast?.(`✅ Đã xác nhận khấu trừ ${comparisonData.total_damage_cost.toLocaleString('vi-VN')} đ vào tiền cọc!`);
                      setShowCompareModal(false);
                    }}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer shrink-0"
                  >
                    Xác nhận &amp; Khấu trừ tiền cọc
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: XEM CHI TIẾT & KÝ XÁC NHẬN BIÊN BẢN                 */}
      {/* ============================================================ */}
      {showDetailModal && selectedHandover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                  Mã biên bản #{selectedHandover.id}
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Biên Bản Bàn Giao {selectedHandover.type === 'CHECK_IN' ? 'Nhận Phòng' : 'Trả Phòng'}
                </h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px]">Phòng bàn giao</span>
                  <strong className="text-slate-800">{selectedHandover.room_code} — {selectedHandover.room_title}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Người thuê phòng</span>
                  <strong className="text-slate-800">{selectedHandover.tenant_name} ({selectedHandover.tenant_phone})</strong>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Tài sản</th>
                      <th className="py-2.5 px-2">SL</th>
                      <th className="py-2.5 px-3">Tình trạng</th>
                      <th className="py-2.5 px-3">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedHandover.items?.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{item.asset_name}</td>
                        <td className="py-2 px-2 text-slate-600">{item.quantity}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.condition === 'Tốt'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {item.condition}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-500">{item.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures status */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-white rounded-xl border border-slate-100">
                  <span className="block text-[11px] font-bold text-slate-500 mb-1">ĐẠI DIỆN CHỦ TRỌ</span>
                  <div className="h-14 flex items-center justify-center">
                    {selectedHandover.landlord_confirmed ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Đã ký điện tử
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConfirmHandover(selectedHandover.id)}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                      >
                        Ký ngay
                      </button>
                    )}
                  </div>
                  <strong className="text-slate-800 block text-xs">{selectedHandover.landlord_name}</strong>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-100">
                  <span className="block text-[11px] font-bold text-slate-500 mb-1">NGƯỜI THUÊ PHÒNG</span>
                  <div className="h-14 flex items-center justify-center">
                    {selectedHandover.tenant_confirmed ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Đã ký xác nhận
                      </span>
                    ) : (
                      <span className="text-amber-600 text-xs font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Đã gửi qua SMS/App
                      </span>
                    )}
                  </div>
                  <strong className="text-slate-800 block text-xs">{selectedHandover.tenant_name}</strong>
                </div>
              </div>

              {/* Action */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Biên Bản</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
