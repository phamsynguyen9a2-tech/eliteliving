'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface EliteSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  group?: string;
  icon?: React.ReactNode;
}

interface EliteSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: EliteSelectOption[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  variant?: 'light' | 'navy';
  size?: 'sm' | 'md';
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
  ariaLabel?: string;
}

export default function EliteSelect({
  value,
  onChange,
  options,
  placeholder = 'Chọn...',
  searchable = false,
  searchPlaceholder = 'Tìm nhanh...',
  variant = 'light',
  size = 'md',
  className = '',
  triggerClassName = '',
  panelClassName = '',
  ariaLabel,
}: EliteSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }

    if (searchable) {
      setTimeout(() => searchInputRef.current?.focus(), 40);
    }

    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, searchable]);

  const filteredOptions = query.trim()
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(query.toLowerCase()) ||
          (opt.sublabel && opt.sublabel.toLowerCase().includes(query.toLowerCase())) ||
          (opt.group && opt.group.toLowerCase().includes(query.toLowerCase()))
      )
    : options;

  // Group options if any have a group property
  const hasGroups = filteredOptions.some((o) => Boolean(o.group));
  const groupedEntries: { group: string | null; items: EliteSelectOption[] }[] = [];

  if (hasGroups) {
    const map = new Map<string, EliteSelectOption[]>();
    for (const opt of filteredOptions) {
      const g = opt.group || 'Khác';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(opt);
    }
    for (const [group, items] of map.entries()) {
      groupedEntries.push({ group, items });
    }
  } else {
    groupedEntries.push({ group: null, items: filteredOptions });
  }

  const isNavy = variant === 'navy';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        id={`elite-select-trigger-${uid}`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel || placeholder}
        onClick={() => setOpen((prev) => !prev)}
        className={`elite-dropdown-trigger w-full flex items-center justify-between gap-2 text-left cursor-pointer select-none rounded-xl transition-all ${
          size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2.5 text-xs sm:text-sm'
        } ${
          isNavy
            ? 'bg-[#142A45]/90 hover:bg-[#193354] text-white border border-[#B89C66]/35 focus:border-[#B89C66]'
            : 'bg-white hover:bg-[#FAF8F5] text-[#0F223A] border border-[#E5E3DE] focus:border-[#B89C66]'
        } ${triggerClassName}`}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.icon && (
            <span className="shrink-0 text-[#B89C66]">{selectedOption.icon}</span>
          )}
          <span className="truncate font-bold">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span
              className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                isNavy
                  ? 'bg-[#B89C66]/25 text-[#E5D7B7]'
                  : 'bg-[#FAF0DC] text-[#8C6D37]'
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
        </span>

        <ChevronDown
          className={`elite-dropdown-chevron w-4 h-4 shrink-0 ${
            isNavy ? 'text-[#B89C66]' : 'text-[#8C6D37]'
          }`}
        />
      </button>

      {/* Animated Dropdown Listbox Panel */}
      <div
        role="listbox"
        aria-labelledby={`elite-select-trigger-${uid}`}
        data-state={open ? 'open' : 'closed'}
        className={`elite-dropdown-panel absolute left-0 right-0 mt-2 z-50 overflow-hidden ${
          isNavy
            ? '!bg-[#0F223A] !border-[#B89C66]/40 !text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
            : '!bg-white !border-[#E5E3DE] !text-[#0F223A]'
        } ${panelClassName}`}
        style={{ transformOrigin: 'top center' }}
      >
        {searchable && (
          <div
            className={`p-2 border-b ${
              isNavy ? 'border-slate-800 bg-[#0B192C]' : 'border-[#E5E3DE] bg-[#FAF8F5]'
            }`}
          >
            <div
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${
                isNavy
                  ? 'bg-[#142A45] border-slate-700 focus-within:border-[#B89C66]'
                  : 'bg-white border-[#E5E3DE] focus-within:border-[#B89C66]'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-[#B89C66] shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className={`w-full text-xs font-medium outline-none bg-transparent ${
                  isNavy
                    ? 'text-white placeholder:text-slate-400'
                    : 'text-[#0F223A] placeholder:text-slate-400'
                }`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-slate-400 hover:text-[#B89C66] p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="max-h-72 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
          {filteredOptions.length === 0 ? (
            <div className="py-6 px-3 text-center text-xs text-slate-400">
              Không tìm thấy kết quả phù hợp
            </div>
          ) : (
            groupedEntries.map((entry, gIdx) => (
              <div key={entry.group || gIdx} className="space-y-0.5">
                {entry.group && (
                  <div
                    className={`px-2.5 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider ${
                      isNavy ? 'text-[#B89C66]' : 'text-[#8C6D37]'
                    }`}
                  >
                    {entry.group}
                  </div>
                )}
                {entry.items.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                        isSelected
                          ? isNavy
                            ? 'bg-[#B89C66] text-[#0F223A] font-extrabold shadow-xs'
                            : 'bg-[#FAF0DC] text-[#0F223A] font-extrabold'
                          : isNavy
                          ? 'text-slate-200 hover:bg-[#193354] hover:text-white font-medium'
                          : 'text-[#0F223A] hover:bg-[#FAF8F5] font-medium'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                          <span className="truncate">{opt.label}</span>
                        </div>
                        {opt.sublabel && (
                          <p
                            className={`text-[10px] truncate mt-0.5 ${
                              isSelected
                                ? isNavy
                                  ? 'text-[#0F223A]/80'
                                  : 'text-[#8C6D37]'
                                : 'text-slate-400'
                            }`}
                          >
                            {opt.sublabel}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {opt.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              isSelected
                                ? isNavy
                                  ? 'bg-[#0F223A]/15 text-[#0F223A]'
                                  : 'bg-[#B89C66]/25 text-[#8C6D37]'
                                : isNavy
                                ? 'bg-white/10 text-slate-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && (
                          <Check
                            className={`w-3.5 h-3.5 ${
                              isNavy ? 'text-[#0F223A]' : 'text-[#8C6D37]'
                            }`}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
