'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Heart,
  User,
  Calendar,
  Users,
  ShieldCheck,
  LogOut,
  Mail,
  Phone,
  ImageIcon,
  Save,
  SlidersHorizontal,
  Plus,
  FileText,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Lock,
  Loader2,
  Sparkles,
  ChevronRight,
  Shield,
  Eye,
  CreditCard,
  CheckCheck,
  FileCheck2,
  ClipboardList,
  Zap,
  Droplets,
  RotateCcw,
  RefreshCw,
  Send,
  AlertTriangle,
  KeyRound,
  FileSignature,
  WalletCards,
  Bell,
  Trash2,
  Filter,
  CalendarClock,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import SavedRoomsPanel from '@/components/SavedRoomsPanel';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import DepositBookingModal from '@/components/DepositBookingModal';
import ContractLegalModal from '@/components/ContractLegalModal';
import HandoverDetailModal from '@/components/HandoverDetailModal';
import CancelDepositModal from '@/components/CancelDepositModal';
import RenewContractModal from '@/components/RenewContractModal';
import CheckOutModal from '@/components/CheckOutModal';
import PayBillModal from '@/components/PayBillModal';
import RescheduleDialog from '@/components/RescheduleDialog';
import PreferenceProfileForm from '@/components/PreferenceProfileForm';
import EmailNotificationModal from '@/components/EmailNotificationModal';
import type { RoommatePost, RoommateRequest, Appointment, UtilityBill, Room, Contract } from '@/lib/types';
import { useRealtime } from '@/lib/use-realtime';

export type ProfileTabType = 'PROFILE' | 'PREFERENCES' | 'APPOINTMENTS' | 'CONTRACTS' | 'BILLS' | 'SAVED' | 'ROOMMATE' | 'NOTIFICATIONS' | 'SECURITY';

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update: updateSession } = useSession();

  // Tab State: 'PROFILE' | 'APPOINTMENTS' | 'CONTRACTS' | 'BILLS' | 'ROOMMATE' | 'NOTIFICATIONS' | 'SECURITY'
  const tabParam = searchParams.get('tab');
  const initialTab: ProfileTabType =
    tabParam === 'appointments'
      ? 'APPOINTMENTS'
      : tabParam === 'contracts'
      ? 'CONTRACTS'
      : tabParam === 'bills'
      ? 'BILLS'
      : tabParam === 'saved'
      ? 'SAVED'
      : tabParam === 'preferences'
      ? 'PREFERENCES'
      : tabParam === 'roommate'
      ? 'ROOMMATE'
      : tabParam === 'notifications'
      ? 'NOTIFICATIONS'
      : tabParam === 'security'
      ? 'SECURITY'
      : 'PROFILE';

  const [activeTab, setActiveTab] = useState<ProfileTabType>(initialTab);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Profile Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [initialPhone, setInitialPhone] = useState('');
  const [email, setEmail] = useState('');
  const [image, setImage] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Password Change State (for non-Google accounts)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  // Data States
  const [isGoogleAccount, setIsGoogleAccount] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [myPosts, setMyPosts] = useState<RoommatePost[]>([]);
  const [sentRequests, setSentRequests] = useState<RoommateRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<RoommateRequest[]>([]);
  const [myContracts, setMyContracts] = useState<any[]>([]);
  const [myHandovers, setMyHandovers] = useState<any[]>([]);
  const [myBills, setMyBills] = useState<UtilityBill[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Notification Inbox States for Tenant
  const [userNotifications, setUserNotifications] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [notifCategory, setNotifCategory] = useState<'ALL' | 'CONTRACT' | 'BILL' | 'APPOINTMENT' | 'LIFECYCLE'>('ALL');
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Deposit & Legal & Lifecycle Modal State
  const [depositAppointment, setDepositAppointment] = useState<Appointment | null>(null);
  const [viewingContract, setViewingContract] = useState<any | null>(null);
  const [selectedHandover, setSelectedHandover] = useState<any | null>(null);
  const [selectedViewedRoomId, setSelectedViewedRoomId] = useState<number | null>(null);

  const [selectedBillForPay, setSelectedBillForPay] = useState<UtilityBill | null>(null);
  const [cancelDepositTargetRoom, setCancelDepositTargetRoom] = useState<Room | null>(null);
  const [renewContractTarget, setRenewContractTarget] = useState<Contract | null>(null);
  const [checkOutContractTarget, setCheckOutContractTarget] = useState<Contract | null>(null);
  const [previewEmailNotification, setPreviewEmailNotification] = useState<any | null>(null);

  // Sync tab from URL if changes
  useEffect(() => {
    if (tabParam === 'appointments') setActiveTab('APPOINTMENTS');
    else if (tabParam === 'contracts') setActiveTab('CONTRACTS');
    else if (tabParam === 'bills') setActiveTab('BILLS');
    else if (tabParam === 'saved') setActiveTab('SAVED');
    else if (tabParam === 'preferences') setActiveTab('PREFERENCES');
    else if (tabParam === 'roommate') setActiveTab('ROOMMATE');
    else if (tabParam === 'notifications') setActiveTab('NOTIFICATIONS');
    else if (tabParam === 'security') setActiveTab('SECURITY');
  }, [tabParam]);

  // Load user data
  useEffect(() => {
    if (status === 'unauthenticated') {
      setLoadingData(false);
      return;
    }

    if (status === 'authenticated' && session?.user) {
      setName(session.user.name || '');
      setPhone(session.user.phone || '');
      setInitialPhone(session.user.phone || '');
      setEmail(session.user.email || '');
      setImage(
        session.user.image ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
      );

      const isGoogle = Boolean(session.user.image?.includes('googleusercontent.com'));
      setIsGoogleAccount(isGoogle);

      fetch('/api/user/profile', { cache: 'no-store' })
        .then((res) => res.json())
        .then((json) => {
          if (json?.success && json.data) {
            setIsGoogleAccount(Boolean(json.data.isGoogle));
            if (json.data.name) setName(json.data.name);
            if (json.data.phone !== undefined) {
              setPhone(json.data.phone || '');
              setInitialPhone(json.data.phone || '');
            }
            if (json.data.image) setImage(json.data.image);
          }
        })
        .catch(() => {});

      fetchUserData();
      fetchTenantNotifications();
    }
  }, [status, session]);

  useEffect(() => {
    const handleUpdate = () => fetchTenantNotifications();
    window.addEventListener('notification-updated', handleUpdate);
    return () => window.removeEventListener('notification-updated', handleUpdate);
  }, [status, session]);

  const fetchTenantNotifications = async () => {
    if (status !== 'authenticated' || !session?.user) return;
    try {
      setLoadingNotifs(true);
      const res = await fetch('/api/notifications?scope=mine');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setUserNotifications(json.data);
        const count = typeof json.unreadCount === 'number'
          ? json.unreadCount
          : json.data.filter((n: any) => !n.isRead).length;
        setUnreadNotifCount(count);
      }
    } catch (e) {
      console.warn('Error fetching tenant notifications:', e);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setUserNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadNotifCount(0);
        window.dispatchEvent(new Event('notification-updated'));
      }
    } catch {}
  };

  const handleToggleReadNotif = async (notif: any) => {
    const nextReadState = !notif.isRead;
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notif.id, isRead: nextReadState }),
      });
      if (res.ok) {
        setUserNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: nextReadState } : n))
        );
        setUnreadNotifCount((prev) => (nextReadState ? Math.max(0, prev - 1) : prev + 1));
        window.dispatchEvent(new Event('notification-updated'));
      }
    } catch {}
  };

  const handleDeleteNotif = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thông báo này khỏi hộp thư?')) return;
    try {
      const res = await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const deletedItem = userNotifications.find((n) => n.id === id);
        setUserNotifications((prev) => prev.filter((n) => n.id !== id));
        if (deletedItem && !deletedItem.isRead) {
          setUnreadNotifCount((prev) => Math.max(0, prev - 1));
        }
        window.dispatchEvent(new Event('notification-updated'));
      }
    } catch {}
  };

  const handleOpenNotifModal = async (notif: any) => {
    if (!notif.isRead) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: notif.id, isRead: true }),
        });
        setUserNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadNotifCount((prev) => Math.max(0, prev - 1));
        window.dispatchEvent(new Event('notification-updated'));
      } catch {}
    }
    setPreviewEmailNotification(notif);
  };

  const handleSelectRoom = (roomId: number) => {
    setSelectedViewedRoomId(roomId);
    fetchUserData(roomId);
  };

  // Đồng bộ thời gian thực: chủ trọ xác nhận lịch, lập hóa đơn, hợp đồng thay đổi → tải lại hồ sơ
  useRealtime(['appointment', 'contract', 'bill', 'notification', 'roommate'], () => {
    fetchUserData();
  }, { enabled: status === 'authenticated', debounceMs: 1000 });

  const fetchUserData = async (overrideRoomId?: number) => {
    setLoadingData(true);
    fetchTenantNotifications();
    try {
      const userId = session?.user?.id;
      if (!userId) return;

      // 1. Fetch appointments
      let userAppointments: Appointment[] = [];
      try {
        const queryParams = new URLSearchParams();
        if (userId) queryParams.set('userId', userId);
        if (session?.user?.phone) queryParams.set('phone', session.user.phone);
        const resAppt = await fetch(`/api/appointments?${queryParams.toString()}`);
        const dataAppt = await resAppt.json();
        if (dataAppt.success && Array.isArray(dataAppt.data)) {
          userAppointments = dataAppt.data;
          setAppointments(userAppointments);
        } else {
          setAppointments([]);
        }
      } catch (err) {
        console.error('Error fetching appointments', err);
        setAppointments([]);
      }

      // Xác định duy nhất 1 phòng đã xem để áp dụng Hợp đồng & Bàn giao:
      // CHỈ KHI tài khoản có cuộc hẹn thực tế (userAppointments.length > 0) mới xác định targetAppt.
      // Nếu là tài khoản mới (userAppointments rỗng) -> targetAppt là null, không gán hợp đồng/biên bản nào!
      const currentSelectedId = overrideRoomId !== undefined ? overrideRoomId : selectedViewedRoomId;
      const completedAppt = userAppointments.find((a: any) => a.status === 'COMPLETED');
      const confirmedAppt = userAppointments.find((a: any) => a.status === 'CONFIRMED');
      const targetAppt = userAppointments.length > 0
        ? ((currentSelectedId ? userAppointments.find((a: any) => a.room_id === currentSelectedId) : null) ||
           completedAppt ||
           confirmedAppt ||
           userAppointments[0] ||
           null)
        : null;

      // 2. Fetch my roommate posts
      try {
        // authorId lọc đúng bài của mình (userId chỉ dùng để chấm điểm phù hợp, không lọc)
        const resPosts = await fetch(`/api/roommate/posts?authorId=${encodeURIComponent(userId)}`);
        const dataPosts = await resPosts.json();
        if (dataPosts.success && Array.isArray(dataPosts.data)) {
          setMyPosts(dataPosts.data);
        }
      } catch (err) {
        console.error('Error fetching posts', err);
      }

      // 3. Fetch sent requests
      try {
        const resSent = await fetch(`/api/roommate/requests?requesterId=${userId}`);
        const dataSent = await resSent.json();
        if (dataSent.success && Array.isArray(dataSent.data)) {
          setSentRequests(dataSent.data);
        }
      } catch (err) {
        console.error('Error fetching sent requests', err);
      }

      // 4. Fetch received requests
      try {
        const resRecv = await fetch(`/api/roommate/requests?ownerId=${userId}`);
        const dataRecv = await resRecv.json();
        if (dataRecv.success && Array.isArray(dataRecv.data)) {
          setReceivedRequests(dataRecv.data);
        }
      } catch (err) {
        console.error('Error fetching received requests', err);
      }

      // 5. Lấy dữ liệu Hợp đồng, Biên bản bàn giao và Hóa đơn thực tế từ máy chủ
      // Hỗ trợ cả hợp đồng sau khi đặt lịch xem phòng VÀ hợp đồng do chủ trọ lập trực tiếp theo SĐT khách thuê
      const targetRoomId =
        overrideRoomId !== undefined
          ? overrideRoomId
          : targetAppt
          ? targetAppt.room_id
          : null;

      // 5a. Fetch real contracts for user (server API đã lọc theo SĐT của tài khoản đang đăng nhập)
      let activeContractRoomId: number | null = targetRoomId ? Number(targetRoomId) : null;
      try {
        const resContracts = await fetch('/api/landlords?type=contracts', { cache: 'no-store' });
        const dataContracts = await resContracts.json();
        const userContracts =
          dataContracts.success && Array.isArray(dataContracts.data) ? dataContracts.data : [];

        const matchedByRoom = targetRoomId
          ? userContracts.filter((c: any) => Number(c.room_id) === Number(targetRoomId))
          : userContracts;

        const finalContracts = matchedByRoom.length > 0 ? matchedByRoom : userContracts;
        setMyContracts(finalContracts);
        if (finalContracts.length > 0) {
          activeContractRoomId = Number(finalContracts[0].room_id);
        }
      } catch (err) {
        console.error('Error fetching contracts', err);
        setMyContracts([]);
      }

      // 5b. Fetch real handovers for user (server API đã lọc theo quyền sở hữu của khách thuê)
      try {
        const resHandover = await fetch('/api/handover', { cache: 'no-store' });
        const dataHandover = await resHandover.json();
        const userHandovers =
          dataHandover.success && Array.isArray(dataHandover.data) ? dataHandover.data : [];

        const matchedByRoom = activeContractRoomId
          ? userHandovers.filter((h: any) => Number(h.room_id) === Number(activeContractRoomId))
          : userHandovers;

        setMyHandovers(matchedByRoom.length > 0 ? matchedByRoom : userHandovers);
      } catch (err) {
        console.error('Error fetching handovers', err);
        setMyHandovers([]);
      }

      // 5c. Fetch real utility bills for user
      try {
        const billQuery = activeContractRoomId ? `?roomId=${activeContractRoomId}` : '';
        const resBills = await fetch(`/api/bills${billQuery}`, { cache: 'no-store' });
        const dataBills = await resBills.json();
        if (dataBills.success && Array.isArray(dataBills.data)) {
          setMyBills(dataBills.data);
        } else {
          setMyBills([]);
        }
      } catch (err) {
        console.error('Error fetching bills', err);
        setMyBills([]);
      }
    } finally {
      setLoadingData(false);
    }
  };

  // Xử lý tải ảnh đại diện từ thiết bị (nén & cắt chuẩn 256x256 bằng Canvas)
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfileErrorMsg('');
    setProfileSuccessMsg('');

    if (!file.type.startsWith('image/')) {
      setProfileErrorMsg('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileErrorMsg('Dung lượng ảnh tối đa 5MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setImage(compressedDataUrl);
          setProfileSuccessMsg('Đã chọn ảnh đại diện mới. Hãy bấm "Lưu thay đổi" để lưu vào hồ sơ.');
        }
      };
      img.onerror = () => {
        setProfileErrorMsg('Không thể đọc tệp ảnh đã chọn.');
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, image }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileErrorMsg(data.message || 'Không thể cập nhật hồ sơ');
      } else {
        const savedPhone = data.data?.phone ?? phone;
        const savedPhoneVerified = data.data?.phoneVerified ?? (savedPhone === initialPhone
          ? session?.user?.phoneVerified
          : false);
        setPhone(savedPhone);
        setInitialPhone(savedPhone);
        setProfileSuccessMsg(
          savedPhoneVerified
            ? 'Lưu thay đổi thông tin cá nhân thành công!'
            : 'Đã lưu hồ sơ. Số điện thoại mới cần được xác minh lại.'
        );
        if (updateSession) {
          await updateSession({ name, phone: savedPhone, phoneVerified: savedPhoneVerified, image });
        }
        setTimeout(() => setProfileSuccessMsg(''), 4000);
      }
    } catch {
      setProfileErrorMsg('Lỗi kết nối khi lưu thông tin.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Request Status Update
  const handleUpdateRequestStatus = async (requestId: string, newStatus: 'ACCEPTED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/roommate/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setReceivedRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
        );
      } else {
        alert(data.message || 'Không cập nhật được trạng thái yêu cầu ở ghép. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error('Failed to update request status', err);
      alert('Lỗi kết nối máy chủ.');
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    setCancellingAppointmentId(appointmentId);
    try {
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appointmentId, status: 'CANCELLED' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileErrorMsg(data.message || 'Không thể hủy lịch hẹn.');
        return;
      }
      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === appointmentId
            ? { ...appointment, status: 'CANCELLED' }
            : appointment
        )
      );
      setProfileSuccessMsg('Đã hủy lịch hẹn. Khung giờ được mở lại cho khách thuê khác.');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    } catch {
      setProfileErrorMsg('Lỗi kết nối khi hủy lịch hẹn.');
    } finally {
      setCancellingAppointmentId(null);
    }
  };

  // Not Logged In View
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex flex-col bg-[#0A192F] text-slate-100">
        <Navbar />
        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-16 flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-[#B89C66]/20 border border-[#B89C66]/40 flex items-center justify-center mb-5 text-[#B89C66] shadow-lg shadow-[#B89C66]/15">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Đăng nhập để xem hồ sơ</h1>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Vui lòng đăng nhập tài khoản của bạn để quản lý thông tin cá nhân, theo dõi lịch xem phòng và các bài đăng ở ghép.
          </p>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="w-full py-3.5 bg-[#B89C66] hover:bg-[#A38752] text-white font-bold text-sm rounded-2xl shadow-xl shadow-[#B89C66]/25 transition-all cursor-pointer"
          >
            Đăng nhập ngay
          </button>
        </main>
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          defaultTab="login"
        />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F6] text-[#0F223A] selection:bg-[#B89C66] selection:text-white font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* ============================================================ */}
        {/* TOP PROFILE HEADER CARD (Matches User Image 1, 2, 3, 4)      */}
        {/* ============================================================ */}
        <section className="bg-[#112338] border border-[#1E3A5B] rounded-[28px] p-5 sm:p-7 mb-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#B89C66]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-5 relative z-10">
            {/* User Avatar & Info */}
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="relative group">
                <img
                  src={
                    image ||
                    session?.user?.image ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
                  }
                  alt={name || 'User Avatar'}
                  className="w-20 h-20 sm:w-22 sm:h-22 rounded-full object-cover border-3 border-[#B89C66]/50 shadow-md shadow-black/40"
                />
                {/* Google or Phone Badge */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 bg-[#0F223A] border border-[#B89C66]/60 rounded-full px-2 py-0.5 text-[9px] font-bold text-[#B89C66] flex items-center gap-1 shadow-sm">
                  {isGoogleAccount ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#B89C66]" />
                      <span>Google</span>
                    </>
                  ) : (
                    <>
                      <Phone className="w-2.5 h-2.5 text-[#B89C66]" />
                      <span>SĐT</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {name || session?.user?.name || 'Khách thuê Elite Living'}
                </h1>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-300 mt-1">
                  <Mail className="w-3.5 h-3.5 text-[#B89C66]" />
                  <span>{email || session?.user?.email || 'Chưa cập nhật email'}</span>
                </div>
                <div className="mt-2 flex items-center justify-center sm:justify-start gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B89C66]/20 text-[#B89C66] border border-[#B89C66]/30">
                    {session?.user?.role === 'ADMIN'
                      ? 'Quản trị viên'
                      : session?.user?.role === 'LANDLORD'
                      ? 'Chủ trọ đối tác'
                      : 'Khách thuê Elite Living'}
                  </span>
                  {session?.user?.phoneVerified && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#142842] text-slate-200 border border-[#1E3A5B] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-[#B89C66]" /> Đã xác minh
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Quick Stats (Matches Images) */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
              {/* Stat 1: Lịch tư vấn */}
              <div className="bg-[#142842] border border-[#1E3A5B] rounded-2xl px-5 py-3.5 text-center min-w-[105px]">
                <p className="text-2xl font-black text-white leading-none">
                  {appointments.length}
                </p>
                <p className="text-[11px] text-slate-400 font-medium mt-1">Lịch tư vấn</p>
              </div>

              {/* Stat 2: Trạng thái (Champagne Gold / Navy instead of green!) */}
              <div className="bg-[#142842] border border-[#1E3A5B] rounded-2xl px-5 py-3.5 text-center min-w-[115px]">
                <p className="text-base sm:text-lg font-black text-[#B89C66] leading-snug">
                  Hoạt động
                </p>
                <p className="text-[11px] text-slate-400 font-medium">Trạng thái</p>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Tiến trình thuê phòng" className="mb-6 rounded-[24px] border border-[#1E3A5B] bg-[#112338] p-4 sm:p-5 shadow-lg">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#B89C66]">Tiến trình của bạn</p>
              <h2 className="mt-1 text-base font-extrabold text-white">Từ xem phòng đến đóng tiền</h2>
            </div>
            <Link href="/#danh-sach-toa-nha" className="inline-flex items-center gap-1 text-xs font-bold text-[#B89C66] hover:text-[#E5D7B7]">
              Tìm thêm phòng <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {[
              { label: 'Lịch xem', value: appointments.length, icon: Calendar, tab: 'APPOINTMENTS' as ProfileTabType },
              { label: 'Hợp đồng', value: myContracts.length, icon: FileSignature, tab: 'CONTRACTS' as ProfileTabType },
              { label: 'Bàn giao', value: myHandovers.length, icon: ClipboardList, tab: 'CONTRACTS' as ProfileTabType },
              { label: 'Hóa đơn chưa trả', value: myBills.filter((bill) => bill.status === 'UNPAID').length, icon: WalletCards, tab: 'BILLS' as ProfileTabType },
              { label: 'Thông báo mới', value: unreadNotifCount, icon: Bell, tab: 'NOTIFICATIONS' as ProfileTabType },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActiveTab(item.tab)}
                  className="flex items-center gap-3 rounded-2xl border border-[#1E3A5B] bg-[#142842] p-3 text-left transition-all hover:border-[#B89C66]/60 hover:bg-[#172E49]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#B89C66]/15 text-[#B89C66]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>
                    <strong className="block text-base font-black text-white">{item.value}</strong>
                    <span className="block text-[10px] font-semibold text-slate-400">{item.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ============================================================ */}
        {/* MAIN BODY: 2 COLUMNS (Sidebar Menu & Content Box)            */}
        {/* ============================================================ */}
        <div className="grid min-w-0 grid-cols-1 items-start gap-6 md:grid-cols-12">
          {/* ---------------------------------------------------------- */}
          {/* LEFT SIDEBAR (Width: 4/12 md, 3/12 lg)                     */}
          {/* Note: BỎ THƯỞNG GIỚI THIỆU THEO YÊU CẦU CỦA NGƯỜI DÙNG     */}
          {/* ---------------------------------------------------------- */}
          <aside className="md:col-span-4 lg:col-span-3 bg-[#112338] border border-[#1E3A5B] rounded-[24px] p-3 space-y-1.5 shadow-lg">
            {/* 1. Thông tin cá nhân */}
            <button
              type="button"
              onClick={() => setActiveTab('PROFILE')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'PROFILE'
                  ? 'bg-[#B89C66] text-white shadow-lg shadow-[#B89C66]/25'
                  : 'text-slate-300 hover:text-white hover:bg-[#142842]'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span>Thông tin cá nhân</span>
            </button>

            {/* 1b. Hồ sơ nhu cầu (dùng cho gợi ý Top-K) */}
            <button
              type="button"
              onClick={() => setActiveTab('PREFERENCES')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'PREFERENCES'
                  ? 'bg-[#B89C66] text-white shadow-lg shadow-[#B89C66]/25'
                  : 'text-slate-300 hover:text-white hover:bg-[#142842]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              <span>Hồ sơ nhu cầu</span>
            </button>

            {/* 2. Lịch sử xem phòng */}
            <button
              type="button"
              onClick={() => setActiveTab('APPOINTMENTS')}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'APPOINTMENTS'
                  ? 'bg-[#B89C66] text-white shadow-lg shadow-[#B89C66]/25'
                  : 'text-slate-300 hover:text-white hover:bg-[#142842]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Lịch sử xem phòng</span>
              </div>
              {appointments.length > 0 && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    activeTab === 'APPOINTMENTS' ? 'bg-black/20 text-white' : 'bg-[#1E3A5B] text-[#B89C66]'
                  }`}
                >
                  {appointments.length}
                </span>
              )}
            </button>

            {/* 3. Hợp đồng & Bàn giao */}
            <button
              type="button"
              onClick={() => setActiveTab('CONTRACTS')}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'CONTRACTS'
                  ? 'bg-[#B89C66] text-white shadow-lg shadow-[#B89C66]/25'
                  : 'text-slate-300 hover:text-white hover:bg-[#142842]'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileCheck2 className="w-4 h-4 shrink-0" />
                <span>Hợp đồng &amp; Bàn giao</span>
              </div>
              {(myContracts.length > 0 || myHandovers.length > 0) && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    activeTab === 'CONTRACTS' ? 'bg-black/20 text-white' : 'bg-[#1E3A5B] text-[#B89C66]'
                  }`}
                >
                  {myContracts.length + myHandovers.length}
                </span>
              )}
            </button>

            {/* 4. Hóa đơn & Tiền điện nước */}
            <button
              type="button"
              onClick={() => setActiveTab('BILLS')}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'BILLS'
                  ? 'bg-[#B89C66] text-white shadow-lg shadow-[#B89C66]/25'
                  : 'text-slate-300 hover:text-white hover:bg-[#142842]'
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>Hóa đơn &amp; Điện nước</span>
              </div>
              {myBills.length > 0 && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    activeTab === 'BILLS' ? 'bg-black/20 text-white' : 'bg-[#1E3A5B] text-[#B89C66]'
                  }`}
                >
                  {myBills.filter((b) => b.status === 'UNPAID').length > 0 ? 'Mới' : myBills.length}
                </span>
              )}
            </button>

            {/* 4b. Phòng đã lưu (nút tim) */}
            <button
              type="button"
              onClick={() => setActiveTab('SAVED')}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'SAVED'
                  ? 'bg-[#B89C66] text-white shadow-lg shadow-[#B89C66]/25'
                  : 'text-slate-300 hover:text-white hover:bg-[#142842]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Heart className="w-4 h-4 shrink-0" />
                <span>Phòng đã lưu</span>
              </div>
            </button>

            {/* 5. Tin Ở Ghép Của Tôi */}
            <button
              type="button"
              onClick={() => setActiveTab('ROOMMATE')}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'ROOMMATE'
                  ? 'bg-[#B89C66] text-white shadow-lg shadow-[#B89C66]/25'
                  : 'text-slate-300 hover:text-white hover:bg-[#142842]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 shrink-0" />
                <span>Tin ở ghép của tôi</span>
              </div>
              {(myPosts.length > 0 || receivedRequests.length > 0) && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    activeTab === 'ROOMMATE' ? 'bg-black/20 text-white' : 'bg-[#1E3A5B] text-[#B89C66]'
                  }`}
                >
                  {myPosts.length + receivedRequests.length}
                </span>
              )}
            </button>

            {/* 6. Hộp thư thông báo */}
            <button
              type="button"
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'NOTIFICATIONS'
                  ? 'bg-[#B89C66] text-white shadow-lg shadow-[#B89C66]/25'
                  : 'text-slate-300 hover:text-white hover:bg-[#142842]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 shrink-0" />
                <span>Hộp thư thông báo</span>
              </div>
              {unreadNotifCount > 0 && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    activeTab === 'NOTIFICATIONS' ? 'bg-black/20 text-white' : 'bg-[#B89C66] text-[#0F223A]'
                  }`}
                >
                  {unreadNotifCount} mới
                </span>
              )}
            </button>

            {/* 7. Bảo mật & Mật khẩu */}
            <button
              type="button"
              onClick={() => setActiveTab('SECURITY')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'SECURITY'
                  ? 'bg-[#B89C66] text-white shadow-lg shadow-[#B89C66]/25'
                  : 'text-slate-300 hover:text-white hover:bg-[#142842]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Bảo mật & Mật khẩu</span>
            </button>

            {/* Divider */}
            <div className="pt-2 border-t border-[#1E3A5B]/80 my-1" />

            {/* 5. Đăng xuất */}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Đăng xuất</span>
            </button>
          </aside>

          {/* ---------------------------------------------------------- */}
          {/* RIGHT MAIN CONTENT AREA                                    */}
          {/* ---------------------------------------------------------- */}
          <section className="min-w-0 md:col-span-8 lg:col-span-9 bg-[#112338] border border-[#1E3A5B] rounded-[28px] p-6 sm:p-8 min-h-[500px] shadow-xl">
            {/* Top notification banner for incoming contracts/handovers */}
            {(myContracts.length > 0 || myHandovers.length > 0) && activeTab !== 'CONTRACTS' && (
              <div className="mb-6 p-4 bg-gradient-to-r from-[#142842] to-[#1E3A5B] border border-[#B89C66]/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-black/20 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#B89C66]/20 border border-[#B89C66]/40 flex items-center justify-center shrink-0">
                    <FileCheck2 className="w-5 h-5 text-[#B89C66]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <span>Văn bản pháp lý mới từ Chủ trọ</span>
                      <span className="w-2 h-2 rounded-full bg-[#B89C66] animate-ping" />
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Chủ trọ đã gửi {myContracts.length} Hợp đồng thuê điện tử (10 điều PCCC) &amp; {myHandovers.length} Biên bản bàn giao thiết bị phòng.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('CONTRACTS')}
                  className="px-4 py-2 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-extrabold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
                >
                  Kiểm tra &amp; Ký xác nhận ngay &rarr;
                </button>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 1: THÔNG TIN CÁ NHÂN (Photo 4)                       */}
            {/* ======================================================== */}
            {activeTab === 'PROFILE' && (
              <div>
                <div className="border-b border-[#1E3A5B] pb-4 mb-6">
                  <h2 className="text-xl font-black text-white tracking-tight">Thông tin cá nhân</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Cập nhật thông tin tài khoản và thông tin liên hệ của bạn
                  </p>
                </div>

                {profileSuccessMsg && (
                  <div className="mb-6 p-4 bg-[#B89C66]/15 border border-[#B89C66]/40 rounded-2xl text-xs text-[#E5D7B7] flex items-center gap-2.5 animate-in fade-in">
                    <CheckCircle2 className="w-5 h-5 text-[#B89C66] shrink-0" />
                    <span>{profileSuccessMsg}</span>
                  </div>
                )}

                {profileErrorMsg && (
                  <div className="mb-6 p-4 bg-rose-500/15 border border-rose-500/40 rounded-2xl text-xs text-rose-300 flex items-center gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <span>{profileErrorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Họ và tên */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-2">
                        Họ và tên *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ví dụ: Phạm Sỹ Nguyên"
                          className="w-full pl-11 pr-4 py-3 bg-[#142842] border border-[#1E3A5B] rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#B89C66] focus:ring-4 focus:ring-[#B89C66]/15 transition-all"
                        />
                      </div>
                    </div>

                    {/* Số điện thoại */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-2">
                        Số điện thoại
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Ví dụ: 0901234567"
                          className="w-full pl-11 pr-4 py-3 bg-[#142842] border border-[#1E3A5B] rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#B89C66] focus:ring-4 focus:ring-[#B89C66]/15 transition-all"
                        />
                      </div>
                    </div>

                    {/* Địa chỉ Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-2">
                        Địa chỉ Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          disabled
                          value={email}
                          className="w-full pl-11 pr-4 py-3 bg-[#0d1d30] border border-[#1E3A5B]/60 rounded-2xl text-xs text-slate-400 cursor-not-allowed select-none"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Email được cố định để bảo vệ tài khoản và lịch sử giao dịch.
                      </p>
                    </div>

                    {/* Ảnh đại diện: Tải ảnh lên từ thiết bị hoặc nhập URL */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-2">
                        Ảnh đại diện (Tải ảnh từ thiết bị)
                      </label>
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            image ||
                            session?.user?.image ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
                          }
                          alt="Xem trước ảnh đại diện"
                          className="w-12 h-12 rounded-full object-cover border-2 border-[#B89C66]/60 shrink-0"
                        />
                        <div className="flex-1 space-y-2">
                          <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#142842] hover:bg-[#1E3A5B] border border-[#B89C66]/50 rounded-xl text-xs font-bold text-[#B89C66] cursor-pointer transition-all">
                            <ImageIcon className="w-4 h-4" />
                            <span>Chọn tệp ảnh từ máy (JPG, PNG, WEBP)</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              onChange={handleAvatarFileChange}
                              className="hidden"
                            />
                          </label>
                          <input
                            type="text"
                            value={image.startsWith('data:image/') ? '' : image}
                            onChange={(e) => setImage(e.target.value)}
                            placeholder="Hoặc dán đường dẫn ảnh (https://...)"
                            className="w-full px-3.5 py-2 bg-[#142842] border border-[#1E3A5B] rounded-xl text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#B89C66] transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nút Lưu thay đổi (Vàng Champagne #B89C66) */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-6 py-3 bg-[#B89C66] hover:bg-[#A38752] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#B89C66]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {savingProfile ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>Lưu thay đổi</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: LỊCH SỬ XEM PHÒNG & TƯ VẤN (Photo 3)              */}
            {/* ======================================================== */}
            {activeTab === 'APPOINTMENTS' && (
              <div>
                <div className="border-b border-[#1E3A5B] pb-4 mb-6">
                  <h2 className="text-xl font-black text-white tracking-tight">
                    Lịch sử xem phòng & Tư vấn
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Danh sách các căn hộ và cuộc hẹn tư vấn bạn đã đăng ký với Elite Living
                  </p>
                </div>

                {appointments.length === 0 ? (
                  /* Empty state (Matches Photo 3) */
                  <div className="py-16 px-4 text-center flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#142842] border border-[#1E3A5B] flex items-center justify-center text-slate-400 mb-4 shadow-sm">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">Chưa có lịch hẹn nào</h3>
                    <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                      Khi bạn đăng ký tư vấn hoặc hẹn lịch xem phòng, danh sách sẽ tự động xuất hiện tại đây.
                    </p>
                    <Link
                      href="/#danh-sach-toa-nha"
                      className="px-5 py-2.5 bg-[#B89C66] hover:bg-[#A38752] text-white font-bold text-xs rounded-xl shadow-md shadow-[#B89C66]/20 transition-all inline-flex items-center gap-2"
                    >
                      <span>Khám phá phòng trọ ngay</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  /* List of appointments */
                  <div className="space-y-4">
                    {appointments.map((appt) => (
                      <div
                        key={appt.id}
                        className="min-w-0 overflow-hidden bg-[#142842] border border-[#1E3A5B] rounded-2xl p-4 sm:p-5 flex flex-col items-start gap-4 hover:border-[#B89C66]/50 transition-all"
                      >
                        <div className="flex w-full min-w-0 items-start gap-3 sm:gap-4">
                          {appt.room_image ? (
                            <img
                              src={appt.room_image}
                              alt={appt.room_title || 'Ảnh phòng'}
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-[#1E3A5B]"
                            />
                          ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#0F223A] border border-[#1E3A5B] flex items-center justify-center text-[#B89C66] shrink-0">
                              <Calendar className="w-7 h-7" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-[#B89C66] bg-[#B89C66]/15 border border-[#B89C66]/30 px-2.5 py-0.5 rounded-lg">
                                {appt.room_code || `Phòng #${appt.room_id}`}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-400">
                                Ngày hẹn: {new Date(appt.date).toLocaleDateString('vi-VN')}
                              </span>
                              {appt.price && (
                                <span className="text-xs font-bold text-[#B89C66]">
                                  {appt.price.toLocaleString('vi-VN')} đ/tháng
                                </span>
                              )}
                            </div>

                            <h4 className="break-words text-sm font-bold text-white">
                              {appt.room_title || appt.building_name || 'Căn hộ cho thuê Elite Living'}
                            </h4>

                            {appt.address && (
                              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#B89C66] shrink-0" />
                                <span className="min-w-0 truncate">{appt.address}</span>
                              </p>
                            )}

                            <p className="break-words text-xs text-slate-300">
                              Khung giờ: <strong className="text-[#B89C66]">{appt.time_slot}</strong> • SĐT: <strong>{appt.user_phone}</strong> ({appt.user_name})
                            </p>

                            {appt.notes && (
                              <p className="text-[11px] text-slate-400 italic">
                                &ldquo;{appt.notes}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
                          <span
                            className={`max-w-full px-3 py-1 rounded-full text-xs font-bold ${
                              appt.status === 'CONFIRMED'
                                ? 'bg-[#B89C66] text-white shadow-xs'
                                : appt.status === 'COMPLETED'
                                ? 'bg-slate-700 text-slate-200'
                                : 'bg-[#1E3A5B] text-[#B89C66] border border-[#B89C66]/30'
                            }`}
                          >
                            {appt.status === 'CONFIRMED'
                              ? 'Đã xác nhận'
                              : appt.status === 'COMPLETED'
                              ? 'Đã hoàn tất xem phòng'
                              : appt.status === 'CANCELLED'
                              ? 'Đã hủy'
                              : 'Chờ xác nhận'}
                          </span>

                          {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                            <button
                              type="button"
                              onClick={() => setRescheduleTarget(appt)}
                              className="inline-flex items-center gap-1 rounded-xl border border-[#B89C66]/40 bg-[#B89C66]/10 px-2.5 py-1 text-xs font-bold text-[#E5D7B7] transition-colors hover:bg-[#B89C66]/20"
                            >
                              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                              Đổi lịch
                            </button>
                          )}

                          {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                            <button
                              type="button"
                              onClick={() => handleCancelAppointment(appt.id)}
                              disabled={cancellingAppointmentId === appt.id}
                              className="inline-flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
                            >
                              {cancellingAppointmentId === appt.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              Hủy lịch
                            </button>
                          )}

                          {appt.status === 'COMPLETED' && (
                            (() => {
                              const isApptDeposited = Boolean(
                                appt.room_status === 'RESERVED' ||
                                appt.room_status === 'RENTED' ||
                                (typeof window !== 'undefined' && localStorage.getItem(`elite_deposited_room_${appt.room_id}`) === 'true') ||
                                myContracts.some((c: any) => Number(c.room_id) === Number(appt.room_id))
                              );

                              if (!isApptDeposited) {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedViewedRoomId(appt.room_id);
                                      setDepositAppointment(appt);
                                    }}
                                    className="flex max-w-full items-center gap-1.5 rounded-xl bg-[#B89C66] px-3 py-1 text-left text-xs font-extrabold text-[#0F223A] shadow-md shadow-[#B89C66]/25 transition-all hover:bg-[#A38752] active:scale-95"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" />
                                    <span>Đặt cọc &amp; Thuê phòng</span>
                                  </button>
                                );
                              }

                              return (
                                <div className="flex min-w-0 max-w-full flex-wrap items-center justify-start gap-2 sm:justify-end">
                                  <span className="flex max-w-full items-center gap-1 rounded-xl border border-[#B89C66]/40 bg-[#B89C66]/20 px-2.5 py-1 text-xs font-bold text-[#B89C66]">
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                    <span className="whitespace-normal">Đã đặt cọc giữ chỗ</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedViewedRoomId(appt.room_id);
                                      setActiveTab('CONTRACTS');
                                    }}
                                    className="flex max-w-full items-center gap-1 rounded-xl border border-[#B89C66]/40 bg-[#1E3A5B] px-3 py-1 text-left text-xs font-bold text-[#B89C66] transition-all hover:bg-[#B89C66] hover:text-[#0F223A]"
                                  >
                                    <FileCheck2 className="h-3.5 w-3.5 shrink-0" />
                                    <span className="whitespace-normal">Xem và ký hợp đồng</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCancelDepositTargetRoom({
                                        id: appt.room_id,
                                        title: appt.room_title || `Phòng #${appt.room_id}`,
                                        status: 'RESERVED',
                                        price: (appt as any).room_price || 0,
                                        deposit_amount: (appt as any).room_price || 0,
                                      } as any);
                                    }}
                                    className="flex max-w-full items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/15 px-2.5 py-1 text-left text-xs font-bold text-rose-300 transition-all hover:bg-rose-500/25"
                                    title="Hủy đặt cọc giữ chỗ (nếu không dọn vào đúng hạn hoặc đổi ý)"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Hủy cọc</span>
                                  </button>
                                </div>
                              );
                            })()
                          )}

                          <Link
                            href={`/phong/${appt.room_id}`}
                            className="shrink-0 p-2 rounded-xl bg-[#0F223A] border border-[#1E3A5B] text-[#B89C66] hover:bg-[#B89C66] hover:text-white transition-colors"
                            title="Xem chi tiết phòng"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    ))}

                    {/* KHU VỰC HỢP ĐỒNG & BIÊN BẢN BÀN GIAO TỪ CHỦ TRỌ */}
                    <div className="mt-8 pt-6 border-t border-[#1E3A5B] space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                            <FileCheck2 className="w-4 h-4 text-[#B89C66]" />
                            <span>Hợp đồng và biên bản bàn giao</span>
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Hợp đồng, nội quy tòa nhà và quy định PCCC do chủ trọ gửi
                          </p>
                        </div>
                      </div>

                      {myContracts.length === 0 && myHandovers.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-[#142842]/50 border border-dashed border-[#1E3A5B] text-center text-xs text-slate-400">
                          Chưa có hợp đồng hoặc biên bản bàn giao nào được gửi. Sau khi bạn đặt cọc, chủ trọ sẽ lập và gửi hợp đồng kèm 10 điều nội quy và biên bản CSVC tại đây.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Hợp đồng */}
                          {myContracts.map((c) => (
                            <div key={c.id} className="p-4 rounded-2xl bg-[#142842] border border-[#1E3A5B] space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-[#B89C66] bg-[#B89C66]/15 px-2 py-0.5 rounded border border-[#B89C66]/30">
                                  Hợp Đồng Thuê Số #{c.id.slice(-6)}
                                </span>
                                <span className="text-[10px] font-bold text-[#B89C66]">
                                  {c.status === 'ACTIVE' ? 'Đang hiệu lực' : 'Đã thanh lý'}
                                </span>
                              </div>
                              <h4 className="font-bold text-xs text-white">{c.room_title}</h4>
                              <p className="text-[11px] text-slate-400">
                                Thời hạn: {c.start_date} &rarr; {c.end_date} • Cọc: {c.deposit_amount?.toLocaleString('vi-VN')} đ
                              </p>
                              <div className="pt-2 flex items-center justify-between border-t border-[#1E3A5B]">
                                <span className="text-[10px] text-slate-400">Tích hợp 10 điều PCCC</span>
                                <button
                                  type="button"
                                  onClick={() => setViewingContract(c)}
                                  className="px-3 py-1 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-extrabold text-[11px] rounded-lg transition-colors cursor-pointer"
                                >
                                  Xem Hợp Đồng &amp; Nội Quy
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Biên bản bàn giao */}
                          {myHandovers.map((h) => (
                            <div key={h.id} className="p-4 rounded-2xl bg-[#142842] border border-[#1E3A5B] space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-[#B89C66] bg-[#B89C66]/15 px-2 py-0.5 rounded border border-[#B89C66]/30">
                                  Biên Bản {h.type === 'CHECK_IN' ? 'Nhận Phòng' : 'Trả Phòng'}
                                </span>
                                <span className={`text-[10px] font-bold ${h.tenant_confirmed ? 'text-[#B89C66]' : 'text-amber-400'}`}>
                                  {h.tenant_confirmed ? 'Đã ký nhận CSVC' : 'Chờ khách ký nhận'}
                                </span>
                              </div>
                              <h4 className="font-bold text-xs text-white">{h.room_title || `Phòng #${h.room_id}`}</h4>
                              <p className="text-[11px] text-slate-400">
                                Người bàn giao: {h.landlord_name} • Ngày: {new Date(h.handover_date).toLocaleDateString('vi-VN')}
                              </p>
                              <div className="pt-2 flex items-center justify-between border-t border-[#1E3A5B]">
                                <span className="text-[10px] text-slate-400">{h.items?.length || 5} thiết bị kiểm kê</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedHandover(h)}
                                  className="px-3 py-1 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-extrabold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  {h.tenant_confirmed ? (
                                    <>
                                      <CheckCheck className="w-3 h-3" />
                                      <span>Xem biên bản</span>
                                    </>
                                  ) : (
                                    <span>Kiểm tra và ký nhận</span>
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB: HỢP ĐỒNG & BIÊN BẢN BÀN GIAO                        */}
            {/* ======================================================== */}
            {activeTab === 'CONTRACTS' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="border-b border-[#1E3A5B] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                      <FileCheck2 className="w-5 h-5 text-[#B89C66]" />
                      <span>Hợp đồng &amp; Biên bản bàn giao</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Kiểm tra hợp đồng thuê điện tử tích hợp 10 điều nội quy PCCC và biên bản kiểm kê bàn giao cơ sở vật chất nhận phòng
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#B89C66]/20 text-[#B89C66] border border-[#B89C66]/30">
                      {myContracts.length} Hợp đồng phòng đã xem
                    </span>
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#142842] text-slate-300 border border-[#1E3A5B]">
                      {myHandovers.length} Biên bản bàn giao
                    </span>
                  </div>
                </div>

                {/* Important notice banner */}
                <div className="p-4 bg-gradient-to-r from-[#142842] to-[#0F223A] border border-[#B89C66]/40 rounded-2xl flex items-start gap-3 shadow-md">
                  <ShieldCheck className="w-5 h-5 text-[#B89C66] shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed text-slate-300">
                    <p className="font-bold text-white mb-0.5">Áp dụng cho 1 phòng bạn đã xem để ký hợp đồng</p>
                    <p>
                      Hệ thống tự động đồng bộ hợp đồng điện tử tích hợp đầy đủ 10 điều nội quy PCCC và biên bản kiểm kê CSVC cho đúng căn phòng bạn đã xem và chọn thuê. Quý khách vui lòng kiểm tra kỹ trước khi ký số điện tử.
                    </p>
                  </div>
                </div>

                {/* VIEWED ROOM SELECTOR IF USER VIEWED MULTIPLE ROOMS */}
                {appointments.length > 1 && (
                  <div className="p-4 bg-[#142842] border border-[#1E3A5B] rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">
                        Chọn phòng bạn đã xem để đối soát và ký hợp đồng:
                      </span>
                      <span className="text-[11px] text-[#B89C66] font-semibold">Chỉ áp dụng 1 phòng</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {appointments.map((a) => {
                        const isCurrent =
                          (myContracts[0]?.room_id === a.room_id) ||
                          (selectedViewedRoomId === a.room_id);
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => handleSelectRoom(a.room_id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                              isCurrent
                                ? 'bg-[#B89C66] text-[#0F223A] shadow-md shadow-[#B89C66]/25'
                                : 'bg-[#0F223A] text-slate-300 hover:text-white border border-[#1E3A5B]'
                            }`}
                          >
                            <span>{a.room_title || a.room_code || `Phòng #${a.room_id}`}</span>
                            {a.status === 'COMPLETED' ? (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  isCurrent ? 'bg-black/20 text-[#0F223A]' : 'bg-[#B89C66]/20 text-[#B89C66]'
                                }`}
                              >
                                Đã xem xong
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  isCurrent ? 'bg-black/20 text-[#0F223A]' : 'bg-[#B89C66]/20 text-[#E5D7B7]'
                                }`}
                              >
                                Lịch hẹn
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SUBSECTION 1: HỢP ĐỒNG ĐIỆN TỬ */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#B89C66]" />
                      <span>1. Hợp đồng thuê điện tử (Áp dụng 1 phòng đã xem để ký)</span>
                    </h3>
                    {myContracts.length > 0 && (
                      <span className="text-[11px] text-[#B89C66] font-bold bg-[#B89C66]/15 border border-[#B89C66]/30 px-2.5 py-0.5 rounded-full">
                        Duy nhất 1 phòng đã xem
                      </span>
                    )}
                  </div>

                  {myContracts.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-[#142842]/40 border border-dashed border-[#1E3A5B] text-center space-y-2">
                      <FileText className="w-8 h-8 text-slate-500 mx-auto" />
                      <p className="text-xs text-slate-300 font-bold">Chưa có hợp đồng nào được gửi</p>
                      <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                        Sau khi bạn hoàn tất buổi xem phòng và tiến hành đặt cọc giữ chỗ, chủ trọ sẽ lập hợp đồng điện tử tích hợp 10 điều nội quy và gửi đến tài khoản của bạn tại đây.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {myContracts.map((c) => {
                        const daysRemaining = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 3600 * 24));
                        const isExpiringSoon = c.status === 'ACTIVE' && daysRemaining <= 30;

                        return (
                          <div
                            key={c.id}
                            className="p-5 rounded-2xl bg-[#142842] border border-[#1E3A5B] hover:border-[#B89C66]/50 transition-all space-y-3.5 shadow-md"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase text-[#B89C66] bg-[#B89C66]/15 px-2.5 py-0.5 rounded-full border border-[#B89C66]/30">
                                  Hợp đồng #{c.id.slice(-6)}
                                </span>
                                <span className="text-[10px] font-bold text-slate-300 bg-[#0F223A] px-2.5 py-0.5 rounded-full border border-[#1E3A5B]">
                                  {c.status === 'ACTIVE' ? 'Đang hiệu lực' : 'Đã thanh lý'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {c.tenant_signed ? (
                                  <span className="text-[11px] font-bold text-[#B89C66] bg-[#B89C66]/10 border border-[#B89C66]/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Bạn đã ký số điện tử</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Chờ bạn ký số &amp; cam kết 10 điều nội quy</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Banner nhắc hạn hợp đồng & Tùy chọn Gia hạn hoặc Trả phòng */}
                            {isExpiringSoon && (
                              <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                  <div>
                                    <span className="font-bold text-white block">Nhắc hạn hợp đồng thuê</span>
                                    <span>Hợp đồng sẽ hết hạn vào <strong>{c.end_date}</strong> (còn {daysRemaining} ngày). Bạn có dự định tiếp tục ở không?</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setRenewContractTarget(c)}
                                    className="px-3 py-1.5 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-bold rounded-lg text-xs transition-colors cursor-pointer"
                                  >
                                    Yêu Cầu Gia Hạn
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCheckOutContractTarget(c)}
                                    className="px-3 py-1.5 bg-[#0F223A] hover:bg-[#1A3456] text-slate-200 border border-[#1E3A5B] font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                                  >
                                    Báo Trả Phòng
                                  </button>
                                </div>
                              </div>
                            )}

                            <div>
                              <h4 className="text-sm font-extrabold text-white tracking-tight">{c.room_title}</h4>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Đại diện chủ trọ: <span className="text-slate-200 font-semibold">{c.landlord_name || 'Nguyễn Văn Hùng'}</span> • Hotline: 0908.123.456
                              </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[#0F223A] rounded-xl border border-[#1E3A5B]/80 text-xs">
                              <div>
                                <p className="text-[10px] text-slate-400 font-medium">Giá thuê hàng tháng</p>
                                <p className="font-extrabold text-[#B89C66] mt-0.5">
                                  {c.monthly_rent?.toLocaleString('vi-VN')} đ
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 font-medium">Tiền đặt cọc phòng</p>
                                <p className="font-extrabold text-white mt-0.5">
                                  {c.deposit_amount?.toLocaleString('vi-VN')} đ
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 font-medium">Ngày bắt đầu</p>
                                <p className="font-bold text-slate-200 mt-0.5">{c.start_date}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 font-medium">Ngày kết thúc</p>
                                <p className="font-bold text-slate-200 mt-0.5">{c.end_date}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#1E3A5B]/60">
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <ShieldCheck className="w-3.5 h-3.5 text-[#B89C66]" />
                                <span>Cam kết 10 điều nội quy chuẩn PCCC &amp; Chống cháy nổ</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setViewingContract(c)}
                                  className="px-4 py-2 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-extrabold text-xs rounded-xl shadow-md shadow-[#B89C66]/20 transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>{c.tenant_signed ? 'Xem lại hợp đồng và nội quy' : 'Xem và ký hợp đồng'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* SUBSECTION 2: BIÊN BẢN BÀN GIAO */}
                <div className="space-y-4 pt-4 border-t border-[#1E3A5B]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-[#B89C66]" />
                      <span>2. Biên bản bàn giao trang thiết bị &amp; CSVC (Phòng đã xem)</span>
                    </h3>
                    {myHandovers.length > 0 && (
                      <span className="text-[11px] text-[#E5D7B7] font-bold bg-[#B89C66]/15 border border-[#B89C66]/30 px-2.5 py-0.5 rounded-full">
                        Kiểm kê nhận phòng Check-in
                      </span>
                    )}
                  </div>

                  {myHandovers.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-[#142842]/40 border border-dashed border-[#1E3A5B] text-center space-y-2">
                      <ClipboardList className="w-8 h-8 text-slate-500 mx-auto" />
                      <p className="text-xs text-slate-300 font-bold">Chưa có biên bản bàn giao nào</p>
                      <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                        Khi đến ngày nhận phòng, chủ trọ sẽ lập biên bản kiểm kê trang thiết bị thực tế kèm hình ảnh và gửi đến tài khoản của bạn để xác nhận nhận phòng.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myHandovers.map((h) => (
                        <div
                          key={h.id}
                          className="p-5 rounded-2xl bg-[#142842] border border-[#1E3A5B] hover:border-[#B89C66]/50 transition-all space-y-3 shadow-md"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-[#E5D7B7] bg-[#B89C66]/15 px-2.5 py-0.5 rounded-full border border-[#B89C66]/30">
                              Biên bản {h.type === 'CHECK_IN' ? 'nhận phòng' : 'trả phòng'}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                h.tenant_confirmed
                                  ? 'bg-[#B89C66]/15 text-[#B89C66] border border-[#B89C66]/30'
                                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {h.tenant_confirmed ? 'Đã ký nhận CSVC' : 'Chờ bạn ký nhận'}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-xs text-white">
                              {h.room_title || `Căn phòng #${h.room_code || h.room_id}`}
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Người bàn giao: {h.landlord_name} • Ngày: {new Date(h.handover_date).toLocaleDateString('vi-VN')}
                            </p>
                          </div>

                          <div className="p-2.5 bg-[#0F223A] rounded-xl border border-[#1E3A5B]/80 text-[11px] text-slate-300 flex items-center justify-between">
                            <span>Danh mục kiểm kê:</span>
                            <span className="font-bold text-[#B89C66]">
                              {h.items?.length || 5} thiết bị (Điều hòa, Bếp, Khóa, PCCC...)
                            </span>
                          </div>

                          <div className="pt-2 flex items-center justify-between border-t border-[#1E3A5B]/60">
                            <span className="text-[10px] text-slate-400">Hình ảnh &amp; biên bản thực tế</span>
                            <button
                              type="button"
                              onClick={() => setSelectedHandover(h)}
                              className="px-3.5 py-1.5 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-extrabold text-[11px] rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                            >
                              <ClipboardList className="w-3.5 h-3.5" />
                              <span>{h.tenant_confirmed ? 'Xem chi tiết tài sản' : 'Kiểm tra và ký nhận'}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB: HÓA ĐƠN & TIỀN ĐIỆN NƯỚC HÀNG THÁNG                */}
            {/* ======================================================== */}
            {activeTab === 'BILLS' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1E3A5B] pb-4">
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-[#B89C66]" />
                      <span>Hóa đơn hàng tháng</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Xem chỉ số điện nước, số tiền cần trả và thanh toán bằng mã QR
                    </p>
                  </div>
                  {myBills.length > 0 && (
                    <span className="text-xs font-bold text-[#B89C66] bg-[#B89C66]/15 border border-[#B89C66]/30 px-3 py-1 rounded-full">
                      Tổng {myBills.length} kỳ hóa đơn
                    </span>
                  )}
                </div>

                {myBills.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#142842]/40 border border-dashed border-[#1E3A5B] text-center space-y-2">
                    <CreditCard className="w-10 h-10 text-slate-500 mx-auto" />
                    <p className="text-sm text-slate-200 font-bold">Chưa có hóa đơn nào cho phòng của bạn</p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Hàng tháng, chủ trọ sẽ chốt chỉ số công tơ điện nước và phát hành hóa đơn tại đây để bạn kiểm tra và thanh toán.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myBills.map((bill) => (
                      <div
                        key={bill.id}
                        className="p-5 rounded-2xl bg-[#142842] border border-[#1E3A5B] hover:border-[#B89C66]/50 transition-all shadow-md space-y-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-black text-white">
                              Phòng {bill.room_code}
                            </span>
                            <span className="text-xs font-bold text-[#B89C66] bg-[#B89C66]/15 px-2.5 py-0.5 rounded-full border border-[#B89C66]/30">
                              Kỳ Tháng {bill.month}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                                bill.status === 'PAID'
                                  ? 'bg-slate-900 text-[#B89C66] border border-[#B89C66]/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {bill.status === 'PAID' ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#B89C66]" />
                                  <span>Đã thanh toán (PAID)</span>
                                </>
                              ) : bill.payment_claim?.transaction_code ? (
                                <>
                                  <Clock className="w-3.5 h-3.5 text-[#B89C66]" />
                                  <span>
                                    Chờ chủ trọ xác nhận • Mã GD: {bill.payment_claim.transaction_code}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Chưa thanh toán</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Breakdown Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-[#0F223A] rounded-xl border border-[#1E3A5B] text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Tiền phòng</span>
                            <span className="font-bold text-white mt-0.5 block">
                              {bill.rent_cost.toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium flex items-center gap-1">
                              <Zap className="w-3 h-3 text-amber-400" />
                              Điện ({bill.electric_used} kWh)
                            </span>
                            <span className="font-bold text-amber-300 mt-0.5 block">
                              {bill.electric_cost.toLocaleString('vi-VN')} đ
                            </span>
                            <span className="text-[9px] text-slate-500">
                              {bill.electric_old} &rarr; {bill.electric_new}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium flex items-center gap-1">
                              <Droplets className="w-3 h-3 text-[#B89C66]" />
                              Nước ({bill.water_used} m³)
                            </span>
                            <span className="font-bold text-[#E5D7B7] mt-0.5 block">
                              {bill.water_cost.toLocaleString('vi-VN')} đ
                            </span>
                            <span className="text-[9px] text-slate-500">
                              {bill.water_old} &rarr; {bill.water_new}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Dịch vụ &amp; Wifi</span>
                            <span className="font-bold text-slate-200 mt-0.5 block">
                              {(bill.internet_cost + bill.service_cost).toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        </div>

                        {/* Total & Action */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1E3A5B]/80">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">
                              Tổng cộng thanh toán kỳ này
                            </span>
                            <span className="text-lg font-black text-[#B89C66]">
                              {bill.total_amount.toLocaleString('vi-VN')} đ
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {bill.status === 'UNPAID' ? (
                              <button
                                type="button"
                                onClick={() => setSelectedBillForPay(bill)}
                                className="px-5 py-2.5 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-black text-xs rounded-xl shadow-lg shadow-[#B89C66]/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                              >
                                <CreditCard className="w-4 h-4" />
                                <span>
                                  {bill.payment_claim?.transaction_code
                                    ? 'Xem QR / Cập nhật mã GD'
                                    : 'Thanh toán bằng QR'}
                                </span>
                              </button>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 py-2 px-3 bg-[#0F223A] rounded-xl border border-[#1E3A5B]">
                                <CheckCheck className="w-4 h-4 text-[#B89C66]" />
                                <span>Hóa đơn đã được quyết toán hoàn tất</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 3: TIN Ở GHÉP CỦA TÔI (Photo 2)                      */}
            {/* ======================================================== */}
            {activeTab === 'ROOMMATE' && (
              <div>
                {/* Header & Action Buttons */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1E3A5B] pb-4 mb-6">
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">
                      Bài đăng ở ghép của tôi
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Quản lý bài do bạn đăng và xử lý các lời mời kết nối.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Link
                      href="/o-ghep/ho-so"
                      className="px-4 py-2.5 bg-[#142842] hover:bg-[#1A3456] border border-[#1E3A5B] text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-2"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#B89C66]" />
                      <span>Khảo sát lối sống</span>
                    </Link>

                    <Link
                      href="/o-ghep/dang-bai"
                      className="px-4 py-2.5 bg-[#B89C66] hover:bg-[#A38752] text-white text-xs font-bold rounded-xl shadow-md shadow-[#B89C66]/20 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Đăng tin mới</span>
                    </Link>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Section 1: Bài đăng của tôi (Matches Photo 2) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">Bài đăng của tôi</h3>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#142842] border border-[#1E3A5B] text-slate-300">
                        {myPosts.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      Chỉ bao gồm các bài được tạo bởi tài khoản đang đăng nhập.
                    </p>

                    {myPosts.length === 0 ? (
                      <div className="bg-[#142842]/40 border border-[#1E3A5B] border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center">
                        <FileText className="w-8 h-8 text-slate-500 mb-2" />
                        <p className="text-xs font-bold text-slate-300 mb-1">
                          Bạn chưa có bài đăng ở ghép
                        </p>
                        <p className="text-[11px] text-slate-400 mb-3">
                          Tạo bài đầu tiên để bắt đầu tìm bạn cùng phòng phù hợp.
                        </p>
                        <Link
                          href="/o-ghep/dang-bai"
                          className="text-xs font-bold text-[#B89C66] hover:underline"
                        >
                          Đăng tin ngay
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {myPosts.map((post) => (
                          <div
                            key={post.id}
                            className="bg-[#142842] border border-[#1E3A5B] rounded-2xl p-4 flex flex-col justify-between hover:border-[#B89C66]/50 transition-all"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#B89C66]/20 text-[#B89C66] border border-[#B89C66]/30">
                                  {post.status === 'OPEN' ? 'Đang tìm bạn' : 'Đã đủ người'}
                                </span>
                                <span className="text-xs font-bold text-[#B89C66]">
                                  {new Intl.NumberFormat('vi-VN').format(post.shared_rent)} đ/tháng
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-white line-clamp-2 mb-1.5">
                                {post.title}
                              </h4>
                              <p className="text-[11px] text-slate-400 truncate mb-2">
                                {post.district} • {post.address}
                              </p>
                            </div>
                            <div className="pt-2 border-t border-[#1E3A5B] flex items-center justify-between text-xs">
                              <span className="text-slate-400 text-[10px]">
                                Hiện tại: {post.current_people}/{post.max_people} người
                              </span>
                              <Link
                                href={`/o-ghep/${post.id}`}
                                className="font-bold text-[#B89C66] hover:underline text-[11px] flex items-center gap-1"
                              >
                                <span>Xem bài</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 2: Lời mời bạn đã gửi (Matches Photo 2) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-bold text-white">Lời mời bạn đã gửi</h3>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#142842] border border-[#1E3A5B] text-slate-300">
                        {sentRequests.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      Theo dõi phản hồi từ các bài ở ghép bạn đã quan tâm.
                    </p>

                    {sentRequests.length === 0 ? (
                      <div className="bg-[#142842]/40 border border-[#1E3A5B] border-dashed rounded-2xl p-8 text-center text-xs text-slate-400">
                        Bạn chưa gửi lời mời ghép phòng nào.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sentRequests.map((req) => (
                          <div
                            key={req.id}
                            className="bg-[#142842] border border-[#1E3A5B] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-white">{req.post_title}</p>
                              <p className="text-[11px] text-slate-300 italic">
                                &ldquo;{req.message}&rdquo;
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Gửi lúc: {new Date(req.created_at).toLocaleDateString('vi-VN')}
                              </p>
                            </div>

                            <span
                              className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                                req.status === 'ACCEPTED'
                                  ? 'bg-[#B89C66] text-white shadow-xs'
                                  : req.status === 'REJECTED'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : 'bg-[#1E3A5B] text-[#B89C66] border border-[#B89C66]/30'
                              }`}
                            >
                              {req.status === 'ACCEPTED'
                                ? 'Đã chấp nhận kết nối'
                                : req.status === 'REJECTED'
                                ? 'Đã từ chối'
                                : 'Đang chờ phản hồi'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 3: Lời mời kết nối nhận được (Đồng bộ đa tài khoản theo AGENTS.md) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-bold text-white">Lời mời nhận được</h3>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#142842] border border-[#1E3A5B] text-slate-300">
                        {receivedRequests.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      Các yêu cầu ghép phòng từ người khác gửi đến bài đăng của bạn.
                    </p>

                    {receivedRequests.length === 0 ? (
                      <div className="bg-[#142842]/40 border border-[#1E3A5B] border-dashed rounded-2xl p-8 text-center text-xs text-slate-400">
                        Chưa có lời mời ghép phòng nào gửi tới bạn.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {receivedRequests.map((req) => (
                          <div
                            key={req.id}
                            className="bg-[#142842] border border-[#1E3A5B] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-white">
                                  {req.requester_name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  • SĐT: {req.requester_phone}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 italic">
                                &ldquo;{req.message}&rdquo;
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Bài đăng: {req.post_title} • {new Date(req.created_at).toLocaleDateString('vi-VN')}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {req.status === 'PENDING' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateRequestStatus(req.id, 'ACCEPTED')}
                                    className="px-3 py-1.5 bg-[#B89C66] hover:bg-[#A38752] text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                  >
                                    Chấp nhận
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateRequestStatus(req.id, 'REJECTED')}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                  >
                                    Từ chối
                                  </button>
                                </>
                              ) : (
                                <span
                                  className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                                    req.status === 'ACCEPTED'
                                      ? 'bg-[#B89C66] text-white'
                                      : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {req.status === 'ACCEPTED' ? 'Đã đồng ý' : 'Đã từ chối'}
                                </span>
                              )}

                              <a
                                href={`tel:${req.requester_phone}`}
                                className="p-1.5 rounded-lg bg-[#0F223A] border border-[#1E3A5B] text-[#B89C66] hover:bg-[#B89C66] hover:text-white transition-colors"
                                title="Gọi điện"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 6: HỘP THƯ THÔNG BÁO CƯ DÂN                           */}
            {/* ======================================================== */}
            {activeTab === 'NOTIFICATIONS' && (
              <div>
                <div className="border-b border-[#1E3A5B] pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#B89C66]/20 border border-[#B89C66]/40 flex items-center justify-center text-[#B89C66]">
                        <Bell className="w-4 h-4" />
                      </div>
                      <h2 className="text-xl font-black text-white tracking-tight">Hộp thư thông báo cư dân</h2>
                      {unreadNotifCount > 0 && (
                        <span className="text-[10px] bg-[#B89C66] text-[#0F223A] font-extrabold px-2.5 py-0.5 rounded-full">
                          {unreadNotifCount} chưa đọc
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Theo dõi cập nhật Hợp đồng điện tử, 10 điều PCCC, Hóa đơn điện nước, Biên lai và Lịch xem phòng của bạn
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {unreadNotifCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllNotifsRead}
                        className="px-3.5 py-2 bg-[#142842] hover:bg-[#1E3A5B] border border-[#B89C66]/50 text-[#B89C66] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Đọc tất cả ({unreadNotifCount})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={fetchTenantNotifications}
                      disabled={loadingNotifs}
                      className="p-2 bg-[#142842] hover:bg-[#1E3A5B] border border-[#1E3A5B] text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
                      title="Làm mới hộp thư"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingNotifs ? 'animate-spin text-[#B89C66]' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Filter Controls */}
                <div className="mb-6 space-y-3">
                  {/* Status Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNotifFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        notifFilter === 'ALL'
                          ? 'bg-[#B89C66] text-white shadow-sm shadow-[#B89C66]/30'
                          : 'bg-[#142842] text-slate-300 hover:text-white border border-[#1E3A5B]'
                      }`}
                    >
                      Tất cả ({userNotifications.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifFilter('UNREAD')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        notifFilter === 'UNREAD'
                          ? 'bg-[#B89C66] text-white shadow-sm shadow-[#B89C66]/30'
                          : 'bg-[#142842] text-slate-300 hover:text-white border border-[#1E3A5B]'
                      }`}
                    >
                      Chưa đọc ({unreadNotifCount})
                    </button>
                  </div>

                  {/* Category Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
                    <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 mr-1">
                      <Filter className="w-3 h-3 text-[#B89C66]" /> Lọc danh mục:
                    </span>
                    {[
                      { key: 'ALL', label: 'Tất cả' },
                      { key: 'CONTRACT', label: 'Hợp đồng & PCCC' },
                      { key: 'BILL', label: 'Hóa đơn & Biên lai' },
                      { key: 'APPOINTMENT', label: 'Lịch xem phòng' },
                      { key: 'LIFECYCLE', label: 'Vòng đời thuê' },
                    ].map((cat) => (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setNotifCategory(cat.key as any)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          notifCategory === cat.key
                            ? 'bg-[#1E3A5B] text-[#B89C66] border border-[#B89C66]/60 font-bold'
                            : 'bg-[#0d1d30] text-slate-400 hover:text-slate-200 border border-[#1E3A5B]/40'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notifications List */}
                {loadingNotifs && userNotifications.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-[#B89C66]" />
                    <p className="text-sm font-semibold">Đang cập nhật hộp thư thông báo...</p>
                  </div>
                ) : (
                  (() => {
                    const filtered = userNotifications.filter((n) => {
                      if (notifFilter === 'UNREAD' && n.isRead) return false;
                      if (notifCategory === 'CONTRACT' && n.type !== 'CONTRACT_CHECKIN') return false;
                      if (notifCategory === 'BILL' && !['MONTHLY_BILL', 'BILL_PAID'].includes(n.type)) return false;
                      if (notifCategory === 'APPOINTMENT' && n.type !== 'APPOINTMENT_UPDATE') return false;
                      if (
                        notifCategory === 'LIFECYCLE' &&
                        !['CONTRACT_EXPIRY', 'CONTRACT_RENEWED', 'DEPOSIT_CANCEL', 'CHECKOUT_SETTLEMENT'].includes(n.type)
                      )
                        return false;
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="py-16 px-4 bg-[#142842]/40 rounded-3xl border border-[#1E3A5B] text-center">
                          <Bell className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-60" />
                          <h3 className="text-base font-bold text-white">Không có thông báo nào phù hợp</h3>
                          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                            {notifFilter === 'UNREAD'
                              ? 'Bạn đã đọc toàn bộ thông báo trong danh mục này. Hãy chuyển sang bộ lọc "Tất cả" để xem lại các thư cũ.'
                              : 'Chưa có thông báo nào được gửi tới tài khoản của bạn trong danh mục này.'}
                          </p>
                          {(notifFilter !== 'ALL' || notifCategory !== 'ALL') && (
                            <button
                              type="button"
                              onClick={() => {
                                setNotifFilter('ALL');
                                setNotifCategory('ALL');
                              }}
                              className="mt-4 px-4 py-2 bg-[#B89C66] text-[#0F223A] font-extrabold text-xs rounded-xl shadow-md hover:bg-[#A38752] transition-colors"
                            >
                              Xóa bộ lọc &amp; Xem tất cả
                            </button>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3.5">
                        {filtered.map((n) => {
                          const isUnread = !n.isRead;
                          const isContract = n.type === 'CONTRACT_CHECKIN';
                          const isBill = n.type === 'MONTHLY_BILL';
                          const isBillPaid = n.type === 'BILL_PAID';
                          const isAppt = n.type === 'APPOINTMENT_UPDATE';
                          const isExpiry = n.type === 'CONTRACT_EXPIRY';
                          const isRenew = n.type === 'CONTRACT_RENEWED';
                          const isCancel = n.type === 'DEPOSIT_CANCEL';
                          const isCheckout = n.type === 'CHECKOUT_SETTLEMENT';

                          const categoryBadge = isContract
                            ? { text: 'HỢP ĐỒNG & 10 ĐIỀU PCCC', color: 'bg-[#B89C66]/20 text-[#B89C66] border-[#B89C66]/40', icon: FileText }
                            : isBill
                            ? { text: 'HÓA ĐƠN TIỆN ÍCH', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: CreditCard }
                            : isBillPaid
                            ? { text: 'BIÊN LAI ĐÃ THANH TOÁN', color: 'bg-[#B89C66]/20 text-[#B89C66] border-[#B89C66]/40', icon: CheckCircle2 }
                            : isAppt
                            ? { text: 'LỊCH XEM PHÒNG', color: 'bg-[#0F223A]/80 text-[#B89C66] border-[#B89C66]/30', icon: Calendar }
                            : isExpiry
                            ? { text: 'NHẮC HẠN HỢP ĐỒNG', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: AlertTriangle }
                            : isRenew
                            ? { text: 'GIA HẠN HỢP ĐỒNG', color: 'bg-[#B89C66]/20 text-[#B89C66] border-[#B89C66]/40', icon: Sparkles }
                            : isCancel
                            ? { text: 'HỦY CỌC GIỮ CHỖ', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: AlertCircle }
                            : isCheckout
                            ? { text: 'QUYẾT TOÁN TRẢ PHÒNG', color: 'bg-slate-500/20 text-slate-300 border-slate-500/40', icon: FileCheck2 }
                            : { text: 'THÔNG BÁO HỆ THỐNG', color: 'bg-[#B89C66]/20 text-[#B89C66] border-[#B89C66]/40', icon: Bell };

                          const BadgeIcon = categoryBadge.icon;

                          return (
                            <div
                              key={n.id}
                              className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                                isUnread
                                  ? 'bg-[#142842] border-[#B89C66]/60 shadow-lg shadow-[#B89C66]/10 ring-1 ring-[#B89C66]/30'
                                  : 'bg-[#142842]/70 border-[#1E3A5B] hover:border-[#1E3A5B]/90'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${categoryBadge.color}`}>
                                    <BadgeIcon className="w-3 h-3" />
                                    <span>{categoryBadge.text}</span>
                                  </span>

                                  {isUnread && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-[#B89C66] text-[#0F223A] uppercase tracking-wider">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#0F223A] animate-ping" />
                                      Chưa đọc
                                    </span>
                                  )}
                                </div>

                                <span className="text-[11px] text-slate-400 font-medium">
                                  {new Date(n.sentAt).toLocaleString('vi-VN')}
                                </span>
                              </div>

                              <h3 className="text-sm sm:text-base font-bold text-white mt-2.5">
                                {n.subject}
                              </h3>

                              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                                {n.summary}
                              </p>

                              {/* Card Actions */}
                              <div className="mt-4 pt-3 border-t border-[#1E3A5B] flex flex-wrap items-center justify-between gap-2.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenNotifModal(n)}
                                    className="px-3.5 py-1.5 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                    <span>Xem nội dung email &rarr;</span>
                                  </button>

                                  {n.link && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!n.isRead) handleToggleReadNotif(n);
                                        if (n.link?.includes('tab=contracts')) setActiveTab('CONTRACTS');
                                        else if (n.link?.includes('tab=bills')) setActiveTab('BILLS');
                                        else if (n.link?.includes('tab=appointments')) setActiveTab('APPOINTMENTS');
                                        else router.push(n.link);
                                      }}
                                      className="px-3.5 py-1.5 bg-[#1E3A5B] hover:bg-[#24476f] text-white font-bold text-xs rounded-xl transition-all border border-[#1E3A5B] flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 text-[#B89C66]" />
                                      <span>Đến trang nghiệp vụ</span>
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleReadNotif(n)}
                                    className="px-2.5 py-1.5 rounded-lg bg-[#0F223A] hover:bg-[#1E3A5B] text-slate-300 hover:text-white text-[11px] font-semibold border border-[#1E3A5B] transition-colors cursor-pointer"
                                    title={isUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}
                                  >
                                    {isUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteNotif(n.id)}
                                    className="p-1.5 rounded-lg bg-[#0F223A] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-[#1E3A5B] transition-colors cursor-pointer"
                                    title="Xóa thông báo này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 7: BẢO MẬT & MẬT KHẨU (Photo 1)                      */}
            {/* ======================================================== */}
            {activeTab === 'SAVED' && <SavedRoomsPanel />}
            {activeTab === 'PREFERENCES' && <PreferenceProfileForm />}

            {activeTab === 'SECURITY' && (
              <div>
                <div className="border-b border-[#1E3A5B] pb-4 mb-6">
                  <h2 className="text-xl font-black text-white tracking-tight">Bảo mật & Mật khẩu</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Quản lý mật khẩu đăng nhập an toàn cho tài khoản của bạn
                  </p>
                </div>

                {isGoogleAccount ? (
                  /* Google Account Message (Matches Photo 1, but Champagne Gold!) */
                  <div className="p-5 bg-[#142842] border border-[#B89C66]/40 rounded-2xl flex items-start gap-3.5 text-xs text-[#E5D7B7]">
                    <div className="w-8 h-8 rounded-xl bg-[#B89C66]/20 border border-[#B89C66]/40 flex items-center justify-center shrink-0 text-[#B89C66]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-white text-xs">
                        Tài khoản của bạn đang đăng nhập bằng Google. Bạn không cần thiết lập mật khẩu thủ công.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Tài khoản được bảo vệ tự động bằng cơ chế OAuth 2.0 và xác thực 2 lớp từ Google Account.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Phone / Credentials Password Form */
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setPasswordMsg({ type: 'success', text: '' });

                      if (!currentPassword) {
                        setPasswordMsg({
                          type: 'error',
                          text: 'Vui lòng nhập mật khẩu hiện tại.',
                        });
                        return;
                      }
                      if (!newPassword || newPassword.length < 6) {
                        setPasswordMsg({
                          type: 'error',
                          text: 'Mật khẩu mới phải có tối thiểu 6 ký tự.',
                        });
                        return;
                      }
                      if (newPassword !== confirmPassword) {
                        setPasswordMsg({
                          type: 'error',
                          text: 'Mật khẩu xác nhận không khớp với mật khẩu mới.',
                        });
                        return;
                      }

                      setSavingPassword(true);
                      try {
                        const res = await fetch('/api/user/profile', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            currentPassword,
                            newPassword,
                            confirmPassword,
                          }),
                        });
                        const json = await res.json();
                        if (!res.ok || !json.success) {
                          setPasswordMsg({
                            type: 'error',
                            text: json.message || 'Không thể cập nhật mật khẩu. Vui lòng kiểm tra lại.',
                          });
                        } else {
                          setPasswordMsg({
                            type: 'success',
                            text: json.message || 'Cập nhật mật khẩu tài khoản thành công!',
                          });
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                        }
                      } catch {
                        setPasswordMsg({
                          type: 'error',
                          text: 'Không thể kết nối tới máy chủ. Vui lòng thử lại sau.',
                        });
                      } finally {
                        setSavingPassword(false);
                      }
                    }}
                    className="space-y-4 max-w-md"
                  >
                    {passwordMsg.text && (
                      <div
                        className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                          passwordMsg.type === 'error'
                            ? 'bg-rose-500/15 border border-rose-500/40 text-rose-300'
                            : 'bg-[#B89C66]/15 border border-[#B89C66]/40 text-[#E5D7B7]'
                        }`}
                      >
                        {passwordMsg.type === 'error' ? (
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-[#B89C66] shrink-0" />
                        )}
                        <span>{passwordMsg.text}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Mật khẩu hiện tại
                      </label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-[#142842] border border-[#1E3A5B] rounded-xl text-xs text-white focus:outline-none focus:border-[#B89C66]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Mật khẩu mới
                      </label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-[#142842] border border-[#1E3A5B] rounded-xl text-xs text-white focus:outline-none focus:border-[#B89C66]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Nhập lại mật khẩu mới
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-[#142842] border border-[#1E3A5B] rounded-xl text-xs text-white focus:outline-none focus:border-[#B89C66]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="px-6 py-2.5 bg-[#B89C66] hover:bg-[#A38752] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#B89C66]/20 cursor-pointer disabled:opacity-50"
                    >
                      {savingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* DEPOSIT BOOKING MODAL */}
      {depositAppointment && (
        <DepositBookingModal
          appointment={depositAppointment}
          onClose={() => setDepositAppointment(null)}
          onSuccess={(receipt) => {
            const depositedRoomId = depositAppointment?.room_id;
            setDepositAppointment(null);
            if (depositedRoomId) {
              if (typeof window !== 'undefined') {
                localStorage.setItem(`elite_deposited_room_${depositedRoomId}`, 'true');
              }
              setSelectedViewedRoomId(depositedRoomId);
              fetchUserData(depositedRoomId);
            } else {
              fetchUserData();
            }
            setActiveTab('CONTRACTS');
            alert(
              `Đã gửi thông tin đặt cọc giữ chỗ${receipt?.transaction_code ? ` (Mã GD: ${receipt.transaction_code})` : ''}! Trạng thái phòng đã chuyển sang "Giữ chỗ", chờ chủ trọ đối soát khoản cọc để kích hoạt Hợp đồng điện tử và Biên bản bàn giao.`
            );
          }}
        />
      )}

      {/* CONTRACT LEGAL MODAL (READABLE WITH 10 RULES) */}
      {viewingContract && (
        <ContractLegalModal
          contract={viewingContract}
          onClose={() => setViewingContract(null)}
          landlordPhone="0908123456"
          tenantCanSign={true}
          onSignContract={async (contractId) => {
            try {
              const response = await fetch('/api/landlords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'SIGN_CONTRACT', contractId }),
              });
              const result = await response.json();
              if (!response.ok || !result.success) {
                throw new Error(result.message || 'Không thể ký hợp đồng này.');
              }
              setMyContracts((prev) =>
                prev.map((c) => (c.id === contractId
                  ? {
                      ...c,
                      tenant_signed: true,
                      tenant_signed_at: result.data?.tenant_signed_at || new Date().toISOString(),
                    }
                  : c))
              );
            } catch (err) {
              console.error(err);
              const message = err instanceof Error ? err.message : 'Không thể ký hợp đồng này.';
              setProfileErrorMsg(message);
              throw new Error(message);
            }
          }}
        />
      )}

      {/* HANDOVER DETAIL MODAL */}
      {selectedHandover && (
        <HandoverDetailModal
          handover={selectedHandover}
          onClose={() => setSelectedHandover(null)}
          onConfirmed={() => {
            fetchUserData();
            setSelectedHandover(null);
          }}
        />
      )}

      {/* PAY BILL MODAL (VIETQR MBBANK) */}
      {selectedBillForPay && (
        <PayBillModal
          bill={selectedBillForPay}
          onClose={() => setSelectedBillForPay(null)}
          onSuccess={(res) => {
            fetchUserData();
            alert(res.message || 'Thanh toán hóa đơn thành công!');
          }}
        />
      )}

      {/* CANCEL DEPOSIT MODAL */}
      {cancelDepositTargetRoom && (
        <CancelDepositModal
          room={cancelDepositTargetRoom}
          onClose={() => setCancelDepositTargetRoom(null)}
          onSuccess={(res) => {
            fetchUserData();
            alert(res.message || 'Đã hủy giữ cọc phòng thành công!');
          }}
        />
      )}

      {/* RENEW CONTRACT MODAL */}
      {renewContractTarget && (
        <RenewContractModal
          contract={renewContractTarget}
          requestOnly
          onClose={() => setRenewContractTarget(null)}
          onSuccess={(res) => {
            fetchUserData();
            alert(res.message || 'Gia hạn hợp đồng thành công!');
          }}
        />
      )}

      {/* CHECK-OUT & REFUND SETTLEMENT MODAL */}
      {checkOutContractTarget && (
        <CheckOutModal
          contract={checkOutContractTarget}
          requestOnly
          onClose={() => setCheckOutContractTarget(null)}
          onSuccess={(res) => {
            fetchUserData();
            alert(res.message || 'Thanh lý trả phòng và quyết toán cọc thành công!');
          }}
        />
      )}

      {/* EMAIL NOTIFICATION MODAL PREVIEW */}
      <RescheduleDialog
        appointment={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onDone={(updated, message) => {
          setAppointments((current) => [
            updated,
            ...current.filter((a) => a.id !== updated.id && a.id !== rescheduleTarget?.id),
            ...(rescheduleTarget && rescheduleTarget.id !== updated.id
              ? [{ ...rescheduleTarget, status: 'CANCELLED' as const }]
              : []),
          ]);
          setRescheduleTarget(null);
          setProfileSuccessMsg(message);
          setTimeout(() => setProfileSuccessMsg(''), 5000);
        }}
      />

      {previewEmailNotification && (
        <EmailNotificationModal
          notification={previewEmailNotification}
          onClose={() => setPreviewEmailNotification(null)}
        />
      )}

      <Footer />
    </div>
  );
}

export default function UserProfilePage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#091624] flex items-center justify-center text-[#B89C66]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <ProfileContent />
    </React.Suspense>
  );
}
