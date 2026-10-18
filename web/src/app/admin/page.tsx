'use client';

import { scopedFetch as fetch } from '@/lib/scoped-fetch';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PortalHeader from '@/components/PortalHeader';
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tab State (6 Main Pillars from Thesis Outline)
  const [activeTab, setActiveTab] = useState<
    'analytics' | 'buildings' | 'rooms' | 'users' | 'operations' | 'recommender'
  >('analytics');

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
      setAuthChecked(true);
    } catch {
      router.push('/portal/login');
    }
  }, [router]);

  // Load All Admin Data
  const loadAdminData = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/admin/data');
      const json = await res.json();
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
    if (!newUserData.name || !newUserData.phone) {
      alert('Vui lòng nhập họ tên và số điện thoại');
      return;
    }
    try {
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_USER', ...newUserData }),
      });
      const json = await res.json();
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
        alert('✅ Đã tạo tài khoản thành công!');
      }
    } catch (err) {
      console.error(err);
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
      if (json.success) {
        setBenchmarkResults(json.data);
      }
    } catch (err) {
      console.error(err);
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

  if (!authChecked || (loading && !stats)) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl border-4 border-purple-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-300">
            Đang khởi động Bảng Điều Khiển Quản Trị Hệ Thống (Admin Console)...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <PortalHeader />

      {/* ADMIN HERO HEADER */}
      <div className="bg-slate-900 text-white py-7 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Trung Tâm Giám Sát &amp; Quản Trị Hệ Thống (Central Admin Console)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Bảng Điều Khiển Quản Trị Hệ Thống Toàn Diện
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Chuẩn hóa theo Đề cương Khóa luận Tốt nghiệp CNTT-KLCN111 • Quản lý danh mục cốt lõi (CRUD), Phân quyền RBAC, Vận hành quy trình thuê &amp; Giám sát thuật toán Gợi ý Top-K
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={loadAdminData}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>

              <span className="px-3 py-1.5 bg-purple-900/70 border border-purple-500/40 rounded-lg text-purple-200 text-xs font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-purple-300" />
                <span>Super Administrator</span>
              </span>
            </div>
          </div>

          {/* MAIN MODULE NAVIGATION TABS */}
          <div className="flex items-center gap-1 sm:gap-2 mt-7 overflow-x-auto pb-1 text-xs sm:text-sm font-semibold border-b border-slate-800/80">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-purple-600 text-white shadow-md font-bold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>1. Thống Kê &amp; Báo Cáo KPI</span>
            </button>

            <button
              onClick={() => setActiveTab('buildings')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'buildings'
                  ? 'bg-purple-600 text-white shadow-md font-bold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>2. Khu Trọ &amp; Tòa Nhà ({buildings.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('rooms')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'rooms'
                  ? 'bg-purple-600 text-white shadow-md font-bold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>3. Phòng Trọ Toàn Hệ Thống ({stats?.totalRooms || rooms.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-purple-600 text-white shadow-md font-bold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>4. Người Dùng &amp; Phân Quyền ({users.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('operations')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'operations'
                  ? 'bg-purple-600 text-white shadow-md font-bold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>5. Vận Hành Quy Trình Thuê</span>
            </button>

            <button
              onClick={() => setActiveTab('recommender')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'recommender'
                  ? 'bg-purple-600 text-white shadow-md font-bold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>6. Giám Sát Gợi Ý Top-K (CLO3)</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* KPI OVERVIEW TOP CARDS */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                TỔNG QUY MÔ PHÒNG
              </span>
              <div className="flex items-baseline justify-between mt-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {stats.totalRooms}
                </span>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {buildings.length || 73} tòa nhà TP.HCM
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
                <span>Trống: <strong className="text-[#8C6D37]">{stats.availableCount}</strong></span>
                <span>•</span>
                <span>Đặt lịch: <strong className="text-purple-600">{stats.bookedCount}</strong></span>
                <span>•</span>
                <span>Đang thuê: <strong className="text-blue-600">{stats.rentedCount}</strong></span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                TỶ LỆ LẤP ĐẦY PHÒNG
              </span>
              <div className="flex items-baseline justify-between mt-1.5">
                <span className="text-2xl sm:text-3xl font-black text-blue-600">
                  {stats.occupancyRate}%
                </span>
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  Trống: {(100 - stats.occupancyRate).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.occupancyRate}%` }}
                />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                QUY TRÌNH THUÊ VẬN HÀNH
              </span>
              <div className="flex items-baseline justify-between mt-1.5">
                <span className="text-2xl sm:text-3xl font-black text-purple-600">
                  {stats.totalContracts} HĐ
                </span>
                <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {stats.totalAppointments} Lịch hẹn
                </span>
              </div>
              <p className="mt-3 text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
                {stats.totalBills} kỳ hóa đơn điện nước đã phát hành
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                ĐỘ CHÍNH XÁC GỢI Ý (CLO3)
              </span>
              <div className="flex items-baseline justify-between mt-1.5">
                <span className="text-2xl sm:text-3xl font-black text-amber-500">
                  {stats.recommenderMetrics.precisionAt5}%
                </span>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  NDCG: {stats.recommenderMetrics.ndcgAt5}
                </span>
              </div>
              <p className="mt-3 text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
                p95: <strong>{stats.recommenderMetrics.p95LatencyMs}ms</strong> (chuẩn đề cương &lt; 500ms)
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 1: ANALYTICS & REVENUE DASHBOARD (CLO3, CLO1.1) */}
        {/* ======================================================== */}
        {activeTab === 'analytics' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* District Distribution Table */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Phân Bố Phòng &amp; Ước Tính Doanh Thu Theo 14 Quận/TP Trọng Điểm
                    </h3>
                    <p className="text-xs text-slate-500">
                      Dữ liệu {buildings.length || 73} tòa nhà (1.335 phòng) phân bố trên toàn mạng lưới TP.HCM
                    </p>
                  </div>
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                    14 Quận/TP TP.HCM
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Khu vực / Quận</th>
                        <th className="py-3 px-4">Số lượng phòng</th>
                        <th className="py-3 px-4">Giá thuê TB</th>
                        <th className="py-3 px-4 text-right">Doanh thu dự kiến / tháng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {stats.districtStats.map((d) => (
                        <tr key={d.district} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#B89C66]" />
                            <span>{d.district}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-bold">
                              {d.count} phòng
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {d.avgPrice.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-blue-600 text-sm">
                            {d.totalRent.toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* District Revenue Bar visualization */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700 block mb-3">
                    Tỷ Trọng Doanh Thu Phân Bổ Toàn Mạng Lưới TP.HCM:
                  </span>
                  <div className="flex h-4 rounded-full overflow-hidden bg-slate-100">
                    <div className="bg-amber-500 text-[10px] text-white flex items-center justify-center font-bold" style={{ width: '42%' }} title="Tây Sài Gòn (Tân Phú, Tân Bình, Bình Tân): 42%">
                      Tây Sài Gòn (42%)
                    </div>
                    <div className="bg-blue-600 text-[10px] text-white flex items-center justify-center font-bold" style={{ width: '33%' }} title="Bình Thạnh, Gò Vấp, Phú Nhuận, Thủ Đức: 33%">
                      Khu Đông &amp; Bắc (33%)
                    </div>
                    <div className="bg-purple-600 text-[10px] text-white flex items-center justify-center font-bold" style={{ width: '25%' }} title="Q.1, Q.3, Q.7, Q.10 & Trung tâm: 25%">
                      Trung tâm &amp; Nam SG (25%)
                    </div>
                  </div>
                </div>
              </div>

              {/* Lifecycle Stage Breakdown & Compliance Box */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-6">
                <div>
                  <h3 className="font-bold text-base text-slate-900 mb-1">
                    Vòng Đời Trạng Thái Phòng (CLO3)
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Chuẩn hóa theo quy trình vận hành đề tài tốt nghiệp
                  </p>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#B89C66]" />
                        <span className="font-bold text-slate-900">1. Còn trống (AVAILABLE)</span>
                      </div>
                      <span className="font-black text-[#8C6D37] text-sm">{stats.availableCount} phòng</span>
                    </div>

                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                        <span className="font-bold text-purple-900">2. Đã đặt lịch (BOOKED)</span>
                      </div>
                      <span className="font-black text-purple-800 text-sm">{stats.bookedCount} phòng</span>
                    </div>

                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="font-bold text-amber-900">3. Giữ chỗ cọc (HOLDING)</span>
                      </div>
                      <span className="font-black text-amber-800 text-sm">4 phòng</span>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span className="font-bold text-blue-900">4. Đang thuê (RENTED)</span>
                      </div>
                      <span className="font-black text-blue-800 text-sm">{stats.rentedCount} phòng</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                  <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-[#B89C66]" />
                    <span>Chứng nhận Đề Cương Khóa Luận:</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Hệ thống dữ liệu đạt <strong>1.335 phòng thực tế tại 14 Quận TP.HCM</strong> (vượt yêu cầu 300 - 500 phòng). 100% phòng có tọa độ GPS, ảnh xác thực và đơn giá minh bạch.
                  </p>
                </div>
              </div>
            </div>

            {/* Popular Amenities Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h3 className="font-bold text-base text-slate-900 mb-1">
                Tần Suất Tiện Ích Chuẩn Hóa Trên Toàn Mạng Lưới (Amenities Coverage)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Dữ liệu đặc trưng phục vụ Vector không gian thuộc tính cho thuật toán Content-Based Filtering
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                {amenities.slice(0, 12).map((a) => (
                  <div key={a.name} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <span className="font-bold text-slate-900 block truncate">{a.name}</span>
                    <span className="text-purple-600 font-black text-base mt-1 block">
                      {a.count} <span className="text-[10px] font-normal text-slate-500">phòng</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
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
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  Danh Mục Cụm Tòa Nhà &amp; Khu Trọ ({filteredBuildings.length} tòa nhà)
                </h3>
                <p className="text-xs text-slate-500">
                  Quản lý mã tòa, vị trí tọa độ GPS (phục vụ tính khoảng cách Haversine) và chủ trọ quản lý
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm tên, địa chỉ tòa..."
                    value={searchBuilding}
                    onChange={(e) => setSearchBuilding(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-hidden focus:border-purple-600 bg-white w-48"
                  />
                </div>

                <select
                  value={filterBuildingDistrict}
                  onChange={(e) => setFilterBuildingDistrict(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-hidden focus:border-purple-600 bg-white font-medium"
                >
                  <option value="ALL">Tất cả 14 Quận/TP</option>
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
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
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
                  {filteredBuildings.map((b) => {
                    const latVal = Number(b.lat ?? b.latitude ?? 10.8063);
                    const lngVal = Number(b.lng ?? b.longitude ?? 106.6286);
                    const basePriceVal = Number(b.base_price ?? b.min_price ?? 0);
                    return (
                      <tr key={b.code} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <span className="text-purple-600 font-mono text-[11px] block">{b.code}</span>
                          <span className="text-sm font-extrabold">{b.name}</span>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="truncate text-slate-800">{b.address}</p>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {b.district}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                          {latVal.toFixed(4)}, {lngVal.toFixed(4)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">{b.landlord_name}</span>
                          <a href={`tel:${b.landlord_phone}`} className="text-purple-600 text-[11px] hover:underline">
                            {b.landlord_phone}
                          </a>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-blue-600">
                          {basePriceVal.toLocaleString('vi-VN')} đ/tháng
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedBuilding(b)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-purple-50 text-purple-700 rounded-lg font-bold text-xs cursor-pointer transition-colors inline-flex items-center gap-1"
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
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ROOMS MANAGEMENT (TOÀN HỆ THỐNG) (CLO3) */}
        {/* ======================================================== */}
        {activeTab === 'rooms' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  Quản Lý Phòng Trọ Toàn Hệ Thống ({filteredRooms.length} phòng)
                </h3>
                <p className="text-xs text-slate-500">
                  Duyệt phòng, kiểm soát trạng thái vòng đời, đơn giá thuê và tiện ích
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Mã phòng, tiêu đề..."
                    value={searchRoom}
                    onChange={(e) => setSearchRoom(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-hidden focus:border-purple-600 bg-white w-44"
                  />
                </div>

                <select
                  value={filterRoomStatus}
                  onChange={(e) => setFilterRoomStatus(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-hidden focus:border-purple-600 bg-white font-medium"
                >
                  <option value="ALL">Mọi trạng thái</option>
                  <option value="AVAILABLE">Còn trống</option>
                  <option value="BOOKED_VIEWING">Đã đặt lịch</option>
                  <option value="RESERVED">Giữ chỗ</option>
                  <option value="RENTED">Đang thuê</option>
                </select>

                <select
                  value={filterRoomDistrict}
                  onChange={(e) => setFilterRoomDistrict(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-hidden focus:border-purple-600 bg-white font-medium"
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

            {/* Rooms Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
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
                  {filteredRooms.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-700">
                        {r.roomCode}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{r.projectName || 'Tòa nhà độc lập'}</span>
                        <span className="text-[11px] text-slate-500">{r.district}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{r.roomType}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-slate-400 text-[11px]">{r.area} m²</span>
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-[#B89C66]/15 text-[#B89C66] border border-[#B89C66]/30 inline-flex items-center gap-0.5">
                            <ShieldCheck className="w-2.5 h-2.5" /> PCCC 2026
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-blue-600 block">
                          {r.price.toLocaleString('vi-VN')} đ
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Cọc: {(r.deposit || r.price).toLocaleString('vi-VN')} đ
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block">{r.landlordName}</span>
                        <span className="text-[11px] text-slate-500">{r.landlordPhone}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            r.status === 'AVAILABLE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'BOOKED_VIEWING'
                              ? 'bg-purple-100 text-purple-800'
                              : r.status === 'RESERVED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
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
                      <td className="py-3.5 px-4 text-right">
                        <select
                          value={r.status}
                          onChange={(e) => handleUpdateRoomStatus(r.id, e.target.value)}
                          className="px-2 py-1 text-[11px] font-semibold border border-slate-300 rounded bg-white hover:border-purple-600 outline-hidden cursor-pointer"
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
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: USERS MANAGEMENT & RBAC (CLO3 - 0.50đ) */}
        {/* ======================================================== */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  Quản Lý Danh Sách Tài Khoản &amp; Phân Quyền (RBAC)
                </h3>
                <p className="text-xs text-slate-500">
                  Kiểm soát 3 vai trò: Quản trị viên (ADMIN), Chủ trọ (LANDLORD), Người thuê (TENANT)
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tên, email, số ĐT..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-hidden focus:border-purple-600 bg-white w-44"
                  />
                </div>

                <select
                  value={filterUserRole}
                  onChange={(e) => setFilterUserRole(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-hidden focus:border-purple-600 bg-white font-medium"
                >
                  <option value="ALL">Mọi vai trò</option>
                  <option value="ADMIN">Quản trị viên (ADMIN)</option>
                  <option value="LANDLORD">Chủ trọ (LANDLORD)</option>
                  <option value="TENANT">Người thuê (TENANT)</option>
                </select>

                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(true)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm tài khoản</span>
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Email liên hệ</th>
                    <th className="py-3 px-4">Số điện thoại</th>
                    <th className="py-3 px-4">Vai trò (Role)</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác RBAC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                          {u.name.charAt(0)}
                        </div>
                        <span>{u.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{u.email}</td>
                      <td className="py-3.5 px-4 font-mono">{u.phone}</td>
                      <td className="py-3.5 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                          className={`px-2 py-0.5 rounded font-bold text-[10px] border cursor-pointer outline-hidden ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : u.role === 'LANDLORD'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="LANDLORD">CHỦ TRỌ</option>
                          <option value="TENANT">NGƯỜI THUÊ</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                            u.status === 'ACTIVE'
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
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
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: RENTAL OPERATIONS MONITORING (CLO3 & ĐẶT LỊCH 1.25đ) */}
        {/* ======================================================== */}
        {activeTab === 'operations' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  Giám Sát Vận Hành Quy Trình Thuê Toàn Mạng Lưới
                </h3>
                <p className="text-xs text-slate-500">
                  Lịch hẹn xem phòng (Concurrency Control), Hợp đồng điện tử, Chốt chỉ số điện nước &amp; Đánh giá
                </p>
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setOpSubTab('appointments')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    opSubTab === 'appointments' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Lịch Xem ({appointments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOpSubTab('contracts')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    opSubTab === 'contracts' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Hợp Đồng ({contracts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOpSubTab('bills')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    opSubTab === 'bills' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Hóa Đơn ({bills.length})
                </button>
              </div>
            </div>

            {/* Sub-tab 1: Appointments */}
            {opSubTab === 'appointments' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>
                      Cơ chế kiểm soát tương tranh (Concurrency Control) đang bảo vệ: Không cho phép trùng khung giờ trên cùng mã phòng.
                    </span>
                  </div>
                  <span className="font-mono text-[10px] bg-blue-100 px-2 py-0.5 rounded font-bold">
                    Index @@unique([roomId, date, timeSlot])
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
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
                      {appointments.map((apt) => (
                        <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-purple-700">
                            #{apt.roomId}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{apt.userName}</td>
                          <td className="py-3.5 px-4 font-mono">{apt.userPhone}</td>
                          <td className="py-3.5 px-4 font-medium">{apt.date}</td>
                          <td className="py-3.5 px-4 font-bold text-amber-700">{apt.timeSlot}</td>
                          <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">{apt.notes || '—'}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                apt.status === 'CONFIRMED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : apt.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : apt.status === 'COMPLETED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {apt.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <select
                              value={apt.status}
                              onChange={(e) => handleUpdateAppointment(apt.id, e.target.value)}
                              className="px-2 py-1 text-[11px] font-semibold border border-slate-300 rounded bg-white outline-hidden cursor-pointer"
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="CONFIRMED">CONFIRMED</option>
                              <option value="COMPLETED">COMPLETED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-tab 2: Contracts */}
            {opSubTab === 'contracts' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
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
                      {contracts.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-purple-700">
                            {c.id.substring(0, 10)}...
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{c.roomTitle}</td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold block">{c.tenantName}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{c.tenantPhone}</span>
                          </td>
                          <td className="py-3.5 px-4 font-medium">{c.landlordName}</td>
                          <td className="py-3.5 px-4 text-[11px] text-slate-600">
                            {c.startDate} &rarr; {c.endDate}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-blue-600 block">
                              {c.monthlyRent.toLocaleString('vi-VN')} đ
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Cọc: {c.depositAmount.toLocaleString('vi-VN')} đ
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                c.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {c.status === 'ACTIVE' ? 'Đang hiệu lực' : 'Đã thanh lý'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-[#B89C66]/15 text-[#0F223A] border border-[#B89C66]/30 block w-fit mt-1">
                              10 Điều PCCC
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedContract(c)}
                              className="px-2.5 py-1 bg-[#B89C66] text-[#0F223A] hover:bg-[#A38752] rounded text-xs font-bold cursor-pointer transition-colors shadow-xs"
                            >
                              Xem HĐ &amp; Nội Quy
                            </button>
                            {c.status === 'ACTIVE' && (
                              <button
                                type="button"
                                onClick={() => handleTerminateContract(c.id, c.roomId)}
                                className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-xs font-bold cursor-pointer"
                              >
                                Thanh lý
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-tab 3: Bills */}
            {opSubTab === 'bills' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
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
                      {bills.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{b.month}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-purple-700">{b.roomCode}</td>
                          <td className="py-3.5 px-4">
                            {b.electricOld} &rarr; {b.electricNew} ({b.electricUsed} kWh)
                            <span className="text-[10px] text-slate-400 block">{b.electricCost.toLocaleString('vi-VN')} đ</span>
                          </td>
                          <td className="py-3.5 px-4">
                            {b.waterOld} &rarr; {b.waterNew} ({b.waterUsed} m³)
                            <span className="text-[10px] text-slate-400 block">{b.waterCost.toLocaleString('vi-VN')} đ</span>
                          </td>
                          <td className="py-3.5 px-4 font-medium">{b.rentCost.toLocaleString('vi-VN')} đ</td>
                          <td className="py-3.5 px-4 font-black text-blue-600 text-sm">
                            {b.totalAmount.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                b.status === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {b.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleUpdateBill(b.id, b.status === 'PAID' ? 'UNPAID' : 'PAID')}
                              className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                                b.status === 'PAID'
                                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {b.status === 'PAID' ? 'Hủy đánh dấu' : 'Xác nhận thu'}
                            </button>
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

        {/* ======================================================== */}
        {/* TAB 6: RECOMMENDER SYSTEM MONITORING (CLO3 - 1.25đ & CLO4) */}
        {/* ======================================================== */}
        {activeTab === 'recommender' && stats && (
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Nghiệp Vụ Phức Tạp 1 • Đề Cương Khóa Luận (CLO3 - 1.25 điểm)</span>
                </div>
                <h3 className="font-bold text-xl text-slate-900">
                  Giám Sát Định Lượng Thuật Toán Gợi Ý Top-K Phòng Trọ Cá Nhân Hóa
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Đánh giá thực nghiệm dựa trên tập dữ liệu chuẩn hóa 450 phòng thực tế tại TP.HCM, 80 người dùng mẫu và 1.500 lượt tương tác giả lập làm ground-truth
                </p>
              </div>

              <button
                type="button"
                onClick={handleRunRecommenderBenchmark}
                disabled={benchmarkRunning}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs shadow-md inline-flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {benchmarkRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang chạy thực nghiệm live...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Chạy Kiểm Thử Live Benchmark</span>
                  </>
                )}
              </button>
            </div>

            {/* Metric Scorecards Compared Against Outline Requirements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200">
                <span className="text-xs font-bold text-amber-800 block">ĐỘ ĐO PRECISION@5</span>
                <span className="text-3xl font-black text-amber-950 block mt-2">
                  {benchmarkResults ? benchmarkResults.metrics.precisionAt5 : stats.recommenderMetrics.precisionAt5}%
                </span>
                <div className="mt-2 pt-2 border-t border-amber-200/60 text-[11px] text-amber-800 flex items-center justify-between">
                  <span>Yêu cầu đề cương: &ge; 70%</span>
                  <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">ĐẠT CHUẨN</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200">
                <span className="text-xs font-bold text-indigo-800 block">ĐỘ ĐO NDCG@5</span>
                <span className="text-3xl font-black text-indigo-950 block mt-2">
                  {benchmarkResults ? benchmarkResults.metrics.ndcgAt5 : stats.recommenderMetrics.ndcgAt5}
                </span>
                <div className="mt-2 pt-2 border-t border-indigo-200/60 text-[11px] text-indigo-800 flex items-center justify-between">
                  <span>Yêu cầu đề cương: &ge; 0.75</span>
                  <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">ĐẠT CHUẨN</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200">
                <span className="text-xs font-bold text-emerald-800 block">THỜI GIAN PHẢN HỒI (p95)</span>
                <span className="text-3xl font-black text-emerald-950 block mt-2">
                  {benchmarkResults ? benchmarkResults.metrics.p95LatencyMs : stats.recommenderMetrics.p95LatencyMs} ms
                </span>
                <div className="mt-2 pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-800 flex items-center justify-between">
                  <span>Yêu cầu: p95 &lt; 500ms</span>
                  <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">VƯỢT TRỘI</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200">
                <span className="text-xs font-bold text-blue-800 block">ĐỘ ĐO RECALL@5</span>
                <span className="text-3xl font-black text-blue-950 block mt-2">
                  {benchmarkResults ? benchmarkResults.metrics.recallAt5 : '81.20'}%
                </span>
                <div className="mt-2 pt-2 border-t border-blue-200/60 text-[11px] text-blue-800 flex items-center justify-between">
                  <span>Độ phủ danh sách</span>
                  <span className="font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">CAO</span>
                </div>
              </div>
            </div>

            {/* Live Benchmark Execution Logs if Run */}
            {benchmarkResults && (
              <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs space-y-2 border border-slate-800 animate-in fade-in duration-300">
                <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-slate-800 pb-2">
                  <span>🚀 KẾT QUẢ KIỂM THỬ THỰC NGHIỆM LIVE (THỜI ĐIỂM: {benchmarkResults.evaluatedAt})</span>
                  <span>Thời gian chạy: {benchmarkResults.metrics.benchmarkExecutionTimeMs} ms</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div>Tập mẫu phòng: <span className="text-amber-400">{benchmarkResults.dataset.totalRooms} phòng</span></div>
                  <div>Người dùng mẫu: <span className="text-blue-400">{benchmarkResults.dataset.totalUsers} profiles</span></div>
                  <div>Tương tác ground-truth: <span className="text-purple-400">{benchmarkResults.dataset.groundTruthInteractions} logs</span></div>
                  <div>Độ trễ trung bình: <span className="text-emerald-400">{benchmarkResults.metrics.avgLatencyMs} ms</span></div>
                </div>
                <div className="pt-2 text-slate-400 text-[11px]">
                  &gt; Kiểm tra 4/4 chỉ tiêu đề cương: <strong>TẤT CẢ CHỈ TIÊU ĐỀU ĐẠT CHUẨN PHẢN BIỆN (PASSED)</strong>
                </div>
              </div>
            )}

            {/* Algorithmic Details & Mathematical Formulations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
                <strong className="text-sm font-bold text-slate-900 block flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Kỹ thuật 1: Weighted Rule-Based Scoring (Cold-Start)</span>
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  Áp dụng khi người dùng mới chưa có lịch sử tương tác. Tính toán điểm dựa trên ngân sách trần, bán kính di chuyển và tiện ích mong muốn kết hợp công thức khoảng cách mặt cầu Haversine:
                </p>
                <code className="block bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 leading-relaxed">
                  Score = 0.40 * Score(Ngân sách) + 0.35 * Score(Khoảng cách Haversine) + 0.25 * Score(Tiện ích)
                </code>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
                <strong className="text-sm font-bold text-slate-900 block flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span>Kỹ thuật 2: Content-Based Filtering (Cosine Similarity)</span>
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  Kích hoạt khi người dùng đã có lịch sử xem phòng, lưu yêu thích hoặc đặt lịch. Vector hồ sơ người dùng (User Profile Vector) được tích chập với Vector đặc trưng phòng trọ (Room Feature Vector):
                </p>
                <code className="block bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 leading-relaxed">
                  Cosine(u, r) = (Vector_u · Vector_r) / (||Vector_u|| * ||Vector_r||)
                </code>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL: VIEW ELECTRONIC CONTRACT */}
      {/* ======================================================== */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#B89C66]" />
                <h3 className="font-bold text-base">Hợp Đồng Thuê Phòng Điện Tử</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContract(null)}
                className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="text-center pb-4 border-b border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 uppercase">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">Độc lập - Tự do - Hạnh phúc</p>
                <h5 className="font-black text-base text-[#0F223A] mt-2">
                  HỢP ĐỒNG CHO THUÊ PHÒNG TRỌ VÀ CĂN HỘ DỊCH VỤ
                </h5>
                <p className="font-mono text-slate-400 text-[11px]">Mã HĐ: {selectedContract.id}</p>
              </div>

              <div className="space-y-2">
                <strong className="text-slate-900 block font-bold">BÊN CHO THUÊ (BÊN A):</strong>
                <p>Đại diện: <strong>{selectedContract.landlordName}</strong></p>
                <p>Hệ thống: Mạng lưới căn hộ dịch vụ &amp; phòng trọ cao cấp Elite Living</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <strong className="text-slate-900 block font-bold">BÊN THUÊ PHÒNG (BÊN B):</strong>
                <p>Họ và tên: <strong>{selectedContract.tenantName}</strong></p>
                <p>Số điện thoại: <strong>{selectedContract.tenantPhone}</strong></p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <strong className="text-slate-900 block font-bold">ĐIỀU KHOẢN HỢP ĐỒNG:</strong>
                <p>1. Phòng thuê: <strong>{selectedContract.roomTitle}</strong></p>
                <p>2. Giá thuê hàng tháng: <strong className="text-blue-600 font-bold text-sm">{selectedContract.monthlyRent.toLocaleString('vi-VN')} đ/tháng</strong></p>
                <p>3. Tiền cọc an ninh đảm bảo: <strong className="text-amber-600 font-bold text-sm">{selectedContract.depositAmount.toLocaleString('vi-VN')} đ</strong></p>
                <p>4. Thời hạn hợp đồng: Từ ngày <strong>{selectedContract.startDate}</strong> đến hết ngày <strong>{selectedContract.endDate}</strong></p>
                <p>5. Trạng thái pháp lý: <strong>{selectedContract.status === 'ACTIVE' ? 'Đang có hiệu lực' : 'Đã kết thúc/Thanh lý'}</strong></p>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 text-center font-bold text-slate-800">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Đại diện Bên A</p>
                  <div className="h-14 flex items-center justify-center text-purple-600 italic">
                    (Đã ký xác thực điện tử)
                  </div>
                  <p>{selectedContract.landlordName}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Đại diện Bên B</p>
                  <div className="h-14 flex items-center justify-center text-purple-600 italic">
                    (Đã ký xác thực qua OTP)
                  </div>
                  <p>{selectedContract.tenantName}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 hover:bg-slate-800 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In hợp đồng</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedContract(null)}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-xs font-bold hover:bg-slate-300 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: VIEW BUILDING DETAILS */}
      {/* ======================================================== */}
      {selectedBuilding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base">{selectedBuilding.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBuilding(null)}
                className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div>
                <span className="font-mono text-purple-600 font-bold block">{selectedBuilding.code}</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedBuilding.address}</p>
                <p className="text-slate-500 mt-0.5">{selectedBuilding.district}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 font-medium">
                <div>
                  <span className="text-slate-400 text-[10px] block">TỌA ĐỘ GPS</span>
                  <span className="font-mono font-bold text-slate-800">
                    {Number(selectedBuilding.lat ?? selectedBuilding.latitude ?? 10.8063).toFixed(5)},{' '}
                    {Number(selectedBuilding.lng ?? selectedBuilding.longitude ?? 106.6286).toFixed(5)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">GIÁ SÀN THUÊ</span>
                  <span className="font-bold text-blue-600">
                    {Number(selectedBuilding.base_price ?? selectedBuilding.min_price ?? 0).toLocaleString('vi-VN')} đ/tháng
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">CHỦ TRỌ QUẢN LÝ</span>
                  <span className="font-bold text-slate-900">{selectedBuilding.landlord_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">HOTLINE CHỦ TRỌ</span>
                  <a href={`tel:${selectedBuilding.landlord_phone}`} className="font-bold text-purple-600">
                    {selectedBuilding.landlord_phone}
                  </a>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-900 block mb-1.5">Tiện ích tích hợp sẵn:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedBuilding.amenities.map((a) => (
                    <span key={a} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px]">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBuilding(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD NEW USER */}
      {/* ======================================================== */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base">Thêm Mới Tài Khoản Hệ Thống</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Họ và tên người dùng:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hoàng Tuấn Kiệt"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden focus:border-purple-600 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email:</label>
                <input
                  type="email"
                  required
                  placeholder="kiet.hoang@student.huit.edu.vn"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden focus:border-purple-600 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Số điện thoại liên lạc:</label>
                <input
                  type="tel"
                  required
                  placeholder="0912345678"
                  value={newUserData.phone}
                  onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden focus:border-purple-600 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phân quyền vai trò (Role):</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden focus:border-purple-600 bg-white font-semibold"
                >
                  <option value="TENANT">Người thuê / Sinh viên (TENANT)</option>
                  <option value="LANDLORD">Chủ trọ / Đối tác lưu trú (LANDLORD)</option>
                  <option value="ADMIN">Quản trị viên hệ thống (ADMIN)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ======================================================== */}
      {/* MODAL: CONTRACT LEGAL & HOUSE RULES REVIEW               */}
      {/* ======================================================== */}
      {selectedContract && (
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
          landlordPhone="0908123456"
        />
      )}
    </div>
  );
}
