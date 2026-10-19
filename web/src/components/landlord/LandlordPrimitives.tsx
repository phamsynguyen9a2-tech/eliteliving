'use client';

import React, { useEffect, useId, useRef } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  Loader2,
  RefreshCw,
   RotateCcw,
  SearchX,
  X,
} from 'lucide-react';
import type { Tone } from './landlord-format';

// ============================================================
// Status Badge (Always has text label + visual indicator, no green)
// ============================================================

const TONE_CLASSES: Record<Tone, { badge: string; dot: string }> = {
  gold: {
    badge: 'bg-[#FAF0DC] text-[#0F223A] border-[#B89C66]/55',
    dot: 'bg-[#B89C66]',
  },
  navy: {
    badge: 'bg-[#0F223A] text-white border-[#0F223A]',
    dot: 'bg-[#B89C66]',
  },
  amber: {
    badge: 'bg-amber-50 text-amber-950 border-amber-300/80',
    dot: 'bg-amber-600',
  },
  rose: {
    badge: 'bg-rose-50 text-rose-900 border-rose-200',
    dot: 'bg-rose-600',
  },
  neutral: {
    badge: 'bg-[#F3F2EE] text-slate-700 border-[#E5E3DE]',
    dot: 'bg-slate-400',
  },
  outline: {
    badge: 'bg-white text-[#0F223A] border-[#D6D2C8]',
    dot: 'bg-[#B89C66]',
  },
};

export function StatusBadge({
  label,
  tone = 'neutral',
  size = 'md',
  className = '',
}: {
  label: string;
  tone?: Tone;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const style = TONE_CLASSES[tone] || TONE_CLASSES.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap ${
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs sm:text-[13px]'
      } ${style.badge} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

// ============================================================
// Form Field with fixed label, unit badge, and inline error
// ============================================================

export function FormField({
  label,
  htmlFor,
  unit,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  unit?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="block text-sm font-semibold text-[#0F223A]"
        >
          {label}
          {required && <span className="text-rose-600 ml-0.5">*</span>}
        </label>
        {unit && (
          <span className="text-xs font-medium text-slate-500 bg-[#F8F8F6] px-2 py-0.5 rounded-md border border-[#E5E3DE]">
            Đơn vị: {unit}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-xs font-medium text-rose-700 flex items-center gap-1.5 pt-0.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500 leading-relaxed">{hint}</p>
      ) : null}
    </div>
  );
}

// ============================================================
// Accessible Slide-Over Drawer (Escape, focus restore, reduced-motion)
// ============================================================

export function SlideOverDrawer({
  open,
  onClose,
  title,
  subtitle,
  widthClass = 'max-w-xl',
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  widthClass?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const timer = window.setTimeout(() => {
      const firstInput = panelRef.current?.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
      );
      firstInput?.focus();
    }, 30);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#0F223A]/45 backdrop-blur-xs transition-opacity duration-200 motion-reduce:transition-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`relative w-full ${widthClass} bg-white h-full shadow-2xl border-l border-[#E5E3DE] flex flex-col animate-in slide-in-from-right duration-200 motion-reduce:animate-none`}
      >
        {/* Drawer Header */}
        <div className="px-5 sm:px-6 py-4 bg-[#0F223A] text-white flex items-start justify-between gap-4 border-b border-[#1E3A5B]">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base sm:text-lg font-bold text-white leading-snug">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="min-w-[44px] min-h-[44px] -mr-2 -mt-1 rounded-xl inline-flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          {children}
        </div>

        {/* Drawer Footer */}
        {footer && (
          <div className="px-5 sm:px-6 py-4 bg-[#F8F8F6] border-t border-[#E5E3DE]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Friendly Confirmation Dialog (explains target & consequence)
// ============================================================

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  targetLabel,
  consequence,
  confirmLabel = 'Xác nhận thực hiện',
  cancelLabel = 'Quay lại',
  tone = 'danger',
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  targetLabel: string;
  consequence: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning' | 'gold';
  loading?: boolean;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F223A]/45 backdrop-blur-xs animate-in fade-in duration-150 motion-reduce:animate-none"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E5E3DE] space-y-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              tone === 'danger'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id={titleId} className="text-base font-bold text-[#0F223A]">
              {title}
            </h3>
            <p className="text-sm font-semibold text-[#0F223A] mt-1 bg-[#F8F8F6] px-3 py-2 rounded-xl border border-[#E5E3DE]">
              Đối tượng: {targetLabel}
            </p>
            <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">
              {consequence}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-[#E5E3DE] flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F8F8F6] text-sm font-semibold text-[#0F223A] transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`min-h-[44px] px-5 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 ${
              tone === 'danger'
                ? 'bg-rose-700 hover:bg-rose-800 text-white shadow-sm'
                : 'bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] shadow-sm shadow-[#B89C66]/25'
            }`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? 'Đang xử lý...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Unified Section States: Skeleton, Empty, Filtered Empty, Error
// ============================================================

export function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải dữ liệu tổng quan">
      <div className="h-20 rounded-2xl bg-white border border-[#E5E3DE] p-5 animate-pulse">
        <div className="h-5 w-48 bg-[#E5E3DE]/70 rounded-md mb-2" />
        <div className="h-4 w-72 bg-[#E5E3DE]/50 rounded-md" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-white border border-[#E5E3DE] p-5 animate-pulse">
            <div className="h-4 w-28 bg-[#E5E3DE]/70 rounded-md mb-3" />
            <div className="h-7 w-24 bg-[#E5E3DE]/80 rounded-md mb-2" />
            <div className="h-3.5 w-36 bg-[#E5E3DE]/50 rounded-md" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 h-72 rounded-2xl bg-white border border-[#E5E3DE] p-6 animate-pulse" />
        <div className="lg:col-span-5 h-72 rounded-2xl bg-white border border-[#E5E3DE] p-6 animate-pulse" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E3DE] p-5 space-y-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="h-16 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE]/60 animate-pulse"
        />
      ))}
    </div>
  );
}

export function EmptyStateCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  isFilterEmpty = false,
  onClearFilter,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  isFilterEmpty?: boolean;
  onClearFilter?: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E3DE] p-8 sm:p-10 text-center max-w-lg mx-auto my-4">
      <div className="w-12 h-12 rounded-2xl bg-[#F8F8F6] border border-[#E5E3DE] text-[#8C6D37] flex items-center justify-center mx-auto mb-3.5">
        {isFilterEmpty ? <SearchX className="w-6 h-6" /> : icon || <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-bold text-[#0F223A]">{title}</h3>
      <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{description}</p>
      {isFilterEmpty && onClearFilter ? (
        <button
          type="button"
          onClick={onClearFilter}
          className="mt-4 min-h-[44px] px-4 py-2 rounded-xl bg-[#F8F8F6] hover:bg-[#EFECE6] text-[#0F223A] border border-[#E5E3DE] text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-[#B89C66]" />
          <span>Xóa bộ lọc để xem toàn bộ</span>
        </button>
      ) : actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-sm font-bold shadow-sm shadow-[#B89C66]/25 inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <span>{actionLabel}</span>
        </button>
      ) : null}
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
  retrying = false,
}: {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-rose-950">Không thể tải dữ liệu mới nhất</h3>
          <p className="text-sm text-rose-800 mt-0.5">{message}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="min-h-[44px] px-4 py-2 rounded-xl bg-white hover:bg-rose-100/60 text-rose-900 border border-rose-300 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
        <span>{retrying ? 'Đang thử lại...' : 'Thử lại ngay'}</span>
      </button>
    </div>
  );
}

export { CheckCircle2, Clock, Loader2 };
