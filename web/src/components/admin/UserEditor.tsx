'use client';

import React, { useEffect, useState } from 'react';
import { scopedFetch as fetch } from '@/lib/scoped-fetch';
import AdminPanel from './AdminPanel';

export interface EditableUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

/** Sửa thông tin / xóa tài khoản (tài khoản còn hợp đồng, lịch hẹn, phòng thì chỉ khóa được). */
export default function UserEditor({ user, onClose, onSaved }: { user: EditableUser | null; onClose: () => void; onSaved: (message: string, deleted?: boolean) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone);
    setConfirmDelete(false);
    setError(null);
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, name, email, phone }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Không lưu được tài khoản.');
      onSaved(json.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được tài khoản.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!user || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Không xóa được tài khoản.');
      onSaved(json.message, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xóa được tài khoản.');
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full px-3 py-2 border border-[#E5E3DE] rounded-xl bg-white focus:border-[#B89C66] outline-hidden';
  return (
    <AdminPanel open={Boolean(user)} onClose={onClose} title="Sửa tài khoản" subtitle={user ? `${user.role === 'LANDLORD' ? 'Chủ trọ' : user.role === 'ADMIN' ? 'Quản trị viên' : 'Người thuê'} · ${user.id}` : ''}>
      <form onSubmit={save} className="space-y-4 text-sm">
        {error && <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800">{error}</p>}
        <fieldset disabled={saving} className="space-y-4">
          <div><label htmlFor="u-name" className="block font-bold text-slate-700 mb-1">Họ và tên</label><input id="u-name" required className={input} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label htmlFor="u-email" className="block font-bold text-slate-700 mb-1">Email</label><input id="u-email" type="email" required className={input} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><label htmlFor="u-phone" className="block font-bold text-slate-700 mb-1">Số điện thoại</label><input id="u-phone" type="tel" className={input} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <p className="text-xs text-slate-500 mt-1">Đổi số điện thoại của người thuê thì người thuê phải xác minh lại số mới.</p></div>
        </fieldset>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-[#E5E3DE] font-semibold">Hủy</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-bold disabled:opacity-60">Lưu thay đổi</button>
        </div>
      </form>
      <div className="mt-8 pt-5 border-t border-rose-100 space-y-2 text-sm">
        <h3 className="font-bold text-rose-800">Xóa tài khoản</h3>
        <p className="text-slate-600">Chỉ xóa được tài khoản chưa có hợp đồng, lịch hẹn hoặc phòng. Tài khoản đã có dữ liệu nghiệp vụ hãy dùng chức năng Khóa.</p>
        {confirmDelete ? (
          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={remove} className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold disabled:opacity-60">Xác nhận xóa vĩnh viễn</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded-xl border border-[#E5E3DE] font-semibold">Thôi</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 font-bold hover:bg-rose-100">Xóa tài khoản…</button>
        )}
      </div>
    </AdminPanel>
  );
}
