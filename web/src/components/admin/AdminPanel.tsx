'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

/** Native modal focus containment, Escape handling and focus restoration. */
export default function AdminPanel({ open, onClose, title, subtitle, children, side = 'right' }: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  side?: 'left' | 'right';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const panel = ref.current;
    if (!open || !panel) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    panel.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      panel.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);
  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-[#0F223A] backdrop:bg-[#0F223A]/45 backdrop:backdrop-blur-sm">
      {open && <div className={`flex h-full ${side === 'left' ? 'mr-auto max-w-xs' : 'ml-auto max-w-2xl'} w-full flex-col bg-white shadow-2xl`}>
        <div className="shrink-0 px-5 sm:px-6 py-4 bg-[#0F223A] text-white flex items-start justify-between gap-3">
          <div className="min-w-0"><h2 id={titleId} className="text-lg font-bold">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-300">{subtitle}</p>}</div>
          <button type="button" onClick={onClose} aria-label="Đóng cửa sổ" className="w-11 h-11 shrink-0 rounded-xl grid place-items-center hover:bg-white/10 text-slate-200"><X className="w-5 h-5" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-5 sm:p-6">{children}</div>
      </div>}
    </dialog>
  );
}
