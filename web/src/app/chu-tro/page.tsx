'use client';

import { scopedFetch as fetch } from '@/lib/scoped-fetch';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PortalHeader from '@/components/PortalHeader';
import { Room, Appointment, Contract, UtilityBill, RoomStatus, AuthSession, LandlordAvailability } from '@/lib/types';
import {
  Building2,
  CalendarCheck,
  Zap,
  FileText,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Droplets,
  Layers,
  Search,
  UserCheck,
  TrendingUp,
  AlertCircle,
  Edit,
  Trash2,
  Printer,
  Eye,
  Phone,
  MessageSquare,
  Sparkles,
  Lock,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Check,
  X,
  ExternalLink,
  ClipboardCheck,
  ShieldAlert,
  Send,
  RotateCcw,
  KeyRound,
  RefreshCw,
  LogOut,
  Mail,
  AlertTriangle,
} from 'lucide-react';
import HandoverManager from '@/components/HandoverManager';
import HouseRulesManager from '@/components/HouseRulesManager';
import ContractLegalModal from '@/components/ContractLegalModal';
import CheckInModal from '@/components/CheckInModal';
import CancelDepositModal from '@/components/CancelDepositModal';
import RenewContractModal from '@/components/RenewContractModal';
import CheckOutModal from '@/components/CheckOutModal';
import PayBillModal from '@/components/PayBillModal';
import EmailNotificationModal from '@/components/EmailNotificationModal';

export default function LandlordPortalPage() {
  const router = useRouter();

  // Authentication & Session
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentLandlordId, setCurrentLandlordId] = useState<string>('landlord_tp_1');

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'overview' | 'rooms' | 'appointments' | 'availability' | 'billing' | 'contracts' | 'rules' | 'handover'>('overview');

  // Core Data State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [availability, setAvailability] = useState<LandlordAvailability | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Searches
  const [roomFilterStatus, setRoomFilterStatus] = useState<string>('ALL');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [aptFilterStatus, setAptFilterStatus] = useState<string>('ALL');
  const [billFilterStatus, setBillFilterStatus] = useState<string>('ALL');

  // Modals state
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<UtilityBill | null>(null);
  const [selectedContractForPrint, setSelectedContractForPrint] = useState<Contract | null>(null);

  // Rental Lifecycle Modals state
  const [selectedRoomForCheckIn, setSelectedRoomForCheckIn] = useState<Room | null>(null);
  const [selectedRoomForCancelDeposit, setSelectedRoomForCancelDeposit] = useState<Room | null>(null);
  const [selectedContractForRenew, setSelectedContractForRenew] = useState<Contract | null>(null);
  const [selectedContractForCheckOut, setSelectedContractForCheckOut] = useState<Contract | null>(null);
  const [selectedBillForPay, setSelectedBillForPay] = useState<UtilityBill | null>(null);
  const [previewEmailNotification, setPreviewEmailNotification] = useState<any | null>(null);
  const [sendingBillId, setSendingBillId] = useState<string | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Billing form state
  const [selectedRoomForBill, setSelectedRoomForBill] = useState<number>(0);
  const [electricOld, setElectricOld] = useState(1200);
  const [electricNew, setElectricNew] = useState(1350);
  const [waterOld, setWaterOld] = useState(40);
  const [waterNew, setWaterNew] = useState(46);

  // Contract form state
  const [selectedRoomForContract, setSelectedRoomForContract] = useState<number>(0);
  const [tenantName, setTenantName] = useState('Trần Văn Minh (Sinh viên K14 HUIT)');
  const [tenantPhone, setTenantPhone] = useState('0908123456');
  const [tenantCitizenId, setTenantCitizenId] = useState('079202008899');
  const [tenantAddress, setTenantAddress] = useState('Xã Phú Hội, Huyện Nhơn Trạch, Tỉnh Đồng Nai');
  const [vehicleCount, setVehicleCount] = useState(1);
  const [contractStartDate, setContractStartDate] = useState('2026-10-01');
  const [contractEndDate, setContractEndDate] = useState('2027-10-01');

  // Room Form State (Create)
  const [newRoomCode, setNewRoomCode] = useState('');
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomPrice, setNewRoomPrice] = useState(4500000);
  const [newRoomDeposit, setNewRoomDeposit] = useState(4500000);
  const [newRoomArea, setNewRoomArea] = useState(28);
  const [newRoomType, setNewRoomType] = useState('Phòng Studio cao cấp');
  const [newRoomAddress, setNewRoomAddress] = useState('140 Lê Trọng Tấn, Tây Thạnh, Quận Tân Phú');
  const [newRoomDistrict, setNewRoomDistrict] = useState('Quận Tân Phú');
  const [newRoomAmenities, setNewRoomAmenities] = useState<string[]>(['Máy lạnh', 'Gác lửng', 'WC riêng', 'Wifi miễn phí', 'Khóa vân tay']);

  // Check authentication on mount
  useEffect(() => {
    const saved = localStorage.getItem('elite_auth_user');
    if (!saved) {
      router.push('/portal/login');
      return;
    }

    try {
      const parsed: AuthSession = JSON.parse(saved);
      if (parsed.role !== 'LANDLORD' && parsed.role !== 'ADMIN') {
        router.push('/portal/login');
        return;
      }
      setSession(parsed);
      setCurrentLandlordId(parsed.landlordId || 'landlord_tp_1');
      setAuthChecked(true);
    } catch {
      router.push('/portal/login');
    }
  }, [router]);

  // Load all landlord data
  const loadLandlordData = async (landlordId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/landlords?landlordId=${landlordId}&type=all`);
      const json = await res.json();
      if (json.success && json.data) {
        setRooms(json.data.rooms || []);
        setAppointments(json.data.appointments || []);
        setBills(json.data.bills || []);
        setContracts(json.data.contracts || []);
        setAvailability(json.data.availability || null);

        // Pre-select first room for billing & contract if available
        if (json.data.rooms && json.data.rooms.length > 0) {
          setSelectedRoomForBill(json.data.rooms[0].id);
          const availableRoom = json.data.rooms.find((r: Room) => r.status !== 'RENTED') || json.data.rooms[0];
          setSelectedRoomForContract(availableRoom.id);
        }
      }
    } catch (err) {
      console.error('Failed to load landlord data:', err);
      showToast('Lỗi khi tải dữ liệu từ máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authChecked && currentLandlordId) {
      loadLandlordData(currentLandlordId);
    }
  }, [authChecked, currentLandlordId]);

  // Landlord switch handler
  const handleLandlordChange = (newLandlordId: string) => {
    setCurrentLandlordId(newLandlordId);
    loadLandlordData(newLandlordId);
    showToast(`Đã chuyển sang quản lý khu trọ của ${newLandlordId}`);
  };

  // Auto-sync previous electric/water meter when choosing room for billing
  useEffect(() => {
    if (!selectedRoomForBill || bills.length === 0) return;
    const roomBills = bills.filter((b) => b.room_id === selectedRoomForBill);
    if (roomBills.length > 0) {
      const latest = roomBills[0];
      setElectricOld(latest.electric_new);
      setElectricNew(latest.electric_new + 140);
      setWaterOld(latest.water_new);
      setWaterNew(latest.water_new + 5);
    } else {
      setElectricOld(1200);
      setElectricNew(1340);
      setWaterOld(40);
      setWaterNew(45);
    }
  }, [selectedRoomForBill, bills]);

  // ============================================================
  // HANDLERS: ROOM MANAGEMENT (CRUD)
  // ============================================================

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        action: 'CREATE_ROOM',
        roomData: {
          landlord_id: currentLandlordId,
          room_code: newRoomCode || `P-${Math.floor(100 + Math.random() * 900)}`,
          title: newRoomTitle || `Căn hộ mini cao cấp ${newRoomCode}`,
          price: Number(newRoomPrice),
          deposit: Number(newRoomDeposit),
          area: Number(newRoomArea),
          room_type: newRoomType,
          address: newRoomAddress,
          district: newRoomDistrict,
          amenities: newRoomAmenities,
          status: 'AVAILABLE',
          electricity_rate: 3800,
          water_rate: 25000,
          internet_fee: 100000,
          service_fee: 150000,
          parking_fee: 120000,
        },
      };

      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setRooms((prev) => [json.data, ...prev]);
        setShowCreateRoomModal(false);
        showToast('✅ Đã khởi tạo phòng trọ mới thành công vào cơ sở dữ liệu!');
        // Reset form
        setNewRoomCode('');
        setNewRoomTitle('');
      } else {
        showToast(json.message || 'Không thể tạo phòng trọ', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateRoomStatus = async (roomId: number, newStatus: RoomStatus) => {
    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_ROOM_STATUS',
          id: roomId,
          status: newStatus,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setRooms((prev) =>
          prev.map((r) => (r.id === roomId ? { ...r, status: newStatus } : r))
        );
        showToast(`Đã cập nhật trạng thái phòng #${roomId} sang "${newStatus}"!`);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSaveEditRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_ROOM',
          id: editingRoom.id,
          roomData: {
            title: editingRoom.title,
            room_code: editingRoom.room_code,
            price: Number(editingRoom.price),
            deposit: Number(editingRoom.deposit),
            area: Number(editingRoom.area),
            status: editingRoom.status,
            address: editingRoom.address,
            amenities: editingRoom.amenities,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setRooms((prev) =>
          prev.map((r) => (r.id === editingRoom.id ? json.data : r))
        );
        setShowEditRoomModal(false);
        setEditingRoom(null);
        showToast('✅ Đã cập nhật thông tin phòng thành công!');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteRoom = async (roomId: number) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa phòng #${roomId}? Hành động này sẽ xóa dữ liệu liên quan.`)) {
      return;
    }

    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_ROOM', id: roomId }),
      });
      const json = await res.json();
      if (json.success) {
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
        showToast('Đã xóa phòng trọ khỏi hệ thống.');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ============================================================
  // HANDLERS: APPOINTMENTS LIFECYCLE
  // ============================================================

  const handleUpdateAppointment = async (id: string, status: Appointment['status']) => {
    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_APPOINTMENT', id, status }),
      });
      const json = await res.json();
      if (json.success) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status } : a))
        );

        // Update local room status accordingly
        const apt = appointments.find((a) => a.id === id);
        if (apt) {
          if (status === 'CONFIRMED') {
            setRooms((prev) =>
              prev.map((r) => (r.id === apt.room_id ? { ...r, status: 'BOOKED_VIEWING' } : r))
            );
            showToast('✅ Đã duyệt lịch hẹn! Phòng tự động chuyển sang "Đã đặt lịch".');
          } else if (status === 'CANCELLED') {
            setRooms((prev) =>
              prev.map((r) => (r.id === apt.room_id ? { ...r, status: 'AVAILABLE' } : r))
            );
            showToast('Đã hủy lịch hẹn. Phòng tự động chuyển về "Còn trống".');
          } else if (status === 'COMPLETED') {
            showToast('Đã ghi nhận khách hoàn thành xem phòng!');
          }
        }
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ============================================================
  // HANDLERS: BILLING
  // ============================================================

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const room = rooms.find((r) => r.id === Number(selectedRoomForBill)) || rooms[0];
    if (!room) return;

    const electricUsed = Math.max(0, electricNew - electricOld);
    const electricCost = electricUsed * (room.electricity_rate || 3800);
    const waterUsed = Math.max(0, waterNew - waterOld);
    const waterCost = waterUsed * (room.water_rate || 25000);
    const internetCost = room.internet_fee || 100000;
    const serviceCost = room.service_fee || 150000;
    const rentCost = room.price;
    const totalAmount = rentCost + electricCost + waterCost + internetCost + serviceCost;

    const currentMonth = `${new Date().getMonth() + 1 < 10 ? '0' : ''}${new Date().getMonth() + 1}/${new Date().getFullYear()}`;

    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_BILL',
          billData: {
            room_id: room.id,
            room_code: room.room_code,
            month: currentMonth,
            electric_old: electricOld,
            electric_new: electricNew,
            electric_used: electricUsed,
            electric_cost: electricCost,
            water_old: waterOld,
            water_new: waterNew,
            water_used: waterUsed,
            water_cost: waterCost,
            internet_cost: internetCost,
            service_cost: serviceCost,
            rent_cost: rentCost,
            total_amount: totalAmount,
            status: 'UNPAID',
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBills((prev) => [json.data, ...prev]);
        showToast('✅ Đã chốt số điện nước và xuất hóa đơn tự động thành công!');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleBillStatus = async (billId: string, currentStatus: 'PAID' | 'UNPAID') => {
    const nextStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID';
    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_BILL_STATUS',
          billId,
          status: nextStatus,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBills((prev) =>
          prev.map((b) => (b.id === billId ? { ...b, status: nextStatus } : b))
        );
        showToast(
          nextStatus === 'PAID'
            ? '✅ Đã ghi nhận thu tiền thành công (PAID)!'
            : 'Đã đổi trạng thái về Chưa thanh toán (UNPAID).'
        );
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ============================================================
  // HANDLERS: CONTRACTS LIFECYCLE
  // ============================================================

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    const room = rooms.find((r) => r.id === Number(selectedRoomForContract)) || rooms[0];
    if (!room) return;

    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_CONTRACT',
          contractData: {
            room_id: room.id,
            room_title: room.title,
            tenant_name: tenantName,
            tenant_phone: tenantPhone,
            tenant_citizen_id: tenantCitizenId,
            tenant_address: tenantAddress,
            vehicle_count: vehicleCount,
            landlord_name: session?.name || 'Nguyễn Văn Hùng',
            start_date: contractStartDate,
            end_date: contractEndDate,
            monthly_rent: room.price,
            deposit_amount: room.deposit || room.price,
            status: 'ACTIVE',
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setContracts((prev) => [json.data, ...prev]);
        setRooms((prev) =>
          prev.map((r) => (r.id === room.id ? { ...r, status: 'RENTED' } : r))
        );
        showToast('✅ Đã ký hợp đồng điện tử thành công! Phòng đã chuyển sang "Đang thuê".');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleTerminateContract = async (contractId: string, roomId: number) => {
    if (!confirm('Bạn có chắc muốn thanh lý hợp đồng này và hoàn trả trạng thái phòng về "Còn trống"?')) {
      return;
    }

    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TERMINATE_CONTRACT',
          contractId,
          roomId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setContracts((prev) =>
          prev.map((c) => (c.id === contractId ? { ...c, status: 'TERMINATED' } : c))
        );
        setRooms((prev) =>
          prev.map((r) => (r.id === roomId ? { ...r, status: 'AVAILABLE' } : r))
        );
        showToast('✅ Đã thanh lý hợp đồng và giải phóng phòng về "Còn trống"!');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSendBillEmail = async (bill: UtilityBill) => {
    setSendingBillId(bill.id);
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'NOTIFY_BILL',
          billId: bill.id,
          tenantName: 'Khách thuê phòng ' + bill.room_code,
          tenantEmail: 'tenant@eliteliving.vn',
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✅ Đã gửi email thông báo hóa đơn tháng ${bill.month} tới khách thuê!`);
        if (json.data) {
          setPreviewEmailNotification(json.data);
        }
      } else {
        showToast(json.message || 'Lỗi gửi email hóa đơn', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSendingBillId(null);
    }
  };

  // ============================================================
  // HANDLERS: AVAILABILITY SLOTS
  // ============================================================

  const handleToggleDay = (day: string) => {
    if (!availability) return;
    const exists = availability.available_days.includes(day);
    const updatedDays = exists
      ? availability.available_days.filter((d) => d !== day)
      : [...availability.available_days, day];

    setAvailability({
      ...availability,
      available_days: updatedDays,
    });
  };

  const handleToggleSlot = (slotId: string) => {
    if (!availability) return;
    const updatedSlots = availability.slots.map((s) =>
      s.id === slotId ? { ...s, enabled: !s.enabled } : s
    );
    setAvailability({
      ...availability,
      slots: updatedSlots,
    });
  };

  const handleSaveAvailability = async () => {
    if (!availability) return;
    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_AVAILABILITY',
          landlordId: currentLandlordId,
          availabilityData: availability,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('✅ Đã lưu cấu hình khung giờ rảnh đón khách thành công!');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Calculations for KPI Dashboard
  const totalRoomsCount = rooms.length;
  const availableRoomsCount = rooms.filter((r) => r.status === 'AVAILABLE').length;
  const bookedRoomsCount = rooms.filter((r) => r.status === 'BOOKED_VIEWING').length;
  const reservedRoomsCount = rooms.filter((r) => r.status === 'RESERVED').length;
  const rentedRoomsCount = rooms.filter((r) => r.status === 'RENTED').length;
  const occupancyPercent = totalRoomsCount > 0
    ? Math.round(((rentedRoomsCount + bookedRoomsCount) / totalRoomsCount) * 100)
    : 0;

  const estimatedMonthlyRevenue = rooms
    .filter((r) => r.status === 'RENTED')
    .reduce((sum, r) => sum + r.price, 0);

  const pendingAppointmentsCount = appointments.filter((a) => a.status === 'PENDING').length;
  const unpaidBillsAmount = bills
    .filter((b) => b.status === 'UNPAID')
    .reduce((sum, b) => sum + b.total_amount, 0);

  // Filtered lists
  const filteredRooms = rooms.filter((r) => {
    if (roomFilterStatus !== 'ALL' && r.status !== roomFilterStatus) return false;
    if (roomSearchQuery) {
      const q = roomSearchQuery.toLowerCase();
      return (
        r.room_code.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredAppointments = appointments.filter((a) => {
    if (aptFilterStatus !== 'ALL' && a.status !== aptFilterStatus) return false;
    return true;
  });

  const filteredBills = bills.filter((b) => {
    if (billFilterStatus !== 'ALL' && b.status !== billFilterStatus) return false;
    return true;
  });

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl border-4 border-[#B89C66] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-300">Đang kiểm tra bảo mật phiên đăng nhập...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900 flex flex-col font-sans">
      {/* ENTERPRISE MANAGEMENT PORTAL HEADER */}
      <PortalHeader
        currentLandlordId={currentLandlordId}
        onLandlordChange={handleLandlordChange}
      />

      {/* TOAST MESSAGE */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 border animate-in slide-in-from-bottom duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-[#0F223A] border-[#B89C66] text-white shadow-xl shadow-black/40'
              : 'bg-rose-900 border-rose-700 text-white'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#B89C66]" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* MAIN SUB-HEADER WITH TABS */}
      <div className="bg-slate-900 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#B89C66] text-xs font-bold uppercase tracking-wider mb-1">
                <Building2 className="w-4 h-4" />
                <span>Khu Trọ Đang Quản Trị: {session?.name || 'Nguyễn Văn Hùng'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
                Trung Tâm Điều Hành &amp; Vận Hành Khu Trọ
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Chuẩn hóa chu trình cho thuê trọ từ đăng tin, tiếp nhận lịch hẹn, kiểm soát tương tranh đến hợp đồng và hóa đơn điện tử
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowCreateRoomModal(true)}
                className="px-3.5 py-2 rounded-xl bg-[#B89C66] hover:bg-[#A88C56] text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Phòng Mới</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('billing')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Chốt Điện Nước</span>
              </button>
            </div>
          </div>

          {/* NAVIGATION TABS */}
          <div className="flex items-center gap-1 mt-6 overflow-x-auto pb-2 text-xs font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-[#B89C66] text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Tổng quan KPI</span>
            </button>

            <button
              onClick={() => setActiveTab('rooms')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'rooms'
                  ? 'bg-[#B89C66] text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Quản lý Phòng ({rooms.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('appointments')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap relative ${
                activeTab === 'appointments'
                  ? 'bg-[#B89C66] text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Lịch hẹn xem ({appointments.length})</span>
              {pendingAppointmentsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse ml-0.5" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('availability')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'availability'
                  ? 'bg-[#B89C66] text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Khung giờ rảnh</span>
            </button>

            <button
              onClick={() => setActiveTab('billing')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'billing'
                  ? 'bg-[#B89C66] text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Điện Nước &amp; Hóa Đơn ({bills.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('contracts')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'contracts'
                  ? 'bg-[#B89C66] text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Hợp đồng điện tử ({contracts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'rules'
                  ? 'bg-[#B89C66] text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Nội quy hợp đồng (PCCC)</span>
              <span className="text-[9px] bg-amber-500/20 text-[#B89C66] border border-[#B89C66]/40 font-extrabold px-1.5 py-0.5 rounded-full uppercase">10 Điều</span>
            </button>

            <button
              onClick={() => setActiveTab('handover')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'handover'
                  ? 'bg-[#B89C66] text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Bàn giao CSVC</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN WORKSPACE CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-[#B89C66] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-semibold">Đang đồng bộ dữ liệu phòng trọ...</p>
          </div>
        ) : (
          <>
            {/* ============================================================ */}
            {/* TAB 1: OVERVIEW & ANALYTICS DASHBOARD                        */}
            {/* ============================================================ */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* KPI Cards Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Tỷ Lệ Lấp Đầy
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-slate-900">{occupancyPercent}%</span>
                        <span className="text-[11px] text-emerald-600 font-bold">
                          {rentedRoomsCount}/{totalRoomsCount} phòng
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${occupancyPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Doanh Thu Tháng Này
                      </span>
                      <div className="mt-1">
                        <span className="text-xl font-black text-blue-600">
                          {estimatedMonthlyRevenue.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-2">
                        {rentedRoomsCount} hợp đồng đang thu tiền
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <DollarSign className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Lịch Hẹn Cần Duyệt
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-amber-600">{pendingAppointmentsCount}</span>
                        <span className="text-[11px] text-slate-500">lịch chờ</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-2">
                        Tổng {appointments.length} lịch hẹn
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <CalendarCheck className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Tiền Điện Nước Chưa Thu
                      </span>
                      <div className="mt-1">
                        <span className="text-xl font-black text-rose-600">
                          {unpaidBillsAmount.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-2">
                        {bills.filter((b) => b.status === 'UNPAID').length} hóa đơn chưa thu
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                      <Zap className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Status Breakdown & Lifecycle Workflow */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Status distribution */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                    <h3 className="text-sm font-bold text-slate-900 mb-1">
                      Cơ Cấu Trạng Thái Phòng
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Vòng đời phòng trọ tự động chuyển hóa theo thời gian thực
                    </p>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3 h-3 rounded-full bg-emerald-500" />
                          <span className="font-semibold text-emerald-950">Còn trống (AVAILABLE)</span>
                        </div>
                        <span className="font-extrabold text-emerald-700">{availableRoomsCount} phòng</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3 h-3 rounded-full bg-amber-500" />
                          <span className="font-semibold text-amber-950">Đã đặt lịch (BOOKED_VIEWING)</span>
                        </div>
                        <span className="font-extrabold text-amber-700">{bookedRoomsCount} phòng</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3 h-3 rounded-full bg-blue-500" />
                          <span className="font-semibold text-blue-950">Giữ chỗ (RESERVED)</span>
                        </div>
                        <span className="font-extrabold text-blue-700">{reservedRoomsCount} phòng</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 border border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3 h-3 rounded-full bg-slate-600" />
                          <span className="font-semibold text-slate-800">Đang thuê (RENTED)</span>
                        </div>
                        <span className="font-extrabold text-slate-900">{rentedRoomsCount} phòng</span>
                      </div>
                    </div>
                  </div>

                  {/* Pending Action Items */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            Công Việc Cần Xử Lý Hôm Nay
                          </h3>
                          <p className="text-xs text-slate-500">
                            Các yêu cầu đặt lịch hẹn mới và hóa đơn cần xác nhận
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-50 text-blue-700">
                          {pendingAppointmentsCount} việc khẩn
                        </span>
                      </div>

                      <div className="space-y-3">
                        {appointments.slice(0, 3).map((apt) => (
                          <div
                            key={apt.id}
                            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold flex-shrink-0">
                                #{apt.room_id}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{apt.user_name}</span>
                                  <span className="text-slate-400">•</span>
                                  <span className="font-semibold text-blue-600">{apt.user_phone}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>{apt.date} ({apt.time_slot})</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 self-end sm:self-center">
                              {apt.status === 'PENDING' ? (
                                <>
                                  <button
                                    onClick={() => handleUpdateAppointment(apt.id, 'CONFIRMED')}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                                  >
                                    Duyệt ngay
                                  </button>
                                  <button
                                    onClick={() => handleUpdateAppointment(apt.id, 'CANCELLED')}
                                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold text-[11px] cursor-pointer"
                                  >
                                    Từ chối
                                  </button>
                                </>
                              ) : (
                                <span className="text-[11px] font-bold text-emerald-600 px-2 py-1 bg-emerald-50 rounded-lg">
                                  Đã xác nhận
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>Thuật toán gợi ý Recommender đang hoạt động tối ưu.</span>
                      <button
                        onClick={() => setActiveTab('appointments')}
                        className="text-[#B89C66] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Xem toàn bộ lịch hẹn ({appointments.length})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB 2: ROOM MANAGEMENT (CRUD)                                */}
            {/* ============================================================ */}
            {activeTab === 'rooms' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Filter and Search Bar */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <div className="relative w-full">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Tìm theo mã phòng, địa chỉ..."
                        value={roomSearchQuery}
                        onChange={(e) => setRoomSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl outline-hidden focus:border-[#B89C66]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
                    <span className="text-slate-400 hidden lg:inline">Trạng thái:</span>
                    {['ALL', 'AVAILABLE', 'BOOKED_VIEWING', 'RESERVED', 'RENTED'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setRoomFilterStatus(st)}
                        className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          roomFilterStatus === st
                            ? 'bg-slate-900 text-white font-bold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st === 'ALL'
                          ? 'Tất cả'
                          : st === 'AVAILABLE'
                          ? 'Còn trống'
                          : st === 'BOOKED_VIEWING'
                          ? 'Đã đặt lịch'
                          : st === 'RESERVED'
                          ? 'Giữ chỗ'
                          : 'Đang thuê'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rooms Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredRooms.map((room) => (
                    <div
                      key={room.id}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group"
                    >
                      <div>
                        {/* Image Banner */}
                        <div className="relative h-44 bg-slate-100 overflow-hidden">
                          <img
                            src={room.images?.[0] || 'https://res.cloudinary.com/dmdfi6nq7/image/upload/v1781103062/room-images/wwif5ftkfoiztzxtorof.webp'}
                            alt={room.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-md">
                            {room.room_code}
                          </div>
                          <div className="absolute top-2.5 right-2.5">
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md shadow-sm ${
                                room.status === 'AVAILABLE'
                                  ? 'bg-slate-800 text-white border border-slate-700'
                                  : room.status === 'BOOKED_VIEWING'
                                  ? 'bg-amber-600 text-white'
                                  : room.status === 'RESERVED'
                                  ? 'bg-[#B89C66] text-white'
                                  : 'bg-[#0F223A] text-white'
                              }`}
                            >
                              {room.status === 'AVAILABLE'
                                ? 'Còn trống'
                                : room.status === 'BOOKED_VIEWING'
                                ? 'Đã đặt lịch'
                                : room.status === 'RESERVED'
                                ? 'Giữ chỗ'
                                : 'Đang thuê'}
                            </span>
                          </div>
                        </div>

                        {/* Room Info */}
                        <div className="p-4">
                          <h4 className="font-bold text-xs text-slate-900 line-clamp-1 group-hover:text-[#B89C66] transition-colors">
                            {room.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {room.address}
                          </p>

                          <div className="mt-3 py-2 border-t border-b border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-500">Giá thuê:</span>
                            <span className="font-black text-slate-900 text-sm">
                              {room.price.toLocaleString('vi-VN')} đ/th
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 mt-2">
                            <span>Diện tích: <strong>{room.area} m²</strong></span>
                            <span>Cọc: <strong>{(room.deposit || room.price).toLocaleString('vi-VN')} đ</strong></span>
                          </div>

                          {/* Quick Lifecycle Action for RESERVED & RENTED */}
                          {room.status === 'RESERVED' && (
                            <div className="mt-3 pt-2.5 border-t border-amber-200/80 bg-amber-50/60 p-2 rounded-xl space-y-1.5">
                              <span className="text-[10px] font-extrabold text-amber-900 uppercase block">
                                Nghiệp vụ Giữ Cọc Chờ Dọn Vào:
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedRoomForCheckIn(room)}
                                className="w-full py-1.5 bg-[#B89C66] hover:bg-[#A38752] text-white rounded-lg font-bold text-[11px] shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Xác Nhận Khách Check-In</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedRoomForCancelDeposit(room)}
                                className="w-full py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Hủy Cọc / Quá Hạn Nhận Phòng</span>
                              </button>
                            </div>
                          )}

                          {room.status === 'RENTED' && (
                            <div className="mt-3 pt-2 border-t border-slate-100 flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRoomForBill(room.id);
                                  setActiveTab('billing');
                                }}
                                className="w-full py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Zap className="w-3 h-3 text-amber-600" />
                                <span>Ghi Số Điện Nước</span>
                              </button>
                            </div>
                          )}

                          {/* Quick Status Selector */}
                          <div className="mt-3 pt-2 border-t border-slate-100">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                              Đổi trạng thái phòng:
                            </label>
                            <select
                              value={room.status}
                              onChange={(e) => handleUpdateRoomStatus(room.id, e.target.value as RoomStatus)}
                              className="w-full text-xs font-semibold py-1 px-2 border border-slate-200 rounded-lg bg-slate-50 outline-hidden"
                            >
                              <option value="AVAILABLE">Còn trống (AVAILABLE)</option>
                              <option value="BOOKED_VIEWING">Đã đặt lịch (BOOKED_VIEWING)</option>
                              <option value="RESERVED">Giữ chỗ (RESERVED)</option>
                              <option value="RENTED">Đang thuê (RENTED)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRoom(room);
                            setShowEditRoomModal(true);
                          }}
                          className="px-2.5 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-md font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteRoom(room.id)}
                          className="px-2 py-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md font-semibold transition-colors cursor-pointer"
                          title="Xóa phòng này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB 3: APPOINTMENTS LIFECYCLE                                */}
            {/* ============================================================ */}
            {activeTab === 'appointments' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Lịch Hẹn Xem Phòng Trực Tuyến
                    </h2>
                    <p className="text-xs text-slate-500">
                      Kiểm soát tương tranh chặt chẽ (Database Concurrency Control), tự động cập nhật trạng thái phòng
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setAptFilterStatus(st)}
                        className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          aptFilterStatus === st
                            ? 'bg-slate-900 text-white font-bold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st === 'ALL'
                          ? 'Tất cả'
                          : st === 'PENDING'
                          ? 'Chờ duyệt'
                          : st === 'CONFIRMED'
                          ? 'Đã duyệt'
                          : st === 'COMPLETED'
                          ? 'Hoàn tất'
                          : 'Đã hủy'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Mã Hẹn</th>
                        <th className="py-3 px-4">Phòng</th>
                        <th className="py-3 px-4">Khách Hẹn</th>
                        <th className="py-3 px-4">Số Điện Thoại</th>
                        <th className="py-3 px-4">Ngày Hẹn</th>
                        <th className="py-3 px-4">Khung Giờ</th>
                        <th className="py-3 px-4">Ghi Chú</th>
                        <th className="py-3 px-4">Trạng Thái</th>
                        <th className="py-3 px-4 text-right">Thao Tác Nghiệp Vụ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {filteredAppointments.map((apt) => (
                        <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{apt.id.slice(-6)}</td>
                          <td className="py-3.5 px-4 font-bold text-blue-600">Phòng #{apt.room_id}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900">{apt.user_name}</td>
                          <td className="py-3.5 px-4">
                            <a
                              href={`tel:${apt.user_phone}`}
                              className="text-slate-800 hover:text-[#B89C66] hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{apt.user_phone}</span>
                            </a>
                          </td>
                          <td className="py-3.5 px-4">{apt.date}</td>
                          <td className="py-3.5 px-4 font-bold text-indigo-600">{apt.time_slot}</td>
                          <td className="py-3.5 px-4 text-slate-500 max-w-[150px] truncate">{apt.notes || '—'}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                apt.status === 'CONFIRMED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : apt.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : apt.status === 'COMPLETED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {apt.status === 'CONFIRMED'
                                ? 'Đã xác nhận'
                                : apt.status === 'PENDING'
                                ? 'Chờ duyệt'
                                : apt.status === 'COMPLETED'
                                ? 'Đã xem phòng'
                                : 'Đã hủy'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {apt.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateAppointment(apt.id, 'CONFIRMED')}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold transition-colors cursor-pointer"
                                  >
                                    Duyệt
                                  </button>
                                  <button
                                    onClick={() => handleUpdateAppointment(apt.id, 'CANCELLED')}
                                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                                  >
                                    Hủy
                                  </button>
                                </>
                              )}

                              {apt.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => handleUpdateAppointment(apt.id, 'COMPLETED')}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold transition-colors cursor-pointer"
                                  title="Đánh dấu khách đã đến xem phòng thành công"
                                >
                                  Hoàn thành xem
                                </button>
                              )}

                              {apt.status === 'COMPLETED' && (
                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedRoomForContract(apt.room_id);
                                      setTenantName(apt.user_name);
                                      setTenantPhone(apt.user_phone);
                                      setActiveTab('contracts');
                                      showToast(`Đã nạp thông tin khách ${apt.user_name} vào Hợp đồng kèm 10 điều nội quy!`);
                                    }}
                                    className="px-2.5 py-1 bg-[#B89C66] hover:bg-[#A88C56] text-slate-950 rounded-md text-[11px] font-extrabold transition-colors cursor-pointer whitespace-nowrap"
                                    title="Lập hợp đồng điện tử có đính kèm 10 điều nội quy PCCC"
                                  >
                                    Lập HĐ &amp; Gửi Nội Quy
                                  </button>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const res = await fetch('/api/handover', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            room_id: apt.room_id,
                                            room_title: `Căn hộ #${apt.room_id}`,
                                            type: 'CHECK_IN',
                                            tenant_name: apt.user_name,
                                            tenant_phone: apt.user_phone,
                                            landlord_name: session?.name || 'Nguyễn Văn Hùng',
                                            notes: 'Biên bản bàn giao nhận phòng kèm kiểm kê cơ sở vật chất ban đầu',
                                          }),
                                        });
                                        const json = await res.json();
                                        if (json.success) {
                                          showToast(`✅ Đã gửi Biên bản bàn giao CSVC tới khách thuê ${apt.user_name}!`);
                                          setActiveTab('handover');
                                        }
                                      } catch (err: any) {
                                        showToast(err.message, 'error');
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                                    title="Gửi biên bản bàn giao cơ sở vật chất (Check-in) cho khách thuê"
                                  >
                                    Gửi Biên Bản Bàn Giao
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB 4: AVAILABILITY SLOTS MANAGER                            */}
            {/* ============================================================ */}
            {activeTab === 'availability' && availability && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs animate-in fade-in duration-200 max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Thiết Lập Khung Giờ Rảnh Đón Khách Xem Phòng
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Khách thuê sẽ chỉ có thể đặt lịch vào các khung giờ mà chủ trọ đã bật rảnh
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveAvailability}
                    className="px-4 py-2 bg-[#B89C66] hover:bg-[#A88C56] text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lưu Cấu Hình</span>
                  </button>
                </div>

                {/* Available Days */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    1. Các ngày trong tuần sẵn sàng đón tiếp khách:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'T2', label: 'Thứ Hai' },
                      { key: 'T3', label: 'Thứ Ba' },
                      { key: 'T4', label: 'Thứ Tư' },
                      { key: 'T5', label: 'Thứ Năm' },
                      { key: 'T6', label: 'Thứ Sáu' },
                      { key: 'T7', label: 'Thứ Bảy' },
                      { key: 'CN', label: 'Chủ Nhật' },
                    ].map((d) => {
                      const isSelected = availability.available_days.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => handleToggleDay(d.key)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots Selection */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    2. Bật / Tắt các khung giờ xem phòng trong ngày:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {availability.slots.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleToggleSlot(s.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          s.enabled
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-400 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Clock className={`w-4 h-4 ${s.enabled ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span className="text-xs">{s.timeSlot}</span>
                        </div>
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                            s.enabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
                          }`}
                        >
                          {s.enabled ? '✓' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notice and visitor instructions */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      3. Thời gian báo trước tối thiểu:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={availability.notice_hours}
                        onChange={(e) =>
                          setAvailability({ ...availability, notice_hours: Number(e.target.value) })
                        }
                        className="w-24 px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden font-bold"
                      />
                      <span className="text-xs text-slate-600">tiếng trước giờ hẹn xem</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      4. Ghi chú &amp; Hướng dẫn dành cho khách đến xem phòng:
                    </label>
                    <textarea
                      rows={3}
                      value={availability.instructions}
                      onChange={(e) =>
                        setAvailability({ ...availability, instructions: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-hidden focus:border-[#B89C66]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB 5: BILLING & UTILITY RECIEPTS                            */}
            {/* ============================================================ */}
            {activeTab === 'billing' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
                {/* Meter Form */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs h-fit">
                  <h3 className="font-bold text-base text-slate-900 mb-1">
                    Ghi Số Điện Nước Tháng
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Tự động tính chi phí theo công tơ và lưu hóa đơn
                  </p>

                  <form onSubmit={handleCreateBill} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Chọn phòng trọ</label>
                      <select
                        value={selectedRoomForBill}
                        onChange={(e) => setSelectedRoomForBill(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden font-medium"
                      >
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.room_code} - {r.title} ({r.price.toLocaleString('vi-VN')} đ)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-600" />
                        Chỉ số Điện (3.800 đ/kWh)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500">Chỉ số cũ:</span>
                          <input
                            type="number"
                            value={electricOld}
                            onChange={(e) => setElectricOld(Number(e.target.value))}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-semibold"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500">Chỉ số mới:</span>
                          <input
                            type="number"
                            value={electricNew}
                            onChange={(e) => setElectricNew(Number(e.target.value))}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-semibold"
                          />
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-700 font-medium pt-1">
                        Sử dụng: <strong className="text-amber-800">{Math.max(0, electricNew - electricOld)} kWh</strong> &rarr; Tiền điện:{' '}
                        {((Math.max(0, electricNew - electricOld)) * 3800).toLocaleString('vi-VN')} đ
                      </div>
                    </div>

                    <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
                      <span className="font-bold text-blue-900 flex items-center gap-1.5">
                        <Droplets className="w-4 h-4 text-blue-600" />
                        Chỉ số Nước (25.000 đ/m³)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500">Chỉ số cũ:</span>
                          <input
                            type="number"
                            value={waterOld}
                            onChange={(e) => setWaterOld(Number(e.target.value))}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-semibold"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500">Chỉ số mới:</span>
                          <input
                            type="number"
                            value={waterNew}
                            onChange={(e) => setWaterNew(Number(e.target.value))}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-semibold"
                          />
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-700 font-medium pt-1">
                        Sử dụng: <strong className="text-blue-800">{Math.max(0, waterNew - waterOld)} m³</strong> &rarr; Tiền nước:{' '}
                        {((Math.max(0, waterNew - waterOld)) * 25000).toLocaleString('vi-VN')} đ
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Xuất Hóa Đơn Hàng Tháng
                    </button>
                  </form>
                </div>

                {/* Bills List */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-base text-slate-900">
                        Danh Sách Hóa Đơn Đã Xuất
                      </h3>
                      <p className="text-xs text-slate-500">
                        In phiếu thu thanh toán hoặc cập nhật trạng thái thu tiền
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      {['ALL', 'UNPAID', 'PAID'].map((st) => (
                        <button
                          key={st}
                          onClick={() => setBillFilterStatus(st)}
                          className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                            billFilterStatus === st
                              ? 'bg-slate-900 text-white font-bold'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {st === 'ALL' ? 'Tất cả' : st === 'UNPAID' ? 'Chưa thanh toán' : 'Đã thanh toán'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {filteredBills.map((b) => (
                      <div
                        key={b.id}
                        className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">
                              Phòng {b.room_code}
                            </span>
                            <span className="text-slate-500">• Tháng {b.month}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                b.status === 'PAID'
                                  ? 'bg-slate-900 text-[#B89C66]'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {b.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                            </span>
                          </div>
                          <div className="mt-1 text-slate-600 flex flex-wrap gap-2 text-[11px]">
                            <span>Tiền phòng: {b.rent_cost.toLocaleString('vi-VN')} đ</span>
                            <span>•</span>
                            <span>Điện ({b.electric_used} kWh): {b.electric_cost.toLocaleString('vi-VN')} đ</span>
                            <span>•</span>
                            <span>Nước ({b.water_used} m³): {b.water_cost.toLocaleString('vi-VN')} đ</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 sm:border-l sm:pl-4 border-slate-200">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">
                              Tổng thanh toán
                            </span>
                            <span className="text-base font-black text-[#0F223A]">
                              {b.total_amount.toLocaleString('vi-VN')} đ
                            </span>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedBillForPrint(b)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Xem và In Phiếu Thu Chi Tiết"
                            >
                              <Printer className="w-3 h-3" />
                              <span>In Phiếu</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSendBillEmail(b)}
                              disabled={sendingBillId === b.id}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Gửi email thông báo bảng kê tiền nhà và điện nước cho khách thuê"
                            >
                              <Send className="w-3 h-3 text-[#B89C66]" />
                              <span>{sendingBillId === b.id ? 'Đang gửi...' : 'Gửi Email Bill'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleBillStatus(b.id, b.status)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                                b.status === 'PAID'
                                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                  : 'bg-[#B89C66] text-white hover:bg-[#A38752]'
                              }`}
                            >
                              {b.status === 'PAID' ? 'Đổi chưa thu' : 'Xác nhận thu tiền'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB 6: ELECTRONIC CONTRACTS                                  */}
            {/* ============================================================ */}
            {activeTab === 'contracts' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
                {/* Form Contract */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs h-fit">
                  <h3 className="font-bold text-base text-slate-900 mb-1">
                    Tạo Hợp Đồng Thuê Điện Tử
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Ký kết và tự động chuyển phòng sang trạng thái &quot;Đang thuê&quot;
                  </p>

                  <form onSubmit={handleCreateContract} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Chọn phòng trọ</label>
                      <select
                        value={selectedRoomForContract}
                        onChange={(e) => setSelectedRoomForContract(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden font-medium"
                      >
                        {rooms.filter((r) => r.status !== 'RENTED').map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.room_code} - {r.title} ({r.price.toLocaleString('vi-VN')} đ)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Họ tên người thuê</label>
                      <input
                        type="text"
                        required
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Số điện thoại người thuê</label>
                      <input
                        type="tel"
                        required
                        value={tenantPhone}
                        onChange={(e) => setTenantPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Số CCCD / CMND người thuê</label>
                      <input
                        type="text"
                        required
                        value={tenantCitizenId}
                        onChange={(e) => setTenantCitizenId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Địa chỉ thường trú (theo CCCD)</label>
                      <input
                        type="text"
                        required
                        value={tenantAddress}
                        onChange={(e) => setTenantAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Số lượng xe máy đăng ký</label>
                      <input
                        type="number"
                        min={0}
                        max={3}
                        value={vehicleCount}
                        onChange={(e) => setVehicleCount(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden font-medium"
                      />
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#B89C66] shrink-0 mt-0.5" />
                      <div>
                        <strong>Tích hợp tự động:</strong> Hợp đồng sẽ tự động đính kèm <strong>Bộ 10 điều nội quy nhà trọ &amp; an toàn PCCC 2026</strong> bảo đảm giá trị pháp lý đầy đủ.
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Ngày bắt đầu</label>
                        <input
                          type="date"
                          value={contractStartDate}
                          onChange={(e) => setContractStartDate(e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Ngày kết thúc</label>
                        <input
                          type="date"
                          value={contractEndDate}
                          onChange={(e) => setContractEndDate(e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-hidden"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-extrabold rounded-xl shadow-md transition-all cursor-pointer mt-2"
                    >
                      Ký Hợp Đồng Điện Tử Pháp Lý
                    </button>
                  </form>
                </div>

                {/* Contracts List */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-base text-slate-900">
                        Danh Sách Hợp Đồng Điện Tử Đã Ký
                      </h3>
                      <p className="text-xs text-slate-500">
                        Lưu trữ thời hạn thuê, giá thuê, tiền cọc và bản in hợp đồng chuẩn
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {contracts.map((c) => {
                      const daysRemaining = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 3600 * 24));
                      const isExpiringSoon = c.status === 'ACTIVE' && daysRemaining <= 30;

                      return (
                        <div
                          key={c.id}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-sm text-slate-900">{c.room_title}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  c.status === 'ACTIVE'
                                    ? 'bg-slate-900 text-[#B89C66]'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {c.status === 'ACTIVE' ? 'Đang hiệu lực' : 'Đã thanh lý'}
                              </span>

                              {isExpiringSoon && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                                  <span>{daysRemaining > 0 ? `Sắp hết hạn (còn ${daysRemaining} ngày)` : 'Đã hết hạn hợp đồng'}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-slate-700 mt-1">
                              Người thuê: <strong className="text-slate-900">{c.tenant_name}</strong> ({c.tenant_phone})
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Thời hạn thuê: {c.start_date} &rarr; <strong>{c.end_date}</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-3 sm:border-l sm:pl-4 border-slate-200">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">
                                Tiền thuê / Cọc
                              </span>
                              <span className="text-sm font-black text-[#0F223A]">
                                {c.monthly_rent.toLocaleString('vi-VN')} đ/th
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                Cọc: {c.deposit_amount.toLocaleString('vi-VN')} đ
                              </span>
                            </div>

                            <div className="flex flex-col gap-1.5 min-w-[130px]">
                              <button
                                type="button"
                                onClick={() => setSelectedContractForPrint(c)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                title="Xem bản in hợp đồng điện tử chuẩn pháp lý"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Bản in HĐ</span>
                              </button>

                              {c.status === 'ACTIVE' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedContractForRenew(c)}
                                    className="px-2.5 py-1 bg-[#B89C66] hover:bg-[#A38752] text-white rounded-md font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                                    title="Gia hạn hợp đồng thêm thời gian"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    <span>Gia Hạn HĐ</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setSelectedContractForCheckOut(c)}
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                    title="Kiểm kê trả phòng và quyết toán hoàn cọc"
                                  >
                                    <LogOut className="w-3 h-3" />
                                    <span>Trả Phòng &amp; Quyết Toán</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB: HOUSE RULES & CONTRACT CLAUSES                          */}
            {/* ============================================================ */}
            {activeTab === 'rules' && (
              <HouseRulesManager
                currentLandlordName={session?.name || 'Nguyễn Văn Hùng'}
                onToast={showToast}
              />
            )}

            {/* ============================================================ */}
            {/* TAB 7: BÀN GIAO CƠ SỞ VẬT CHẤT (HANDOVER)                    */}
            {/* ============================================================ */}
            {activeTab === 'handover' && (
              <HandoverManager
                rooms={rooms}
                currentLandlordName={session?.name || 'Nguyễn Văn Hùng'}
                onToast={showToast}
              />
            )}
          </>
        )}
      </main>

      {/* ============================================================ */}
      {/* MODAL 1: CREATE ROOM MODAL                                   */}
      {/* ============================================================ */}
      {showCreateRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Khởi Tạo Phòng Trọ Mới</h3>
                <p className="text-xs text-slate-500">Nhập thông tin bảng giá, vị trí và tiện ích phòng</p>
              </div>
              <button
                onClick={() => setShowCreateRoomModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4 text-xs mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã phòng (ví dụ P-402)</label>
                  <input
                    type="text"
                    required
                    placeholder="P-402"
                    value={newRoomCode}
                    onChange={(e) => setNewRoomCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Loại phòng</label>
                  <select
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden font-semibold"
                  >
                    <option value="Phòng Studio cao cấp">Phòng Studio cao cấp</option>
                    <option value="Căn hộ mini có gác lửng">Căn hộ mini có gác lửng</option>
                    <option value="Phòng 1PN riêng biệt">Phòng 1PN riêng biệt</option>
                    <option value="Căn hộ 2 Phòng ngủ">Căn hộ 2 Phòng ngủ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề bài đăng phòng</label>
                <input
                  type="text"
                  required
                  placeholder="Studio ban công thoáng mát gần Đại học Công Thương HUIT"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giá thuê (đ/tháng)</label>
                  <input
                    type="number"
                    required
                    value={newRoomPrice}
                    onChange={(e) => setNewRoomPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden font-bold text-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tiền cọc (đ)</label>
                  <input
                    type="number"
                    required
                    value={newRoomDeposit}
                    onChange={(e) => setNewRoomDeposit(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Diện tích (m²)</label>
                  <input
                    type="number"
                    required
                    value={newRoomArea}
                    onChange={(e) => setNewRoomArea(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Địa chỉ chi tiết</label>
                <input
                  type="text"
                  required
                  value={newRoomAddress}
                  onChange={(e) => setNewRoomAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quận / Huyện</label>
                <select
                  value={newRoomDistrict}
                  onChange={(e) => setNewRoomDistrict(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden font-semibold"
                >
                  <option value="Quận Tân Phú">Quận Tân Phú</option>
                  <option value="Quận Tân Bình">Quận Tân Bình</option>
                  <option value="Quận Bình Tân">Quận Bình Tân</option>
                  <option value="Quận Gò Vấp">Quận Gò Vấp</option>
                  <option value="Quận Bình Thạnh">Quận Bình Thạnh</option>
                  <option value="Thành phố Thủ Đức">Thành phố Thủ Đức</option>
                  <option value="Quận 7">Quận 7</option>
                  <option value="Quận 10">Quận 10</option>
                  <option value="Quận Phú Nhuận">Quận Phú Nhuận</option>
                  <option value="Quận 12">Quận 12</option>
                  <option value="Quận 3">Quận 3</option>
                  <option value="Quận 1">Quận 1</option>
                  <option value="Quận 8">Quận 8</option>
                  <option value="Quận 6">Quận 6</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">Tiện ích phòng có sẵn:</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Máy lạnh', 'Gác lửng', 'WC riêng', 'Tủ lạnh', 'Máy giặt', 'Ban công', 'Thang máy', 'Khóa vân tay', 'Wifi miễn phí'].map((am) => {
                    const isChecked = newRoomAmenities.includes(am);
                    return (
                      <label key={am} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setNewRoomAmenities([...newRoomAmenities, am]);
                            else setNewRoomAmenities(newRoomAmenities.filter((a) => a !== am));
                          }}
                          className="rounded text-[#B89C66]"
                        />
                        <span className="text-[11px] text-slate-700">{am}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateRoomModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#B89C66] hover:bg-[#A88C56] text-slate-950 font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Lưu &amp; Xuất Bản Phòng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: EDIT ROOM MODAL                                     */}
      {/* ============================================================ */}
      {showEditRoomModal && editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Chỉnh Sửa Phòng #{editingRoom.room_code}
              </h3>
              <button
                onClick={() => {
                  setShowEditRoomModal(false);
                  setEditingRoom(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRoom} className="space-y-4 text-xs mt-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề phòng</label>
                <input
                  type="text"
                  value={editingRoom.title}
                  onChange={(e) => setEditingRoom({ ...editingRoom, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giá thuê (đ/tháng)</label>
                  <input
                    type="number"
                    value={editingRoom.price}
                    onChange={(e) => setEditingRoom({ ...editingRoom, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tiền cọc (đ)</label>
                  <input
                    type="number"
                    value={editingRoom.deposit || editingRoom.price}
                    onChange={(e) => setEditingRoom({ ...editingRoom, deposit: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Trạng thái phòng</label>
                <select
                  value={editingRoom.status}
                  onChange={(e) => setEditingRoom({ ...editingRoom, status: e.target.value as RoomStatus })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden font-bold"
                >
                  <option value="AVAILABLE">Còn trống (AVAILABLE)</option>
                  <option value="BOOKED_VIEWING">Đã đặt lịch (BOOKED_VIEWING)</option>
                  <option value="RESERVED">Giữ chỗ (RESERVED)</option>
                  <option value="RENTED">Đang thuê (RENTED)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditRoomModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Cập Nhật Phòng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: UTILITY BILL RECEIPT PRINT PREVIEW                   */}
      {/* ============================================================ */}
      {selectedBillForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Mẫu Phiếu Thu Điện Nước Hàng Tháng
              </span>
              <button
                onClick={() => setSelectedBillForPrint(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Content */}
            <div className="pt-4 text-slate-900 font-sans text-xs">
              <div className="text-center pb-4 border-b border-dashed border-slate-300">
                <h2 className="text-base font-black uppercase text-[#0F223A] font-sans">
                  ELITE LIVING RESIDENTIAL NETWORK
                </h2>
                <h3 className="text-sm font-extrabold uppercase text-[#B89C66] mt-0.5">
                  PHIẾU THU TIỀN PHÒNG &amp; TIỆN ÍCH DỊCH VỤ
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Kỳ thu: <strong>Tháng {selectedBillForPrint.month}</strong> • Phòng:{' '}
                  <strong className="text-slate-900">{selectedBillForPrint.room_code}</strong>
                </p>
                <p className="text-[10px] text-slate-400">
                  Mã hóa đơn: {selectedBillForPrint.id}
                </p>
              </div>

              <div className="py-4 space-y-2 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-600">1. Tiền thuê phòng:</span>
                  <span className="font-bold">{selectedBillForPrint.rent_cost.toLocaleString('vi-VN')} đ</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-600">
                    2. Tiền điện ({selectedBillForPrint.electric_used} kWh • {selectedBillForPrint.electric_old} &rarr; {selectedBillForPrint.electric_new}):
                  </span>
                  <span className="font-bold">{selectedBillForPrint.electric_cost.toLocaleString('vi-VN')} đ</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-600">
                    3. Tiền nước ({selectedBillForPrint.water_used} m³ • {selectedBillForPrint.water_old} &rarr; {selectedBillForPrint.water_new}):
                  </span>
                  <span className="font-bold">{selectedBillForPrint.water_cost.toLocaleString('vi-VN')} đ</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-600">4. Tiền Internet cáp quang:</span>
                  <span className="font-bold">{selectedBillForPrint.internet_cost.toLocaleString('vi-VN')} đ</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-600">5. Dịch vụ (Vệ sinh, thang máy, rác):</span>
                  <span className="font-bold">{selectedBillForPrint.service_cost.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>

              <div className="py-4 flex justify-between items-baseline border-b border-dashed border-slate-300">
                <span className="text-sm font-black uppercase text-slate-900">TỔNG THANH TOÁN:</span>
                <span className="text-xl font-black text-blue-700">
                  {selectedBillForPrint.total_amount.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div className="pt-4 grid grid-cols-2 text-center text-[11px] text-slate-500">
                <div>
                  <p className="font-semibold text-slate-800">Người nộp tiền</p>
                  <p className="text-[10px] mt-8 text-slate-400">(Ký và ghi rõ họ tên)</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Người lập phiếu / Chủ trọ</p>
                  <p className="text-[10px] mt-8 text-slate-400 font-bold text-slate-800">
                    {session?.name || 'Nguyễn Văn Hùng'}
                  </p>
                </div>
              </div>
            </div>

            {/* Print actions */}
            <div className="pt-5 mt-4 border-t border-slate-200 flex justify-end gap-2 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedBillForPrint(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-semibold cursor-pointer text-xs"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In Phiếu Thu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: ELECTRONIC CONTRACT LEGAL PREVIEW (2026 STANDARD)   */}
      {/* ============================================================ */}
      {selectedContractForPrint && (
        <ContractLegalModal
          contract={selectedContractForPrint}
          onClose={() => setSelectedContractForPrint(null)}
          landlordPhone="0908123456"
        />
      )}

      {/* ============================================================ */}
      {/* RENTAL LIFECYCLE MODAL 5: MOVE-IN CHECK-IN                   */}
      {/* ============================================================ */}
      {selectedRoomForCheckIn && (
        <CheckInModal
          room={selectedRoomForCheckIn}
          onClose={() => setSelectedRoomForCheckIn(null)}
          onSuccess={(res) => {
            showToast(res.message || 'Check-in thành công!');
            loadLandlordData(currentLandlordId);
            if (res.data?.notification) {
              setPreviewEmailNotification(res.data.notification);
            }
          }}
        />
      )}

      {/* ============================================================ */}
      {/* RENTAL LIFECYCLE MODAL 6: CANCEL / FORFEIT DEPOSIT           */}
      {/* ============================================================ */}
      {selectedRoomForCancelDeposit && (
        <CancelDepositModal
          room={selectedRoomForCancelDeposit}
          onClose={() => setSelectedRoomForCancelDeposit(null)}
          onSuccess={(res) => {
            showToast(res.message || 'Đã hủy cọc và giải phóng phòng về Còn trống!');
            loadLandlordData(currentLandlordId);
          }}
        />
      )}

      {/* ============================================================ */}
      {/* RENTAL LIFECYCLE MODAL 7: RENEW CONTRACT                     */}
      {/* ============================================================ */}
      {selectedContractForRenew && (
        <RenewContractModal
          contract={selectedContractForRenew}
          onClose={() => setSelectedContractForRenew(null)}
          onSuccess={(res) => {
            showToast(res.message || 'Đã gia hạn hợp đồng thành công!');
            loadLandlordData(currentLandlordId);
          }}
        />
      )}

      {/* ============================================================ */}
      {/* RENTAL LIFECYCLE MODAL 8: CHECK-OUT & REFUND SETTLEMENT      */}
      {/* ============================================================ */}
      {selectedContractForCheckOut && (
        <CheckOutModal
          contract={selectedContractForCheckOut}
          onClose={() => setSelectedContractForCheckOut(null)}
          onSuccess={(res) => {
            showToast(res.message || 'Đã hoàn tất trả phòng và hoàn cọc!');
            loadLandlordData(currentLandlordId);
          }}
        />
      )}

      {/* ============================================================ */}
      {/* RENTAL LIFECYCLE MODAL 9: PAY BILL (QR CODE)                 */}
      {/* ============================================================ */}
      {selectedBillForPay && (
        <PayBillModal
          bill={selectedBillForPay}
          onClose={() => setSelectedBillForPay(null)}
          onSuccess={(res) => {
            showToast(res.message || 'Đã thanh toán hóa đơn thành công!');
            loadLandlordData(currentLandlordId);
          }}
        />
      )}

      {/* ============================================================ */}
      {/* RENTAL LIFECYCLE MODAL 10: EMAIL NOTIFICATION PREVIEW        */}
      {/* ============================================================ */}
      {previewEmailNotification && (
        <EmailNotificationModal
          notification={previewEmailNotification}
          onClose={() => setPreviewEmailNotification(null)}
        />
      )}
    </div>
  );
}
