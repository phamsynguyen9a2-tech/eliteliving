'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Users,
  MapPin,
  Calendar,
  Phone,
  ShieldCheck,
  ArrowLeft,
  MessageSquare,
  Clock,
  Home,
  Check,
  Loader2,
  Building2,
  X,
  Send,
  CheckCircle2,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import type { RoommatePost } from '@/lib/types';

export default function RoommateDetailPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const id = params?.id as string;

  const [post, setPost] = useState<RoommatePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  // Auth & Request Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!id) return;
    const fetchPost = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/roommate/posts/${id}`);
        const data = await res.json();
        if (data.success && data.data) {
          setPost(data.data);
        }
      } catch (err) {
        console.error('Failed to load post detail', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  const handleOpenRequestModal = () => {
    if (status !== 'authenticated' || !session?.user) {
      setAuthModalOpen(true);
      return;
    }
    setModalOpen(true);
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      setErrorMsg('Vui lòng đăng nhập tài khoản để gửi yêu cầu ở ghép.');
      setAuthModalOpen(true);
      return;
    }

    setSending(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/roommate/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: post?.id,
          message,
          requester_name: session.user.name || 'Khách tìm phòng',
          requester_phone: session.user.phone || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || 'Lỗi gửi yêu cầu.');
      } else {
        setRequestSent(true);
        setTimeout(() => {
          setModalOpen(false);
          setRequestSent(false);
          setMessage('');
        }, 1800);
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ.');
    } finally {
      setSending(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ/tháng';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8F8F6]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#B89C66]" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8F8F6]">
        <Navbar />
        <div className="flex-1 max-w-lg mx-auto p-8 text-center my-auto">
          <h2 className="text-xl font-bold text-[#0F223A] mb-2">Không tìm thấy bài đăng ở ghép</h2>
          <p className="text-xs text-[#64748B] mb-5">Bài viết có thể đã đóng hoặc hết hạn tìm bạn cùng phòng.</p>
          <Link
            href="/o-ghep"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#B89C66] text-white text-xs font-bold rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách ở ghép</span>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F6] text-[#0F223A] font-sans selection:bg-[#B89C66]/20 selection:text-[#8C6D37]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Breadcrumb / Back button */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/o-ghep"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#B89C66] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Danh sách bài đăng tìm bạn ở ghép</span>
          </Link>
          <span className="text-xs text-[#94A3B8]">Mã bài đăng: #{post.id}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Images & Details (Col 2) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="bg-white rounded-[24px] border border-[#E5E3DE] p-3 overflow-hidden shadow-xs">
              <div className="relative h-72 sm:h-96 w-full rounded-2xl overflow-hidden bg-slate-900">
                <img
                  src={post.images?.[activeImage] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80'}
                  alt={post.title}
                  className="w-full h-full object-cover transition-all duration-300"
                />
                <div className="absolute top-4 left-4 bg-[#0F223A]/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#B89C66]" />
                  <span>{post.room_title || 'Tòa nhà Elite Living'}</span>
                </div>
              </div>

              {/* Thumbnails */}
              {post.images && post.images.length > 1 && (
                <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1">
                  {post.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImage(idx)}
                      className={`relative w-20 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                        activeImage === idx ? 'border-[#B89C66] shadow-md scale-95' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Post Title & Location */}
            <div className="bg-white rounded-[24px] p-6 sm:p-7 border border-[#E5E3DE] shadow-[0_10px_30px_-5px_rgba(15,34,58,0.06)]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#64748B] mb-2.5">
                <MapPin className="w-4 h-4 text-[#B89C66] shrink-0" />
                <span>{post.address || post.district}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#0F223A] leading-snug mb-5">
                {post.title}
              </h1>

              {/* Habit tags */}
              <div className="pt-4 border-t border-[#E5E3DE]/70">
                <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-3">
                  Thói quen &amp; Tiêu chí mong muốn của phòng:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {post.required_habits?.map((habit, idx) => (
                    <span
                      key={idx}
                      className="px-3.5 py-1.5 bg-[#FAF7F2] text-[#8C6D37] text-xs font-bold rounded-xl border border-[#B89C66]/30 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 text-[#B89C66]" />
                      {habit}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="mt-6 pt-5 border-t border-[#E5E3DE]/70">
                <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2.5">
                  Mô tả chi tiết từ người đăng bài:
                </h4>
                <p className="text-sm text-[#334155] leading-relaxed whitespace-pre-line">
                  {post.description}
                </p>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Poster Card & Action (Col 1) */}
          <div className="space-y-6">
            {/* Price & Action Card */}
            <div className="bg-white rounded-[24px] p-6 border border-[#E5E3DE] shadow-[0_12px_35px_-5px_rgba(15,34,58,0.08)] sticky top-24">
              <div className="pb-5 border-b border-[#E5E3DE]/70">
                <span className="text-xs font-bold text-[#94A3B8] block mb-1">
                  Giá thuê chia sẻ mỗi người
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#B89C66]">
                    {formatPrice(post.shared_rent)}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center gap-2 text-xs text-[#64748B]">
                  <Users className="w-4 h-4 text-[#B89C66]" />
                  <span>
                    Hiện tại: <strong className="text-[#0F223A]">{post.current_people}</strong> / Tối đa: <strong className="text-[#0F223A]">{post.max_people} người</strong>
                  </span>
                </div>
              </div>

              {/* Preferences Summary */}
              <div className="py-4 space-y-3 text-xs text-[#475569] border-b border-[#E5E3DE]/70">
                <div className="flex justify-between">
                  <span>Giới tính mong muốn:</span>
                  <span className="font-bold text-[#0F223A]">{post.gender_preference}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ngày đăng:</span>
                  <span className="font-semibold text-[#0F223A]">
                    {new Date(post.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Thời hạn tìm bạn:</span>
                  <span className="font-semibold text-[#0F223A]">
                    {new Date(post.expires_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-5 space-y-3">
                <button
                  type="button"
                  onClick={handleOpenRequestModal}
                  className="w-full py-3.5 bg-[#B89C66] hover:bg-[#A38752] text-white font-bold text-sm rounded-2xl shadow-lg shadow-[#B89C66]/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Gửi yêu cầu ở ghép</span>
                </button>

                <a
                  href={`tel:${post.contact_phone}`}
                  className="w-full py-3 border-[1.5px] border-[#B89C66] text-[#B89C66] hover:bg-[#B89C66] hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Gọi trực tiếp: {post.contact_phone}</span>
                </a>
              </div>

              {/* Poster Profile */}
              <div className="mt-6 pt-5 border-t border-[#E5E3DE]/70">
                <h4 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">
                  Thông tin người tìm bạn
                </h4>
                <div className="flex items-center gap-3">
                  <img
                    src={post.user_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                    alt={post.user_name || 'Người đăng'}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-[#B89C66]/40"
                  />
                  <div>
                    <h5 className="font-bold text-[#0F223A] text-sm">{post.user_name || 'Người thuê'}</h5>
                    <span className="text-[11px] text-[#B89C66] font-semibold flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Tài khoản đã xác minh
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Connect Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F223A]/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] max-w-md w-full shadow-2xl border border-[#E5E3DE] p-6 relative animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-[#B89C66] text-white flex items-center justify-center mx-auto mb-2 shadow-md shadow-[#B89C66]/20">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-[#0F223A]">Liên hệ người đăng</h3>
              <p className="text-xs text-[#64748B] mt-1">
                Gửi lời chào và thông tin liên hệ tới <strong>{post.user_name}</strong>
              </p>
            </div>

            {requestSent ? (
              <div className="p-5 bg-[#FAF7F2] border border-[#B89C66]/30 rounded-2xl text-center text-xs text-[#8C6D37] space-y-2 animate-in fade-in">
                <CheckCircle2 className="w-8 h-8 text-[#B89C66] mx-auto" />
                <p className="font-bold text-sm text-[#0F223A]">Đã gửi yêu cầu thành công!</p>
                <p>Chủ bài đăng sẽ nhận được thông báo kèm thông tin liên lạc của bạn.</p>
              </div>
            ) : (
              <form onSubmit={handleSendRequest} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl font-medium">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#0F223A] mb-1.5">
                    Lời nhắn giới thiệu bản thân
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Chào bạn, mình là sinh viên HUIT, muốn kết nối ở ghép cùng bạn tại phòng này..."
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E5E3DE] rounded-xl text-xs text-[#0F223A] focus:bg-white focus:border-[#B89C66] focus:ring-4 focus:ring-[#B89C66]/15 outline-none"
                  />
                </div>

                <div className="p-3 bg-[#FAF8F5] rounded-xl text-[11px] text-[#64748B] space-y-1 border border-[#E5E3DE]">
                  <p>• Người gửi: <strong>{session?.user?.name || 'Khách thuê'}</strong></p>
                  <p>• Số điện thoại: <strong>{session?.user?.phone || '0901234567'}</strong></p>
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3 bg-[#B89C66] hover:bg-[#A38752] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#B89C66]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Gửi lời nhắn kết nối</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal if unauthenticated */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab="login"
      />

      <Footer />
    </div>
  );
}
