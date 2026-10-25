'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { scopedFetch as fetch } from '@/lib/scoped-fetch';
import { Plus, Save, Trash2 } from 'lucide-react';

interface AmenityRow {
  id: number;
  name: string;
  category: string;
  isActive: boolean;
  roomCount: number;
}

interface Pricing {
  electricityRate: number;
  waterRate: number;
  internetFee: number;
  serviceFee: number;
  parkingFee: number;
}

const PRICE_FIELDS: Array<{ key: keyof Pricing; label: string; unit: string }> = [
  { key: 'electricityRate', label: 'Đơn giá điện', unit: 'đ/kWh' },
  { key: 'waterRate', label: 'Đơn giá nước', unit: 'đ/m³' },
  { key: 'internetFee', label: 'Phí internet', unit: 'đ/tháng' },
  { key: 'serviceFee', label: 'Phí dịch vụ chung', unit: 'đ/tháng' },
  { key: 'parkingFee', label: 'Phí gửi xe', unit: 'đ/xe/tháng' },
];

/** Danh mục tiện ích và đơn giá dịch vụ mặc định (CRUD danh mục trên Web Admin). */
export default function CatalogPanel() {
  const [amenities, setAmenities] = useState<AmenityRow[]>([]);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Tiện ích');
  const [editing, setEditing] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/catalog', { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      setError(json.message || 'Không tải được danh mục.');
      return;
    }
    setAmenities(json.data.amenities);
    setPricing(json.data.pricing);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const post = async (payload: Record<string, unknown>) => {
    if (busy) return false;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/catalog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Không lưu được.');
      setNotice(json.message);
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const input = 'px-3 py-2 border border-[#E5E3DE] rounded-xl bg-white focus:border-[#B89C66] outline-hidden text-sm';
  return (
    <div className="space-y-6">
      {notice && <p role="status" className="p-3 rounded-xl border border-[#E5D7B7] bg-[#FAF0DC] text-sm text-[#0F223A]">{notice}</p>}
      {error && <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</p>}

      <section className="bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-6 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-lg text-[#0F223A]">Đơn giá dịch vụ mặc định</h3>
          <p className="text-sm text-slate-500">Điền sẵn khi chủ trọ / admin thêm phòng mới. Phòng đã có giữ nguyên đơn giá riêng.</p>
        </div>
        {pricing && (
          <form onSubmit={(e) => { e.preventDefault(); post({ action: 'SAVE_PRICING', pricing }); }} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            {PRICE_FIELDS.map((f) => (
              <div key={f.key}>
                <label htmlFor={`price-${f.key}`} className="block text-xs font-bold text-slate-600 mb-1">{f.label} ({f.unit})</label>
                <input id={`price-${f.key}`} inputMode="numeric" className={`${input} w-full`} value={pricing[f.key]}
                  onChange={(e) => setPricing({ ...pricing, [f.key]: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
              </div>
            ))}
            <button type="submit" disabled={busy} className="sm:col-span-2 lg:col-span-5 justify-self-start px-4 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-bold text-sm inline-flex items-center gap-1.5 disabled:opacity-60">
              <Save className="w-4 h-4" /> Lưu đơn giá
            </button>
          </form>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-6 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-lg text-[#0F223A]">Danh mục tiện ích ({amenities.length})</h3>
          <p className="text-sm text-slate-500">Chủ trọ chọn tiện ích từ danh mục này khi đăng phòng; người thuê dùng để lọc và lập hồ sơ nhu cầu. Đổi tên sẽ cập nhật luôn các phòng đang dùng.</p>
        </div>
        <form onSubmit={async (e) => { e.preventDefault(); if (await post({ action: 'ADD_AMENITY', name: newName, category: newCategory })) setNewName(''); }} className="flex flex-wrap gap-2">
          <label htmlFor="new-amenity" className="sr-only">Tên tiện ích mới</label>
          <input id="new-amenity" placeholder="Tên tiện ích mới, VD: Máy nước nóng" value={newName} onChange={(e) => setNewName(e.target.value)} className={`${input} flex-1 min-w-[200px]`} />
          <label htmlFor="new-amenity-cat" className="sr-only">Nhóm tiện ích</label>
          <select id="new-amenity-cat" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className={input}>
            {['Tiện ích', 'Nội thất', 'Thiết bị', 'An ninh', 'Tòa nhà'].map((c) => <option key={c}>{c}</option>)}
          </select>
          <button type="submit" disabled={busy || newName.trim().length < 2} className="px-4 py-2 rounded-xl bg-[#B89C66] text-[#0F223A] font-bold text-sm inline-flex items-center gap-1.5 disabled:opacity-50"><Plus className="w-4 h-4" /> Thêm</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8F8F6] border-b border-[#E5E3DE] text-slate-600 uppercase font-semibold">
              <tr><th className="py-3 px-4">Tiện ích</th><th className="py-3 px-4">Nhóm</th><th className="py-3 px-4 text-right">Số phòng có</th><th className="py-3 px-4">Hiển thị</th><th className="py-3 px-4 text-right">Thao tác</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {amenities.map((a) => (
                <tr key={a.id} className={a.isActive ? '' : 'opacity-60'}>
                  <td data-label="Tiện ích" className="py-2.5 px-4">
                    {editing[a.id] !== undefined ? (
                      <input aria-label={`Tên mới cho ${a.name}`} className={`${input} w-full`} value={editing[a.id]} onChange={(e) => setEditing({ ...editing, [a.id]: e.target.value })} />
                    ) : <span className="font-semibold text-[#0F223A]">{a.name}</span>}
                  </td>
                  <td data-label="Nhóm" className="py-2.5 px-4 text-slate-600">{a.category}</td>
                  <td data-label="Số phòng có" className="py-2.5 px-4 text-right tabular-nums">{a.roomCount}</td>
                  <td data-label="Hiển thị" className="py-2.5 px-4">
                    <button type="button" onClick={() => post({ action: 'UPDATE_AMENITY', id: a.id, isActive: !a.isActive })}
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${a.isActive ? 'bg-[#F3E2BE] text-[#0F223A]' : 'bg-slate-200 text-slate-600'}`}>
                      {a.isActive ? 'Đang dùng' : 'Đã ẩn'}
                    </button>
                  </td>
                  <td data-label="Thao tác" className="py-2.5 px-4 text-right whitespace-nowrap">
                    {editing[a.id] !== undefined ? (
                      <>
                        <button type="button" onClick={async () => { if (await post({ action: 'UPDATE_AMENITY', id: a.id, name: editing[a.id] })) { const next = { ...editing }; delete next[a.id]; setEditing(next); } }} className="mr-1.5 px-2.5 py-1 rounded-xl bg-[#B89C66] text-[#0F223A] text-xs font-bold">Lưu</button>
                        <button type="button" onClick={() => { const next = { ...editing }; delete next[a.id]; setEditing(next); }} className="px-2.5 py-1 rounded-xl border border-[#E5E3DE] text-xs">Hủy</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => setEditing({ ...editing, [a.id]: a.name })} className="mr-1.5 px-2.5 py-1 rounded-xl bg-[#F3F2EE] text-xs font-semibold">Đổi tên</button>
                        <button type="button" aria-label={`Xóa ${a.name}`} onClick={() => { if (window.confirm(`Xóa "${a.name}" khỏi danh mục? Các phòng đang có tiện ích này vẫn giữ nguyên.`)) post({ action: 'DELETE_AMENITY', id: a.id }); }} className="px-2 py-1 rounded-xl bg-rose-50 text-rose-700"><Trash2 className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
