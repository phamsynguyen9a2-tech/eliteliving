import { verifyPassword } from './password';

/**
 * Chế độ demo: bật sẵn khi chạy `npm run dev`. Khi chạy production (build + start, Vercel)
 * chỉ bật khi đặt ENABLE_DEMO_LOGIN="true" (biến cũ ENABLE_DEMO_PORTAL vẫn được chấp nhận).
 *
 * Khi bật: có nút đăng nhập nhanh cho hội đồng, mật khẩu demo cho tài khoản chưa có mật khẩu
 * riêng, nút "Google (demo)", và mã OTP được in ra terminal của máy chủ (chỉ tài khoản demo
 * mới thấy mã ngay trên màn hình — xem lib/otp-delivery.ts).
 */
export function isDemoLoginEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_DEMO_LOGIN === 'true' ||
    process.env.ENABLE_DEMO_PORTAL === 'true'
  );
}

/** Đã cấu hình Google OAuth thật hay chưa. */
export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Tài khoản khách thuê duy nhất mà nút "Google (demo)" được phép đăng nhập vào. */
export const DEMO_TENANT = {
  email: 'nguyen.pham.huit@gmail.com',
  name: 'Phạm Sỹ Nguyên',
  phone: '0912345678',
  googleId: 'google_demo_10928374',
  image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
} as const;

/** Mật khẩu demo dùng được khi tài khoản chủ trọ / admin chưa được cấp mật khẩu riêng. */
export const DEMO_PORTAL_PASSWORDS = {
  LANDLORD: '123456',
  ADMIN: 'admin123',
} as const;

/**
 * Kiểm tra mật khẩu cổng vận hành của MỘT tài khoản:
 * - Tài khoản đã có mật khẩu riêng (password_hash) → chỉ mật khẩu đó hợp lệ.
 * - Chưa có mật khẩu riêng → chỉ chấp nhận mật khẩu demo, và chỉ khi đang bật chế độ demo.
 */
export async function checkPortalPassword(input: {
  password: string | undefined;
  storedHash: string | null | undefined;
  demoPassword: string;
  demoEnabled: boolean;
}): Promise<boolean> {
  const { password, storedHash, demoPassword, demoEnabled } = input;
  if (!password) return false;
  if (storedHash) return verifyPassword(password, storedHash);
  return demoEnabled && password === demoPassword;
}
