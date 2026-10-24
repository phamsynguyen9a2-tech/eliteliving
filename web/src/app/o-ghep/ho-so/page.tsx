'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  User,
  ArrowLeft,
  Sparkles,
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BrainCircuit,
  FileText,
  Inbox,
  Send,
  Phone,
  MessageSquare,
  Building2,
  Calendar,
  XCircle,
  ExternalLink,
  PlusCircle,
  ShieldCheck,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { RoommatePost, RoommateRequest } from '@/lib/types';

const HABIT_OPTIONS = [
  'Sạch sẽ',
  'Ngủ sớm (trước 23h30)',
  'Dậy sớm',
  'Không hút thuốc',
  'Thích nấu ăn',
  'Yên tĩnh học bài',
  'Thân thiện hòa đồng',
  'Yêu thích thú cưng',
  'Tập thể thao',
  'Không tụ tập bạn bè qua đêm',
];

export default function RoommateProfilePage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Active Tab: 'PROFILE' | 'MY_POSTS' | 'RECEIVED_REQUESTS' | 'SENT_REQUESTS'
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'MY_POSTS' | 'RECEIVED_REQUESTS' | 'SENT_REQUESTS'>('PROFILE');

  // Account Context for multi-account testing / real account
  const DEMO_ACCOUNTS = [
    {
      id: session?.user?.id || 'user_tenant_1',
      name: session?.user?.name ? `${session.user.name} (Tài khoản đang đăng nhập)` : 'Nguyễn Thị Phương Thảo (Chủ bài Tây Thạnh)',
      phone: session?.user?.phone || '0908123456',
    },
    {
      id: 'user_phone_0912345678',
      name: 'Lê Hoàng Yến Nhi (Khách gửi yêu cầu ghép phòng)',
      phone: '0912345678',
    },
    {
      id: 'user_tenant_2',
      name: 'Trần Minh Quang (Chủ bài Khuông Việt)',
      phone: '0977889900',
    },
  ];

  const [selectedAccountId, setSelectedAccountId] = useState(session?.user?.id || 'user_tenant_1');
  const activeAccount = DEMO_ACCOUNTS.find((a) => a.id === selectedAccountId) || DEMO_ACCOUNTS[0];
  const currentUserId = activeAccount.id;
  const currentUserName = activeAccount.name.split(' (')[0];
  const currentUserPhone = activeAccount.phone;

  // Profile State
  const [gender, setGender] = useState('Nữ');
  const [age, setAge] = useState('21');
  const [occupation, setOccupation] = useState('Sinh viên HUIT (Khoa CNTT)');
  const [lifestyle, setLifestyle] = useState('Introvert');
  const [habits, setHabits] = useState<string[]>([
    'Sạch sẽ',
    'Ngủ sớm (trước 23h30)',
    'Không hút thuốc',
    'Yên tĩnh học bài',
  ]);
  const [petFriendly, setPetFriendly] = useState(false);
  const [smokingStatus, setSmokingStatus] = useState(false);
  const [bio, setBio] = useState(
    'Sinh viên năm 3 HUIT, tính tình ngăn nắp, thích môi trường yên tĩnh học bài và giữ gìn vệ sinh chung.'
  );

  // Data States
  const [myPosts, setMyPosts] = useState<RoommatePost[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<RoommateRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<RoommateRequest[]>([]);

  // Loading States
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [error, setError] = useState('');

  // 1. Fetch Profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/roommate/profile');
        const data = await res.json();
        if (data.success && data.data) {
          const p = data.data;
          if (p.gender) setGender(p.gender);
          if (p.age) setAge(String(p.age));
          if (p.occupation) setOccupation(p.occupation);
          if (p.lifestyle) setLifestyle(p.lifestyle);
          if (p.habits && Array.isArray(p.habits)) setHabits(p.habits);
          if (p.pet_friendly !== undefined) setPetFriendly(p.pet_friendly);
          if (p.smoking_status !== undefined) setSmokingStatus(p.smoking_status);
          if (p.bio) setBio(p.bio);
        }
      } catch (err) {
        console.error('Failed to load profile', err);
      }
    };
    fetchProfile();
  }, []);

  // 2. Fetch User's Posts and Requests
  const loadSyncData = async () => {
    setFetchingData(true);
    try {
      // Fetch posts by current user
      const postsRes = await fetch(`/api/roommate/posts?authorId=${currentUserId}`);
      const postsData = await postsRes.json();
      if (postsData.success) {
        setMyPosts(postsData.data || []);
      }

      // Fetch received requests for posts owned by this user
      const recvRes = await fetch(`/api/roommate/requests?ownerId=${currentUserId}`);
      const recvData = await recvRes.json();
      if (recvData.success) {
        setReceivedRequests(recvData.data || []);
      }

      // Fetch requests sent by this user to other posters
      const sentRes = await fetch(`/api/roommate/requests?requesterId=${currentUserId}`);
      const sentData = await sentRes.json();
      if (sentData.success) {
        setSentRequests(sentData.data || []);
      }
    } catch (err) {
      console.error('Failed to load roommate sync data', err);
    } finally {
      setFetchingData(false);
    }
  };

  useEffect(() => {
    loadSyncData();
  }, [currentUserId]);

  const toggleHabit = (habit: string) => {
    if (habits.includes(habit)) {
      setHabits(habits.filter((h) => h !== habit));
    } else {
      setHabits([...habits, habit]);
    }
  };

  // Submit Profile
  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    setError('');

    try {
      const res = await fetch('/api/roommate/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender,
          age: Number(age),
          occupation,
          lifestyle,
          habits,
          pet_friendly: petFriendly,
          smoking_status: smokingStatus,
          bio,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Lỗi lưu hồ sơ.');
      } else {
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Update Request Status (Accept / Reject)
  const handleUpdateRequestStatus = async (requestId: string, newStatus: 'ACCEPTED' | 'REJECTED') => {
    try {
      const res = await fetch('/api/roommate/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(
          newStatus === 'ACCEPTED'
            ? 'Đã chấp nhận yêu cầu ghép phòng! Bạn hãy liên hệ trao đổi chi tiết nhé.'
            : 'Đã từ chối yêu cầu ghép phòng.'
        );
        setTimeout(() => setActionMessage(''), 3500);
        loadSyncData();
      }
    } catch (err) {
      console.error('Error updating request status', err);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ/tháng';
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F6] text-[#0F223A] font-sans selection:bg-[#B89C66]/20 selection:text-[#8C6D37]">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/ho-so"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0F223A] text-white text-xs font-bold hover:bg-[#1A385C] transition-colors shadow-xs"
            >
              <User className="w-3.5 h-3.5 text-[#B89C66]" />
              <span>Hồ sơ cá nhân</span>
            </Link>
            <Link
              href="/o-ghep"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#B89C66] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại danh sách ở ghép</span>
            </Link>
          </div>

          {/* Account Indicator & Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#64748B] hidden md:inline">Đang xem dưới tư cách:</span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#B89C66]/40 text-xs shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B89C66] shrink-0" />
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#0F223A] outline-none cursor-pointer"
              >
                {DEMO_ACCOUNTS.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Hero Banner Elite Living */}
        <div className="bg-gradient-to-r from-[#0F223A] via-[#142A45] to-[#0F223A] rounded-[28px] p-6 sm:p-8 text-white relative shadow-xl mb-8 overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B89C66]/20 border border-[#B89C66]/30 text-[#B89C66] text-xs font-bold mb-3 backdrop-blur-sm">
              <BrainCircuit className="w-3.5 h-3.5 text-[#B89C66]" />
              <span>Ở ghép</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-sans">
              Hồ sơ ở ghép của bạn
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Quản lý bài đăng của bạn, xem và trả lời yêu cầu ở ghép từ người khác.
            </p>
          </div>
        </div>

        {/* Global Notifications */}
        {actionMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-[#FAF7F2] border border-[#B89C66]/40 flex items-center gap-3 text-xs text-[#8C6D37] font-bold animate-in fade-in shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-[#B89C66] shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-8 border-b border-[#E5E3DE] pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('PROFILE')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'PROFILE'
                ? 'bg-[#B89C66] text-white shadow-md shadow-[#B89C66]/20'
                : 'bg-white text-[#64748B] border border-[#E5E3DE] hover:border-[#B89C66] hover:text-[#0F223A]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Thói quen sinh hoạt</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('MY_POSTS')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'MY_POSTS'
                ? 'bg-[#B89C66] text-white shadow-md shadow-[#B89C66]/20'
                : 'bg-white text-[#64748B] border border-[#E5E3DE] hover:border-[#B89C66] hover:text-[#0F223A]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Bài Đăng Của Tôi ({myPosts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RECEIVED_REQUESTS')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer relative ${
              activeTab === 'RECEIVED_REQUESTS'
                ? 'bg-[#B89C66] text-white shadow-md shadow-[#B89C66]/20'
                : 'bg-white text-[#64748B] border border-[#E5E3DE] hover:border-[#B89C66] hover:text-[#0F223A]'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Yêu cầu nhận được</span>
            {receivedRequests.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'RECEIVED_REQUESTS' ? 'bg-white text-[#B89C66]' : 'bg-[#B89C66] text-white'
              }`}>
                {receivedRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SENT_REQUESTS')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'SENT_REQUESTS'
                ? 'bg-[#B89C66] text-white shadow-md shadow-[#B89C66]/20'
                : 'bg-white text-[#64748B] border border-[#E5E3DE] hover:border-[#B89C66] hover:text-[#0F223A]'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Yêu Cầu Đã Gửi ({sentRequests.length})</span>
          </button>
        </div>

        {/* TAB 1: PROFILE & HABITS */}
        {activeTab === 'PROFILE' && (
          <div className="bg-white rounded-[28px] border border-[#E5E3DE] shadow-sm p-6 sm:p-8">
            <div className="mb-6 pb-4 border-b border-[#E5E3DE]/70">
              <h2 className="text-xl font-black text-[#0F223A]">Thói quen sinh hoạt của bạn</h2>
              <p className="text-xs text-[#64748B] mt-1">
                Chúng tôi so thói quen này với từng bài đăng để tính mức phù hợp (%).
              </p>
            </div>

            {profileSuccess && (
              <div className="mb-6 p-4 rounded-xl bg-[#FAF7F2] border border-[#B89C66]/40 flex items-center gap-3 text-xs text-[#8C6D37] font-bold">
                <CheckCircle2 className="w-5 h-5 text-[#B89C66] shrink-0" />
                <span>Đã lưu hồ sơ thành công! Thuật toán matching đã cập nhật thứ tự gợi ý phòng.</span>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmitProfile} className="space-y-6">
              {/* Giới tính, Tuổi, Nghề nghiệp */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                    Giới tính của bạn
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E5E3DE] rounded-xl text-xs font-bold text-[#0F223A] focus:bg-white focus:border-[#B89C66] outline-none"
                  >
                    <option value="Nữ">Nữ</option>
                    <option value="Nam">Nam</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                    Độ tuổi
                  </label>
                  <input
                    type="number"
                    min={16}
                    max={60}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E5E3DE] rounded-xl text-xs font-bold text-[#0F223A] focus:bg-white focus:border-[#B89C66] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                    Nghề nghiệp / Trường đại học
                  </label>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="Sinh viên ĐH Công Thương (HUIT)"
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E5E3DE] rounded-xl text-xs font-bold text-[#0F223A] focus:bg-white focus:border-[#B89C66] outline-none"
                  />
                </div>
              </div>

              {/* Phong cách sống */}
              <div>
                <label className="block text-xs font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                  Xu hướng tính cách
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'Introvert', label: 'Hướng nội (Introvert)' },
                    { id: 'Extrovert', label: 'Hướng ngoại (Extrovert)' },
                    { id: 'Ambivert', label: 'Linh hoạt (Ambivert)' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLifestyle(item.id)}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        lifestyle === item.id
                          ? 'bg-[#B89C66] text-white border-[#B89C66] shadow-xs'
                          : 'bg-[#FAF8F5] text-[#0F223A] border-[#E5E3DE] hover:border-[#B89C66]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thói quen cá nhân */}
              <div>
                <label className="block text-xs font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                  Thói quen sinh hoạt của bạn (Chọn các mục phù hợp)
                </label>
                <div className="flex flex-wrap gap-2">
                  {HABIT_OPTIONS.map((habit) => {
                    const selected = habits.includes(habit);
                    return (
                      <button
                        key={habit}
                        type="button"
                        onClick={() => toggleHabit(habit)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                          selected
                            ? 'bg-[#FAF7F2] border-[#B89C66] text-[#8C6D37] shadow-xs'
                            : 'bg-white border-[#E5E3DE] text-[#64748B] hover:border-[#B89C66]'
                        }`}
                      >
                        {selected ? <Check className="w-3.5 h-3.5 text-[#B89C66]" /> : null}
                        <span>{habit}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Thú cưng & Thuốc lá */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[#E5E3DE] bg-[#FAF8F5] flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-[#0F223A]">Nuôi hoặc yêu thích thú cưng?</span>
                    <span className="text-[11px] text-[#64748B]">Chó, mèo hoặc thú nhỏ</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPetFriendly(!petFriendly)}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      petFriendly ? 'bg-[#B89C66]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        petFriendly ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-[#E5E3DE] bg-[#FAF8F5] flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-[#0F223A]">Có hút thuốc không?</span>
                    <span className="text-[11px] text-[#64748B]">Thuốc lá truyền thống hoặc Vape/Pod</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSmokingStatus(!smokingStatus)}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      smokingStatus ? 'bg-rose-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        smokingStatus ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                  Đôi nét giới thiệu bản thân
                </label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Viết một đoạn ngắn giới thiệu tính cách, lịch sinh hoạt của bạn..."
                  className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E5E3DE] rounded-xl text-xs font-medium text-[#0F223A] focus:bg-white focus:border-[#B89C66] outline-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-[#E5E3DE] flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={loadingProfile}
                  className="px-7 py-3 bg-[#B89C66] hover:bg-[#A38752] text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-[#B89C66]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loadingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Lưu thói quen</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: MY POSTS */}
        {activeTab === 'MY_POSTS' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-6 rounded-[24px] border border-[#E5E3DE]">
              <div>
                <h2 className="text-xl font-black text-[#0F223A]">Bài đăng của tôi</h2>
                <p className="text-xs text-[#64748B] mt-1">
                  Danh sách tin tìm bạn mà tài khoản <strong>{currentUserName}</strong> đang quản lý.
                </p>
              </div>
              <Link
                href="/o-ghep/dang-bai"
                className="px-5 py-2.5 bg-[#B89C66] hover:bg-[#A38752] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Đăng tin mới</span>
              </Link>
            </div>

            {fetchingData ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 text-[#B89C66] animate-spin" />
              </div>
            ) : myPosts.length === 0 ? (
              <div className="bg-white rounded-[24px] border border-[#E5E3DE] p-12 text-center space-y-3">
                <FileText className="w-12 h-12 text-[#94A3B8] mx-auto" />
                <h3 className="text-lg font-bold text-[#0F223A]">Bạn chưa có bài đăng ở ghép nào</h3>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  Hãy đăng bài tìm bạn cùng phòng để tìm người chia sẻ tiền phòng tại các tòa nhà cao cấp Tây Sài Gòn.
                </p>
                <Link
                  href="/o-ghep/dang-bai"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#B89C66] text-white text-xs font-bold rounded-xl mt-3"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Tạo bài đăng ngay</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white rounded-[24px] border border-[#E5E3DE] p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span className="px-3 py-1 rounded-full bg-[#FAF7F2] text-[#8C6D37] text-[11px] font-bold border border-[#B89C66]/30">
                          {post.district}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          {post.status === 'OPEN' ? 'Đang mở tìm người' : 'Đã tìm được'}
                        </span>
                      </div>

                      <h3 className="font-bold text-[#0F223A] text-sm line-clamp-2 mb-2">
                        {post.title}
                      </h3>

                      <p className="text-xs text-[#64748B] line-clamp-2 mb-4 leading-relaxed">
                        {post.description}
                      </p>

                      <div className="flex items-baseline justify-between pt-3 border-t border-[#E5E3DE]/70">
                        <span className="text-xs text-[#64748B]">Giá chia sẻ:</span>
                        <strong className="text-sm font-black text-[#B89C66]">
                          {formatPrice(post.shared_rent)}
                        </strong>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-[#E5E3DE]/70 flex items-center justify-between">
                      <span className="text-[11px] text-[#94A3B8]">
                        Mã bài: #{post.id}
                      </span>

                      <Link
                        href={`/o-ghep/${post.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B89C66] hover:underline"
                      >
                        <span>Xem chi tiết</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RECEIVED REQUESTS (Synchronized from Other Accounts) */}
        {activeTab === 'RECEIVED_REQUESTS' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[24px] border border-[#E5E3DE]">
              <h2 className="text-xl font-black text-[#0F223A]">Yêu cầu ở ghép nhận được</h2>
              <p className="text-xs text-[#64748B] mt-1">
                Các bạn thuê khác đã gửi lời nhắn và thông tin liên hệ tới các bài đăng của bạn. Dữ liệu liên kết đồng bộ theo thời gian thực.
              </p>
            </div>

            {fetchingData ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 text-[#B89C66] animate-spin" />
              </div>
            ) : receivedRequests.length === 0 ? (
              <div className="bg-white rounded-[24px] border border-[#E5E3DE] p-12 text-center space-y-3">
                <Inbox className="w-12 h-12 text-[#94A3B8] mx-auto" />
                <h3 className="text-lg font-bold text-[#0F223A]">Chưa có yêu cầu kết nối nào</h3>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  Khi người khác xem bài đăng của bạn và bấm &quot;Gửi yêu cầu ở ghép&quot;, thông tin liên hệ và lời nhắn của họ sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {receivedRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white rounded-[24px] border border-[#E5E3DE] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="space-y-3 max-w-2xl">
                      <div className="flex items-center gap-3">
                        <img
                          src={req.requester_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                          alt={req.requester_name || 'Người gửi'}
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-[#B89C66]/40 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-[#0F223A] text-sm">{req.requester_name}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              req.status === 'ACCEPTED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : req.status === 'REJECTED'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-[#FAF7F2] text-[#8C6D37] border border-[#B89C66]/40'
                            }`}>
                              {req.status === 'ACCEPTED' ? 'Đã chấp nhận' : req.status === 'REJECTED' ? 'Đã từ chối' : 'Chờ phản hồi'}
                            </span>
                          </div>
                          <span className="text-xs text-[#64748B]">SĐT: <strong>{req.requester_phone}</strong></span>
                        </div>
                      </div>

                      {/* Post referenced */}
                      <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E5E3DE] text-xs">
                        <span className="text-[#94A3B8] font-bold block mb-1">Gửi tới bài đăng:</span>
                        <span className="font-bold text-[#0F223A]">{req.post_title}</span>
                      </div>

                      {/* Message */}
                      <p className="text-xs text-[#334155] leading-relaxed bg-[#F8F8F6] p-3.5 rounded-xl italic">
                        &ldquo;{req.message}&rdquo;
                      </p>

                      <span className="text-[11px] text-[#94A3B8] block">
                        Gửi lúc: {new Date(req.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                      {req.status === 'PENDING' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateRequestStatus(req.id, 'ACCEPTED')}
                            className="px-5 py-2.5 bg-[#B89C66] hover:bg-[#A38752] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <Check className="w-4 h-4" />
                            <span>Chấp nhận ghép phòng</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateRequestStatus(req.id, 'REJECTED')}
                            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#64748B] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Từ chối</span>
                          </button>
                        </>
                      ) : null}

                      <a
                        href={`tel:${req.requester_phone}`}
                        className="px-5 py-2.5 border border-[#B89C66] text-[#B89C66] hover:bg-[#B89C66] hover:text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Gọi điện thoại</span>
                      </a>

                      <a
                        href={`https://zalo.me/${req.requester_phone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-2.5 bg-[#0F223A] text-white text-xs font-bold rounded-xl hover:bg-[#1A365D] transition-all flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Mở Zalo nhắn tin</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SENT REQUESTS */}
        {activeTab === 'SENT_REQUESTS' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[24px] border border-[#E5E3DE]">
              <h2 className="text-xl font-black text-[#0F223A]">Yêu cầu tôi đã gửi</h2>
              <p className="text-xs text-[#64748B] mt-1">
                Theo dõi trạng thái các bài đăng bạn đã gửi lời nhắn kết nối ở ghép.
              </p>
            </div>

            {fetchingData ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 text-[#B89C66] animate-spin" />
              </div>
            ) : sentRequests.length === 0 ? (
              <div className="bg-white rounded-[24px] border border-[#E5E3DE] p-12 text-center space-y-3">
                <Send className="w-12 h-12 text-[#94A3B8] mx-auto" />
                <h3 className="text-lg font-bold text-[#0F223A]">Bạn chưa gửi yêu cầu ghép phòng nào</h3>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  Hãy dạo xem các bài đăng ở ghép và bấm &quot;Gửi yêu cầu ở ghép&quot; khi tìm thấy phòng và bạn cùng phòng ưng ý.
                </p>
                <Link
                  href="/o-ghep"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#B89C66] text-white text-xs font-bold rounded-xl mt-3"
                >
                  <span>Khám phá bài đăng ở ghép</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {sentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white rounded-[24px] border border-[#E5E3DE] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'ACCEPTED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : req.status === 'REJECTED'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-[#FAF7F2] text-[#8C6D37] border border-[#B89C66]/40'
                        }`}>
                          {req.status === 'ACCEPTED' ? '✓ Đã được chấp nhận kết nối' : req.status === 'REJECTED' ? '✕ Đã bị từ chối' : '⏳ Đang chờ chủ phòng phản hồi'}
                        </span>
                        <span className="text-[11px] text-[#94A3B8]">
                          {new Date(req.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>

                      <h4 className="font-bold text-[#0F223A] text-sm">{req.post_title}</h4>
                      <p className="text-xs text-[#64748B] italic">
                        Lời nhắn của bạn: &ldquo;{req.message}&rdquo;
                      </p>
                    </div>

                    <div className="shrink-0">
                      <Link
                        href={`/o-ghep/${req.post_id}`}
                        className="px-5 py-2.5 bg-[#FAF8F5] border border-[#E5E3DE] hover:border-[#B89C66] text-xs font-bold text-[#0F223A] rounded-xl inline-flex items-center gap-1.5 transition-all"
                      >
                        <span>Xem lại phòng</span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#B89C66]" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
