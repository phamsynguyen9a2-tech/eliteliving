'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { portalSignIn } from '@/lib/portal-auth-client';
import {
  Building2,
  Shield,
  KeyRound,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle2,
  Home,
  UserCheck,
  ChevronRight
} from 'lucide-react';
import { Landlord } from '@/lib/types';

export default function PortalLoginPage() {
  const router = useRouter();
  const [roleTab, setRoleTab] = useState<'LANDLORD' | 'ADMIN'>('LANDLORD');
  const [email, setEmail] = useState('hung.taythanh@eliteliving.vn');
  const [password, setPassword] = useState('123456');
  const [selectedLandlordId, setSelectedLandlordId] = useState<string>('landlord_tp_1');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [demoLandlords, setDemoLandlords] = useState<Landlord[]>([]);

  useEffect(() => {
    // Fetch demo accounts
    fetch('/api/auth/portal')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data.landlords) {
          setDemoLandlords(res.data.landlords);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleLogin = async (e?: React.FormEvent, quickLandlord?: Landlord, quickAdmin?: boolean) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const targetRole = quickAdmin ? 'ADMIN' : (quickLandlord ? 'LANDLORD' : roleTab);
    const targetEmail = quickAdmin ? 'admin@eliteliving.vn' : (quickLandlord ? quickLandlord.email : email);
    const targetLandlordId = quickLandlord ? quickLandlord.id : (targetRole === 'LANDLORD' ? selectedLandlordId : undefined);
    const targetPassword = password || (targetRole === 'ADMIN' ? 'admin123' : '123456');

    try {
      // 1. Establish NextAuth session token
      const authResult = await portalSignIn({
        role: targetRole,
        email: targetEmail,
        password: targetPassword,
      });
      if (!authResult?.ok) {
        setErrorMsg(authResult?.error || 'Không thể xác thực tài khoản vận hành.');
        setLoading(false);
        return;
      }

      // 2. Register portal session
      const res = await fetch('/api/auth/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: targetRole,
          email: targetEmail,
          password: targetPassword,
          landlordId: targetLandlordId,
          isQuickLogin: Boolean(quickLandlord || quickAdmin),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMsg(json.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
        setLoading(false);
        return;
      }

      // 3. Save display profile locally; authorization relies on the HttpOnly NextAuth JWT.
      localStorage.setItem('elite_auth_user', JSON.stringify(json.session));

      setSuccessMsg(json.message || 'Đăng nhập thành công! Đang chuyển hướng vào hệ thống...');

      const targetPath = json.redirectTo || (targetRole === 'ADMIN' ? '/admin' : '/chu-tro');
      setTimeout(() => {
        window.location.href = targetPath;
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-[#B89C66] selection:text-white">
      {/* Top Subtle Announcement Bar */}
      <div className="bg-slate-900/80 border-b border-slate-800 text-[11px] text-slate-400 py-2 px-4 text-center">
        <span>🔒 Cổng thông tin xác thực quản lý nội bộ dành cho Chủ nhà và Quản trị viên hệ thống. Khách thuê tra cứu phòng </span>
        <Link href="/" className="text-[#B89C66] hover:underline font-bold inline-flex items-center gap-0.5 ml-1">
          quay lại Trang chủ &rarr;
        </Link>
      </div>

      {/* Main Login Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-xl">
          {/* Brand Emblem */}
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#B89C66] to-[#E5D2A0] p-0.5 shadow-xl shadow-[#B89C66]/20 group-hover:scale-105 transition-all">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-[#B89C66]" />
                </div>
              </div>
              <div className="text-left">
                <span className="font-black text-xl sm:text-2xl tracking-widest text-white uppercase font-sans block leading-none">
                  ELITE LIVING
                </span>
                <span className="text-[10px] sm:text-xs text-[#B89C66] font-semibold tracking-[0.25em] uppercase">
                  MANAGEMENT PORTAL
                </span>
              </div>
            </Link>
            <p className="text-xs text-slate-400 mt-2">
              Hệ thống Điều phối Vận hành Cho thuê Phòng trọ &amp; Quản trị Tập trung
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            {/* Ambient Lighting */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#B89C66]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Role Switcher Tabs */}
            <div className="grid grid-cols-2 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setRoleTab('LANDLORD');
                  setEmail('hung.taythanh@eliteliving.vn');
                  setErrorMsg('');
                }}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  roleTab === 'LANDLORD'
                    ? 'bg-gradient-to-r from-[#B89C66] to-[#997F4A] text-slate-950 shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>CHỦ TRỌ VẬN HÀNH</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRoleTab('ADMIN');
                  setEmail('admin@eliteliving.vn');
                  setErrorMsg('');
                }}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  roleTab === 'ADMIN'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>QUẢN TRỊ VIÊN (ADMIN)</span>
              </button>
            </div>

            {/* Status alerts */}
            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Standard Login Form */}
            <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {roleTab === 'LANDLORD' ? 'Email hoặc Số điện thoại Chủ trọ' : 'Email Quản trị viên'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    {roleTab === 'LANDLORD' ? <Phone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                  </div>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={roleTab === 'LANDLORD' ? 'hung.taythanh@eliteliving.vn hoặc 0903123456' : 'admin@eliteliving.vn'}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#B89C66] focus:ring-1 focus:ring-[#B89C66] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mật khẩu bảo mật
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#B89C66] focus:ring-1 focus:ring-[#B89C66] transition-all"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  * Mật khẩu demo mặc định: <code className="text-[#B89C66]">123456</code> hoặc <code className="text-[#B89C66]">admin123</code>
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg mt-2 ${
                  roleTab === 'LANDLORD'
                    ? 'bg-[#B89C66] hover:bg-[#A88C56] text-slate-950 shadow-[#B89C66]/20'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20'
                } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <span>Đang xác thực hệ thống...</span>
                ) : (
                  <>
                    <span>Đăng nhập Cổng {roleTab === 'LANDLORD' ? 'Chủ Trọ' : 'Quản Trị'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Login Section (Dedicated for Thesis Defense & Testing) */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-[#B89C66]" />
                  <span>Đăng Nhập 1-Click (Dành Cho GVHD / Hội Đồng)</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                  Quick Demo
                </span>
              </div>

              {roleTab === 'ADMIN' ? (
                <button
                  type="button"
                  onClick={() => handleLogin(undefined, undefined, true)}
                  disabled={loading}
                  className="w-full p-3 rounded-xl bg-purple-950/30 hover:bg-purple-950/60 border border-purple-800/60 text-left transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-900/60 text-purple-200 flex items-center justify-center font-bold">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white group-hover:text-purple-300">
                        Admin Lead (Toàn quyền hệ thống)
                      </h5>
                      <p className="text-[10px] text-slate-400">
                        admin@eliteliving.vn • Quản trị duyệt tin &amp; thuật toán Top-K
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : (
                <div className="space-y-2">
                  {demoLandlords.slice(0, 4).map((landlord) => (
                    <button
                      key={landlord.id}
                      type="button"
                      onClick={() => handleLogin(undefined, landlord, false)}
                      disabled={loading}
                      className="w-full p-2.5 rounded-xl bg-slate-950/50 hover:bg-slate-800/80 border border-slate-800 hover:border-[#B89C66]/50 text-left transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 truncate mr-2">
                        <div className="w-8 h-8 rounded-lg bg-[#B89C66]/20 text-[#B89C66] flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {landlord.name.charAt(0)}
                        </div>
                        <div className="truncate">
                          <h5 className="text-xs font-semibold text-slate-200 group-hover:text-[#B89C66] truncate">
                            {landlord.name}
                          </h5>
                          <p className="text-[10px] text-slate-500 truncate">
                            {landlord.email} • {landlord.phone}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 group-hover:bg-[#B89C66] group-hover:text-slate-950 transition-colors flex-shrink-0">
                        Vào ngay
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notice about Tenants separation */}
            <div className="mt-6 pt-4 border-t border-slate-800/60 text-center">
              <p className="text-[11px] text-slate-400">
                Bạn là sinh viên hoặc khách thuê đang tìm phòng?{' '}
                <Link href="/" className="text-[#B89C66] font-bold hover:underline inline-flex items-center gap-1">
                  <Home className="w-3 h-3" />
                  <span>Đến Cổng Khách Thuê Phòng</span>
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-900">
        Khóa Luận Cử Nhân CNTT • Trường Đại học Công Thương TP.HCM (HUIT) • Mã đề tài: CNTT-KLCN111
      </footer>
    </div>
  );
}
