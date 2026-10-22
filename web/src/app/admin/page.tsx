'use client';

import { scopedFetch as fetch } from '@/lib/scoped-fetch';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell, { type AdminTab } from '@/components/admin/AdminShell';
import AdminPanel from '@/components/admin/AdminPanel';
import AdminPagination, { useAdminPagination } from '@/components/admin/AdminPagination';
import styles from '@/components/admin/AdminWorkspace.module.css';
import { OverviewSkeleton, ErrorBanner, EmptyStateCard } from '@/components/landlord/LandlordPrimitives';
import { portalSignOut } from '@/lib/portal-auth-client';
import type { AuthSession } from '@/lib/types';
import {
  ShieldCheck,
  Users,
  Building2,
  TrendingUp,
  Sparkles,
  BarChart3,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  Eye,
  Calendar,
  Plus,
  Search,
  Filter,
  FileText,
  Receipt,
  Star,
  Play,
  RefreshCw,
  X,
  ChevronRight,
  MapPin,
  Zap,
  Phone,
  Mail,
  Award,
  Clock,
  Printer,
  SlidersHorizontal,
  Home,
  ArrowUpRight,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import ContractLegalModal from '@/components/ContractLegalModal';

interface AdminStats {
  totalRooms: number;
  availableCount: number;
  bookedCount: number;
  rentedCount: number;
  occupancyRate: number;
  totalUsers: number;
  totalLandlords: number;
  totalAppointments: number;
  totalContracts: number;
  totalBills: number;
  districtStats: Array<{
    district: string;
    count: number;
    avgPrice: number;
    totalRent: number;
  }>;
  recommenderMetrics: {
    precisionAt5: number;
    ndcgAt5: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    totalInteractions: number;
    ctr: number;
    bookmarkCount: number;
  };
}

interface UnifiedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'LANDLORD' | 'TENANT';
  status: 'ACTIVE' | 'LOCKED';
  createdAt: string;
}

interface BuildingItem {
  id?: number;
  slug?: string;
  code: string;
  name: string;
  address: string;
  district: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  base_price?: number;
  min_price?: number;
  max_price?: number;
  room_type?: string;
  area?: number;
  amenities: string[];
  images: string[];
  landlord_id: string;
  landlord_name: string;
  landlord_phone: string;
  rooms_count?: number;
}

interface RoomItem {
  id: number;
  roomCode: string;
  projectCode: string | null;
  projectName: string | null;
  title: string;
  price: number;
  deposit: number;
  area: number;
  roomType: string;
  district: string;
  status: 'AVAILABLE' | 'BOOKED_VIEWING' | 'RESERVED' | 'RENTED';
  landlordId: string;
  landlordName: string;
  landlordPhone: string;
  amenities: string[];
  images: string[];
}

interface AppointmentItem {
  id: string;
  roomId: number;
  roomTitle?: string;
  userId: string;
  userName: string;
  userPhone: string;
  date: string;
  timeSlot: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  notes?: string;
}

interface ContractItem {
  id: string;
  roomId: number;
  roomTitle: string;
  tenantName: string;
  tenantPhone: string;
  landlordName: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
}

interface BillItem {
  id: string;
  roomId: number;
  roomCode: string;
  month: string;
  electricOld: number;
  electricNew: number;
  electricUsed: number;
  electricCost: number;
  waterOld: number;
  waterNew: number;
  waterUsed: number;
  waterCost: number;
  internetCost: number;
  serviceCost: number;
  rentCost: number;
  totalAmount: number;
  status: 'PAID' | 'UNPAID';
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [operationSearch, setOperationSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tab State (6 Main Pillars from Thesis Outline)
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');

  // Core Data States
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [buildings, setBuildings] = useState<BuildingItem[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [users, setUsers] = useState<UnifiedUser[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [bills, setBills] = useState<BillItem[]>([]);
  const [amenities, setAmenities] = useState<Array<{ name: string; count: number }>>([]);

  // Sub-tab for Operations (Appointments, Contracts, Billing, Reviews)
  const [opSubTab, setOpSubTab] = useState<'appointments' | 'contracts' | 'bills' | 'reviews'>('appointments');

  // Filtering states
  const [searchBuilding, setSearchBuilding] = useState('');
  const [filterBuildingDistrict, setFilterBuildingDistrict] = useState('ALL');

  const [searchRoom, setSearchRoom] = useState('');
  const [filterRoomStatus, setFilterRoomStatus] = useState('ALL');
  const [filterRoomDistrict, setFilterRoomDistrict] = useState('ALL');

  const [searchUser, setSearchUser] = useState('');
  const [filterUserRole, setFilterUserRole] = useState('ALL');

  // Modals
  const [showContractSummary, setShowContractSummary] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingItem | null>(null);
  const [selectedRoomToEdit, setSelectedRoomToEdit] = useState<RoomItem | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({ name: '', email: '', phone: '', role: 'TENANT' });

  // Recommender Live Benchmark State
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<any>(null);

  // Verify Admin Authentication
  useEffect(() => {
    const saved = localStorage.getItem('elite_auth_user');
    if (!saved) {
      router.push('/portal/login');
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      if (parsed.role !== 'ADMIN') {
        router.push('/portal/login');
        return;
      }
      setSession(parsed);
      setAuthChecked(true);
    } catch {
      router.push('/portal/login');
    }
  }, [router]);

  // Load All Admin Data
  const loadAdminData = async () => {
    try {
      setRefreshing(true);
      setLoadError(null);
      const res = await fetch('/api/admin/data');
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) throw new Error(json.message || json.error || 'Không thể tải dữ liệu quản trị.');
      if (json.success && json.data) {
        setStats(json.data.stats);
        setBuildings(json.data.buildings || []);
        setRooms(json.data.rooms || []);
        setUsers(json.data.users || []);
        setAppointments(json.data.appointments || []);
        setContracts(json.data.contracts || []);
        setBills(json.data.bills || []);
        setAmenities(json.data.amenities || []);
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
      setLoadError(err instanceof Error ? err.message : 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (authChecked) {
      loadAdminData();
    }
  }, [authChecked]);

  const handleLogout = async () => {
    try {
      await portalSignOut();
      localStorage.removeItem('elite_auth_user');
      document.cookie = 'elite_role=; path=/; max-age=0';
      router.push('/portal/login');
      router.refresh();
    } catch {
      setActionError('Chưa thể đăng xuất. Vui lòng thử lại.');
    }
  };

  // Actions
  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
    );
    try {
      await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_USER_STATUS', userId, status: newStatus }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangeUserRole = async (userId: string, role: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: role as any } : u))
    );
    try {
      await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CHANGE_USER_ROLE', userId, role }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingUser) return;
    setCreateUserError(null);
    if (!newUserData.name || !newUserData.phone) {
      setCreateUserError('Vui lòng nhập họ tên và số điện thoại.');
      return;
    }
    setCreatingUser(true);
    try {
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_USER', ...newUserData }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || json.error || 'Không thể tạo tài khoản. Vui lòng thử lại.');
      if (json.success) {
        setUsers((prev) => [
          {
            id: json.data.id || `user_${Date.now()}`,
            name: newUserData.name,
            email: newUserData.email,
            phone: newUserData.phone,
            role: newUserData.role as any,
            status: 'ACTIVE',
            createdAt: new Date().toISOString().split('T')[0],
          },
          ...prev,
        ]);
        setIsAddUserOpen(false);
        setNewUserData({ name: '', email: '', phone: '', role: 'TENANT' });
        setNotice('Đã tạo tài khoản thành công.');
      }
    } catch (err) {
      setCreateUserError(err instanceof Error ? err.message : 'Không thể tạo tài khoản. Vui lòng thử lại.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleUpdateRoomStatus = async (roomId: number, status: string) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, status: status as any } : r))
    );
    try {
      await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_ROOM_STATUS', roomId, status }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateAppointment = async (appointmentId: string, status: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status: status as any } : a))
    );
    try {
      await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_APPOINTMENT_STATUS', appointmentId, status }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBill = async (billId: string, status: 'PAID' | 'UNPAID') => {
    setBills((prev) =>
      prev.map((b) => (b.id === billId ? { ...b, status } : b))
    );
    try {
      await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_BILL_STATUS', billId, status }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleTerminateContract = async (contractId: string, roomId: number) => {
    if (!confirm('Bạn có chắc chắn muốn thanh lý hợp đồng này? Phòng sẽ được tự động mở lại trạng thái Còn trống (AVAILABLE).')) {
      return;
    }
    setContracts((prev) =>
      prev.map((c) => (c.id === contractId ? { ...c, status: 'TERMINATED' } : c))
    );
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, status: 'AVAILABLE' } : r))
    );
    try {
      await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TERMINATE_CONTRACT', contractId, roomId }),
      });
      alert('✅ Đã thanh lý hợp đồng và giải phóng phòng thành công!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunRecommenderBenchmark = async () => {
    setBenchmarkRunning(true);
    try {
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RUN_RECOMMENDER_BENCHMARK' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || json.error || 'Không thể chạy đánh giá.');
      if (json.success) {
        setBenchmarkResults(json.data);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể chạy đánh giá. Vui lòng thử lại.');
    } finally {
      setBenchmarkRunning(false);
    }
  };

  // Filtered Collections
  const matchDistrictFilter = (itemDistrict: string, selectedFilter: string) => {
    if (selectedFilter === 'ALL') return true;
    const dLower = itemDistrict.toLowerCase().trim();
    const fLower = selectedFilter.toLowerCase().trim();
    if (fLower === 'quận 1') {
      return dLower === 'quận 1';
    }
    return dLower.includes(fLower);
  };

  const filteredBuildings = buildings.filter((b) => {
    const matchName =
      b.name.toLowerCase().includes(searchBuilding.toLowerCase()) ||
      b.address.toLowerCase().includes(searchBuilding.toLowerCase()) ||
      b.code.toLowerCase().includes(searchBuilding.toLowerCase());
    const matchDistrict = matchDistrictFilter(b.district, filterBuildingDistrict);
    return matchName && matchDistrict;
  });

  const filteredRooms = rooms.filter((r) => {
    const matchSearch =
      r.title.toLowerCase().includes(searchRoom.toLowerCase()) ||
      r.roomCode.toLowerCase().includes(searchRoom.toLowerCase()) ||
      (r.projectName && r.projectName.toLowerCase().includes(searchRoom.toLowerCase()));
    const matchStatus = filterRoomStatus === 'ALL' || r.status === filterRoomStatus;
    const matchDistrict = matchDistrictFilter(r.district, filterRoomDistrict);
    return matchSearch && matchStatus && matchDistrict;
  });

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.phone.includes(searchUser);
    const matchRole = filterUserRole === 'ALL' || u.role === filterUserRole;
    return matchSearch && matchRole;
  });

  const searchOperations = (value: string) => value.toLocaleLowerCase('vi-VN').includes(operationSearch.toLocaleLowerCase('vi-VN').trim());
  const filteredAppointments = appointments.filter((a) => searchOperations([a.roomId, a.userName, a.userPhone, a.date, a.timeSlot].join(' ')));
  const filteredContracts = contracts.filter((c) => searchOperations([c.id, c.roomTitle, c.tenantName, c.tenantPhone, c.landlordName].join(' ')));
  const filteredBills = bills.filter((b) => searchOperations([b.roomCode, b.month].join(' ')));
  const buildingPage = useAdminPagination(filteredBuildings, JSON.stringify([searchBuilding, filterBuildingDistrict]));
  const roomPage = useAdminPagination(filteredRooms, JSON.stringify([searchRoom, filterRoomStatus, filterRoomDistrict]));
  const userPage = useAdminPagination(filteredUsers, JSON.stringify([searchUser, filterUserRole]));
  const appointmentPage = useAdminPagination(filteredAppointments, operationSearch);
  const contractPage = useAdminPagination(filteredContracts, operationSearch);
  const billPage = useAdminPagination(filteredBills, operationSearch);
  const currentMetrics = benchmarkResults?.metrics ?? stats?.recommenderMetrics;
  const occupancyRate = stats && stats.totalRooms > 0 ? Number((stats.rentedCount / stats.totalRooms * 100).toFixed(1)) : 0;

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0F223A] text-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl border-4 border-[#B89C66] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-300">
            Đang kiểm tra phiên quản trị...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      <AdminShell activeTab={activeTab} onSelectTab={setActiveTab} session={session}
        counts={stats ? { buildings: buildings.length, rooms: rooms.length, users: users.length, operations: appointments.filter((a) => a.status === 'PENDING').length } : {}}
        refreshing={refreshing} onRefresh={loadAdminData} onLogout={handleLogout}
        onCreateUser={() => { setCreateUserError(null); setIsAddUserOpen(true); }}>
      <div className="space-y-6" aria-busy={loading || refreshing}>
        {loadError && <ErrorBanner message={loadError} onRetry={loadAdminData} />}
        {notice && <div role="status" className="rounded-xl border border-[#B89C66]/40 bg-[#FAF0DC] text-[#0F223A] p-4 flex items-center justify-between gap-3 text-sm"><span>{notice}</span><button type="button" aria-label="Đóng thông báo" onClick={() => setNotice(null)}><X className="w-4 h-4" /></button></div>}
        {actionError && <div role="alert" className="flex items-start justify-between gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm"><span>{actionError}</span><button type="button" aria-label="Đóng thông báo lỗi" onClick={() => setActionError(null)}><X className="w-4 h-4" /></button></div>}
        {loading && <OverviewSkeleton />}
        {!loading && refreshing && <p role="status" className="text-sm text-[#8C6D37]">Đang cập nhật dữ liệu…</p>}
        {!loading && stats && <>
        {/* KPI OVERVIEW TOP CARDS */}
        {stats && activeTab === 'analytics' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E5E3DE] shadow-xs hover:shadow-md transition-shadow">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Tổng số phòng
              </span>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mt-1.5">
                <span className="text-2xl sm:text-3xl font-black text-[#0F223A]">
                  {stats.totalRooms}
                </span>
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {buildings.length} tòa nhà
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2 font-medium">
                <span>Trống: <strong className="text-[#8C6D37]">{stats.availableCount}</strong></span>
                <span>•</span>
                <span>Đặt lịch: <strong className="text-[#8C6D37]">{stats.bookedCount}</strong></span>
                <span>•</span>
                <span>Đang thuê: <strong className="text-[#0F223A]">{stats.rentedCount}</strong></span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E5E3DE] shadow-xs hover:shadow-md transition-shadow">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Tỷ lệ đang thuê
              </span>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mt-1.5">
                <span className="text-2xl sm:text-3xl font-black text-[#0F223A]">
                  {occupancyRate}%
                </span>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  Chưa thuê: {(100 - occupancyRate).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className="bg-[#0F223A] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${occupancyRate}%` }}
                />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E5E3DE] shadow-xs hover:shadow-md transition-shadow">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Hợp đồng & lịch hẹn
              </span>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mt-1.5">
                <span className="text-2xl sm:text-3xl font-black text-[#8C6D37]">
                  {stats.totalContracts} HĐ
                </span>
                <span className="text-xs font-bold text-[#8C6D37] bg-[#FAF0DC] px-2 py-0.5 rounded border border-[#E5E3DE]">
                  {stats.totalAppointments} Lịch hẹn
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-2 font-medium">
                {stats.totalBills} kỳ hóa đơn điện nước đã phát hành
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E5E3DE] shadow-xs hover:shadow-md transition-shadow">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Độ chính xác gợi ý (mẫu)
              </span>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mt-1.5">
                <span className="text-2xl sm:text-3xl font-black text-amber-500">
                  {stats.recommenderMetrics.precisionAt5}%
                </span>
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  NDCG: {stats.recommenderMetrics.ndcgAt5}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-2 font-medium">
                p95: <strong>{stats.recommenderMetrics.p95LatencyMs}ms</strong> (mô phỏng, mục tiêu &lt; 500ms)
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 1: ANALYTICS & REVENUE DASHBOARD (CLO3, CLO1.1) */}
        {/* ======================================================== */}
        {activeTab === 'analytics' && stats && (
          <div className="space-y-6">
            <section className="bg-white border border-[#E5E3DE] rounded-2xl p-4 sm:p-6 shadow-xs">
              <div className="flex items-center gap-3 mb-5"><div className="p-2.5 rounded-xl bg-[#FAF0DC]"><Clock className="w-5 h-5 text-[#8C6D37]" /></div><div><h2 className="text-lg font-bold">Việc cần theo dõi</h2><p className="text-sm text-slate-500">Đi thẳng đến nhóm hồ sơ cần xử lý</p></div></div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                <button type="button" onClick={() => { setOperationSearch(''); setActiveTab('operations'); setOpSubTab('appointments'); }} className="p-4 text-left rounded-xl bg-[#F8F8F6] border border-[#E5E3DE] hover:border-[#B89C66] flex items-center justify-between gap-2"><div><span className="text-2xl font-bold block">{appointments.filter((a) => a.status === 'PENDING').length}</span><span className="text-sm text-slate-600">Lịch chờ xác nhận</span></div><ChevronRight className="w-4 h-4 text-[#8C6D37]" /></button>
                <button type="button" onClick={() => { setOperationSearch(''); setActiveTab('operations'); setOpSubTab('bills'); }} className="p-4 text-left rounded-xl bg-[#F8F8F6] border border-[#E5E3DE] hover:border-[#B89C66] flex items-center justify-between gap-2"><div><span className="text-2xl font-bold block">{bills.filter((bill) => bill.status === 'UNPAID').length}</span><span className="text-sm text-slate-600">Hóa đơn chưa thanh toán</span></div><ChevronRight className="w-4 h-4 text-[#8C6D37]" /></button>
                <button type="button" onClick={() => { setActiveTab('rooms'); setFilterRoomStatus('AVAILABLE'); setFilterRoomDistrict('ALL'); setSearchRoom(''); }} className="p-4 text-left rounded-xl bg-[#F8F8F6] border border-[#E5E3DE] hover:border-[#B89C66] flex items-center justify-between gap-2"><div><span className="text-2xl font-bold block">{stats.availableCount}</span><span className="text-sm text-slate-600">Phòng đang còn trống</span></div><ChevronRight className="w-4 h-4 text-[#8C6D37]" /></button>
              </div>
            </section>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* District Distribution Table */}
              <div className="xl:col-span-2 bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-base text-[#0F223A]">
                      Phòng & tiền thuê theo khu vực
                    </h3>
                    <p className="text-sm text-slate-500">
                      {buildings.length} tòa nhà · {stats.totalRooms.toLocaleString('vi-VN')} phòng trong hệ thống
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#8C6D37] bg-[#FAF0DC] px-2.5 py-1 rounded-full border border-[#E5E3DE]">
                    {stats.districtStats.length} khu vực
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F8F8F6] border-b border-[#E5E3DE] text-slate-600 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Khu vực / Quận</th>
                        <th className="py-3 px-4">Số lượng phòng</th>
                        <th className="py-3 px-4">Giá thuê TB</th>
                        <th className="py-3 px-4 text-right">Doanh thu dự kiến / tháng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {stats.districtStats.map((d) => (
                        <tr key={d.district} className="hover:bg-[#F8F8F6] transition-colors">
                          <td data-label="Khu vực / Quận" className="py-3.5 px-4 font-bold text-[#0F223A] flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#B89C66]" />
                            <span>{d.district}</span>
                          </td>
                          <td data-label="Số lượng phòng" className="py-3.5 px-4">
                            <span className="px-2.5 py-1 bg-[#F3F2EE] text-[#0F223A] rounded-full font-bold">
                              {d.count} phòng
                            </span>
                          </td>
                          <td data-label="Giá thuê TB" className="py-3.5 px-4 font-semibold text-slate-800">
                            {d.avgPrice.toLocaleString('vi-VN')} đ
                          </td>
                          <td data-label="Doanh thu dự kiến / tháng" className="py-3.5 px-4 text-right font-black text-[#0F223A] text-sm">
                            {d.totalRent.toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* District Revenue Bar visualization */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <span className="text-sm font-bold text-slate-700 block mb-3">
                    Tỷ Trọng Doanh Thu Phân Bổ Toàn Mạng Lưới TP.HCM:
                  </span>
                  <div className="space-y-3">
                    {stats.districtStats.map((district) => {
                      const total = stats.districtStats.reduce((sum, item) => sum + item.totalRent, 0);
                      const share = total > 0 ? district.totalRent / total * 100 : 0;
                      return <div key={district.district}><div className="flex justify-between gap-2 mb-1 text-xs"><span>{district.district}</span><strong>{share.toFixed(1)}%</strong></div><div className="h-2 rounded-full bg-[#F3F2EE] overflow-hidden"><div className="h-full rounded-full bg-[#B89C66]" style={{ width: share + '%' }} /></div></div>;
                    })}
                  </div>
                </div>
              </div>

              {/* Lifecycle Stage Breakdown & Compliance Box */}
              <div className="bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-6 shadow-xs flex flex-col justify-between space-y-6">
                <div>
                  <h3 className="font-bold text-base text-[#0F223A] mb-1">
                    Trạng thái phòng
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Theo dõi từng giai đoạn cho thuê
                  </p>

                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#B89C66]" />
                        <span className="font-bold text-[#0F223A]">Còn trống</span>
                      </div>
                      <span className="font-black text-[#8C6D37] text-sm">{stats.availableCount} phòng</span>
                    </div>

                    <div className="p-3 bg-[#FAF0DC] rounded-xl border border-[#E5E3DE] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#B89C66]" />
                        <span className="font-bold text-[#0F223A]">Có lịch xem</span>
                      </div>
                      <span className="font-black text-[#0F223A] text-sm">{stats.bookedCount} phòng</span>
                    </div>

                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="font-bold text-amber-900">Đã giữ chỗ</span>
                      </div>
                      <span className="font-black text-amber-800 text-sm">{Math.max(0, stats.totalRooms - stats.availableCount - stats.bookedCount - stats.rentedCount)} phòng</span>
                    </div>

                    <div className="p-3 bg-[#F3F2EE] rounded-xl border border-[#E5E3DE] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#0F223A]" />
                        <span className="font-bold text-[#0F223A]">Đang thuê</span>
                      </div>
                      <span className="font-black text-[#0F223A] text-sm">{stats.rentedCount} phòng</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#F8F8F6] rounded-xl border border-[#E5E3DE] text-sm text-slate-600">
                  <div className="flex items-center gap-2 font-bold text-[#0F223A] mb-1">
                    <CheckCircle2 className="w-4 h-4 text-[#B89C66]" />
                    <span>Phạm vi dữ liệu</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Đang tổng hợp <strong>{stats.totalRooms.toLocaleString('vi-VN')} phòng tại {stats.districtStats.length} khu vực</strong>. Tiền thuê dự kiến là tổng giá niêm yết, không phải số tiền đã thu.
                  </p>
                </div>
              </div>
            </div>

            {/* Popular Amenities Breakdown */}
            <div className="bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-6 shadow-xs">
              <h3 className="font-bold text-base text-[#0F223A] mb-1">
                Tiện ích phổ biến
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Số phòng có từng tiện ích trong danh mục hệ thống
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
                {amenities.slice(0, 12).map((a) => (
                  <div key={a.name} className="p-3 bg-[#F8F8F6] rounded-xl border border-[#E5E3DE] text-center">
                    <span className="font-bold text-[#0F223A] block truncate">{a.name}</span>
                    <span className="text-[#8C6D37] font-black text-base mt-1 block">
                      {a.count} <span className="text-xs font-normal text-slate-500">phòng</span>
                    </span>
                    <span className="text-xs text-slate-400">
                      {((a.count / (stats?.totalRooms || 1)) * 100).toFixed(0)}% độ phủ
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: BUILDINGS MANAGEMENT (73 TOÀ NHÀ) (CLO3) */}
        {/* ======================================================== */}
        {activeTab === 'buildings' && (
          <div className="bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-[#0F223A]">
                  Khu trọ & tòa nhà ({filteredBuildings.length} tòa nhà)
                </h3>
                <p className="text-sm text-slate-500">
                  Tra cứu vị trí, giá thuê và thông tin chủ trọ phụ trách
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input aria-label="Tìm tên, địa chỉ tòa..." type="text" placeholder="Tìm tên, địa chỉ tòa..."
                    value={searchBuilding}
                    onChange={(e) => setSearchBuilding(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-sm border border-[#E5E3DE] rounded-xl outline-hidden focus:border-[#B89C66] bg-white w-48"
                  />
                </div>

                <select aria-label="Lọc khu vực tòa nhà" value={filterBuildingDistrict}
                  onChange={(e) => setFilterBuildingDistrict(e.target.value)}
                  className="px-2.5 py-1.5 text-sm border border-[#E5E3DE] rounded-xl outline-hidden focus:border-[#B89C66] bg-white font-medium"
                >
                  <option value="ALL">Tất cả khu vực</option>
                  <option value="tân phú">Quận Tân Phú</option>
                  <option value="tân bình">Quận Tân Bình</option>
                  <option value="bình tân">Quận Bình Tân</option>
                  <option value="gò vấp">Quận Gò Vấp</option>
                  <option value="bình thạnh">Quận Bình Thạnh</option>
                  <option value="thủ đức">TP. Thủ Đức</option>
                  <option value="quận 7">Quận 7</option>
                  <option value="quận 10">Quận 10</option>
                  <option value="phú nhuận">Quận Phú Nhuận</option>
                  <option value="quận 12">Quận 12</option>
                  <option value="quận 3">Quận 3</option>
                  <option value="quận 1">Quận 1</option>
                  <option value="quận 8">Quận 8</option>
                  <option value="quận 6">Quận 6</option>
                </select>
              </div>
            </div>

            {/* Buildings Grid / Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F8F8F6] border-b border-[#E5E3DE] text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Mã / Tên Tòa Nhà</th>
                    <th className="py-3 px-4">Địa chỉ &amp; Quận</th>
                    <th className="py-3 px-4">Tọa độ GPS (Lat, Lng)</th>
                    <th className="py-3 px-4">Chủ trọ phụ trách</th>
                    <th className="py-3 px-4">Đơn giá sàn</th>
                    <th className="py-3 px-4 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {buildingPage.items.map((b) => {
                    const latVal = b.lat ?? b.latitude;
                    const lngVal = b.lng ?? b.longitude;
                    const basePriceVal = Number(b.base_price ?? b.min_price ?? 0);
                    return (
                      <tr key={b.code} className="hover:bg-[#F8F8F6] transition-colors">
                        <td data-label="Mã / Tên Tòa Nhà" className="py-3.5 px-4 font-bold text-[#0F223A]">
                          <span className="text-[#8C6D37] font-mono text-xs block">{b.code}</span>
                          <span className="text-sm font-extrabold">{b.name}</span>
                        </td>
                        <td data-label="Địa chỉ &amp; Quận" className="py-3.5 px-4 max-w-xs">
                          <p className="truncate text-slate-800">{b.address}</p>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {b.district}
                          </span>
                        </td>
                        <td data-label="Tọa độ GPS (Lat, Lng)" className="py-3.5 px-4 font-mono text-xs text-slate-600">
                          {latVal != null && lngVal != null ? Number(latVal).toFixed(4) + ', ' + Number(lngVal).toFixed(4) : 'Chưa cập nhật'}
                        </td>
                        <td data-label="Chủ trọ phụ trách" className="py-3.5 px-4">
                          <span className="font-bold text-[#0F223A] block">{b.landlord_name}</span>
                          <a href={`tel:${b.landlord_phone}`} className="text-[#8C6D37] text-xs hover:underline">
                            {b.landlord_phone}
                          </a>
                        </td>
                        <td data-label="Đơn giá sàn" className="py-3.5 px-4 font-bold text-[#0F223A]">
                          {basePriceVal.toLocaleString('vi-VN')} đ/tháng
                        </td>
                        <td data-label="Chi tiết" className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedBuilding(b)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-[#FAF0DC] text-[#8C6D37] rounded-xl font-bold text-sm cursor-pointer transition-colors inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem tòa</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {buildingPage.total === 0 && <EmptyStateCard title="Không có kết quả" description="Danh sách đang trống hoặc không có dữ liệu khớp bộ lọc. Hãy thử thay đổi từ khóa hoặc bộ lọc." />}
              <AdminPagination {...buildingPage} />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ROOMS MANAGEMENT (TOÀN HỆ THỐNG) (CLO3) */}
        {/* ======================================================== */}
        {activeTab === 'rooms' && (
          <div className="bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-[#0F223A]">
                  Quản Lý Phòng Trọ Toàn Hệ Thống ({filteredRooms.length} phòng)
                </h3>
                <p className="text-sm text-slate-500">
                  Duyệt phòng, kiểm soát trạng thái vòng đời, đơn giá thuê và tiện ích
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    aria-label="Tìm phòng theo mã hoặc tiêu đề"
                    placeholder="Mã phòng, tiêu đề..."
                    value={searchRoom}
                    onChange={(e) => setSearchRoom(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-sm border border-[#E5E3DE] rounded-xl outline-hidden focus:border-[#B89C66] bg-white w-44"
                  />
                </div>

                <select aria-label="Lọc trạng thái phòng" value={filterRoomStatus}
                  onChange={(e) => setFilterRoomStatus(e.target.value)}
                  className="px-2.5 py-1.5 text-sm border border-[#E5E3DE] rounded-xl outline-hidden focus:border-[#B89C66] bg-white font-medium"
                >
                  <option value="ALL">Mọi trạng thái</option>
                  <option value="AVAILABLE">Còn trống</option>
                  <option value="BOOKED_VIEWING">Đã đặt lịch</option>
                  <option value="RESERVED">Giữ chỗ</option>
                  <option value="RENTED">Đang thuê</option>
                </select>

                <select aria-label="Lọc khu vực phòng" value={filterRoomDistrict}
                  onChange={(e) => setFilterRoomDistrict(e.target.value)}
                  className="px-2.5 py-1.5 text-sm border border-[#E5E3DE] rounded-xl outline-hidden focus:border-[#B89C66] bg-white font-medium"
                >
                  <option value="ALL">Mọi quận (14 Quận/TP)</option>
                  <option value="tân phú">Tân Phú</option>
                  <option value="tân bình">Tân Bình</option>
                  <option value="bình tân">Bình Tân</option>
                  <option value="gò vấp">Gò Vấp</option>
                  <option value="bình thạnh">Bình Thạnh</option>
                  <option value="thủ đức">TP. Thủ Đức</option>
                  <option value="quận 7">Quận 7</option>
                  <option value="quận 10">Quận 10</option>
                  <option value="phú nhuận">Phú Nhuận</option>
                  <option value="quận 12">Quận 12</option>
                  <option value="quận 3">Quận 3</option>
                  <option value="quận 1">Quận 1</option>
                  <option value="quận 8">Quận 8</option>
                  <option value="quận 6">Quận 6</option>
                </select>
              </div>
            </div>

            {stats && stats.totalRooms > rooms.length && <p className="text-sm text-slate-500 rounded-xl bg-[#F8F8F6] p-3">Danh sách đã tải {rooms.length} / {stats.totalRooms.toLocaleString('vi-VN')} phòng theo giới hạn API hiện tại. Bộ lọc áp dụng trong danh sách đã tải.</p>}
            {/* Rooms Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F8F8F6] border-b border-[#E5E3DE] text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Mã phòng</th>
                    <th className="py-3 px-4">Tòa nhà / Dự án</th>
                    <th className="py-3 px-4">Loại phòng &amp; Diện tích</th>
                    <th className="py-3 px-4">Giá thuê / Cọc</th>
                    <th className="py-3 px-4">Chủ trọ</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Đổi trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {roomPage.items.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F8F8F6] transition-colors">
                      <td data-label="Mã phòng" className="py-3.5 px-4 font-mono font-bold text-[#8C6D37]">
                        {r.roomCode}
                      </td>
                      <td data-label="Tòa nhà / Dự án" className="py-3.5 px-4">
                        <span className="font-bold text-[#0F223A] block">{r.projectName || 'Tòa nhà độc lập'}</span>
                        <span className="text-xs text-slate-500">{r.district}</span>
                      </td>
                      <td data-label="Loại phòng &amp; Diện tích" className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{r.roomType}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-slate-400 text-xs">{r.area} m²</span>
                          <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-[#B89C66]/15 text-[#B89C66] border border-[#B89C66]/30 inline-flex items-center gap-0.5">
                            <ShieldCheck className="w-2.5 h-2.5" /> PCCC 2026
                          </span>
                        </div>
                      </td>
                      <td data-label="Giá thuê / Cọc" className="py-3.5 px-4">
                        <span className="font-bold text-[#0F223A] block">
                          {r.price.toLocaleString('vi-VN')} đ
                        </span>
                        <span className="text-xs text-slate-400">
                          Cọc: {(r.deposit || r.price).toLocaleString('vi-VN')} đ
                        </span>
                      </td>
                      <td data-label="Chủ trọ" className="py-3.5 px-4">
                        <span className="font-semibold text-[#0F223A] block">{r.landlordName}</span>
                        <span className="text-xs text-slate-500">{r.landlordPhone}</span>
                      </td>
                      <td data-label="Trạng thái" className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            r.status === 'AVAILABLE'
                              ? 'bg-[#F3E2BE] text-[#0F223A]'
                              : r.status === 'BOOKED_VIEWING'
                              ? 'bg-[#F3E2BE] text-[#0F223A]'
                              : r.status === 'RESERVED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-[#E5E3DE] text-[#0F223A]'
                          }`}
                        >
                          {r.status === 'AVAILABLE'
                            ? 'Còn trống'
                            : r.status === 'BOOKED_VIEWING'
                            ? 'Đã đặt lịch'
                            : r.status === 'RESERVED'
                            ? 'Giữ chỗ'
                            : 'Đang thuê'}
                        </span>
                      </td>
                      <td data-label="Đổi trạng thái" className="py-3.5 px-4 text-right">
                        <select aria-label="Đổi trạng thái phòng" value={r.status}
                          onChange={(e) => handleUpdateRoomStatus(r.id, e.target.value)}
                          className="px-2 py-1 text-xs font-semibold border border-[#E5E3DE] rounded bg-white hover:border-[#B89C66] outline-hidden cursor-pointer"
                        >
                          <option value="AVAILABLE">Còn trống</option>
                          <option value="BOOKED_VIEWING">Đã đặt lịch</option>
                          <option value="RESERVED">Giữ chỗ</option>
                          <option value="RENTED">Đang thuê</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {roomPage.total === 0 && <EmptyStateCard title="Không có kết quả" description="Danh sách đang trống hoặc không có dữ liệu khớp bộ lọc. Hãy thử thay đổi từ khóa hoặc bộ lọc." />}
              <AdminPagination {...roomPage} />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: USERS MANAGEMENT & RBAC (CLO3 - 0.50đ) */}
        {/* ======================================================== */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-[#0F223A]">
                  Tài khoản & phân quyền
                </h3>
                <p className="text-sm text-slate-500">
                  Quản lý quyền truy cập của quản trị viên, chủ trọ và người thuê
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input aria-label="Tên, email, số ĐT..." type="text" placeholder="Tên, email, số ĐT..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-sm border border-[#E5E3DE] rounded-xl outline-hidden focus:border-[#B89C66] bg-white w-44"
                  />
                </div>

                <select aria-label="Lọc vai trò người dùng" value={filterUserRole}
                  onChange={(e) => setFilterUserRole(e.target.value)}
                  className="px-2.5 py-1.5 text-sm border border-[#E5E3DE] rounded-xl outline-hidden focus:border-[#B89C66] bg-white font-medium"
                >
                  <option value="ALL">Mọi vai trò</option>
                  <option value="ADMIN">Quản trị viên</option>
                  <option value="LANDLORD">Chủ trọ</option>
                  <option value="TENANT">Người thuê</option>
                </select>

                <button
                  type="button"
                  onClick={() => { setCreateUserError(null); setIsAddUserOpen(true); }}
                  className="px-3 py-1.5 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] rounded-xl text-sm font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm tài khoản</span>
                </button>
              </div>
            </div>

            <p className="text-sm text-slate-500">Tìm kiếm và phân trang trong {users.length} tài khoản đã tải từ hệ thống.</p>
            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F8F8F6] border-b border-[#E5E3DE] text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Email liên hệ</th>
                    <th className="py-3 px-4">Số điện thoại</th>
                    <th className="py-3 px-4">Vai trò</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {userPage.items.map((u) => (
                    <tr key={u.id} className="hover:bg-[#F8F8F6] transition-colors">
                      <td data-label="Họ và tên" className="py-3.5 px-4 font-bold text-[#0F223A] flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                          {u.name.charAt(0)}
                        </div>
                        <span>{u.name}</span>
                      </td>
                      <td data-label="Email liên hệ" className="py-3.5 px-4 text-slate-600">{u.email}</td>
                      <td data-label="Số điện thoại" className="py-3.5 px-4 font-mono">{u.phone}</td>
                      <td data-label="Vai trò" className="py-3.5 px-4">
                        <select aria-label="Đổi vai trò người dùng" value={u.role}
                          onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                          className={`px-2 py-0.5 rounded font-bold text-xs border cursor-pointer outline-hidden ${
                            u.role === 'ADMIN'
                              ? 'bg-[#FAF0DC] text-[#0F223A] border-[#E5E3DE]'
                              : u.role === 'LANDLORD'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-[#F3F2EE] text-[#0F223A] border-[#E5E3DE]'
                          }`}
                        >
                          <option value="ADMIN">Quản trị viên</option>
                          <option value="LANDLORD">CHỦ TRỌ</option>
                          <option value="TENANT">NGƯỜI THUÊ</option>
                        </select>
                      </td>
                      <td data-label="Trạng thái" className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            u.status === 'ACTIVE'
                              ? 'bg-[#F3E2BE] text-[#0F223A]'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td data-label="Thao tác" className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                            u.status === 'ACTIVE'
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-[#FAF0DC] text-[#8C6D37] hover:bg-[#F3E2BE]'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>Khóa</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3" />
                              <span>Mở</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {userPage.total === 0 && <EmptyStateCard title="Không có kết quả" description="Danh sách đang trống hoặc không có dữ liệu khớp bộ lọc. Hãy thử thay đổi từ khóa hoặc bộ lọc." />}
              <AdminPagination {...userPage} />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: RENTAL OPERATIONS MONITORING (CLO3 & ĐẶT LỊCH 1.25đ) */}
        {/* ======================================================== */}
        {activeTab === 'operations' && (
          <div className="bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-[#0F223A]">
                  Lịch hẹn & hồ sơ thuê
                </h3>
                <p className="text-sm text-slate-500">
                  Theo dõi lịch xem phòng, hợp đồng và tình trạng thu tiền
                </p>
              </div>

              {/* Sub-tabs */}
              <div className="flex flex-wrap items-center gap-1 bg-[#F3F2EE] p-1 rounded-xl text-sm font-bold">
                <button
                  type="button"
                  onClick={() => setOpSubTab('appointments')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    opSubTab === 'appointments' ? 'bg-white text-[#8C6D37] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Lịch Xem ({appointments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOpSubTab('contracts')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    opSubTab === 'contracts' ? 'bg-white text-[#8C6D37] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Hợp Đồng ({contracts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOpSubTab('bills')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    opSubTab === 'bills' ? 'bg-white text-[#8C6D37] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Hóa Đơn ({bills.length})
                </button>
              </div>
            </div>

            <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input aria-label="Tìm hồ sơ vận hành" value={operationSearch} onChange={(e) => setOperationSearch(e.target.value)} placeholder={opSubTab === 'bills' ? 'Tìm mã phòng, kỳ hóa đơn…' : 'Tìm phòng, khách thuê, số điện thoại…'} className="w-full pl-10 pr-3 py-2 border border-[#E5E3DE] rounded-xl bg-[#F8F8F6] text-sm" /></div>

            {/* Sub-tab 1: Appointments */}
            {opSubTab === 'appointments' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-[#F3F2EE] border border-[#E5E3DE] rounded-xl text-sm text-[#0F223A] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0F223A]" />
                    <span>
                      Lịch xem được kiểm tra để tránh đặt trùng phòng trong cùng khung giờ.
                    </span>
                  </div>
                  <span className="font-mono text-xs bg-[#E5E3DE] px-2 py-0.5 rounded font-bold">
                    Theo phòng · Ngày · Giờ
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F8F8F6] border-b border-[#E5E3DE] text-slate-600 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Phòng ID</th>
                        <th className="py-3 px-4">Khách thuê</th>
                        <th className="py-3 px-4">Số điện thoại</th>
                        <th className="py-3 px-4">Ngày hẹn</th>
                        <th className="py-3 px-4">Khung giờ</th>
                        <th className="py-3 px-4">Ghi chú</th>
                        <th className="py-3 px-4">Trạng thái</th>
                        <th className="py-3 px-4 text-right">Xử lý</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {appointmentPage.items.map((apt) => (
                        <tr key={apt.id} className="hover:bg-[#F8F8F6] transition-colors">
                          <td data-label="Phòng ID" className="py-3.5 px-4 font-mono font-bold text-[#8C6D37]">
                            #{apt.roomId}
                          </td>
                          <td data-label="Khách thuê" className="py-3.5 px-4 font-bold text-[#0F223A]">{apt.userName}</td>
                          <td data-label="Số điện thoại" className="py-3.5 px-4 font-mono">{apt.userPhone}</td>
                          <td data-label="Ngày hẹn" className="py-3.5 px-4 font-medium">{apt.date}</td>
                          <td data-label="Khung giờ" className="py-3.5 px-4 font-bold text-amber-700">{apt.timeSlot}</td>
                          <td data-label="Ghi chú" className="py-3.5 px-4 text-slate-500 max-w-xs truncate">{apt.notes || '—'}</td>
                          <td data-label="Trạng thái" className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                apt.status === 'CONFIRMED'
                                  ? 'bg-[#F3E2BE] text-[#0F223A]'
                                  : apt.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : apt.status === 'COMPLETED'
                                  ? 'bg-[#E5E3DE] text-[#0F223A]'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {{ PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', COMPLETED: 'Đã hoàn tất', CANCELLED: 'Đã hủy' }[apt.status]}
                            </span>
                          </td>
                          <td data-label="Xử lý" className="py-3.5 px-4 text-right">
                            <select
                              value={{ PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', COMPLETED: 'Đã hoàn tất', CANCELLED: 'Đã hủy' }[apt.status]}
                              onChange={(e) => handleUpdateAppointment(apt.id, e.target.value)}
                              className="px-2 py-1 text-xs font-semibold border border-[#E5E3DE] rounded bg-white outline-hidden cursor-pointer"
                            >
                              <option value="PENDING">Chờ xác nhận</option>
                              <option value="CONFIRMED">Đã xác nhận</option>
                              <option value="COMPLETED">Đã hoàn tất</option>
                              <option value="CANCELLED">Đã hủy</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              {appointmentPage.total === 0 && <EmptyStateCard title="Không có kết quả" description="Danh sách đang trống hoặc không có dữ liệu khớp bộ lọc. Hãy thử thay đổi từ khóa hoặc bộ lọc." />}
              <AdminPagination {...appointmentPage} />
                </div>
              </div>
            )}

            {/* Sub-tab 2: Contracts */}
            {opSubTab === 'contracts' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F8F8F6] border-b border-[#E5E3DE] text-slate-600 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Mã Hợp Đồng</th>
                        <th className="py-3 px-4">Phòng thuê</th>
                        <th className="py-3 px-4">Khách thuê</th>
                        <th className="py-3 px-4">Chủ trọ</th>
                        <th className="py-3 px-4">Thời hạn thuê</th>
                        <th className="py-3 px-4">Tiền phòng / Cọc</th>
                        <th className="py-3 px-4">Trạng thái</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {contractPage.items.map((c) => (
                        <tr key={c.id} className="hover:bg-[#F8F8F6] transition-colors">
                          <td data-label="Mã Hợp Đồng" className="py-3.5 px-4 font-mono font-bold text-[#8C6D37]">
                            {c.id.substring(0, 10)}...
                          </td>
                          <td data-label="Phòng thuê" className="py-3.5 px-4 font-bold text-[#0F223A]">{c.roomTitle}</td>
                          <td data-label="Khách thuê" className="py-3.5 px-4">
                            <span className="font-semibold block">{c.tenantName}</span>
                            <span className="text-xs text-slate-500 font-mono">{c.tenantPhone}</span>
                          </td>
                          <td data-label="Chủ trọ" className="py-3.5 px-4 font-medium">{c.landlordName}</td>
                          <td data-label="Thời hạn thuê" className="py-3.5 px-4 text-xs text-slate-600">
                            {c.startDate} &rarr; {c.endDate}
                          </td>
                          <td data-label="Tiền phòng / Cọc" className="py-3.5 px-4">
                            <span className="font-bold text-[#0F223A] block">
                              {c.monthlyRent.toLocaleString('vi-VN')} đ
                            </span>
                            <span className="text-xs text-slate-400">
                              Cọc: {c.depositAmount.toLocaleString('vi-VN')} đ
                            </span>
                          </td>
                          <td data-label="Trạng thái" className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                c.status === 'ACTIVE'
                                  ? 'bg-[#F3E2BE] text-[#0F223A]'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {c.status === 'ACTIVE' ? 'Đang hiệu lực' : c.status === 'EXPIRED' ? 'Đã hết hạn' : 'Đã thanh lý'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-xs font-extrabold bg-[#B89C66]/15 text-[#0F223A] border border-[#B89C66]/30 block w-fit mt-1">
                              10 Điều PCCC
                            </span>
                          </td>
                          <td data-label="Thao tác" className="py-3.5 px-4 text-right space-x-1.5">
                            <button
                              type="button"
                              onClick={() => { setShowContractSummary(false); setSelectedContract(c); }}
                              className="px-2.5 py-1 bg-[#B89C66] text-[#0F223A] hover:bg-[#A38752] rounded text-sm font-bold cursor-pointer transition-colors shadow-xs"
                            >
                              Xem HĐ &amp; Nội Quy
                            </button>
                            <button type="button" onClick={() => { setShowContractSummary(true); setSelectedContract(c); }} className="px-3 py-2 rounded-xl border border-[#E5E3DE] bg-white text-[#0F223A] text-sm font-semibold">Bản tóm tắt / In</button>
                            {c.status === 'ACTIVE' && (
                              <button
                                type="button"
                                onClick={() => handleTerminateContract(c.id, c.roomId)}
                                className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-sm font-bold cursor-pointer"
                              >
                                Thanh lý
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              {contractPage.total === 0 && <EmptyStateCard title="Không có kết quả" description="Danh sách đang trống hoặc không có dữ liệu khớp bộ lọc. Hãy thử thay đổi từ khóa hoặc bộ lọc." />}
              <AdminPagination {...contractPage} />
                </div>
              </div>
            )}

            {/* Sub-tab 3: Bills */}
            {opSubTab === 'bills' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F8F8F6] border-b border-[#E5E3DE] text-slate-600 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Kỳ hóa đơn</th>
                        <th className="py-3 px-4">Mã phòng</th>
                        <th className="py-3 px-4">Điện (Số cũ &rarr; Số mới)</th>
                        <th className="py-3 px-4">Nước (Số cũ &rarr; Số mới)</th>
                        <th className="py-3 px-4">Tiền phòng</th>
                        <th className="py-3 px-4">Tổng thanh toán</th>
                        <th className="py-3 px-4">Trạng thái</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {billPage.items.map((b) => (
                        <tr key={b.id} className="hover:bg-[#F8F8F6] transition-colors">
                          <td data-label="Kỳ hóa đơn" className="py-3.5 px-4 font-bold text-[#0F223A]">{b.month}</td>
                          <td data-label="Mã phòng" className="py-3.5 px-4 font-mono font-bold text-[#8C6D37]">{b.roomCode}</td>
                          <td data-label="Điện (Số cũ &rarr; Số mới)" className="py-3.5 px-4">
                            {b.electricOld} &rarr; {b.electricNew} ({b.electricUsed} kWh)
                            <span className="text-xs text-slate-400 block">{b.electricCost.toLocaleString('vi-VN')} đ</span>
                          </td>
                          <td data-label="Nước (Số cũ &rarr; Số mới)" className="py-3.5 px-4">
                            {b.waterOld} &rarr; {b.waterNew} ({b.waterUsed} m³)
                            <span className="text-xs text-slate-400 block">{b.waterCost.toLocaleString('vi-VN')} đ</span>
                          </td>
                          <td data-label="Tiền phòng" className="py-3.5 px-4 font-medium">{b.rentCost.toLocaleString('vi-VN')} đ</td>
                          <td data-label="Tổng thanh toán" className="py-3.5 px-4 font-black text-[#0F223A] text-sm">
                            {b.totalAmount.toLocaleString('vi-VN')} đ
                          </td>
                          <td data-label="Trạng thái" className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                b.status === 'PAID'
                                  ? 'bg-[#F3E2BE] text-[#0F223A]'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {b.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                            </span>
                          </td>
                          <td data-label="Thao tác" className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleUpdateBill(b.id, b.status === 'PAID' ? 'UNPAID' : 'PAID')}
                              className={`px-2.5 py-1 rounded text-sm font-bold cursor-pointer transition-colors ${
                                b.status === 'PAID'
                                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  : 'bg-[#B89C66] text-[#0F223A] hover:bg-[#A38752]'
                              }`}
                            >
                              {b.status === 'PAID' ? 'Hủy đánh dấu' : 'Xác nhận thu'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              {billPage.total === 0 && <EmptyStateCard title="Không có kết quả" description="Danh sách đang trống hoặc không có dữ liệu khớp bộ lọc. Hãy thử thay đổi từ khóa hoặc bộ lọc." />}
              <AdminPagination {...billPage} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: RECOMMENDER SYSTEM MONITORING (CLO3 - 1.25đ & CLO4) */}
        {/* ======================================================== */}
        {activeTab === 'recommender' && stats && (
          <section className="bg-white rounded-2xl border border-[#E5E3DE] p-4 sm:p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-amber-600 text-sm font-bold uppercase tracking-wider mb-1">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Chất lượng trải nghiệm tìm phòng</span>
                </div>
                <h3 className="font-bold text-xl text-[#0F223A]">
                  Đánh giá gợi ý phòng
                </h3>
                <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                  Các chỉ số chất lượng hiện là dữ liệu mô phỏng từ API, chưa phải kết quả đo trực tiếp. Chạy mô phỏng để xem bộ kết quả và tập dữ liệu được trả về.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRunRecommenderBenchmark}
                disabled={benchmarkRunning}
                className="px-4 py-2.5 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] rounded-xl font-bold text-sm shadow-md inline-flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {benchmarkRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang đánh giá…</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Chạy mô phỏng đánh giá</span>
                  </>
                )}
              </button>
            </div>

            {/* Metric Scorecards Compared Against Outline Requirements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200">
                <span className="text-sm font-bold text-amber-800 block">ĐỘ ĐO PRECISION@5</span>
                <span className="text-3xl font-black text-amber-950 block mt-2">
                  {benchmarkResults ? benchmarkResults.metrics.precisionAt5 : stats.recommenderMetrics.precisionAt5}%
                </span>
                <div className="mt-2 pt-2 border-t border-amber-200/60 text-xs text-amber-800 flex items-center justify-between">
                  <span>Yêu cầu đề cương: &ge; 70%</span>
                  <span className="font-bold text-[#8C6D37] bg-[#F3E2BE] px-1.5 py-0.5 rounded">{Number(currentMetrics?.precisionAt5) >= 70 ? 'Đạt ngưỡng' : 'Chưa đạt'}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F3F2EE]/80 border border-[#E5E3DE]">
                <span className="text-sm font-bold text-[#0F223A] block">ĐỘ ĐO NDCG@5</span>
                <span className="text-3xl font-black text-[#0F223A] block mt-2">
                  {benchmarkResults ? benchmarkResults.metrics.ndcgAt5 : stats.recommenderMetrics.ndcgAt5}
                </span>
                <div className="mt-2 pt-2 border-t border-[#E5E3DE]/60 text-xs text-[#0F223A] flex items-center justify-between">
                  <span>Yêu cầu đề cương: &ge; 0.75</span>
                  <span className="font-bold text-[#8C6D37] bg-[#F3E2BE] px-1.5 py-0.5 rounded">{Number(currentMetrics?.ndcgAt5) >= 0.75 ? 'Đạt ngưỡng' : 'Chưa đạt'}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF0DC]/80 border border-[#E5E3DE]">
                <span className="text-sm font-bold text-[#0F223A] block">THỜI GIAN PHẢN HỒI (p95)</span>
                <span className="text-3xl font-black text-[#0F223A] block mt-2">
                  {benchmarkResults ? benchmarkResults.metrics.p95LatencyMs : stats.recommenderMetrics.p95LatencyMs} ms
                </span>
                <div className="mt-2 pt-2 border-t border-[#E5E3DE]/60 text-xs text-[#0F223A] flex items-center justify-between">
                  <span>Yêu cầu: p95 &lt; 500ms</span>
                  <span className="font-bold text-[#8C6D37] bg-[#F3E2BE] px-1.5 py-0.5 rounded">{Number(currentMetrics?.p95LatencyMs) < 500 ? 'Đạt ngưỡng' : 'Chưa đạt'}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F3F2EE]/80 border border-[#E5E3DE]">
                <span className="text-sm font-bold text-[#0F223A] block">ĐỘ ĐO RECALL@5</span>
                <span className="text-3xl font-black text-[#0F223A] block mt-2">
                  {benchmarkResults ? benchmarkResults.metrics.recallAt5 + '%' : '—'}
                </span>
                <div className="mt-2 pt-2 border-t border-[#E5E3DE]/60 text-xs text-[#0F223A] flex items-center justify-between">
                  <span>Độ phủ danh sách</span>
                  <span className="font-bold text-[#0F223A] bg-[#E5E3DE] px-1.5 py-0.5 rounded">{benchmarkResults ? 'Kết quả đánh giá' : 'Chưa đánh giá'}</span>
                </div>
              </div>
            </div>

            {/* Live Benchmark Execution Logs if Run */}
            {benchmarkResults && (
              <div className="p-4 rounded-xl bg-[#0F223A] text-slate-200 font-mono text-sm space-y-2 border border-slate-800 animate-in fade-in duration-300">
                <div className="flex flex-wrap gap-3 items-center justify-between text-[#B89C66] font-bold border-b border-slate-800 pb-2">
                  <span>KẾT QUẢ MÔ PHỎNG (THỜI ĐIỂM: {benchmarkResults.evaluatedAt})</span>
                  <span>Thời gian chạy: {benchmarkResults.metrics.benchmarkExecutionTimeMs} ms</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div>Tập mẫu phòng: <span className="text-amber-400">{benchmarkResults.dataset.totalRooms} phòng</span></div>
                  <div>Người dùng mẫu: <span className="text-[#B89C66]">{benchmarkResults.dataset.totalUsers} profiles</span></div>
                  <div>Tương tác ground-truth: <span className="text-[#B89C66]">{benchmarkResults.dataset.groundTruthInteractions} logs</span></div>
                  <div>Độ trễ trung bình: <span className="text-[#B89C66]">{benchmarkResults.metrics.avgLatencyMs} ms</span></div>
                </div>
                <div className="pt-2 text-slate-400 text-xs">
                  Kết quả mô phỏng từ API. Các chỉ số này chưa chứng minh hiệu năng hoặc chất lượng gợi ý thực tế.
                </div>
              </div>
            )}

            {/* Algorithmic Details & Mathematical Formulations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="p-5 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE] text-sm space-y-2.5">
                <strong className="text-sm font-bold text-[#0F223A] block flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Kỹ thuật 1: Weighted Rule-Based Scoring (Cold-Start)</span>
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  Áp dụng khi người dùng mới chưa có lịch sử tương tác. Tính toán điểm dựa trên ngân sách trần, bán kính di chuyển và tiện ích mong muốn kết hợp công thức khoảng cách mặt cầu Haversine:
                </p>
                <code className="block bg-white p-2.5 rounded-xl border border-[#E5E3DE] font-mono text-xs text-slate-800 leading-relaxed">
                  Score = 0.40 * Score(Ngân sách) + 0.35 * Score(Khoảng cách Haversine) + 0.25 * Score(Tiện ích)
                </code>
              </div>

              <div className="p-5 rounded-xl bg-[#F8F8F6] border border-[#E5E3DE] text-sm space-y-2.5">
                <strong className="text-sm font-bold text-[#0F223A] block flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#8C6D37]" />
                  <span>Kỹ thuật 2: Content-Based Filtering (Cosine Similarity)</span>
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  Kích hoạt khi người dùng đã có lịch sử xem phòng, lưu yêu thích hoặc đặt lịch. Vector hồ sơ người dùng (User Profile Vector) được tích chập với Vector đặc trưng phòng trọ (Room Feature Vector):
                </p>
                <code className="block bg-white p-2.5 rounded-xl border border-[#E5E3DE] font-mono text-xs text-slate-800 leading-relaxed">
                  Cosine(u, r) = (Vector_u · Vector_r) / (||Vector_u|| * ||Vector_r||)
                </code>
              </div>
            </div>
          </section>
        )}
        </>}
      </div>
      </AdminShell>

      {/* ======================================================== */}
      {/* MODAL: VIEW ELECTRONIC CONTRACT */}
      {/* ======================================================== */}
      <AdminPanel open={Boolean(selectedContract && showContractSummary)} onClose={() => setSelectedContract(null)} title="Tóm tắt hợp đồng" subtitle="Thông tin hợp đồng và bản in hiện có">
        {selectedContract && showContractSummary && (<>
            <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
              <div className="text-center pb-4 border-b border-[#E5E3DE]">
                <h4 className="text-sm font-bold text-[#0F223A] uppercase">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </h4>
                <p className="text-xs text-slate-500 font-medium">Độc lập - Tự do - Hạnh phúc</p>
                <h5 className="font-black text-base text-[#0F223A] mt-2">
                  HỢP ĐỒNG CHO THUÊ PHÒNG TRỌ VÀ CĂN HỘ DỊCH VỤ
                </h5>
                <p className="font-mono text-slate-400 text-xs">Mã HĐ: {selectedContract.id}</p>
              </div>

              <div className="space-y-2">
                <strong className="text-[#0F223A] block font-bold">BÊN CHO THUÊ (BÊN A):</strong>
                <p>Đại diện: <strong>{selectedContract.landlordName}</strong></p>
                <p>Hệ thống: Mạng lưới căn hộ dịch vụ &amp; phòng trọ cao cấp Elite Living</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <strong className="text-[#0F223A] block font-bold">BÊN THUÊ PHÒNG (BÊN B):</strong>
                <p>Họ và tên: <strong>{selectedContract.tenantName}</strong></p>
                <p>Số điện thoại: <strong>{selectedContract.tenantPhone}</strong></p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <strong className="text-[#0F223A] block font-bold">ĐIỀU KHOẢN HỢP ĐỒNG:</strong>
                <p>1. Phòng thuê: <strong>{selectedContract.roomTitle}</strong></p>
                <p>2. Giá thuê hàng tháng: <strong className="text-[#0F223A] font-bold text-sm">{selectedContract.monthlyRent.toLocaleString('vi-VN')} đ/tháng</strong></p>
                <p>3. Tiền cọc an ninh đảm bảo: <strong className="text-amber-600 font-bold text-sm">{selectedContract.depositAmount.toLocaleString('vi-VN')} đ</strong></p>
                <p>4. Thời hạn hợp đồng: Từ ngày <strong>{selectedContract.startDate}</strong> đến hết ngày <strong>{selectedContract.endDate}</strong></p>
                <p>5. Trạng thái pháp lý: <strong>{selectedContract.status === 'ACTIVE' ? 'Đang có hiệu lực' : 'Đã kết thúc/Thanh lý'}</strong></p>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 text-center font-bold text-slate-800">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Đại diện Bên A</p>
                  <div className="h-14 flex items-center justify-center text-[#8C6D37] italic">
                    (Đã ký xác thực điện tử)
                  </div>
                  <p>{selectedContract.landlordName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Đại diện Bên B</p>
                  <div className="h-14 flex items-center justify-center text-[#8C6D37] italic">
                    (Đã ký xác thực qua OTP)
                  </div>
                  <p>{selectedContract.tenantName}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#F8F8F6] border-t border-[#E5E3DE] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#0F223A] text-white rounded-xl text-sm font-bold inline-flex items-center gap-1.5 hover:bg-slate-800 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In hợp đồng</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedContract(null)}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-xl text-sm font-bold hover:bg-slate-300 cursor-pointer"
              >
                Đóng
              </button>
            </div>
        </>)}
      </AdminPanel>

      {/* ======================================================== */}
      {/* MODAL: VIEW BUILDING DETAILS */}
      {/* ======================================================== */}
      <AdminPanel open={Boolean(selectedBuilding)} onClose={() => setSelectedBuilding(null)} title={selectedBuilding?.name || 'Chi tiết khu trọ'} subtitle="Thông tin vị trí, giá thuê và chủ trọ">
        {selectedBuilding && (<>
            <div className="space-y-4 text-sm text-slate-700">
              <div>
                <span className="font-mono text-[#8C6D37] font-bold block">{selectedBuilding.code}</span>
                <p className="text-sm font-bold text-[#0F223A] mt-0.5">{selectedBuilding.address}</p>
                <p className="text-slate-500 mt-0.5">{selectedBuilding.district}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-[#F8F8F6] rounded-xl border border-[#E5E3DE] font-medium">
                <div>
                  <span className="text-slate-400 text-xs block">TỌA ĐỘ GPS</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedBuilding.lat != null || selectedBuilding.latitude != null ? Number(selectedBuilding.lat ?? selectedBuilding.latitude).toFixed(5) : '—'}, {' '}
                    {selectedBuilding.lng != null || selectedBuilding.longitude != null ? Number(selectedBuilding.lng ?? selectedBuilding.longitude).toFixed(5) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block">GIÁ SÀN THUÊ</span>
                  <span className="font-bold text-[#0F223A]">
                    {Number(selectedBuilding.base_price ?? selectedBuilding.min_price ?? 0).toLocaleString('vi-VN')} đ/tháng
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block">CHỦ TRỌ QUẢN LÝ</span>
                  <span className="font-bold text-[#0F223A]">{selectedBuilding.landlord_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block">HOTLINE CHỦ TRỌ</span>
                  <a href={`tel:${selectedBuilding.landlord_phone}`} className="font-bold text-[#8C6D37]">
                    {selectedBuilding.landlord_phone}
                  </a>
                </div>
              </div>

              <div>
                <span className="font-bold text-[#0F223A] block mb-1.5">Tiện ích tích hợp sẵn:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedBuilding.amenities.map((a) => (
                    <span key={a} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#F8F8F6] border-t border-[#E5E3DE] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBuilding(null)}
                className="px-4 py-2 bg-[#0F223A] text-white rounded-xl text-sm font-bold hover:bg-slate-800 cursor-pointer"
              >
                Đóng
              </button>
            </div>
        </>)}
      </AdminPanel>

      {/* ======================================================== */}
      {/* MODAL: ADD NEW USER */}
      {/* ======================================================== */}
      <AdminPanel open={Boolean(isAddUserOpen)} onClose={() => { if (!creatingUser) setIsAddUserOpen(false); }} title={'Thêm tài khoản'} subtitle="Điền thông tin và chọn quyền truy cập phù hợp">
        {isAddUserOpen && (<>
            <form onSubmit={handleCreateUser} className="space-y-4 text-sm">
              {createUserError && <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800">{createUserError}</p>}
              <fieldset disabled={creatingUser} className="space-y-4">
              <div>
                <label htmlFor="admin-user-name" className="block font-bold text-slate-700 mb-1">Họ và tên người dùng:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hoàng Tuấn Kiệt"
                  id="admin-user-name" value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl outline-hidden focus:border-[#B89C66] bg-white"
                />
              </div>

              <div>
                <label htmlFor="admin-user-email" className="block font-bold text-slate-700 mb-1">Email:</label>
                <input
                  type="email"
                  required
                  placeholder="kiet.hoang@student.huit.edu.vn"
                  id="admin-user-email" value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl outline-hidden focus:border-[#B89C66] bg-white"
                />
              </div>

              <div>
                <label htmlFor="admin-user-phone" className="block font-bold text-slate-700 mb-1">Số điện thoại liên lạc:</label>
                <input
                  type="tel"
                  required
                  placeholder="0912345678"
                  id="admin-user-phone" value={newUserData.phone}
                  onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl outline-hidden focus:border-[#B89C66] bg-white"
                />
              </div>

              <div>
                <label htmlFor="admin-user-role" className="block font-bold text-slate-700 mb-1">Phân quyền vai trò:</label>
                <select
                  id="admin-user-role" value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E3DE] rounded-xl outline-hidden focus:border-[#B89C66] bg-white font-semibold"
                >
                  <option value="TENANT">Người thuê</option>
                  <option value="LANDLORD">Chủ trọ</option>
                  <option value="ADMIN">Quản trị viên</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] rounded-xl font-bold transition-colors cursor-pointer shadow-xs"
                >
                  {creatingUser ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
                </button>
              </div>
              </fieldset>
            </form>
        </>)}
      </AdminPanel>

      {/* ======================================================== */}
      {/* MODAL: CONTRACT LEGAL & HOUSE RULES REVIEW               */}
      {/* ======================================================== */}
      {selectedContract && !showContractSummary && (
        <ContractLegalModal
          contract={{
            id: selectedContract.id,
            room_id: selectedContract.roomId,
            room_title: selectedContract.roomTitle,
            tenant_name: selectedContract.tenantName,
            tenant_phone: selectedContract.tenantPhone,
            landlord_name: selectedContract.landlordName,
            start_date: selectedContract.startDate,
            end_date: selectedContract.endDate,
            monthly_rent: selectedContract.monthlyRent,
            deposit_amount: selectedContract.depositAmount,
            status: selectedContract.status,
            created_at: new Date().toISOString(),
          }}
          onClose={() => setSelectedContract(null)}
          landlordPhone={rooms.find((room) => room.id === selectedContract.roomId)?.landlordPhone || ''}
        />
      )}
    </div>
  );
}
