'use client';

import React, { useEffect, useState } from 'react';
import { scopedFetch as fetch } from '@/lib/scoped-fetch';
import { useCatalog } from '@/lib/use-catalog';
import AdminPanel from './AdminPanel';
import type { LandlordOption } from './AdminRoomEditor';

export interface BuildingDraft {
  code?: string;
  name: string;
  address: string;
  district: string;
  lat: number | string;
  lng: number | string;
  landlordId: string;
  basePrice: number | string;
  roomType: string;
  area: number | string;
  amenities: string[];
  images: string;
}

const EMPTY: BuildingDraft = {
  name: '', address: '', district: 'Quận Tân Phú', lat: 10.8015, lng: 106.6295, landlordId: '',
  basePrice: 4000000, roomType: 'Phòng Studio', area: 25, amenities: [], images: '',
};

const DISTRICTS = ['Quận Tân Phú', 'Quận Tân Bình', 'Quận Bình Tân', 'Quận Gò Vấp', 'Quận Bình Thạnh', 'TP. Thủ Đức', 'Quận 1', 'Quận 3', 'Quận 6', 'Quận 7', 'Quận 8', 'Quận 10', 'Quận 12', 'Quận Phú Nhuận'];

/** Thêm / sửa khu trọ (tòa nhà) trên Web Admin. */
export default function BuildingEditor({
  initial,
  landlords,
  onClose,
  onSaved,
}: {
  initial: BuildingDraft | 'new' | null;
  landlords: LandlordOption[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const catalog = useCatalog();
  const [draft, setDraft] = useState<BuildingDraft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = initial !== null && initial !== 'new';

  useEffect(() => {
    setError(null);
    if (initial === 'new') setDraft({ ...EMPTY });
    else if (initial) setDraft(initial);
  }, [initial]);

  const set = <K extends keyof BuildingDraft>(key: K, value: BuildingDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/buildings', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          lat: Number(draft.lat),
          lng: Number(draft.lng),
          basePrice: Number(draft.basePrice),
          area: Number(draft.area),
          images: draft.images.split('\n').map((s) => s.trim()).filter(Boolean),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Không lưu được tòa nhà.');
      onSaved(json.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được tòa nhà.');
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full px-3 py-2 border border-[#E5E3DE] rounded-xl bg-white focus:border-[#B89C66] outline-hidden';
  return (
    <AdminPanel open={initial !== null} onClose={onClose} title={editing ? `Sửa tòa nhà ${draft.code}` : 'Thêm khu trọ / tòa nhà'} subtitle="Vị trí, chủ trọ phụ trách, đơn giá sàn và tiện ích chung">
      <form onSubmit={submit} className="space-y-4 text-sm">
        {error && <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800">{error}</p>}
        <fieldset disabled={saving} className="space-y-4">
          <div><label htmlFor="b-name" className="block font-bold text-slate-700 mb-1">Tên tòa nhà / khu trọ *</label><input id="b-name" required className={input} value={draft.name} onChange={(e) => set('name', e.target.value)} /></div>
          <div><label htmlFor="b-address" className="block font-bold text-slate-700 mb-1">Địa chỉ *</label><input id="b-address" required className={input} value={draft.address} onChange={(e) => set('address', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="b-district" className="block font-bold text-slate-700 mb-1">Quận *</label>
              <select id="b-district" className={input} value={draft.district} onChange={(e) => set('district', e.target.value)}>
                {Array.from(new Set([draft.district, ...DISTRICTS])).filter(Boolean).map((d) => <option key={d}>{d}</option>)}
              </select></div>
            <div><label htmlFor="b-landlord" className="block font-bold text-slate-700 mb-1">Chủ trọ phụ trách *</label>
              <select id="b-landlord" required className={input} value={draft.landlordId} onChange={(e) => set('landlordId', e.target.value)}>
                <option value="">Chọn chủ trọ</option>
                {landlords.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select></div>
            <div><label htmlFor="b-lat" className="block font-bold text-slate-700 mb-1">Vĩ độ (lat) *</label><input id="b-lat" required inputMode="decimal" className={input} value={draft.lat} onChange={(e) => set('lat', e.target.value)} /></div>
            <div><label htmlFor="b-lng" className="block font-bold text-slate-700 mb-1">Kinh độ (lng) *</label><input id="b-lng" required inputMode="decimal" className={input} value={draft.lng} onChange={(e) => set('lng', e.target.value)} /></div>
            <div><label htmlFor="b-price" className="block font-bold text-slate-700 mb-1">Đơn giá sàn (đ/tháng)</label><input id="b-price" inputMode="numeric" className={input} value={draft.basePrice} onChange={(e) => set('basePrice', e.target.value)} /></div>
            <div><label htmlFor="b-area" className="block font-bold text-slate-700 mb-1">Diện tích phổ biến (m²)</label><input id="b-area" inputMode="decimal" className={input} value={draft.area} onChange={(e) => set('area', e.target.value)} /></div>
          </div>
          <p className="text-xs text-slate-500">
            Mở <a className="text-[#8C6D37] font-semibold hover:underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${draft.lat},${draft.lng}`}>Google Maps</a> để kiểm tra tọa độ.
          </p>
          <div><label htmlFor="b-type" className="block font-bold text-slate-700 mb-1">Loại phòng chính</label><input id="b-type" className={input} value={draft.roomType} onChange={(e) => set('roomType', e.target.value)} /></div>
          <fieldset>
            <legend className="font-bold text-slate-700 mb-1">Tiện ích chung</legend>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set([...catalog.amenities, ...draft.amenities])).map((a) => {
                const on = draft.amenities.includes(a);
                return <button key={a} type="button" aria-pressed={on} onClick={() => set('amenities', on ? draft.amenities.filter((x) => x !== a) : [...draft.amenities, a])}
                  className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${on ? 'bg-[#FAF0DC] border-[#B89C66]' : 'border-[#E5E3DE]'}`}>{a}</button>;
              })}
            </div>
          </fieldset>
          <div><label htmlFor="b-images" className="block font-bold text-slate-700 mb-1">Ảnh tòa nhà (mỗi dòng một đường dẫn)</label><textarea id="b-images" rows={3} className={input} value={draft.images} onChange={(e) => set('images', e.target.value)} /></div>
        </fieldset>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-[#E5E3DE] font-semibold">Hủy</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-bold disabled:opacity-60">{saving ? 'Đang lưu…' : 'Lưu tòa nhà'}</button>
        </div>
      </form>
    </AdminPanel>
  );
}
