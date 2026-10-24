'use client';

import React, { useState, useEffect } from 'react';
import { scopedFetch as fetch } from '@/lib/scoped-fetch';
import { HouseRule } from '@/lib/types';
import { DEFAULT_HOUSE_RULES, getCategoryBadge } from '@/lib/house-rules';
import {
  ShieldAlert,
  Flame,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Edit3,
  RotateCcw,
  Sparkles,
  Info,
  X,
  Check,
  FileText,
  Sliders,
  BellRing,
  Building2,
  Loader2,
} from 'lucide-react';

interface HouseRulesManagerProps {
  landlordId?: string;
  currentLandlordName?: string;
  initialRules?: HouseRule[];
  onToast: (text: string, type?: 'success' | 'error') => void;
  onRulesUpdate?: (rules: HouseRule[]) => void;
}

export default function HouseRulesManager({
  landlordId,
  currentLandlordName = 'Nguyễn Văn Hùng',
  initialRules,
  onToast,
  onRulesUpdate,
}: HouseRulesManagerProps) {
  const [rules, setRules] = useState<HouseRule[]>(() => {
    if (initialRules && initialRules.length > 0) return initialRules;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('elite_house_rules');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return DEFAULT_HOUSE_RULES;
  });

  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [editingRule, setEditingRule] = useState<HouseRule | null>(null);
  const [showPosterModal, setShowPosterModal] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Sync latest house rules from server on mount / landlordId change
  useEffect(() => {
    let cancelled = false;
    const loadFromServer = async () => {
      try {
        const qs = landlordId ? `&landlordId=${encodeURIComponent(landlordId)}` : '';
        const res = await fetch(`/api/landlords?type=rules${qs}`);
        const json = await res.json();
        if (!cancelled && res.ok && json.success && Array.isArray(json.data) && json.data.length > 0) {
          setRules(json.data);
          if (typeof window !== 'undefined') {
            localStorage.setItem('elite_house_rules', JSON.stringify(json.data));
          }
          onRulesUpdate?.(json.data);
        }
      } catch {
        // Keep current state if network request fails
      }
    };
    loadFromServer();
    return () => {
      cancelled = true;
    };
  }, [landlordId, onRulesUpdate]);

  React.useEffect(() => {
    if (!editingRule && !showPosterModal) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingRule) setEditingRule(null);
        else if (showPosterModal) setShowPosterModal(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [editingRule, showPosterModal]);

  const persistRulesToServer = async (newRules: HouseRule[], successMessage: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_HOUSE_RULES',
          landlordId,
          rules: newRules,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        onToast(json.message || 'Không thể lưu nội quy lên máy chủ.', 'error');
        return false;
      }

      const savedRules = Array.isArray(json.data) && json.data.length > 0 ? json.data : newRules;
      setRules(savedRules);
      if (typeof window !== 'undefined') {
        localStorage.setItem('elite_house_rules', JSON.stringify(savedRules));
      }
      onRulesUpdate?.(savedRules);
      onToast(successMessage, 'success');
      return true;
    } catch {
      onToast('Lỗi kết nối máy chủ khi lưu nội quy.', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRule = async (id: string) => {
    const target = rules.find((r) => r.id === id);
    if (!target || saving) return;

    if (target.mandatory && target.isActive) {
      if (!confirm('Điều khoản này thuộc diện bắt buộc theo quy định PCCC và an ninh trật tự. Bạn có chắc muốn tạm tắt không?')) {
        return;
      }
    }

    const updated = rules.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r));
    await persistRulesToServer(
      updated,
      `Đã ${target.isActive ? 'tạm tắt' : 'kích hoạt'} điều khoản: ${target.title}`
    );
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule || saving) return;

    const updated = rules.map((r) => (r.id === editingRule.id ? editingRule : r));
    const ok = await persistRulesToServer(updated, 'Đã cập nhật nội dung điều khoản thành công.');
    if (ok) {
      setEditingRule(null);
    }
  };

  const handleResetDefaults = async () => {
    if (saving) return;
    if (confirm('Bạn có chắc muốn khôi phục toàn bộ 10 điều nội quy về bản chuẩn Pháp lý & PCCC?')) {
      await persistRulesToServer(DEFAULT_HOUSE_RULES, 'Đã khôi phục bộ nội quy chuẩn thành công.');
    }
  };

  const filteredRules = rules.filter((r) => {
    if (filterCategory !== 'ALL' && r.category !== filterCategory) return false;
    return true;
  });

  const activeCount = rules.filter((r) => r.isActive).length;
  const pcccCount = rules.filter((r) => r.category === 'PCCC').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#0F223A] to-[#1A365D] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-[#B89C66]/30">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#B89C66]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B89C66]/20 border border-[#B89C66]/40 text-[#B89C66] text-xs font-bold uppercase tracking-wider mb-3">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Tiêu Chuẩn Pháp Lý Nhà Trọ &amp; PCCC Hiện Hành 2026</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Quy Chế Nội Quy Tòa Nhà &amp; Điều Khoản Hợp Đồng
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
              Bộ 10 quy định chuẩn hóa theo <strong>Luật Nhà ở 2023</strong>, <strong>Luật Cư trú 2020</strong> và <strong>Chỉ thị PCCC mới nhất của UBND TP.HCM</strong>.
              Các điều khoản được áp dụng tự động vào mọi Hợp đồng thuê điện tử và Biên bản bàn giao khi ký kết.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setShowPosterModal(true)}
              className="min-h-[42px] px-4 py-2.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#B89C66]/25 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Bảng Nội Quy Dán Tường (A4)</span>
            </button>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="min-h-[42px] px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
              title="Khôi phục nguyên bản 10 điều chuẩn"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Khôi Phục Mẫu Chuẩn</span>
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 text-xs">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Tổng điều khoản</span>
            <span className="text-xl font-black text-white mt-0.5 block">{rules.length} điều</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Đang áp dụng</span>
            <span className="text-xl font-black text-[#B89C66] mt-0.5 block">{activeCount} / {rules.length} điều</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Quy định PCCC bắt buộc</span>
            <span className="text-xl font-black text-rose-400 mt-0.5 block">{pcccCount} điều bắt buộc</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Thời hạn báo trả cọc</span>
            <span className="text-xl font-black text-[#E5D7B7] mt-0.5 block">30 ngày trước</span>
          </div>
        </div>
      </div>

      {/* CATEGORY FILTERS */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ALL', label: 'Tất Cả Điều Khoản' },
            { id: 'PCCC', label: 'PCCC & Điện Xe' },
            { id: 'SECURITY', label: 'An Ninh & Cư Trú' },
            { id: 'HYGIENE', label: 'Vệ Sinh Môi Trường' },
            { id: 'CIVILITY', label: 'Nếp Sống Yên Tĩnh' },
            { id: 'PETS', label: 'Thú Cưng' },
            { id: 'UTILITIES', label: 'Cơ Sở Vật Chất' },
            { id: 'CONTRACT', label: 'Pháp Lý & Hoàn Cọc' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterCategory === cat.id
                  ? 'bg-[#0F223A] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-[#E5E3DE] hover:bg-[#F8F8F6]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* RULES LIST */}
      <div className="grid grid-cols-1 gap-4">
        {filteredRules.map((rule) => {
          const badge = getCategoryBadge(rule.category);
          return (
            <div
              key={rule.id}
              className={`rounded-2xl border p-5 transition-all bg-white shadow-xs ${
                rule.isActive
                  ? 'border-[#E5E3DE] hover:border-[#B89C66]/50'
                  : 'border-[#E5E3DE] bg-slate-50/70 opacity-70'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-7 h-7 rounded-xl bg-[#0F223A] text-white font-black text-xs flex items-center justify-center">
                      {rule.order}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border ${badge.color}`}>
                      {badge.label}
                    </span>
                    {rule.mandatory && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-rose-600" />
                        <span>Bắt buộc theo Luật</span>
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${
                        rule.isActive
                          ? 'bg-[#FAF0DC] text-[#0F223A] border-[#B89C66]/50'
                          : 'bg-slate-200 text-slate-600 border-slate-300'
                      }`}
                    >
                      {rule.isActive ? 'Đang hiệu lực trong hợp đồng' : 'Tạm tắt'}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-[#0F223A] pt-1">
                    {rule.title}
                  </h3>

                  <p className="text-xs text-slate-700 leading-relaxed font-sans">
                    {rule.content}
                  </p>

                  {rule.penalty && (
                    <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Chế tài áp dụng khi vi phạm:</strong> {rule.penalty}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center sm:flex-col gap-2 shrink-0 border-t sm:border-t-0 sm:border-l sm:pl-4 pt-3 sm:pt-0 border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleToggleRule(rule.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer w-full text-center ${
                      rule.isActive
                        ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                        : 'bg-[#B89C66] text-[#0F223A] hover:bg-[#A38752]'
                    }`}
                  >
                    {rule.isActive ? 'Tạm Tắt' : 'Kích Hoạt'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingRule(rule)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Sửa</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL EDIT RULE */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#B89C66] text-[#0F223A] font-bold text-xs flex items-center justify-center">
                  #{editingRule.order}
                </span>
                <h3 className="font-bold text-sm text-[#0F223A]">Điều Chỉnh Điều Khoản Nội Quy</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs mt-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề điều khoản</label>
                <input
                  type="text"
                  required
                  value={editingRule.title}
                  onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung chi tiết điều khoản</label>
                <textarea
                  rows={5}
                  required
                  value={editingRule.content}
                  onChange={(e) => setEditingRule({ ...editingRule, content: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden leading-relaxed font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chế tài / Phạt khi vi phạm</label>
                <input
                  type="text"
                  value={editingRule.penalty || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, penalty: e.target.value })}
                  placeholder="Ví dụ: Phạt 500.000đ và đơn phương chấm dứt hợp đồng..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden font-medium text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0F223A] hover:bg-[#1A365D] text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRINT WALL POSTER */}
      {showPosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Bảng Nội Quy Nhà Trọ &amp; An Toàn PCCC Dán Tường (Khổ A4 Chuẩn)
              </span>
              <button
                type="button"
                onClick={() => setShowPosterModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Poster Content */}
            <div className="pt-4 text-slate-900 font-sans text-xs space-y-4">
              <div className="text-center pb-3 border-b-2 border-slate-900">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  HỆ THỐNG CĂN HỘ DỊCH VỤ &amp; NHÀ TRỌ CAO CẤP ELITE LIVING
                </h2>
                <h1 className="text-base font-black uppercase text-[#0F223A] mt-1 tracking-tight">
                  BẢNG NỘI QUY TÒA NHÀ &amp; AN TOÀN PHÒNG CHÁY CHỮA CHÁY
                </h1>
                <p className="text-[10px] text-slate-500 italic mt-0.5">
                  (Áp dụng toàn bộ cư dân, khách lưu trú và đối tác ra vào tòa nhà)
                </p>
              </div>

              <div className="space-y-3 divide-y divide-slate-100 text-[11px] leading-relaxed">
                {rules.filter((r) => r.isActive).map((rule) => (
                  <div key={rule.id} className="pt-2.5">
                    <p className="font-extrabold text-[#0F223A]">
                      Điều {rule.order}: {rule.title}
                    </p>
                    <p className="text-slate-700 mt-0.5 text-[10.5px]">{rule.content}</p>
                    {rule.penalty && (
                      <p className="text-[9.5px] text-rose-700 italic mt-0.5 font-medium">
                        &rarr; Xử lý: {rule.penalty}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-2 text-center text-[10.5px]">
                <div>
                  <p className="font-bold text-slate-700">ĐƯỜNG DÂY NÓNG CỨU HỎA / CÔNG AN</p>
                  <p className="text-rose-600 font-black text-sm mt-1">114 • 113</p>
                </div>
                <div>
                  <p className="font-bold text-slate-700">BAN QUẢN LÝ TÒA NHÀ</p>
                  <p className="text-[#0F223A] font-black text-sm mt-1">{currentLandlordName}</p>
                </div>
              </div>
            </div>

            {/* Print actions */}
            <div className="pt-5 mt-4 border-t border-slate-200 flex justify-end gap-2 print:hidden">
              <button
                type="button"
                onClick={() => setShowPosterModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-semibold cursor-pointer text-xs"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In Bản Nội Quy (A4)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
