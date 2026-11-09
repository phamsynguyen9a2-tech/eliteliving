'use client';

/**
 * Chủ trọ: yêu cầu đổi phòng của khách (tab Hợp đồng). Duyệt = chốt chỉ số điện nước phòng cũ, chỉ số
 * ban đầu phòng mới, chi phí hư hỏng; máy chủ chuyển hợp đồng trong một transaction và tính chênh lệch.
 * Từ chối kèm lý do. Xác nhận đã thu / đã hoàn phần chênh lệch (thanh toán giả lập).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { scopedFetch } from '@/lib/scoped-fetch';
import { useRealtime } from '@/lib/use-realtime';
import { computeTransferSettlement, type RoomTransferView } from '@/lib/room-transfer';
import { FormField, SlideOverDrawer, StatusBadge } from './LandlordPrimitives';
import type { Tone } from './landlord-format';
import { formatDateVi, formatSigned, formatVnd, TransferSettlementTable } from '../RoomTransferParts';

interface ApprovalPreview {
  request: RoomTransferView;
  transfer_date: string;
  transfer_month: string;
  month_already_billed: boolean;
  previous_readings: { electric: number; water: number; source: string } | null;
  old_rates: { electricity_rate: number; water_rate: number };
  old_rent: number;
  old_deposit: number;
  new_rent: number;
  new_deposit: number;
  contract_status: string;
  contract_start_date?: string;
  contract_end_date: string;
  date_check: { ok: boolean; message?: string };
}

const STATUS_TONE: Record<string, Tone> = { PENDING: 'amber', APPROVED: 'gold', REJECTED: 'rose', CANCELLED: 'neutral' };
const INPUT =
  'w-full min-h-[44px] px-3 rounded-xl border border-[#E5E3DE] bg-white text-sm text-[#0F223A] focus:border-[#B89C66] focus:ring-2 focus:ring-[#B89C66]/25 outline-none';

const numberOrNull = (value: string) => {
  if (value.trim() === '') return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

export default function LandlordTransferRequests({
  landlordId,
  onChanged,
}: {
  /** Admin xem theo chủ trọ đang chọn; chủ trọ thì máy chủ tự lấy theo phiên đăng nhập */
  landlordId?: string;
  onChanged?: () => void;
}) {
  const [requests, setRequests] = useState<RoomTransferView[]>([]);
  const [setupMessage, setSetupMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Ngăn kéo duyệt
  const [approving, setApproving] = useState<RoomTransferView | null>(null);
  const [preview, setPreview] = useState<ApprovalPreview | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [form, setForm] = useState({ electricPrev: '', waterPrev: '', electricFinal: '', waterFinal: '', electricStart: '', waterStart: '', damage: '0' });
  const [submitting, setSubmitting] = useState(false);

  // Hộp từ chối
  const [rejecting, setRejecting] = useState<RoomTransferView | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    try {
      const query = landlordId ? `?landlordId=${encodeURIComponent(landlordId)}` : '';
      const res = await scopedFetch(`/api/contracts/transfer${query}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.setupRequired) {
        setSetupMessage(json.message);
        return;
      }
      if (res.ok && json.success && Array.isArray(json.data)) {
        setSetupMessage('');
        setRequests(json.data);
      }
    } catch {
      // giữ danh sách cũ khi mạng tạm lỗi
    }
  }, [landlordId]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useRealtime(['contract', 'notification'], () => load());

  const pending = requests.filter((r) => r.status === 'PENDING');
  const awaitingMoney = requests.filter(
    (r) => r.status === 'APPROVED' && (r.settlement_status === 'UNPAID' || r.settlement_status === 'PENDING_CONFIRMATION')
  );
  const history = requests.filter((r) => !pending.includes(r) && !awaitingMoney.includes(r));

  const openApprove = async (request: RoomTransferView) => {
    setApproving(request);
    setPreview(null);
    setPreviewError('');
    setForm({ electricPrev: '', waterPrev: '', electricFinal: '', waterFinal: '', electricStart: '', waterStart: '', damage: '0' });
    try {
      const res = await scopedFetch(`/api/contracts/transfer/${request.id}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Không tải được số liệu duyệt.');
      const data: ApprovalPreview = json.data;
      setPreview(data);
      setForm((f) => ({
        ...f,
        electricPrev: data.previous_readings ? String(data.previous_readings.electric) : '',
        waterPrev: data.previous_readings ? String(data.previous_readings.water) : '',
      }));
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Không tải được số liệu duyệt.');
    }
  };

  const parsed = useMemo(
    () => ({
      electricPrev: numberOrNull(form.electricPrev),
      waterPrev: numberOrNull(form.waterPrev),
      electricFinal: numberOrNull(form.electricFinal),
      waterFinal: numberOrNull(form.waterFinal),
      electricStart: numberOrNull(form.electricStart),
      waterStart: numberOrNull(form.waterStart),
      damage: numberOrNull(form.damage) ?? 0,
    }),
    [form]
  );

  const formErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    const need = (key: keyof typeof parsed, label: string) => {
      const v = parsed[key];
      if (v === null) errs[key] = `Nhập ${label}.`;
      else if (Number.isNaN(v)) errs[key] = `${label} phải là số không âm.`;
    };
    need('electricPrev', 'chỉ số điện kỳ trước');
    need('waterPrev', 'chỉ số nước kỳ trước');
    need('electricFinal', 'chỉ số điện chốt');
    need('waterFinal', 'chỉ số nước chốt');
    need('electricStart', 'chỉ số điện ban đầu');
    need('waterStart', 'chỉ số nước ban đầu');
    if (Number.isNaN(parsed.damage)) errs.damage = 'Chi phí hư hỏng phải là số không âm.';
    if (!errs.electricFinal && !errs.electricPrev && (parsed.electricFinal as number) < (parsed.electricPrev as number)) {
      errs.electricFinal = 'Chỉ số chốt phải ≥ chỉ số kỳ trước.';
    }
    if (!errs.waterFinal && !errs.waterPrev && (parsed.waterFinal as number) < (parsed.waterPrev as number)) {
      errs.waterFinal = 'Chỉ số chốt phải ≥ chỉ số kỳ trước.';
    }
    return errs;
  }, [parsed]);

  const liveSettlement = useMemo(() => {
    if (!preview || Object.keys(formErrors).length > 0) return null;
    try {
      return computeTransferSettlement({
        oldRent: preview.old_rent,
        newRent: preview.new_rent,
        oldDeposit: preview.old_deposit,
        newDeposit: preview.new_deposit,
        transferDate: preview.transfer_date,
        monthAlreadyBilled: preview.month_already_billed,
        contractStartDate: preview.contract_start_date,
        readings: {
          electricPrev: parsed.electricPrev as number,
          electricFinal: parsed.electricFinal as number,
          waterPrev: parsed.waterPrev as number,
          waterFinal: parsed.waterFinal as number,
        },
        rates: { electricityRate: preview.old_rates.electricity_rate, waterRate: preview.old_rates.water_rate },
        damageCost: parsed.damage,
      });
    } catch {
      return null;
    }
  }, [preview, parsed, formErrors]);

  const patch = async (request: RoomTransferView, body: Record<string, unknown>) => {
    const res = await scopedFetch(`/api/contracts/transfer/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Thao tác không thành công.');
    return json.message as string;
  };

  const submitApprove = async () => {
    if (!approving || !liveSettlement) return;
    setSubmitting(true);
    setPreviewError('');
    try {
      const message = await patch(approving, {
        action: 'APPROVE',
        oldElectricPrev: parsed.electricPrev,
        oldWaterPrev: parsed.waterPrev,
        oldElectricFinal: parsed.electricFinal,
        oldWaterFinal: parsed.waterFinal,
        newElectricStart: parsed.electricStart,
        newWaterStart: parsed.waterStart,
        damageCost: parsed.damage,
      });
      setApproving(null);
      setNotice({ tone: 'ok', text: message });
      await load();
      onChanged?.();
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Không duyệt được yêu cầu.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReject = async () => {
    if (!rejecting) return;
    setBusyId(rejecting.id);
    try {
      const message = await patch(rejecting, { action: 'REJECT', reason });
      setRejecting(null);
      setReason('');
      setNotice({ tone: 'ok', text: message });
      await load();
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'Không từ chối được yêu cầu.' });
    } finally {
      setBusyId(null);
    }
  };

  const confirmSettlement = async (request: RoomTransferView) => {
    setBusyId(request.id);
    try {
      const message = await patch(request, { action: 'CONFIRM_SETTLEMENT' });
      setNotice({ tone: 'ok', text: message });
      await load();
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'Không xác nhận được.' });
    } finally {
      setBusyId(null);
    }
  };

  if (setupMessage) {
    return (
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>Đổi phòng: {setupMessage}</span>
      </div>
    );
  }
  if (requests.length === 0) return null;

  const renderCard = (r: RoomTransferView) => {
    const s = r.settlement;
    return (
      <div key={r.id} className="p-4 rounded-2xl bg-white border border-[#E5E3DE] space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-bold text-[#0F223A]">
              {r.tenant_name} <span className="text-slate-500 font-medium">• {r.tenant_phone}</span>
            </p>
            <p className="text-sm text-slate-600">
              {r.from_room?.room_code || r.from_room_id} <span className="text-[#B89C66] font-bold">→</span>{' '}
              {r.to_room?.room_code || r.to_room_id} — {r.to_room?.title}
            </p>
          </div>
          <StatusBadge label={r.status_label} tone={STATUS_TONE[r.status] || 'neutral'} size="sm" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE]">
            <p className="text-slate-500">{r.transfer_date ? 'Ngày chuyển' : 'Khách muốn chuyển'}</p>
            <p className="font-bold text-[#0F223A]">{formatDateVi(r.transfer_date || r.desired_date)}</p>
          </div>
          <div className="p-2 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE]">
            <p className="text-slate-500">Hạn hợp đồng (giữ nguyên)</p>
            <p className="font-bold text-[#0F223A]">{formatDateVi(r.contract_end_date)}</p>
          </div>
          <div className="p-2 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE]">
            <p className="text-slate-500">Giá cũ → mới</p>
            <p className="font-bold text-[#0F223A]">
              {formatVnd(s?.old_rent ?? r.from_room?.price ?? 0)} → {formatVnd(s?.new_rent ?? r.to_room?.price ?? 0)}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE]">
            <p className="text-slate-500">Cọc phòng mới</p>
            <p className="font-bold text-[#0F223A]">{formatVnd(s?.new_deposit ?? r.to_room?.deposit ?? 0)}</p>
          </div>
        </div>
        {r.note && <p className="text-xs text-slate-600">Lời nhắn của khách: {r.note}</p>}
        {r.reject_reason && <p className="text-xs text-rose-700">Lý do từ chối: {r.reject_reason}</p>}
        {s && (
          <>
            <TransferSettlementTable settlement={s} viewer="LANDLORD" />
            <p className="text-xs text-slate-600">
              Thanh toán chênh lệch: <strong className="text-[#0F223A]">{r.settlement_status_label}</strong>
              {r.settlement_tx_code ? ` • Mã GD khách báo: ${r.settlement_tx_code}` : ''}
            </p>
          </>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {r.status === 'PENDING' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setRejecting(r);
                  setReason('');
                }}
                className="min-h-[40px] px-3.5 rounded-xl border border-[#E5E3DE] bg-white text-[#0F223A] text-sm font-semibold hover:bg-[#F8F8F6] cursor-pointer inline-flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4 text-rose-600" /> Từ chối
              </button>
              <button
                type="button"
                onClick={() => openApprove(r)}
                className="min-h-[40px] px-3.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-sm font-bold shadow-md shadow-[#B89C66]/25 cursor-pointer inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Duyệt &amp; bàn giao
              </button>
            </>
          )}
          {r.status === 'APPROVED' && (r.settlement_status === 'UNPAID' || r.settlement_status === 'PENDING_CONFIRMATION') && (
            <button
              type="button"
              disabled={busyId === r.id}
              onClick={() => confirmSettlement(r)}
              className="min-h-[40px] px-3.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-sm font-bold cursor-pointer disabled:opacity-60 inline-flex items-center gap-1.5"
            >
              {busyId === r.id && <Loader2 className="w-4 h-4 animate-spin" />}
              {(s?.totalDiff ?? 0) < 0 ? 'Đã hoàn chênh lệch cho khách' : 'Đã nhận tiền chênh lệch'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="p-4 sm:p-5 rounded-3xl bg-[#F8F8F6] border border-[#E5E3DE] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-[#0F223A] flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-[#B89C66]" />
          Yêu cầu đổi phòng
          {pending.length > 0 && <StatusBadge label={`${pending.length} chờ duyệt`} tone="amber" size="sm" />}
        </h3>
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-sm font-semibold text-[#A38752] hover:text-[#0F223A] cursor-pointer"
          >
            {showHistory ? 'Ẩn lịch sử' : `Xem lịch sử (${history.length})`}
          </button>
        )}
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl text-sm border ${
            notice.tone === 'ok' ? 'bg-[#B89C66]/10 border-[#B89C66]/40 text-[#0F223A]' : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {notice.text}
        </div>
      )}

      {pending.length === 0 && awaitingMoney.length === 0 && !showHistory && (
        <p className="text-sm text-slate-500">Không có yêu cầu đổi phòng nào cần xử lý.</p>
      )}
      <div className="space-y-3">
        {pending.map(renderCard)}
        {awaitingMoney.map(renderCard)}
        {showHistory && history.map(renderCard)}
      </div>

      {/* Ngăn kéo duyệt đổi phòng */}
      <SlideOverDrawer
        open={Boolean(approving)}
        onClose={() => !submitting && setApproving(null)}
        title="Duyệt đổi phòng & bàn giao"
        subtitle={
          approving
            ? `${approving.tenant_name}: ${approving.from_room?.room_code} → ${approving.to_room?.room_code}. Ngày chuyển là hôm nay (ngày bàn giao).`
            : undefined
        }
        widthClass="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setApproving(null)}
              disabled={submitting}
              className="min-h-[44px] px-4 rounded-xl border border-[#E5E3DE] bg-white text-[#0F223A] text-sm font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={submitApprove}
              disabled={submitting || !liveSettlement || (preview ? !preview.date_check.ok : true)}
              className="min-h-[44px] px-4 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-sm font-bold shadow-md shadow-[#B89C66]/25 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Xác nhận chuyển hợp đồng
            </button>
          </div>
        }
      >
        {previewError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{previewError}</div>
        )}
        {!preview && !previewError && (
          <div className="py-10 flex items-center justify-center gap-2 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải số liệu...
          </div>
        )}
        {preview && (
          <div className="space-y-5 text-sm">
            {!preview.date_check.ok && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">{preview.date_check.message}</div>
            )}
            <div className="p-3.5 rounded-2xl bg-[#F8F8F6] border border-[#E5E3DE] space-y-1 text-xs text-slate-600">
              <p>
                Hợp đồng nối tiếp: bắt đầu <strong className="text-[#0F223A]">{formatDateVi(preview.transfer_date)}</strong>, hết hạn{' '}
                <strong className="text-[#0F223A]">{formatDateVi(preview.contract_end_date)}</strong> (giữ nguyên).
              </p>
              <p>
                Giá thuê {formatVnd(preview.old_rent)} → <strong className="text-[#0F223A]">{formatVnd(preview.new_rent)}</strong>; tiền cọc{' '}
                {formatVnd(preview.old_deposit)} → <strong className="text-[#0F223A]">{formatVnd(preview.new_deposit)}</strong>.
              </p>
              <p>
                {preview.month_already_billed
                  ? `Phòng cũ đã có hóa đơn kỳ ${preview.transfer_month}: chỉ tính chênh lệch tiền thuê những ngày còn lại.`
                  : `Phòng cũ chưa có hóa đơn kỳ ${preview.transfer_month}: tiền thuê tháng này tính theo ngày ở mỗi phòng và gộp vào quyết toán.`}{' '}
                Kỳ hóa đơn đầu tiên của phòng mới là tháng sau.
              </p>
            </div>

            <fieldset className="space-y-3">
              <legend className="font-bold text-[#0F223A]">Phòng cũ {approving?.from_room?.room_code}: chốt điện nước</legend>
              <p className="text-xs text-slate-500">
                Chỉ số kỳ trước: {preview.previous_readings ? `lấy từ ${preview.previous_readings.source}` : 'chưa có dữ liệu, vui lòng nhập tay'}.
                Đơn giá {formatVnd(preview.old_rates.electricity_rate)}/kWh, {formatVnd(preview.old_rates.water_rate)}/m³.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Điện kỳ trước" unit="kWh" required error={formErrors.electricPrev}>
                  <input className={INPUT} inputMode="decimal" value={form.electricPrev} onChange={(e) => setForm({ ...form, electricPrev: e.target.value })} />
                </FormField>
                <FormField label="Điện chốt khi trả phòng" unit="kWh" required error={form.electricFinal ? formErrors.electricFinal : undefined}>
                  <input className={INPUT} inputMode="decimal" value={form.electricFinal} onChange={(e) => setForm({ ...form, electricFinal: e.target.value })} />
                </FormField>
                <FormField label="Nước kỳ trước" unit="m³" required error={formErrors.waterPrev}>
                  <input className={INPUT} inputMode="decimal" value={form.waterPrev} onChange={(e) => setForm({ ...form, waterPrev: e.target.value })} />
                </FormField>
                <FormField label="Nước chốt khi trả phòng" unit="m³" required error={form.waterFinal ? formErrors.waterFinal : undefined}>
                  <input className={INPUT} inputMode="decimal" value={form.waterFinal} onChange={(e) => setForm({ ...form, waterFinal: e.target.value })} />
                </FormField>
                <FormField label="Chi phí hư hỏng phòng cũ" unit="đ" hint="Để 0 nếu không có hư hỏng." error={formErrors.damage}>
                  <input className={INPUT} inputMode="numeric" value={form.damage} onChange={(e) => setForm({ ...form, damage: e.target.value })} />
                </FormField>
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="font-bold text-[#0F223A]">Phòng mới {approving?.to_room?.room_code}: chỉ số ban đầu</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Điện ban đầu" unit="kWh" required error={form.electricStart ? formErrors.electricStart : undefined}>
                  <input className={INPUT} inputMode="decimal" value={form.electricStart} onChange={(e) => setForm({ ...form, electricStart: e.target.value })} />
                </FormField>
                <FormField label="Nước ban đầu" unit="m³" required error={form.waterStart ? formErrors.waterStart : undefined}>
                  <input className={INPUT} inputMode="decimal" value={form.waterStart} onChange={(e) => setForm({ ...form, waterStart: e.target.value })} />
                </FormField>
              </div>
            </fieldset>

            {liveSettlement ? (
              <div className="space-y-2">
                <p className="font-bold text-[#0F223A]">Quyết toán chênh lệch</p>
                <TransferSettlementTable settlement={liveSettlement} viewer="LANDLORD" />
                <p className="text-xs text-slate-500">
                  Khi xác nhận: hợp đồng cũ được thanh lý, phòng cũ về Còn trống, phòng mới chuyển Đang thuê, lập hợp đồng nối tiếp và hai
                  biên bản bàn giao (khách ký sau). Tổng {formatSigned(liveSettlement.totalDiff)}.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Nhập đủ chỉ số để xem bảng quyết toán.</p>
            )}
          </div>
        )}
      </SlideOverDrawer>

      {/* Hộp từ chối */}
      <SlideOverDrawer
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title="Từ chối yêu cầu đổi phòng"
        subtitle={rejecting ? `${rejecting.tenant_name}: ${rejecting.from_room?.room_code} → ${rejecting.to_room?.room_code}` : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejecting(null)}
              className="min-h-[44px] px-4 rounded-xl border border-[#E5E3DE] bg-white text-[#0F223A] text-sm font-semibold cursor-pointer"
            >
              Quay lại
            </button>
            <button
              type="button"
              onClick={submitReject}
              disabled={reason.trim().length < 3 || busyId === rejecting?.id}
              className="min-h-[44px] px-4 rounded-xl bg-[#0F223A] hover:bg-[#1A3456] text-white text-sm font-bold cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {busyId === rejecting?.id && <Loader2 className="w-4 h-4 animate-spin" />}
              Từ chối và báo khách
            </button>
          </div>
        }
      >
        <FormField label="Lý do từ chối" required hint="Khách sẽ nhận được lý do này trong hộp thư.">
          <textarea
            className={`${INPUT} py-2 min-h-[96px]`}
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            placeholder="VD: Phòng này đã hẹn cho khách khác vào cuối tháng."
          />
        </FormField>
      </SlideOverDrawer>
    </section>
  );
}
