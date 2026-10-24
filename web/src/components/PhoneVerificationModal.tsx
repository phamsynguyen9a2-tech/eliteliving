'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AlertCircle, Phone, ShieldCheck, X, Loader2 } from 'lucide-react';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onVerified?: () => void;
}

export default function PhoneVerificationModal({
  isOpen,
  onClose,
  onVerified,
}: PhoneVerificationModalProps) {
  const { update } = useSession();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [developmentCode, setDevelopmentCode] = useState('');
  const [otpNotice, setOtpNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen || !onClose) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => {
      if (step === 'OTP') otpInputRef.current?.focus();
      else phoneInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, step]);

  if (!isOpen) return null;

  // Validate SĐT Việt Nam
  const isValidPhone = (p: string) => {
    const cleaned = p.replace(/\s|-/g, '');
    return /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-689]|9[0-46-9])\d{7}$/.test(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (step === 'PHONE' && !isValidPhone(phone)) {
      setError('Số điện thoại không hợp lệ. Vui lòng nhập SĐT Việt Nam (VD: 0901234567).');
      return;
    }
    if (step === 'OTP' && !/^\d{6}$/.test(otp)) {
      setError('Mã OTP phải gồm đúng 6 chữ số.');
      return;
    }

    setLoading(true);
    try {
      const normalizedPhone = phone.replace(/\s|-/g, '').replace(/^\+84/, '0');
      const res = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalizedPhone,
          action: step === 'PHONE' ? 'REQUEST_CODE' : 'VERIFY_CODE',
          ...(step === 'OTP' ? { code: otp } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Có lỗi xảy ra, vui lòng thử lại.');
        return;
      }

      if (step === 'PHONE') {
        setDevelopmentCode(data.developmentCode || '');
        setOtpNotice(data.developmentCode ? '' : data.message || '');
        setStep('OTP');
        return;
      }

      // Cập nhật session
      await update({
        phone: normalizedPhone,
        phoneVerified: true,
      });

      setSuccess(true);
      setTimeout(() => {
        onVerified?.();
      }, 1500);
    } catch {
      setError('Lỗi kết nối, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0F223A]/60 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-verification-title"
        className="relative w-full max-w-md bg-white rounded-3xl border border-[#E5E3DE] shadow-2xl overflow-hidden"
      >
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-[#0F223A] to-[#1E3A5B] px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 id="phone-verification-title" className="text-lg font-bold text-white">Xác minh số điện thoại</h2>
                <p className="text-[#E5D7B7] text-sm">Bảo vệ tài khoản và lịch hẹn của bạn</p>
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng hộp thoại xác minh số điện thoại"
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {success ? (
            <div role="status" aria-live="polite" className="text-center py-6">
              <div className="w-16 h-16 bg-[#FAF0DC] border border-[#B89C66]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-[#B89C66]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Xác minh thành công!</h3>
              <p className="text-gray-500 text-sm">Đang chuyển hướng...</p>
            </div>
          ) : (
            <>
              <div className="bg-[#FAF0DC] border border-[#B89C66]/30 rounded-xl p-4 mb-5">
                <p className="text-sm text-[#6F552D]">
                  <strong>Vì sao cần xác minh SĐT?</strong><br />
                  Để bảo vệ cộng đồng khỏi tài khoản spam và đảm bảo chủ trọ có thể liên hệ khi bạn đặt lịch xem phòng.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <label htmlFor="phone-verification-input" className="block text-sm font-medium text-gray-700 mb-2">
                  Số điện thoại di động
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B89C66]" aria-hidden="true" />
                  <input
                    ref={phoneInputRef}
                    id="phone-verification-input"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setError('');
                    }}
                    placeholder="0901 234 567"
                    className="w-full pl-11 pr-4 py-3 border border-[#E5E3DE] rounded-xl focus:ring-2 focus:ring-[#B89C66]/20 focus:border-[#B89C66] text-[#0F223A] placeholder:text-gray-400 transition-all outline-none"
                    maxLength={12}
                    disabled={step === 'OTP'}
                    required
                  />
                </div>

                {step === 'OTP' && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <label htmlFor="phone-verification-otp" className="block text-sm font-medium text-gray-700">
                        Mã OTP 6 chữ số
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('PHONE');
                          setOtp('');
                          setDevelopmentCode('');
                          setError('');
                        }}
                        className="text-xs font-semibold text-[#8C6D37] hover:text-[#A38752]"
                      >
                        Đổi số điện thoại
                      </button>
                    </div>
                    <input
                      ref={otpInputRef}
                      id="phone-verification-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={otp}
                      onChange={(event) => {
                        setOtp(event.target.value.replace(/\D/g, '').slice(0, 6));
                        setError('');
                      }}
                      placeholder="Nhập mã OTP"
                      className="w-full px-4 py-3 border border-[#E5E3DE] rounded-xl focus:ring-2 focus:ring-[#B89C66]/20 focus:border-[#B89C66] text-[#0F223A] tracking-[0.35em] text-center font-bold placeholder:tracking-normal placeholder:font-normal transition-all outline-none"
                      maxLength={6}
                      required
                    />
                    {developmentCode && (
                      <p className="mt-2 rounded-lg border border-[#B89C66]/30 bg-[#FAF0DC] px-3 py-2 text-center text-xs text-[#6F552D]">
                        Mã thử nghiệm cục bộ: <strong className="tracking-widest">{developmentCode}</strong>
                      </p>
                    )}
                    {!developmentCode && otpNotice && (
                      <p className="mt-2 rounded-lg border border-[#E5E3DE] bg-[#F8F8F6] px-3 py-2 text-xs text-[#4B5563]">
                        {otpNotice}
                      </p>
                    )}
                  </div>
                )}

                {error && (
                  <p role="alert" className="text-rose-600 text-sm mt-2 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" /> {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !phone || (step === 'OTP' && otp.length !== 6)}
                  className="w-full mt-5 py-3 bg-[#B89C66] text-white font-semibold rounded-xl hover:bg-[#A38752] shadow-lg shadow-[#B89C66]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {step === 'PHONE' ? 'Đang gửi mã...' : 'Đang xác minh...'}
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      {step === 'PHONE' ? 'Nhận mã xác minh' : 'Xác nhận mã OTP'}
                    </>
                  )}
                </button>
              </form>

              <p className="text-xs text-gray-400 mt-4 text-center">
                Thông tin SĐT được bảo mật và chỉ hiển thị cho chủ trọ khi bạn đặt lịch.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
