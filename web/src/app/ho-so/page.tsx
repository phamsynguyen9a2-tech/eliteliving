'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
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
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import DepositBookingModal from '@/components/DepositBookingModal';
import ContractLegalModal from '@/components/ContractLegalModal';
import HandoverDetailModal from '@/components/HandoverDetailModal';
import CancelDepositModal from '@/components/CancelDepositModal';
import RenewContractModal from '@/components/RenewContractModal';
import CheckOutModal from '@/components/CheckOutModal';
import PayBillModal from '@/components/PayBillModal';
import EmailNotificationModal from '@/components/EmailNotificationModal';
import type { RoommatePost, RoommateRequest, Appointment, UtilityBill, Room, Contract } from '@/lib/types';

export type ProfileTabType = 'PROFILE' | 'APPOINTMENTS' | 'CONTRACTS' | 'BILLS' | 'ROOMMATE' | 'SECURITY';

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update: updateSession } = useSession();

  // Tab State: 'PROFILE' | 'APPOINTMENTS' | 'CONTRACTS' | 'BILLS' | 'ROOMMATE' | 'SECURITY'
  const tabParam = searchParams.get('tab');
  const initialTab: ProfileTabType =
    tabParam === 'appointments'
      ? 'APPOINTMENTS'
      : tabParam === 'contracts'
      ? 'CONTRACTS'
      : tabParam === 'bills'
      ? 'BILLS'
      : tabParam === 'roommate'
      ? 'ROOMMATE'
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
  const [myPosts, setMyPosts] = useState<RoommatePost[]>([]);
  const [sentRequests, setSentRequests] = useState<RoommateRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<RoommateRequest[]>([]);
  const [myContracts, setMyContracts] = useState<any[]>([]);
  const [myHandovers, setMyHandovers] = useState<any[]>([]);
  const [myBills, setMyBills] = useState<UtilityBill[]>([]);
  const [loadingData, setLoadingData] = useState(true);

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
    else if (tabParam === 'roommate') setActiveTab('ROOMMATE');
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

      const isGoogle =
        session.user.email?.endsWith('@gmail.com') ||
        session.user.image?.includes('googleusercontent.com');
      setIsGoogleAccount(Boolean(isGoogle));

      fetchUserData();
    }
  }, [status, session]);

  const handleSelectRoom = (roomId: number) => {
    setSelectedViewedRoomId(roomId);
    fetchUserData(roomId);
  };

  const fetchUserData = async (overrideRoomId?: number) => {
    setLoadingData(true);
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
        const resPosts = await fetch(`/api/roommate/posts?userId=${userId}`);
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

      // 5. Kiểm tra phòng đã xem này ĐÃ ĐƯỢC ĐẶT CỌC hay chưa:
      // Quy trình chuẩn Elite Living:
      // - Bước 1: Khách đến xem phòng -> Hoàn tất xem phòng.
      // - Bước 2: Khách PHẢI BẤM "Đặt cọc & Thuê phòng" -> Hoàn tất nộp cọc giữ chỗ.
      // - Bước 3: Sau khi cọc thành công, Chủ trọ mới tiến hành lập & gửi Hợp đồng (10 điều PCCC) và Biên bản bàn giao CSVC.
      const targetRoomId = targetAppt ? targetAppt.room_id : null;
      let isRoomDeposited = false;
      if (targetAppt && targetRoomId) {
        const isLocallyDeposited =
          typeof window !== 'undefined' &&
          localStorage.getItem(`elite_deposited_room_${targetRoomId}`) === 'true';
        isRoomDeposited =
          targetAppt.room_status === 'RESERVED' ||
          targetAppt.room_status === 'RENTED' ||
          isLocallyDeposited;
      }

      // NẾU CHƯA ĐẶT CỌC: Chủ trọ chưa gửi hợp đồng và biên bản bàn giao -> Giữ rỗng []
      if (!targetAppt || !isRoomDeposited) {
        setMyContracts([]);
        setMyHandovers([]);
      } else {
        // ĐÃ ĐẶT CỌC: Chủ trọ lập và gửi Hợp đồng điện tử kèm Biên bản bàn giao thiết bị phòng
        // 5. Fetch contracts for user
        try {
          const resContracts = await fetch('/api/landlords?type=contracts');
          const dataContracts = await resContracts.json();
          const allContracts = (dataContracts.success && Array.isArray(dataContracts.data)) ? dataContracts.data : [];
          const userPhone = session?.user?.phone || '';
          const userName = (session?.user?.name || '').toLowerCase();

          // Tìm hợp đồng của đúng phòng đã xem nếu thuộc về chính người dùng này
          const matched = allContracts.filter((c: any) => 
            Number(c.room_id) === Number(targetRoomId) &&
            ((userPhone && c.tenant_phone === userPhone) || (userName && c.tenant_name?.toLowerCase().includes(userName)))
          );

          if (matched.length > 0) {
            setMyContracts([matched[0]]);
          } else {
            // Khởi tạo hợp đồng điện tử chuẩn do chủ trọ phát hành sau khi nhận cọc
            const roomTitle = targetAppt.room_title || `Phòng #${targetAppt.room_code || targetRoomId}`;
            const draftContract = {
              id: `ct_${String(targetAppt.id).slice(-6)}`,
              room_id: targetRoomId,
              room_title: roomTitle,
              monthly_rent: targetAppt.price || 8500000,
              deposit_amount: targetAppt.price || 8500000,
              start_date: new Date().toISOString().split('T')[0],
              end_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
              tenant_name: session?.user?.name || targetAppt.user_name || 'Khách thuê',
              tenant_phone: session?.user?.phone || targetAppt.user_phone || '',
              tenant_citizen_id: '',
              landlord_name: targetAppt.building_name ? `Ban Quản Lý ${targetAppt.building_name}` : 'Nguyễn Văn Hùng (Chủ trọ)',
              status: 'ACTIVE',
              tenant_signed: false,
              rules: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            };
            setMyContracts([draftContract]);
          }
        } catch (err) {
          console.error('Error fetching contracts', err);
          setMyContracts([]);
        }

        // 6. Fetch handovers for user
        try {
          const resHandover = await fetch('/api/handover');
          const dataHandover = await resHandover.json();
          const allHandovers = (dataHandover.success && Array.isArray(dataHandover.data)) ? dataHandover.data : [];
          const userPhone = session?.user?.phone || '';
          const userName = (session?.user?.name || '').toLowerCase();

          const matched = allHandovers.filter((h: any) => 
            Number(h.room_id) === Number(targetRoomId) &&
            ((userPhone && h.tenant_phone === userPhone) || (userName && h.tenant_name?.toLowerCase().includes(userName)))
          );

          if (matched.length > 0) {
            setMyHandovers([matched[0]]);
          } else {
            const roomTitle = targetAppt.room_title || `Phòng #${targetAppt.room_code || targetRoomId}`;
            const draftHandover = {
              id: `ho_${String(targetAppt.id).slice(-6)}`,
              contract_id: `ct_${String(targetAppt.id).slice(-6)}`,
              room_id: targetRoomId,
              room_code: targetAppt.room_code || 'P.101',
              room_title: roomTitle,
              type: 'CHECK_IN',
              tenant_name: session?.user?.name || targetAppt.user_name || 'Khách thuê',
              tenant_phone: session?.user?.phone || targetAppt.user_phone || '',
              landlord_name: targetAppt.building_name ? `Ban Quản Lý ${targetAppt.building_name}` : 'Nguyễn Văn Hùng (Chủ trọ)',
              status: 'PENDING_CONFIRMATION',
              tenant_confirmed: false,
              landlord_confirmed: true,
              damage_cost: 0,
              handover_date: new Date().toISOString(),
              items: [
                { id: 'item_1', asset_name: 'Điều hòa Inverter Panasonic', category: 'Điện tử', quantity: 1, condition: 'Tốt, làm lạnh sâu' },
                { id: 'item_2', asset_name: 'Tủ lạnh 2 cánh Aqua 180L', category: 'Gia dụng', quantity: 1, condition: 'Mới 98%, làm đá tốt' },
                { id: 'item_3', asset_name: 'Khóa cửa điện tử vân tay thông minh', category: 'An ninh', quantity: 1, condition: 'Nhận diện nhạy' },
                { id: 'item_4', asset_name: 'Bình chữa cháy bột ABC 4kg & Tiêu lệnh PCCC', category: 'PCCC', quantity: 1, condition: 'Nguyên niêm phong, đạt chuẩn' },
                { id: 'item_5', asset_name: 'Giường gỗ, nệm cao su & Tủ quần áo âm tường', category: 'Nội thất', quantity: 1, condition: 'Sạch đẹp, không trầy xước' },
              ],
            };
            setMyHandovers([draftHandover]);
          }
        } catch (err) {
          console.error('Error fetching handovers', err);
          setMyHandovers([]);
        }

        // 7. Fetch utility bills for user
        try {
          const resBills = await fetch(`/api/bills?roomId=${targetRoomId}`);
          const dataBills = await resBills.json();
          if (dataBills.success && Array.isArray(dataBills.data) && dataBills.data.length > 0) {
            setMyBills(dataBills.data);
          } else {
            // Realistic monthly bill for room
            const currentMonth = `${new Date().getMonth() + 1 < 10 ? '0' : ''}${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
            const rentCost = targetAppt.price || 4500000;
            const electricUsed = 140;
            const electricCost = electricUsed * 3800;
            const waterUsed = 5;
            const waterCost = waterUsed * 25000;
            const internetCost = 100000;
            const serviceCost = 150000;
            const totalAmount = rentCost + electricCost + waterCost + internetCost + serviceCost;

            const demoBill: UtilityBill = {
              id: `bill_${String(targetRoomId)}_${Date.now()}`,
              room_id: Number(targetRoomId),
              room_code: targetAppt.room_code || 'P.101',
              month: currentMonth,
              electric_old: 1210,
              electric_new: 1350,
              electric_used: electricUsed,
              electric_cost: electricCost,
              water_old: 40,
              water_new: 45,
              water_used: waterUsed,
              water_cost: waterCost,
              internet_cost: internetCost,
              service_cost: serviceCost,
              rent_cost: rentCost,
              total_amount: totalAmount,
              status: 'UNPAID',
              created_at: new Date().toISOString(),
            };
            setMyBills([demoBill]);
          }
        } catch (err) {
          console.error('Error fetching bills', err);
          setMyBills([]);
        }
      }
    } finally {
      setLoadingData(false);
    }
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
      }
    } catch (err) {
      console.error('Failed to update request status', err);
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
          <h1 className="text-2xl font-black text-white mb-2">Đăng Nhập Để Xem Hồ Sơ</h1>
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
              <h2 className="mt-1 text-base font-extrabold text-white">Từ lịch xem đến vận hành phòng thuê</h2>
            </div>
            <Link href="/#danh-sach-toa-nha" className="inline-flex items-center gap-1 text-xs font-bold text-[#B89C66] hover:text-[#E5D7B7]">
              Tìm thêm phòng <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              { label: 'Lịch xem', value: appointments.length, icon: Calendar, tab: 'APPOINTMENTS' as ProfileTabType },
              { label: 'Hợp đồng', value: myContracts.length, icon: FileSignature, tab: 'CONTRACTS' as ProfileTabType },
              { label: 'Bàn giao', value: myHandovers.length, icon: ClipboardList, tab: 'CONTRACTS' as ProfileTabType },
              { label: 'Hóa đơn chưa trả', value: myBills.filter((bill) => bill.status === 'UNPAID').length, icon: WalletCards, tab: 'BILLS' as ProfileTabType },
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
                <span>Tin Ở Ghép Của Tôi</span>
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

            {/* 4. Bảo mật & Mật khẩu */}
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

                    {/* Link ảnh đại diện */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-2">
                        Link ảnh đại diện (Avatar URL)
                      </label>
                      <div className="relative">
                        <ImageIcon className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          value={image}
                          onChange={(e) => setImage(e.target.value)}
                          placeholder="https://..."
                          className="w-full pl-11 pr-4 py-3 bg-[#142842] border border-[#1E3A5B] rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#B89C66] focus:ring-4 focus:ring-[#B89C66]/15 transition-all"
                        />
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
                                    <span className="whitespace-normal">Xem &amp; Ký Hợp đồng</span>
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
                            <span>Hợp Đồng Điện Tử &amp; Biên Bản Bàn Giao Phòng</span>
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Các văn bản pháp lý tích hợp 10 điều nội quy tòa nhà &amp; an toàn PCCC do chủ trọ gửi đến
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
                                      <span>Xem Biên Bản</span>
                                    </>
                                  ) : (
                                    <span>Kiểm Kê &amp; Ký Nhận</span>
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
                                  <span>{c.tenant_signed ? 'Xem Lại Hợp Đồng & Nội Quy' : 'Xem & Ký Số Hợp Đồng'}</span>
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
                              Biên Bản {h.type === 'CHECK_IN' ? 'Nhận Phòng (Check-in)' : 'Trả Phòng (Check-out)'}
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
                              <span>{h.tenant_confirmed ? 'Xem Chi Tiết CSVC' : 'Kiểm Kê & Ký Nhận'}</span>
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
                      <span>Hóa Đơn Tiền Nhà &amp; Điện Nước Hàng Tháng</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Minh bạch chỉ số công tơ điện nước, tra cứu chi phí và thanh toán trực tuyến qua mã QR
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
                                <span>Thanh Toán Ngay (Quét Mã QR)</span>
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
            {/* TAB 4: BẢO MẬT & MẬT KHẨU (Photo 1)                      */}
            {/* ======================================================== */}
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
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSavingPassword(true);
                      setTimeout(() => {
                        setPasswordMsg({
                          type: 'success',
                          text: 'Cập nhật mật khẩu tài khoản thành công!',
                        });
                        setSavingPassword(false);
                      }, 1000);
                    }}
                    className="space-y-4 max-w-md"
                  >
                    {passwordMsg.text && (
                      <div className="p-3 bg-[#B89C66]/15 border border-[#B89C66]/40 rounded-xl text-xs text-[#E5D7B7]">
                        {passwordMsg.text}
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
          onSuccess={() => {
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
            alert('Đặt cọc giữ chỗ phòng thành công! Trạng thái phòng đã chuyển sang "Giữ chỗ". Chủ trọ đã gửi Hợp đồng điện tử kèm 10 điều nội quy PCCC và Biên bản bàn giao CSVC để bạn kiểm tra và ký số.');
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
          onClose={() => setCheckOutContractTarget(null)}
          onSuccess={(res) => {
            fetchUserData();
            alert(res.message || 'Thanh lý trả phòng và quyết toán cọc thành công!');
          }}
        />
      )}

      {/* EMAIL NOTIFICATION MODAL PREVIEW */}
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
