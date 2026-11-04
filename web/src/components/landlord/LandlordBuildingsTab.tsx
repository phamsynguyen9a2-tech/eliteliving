'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Building2, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';
import { scopedFetch } from '@/lib/scoped-fetch';

interface BuildingRow {
  code: string;
  name: string;
  address: string;
  district: string;
  lat: number;
  lng: number;
  basePrice: number;
  roomType: string;
  area: number;
  amenities: string[];
  images: string[];
  _count?: { rooms: number };
}

const emptyForm = {
  name: '', address: '', district: 'Quận Tân Phú', lat: '10.8015', lng: '106.6295',
  basePrice: '4000000', roomType: 'Phòng Studio', area: '25', amenities: 'Wifi, Máy lạnh, WC riêng', images: '',
};

export default function LandlordBuildingsTab({ landlordId }: { landlordId: string }) {
  const [items, setItems] = useState<BuildingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await scopedFetch(`/api/landlord/buildings?landlordId=${encodeURIComponent(landlordId)}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không tải được danh sách khu trọ.');
      setItems(result.data || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được danh sách khu trọ.');
    } finally {
      setLoading(false);
    }
  }, [landlordId]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openCreate = () => {
    setEditingCode(null);
    setForm(emptyForm);
    setMessage('');
    setEditorOpen(true);
  };

  const openEdit = (item: BuildingRow) => {
    setEditingCode(item.code);
    setForm({
      name: item.name, address: item.address, district: item.district,
      lat: String(item.lat), lng: String(item.lng), basePrice: String(item.basePrice),
      roomType: item.roomType, area: String(item.area), amenities: item.amenities.join(', '), images: item.images.join('\n'),
    });
    setMessage('');
    setEditorOpen(true);
  };

  const payload = () => ({
    name: form.name.trim(), address: form.address.trim(), district: form.district.trim(),
    lat: Number(form.lat), lng: Number(form.lng), basePrice: Number(form.basePrice),
    roomType: form.roomType.trim(), area: Number(form.area),
    landlordId,
    amenities: form.amenities.split(',').map((value) => value.trim()).filter(Boolean),
    images: form.images.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
  });

  return (
    <section className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#E5E3DE] bg-white p-5">
        <div><h2 className="text-lg font-bold text-[#0F223A]">Khu trọ đang quản lý</h2><p className="text-sm text-slate-500 mt-1">Cập nhật địa chỉ, tọa độ, ảnh, giá tham khảo và tiện ích dùng chung.</p></div>
        <button type="button" onClick={openCreate} className="min-h-11 px-4 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-bold inline-flex items-center justify-center gap-2 shadow-sm shadow-[#B89C66]/25"><Plus className="w-4 h-4" />Thêm khu trọ</button>
      </div>
      {message && !editorOpen && <p className="rounded-xl border border-[#E5E3DE] bg-white px-4 py-3 text-sm text-rose-600">{message}</p>}
      {loading ? <p className="text-sm text-slate-500">Đang tải danh sách…</p> : items.length === 0 ? <div className="rounded-2xl border border-dashed border-[#B89C66] bg-[#FAF0DC] p-8 text-center"><Building2 className="w-8 h-8 text-[#8C6D37] mx-auto mb-2" /><p className="font-semibold">Chưa có khu trọ. Hãy tạo khu trọ trước khi thêm phòng.</p></div> : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{items.map((item) => (
          <article key={item.code} className="rounded-2xl border border-[#E5E3DE] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#8C6D37]">{item.code}</p><h3 className="text-lg font-bold text-[#0F223A] mt-1">{item.name}</h3><p className="text-sm text-slate-600 mt-1 flex items-start gap-1.5"><MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#B89C66]" />{item.address}, {item.district}</p></div><span className="rounded-full bg-[#FAF0DC] px-3 py-1 text-xs font-bold text-[#0F223A]">{item._count?.rooms || 0} phòng</span></div>
            <dl className="grid grid-cols-2 gap-3 mt-4 text-sm"><div><dt className="text-slate-500">Tọa độ</dt><dd className="font-semibold">{item.lat.toFixed(5)}, {item.lng.toFixed(5)}</dd></div><div><dt className="text-slate-500">Giá tham khảo</dt><dd className="font-semibold">{Math.round(item.basePrice).toLocaleString('vi-VN')} đ</dd></div></dl>
            <div className="flex flex-wrap gap-1.5 mt-4">{item.amenities.map((amenity) => <span key={amenity} className="rounded-full bg-[#F8F8F6] border border-[#E5E3DE] px-2.5 py-1 text-xs text-slate-600">{amenity}</span>)}</div>
            <div className="flex gap-2 mt-5 pt-4 border-t border-[#E5E3DE]"><button type="button" onClick={() => openEdit(item)} className="min-h-10 px-3 rounded-xl border border-[#B89C66] text-[#0F223A] font-semibold inline-flex items-center gap-2"><Pencil className="w-4 h-4" />Chỉnh sửa</button><button type="button" disabled={(item._count?.rooms || 0) > 0} onClick={async () => { if (!window.confirm(`Xóa khu trọ ${item.name}?`)) return; const response = await scopedFetch(`/api/landlord/buildings?code=${encodeURIComponent(item.code)}&landlordId=${encodeURIComponent(landlordId)}`, { method: 'DELETE' }); const result = await response.json(); setMessage(result.message || ''); if (response.ok) load(); }} className="min-h-10 px-3 rounded-xl border border-rose-200 text-rose-700 font-semibold inline-flex items-center gap-2 disabled:opacity-40" title={(item._count?.rooms || 0) > 0 ? 'Chỉ xóa được khu trọ chưa có phòng' : undefined}><Trash2 className="w-4 h-4" />Xóa</button></div>
          </article>
        ))}</div>
      )}

      {editorOpen && <div className="fixed inset-0 z-[70] bg-[#0F223A]/45 backdrop-blur-sm grid place-items-center p-4"><form onSubmit={async (event) => { event.preventDefault(); setSaving(true); setMessage(''); try { const response = await scopedFetch('/api/landlord/buildings', { method: editingCode ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingCode ? { code: editingCode, data: payload() } : payload()) }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || 'Không lưu được khu trọ.'); setEditorOpen(false); setMessage(result.message || 'Đã lưu khu trọ.'); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Không lưu được khu trọ.'); } finally { setSaving(false); } }} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white border border-[#E5E3DE] shadow-2xl p-6">
        <div className="flex items-start justify-between gap-3 mb-5"><div><h2 className="text-xl font-bold text-[#0F223A]">{editingCode ? 'Chỉnh sửa khu trọ' : 'Thêm khu trọ'}</h2><p className="text-sm text-slate-500 mt-1">Tọa độ phải nằm trong khu vực TP.HCM.</p></div><button type="button" onClick={() => setEditorOpen(false)} className="w-10 h-10 rounded-xl border border-[#E5E3DE] grid place-items-center"><X className="w-4 h-4" /></button></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{([
          ['Tên khu trọ', 'name', 'text'], ['Địa chỉ', 'address', 'text'], ['Quận / TP. Thủ Đức', 'district', 'text'], ['Loại phòng mặc định', 'roomType', 'text'], ['Vĩ độ', 'lat', 'number'], ['Kinh độ', 'lng', 'number'], ['Giá tham khảo', 'basePrice', 'number'], ['Diện tích mặc định (m²)', 'area', 'number'],
        ] as const).map(([label, key, type]) => <label key={key} className="block text-sm font-semibold text-[#0F223A]">{label}<input required type={type} step={type === 'number' ? 'any' : undefined} value={form[key]} onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))} className="mt-1.5 w-full min-h-11 rounded-xl border border-[#E5E3DE] px-3 outline-none focus:border-[#B89C66] focus:ring-2 focus:ring-[#B89C66]/25" /></label>)}</div>
        <label className="block mt-4 text-sm font-semibold text-[#0F223A]">Tiện ích (phân cách bằng dấu phẩy)<input value={form.amenities} onChange={(e) => setForm((current) => ({ ...current, amenities: e.target.value }))} className="mt-1.5 w-full min-h-11 rounded-xl border border-[#E5E3DE] px-3 outline-none focus:border-[#B89C66]" /></label>
        <label className="block mt-4 text-sm font-semibold text-[#0F223A]">Ảnh (mỗi URL một dòng)<textarea rows={3} value={form.images} onChange={(e) => setForm((current) => ({ ...current, images: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-[#E5E3DE] p-3 outline-none focus:border-[#B89C66]" /></label>
        {message && <p className="mt-4 text-sm text-rose-600">{message}</p>}<button type="submit" disabled={saving} className="mt-5 w-full min-h-11 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-bold shadow-sm shadow-[#B89C66]/25 disabled:opacity-60">{saving ? 'Đang lưu…' : 'Lưu khu trọ'}</button>
      </form></div>}
    </section>
  );
}
