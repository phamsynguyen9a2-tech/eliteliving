'use client';

/** Thành phần dùng chung của tính năng đổi phòng (khách và chủ trọ). */
import React from 'react';
import type { TransferSettlement } from '@/lib/room-transfer';
import { describeTransferDiff } from '@/lib/room-transfer';

export const formatVnd = (n: number) => `${Math.round(Math.abs(n)).toLocaleString('vi-VN')} đ`;
export const formatSigned = (n: number) => (n > 0 ? `+${formatVnd(n)}` : n < 0 ? `−${formatVnd(n)}` : '0 đ');
export const formatDateVi = (date: string | null | undefined) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date || ''));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
};

interface SettlementTableProps {
  settlement: Pick<
    TransferSettlement,
    | 'depositDiff'
    | 'rentDiff'
    | 'remainingDays'
    | 'daysInMonth'
    | 'monthAlreadyBilled'
    | 'utilityIncluded'
    | 'utilityCost'
    | 'damageCost'
    | 'totalDiff'
  > & { electricUsed?: number; waterUsed?: number };
  viewer: 'TENANT' | 'LANDLORD';
  tone?: 'light' | 'dark';
  /** Ước tính khi khách gửi yêu cầu (chưa có chỉ số điện nước) */
  estimate?: boolean;
}

/** Bảng chênh lệch: cọc, tiền thuê tháng chuyển, điện nước, hư hỏng, tổng (dương = khách trả thêm). */
export function TransferSettlementTable({ settlement: s, viewer, tone = 'light', estimate = false }: SettlementTableProps) {
  const dark = tone === 'dark';
  const rowLabel = dark ? 'text-slate-400' : 'text-slate-500';
  const rowValue = dark ? 'text-slate-100' : 'text-[#0F223A]';
  const rentLabel = s.monthAlreadyBilled
    ? `Chênh lệch tiền thuê ${s.remainingDays}/${s.daysInMonth} ngày còn lại của tháng`
    : `Tiền thuê tháng chuyển tính theo ngày (chưa lập hóa đơn tháng này)`;
  const rows: Array<[string, number, string?]> = [
    ['Chênh lệch tiền cọc', s.depositDiff],
    [rentLabel, s.rentDiff],
  ];
  if (s.utilityIncluded) {
    const usage =
      s.electricUsed !== undefined && s.waterUsed !== undefined
        ? `${Number(s.electricUsed.toFixed(2))} kWh, ${Number(s.waterUsed.toFixed(2))} m³`
        : undefined;
    rows.push(['Điện nước phòng cũ chưa lập hóa đơn', s.utilityCost, usage]);
  }
  if (s.damageCost) rows.push(['Chi phí hư hỏng phòng cũ', s.damageCost]);

  const total = s.totalDiff;
  const totalTone = total > 0 ? 'text-[#B89C66]' : total < 0 ? (dark ? 'text-[#E5D7B7]' : 'text-[#A38752]') : rowValue;

  return (
    <div
      className={`rounded-2xl border p-3.5 space-y-2 text-xs ${
        dark ? 'bg-[#0F223A] border-[#1E3A5B]/80' : 'bg-[#F8F8F6] border-[#E5E3DE]'
      }`}
    >
      {rows.map(([label, value, hint]) => (
        <div key={label} className="flex items-start justify-between gap-3">
          <span className={rowLabel}>
            {label}
            {hint && <span className="block text-[11px] opacity-80">{hint}</span>}
          </span>
          <span className={`font-bold whitespace-nowrap ${rowValue}`}>{formatSigned(value)}</span>
        </div>
      ))}
      {estimate && !s.utilityIncluded && (
        <p className={`text-[11px] ${rowLabel}`}>
          Tiền điện nước phòng cũ (từ kỳ hóa đơn trước tới ngày chuyển) được tính khi chủ trọ chốt chỉ số lúc bàn giao.
        </p>
      )}
      <div className={`pt-2 mt-1 border-t flex items-center justify-between gap-3 ${dark ? 'border-[#1E3A5B]' : 'border-[#E5E3DE]'}`}>
        <span className={`font-black uppercase text-[11px] ${rowValue}`}>{estimate ? 'Tổng ước tính' : 'Tổng chênh lệch'}</span>
        <span className={`font-black text-sm ${totalTone}`}>{formatSigned(total)}</span>
      </div>
      <p className={`text-[11px] font-semibold ${dark ? 'text-[#E5D7B7]' : 'text-[#A38752]'}`}>
        {describeTransferDiff(total, viewer)}
      </p>
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  APPROVED: 'bg-[#B89C66]/15 text-[#A38752] border-[#B89C66]/40',
  REJECTED: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  CANCELLED: 'bg-slate-500/10 text-slate-500 border-slate-400/30',
};

export function TransferStatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${STATUS_TONE[status] || STATUS_TONE.CANCELLED}`}>
      {label}
    </span>
  );
}
