'use client';

import React, { useEffect, useState } from 'react';
import { Crosshair, Loader2, Save, SlidersHorizontal } from 'lucide-react';
import { scopedFetch as fetch } from '@/lib/scoped-fetch';

interface Profile {
  budget_max: number | null;
  preferred_district: string | null;
  preferred_amenities: string[];
  target_lat: number | null;
  target_lng: number | null;
  max_radius_km: number | null;
}

const HUIT = { label: 'Gần ĐH Công Thương TP.HCM (HUIT)', lat: 10.8066, lng: 106.6286 };
const CURRENT = '__current__';

/**
 * Hồ sơ nhu cầu cá nhân: ngân sách, khu vực / vị trí mong muốn, bán kính, tiện ích cần có.
 * Bộ gợi ý Top-K dùng hồ sơ này khi người thuê không chỉnh bộ lọc.
 */
export default function PreferenceProfileForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [districts, setDistricts] = useState<Array<{ district: string; lat: number; lng: number }>>([]);
  const [amenityOptions, setAmenityOptions] = useState<string[]>([]);
  const [budget, setBudget] = useState(4_500_000);
  const [radius, setRadius] = useState(5);
  const [place, setPlace] = useState<string>('HUIT');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>({ lat: HUIT.lat, lng: HUIT.lng });
  const [amenities, setAmenities] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/user/preferences', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'Không tải được hồ sơ nhu cầu.');
        const { profile, options } = json.data as { profile: Profile | null; options: { districts: typeof districts; amenities: string[] } };
        setDistricts(options.districts);
        setAmenityOptions(options.amenities);
        if (profile?.budget_max) {
          setBudget(profile.budget_max);
          setRadius(profile.max_radius_km || 5);
          setAmenities(profile.preferred_amenities || []);
          if (profile.target_lat && profile.target_lng) {
            setCoords({ lat: profile.target_lat, lng: profile.target_lng });
            const label = profile.preferred_district || '';
            if (label === HUIT.label) setPlace('HUIT');
            else if (options.districts.some((d) => d.district === label)) setPlace(label);
            else setPlace(CURRENT);
          }
        }
      } catch (err) {
        setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Không tải được hồ sơ nhu cầu.' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const choosePlace = (value: string) => {
    setPlace(value);
    if (value === 'HUIT') setCoords({ lat: HUIT.lat, lng: HUIT.lng });
    else if (value === CURRENT) locateMe();
    else {
      const d = districts.find((x) => x.district === value);
      if (d) setCoords({ lat: d.lat, lng: d.lng });
    }
  };

  function locateMe() {
    if (!navigator.geolocation) {
      setMessage({ tone: 'error', text: 'Trình duyệt không hỗ trợ định vị.' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPlace(CURRENT);
        setLocating(false);
      },
      () => {
        setMessage({ tone: 'error', text: 'Không lấy được vị trí. Hãy cho phép trình duyệt truy cập vị trí hoặc chọn khu vực.' });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const toggleAmenity = (name: string) =>
    setAmenities((cur) => (cur.includes(name) ? cur.filter((a) => a !== name) : cur.length >= 15 ? cur : [...cur, name]));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const label = place === 'HUIT' ? HUIT.label : place === CURRENT ? 'Vị trí đã chọn trên bản đồ' : place;
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget_max: budget,
          max_radius_km: radius,
          target_lat: coords?.lat ?? null,
          target_lng: coords?.lng ?? null,
          preferred_district: label,
          preferred_amenities: amenities,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Không lưu được hồ sơ nhu cầu.');
      setMessage({ tone: 'ok', text: json.message });
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Không lưu được hồ sơ nhu cầu.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-slate-300 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải hồ sơ nhu cầu…</div>;
  }

  return (
    <form onSubmit={save} className="bg-[#112338] border border-[#1E3A5B] rounded-[24px] p-5 sm:p-6 space-y-6 text-slate-100">
      <div>
        <h2 className="text-lg font-black text-white flex items-center gap-2"><SlidersHorizontal className="w-5 h-5 text-[#B89C66]" /> Hồ sơ nhu cầu thuê phòng</h2>
        <p className="text-xs text-slate-400 mt-1">Hệ thống dùng hồ sơ này để xếp hạng danh sách gợi ý Top-K cho bạn (kết hợp với lịch sử xem, lưu và đặt lịch).</p>
      </div>

      <div>
        <label htmlFor="pref-budget" className="block text-xs font-bold text-[#B89C66] mb-1">Ngân sách tối đa / tháng: {budget.toLocaleString('vi-VN')} đ</label>
        <input id="pref-budget" type="range" min={1_000_000} max={20_000_000} step={250_000} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full accent-[#B89C66]" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="pref-place" className="block text-xs font-bold text-[#B89C66] mb-1">Muốn ở gần</label>
          <select id="pref-place" value={place} onChange={(e) => choosePlace(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0A192F] border border-[#1E3A5B] text-sm text-white">
            <option value="HUIT">{HUIT.label}</option>
            <option value={CURRENT}>Vị trí hiện tại của tôi</option>
            {districts.map((d) => <option key={d.district} value={d.district}>{d.district}</option>)}
          </select>
          <button type="button" onClick={locateMe} disabled={locating}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#E5D7B7] hover:underline disabled:opacity-60">
            {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />} Lấy vị trí hiện tại
          </button>
          {coords && <p className="text-[11px] text-slate-500 mt-1">Tọa độ: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>}
        </div>
        <div>
          <label htmlFor="pref-radius" className="block text-xs font-bold text-[#B89C66] mb-1">Bán kính tìm: {radius.toFixed(1)} km</label>
          <input id="pref-radius" type="range" min={1} max={15} step={0.5} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full accent-[#B89C66]" />
        </div>
      </div>

      <fieldset>
        <legend className="text-xs font-bold text-[#B89C66] mb-2">Tiện ích cần có ({amenities.length}/15)</legend>
        <div className="flex flex-wrap gap-2">
          {amenityOptions.map((name) => {
            const on = amenities.includes(name);
            return (
              <button key={name} type="button" aria-pressed={on} onClick={() => toggleAmenity(name)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${on ? 'bg-[#B89C66] text-[#0F223A] border-[#B89C66]' : 'border-[#1E3A5B] text-slate-300 hover:border-[#B89C66]'}`}>
                {name}
              </button>
            );
          })}
        </div>
      </fieldset>

      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-sm rounded-xl p-3 border ${message.tone === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' : 'bg-[#B89C66]/10 border-[#B89C66]/30 text-[#E5D7B7]'}`}>
          {message.text}
        </p>
      )}

      <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-bold text-sm inline-flex items-center gap-2 disabled:opacity-60">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu hồ sơ nhu cầu
      </button>
    </form>
  );
}
