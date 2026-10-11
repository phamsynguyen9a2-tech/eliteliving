'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Phone, ShieldCheck, X, Loader2 } from 'lucide-react';

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
  const { data: session, update } = useSession();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  // Validate SĐT Việt Nam
  const isValidPhone = (p: string) => {
    const cleaned = p.replace(/\s|-/g, '');
    return /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-689]|9[0-46-9])\d{7}$/.test(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidPhone(phone)) {
      setError('Số điện thoại không hợp lệ. Vui lòng nhập SĐT Việt Nam (VD: 0901234567).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\s|-/g, '') }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Có lỗi xảy ra, vui lòng thử lại.');
        return;
      }

      // Cập nhật session
      await update({
        phone: phone.replace(/\s|-/g, ''),
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Xác minh Số điện thoại</h2>
                <p className="text-blue-100 text-sm">Bước cuối cùng để bắt đầu sử dụng</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
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
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Xác minh thành công!</h3>
              <p className="text-gray-500 text-sm">Đang chuyển hướng...</p>
            </div>
          ) : (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <p className="text-sm text-amber-800">
                  <strong>Vì sao cần xác minh SĐT?</strong><br />
                  Để bảo vệ cộng đồng khỏi tài khoản spam và đảm bảo chủ trọ có thể liên hệ khi bạn đặt lịch xem phòng.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số điện thoại di động
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                    🇻🇳 +84
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setError('');
                    }}
                    placeholder="0901 234 567"
                    className="w-full pl-20 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400 transition-all"
                    maxLength={12}
                    required
                  />
                </div>

                {error && (
                  <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                    <span>⚠️</span> {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !phone}
                  className="w-full mt-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xác minh...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Xác minh số điện thoại
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
