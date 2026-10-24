'use client';

import { scopedFetch as fetch } from '@/lib/scoped-fetch';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  Appointment,
  AuthSession,
  Contract,
  Landlord,
  LandlordAvailability,
  MaintenanceRequest,
  Room,
  RoomStatus,
  UtilityBill,
} from '@/lib/types';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { portalSignOut } from '@/lib/portal-auth-client';
import HandoverManager from '@/components/HandoverManager';
import HouseRulesManager from '@/components/HouseRulesManager';
import ContractLegalModal from '@/components/ContractLegalModal';
import CheckInModal from '@/components/CheckInModal';
import CancelDepositModal from '@/components/CancelDepositModal';
import RenewContractModal from '@/components/RenewContractModal';
import CheckOutModal from '@/components/CheckOutModal';
import PayBillModal from '@/components/PayBillModal';
import EmailNotificationModal from '@/components/EmailNotificationModal';

import LandlordShell from '@/components/landlord/LandlordShell';
import LandlordOverviewTab from '@/components/landlord/LandlordOverviewTab';
import LandlordRoomsTab from '@/components/landlord/LandlordRoomsTab';
import LandlordAppointmentsTab from '@/components/landlord/LandlordAppointmentsTab';
import LandlordAvailabilityTab from '@/components/landlord/LandlordAvailabilityTab';
import LandlordBillingTab from '@/components/landlord/LandlordBillingTab';
import LandlordContractsTab, {
  type ContractPrefill,
} from '@/components/landlord/LandlordContractsTab';
import LandlordOperationsTab from '@/components/landlord/LandlordOperationsTab';
import {
  BillReceiptPrintModal,
  CreateEditRoomDrawer,
  type RoomFormSubmitData,
} from '@/components/landlord/LandlordRoomModals';
import {
  ConfirmDialog,
  ErrorBanner,
  ListSkeleton,
  OverviewSkeleton,
} from '@/components/landlord/LandlordPrimitives';
import {
  type AppointmentView,
  currentBillingMonth,
  isContractExpiringSoon,
  type LandlordTab,
  latestBillForRoom,
  ROOM_STATUS_META,
  roomBuildingLabel,
} from '@/components/landlord/landlord-format';

type PendingConfirmAction =
  | {
      kind: 'DELETE_ROOM';
      room: Room;
    }
  | {
      kind: 'CANCEL_APPOINTMENT';
      appointment: Appointment;
    }
  | {
      kind: 'TERMINATE_CONTRACT';
      contract: Contract;
    };

export default function LandlordPortalPage() {
  const router = useRouter();

  // ============================================================
  // AUTHENTICATION & LANDLORD SCOPE
  // ============================================================
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentLandlordId, setCurrentLandlordId] = useState<string>('landlord_tp_1');
  const [currentLandlord, setCurrentLandlord] = useState<Landlord | null>(null);
  const [allLandlords, setAllLandlords] = useState<Landlord[]>([]);

  // ============================================================
  // NAVIGATION & PERSISTENT FILTER STATE (preserved across views)
  // ============================================================
  const [activeTab, setActiveTab] = useState<LandlordTab>('overview');

  // Rooms filters
  const [roomFilterStatus, setRoomFilterStatus] = useState<string>('ALL');
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>('');
  const [roomBuildingFilter, setRoomBuildingFilter] = useState<string>('ALL');

  // Appointments filters
  const [aptActiveView, setAptActiveView] = useState<AppointmentView>('PENDING');
  const [aptSearchQuery, setAptSearchQuery] = useState<string>('');
  const [aptOnlyToday, setAptOnlyToday] = useState<boolean>(false);

  // Billing filters & drawer
  const [billFilterStatus, setBillFilterStatus] = useState<string>('ALL');
  const [billSearchQuery, setBillSearchQuery] = useState<string>('');
  const [billDrawerOpen, setBillDrawerOpen] = useState<boolean>(false);
  const [selectedRoomForBill, setSelectedRoomForBill] = useState<number>(0);

  // Contracts filters & drawer
  const [contractFilterStatus, setContractFilterStatus] = useState<string>('ALL');
  const [contractSearchQuery, setContractSearchQuery] = useState<string>('');
  const [contractDrawerOpen, setContractDrawerOpen] = useState<boolean>(false);
  const [contractPrefill, setContractPrefill] = useState<ContractPrefill | null>(null);

  // Room Create / Edit Drawer
  const [roomDrawerOpen, setRoomDrawerOpen] = useState<boolean>(false);
  const [roomDrawerMode, setRoomDrawerMode] = useState<'create' | 'edit'>('create');
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // ============================================================
  // CORE DATA & NON-DESTRUCTIVE LOADING STATES
  // ============================================================
  const [rooms, setRooms] = useState<Room[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [availability, setAvailability] = useState<LandlordAvailability | null>(null);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);

  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef<boolean>(false);
  const requestSeqRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Action busy states (prevent double submit)
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [submittingRoom, setSubmittingRoom] = useState<boolean>(false);
  const [submittingBill, setSubmittingBill] = useState<boolean>(false);
  const [busyBillId, setBusyBillId] = useState<string | null>(null);
  const [sendingBillId, setSendingBillId] = useState<string | null>(null);
  const [submittingContract, setSubmittingContract] = useState<boolean>(false);
  const [savingAvailability, setSavingAvailability] = useState<boolean>(false);

  // Friendly Confirmation Dialog State
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmAction | null>(null);
  const [confirmBusy, setConfirmBusy] = useState<boolean>(false);

  // Print & Lifecycle Modals State
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<UtilityBill | null>(null);
  const [selectedContractForPrint, setSelectedContractForPrint] = useState<Contract | null>(null);
  const [selectedRoomForCheckIn, setSelectedRoomForCheckIn] = useState<Room | null>(null);
  const [selectedRoomForCancelDeposit, setSelectedRoomForCancelDeposit] = useState<Room | null>(null);
  const [selectedContractForRenew, setSelectedContractForRenew] = useState<Contract | null>(null);
  const [selectedContractForCheckOut, setSelectedContractForCheckOut] = useState<Contract | null>(null);
  const [selectedBillForPay, setSelectedBillForPay] = useState<UtilityBill | null>(null);
  const [previewEmailNotification, setPreviewEmailNotification] = useState<any | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToastMessage({ text, type });
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  }, []);

  // ============================================================
  // AUTH CHECK ON MOUNT (Server Session + Local Profile Sync)
  // ============================================================
  useEffect(() => {
    let cancelled = false;
    async function verifyPortalSession() {
      try {
        const res = await window.fetch('/api/portal-auth/session', {
          cache: 'no-store',
          credentials: 'include',
        });
        const serverSession = res.ok ? await res.json() : null;
        const serverUser = serverSession?.user;

        if (serverUser && (serverUser.role === 'LANDLORD' || serverUser.role === 'ADMIN')) {
          if (cancelled) return;
          const savedRaw = localStorage.getItem('elite_auth_user');
          let savedParsed: Partial<AuthSession> = {};
          if (savedRaw) {
            try {
              savedParsed = JSON.parse(savedRaw);
            } catch {
              savedParsed = {};
            }
          }
          const resolvedSession: AuthSession = {
            id: serverUser.id,
            name: serverUser.name || savedParsed.name || 'Chủ trọ',
            email: serverUser.email || savedParsed.email || '',
            phone: serverUser.phone || savedParsed.phone || '',
            role: serverUser.role,
            landlordId:
              serverUser.role === 'LANDLORD'
                ? serverUser.id
                : savedParsed.landlordId || 'landlord_tp_1',
            avatar: serverUser.image || savedParsed.avatar || '',
          };
          localStorage.setItem('elite_auth_user', JSON.stringify(resolvedSession));
          setSession(resolvedSession);
          setCurrentLandlordId(resolvedSession.landlordId || 'landlord_tp_1');
          setAuthChecked(true);
          return;
        }

        // Server session has no valid portal user -> clear stale local storage and redirect
        localStorage.removeItem('elite_auth_user');
        if (!cancelled) {
          router.push('/portal/login');
        }
      } catch {
        const saved = localStorage.getItem('elite_auth_user');
        if (!saved) {
          if (!cancelled) router.push('/portal/login');
          return;
        }
        try {
          const parsed: AuthSession = JSON.parse(saved);
          if (parsed.role !== 'LANDLORD' && parsed.role !== 'ADMIN') {
            if (!cancelled) router.push('/portal/login');
            return;
          }
          if (!cancelled) {
            setSession(parsed);
            setCurrentLandlordId(parsed.landlordId || 'landlord_tp_1');
            setAuthChecked(true);
          }
        } catch {
          if (!cancelled) router.push('/portal/login');
        }
      }
    }
    verifyPortalSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // ============================================================
  // RACE-SAFE DATA LOADING (keeps existing data on refresh)
  // ============================================================
  const loadLandlordData = useCallback(
    async (landlordId: string, options?: { silent?: boolean }) => {
      const seq = ++requestSeqRef.current;
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (!hasLoadedOnceRef.current && !options?.silent) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }
      setLoadError(null);

      try {
        const res = await fetch(
          `/api/landlords?landlordId=${encodeURIComponent(landlordId)}&type=all`,
          { signal: controller.signal }
        );
        const json = await res.json();

        // Ignore stale response if a newer request was started
        if (seq !== requestSeqRef.current) return;

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.message || 'Không thể tải dữ liệu khu trọ từ máy chủ.');
        }

        const nextRooms: Room[] = json.data.rooms || [];
        const nextAppointments: Appointment[] = json.data.appointments || [];
        const nextBills: UtilityBill[] = json.data.bills || [];
        const nextContracts: Contract[] = json.data.contracts || [];

        setRooms(nextRooms);
        setAppointments(nextAppointments);
        setBills(nextBills);
        setContracts(nextContracts);
        setAvailability(json.data.availability || null);
        setMaintenanceRequests(
          Array.isArray(json.data.maintenanceRequests) ? json.data.maintenanceRequests : []
        );

        if (json.data.landlord) {
          setCurrentLandlord(json.data.landlord);
        }
        if (Array.isArray(json.data.allLandlords)) {
          setAllLandlords(json.data.allLandlords);
        }

        // Smart default selection for appointments view:
        // If there are pending appointments, focus PENDING; otherwise UPCOMING or ALL
        if (!hasLoadedOnceRef.current) {
          const hasPending = nextAppointments.some((a) => a.status === 'PENDING');
          const hasConfirmed = nextAppointments.some((a) => a.status === 'CONFIRMED');
          if (hasPending) setAptActiveView('PENDING');
          else if (hasConfirmed) setAptActiveView('UPCOMING');
          else setAptActiveView('ALL');
        }

        if (nextRooms.length > 0) {
          setSelectedRoomForBill((prev) =>
            prev && nextRooms.some((r) => r.id === prev) ? prev : nextRooms[0].id
          );
        }

        hasLoadedOnceRef.current = true;
      } catch (err: any) {
        if (err?.name === 'AbortError' || seq !== requestSeqRef.current) return;
        console.error('Failed to load landlord data:', err);
        const message =
          err?.message || 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại.';
        setLoadError(message);
        showToast(message, 'error');
      } finally {
        if (seq === requestSeqRef.current) {
          setInitialLoading(false);
          setRefreshing(false);
        }
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (authChecked && currentLandlordId) {
      loadLandlordData(currentLandlordId);
    }
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [authChecked, currentLandlordId, loadLandlordData]);

  // Switch Landlord Scope (Admin)
  const handleSwitchLandlord = (landlord: Landlord) => {
    if (landlord.id === currentLandlordId) return;
    setCurrentLandlord(landlord);
    setCurrentLandlordId(landlord.id);
    setRoomBuildingFilter('ALL');
    showToast(`Đã chuyển sang phạm vi khu trọ của ${landlord.name}.`);
  };

  // Đăng xuất phải kết thúc phiên trên máy chủ (cookie cổng vận hành), giống trang admin
  const handleLogout = async () => {
    try {
      await portalSignOut();
    } catch {
      showToast('Chưa thể đăng xuất. Vui lòng kiểm tra mạng và thử lại.', 'error');
      return;
    }
    localStorage.removeItem('elite_auth_user');
    document.cookie = 'elite_role=; path=/; max-age=0';
    router.push('/portal/login');
    router.refresh();
  };

  // ============================================================
  // DERIVED PROPERTY & NAVIGATION METADATA
  // ============================================================
  const propertySummary = useMemo(() => {
    const buildings = Array.from(
      new Set(rooms.map((r) => roomBuildingLabel(r)).filter(Boolean))
    );
    const districts = Array.from(
      new Set(rooms.map((r) => r.district).filter(Boolean))
    );
    const primaryBuildingName =
      buildings[0] || 'Khu trọ đang quản lý';
    const districtsLabel =
      districts.length > 0 ? districts.join(', ') : 'TP. Hồ Chí Minh';

    return {
      buildings,
      primaryBuildingName,
      buildingCount: Math.max(1, buildings.length),
      districtsLabel,
      defaultAddress:
        rooms[0]?.address || '140 Lê Trọng Tấn, Phường Tây Thạnh, Quận Tân Phú',
      defaultDistrict: rooms[0]?.district || 'Quận Tân Phú',
    };
  }, [rooms]);

  const navCounts = useMemo(() => {
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE').length;
    const pendingAppointments = appointments.filter((a) => a.status === 'PENDING').length;
    const unpaidBills = bills.filter((b) => b.status === 'UNPAID').length;
    const activeContracts = contracts.filter((c) => c.status === 'ACTIVE');
    const expiringContracts = activeContracts.filter((c) => isContractExpiringSoon(c)).length;

    return {
      totalRooms,
      availableRooms,
      pendingAppointments,
      unpaidBills,
      expiringContracts,
      totalContracts: activeContracts.length,
    };
  }, [rooms, appointments, bills, contracts]);

  const managerName = currentLandlord?.name || session?.name || 'Chủ trọ';

  // ============================================================
  // HANDLERS: ROOM CRUD & STATUS
  // ============================================================
  const handleOpenCreateRoom = () => {
    setEditingRoom(null);
    setRoomDrawerMode('create');
    setRoomDrawerOpen(true);
  };

  const handleOpenEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomDrawerMode('edit');
    setRoomDrawerOpen(true);
  };

  const handleSubmitRoomDrawer = async (formData: RoomFormSubmitData): Promise<boolean> => {
    if (submittingRoom) return false;
    setSubmittingRoom(true);

    try {
      if (roomDrawerMode === 'create') {
        const res = await fetch('/api/landlords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'CREATE_ROOM',
            roomData: {
              landlord_id: currentLandlordId,
              ...formData,
            },
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          showToast(json.message || 'Không thể tạo phòng mới.', 'error');
          return false;
        }
        setRooms((prev) => [json.data, ...prev]);
        setRoomDrawerOpen(false);
        showToast(`Đã thêm phòng ${json.data.room_code} vào danh sách quản lý.`);
        return true;
      } else if (editingRoom) {
        const res = await fetch('/api/landlords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'UPDATE_ROOM',
            id: editingRoom.id,
            roomData: formData,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          showToast(json.message || 'Không thể lưu thay đổi phòng.', 'error');
          return false;
        }
        setRooms((prev) => prev.map((r) => (r.id === editingRoom.id ? json.data : r)));
        setRoomDrawerOpen(false);
        setEditingRoom(null);
        showToast(`Đã lưu thay đổi thông tin phòng ${formData.room_code}.`);
        return true;
      }
      return false;
    } catch (err: any) {
      showToast(err?.message || 'Lỗi kết nối khi lưu thông tin phòng.', 'error');
      return false;
    } finally {
      setSubmittingRoom(false);
    }
  };

  const handleUpdateRoomStatus = async (room: Room, newStatus: RoomStatus) => {
    const actionKey = `room-status-${room.id}`;
    if (busyActionId === actionKey) return;
    setBusyActionId(actionKey);

    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_ROOM_STATUS',
          id: room.id,
          status: newStatus,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setRooms((prev) =>
          prev.map((r) => (r.id === room.id ? { ...r, status: newStatus } : r))
        );
        const statusLabel = ROOM_STATUS_META[newStatus]?.label || newStatus;
        showToast(`Đã chuyển phòng ${room.room_code} sang trạng thái "${statusLabel}".`);
      } else {
        showToast(json.message || 'Không thể cập nhật trạng thái phòng.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi cập nhật trạng thái phòng.', 'error');
    } finally {
      setBusyActionId(null);
    }
  };

  // ============================================================
  // HANDLERS: APPOINTMENTS LIFECYCLE
  // ============================================================
  const handleUpdateAppointment = async (
    apt: Appointment,
    status: Appointment['status']
  ) => {
    const actionKey = `apt-${apt.id}`;
    if (busyActionId === actionKey) return;
    setBusyActionId(actionKey);

    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_APPOINTMENT', id: apt.id, status }),
      });
      const json = await res.json();
      if (json.success) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === apt.id ? { ...a, status } : a))
        );

        if (status === 'CONFIRMED') {
          setRooms((prev) =>
            prev.map((r) => (r.id === apt.room_id ? { ...r, status: 'BOOKED_VIEWING' } : r))
          );
          showToast(
            `Đã xác nhận lịch xem phòng với ${apt.user_name}. Phòng chuyển sang "Đã có lịch xem".`
          );
        } else if (status === 'CANCELLED') {
          setRooms((prev) =>
            prev.map((r) => (r.id === apt.room_id ? { ...r, status: 'AVAILABLE' } : r))
          );
          showToast('Đã hủy lịch hẹn. Phòng đã chuyển về trạng thái "Còn trống".');
        } else if (status === 'COMPLETED') {
          showToast(`Đã ghi nhận ${apt.user_name} hoàn tất xem phòng.`);
        }
      } else {
        showToast(json.message || 'Không thể cập nhật lịch hẹn.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi cập nhật lịch hẹn.', 'error');
    } finally {
      setBusyActionId(null);
    }
  };

  // ============================================================
  // HANDLERS: BILLING
  // ============================================================
  const handleOpenBillDrawer = (roomId?: number) => {
    if (roomId) {
      setSelectedRoomForBill(roomId);
    } else if (!selectedRoomForBill && rooms.length > 0) {
      const rented = rooms.find((r) => r.status === 'RENTED') || rooms[0];
      setSelectedRoomForBill(rented.id);
    }
    setActiveTab('billing');
    setBillDrawerOpen(true);
  };

  const handleCreateBill = async (payload: {
    room: Room;
    electricOld: number;
    electricNew: number;
    waterOld: number;
    waterNew: number;
  }): Promise<boolean> => {
    if (submittingBill) return false;
    setSubmittingBill(true);

    const { room, electricOld, electricNew, waterOld, waterNew } = payload;
    const electricUsed = Math.max(0, electricNew - electricOld);
    const electricCost = electricUsed * (room.electricity_rate || 3800);
    const waterUsed = Math.max(0, waterNew - waterOld);
    const waterCost = waterUsed * (room.water_rate || 25000);
    const internetCost = room.internet_fee || 100000;
    const serviceCost = room.service_fee || 150000;
    const rentCost = room.price;
    const totalAmount = rentCost + electricCost + waterCost + internetCost + serviceCost;
    const month = currentBillingMonth();

    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_BILL',
          billData: {
            room_id: room.id,
            room_code: room.room_code,
            month,
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
        showToast(
          `Đã lập hóa đơn kỳ ${month} cho phòng ${room.room_code} thành công.`
        );
        return true;
      }
      showToast(json.message || 'Không thể lập hóa đơn.', 'error');
      return false;
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi lập hóa đơn điện nước.', 'error');
      return false;
    } finally {
      setSubmittingBill(false);
    }
  };

  const handleToggleBillStatus = async (bill: UtilityBill) => {
    const actionKey = `bill-${bill.id}`;
    if (busyBillId === bill.id || busyActionId === actionKey) return;
    setBusyBillId(bill.id);
    setBusyActionId(actionKey);

    const nextStatus: UtilityBill['status'] =
      bill.status === 'PAID' ? 'UNPAID' : 'PAID';

    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_BILL_STATUS',
          billId: bill.id,
          status: nextStatus,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBills((prev) =>
          prev.map((b) => (b.id === bill.id ? { ...b, status: nextStatus } : b))
        );
        showToast(
          nextStatus === 'PAID'
            ? `Đã xác nhận thu tiền hóa đơn phòng ${bill.room_code} (kỳ ${bill.month}).`
            : `Đã chuyển hóa đơn phòng ${bill.room_code} về trạng thái "Chưa thanh toán".`
        );
      } else {
        showToast(json.message || 'Không thể cập nhật trạng thái hóa đơn.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi cập nhật hóa đơn.', 'error');
    } finally {
      setBusyBillId(null);
      setBusyActionId(null);
    }
  };

  const handleSendBillEmail = async (bill: UtilityBill) => {
    if (sendingBillId === bill.id) return;
    setSendingBillId(bill.id);

    // Find active tenant name if available
    const activeContract = contracts.find(
      (c) => c.room_id === bill.room_id && c.status === 'ACTIVE'
    );

    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'NOTIFY_BILL',
          billId: bill.id,
          tenantName: activeContract?.tenant_name || `Khách thuê phòng ${bill.room_code}`,
          tenantEmail: 'tenant@eliteliving.vn',
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(
          json.message ||
            `Đã gửi thông báo hóa đơn kỳ ${bill.month} tới hộp thư khách thuê phòng ${bill.room_code}.`
        );
        if (json.data) {
          setPreviewEmailNotification(json.data);
        }
      } else {
        showToast(json.message || 'Không thể gửi thông báo hóa đơn.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi gửi email hóa đơn.', 'error');
    } finally {
      setSendingBillId(null);
    }
  };

  // ============================================================
  // HANDLERS: CONTRACTS LIFECYCLE
  // ============================================================
  const handleOpenContractDrawer = (prefill?: ContractPrefill) => {
    setContractPrefill(prefill || null);
    setActiveTab('contracts');
    setContractDrawerOpen(true);
  };

  const handleCreateContract = async (payload: {
    room: Room;
    tenantName: string;
    tenantPhone: string;
    tenantCitizenId: string;
    tenantAddress: string;
    vehicleCount: number;
    startDate: string;
    endDate: string;
  }): Promise<boolean> => {
    if (submittingContract) return false;
    setSubmittingContract(true);

    const {
      room,
      tenantName,
      tenantPhone,
      tenantCitizenId,
      tenantAddress,
      vehicleCount,
      startDate,
      endDate,
    } = payload;

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
            landlord_name: managerName,
            start_date: startDate,
            end_date: endDate,
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
        showToast(
          `Đã lập hợp đồng thuê cho ${tenantName}. Phòng ${room.room_code} đã chuyển sang "Đang thuê".`
        );
        return true;
      }
      showToast(json.message || 'Không thể lập hợp đồng.', 'error');
      return false;
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi lập hợp đồng điện tử.', 'error');
      return false;
    } finally {
      setSubmittingContract(false);
    }
  };

  // ============================================================
  // HANDLERS: CONFIRM DIALOG (Delete room / Cancel appointment / Terminate contract)
  // ============================================================
  const handleConfirmDialogExecute = async () => {
    if (!pendingConfirm || confirmBusy) return;
    setConfirmBusy(true);

    try {
      if (pendingConfirm.kind === 'DELETE_ROOM') {
        const room = pendingConfirm.room;
        const res = await fetch('/api/landlords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'DELETE_ROOM', id: room.id }),
        });
        const json = await res.json();
        if (json.success) {
          setRooms((prev) => prev.filter((r) => r.id !== room.id));
          showToast(`Đã xóa phòng ${room.room_code} khỏi danh sách quản lý.`);
        } else {
          showToast(json.message || 'Không thể xóa phòng.', 'error');
        }
      } else if (pendingConfirm.kind === 'CANCEL_APPOINTMENT') {
        await handleUpdateAppointment(pendingConfirm.appointment, 'CANCELLED');
      } else if (pendingConfirm.kind === 'TERMINATE_CONTRACT') {
        const contract = pendingConfirm.contract;
        const res = await fetch('/api/landlords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'TERMINATE_CONTRACT',
            contractId: contract.id,
            roomId: contract.room_id,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setContracts((prev) =>
            prev.map((c) => (c.id === contract.id ? { ...c, status: 'TERMINATED' } : c))
          );
          setRooms((prev) =>
            prev.map((r) => (r.id === contract.room_id ? { ...r, status: 'AVAILABLE' } : r))
          );
          showToast('Đã thanh lý hợp đồng và chuyển phòng về trạng thái "Còn trống".');
        } else {
          showToast(json.message || 'Không thể thanh lý hợp đồng.', 'error');
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Có lỗi xảy ra khi thực hiện thao tác.', 'error');
    } finally {
      setConfirmBusy(false);
      setPendingConfirm(null);
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
    if (!availability || savingAvailability) return;
    setSavingAvailability(true);
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
        showToast('Đã lưu cài đặt khung giờ đón khách xem phòng.');
      } else {
        showToast(json.message || 'Không thể lưu khung giờ đón khách.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi lưu khung giờ đón khách.', 'error');
    } finally {
      setSavingAvailability(false);
    }
  };

  // ============================================================
  // HANDLERS: MAINTENANCE & LANDLORD PASSWORD CHANGE
  // ============================================================
  const handleCreateMaintenance = async (payload: {
    room_id: number;
    tenant_name: string;
    tenant_phone: string;
    category: MaintenanceRequest['category'];
    priority: MaintenanceRequest['priority'];
    title: string;
    description: string;
    repair_cost: number;
  }): Promise<boolean> => {
    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_MAINTENANCE',
          landlordId: currentLandlordId,
          maintenanceData: payload,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setMaintenanceRequests((prev) => [json.data, ...prev]);
        showToast(json.message || 'Đã tạo phiếu yêu cầu sửa chữa.');
        return true;
      }
      showToast(json.message || 'Không thể tạo phiếu sửa chữa.', 'error');
      return false;
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi tạo phiếu sửa chữa.', 'error');
      return false;
    }
  };

  const handleUpdateMaintenance = async (
    id: string,
    updates: {
      status?: MaintenanceRequest['status'];
      repair_cost?: number;
      resolution_note?: string;
    }
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_MAINTENANCE',
          landlordId: currentLandlordId,
          id,
          ...updates,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setMaintenanceRequests((prev) =>
          prev.map((m) => (m.id === id ? json.data : m))
        );
        showToast(json.message || 'Đã cập nhật trạng thái phiếu sửa chữa.');
        return true;
      }
      showToast(json.message || 'Không thể cập nhật phiếu sửa chữa.', 'error');
      return false;
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi cập nhật phiếu sửa chữa.', 'error');
      return false;
    }
  };

  const handleChangeLandlordPassword = async (payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<boolean> => {
    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CHANGE_LANDLORD_PASSWORD',
          landlordId: currentLandlordId,
          currentPassword: payload.currentPassword,
          newPassword: payload.newPassword,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || 'Đã đổi mật khẩu bảo mật thành công.');
        return true;
      }
      showToast(json.message || 'Không thể đổi mật khẩu.', 'error');
      return false;
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi đổi mật khẩu.', 'error');
      return false;
    }
  };

  // Prefill helper for CheckInModal based on known deposit claims, appointments & latest bill
  const checkInDefaults = useMemo(() => {
    if (!selectedRoomForCheckIn) return null;
    const depositClaim = selectedRoomForCheckIn.deposit_claim;
    const relatedApt = appointments.find(
      (a) =>
        a.room_id === selectedRoomForCheckIn.id &&
        (a.status === 'CONFIRMED' || a.status === 'COMPLETED' || a.status === 'PENDING')
    );
    const latestBill = latestBillForRoom(bills, selectedRoomForCheckIn.id);
    return {
      defaultTenantName:
        depositClaim?.tenant_name || relatedApt?.user_name || '',
      defaultTenantPhone:
        depositClaim?.tenant_phone || relatedApt?.user_phone || '',
      defaultElectric: latestBill?.electric_new ?? 0,
      defaultWater: latestBill?.water_new ?? 0,
    };
  }, [selectedRoomForCheckIn, appointments, bills]);

  // ============================================================
  // AUTH GATE SKELETON
  // ============================================================
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0F223A] text-white flex items-center justify-center p-4 font-sans">
        <div className="text-center">
          <div className="w-11 h-11 rounded-xl border-3 border-[#B89C66] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#E5D7B7]">
            Đang kiểm tra phiên đăng nhập cổng chủ trọ...
          </p>
        </div>
      </div>
    );
  }

  // Confirm Dialog copy based on pendingConfirm
  const confirmConfig = (() => {
    if (!pendingConfirm) return null;
    if (pendingConfirm.kind === 'DELETE_ROOM') {
      const r = pendingConfirm.room;
      return {
        title: `Xác nhận xóa phòng ${r.room_code}`,
        targetLabel: `Phòng ${r.room_code} — ${r.title} (${r.district})`,
        consequence:
          'Phòng này sẽ bị gỡ khỏi danh sách quản lý và không còn hiển thị cho khách tìm thuê. Hãy chắc chắn phòng không còn hợp đồng đang hiệu lực.',
        confirmLabel: 'Xóa phòng này',
        tone: 'danger' as const,
      };
    }
    if (pendingConfirm.kind === 'CANCEL_APPOINTMENT') {
      const a = pendingConfirm.appointment;
      return {
        title: 'Xác nhận hủy lịch hẹn xem phòng',
        targetLabel: `Khách ${a.user_name} (${a.user_phone}) • Khung giờ ${a.time_slot}`,
        consequence:
          'Lịch hẹn sẽ chuyển sang trạng thái "Đã hủy" và phòng sẽ tự động mở lại trạng thái "Còn trống" để đón khách khác.',
        confirmLabel: 'Xác nhận hủy lịch',
        tone: 'danger' as const,
      };
    }
    const c = pendingConfirm.contract;
    return {
      title: 'Xác nhận thanh lý hợp đồng thuê',
      targetLabel: `Hợp đồng #${c.id.slice(-8).toUpperCase()} — Khách thuê ${c.tenant_name} (Phòng #${c.room_id})`,
      consequence:
        'Hợp đồng sẽ kết thúc hiệu lực ("Đã thanh lý") và phòng sẽ lập tức chuyển về trạng thái "Còn trống". Nếu cần tính toán khấu trừ cọc chi tiết, bạn nên dùng chức năng "Trả phòng & quyết toán cọc".',
      confirmLabel: 'Thanh lý hợp đồng',
      tone: 'warning' as const,
    };
  })();

  return (
    <>
      <LandlordShell
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        counts={navCounts}
        session={session}
        currentLandlord={currentLandlord}
        allLandlords={allLandlords}
        propertySummary={propertySummary}
        onSwitchLandlord={handleSwitchLandlord}
        onLogout={handleLogout}
        onRefresh={() => loadLandlordData(currentLandlordId, { silent: true })}
        refreshing={refreshing}
        onQuickCreateRoom={handleOpenCreateRoom}
        onQuickCreateBill={() => handleOpenBillDrawer()}
        onQuickCreateContract={() => handleOpenContractDrawer()}
      >
        {/* Error Banner (with Retry) */}
        {loadError && (
          <div className="mb-5">
            <ErrorBanner
              message={loadError}
              onRetry={() => loadLandlordData(currentLandlordId)}
            />
          </div>
        )}

        {/* TAB 1: TỔNG QUAN */}
        {activeTab === 'overview' &&
          (initialLoading ? (
            <OverviewSkeleton />
          ) : (
            <LandlordOverviewTab
              managerName={managerName}
              rooms={rooms}
              appointments={appointments}
              bills={bills}
              contracts={contracts}
              busyActionId={busyActionId}
              onNavigateRooms={(statusFilter) => {
                setRoomFilterStatus(statusFilter);
                setActiveTab('rooms');
              }}
              onNavigateAppointments={(view) => {
                setAptActiveView(view);
                setAptOnlyToday(false);
                setActiveTab('appointments');
              }}
              onNavigateBilling={(statusFilter) => {
                setBillFilterStatus(statusFilter);
                setActiveTab('billing');
              }}
              onNavigateContracts={() => {
                setActiveTab('contracts');
              }}
              onConfirmAppointment={(apt) => handleUpdateAppointment(apt, 'CONFIRMED')}
              onRequestCancelAppointment={(apt) =>
                setPendingConfirm({ kind: 'CANCEL_APPOINTMENT', appointment: apt })
              }
              onCompleteAppointment={(apt) => handleUpdateAppointment(apt, 'COMPLETED')}
              onCreateContractFromAppointment={(apt) =>
                handleOpenContractDrawer({
                  roomId: apt.room_id,
                  tenantName: apt.user_name,
                  tenantPhone: apt.user_phone,
                })
              }
              onOpenCheckIn={(room) => setSelectedRoomForCheckIn(room)}
              onToggleBillPaid={handleToggleBillStatus}
              onOpenRenewContract={(contract) => setSelectedContractForRenew(contract)}
              onOpenCreateRoom={handleOpenCreateRoom}
            />
          ))}

        {/* TAB 2: PHÒNG CHO THUÊ */}
        {activeTab === 'rooms' &&
          (initialLoading ? (
            <ListSkeleton rows={6} />
          ) : (
            <LandlordRoomsTab
              rooms={rooms}
              statusFilter={roomFilterStatus}
              onStatusFilterChange={setRoomFilterStatus}
              searchQuery={roomSearchQuery}
              onSearchQueryChange={setRoomSearchQuery}
              buildingFilter={roomBuildingFilter}
              onBuildingFilterChange={setRoomBuildingFilter}
              onOpenCreateRoom={handleOpenCreateRoom}
              onOpenEditRoom={handleOpenEditRoom}
              onRequestDeleteRoom={(room) =>
                setPendingConfirm({ kind: 'DELETE_ROOM', room })
              }
              onUpdateRoomStatus={handleUpdateRoomStatus}
              onOpenCheckIn={(room) => setSelectedRoomForCheckIn(room)}
              onOpenCancelDeposit={(room) => setSelectedRoomForCancelDeposit(room)}
              onOpenBillingForRoom={(room) => handleOpenBillDrawer(room.id)}
              onOpenContractForRoom={(room) =>
                handleOpenContractDrawer({ roomId: room.id })
              }
            />
          ))}

        {/* TAB 3: LỊCH XEM PHÒNG */}
        {activeTab === 'appointments' &&
          (initialLoading ? (
            <ListSkeleton rows={5} />
          ) : (
            <LandlordAppointmentsTab
              appointments={appointments}
              rooms={rooms}
              activeView={aptActiveView}
              onViewChange={setAptActiveView}
              searchQuery={aptSearchQuery}
              onSearchQueryChange={setAptSearchQuery}
              onlyToday={aptOnlyToday}
              onOnlyTodayChange={setAptOnlyToday}
              busyActionId={busyActionId}
              onConfirmAppointment={(apt) => handleUpdateAppointment(apt, 'CONFIRMED')}
              onRequestCancelAppointment={(apt) =>
                setPendingConfirm({ kind: 'CANCEL_APPOINTMENT', appointment: apt })
              }
              onCompleteAppointment={(apt) => handleUpdateAppointment(apt, 'COMPLETED')}
              onCreateContractFromAppointment={(apt) =>
                handleOpenContractDrawer({
                  roomId: apt.room_id,
                  tenantName: apt.user_name,
                  tenantPhone: apt.user_phone,
                })
              }
              onSendHandoverFromAppointment={() => {
                setActiveTab('handover');
              }}
            />
          ))}

        {/* TAB 4: KHUNG GIỜ ĐÓN KHÁCH */}
        {activeTab === 'availability' &&
          (initialLoading ? (
            <ListSkeleton rows={4} />
          ) : (
            <LandlordAvailabilityTab
              availability={availability}
              saving={savingAvailability}
              onToggleDay={handleToggleDay}
              onToggleSlot={handleToggleSlot}
              onChangeNoticeHours={(hours) =>
                availability &&
                setAvailability({
                  ...availability,
                  notice_hours: hours,
                })
              }
              onChangeInstructions={(instructions) =>
                availability &&
                setAvailability({
                  ...availability,
                  instructions,
                })
              }
              onSave={handleSaveAvailability}
            />
          ))}

        {/* TAB 5: HÓA ĐƠN ĐIỆN NƯỚC */}
        {activeTab === 'billing' &&
          (initialLoading ? (
            <ListSkeleton rows={5} />
          ) : (
            <LandlordBillingTab
              bills={bills}
              rooms={rooms}
              contracts={contracts}
              statusFilter={billFilterStatus}
              onStatusFilterChange={setBillFilterStatus}
              searchQuery={billSearchQuery}
              onSearchQueryChange={setBillSearchQuery}
              drawerOpen={billDrawerOpen}
              onOpenDrawer={(roomId) => {
                if (roomId) setSelectedRoomForBill(roomId);
                setBillDrawerOpen(true);
              }}
              onCloseDrawer={() => setBillDrawerOpen(false)}
              selectedRoomId={selectedRoomForBill}
              onSelectRoomId={setSelectedRoomForBill}
              submittingBill={submittingBill}
              busyBillId={busyBillId}
              sendingBillId={sendingBillId}
              onCreateBill={handleCreateBill}
              onToggleBillStatus={handleToggleBillStatus}
              onPrintBill={(bill) => setSelectedBillForPrint(bill)}
              onSendBillEmail={handleSendBillEmail}
              onOpenPayQr={(bill) => setSelectedBillForPay(bill)}
            />
          ))}

        {/* TAB 6: HỢP ĐỒNG */}
        {activeTab === 'contracts' &&
          (initialLoading ? (
            <ListSkeleton rows={5} />
          ) : (
            <LandlordContractsTab
              contracts={contracts}
              rooms={rooms}
              appointments={appointments}
              statusFilter={contractFilterStatus}
              onStatusFilterChange={setContractFilterStatus}
              searchQuery={contractSearchQuery}
              onSearchQueryChange={setContractSearchQuery}
              drawerOpen={contractDrawerOpen}
              prefill={contractPrefill}
              onOpenDrawer={(prefill) => {
                setContractPrefill(prefill || null);
                setContractDrawerOpen(true);
              }}
              onCloseDrawer={() => setContractDrawerOpen(false)}
              submittingContract={submittingContract}
              onCreateContract={handleCreateContract}
              onPrintContract={(contract) => setSelectedContractForPrint(contract)}
              onOpenRenewContract={(contract) => setSelectedContractForRenew(contract)}
              onOpenCheckOutContract={(contract) => setSelectedContractForCheckOut(contract)}
              onRequestTerminateContract={(contract) =>
                setPendingConfirm({ kind: 'TERMINATE_CONTRACT', contract })
              }
            />
          ))}

        {/* TAB 7: NỘI QUY & PCCC */}
        {activeTab === 'rules' && (
          <HouseRulesManager
            landlordId={currentLandlordId}
            currentLandlordName={managerName}
            onToast={showToast}
          />
        )}

        {/* TAB 8: BÀN GIAO TÀI SẢN */}
        {activeTab === 'handover' && (
          <HandoverManager
            rooms={rooms}
            contracts={contracts}
            currentLandlordName={managerName}
            onToast={showToast}
          />
        )}

        {/* TAB 9: DOANH THU, CƯ DÂN, BẢO TRÌ & ĐỔI MẬT KHẨU */}
        {activeTab === 'operations' && (
          <LandlordOperationsTab
            rooms={rooms}
            contracts={contracts}
            bills={bills}
            maintenanceRequests={maintenanceRequests}
            currentLandlord={currentLandlord}
            onCreateMaintenance={handleCreateMaintenance}
            onUpdateMaintenance={handleUpdateMaintenance}
            onChangePassword={handleChangeLandlordPassword}
          />
        )}
      </LandlordShell>

      {/* ============================================================ */}
      {/* TOAST NOTIFICATION (Accessible, non-blocking)                */}
      {/* ============================================================ */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 max-w-md px-4 py-3 rounded-xl shadow-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 border transition-all duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-[#0F223A] border-[#B89C66] text-white shadow-black/25'
              : 'bg-rose-950 border-rose-700 text-white'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#B89C66] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
          )}
          <span className="flex-1 leading-snug">{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            aria-label="Đóng thông báo"
            className="p-1 rounded-lg text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* DRAWER: CREATE / EDIT ROOM                                   */}
      {/* ============================================================ */}
      <CreateEditRoomDrawer
        open={roomDrawerOpen}
        mode={roomDrawerMode}
        editingRoom={editingRoom}
        existingBuildings={propertySummary.buildings}
        defaultAddress={propertySummary.defaultAddress}
        defaultDistrict={propertySummary.defaultDistrict}
        defaultBuildingName={propertySummary.primaryBuildingName}
        submitting={submittingRoom}
        onClose={() => {
          setRoomDrawerOpen(false);
          setEditingRoom(null);
        }}
        onSubmit={handleSubmitRoomDrawer}
      />

      {/* ============================================================ */}
      {/* CONFIRMATION DIALOG (Delete room / Cancel apt / Terminate)   */}
      {/* ============================================================ */}
      {confirmConfig && (
        <ConfirmDialog
          open={Boolean(pendingConfirm)}
          onClose={() => {
            if (!confirmBusy) setPendingConfirm(null);
          }}
          onConfirm={handleConfirmDialogExecute}
          title={confirmConfig.title}
          targetLabel={confirmConfig.targetLabel}
          consequence={confirmConfig.consequence}
          confirmLabel={confirmConfig.confirmLabel}
          tone={confirmConfig.tone}
          loading={confirmBusy}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL: UTILITY BILL RECEIPT PRINT PREVIEW                    */}
      {/* ============================================================ */}
      <BillReceiptPrintModal
        bill={selectedBillForPrint}
        landlordName={managerName}
        onClose={() => setSelectedBillForPrint(null)}
      />

      {/* ============================================================ */}
      {/* MODAL: ELECTRONIC CONTRACT LEGAL PREVIEW                     */}
      {/* ============================================================ */}
      {selectedContractForPrint && (
        <ContractLegalModal
          contract={selectedContractForPrint}
          onClose={() => setSelectedContractForPrint(null)}
          landlordPhone={currentLandlord?.phone || session?.phone || '0908123456'}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL: MOVE-IN CHECK-IN                                      */}
      {/* ============================================================ */}
      {selectedRoomForCheckIn && (
        <CheckInModal
          room={selectedRoomForCheckIn}
          defaultTenantName={checkInDefaults?.defaultTenantName}
          defaultTenantPhone={checkInDefaults?.defaultTenantPhone}
          defaultElectric={checkInDefaults?.defaultElectric}
          defaultWater={checkInDefaults?.defaultWater}
          onClose={() => setSelectedRoomForCheckIn(null)}
          onSuccess={(res) => {
            showToast(res.message || 'Đã hoàn tất nhận phòng và kích hoạt hợp đồng.');
            loadLandlordData(currentLandlordId, { silent: true });
            if (res.data?.notification) {
              setPreviewEmailNotification(res.data.notification);
            }
          }}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL: CANCEL / FORFEIT DEPOSIT                              */}
      {/* ============================================================ */}
      {selectedRoomForCancelDeposit && (
        <CancelDepositModal
          room={selectedRoomForCancelDeposit}
          onClose={() => setSelectedRoomForCancelDeposit(null)}
          onSuccess={(res) => {
            showToast(
              res.message || 'Đã hủy giữ cọc và chuyển phòng về trạng thái "Còn trống".'
            );
            loadLandlordData(currentLandlordId, { silent: true });
          }}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL: RENEW CONTRACT                                        */}
      {/* ============================================================ */}
      {selectedContractForRenew && (
        <RenewContractModal
          contract={selectedContractForRenew}
          onClose={() => setSelectedContractForRenew(null)}
          onSuccess={(res) => {
            showToast(res.message || 'Đã gia hạn hợp đồng thành công.');
            loadLandlordData(currentLandlordId, { silent: true });
          }}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL: CHECK-OUT & REFUND SETTLEMENT                         */}
      {/* ============================================================ */}
      {selectedContractForCheckOut && (
        <CheckOutModal
          contract={selectedContractForCheckOut}
          onClose={() => setSelectedContractForCheckOut(null)}
          onSuccess={(res) => {
            showToast(res.message || 'Đã hoàn tất trả phòng và quyết toán tiền cọc.');
            loadLandlordData(currentLandlordId, { silent: true });
          }}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL: PAY BILL (VIETQR)                                     */}
      {/* ============================================================ */}
      {selectedBillForPay && (
        <PayBillModal
          bill={selectedBillForPay}
          viewerRole="LANDLORD"
          onClose={() => setSelectedBillForPay(null)}
          onSuccess={(res) => {
            showToast(res.message || 'Đã ghi nhận thanh toán hóa đơn thành công.');
            loadLandlordData(currentLandlordId, { silent: true });
          }}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL: EMAIL NOTIFICATION PREVIEW                            */}
      {/* ============================================================ */}
      {previewEmailNotification && (
        <EmailNotificationModal
          notification={previewEmailNotification}
          onClose={() => setPreviewEmailNotification(null)}
        />
      )}
    </>
  );
}
