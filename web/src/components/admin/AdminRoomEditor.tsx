'use client';

import React, { useEffect, useState } from 'react';
import { scopedFetch as fetch } from '@/lib/scoped-fetch';
import AdminPanel from './AdminPanel';
import { CreateEditRoomDrawer, type RoomFormSubmitData } from '@/components/landlord/LandlordRoomModals';
import type { Room } from '@/lib/types';

export interface LandlordOption {
  id: string;
  name: string;
}

/**
 * Thêm / sửa phòng từ Web Admin, dùng lại form phòng của cổng chủ trọ.
 * Thêm mới: chọn chủ trọ phụ trách trước, sau đó nhập thông tin phòng (tin admin thêm được duyệt luôn).
 */
export default function AdminRoomEditor({
  request,
  landlords,
  buildings,
  onClose,
  onSaved,
}: {
  request: { mode: 'create' } | { mode: 'edit'; roomId: number } | null;
  landlords: LandlordOption[];
  buildings: Array<{ name: string; landlord_id: string; address: string; district: string }>;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [landlordId, setLandlordId] = useState('');
  const [stage, setStage] = useState<'pick' | 'form' | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setEditingRoom(null);
    if (!request) {
      setStage(null);
      return;
    }
    if (request.mode === 'create') {
      setLandlordId('');
      setStage('pick');
      return;
    }
    (async () => {
      const res = await fetch(`/api/rooms/${request.roomId}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || 'Không tải được thông tin phòng.');
        setStage('pick');
        return;
      }
      setEditingRoom(json.data);
      setLandlordId(json.data.landlord_id);
      setStage('form');
    })();
  }, [request]);

  const landlordBuildings = buildings.filter((b) => b.landlord_id === landlordId);

  const submit = async (data: RoomFormSubmitData): Promise<boolean> => {
    if (!request) return false;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/rooms', {
        method: request.mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.mode === 'create' ? { landlordId, roomData: data } : { roomId: request.roomId, roomData: data }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || 'Không lưu được phòng.');
        return false;
      }
      onSaved(json.message);
      return true;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AdminPanel open={stage === 'pick'} onClose={onClose} title={request?.mode === 'edit' ? 'Sửa phòng' : 'Thêm phòng'} subtitle="Chọn chủ trọ phụ trách phòng">
        <div className="space-y-4 text-sm">
          {error && <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800">{error}</p>}
          {request?.mode === 'create' && (
            <>
              <label htmlFor="admin-room-landlord" className="block font-bold text-slate-700">Chủ trọ phụ trách</label>
              <select id="admin-room-landlord" value={landlordId} onChange={(e) => setLandlordId(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl bg-white focus:border-[#B89C66] outline-hidden">
                <option value="">Chọn chủ trọ</option>
                {landlords.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <button type="button" disabled={!landlordId} onClick={() => setStage('form')}
                className="px-4 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-bold disabled:opacity-50">Tiếp tục nhập thông tin phòng</button>
            </>
          )}
        </div>
      </AdminPanel>
      <CreateEditRoomDrawer
        open={stage === 'form'}
        mode={request?.mode === 'edit' ? 'edit' : 'create'}
        editingRoom={editingRoom}
        existingBuildings={landlordBuildings.map((b) => b.name)}
        defaultAddress={landlordBuildings[0]?.address}
        defaultDistrict={landlordBuildings[0]?.district}
        defaultBuildingName={landlordBuildings[0]?.name}
        submitting={submitting}
        onClose={onClose}
        onSubmit={submit}
      />
      {stage === 'form' && error && (
        <div role="alert" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-xl bg-rose-600 text-white text-sm shadow-lg">{error}</div>
      )}
    </>
  );
}
