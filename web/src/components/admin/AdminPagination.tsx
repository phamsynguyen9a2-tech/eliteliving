'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function useAdminPagination<T>(items: T[], filterKey: string, pageSize = 20) {
  const [selection, setSelection] = useState({ key: filterKey, page: 1 });
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(selection.key === filterKey ? selection.page : 1, totalPages);
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page, totalPages, total: items.length, pageSize,
    onPage: (next: number) => setSelection({ key: filterKey, page: Math.max(1, Math.min(next, totalPages)) }),
  };
}

export default function AdminPagination({ page, totalPages, total, pageSize, onPage }: {
  page: number; totalPages: number; total: number; pageSize: number; onPage: (page: number) => void;
}) {
  if (!total) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t border-[#E5E3DE] text-sm">
      <p role="status" className="text-slate-500">Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {total.toLocaleString('vi-VN')}</p>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Trang trước" className="w-11 h-11 grid place-items-center rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F8F8F6] disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
        <span className="px-2 font-semibold tabular-nums">{page} / {totalPages}</span>
        <button type="button" disabled={page === totalPages} onClick={() => onPage(page + 1)} aria-label="Trang sau" className="w-11 h-11 grid place-items-center rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F8F8F6] disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
