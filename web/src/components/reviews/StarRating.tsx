'use client';

import React from 'react';
import { Star } from 'lucide-react';

/** Hiển thị số sao; truyền onChange để thành ô chọn sao (bàn phím: mũi tên trái/phải). */
export default function StarRating({
  value,
  onChange,
  size = 16,
  label = 'Số sao',
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  label?: string;
}) {
  if (!onChange) {
    return (
      <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} trên 5 sao`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} width={size} height={size} className={n <= Math.round(value) ? 'fill-[#B89C66] text-[#B89C66]' : 'text-slate-300'} />
        ))}
      </span>
    );
  }
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex items-center gap-1"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(5, (value || 0) + 1)); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(1, (value || 2) - 1)); }
      }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} sao`}
          tabIndex={value === n || (!value && n === 1) ? 0 : -1}
          onClick={() => onChange(n)} className="p-1 rounded-md hover:bg-[#FAF0DC] cursor-pointer">
          <Star width={size} height={size} className={n <= value ? 'fill-[#B89C66] text-[#B89C66]' : 'text-slate-300'} />
        </button>
      ))}
    </div>
  );
}
