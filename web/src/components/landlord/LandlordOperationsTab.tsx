'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';
import type { Contract, Landlord, MaintenanceRequest, Room, UtilityBill } from '@/lib/types';
import { formatDate, formatShortVND, formatVND, type Tone } from './landlord-format';
import { EmptyStateCard, FormField, StatusBadge } from './LandlordPrimitives';

export type OperationsSubTab = 'revenue' | 'tenants' | 'maintenance' | 'security';

interface LandlordOperationsTabProps {
  rooms: Room[];
  contracts: Contract[];
  bills: UtilityBill[];
  maintenanceRequests: MaintenanceRequest[];
  currentLandlord: Landlord | null;
  initialSubTab?: OperationsSubTab;
  onCreateMaintenance: (payload: {
    room_id: number;
    tenant_name: string;
    tenant_phone: string;
    category: MaintenanceRequest['category'];
    priority: MaintenanceRequest['priority'];
    title: string;
    description: string;
    repair_cost: number;
  }) => Promise<boolean>;
  onUpdateMaintenance: (
    id: string,
    updates: {
      status?: MaintenanceRequest['status'];
      repair_cost?: number;
      resolution_note?: string;
    }
  ) => Promise<boolean>;
  onChangePassword: (payload: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<boolean>;
}

const CATEGORY_LABELS: Record<MaintenanceRequest['category'], string> = {
  ELECTRICAL: 'Hệ thống điện / Công tơ',
  PLUMBING: 'Ống nước / Thiết bị vệ sinh',
  AC_APPLIANCE: 'Máy lạnh / Tủ lạnh / Nội thất',
  DOOR_LOCK: 'Khóa vân tay / Cửa phòng',
  OTHER: 'Hạng mục khác',
};

const PRIORITY_LABELS: Record<
  MaintenanceRequest['priority'],
  { label: string; tone: Tone }
> = {
  LOW: { label: 'Thấp', tone: 'neutral' },
  MEDIUM: { label: 'Trung bình', tone: 'amber' },
  HIGH: { label: 'Khẩn cấp', tone: 'rose' },
};

const STATUS_LABELS: Record<
  MaintenanceRequest['status'],
  { label: string; tone: Tone }
> = {
  PENDING: { label: 'Chờ xử lý', tone: 'amber' },
  IN_PROGRESS: { label: 'Đang sửa chữa', tone: 'navy' },
  RESOLVED: { label: 'Đã hoàn tất', tone: 'gold' },
};

export default function LandlordOperationsTab({
  rooms,
  contracts,
  bills,
  maintenanceRequests,
  currentLandlord,
  initialSubTab = 'revenue',
  onCreateMaintenance,
  onUpdateMaintenance,
  onChangePassword,
}: LandlordOperationsTabProps) {
  const [subTab, setSubTab] = useState<OperationsSubTab>(initialSubTab);

  // Sub-tab 2: Active Tenants search
  const [tenantSearch, setTenantSearch] = useState('');

  // Sub-tab 3: Maintenance form state
  const [showNewMntForm, setShowNewMntForm] = useState(false);
  const [mntRoomId, setMntRoomId] = useState<number>(rooms[0]?.id || 0);
  const [mntCategory, setMntCategory] = useState<MaintenanceRequest['category']>('AC_APPLIANCE');
  const [mntPriority, setMntPriority] = useState<MaintenanceRequest['priority']>('MEDIUM');
  const [mntTitle, setMntTitle] = useState('');
  const [mntDesc, setMntDesc] = useState('');
  const [mntCost, setMntCost] = useState<number>(0);
  const [mntBusy, setMntBusy] = useState(false);
  const [updatingMntId, setUpdatingMntId] = useState<string | null>(null);

  // Sub-tab 4: Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);

  const roomById = useMemo(() => {
    const map = new Map<number, Room>();
    for (const r of rooms) map.set(r.id, r);
    return map;
  }, [rooms]);

  // ============================================================
  // 1. MONTHLY REVENUE AGGREGATION
  // ============================================================
  const monthlyRevenueRows = useMemo(() => {
    const byMonth = new Map<
      string,
      {
        month: string;
        billCount: number;
        paidCount: number;
        unpaidCount: number;
        rentTotal: number;
        electricTotal: number;
        waterTotal: number;
        serviceTotal: number;
        totalBilled: number;
        paidAmount: number;
        unpaidAmount: number;
      }
    >();

    for (const b of bills) {
      const m = b.month || 'N/A';
      const cur = byMonth.get(m) || {
        month: m,
        billCount: 0,
        paidCount: 0,
        unpaidCount: 0,
        rentTotal: 0,
        electricTotal: 0,
        waterTotal: 0,
        serviceTotal: 0,
        totalBilled: 0,
        paidAmount: 0,
        unpaidAmount: 0,
      };
      cur.billCount += 1;
      cur.rentTotal += Number(b.rent_cost) || 0;
      cur.electricTotal += Number(b.electric_cost) || 0;
      cur.waterTotal += Number(b.water_cost) || 0;
      cur.serviceTotal += (Number(b.internet_cost) || 0) + (Number(b.service_cost) || 0);
      const amt = Number(b.total_amount) || 0;
      cur.totalBilled += amt;
      if (b.status === 'PAID') {
        cur.paidCount += 1;
        cur.paidAmount += amt;
      } else {
        cur.unpaidCount += 1;
        cur.unpaidAmount += amt;
      }
      byMonth.set(m, cur);
    }

    return Array.from(byMonth.values()).sort((a, b) => {
      const [ma, ya] = a.month.split('/').map(Number);
      const [mb, yb] = b.month.split('/').map(Number);
      if (ya !== yb) return (yb || 0) - (ya || 0);
      return (mb || 0) - (ma || 0);
    });
  }, [bills]);

  const totalPaidAllMonths = monthlyRevenueRows.reduce((s, r) => s + r.paidAmount, 0);
  const totalUnpaidAllMonths = monthlyRevenueRows.reduce((s, r) => s + r.unpaidAmount, 0);
  const totalRepairCosts = maintenanceRequests.reduce(
    (s, m) => s + (Number(m.repair_cost) || 0),
    0
  );
  const maxMonthBilled = Math.max(
    1,
    ...monthlyRevenueRows.map((r) => r.totalBilled)
  );

  // ============================================================
  // 2. ACTIVE TENANTS DIRECTORY
  // ============================================================
  const activeTenants = useMemo(() => {
    const activeContracts = contracts.filter((c) => c.status === 'ACTIVE');
    const q = tenantSearch.trim().toLowerCase();
    return activeContracts.filter((c) => {
      if (!q) return true;
      const room = roomById.get(c.room_id);
      return (
        c.tenant_name.toLowerCase().includes(q) ||
        c.tenant_phone.toLowerCase().includes(q) ||
        (c.tenant_citizen_id || '').toLowerCase().includes(q) ||
        (c.tenant_address || '').toLowerCase().includes(q) ||
        (room?.room_code || '').toLowerCase().includes(q)
      );
    });
  }, [contracts, tenantSearch, roomById]);

  const handleSubmitMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mntTitle.trim()) return;
    setMntBusy(true);
    try {
      const targetRoomId = mntRoomId || rooms[0]?.id || 0;
      const activeContract = contracts.find(
        (c) => c.room_id === targetRoomId && c.status === 'ACTIVE'
      );
      const ok = await onCreateMaintenance({
        room_id: targetRoomId,
        tenant_name: activeContract?.tenant_name || 'Chủ trọ ghi nhận',
        tenant_phone: activeContract?.tenant_phone || currentLandlord?.phone || '',
        category: mntCategory,
        priority: mntPriority,
        title: mntTitle.trim(),
        description: mntDesc.trim(),
        repair_cost: Math.max(0, Number(mntCost) || 0),
      });
      if (ok) {
        setMntTitle('');
        setMntDesc('');
        setMntCost(0);
        setShowNewMntForm(false);
      }
    } finally {
      setMntBusy(false);
    }
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    if (newPassword.length < 6) {
      setPwdError('Mật khẩu mới cần có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setPwdBusy(true);
    try {
      const ok = await onChangePassword({
        currentPassword,
        newPassword,
      });
      if (ok) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setPwdBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation tabs */}
      <div className="bg-white rounded-2xl border border-[#E5E3DE] p-2 shadow-2xs flex flex-wrap gap-2">
        {[
          {
            key: 'revenue' as const,
            label: 'Báo cáo doanh thu tháng',
            icon: <BarChart3 className="w-4 h-4" />,
            badge: `${monthlyRevenueRows.length} kỳ`,
          },
          {
            key: 'tenants' as const,
            label: 'Danh sách khách đang ở',
            icon: <Users className="w-4 h-4" />,
            badge: `${ contracts.filter((c) => c.status === 'ACTIVE').length } khách`,
          },
          {
            key: 'maintenance' as const,
            label: 'Yêu cầu sửa chữa & Bảo trì',
            icon: <Wrench className="w-4 h-4" />,
            badge: `${maintenanceRequests.filter((m) => m.status !== 'RESOLVED').length} chờ`,
          },
          {
            key: 'security' as const,
            label: 'Đổi mật khẩu Chủ trọ',
            icon: <Lock className="w-4 h-4" />,
          },
        ].map((item) => {
          const active = subTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSubTab(item.key)}
              className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                active
                  ? 'bg-[#0F223A] text-[#B89C66] shadow-2xs'
                  : 'bg-[#F8F8F6] text-slate-700 hover:bg-[#EFECE6]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    active ? 'bg-[#B89C66] text-[#0F223A]' : 'bg-white text-slate-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* SUB-TAB 1: BÁO CÁO DOANH THU THEO THÁNG                       */}
      {/* ============================================================ */}
      {subTab === 'revenue' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E3DE]">
              <span className="text-xs font-semibold text-slate-500 block">
                Tổng doanh thu đã thực thu
              </span>
              <p className="text-xl sm:text-2xl font-extrabold text-[#0F223A] mt-1">
                {formatShortVND(totalPaidAllMonths)}
              </p>
              <span className="text-xs text-slate-500 mt-1 block">
                {bills.filter((b) => b.status === 'PAID').length} hóa đơn đã thu
              </span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E3DE]">
              <span className="text-xs font-semibold text-slate-500 block">
                Công nợ chưa thanh toán
              </span>
              <p className="text-xl sm:text-2xl font-extrabold text-rose-700 mt-1">
                {formatShortVND(totalUnpaidAllMonths)}
              </p>
              <span className="text-xs text-slate-500 mt-1 block">
                {bills.filter((b) => b.status === 'UNPAID').length} hóa đơn chờ thu
              </span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E3DE]">
              <span className="text-xs font-semibold text-slate-500 block">
                Chi phí bảo trì &amp; sửa chữa
              </span>
              <p className="text-xl sm:text-2xl font-extrabold text-amber-800 mt-1">
                {formatShortVND(totalRepairCosts)}
              </p>
              <span className="text-xs text-slate-500 mt-1 block">
                {maintenanceRequests.length} phiếu bảo trì ghi nhận
              </span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#0F223A] text-white border border-[#0F223A]">
              <span className="text-xs font-semibold text-[#E5D7B7] block">
                Doanh thu ròng thực nhận
              </span>
              <p className="text-xl sm:text-2xl font-extrabold text-[#B89C66] mt-1">
                {formatShortVND(Math.max(0, totalPaidAllMonths - totalRepairCosts))}
              </p>
              <span className="text-xs text-slate-300 mt-1 block">
                Sau khi khấu trừ chi phí sửa chữa
              </span>
            </div>
          </div>

          {monthlyRevenueRows.length === 0 ? (
            <EmptyStateCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Chưa có dữ liệu doanh thu theo tháng"
              description="Khi chủ trọ lập hóa đơn điện nước và xác nhận thu tiền, bảng tổng hợp doanh thu theo từng kỳ tháng sẽ hiển thị tại đây."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E3DE] p-5 space-y-5">
              <div>
                <h3 className="text-base font-extrabold text-[#0F223A]">
                  Biểu đồ &amp; Bảng đối soát doanh thu theo kỳ tháng
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tổng hợp từ dữ liệu hóa đơn thực tế trên PostgreSQL (Tiền phòng, Điện, Nước, Dịch vụ).
                </p>
              </div>

              {/* Visual Bar Breakdown */}
              <div className="space-y-3">
                {monthlyRevenueRows.map((row) => {
                  const paidPct = Math.round((row.paidAmount / maxMonthBilled) * 100);
                  const unpaidPct = Math.round((row.unpaidAmount / maxMonthBilled) * 100);
                  return (
                    <div
                      key={row.month}
                      className="p-3.5 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE] space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                        <span className="font-extrabold text-[#0F223A]">
                          Kỳ Tháng {row.month} ({row.billCount} phiếu thu)
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="text-[#0F223A] font-bold">
                            Đã thu: <strong>{formatVND(row.paidAmount)}</strong>
                          </span>
                          <span className="text-rose-700 font-bold">
                            Chưa thu: <strong>{formatVND(row.unpaidAmount)}</strong>
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-3 rounded-full bg-[#E5E3DE] overflow-hidden flex">
                        <div
                          style={{ width: `${Math.min(100, paidPct)}%` }}
                          className="h-full bg-[#B89C66]"
                          title={`Đã thu: ${formatVND(row.paidAmount)}`}
                        />
                        <div
                          style={{ width: `${Math.min(100 - paidPct, unpaidPct)}%` }}
                          className="h-full bg-rose-500"
                          title={`Chưa thu: ${formatVND(row.unpaidAmount)}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detailed Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E3DE] text-slate-500">
                      <th className="py-3 px-3 font-bold">Kỳ tháng</th>
                      <th className="py-3 px-3 font-bold">Số hóa đơn</th>
                      <th className="py-3 px-3 font-bold">Tiền phòng</th>
                      <th className="py-3 px-3 font-bold">Tiền điện &amp; nước</th>
                      <th className="py-3 px-3 font-bold">Phí dịch vụ</th>
                      <th className="py-3 px-3 font-bold">Đã thực thu</th>
                      <th className="py-3 px-3 font-bold">Công nợ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1EFEA]">
                    {monthlyRevenueRows.map((row) => (
                      <tr key={row.month} className="hover:bg-[#F8F8F6]">
                        <td className="py-3 px-3 font-extrabold text-[#0F223A]">
                          Tháng {row.month}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {row.paidCount}/{row.billCount} đã thu
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#0F223A]">
                          {formatVND(row.rentTotal)}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {formatVND(row.electricTotal + row.waterTotal)}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {formatVND(row.serviceTotal)}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-[#0F223A]">
                          {formatVND(row.paidAmount)}
                        </td>
                        <td className="py-3 px-3 font-bold text-rose-700">
                          {formatVND(row.unpaidAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* SUB-TAB 2: DANH SÁCH KHÁCH ĐANG Ở                             */}
      {/* ============================================================ */}
      {subTab === 'tenants' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5E3DE] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-[#0F223A]">
                Danh bạ cư dân &amp; khách thuê đang lưu trú ({activeTenants.length})
              </h3>
              <p className="text-xs text-slate-500">
                Thông tin trích xuất trực tiếp từ Hợp đồng đang hiệu lực (Họ tên, SĐT, CCCD, Địa chỉ thường trú, Số xe).
              </p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
                placeholder="Tìm tên khách, SĐT, CCCD, mã phòng..."
                className="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-xl border border-[#E5E3DE] bg-[#F8F8F6] focus:bg-white focus:border-[#B89C66] text-xs sm:text-sm text-[#0F223A] outline-hidden"
              />
            </div>
          </div>

          {activeTenants.length === 0 ? (
            <EmptyStateCard
              icon={<Users className="w-6 h-6" />}
              title="Chưa có khách thuê đang lưu trú"
              description="Khi chủ trọ lập hợp đồng hoặc hoàn tất check-in nhận phòng, thông tin cư dân sẽ hiển thị tại đây."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTenants.map((contract) => {
                const room = roomById.get(contract.room_id);
                const unpaidRoomBills = bills.filter(
                  (b) => b.room_id === contract.room_id && b.status === 'UNPAID'
                );
                return (
                  <article
                    key={contract.id}
                    className="bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-5 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-[#0F223A] text-[#B89C66]">
                          Phòng {room?.room_code || `#${contract.room_id}`}
                        </span>
                        <h4 className="text-base font-extrabold text-[#0F223A] mt-2">
                          {contract.tenant_name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {room?.project_name || contract.room_title}
                        </p>
                      </div>
                      <StatusBadge
                        label={
                          unpaidRoomBills.length > 0
                            ? `Nợ ${unpaidRoomBills.length} kỳ`
                            : 'Đã đóng đủ'
                        }
                        tone={unpaidRoomBills.length > 0 ? 'rose' : 'gold'}
                        size="sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE] text-xs">
                      <div>
                        <span className="text-slate-500 block">Số điện thoại:</span>
                        <a
                          href={`tel:${contract.tenant_phone}`}
                          className="font-bold text-[#0F223A] hover:underline inline-flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-[#8C6D37]" />
                          <span>{contract.tenant_phone}</span>
                        </a>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Số CCCD/CMND:</span>
                        <strong className="text-[#0F223A]">
                          {contract.tenant_citizen_id || 'Chưa cập nhật'}
                        </strong>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-500 block">Địa chỉ thường trú:</span>
                        <strong className="text-[#0F223A]">
                          {contract.tenant_address || 'Chưa cập nhật'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Số xe đăng ký:</span>
                        <strong className="text-[#0F223A]">
                          {contract.vehicle_count ?? 0} xe máy
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Giá thuê / Tiền cọc:</span>
                        <strong className="text-[#0F223A]">
                          {formatVND(contract.monthly_rent)}
                        </strong>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#8C6D37]" />
                        <span>
                          Hợp đồng: <strong>{formatDate(contract.start_date)}</strong> &rarr;{' '}
                          <strong>{formatDate(contract.end_date)}</strong>
                        </span>
                      </span>
                      <span className="font-semibold text-[#8C6D37]">
                        {contract.tenant_signed ? 'Đã ký điện tử' : 'Chờ khách ký'}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* SUB-TAB 3: YÊU CẦU SỬA CHỮA & BẢO TRÌ                        */}
      {/* ============================================================ */}
      {subTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-[#0F223A]">
                Quản lý Yêu cầu sửa chữa &amp; Bảo trì kỹ thuật
              </h3>
              <p className="text-xs text-slate-500">
                Ghi nhận sự cố điện, nước, máy lạnh, khóa vân tay và theo dõi chi phí sửa chữa thực tế.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewMntForm((prev) => !prev)}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{showNewMntForm ? 'Đóng biểu mẫu' : 'Tạo phiếu sửa chữa'}</span>
            </button>
          </div>

          {showNewMntForm && (
            <form
              onSubmit={handleSubmitMaintenance}
              className="bg-white rounded-2xl border border-[#B89C66] p-5 space-y-4 shadow-sm"
            >
              <h4 className="text-sm font-extrabold text-[#0F223A]">
                Ghi nhận yêu cầu sửa chữa / bảo trì phòng
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Chọn phòng" required>
                  <select
                    value={mntRoomId}
                    onChange={(e) => setMntRoomId(Number(e.target.value))}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-[#E5E3DE] bg-white text-sm font-semibold text-[#0F223A]"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Phòng {r.room_code} — {r.title}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Hạng mục kỹ thuật">
                  <select
                    value={mntCategory}
                    onChange={(e) =>
                      setMntCategory(e.target.value as MaintenanceRequest['category'])
                    }
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-[#E5E3DE] bg-white text-sm font-semibold text-[#0F223A]"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Mức độ ưu tiên">
                  <select
                    value={mntPriority}
                    onChange={(e) =>
                      setMntPriority(e.target.value as MaintenanceRequest['priority'])
                    }
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-[#E5E3DE] bg-white text-sm font-semibold text-[#0F223A]"
                  >
                    <option value="LOW">Thấp</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HIGH">Khẩn cấp</option>
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <FormField label="Tiêu đề sự cố cần sửa" required>
                    <input
                      type="text"
                      required
                      value={mntTitle}
                      onChange={(e) => setMntTitle(e.target.value)}
                      placeholder="Ví dụ: Vệ sinh & nạp gas máy lạnh Panasonic 1.5HP"
                      className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-[#E5E3DE] bg-white text-sm text-[#0F223A]"
                    />
                  </FormField>
                </div>

                <FormField label="Chi phí dự kiến (đ)">
                  <input
                    type="number"
                    min={0}
                    step={50000}
                    value={mntCost}
                    onChange={(e) => setMntCost(Number(e.target.value))}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-[#E5E3DE] bg-white text-sm font-bold text-[#0F223A]"
                  />
                </FormField>
              </div>

              <FormField label="Mô tả chi tiết tình trạng">
                <textarea
                  rows={2}
                  value={mntDesc}
                  onChange={(e) => setMntDesc(e.target.value)}
                  placeholder="Ghi chú hiện trạng thiết bị, thời gian kỹ thuật viên vào kiểm tra..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E5E3DE] bg-white text-sm text-[#0F223A]"
                />
              </FormField>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewMntForm(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5E3DE] bg-white text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={mntBusy}
                  className="px-5 py-2 rounded-xl bg-[#0F223A] text-[#B89C66] text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {mntBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Lưu phiếu sửa chữa</span>
                </button>
              </div>
            </form>
          )}

          {maintenanceRequests.length === 0 ? (
            <EmptyStateCard
              icon={<Wrench className="w-6 h-6" />}
              title="Chưa có yêu cầu sửa chữa nào"
              description="Bấm Tạo phiếu sửa chữa để ghi nhận yêu cầu bảo trì điện, nước, điều hòa hoặc khóa cửa của các phòng."
              actionLabel="Tạo phiếu sửa chữa đầu tiên"
              onAction={() => setShowNewMntForm(true)}
            />
          ) : (
            <div className="space-y-3">
              {maintenanceRequests.map((item) => {
                const pMeta = PRIORITY_LABELS[item.priority] || PRIORITY_LABELS.MEDIUM;
                const sMeta = STATUS_LABELS[item.status] || STATUS_LABELS.PENDING;
                const isUpdating = updatingMntId === item.id;

                return (
                  <article
                    key={item.id}
                    className="bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-[#0F223A] text-[#B89C66]">
                          Phòng {item.room_code}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#F8F8F6] text-slate-700 border border-[#E5E3DE]">
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                        <StatusBadge label={`Ưu tiên: ${pMeta.label}`} tone={pMeta.tone} size="sm" />
                        <StatusBadge label={sMeta.label} tone={sMeta.tone} size="sm" />
                      </div>
                      <h4 className="text-sm sm:text-base font-extrabold text-[#0F223A]">
                        {item.title}
                      </h4>
                      {item.description && (
                        <p className="text-xs sm:text-sm text-slate-600">{item.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                        <span>
                          Người báo: <strong className="text-[#0F223A]">{item.tenant_name}</strong>
                        </span>
                        <span>Ngày tạo: {formatDate(item.created_at.slice(0, 10))}</span>
                        <span>
                          Chi phí sửa chữa:{' '}
                          <strong className="text-[#0F223A]">
                            {formatVND(item.repair_cost || 0)}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {item.status === 'PENDING' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={async () => {
                            setUpdatingMntId(item.id);
                            await onUpdateMaintenance(item.id, { status: 'IN_PROGRESS' });
                            setUpdatingMntId(null);
                          }}
                          className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[#FAF0DC] border border-[#B89C66] text-[#0F223A] text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                          Tiếp nhận &amp; Đang sửa
                        </button>
                      )}
                      {item.status !== 'RESOLVED' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={async () => {
                            setUpdatingMntId(item.id);
                            await onUpdateMaintenance(item.id, { status: 'RESOLVED' });
                            setUpdatingMntId(null);
                          }}
                          className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đánh dấu Hoàn tất</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* SUB-TAB 4: ĐỔI MẬT KHẨU CHỦ TRỌ                              */}
      {/* ============================================================ */}
      {subTab === 'security' && (
        <div className="max-w-xl bg-white rounded-2xl border border-[#E5E3DE] p-5 sm:p-6 space-y-5 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0F223A] text-[#B89C66] flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0F223A]">
                Đổi mật khẩu Cổng vận hành Chủ trọ
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tài khoản đang đăng nhập:{' '}
                <strong className="text-[#0F223A]">
                  {currentLandlord?.name || 'Chủ trọ'} ({currentLandlord?.email})
                </strong>
                . Mật khẩu mới được mã hóa scrypt và lưu trực tiếp vào cơ sở dữ liệu PostgreSQL.
              </p>
            </div>
          </div>

          {pwdError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
              {pwdError}
            </div>
          )}

          <form onSubmit={handleSubmitPassword} className="space-y-4">
            <FormField
              label="Mật khẩu hiện tại"
              htmlFor="landlord-cur-pwd"
              required
              hint="Nếu tài khoản đang dùng mật khẩu mặc định demo, nhập 123456"
            >
              <input
                id="landlord-cur-pwd"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu hiện tại"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E5E3DE] bg-white text-sm text-[#0F223A] focus:outline-none focus:border-[#B89C66]"
              />
            </FormField>

            <FormField
              label="Mật khẩu mới"
              htmlFor="landlord-new-pwd"
              required
              hint="Tối thiểu 6 ký tự"
            >
              <input
                id="landlord-new-pwd"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E5E3DE] bg-white text-sm text-[#0F223A] focus:outline-none focus:border-[#B89C66]"
              />
            </FormField>

            <FormField label="Xác nhận mật khẩu mới" htmlFor="landlord-cfm-pwd" required>
              <input
                id="landlord-cfm-pwd"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E5E3DE] bg-white text-sm text-[#0F223A] focus:outline-none focus:border-[#B89C66]"
              />
            </FormField>

            <button
              type="submit"
              disabled={pwdBusy}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-sm font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {pwdBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>Cập nhật mật khẩu bảo mật</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
