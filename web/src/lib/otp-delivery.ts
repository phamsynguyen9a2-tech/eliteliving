/**
 * Gửi mã OTP và quyết định khi nào được phép hiện mã ngay trên màn hình.
 *
 * Nguyên tắc:
 * - Production: mã OTP chỉ đi qua email (Resend, cần RESEND_API_KEY). Không bao giờ trả mã
 *   trong response, không in mã ra log.
 * - Chế độ demo (npm run dev hoặc ENABLE_DEMO_LOGIN=true): mã được in ra terminal đang chạy
 *   máy chủ. Chỉ trả mã về trình duyệt cho các tài khoản demo trong danh sách cho phép
 *   (DEMO_TENANT + biến DEMO_OTP_ALLOWLIST), để người lạ không lấy được mã của tài khoản khác.
 * - DEMO_OTP_IN_RESPONSE=true: hiện mã cho mọi tài khoản. KHÔNG an toàn, chỉ dùng khi demo
 *   offline trên máy cá nhân.
 */
import { DEMO_TENANT, isDemoLoginEnabled } from './demo-mode';
import { normalizeAuthIdentifier } from './otp-store';
import type { OtpPurpose } from './otp-store';

/** Các domain email giả do hệ thống tự sinh khi tài khoản chỉ có số điện thoại. */
const PLACEHOLDER_EMAIL_DOMAINS = [
  'khachthue.nhatrotop.vn',
  'khachthue.eliteliving.vn',
  'eliteliving.vn',
];

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** Email có thật sự nhận thư được không (loại email giả tự sinh từ SĐT). */
export function isDeliverableEmail(email?: string | null): email is string {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@').pop()?.toLowerCase() || '';
  return !PLACEHOLDER_EMAIL_DOMAINS.includes(domain);
}

export function getDemoOtpAllowlist(): Set<string> {
  const extra = (process.env.DEMO_OTP_ALLOWLIST || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return new Set(
    [DEMO_TENANT.email, DEMO_TENANT.phone, ...extra].map((item) => normalizeAuthIdentifier(item))
  );
}

/**
 * Có được trả mã OTP về trình duyệt không. Chỉ khi đang bật demo VÀ một trong các định danh
 * (email/SĐT người dùng nhập, email/SĐT của tài khoản) thuộc danh sách tài khoản demo.
 */
export function canExposeDevOtp(identifiers: Array<string | null | undefined>): boolean {
  if (!isDemoLoginEnabled()) return false;
  if (process.env.DEMO_OTP_IN_RESPONSE === 'true') return true;
  const allowlist = getDemoOtpAllowlist();
  return identifiers.some(
    (identifier) => Boolean(identifier) && allowlist.has(normalizeAuthIdentifier(String(identifier)))
  );
}

function maskIdentifier(identifier: string): string {
  if (identifier.includes('@')) {
    const [name, domain] = identifier.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return identifier.length > 4 ? `${identifier.slice(0, 3)}****${identifier.slice(-3)}` : '***';
}

/** Chế độ demo: in mã ra terminal của máy chủ để người chạy demo đọc. Production: không làm gì. */
export function logDevOtp(purpose: OtpPurpose, identifier: string, code: string) {
  if (!isDemoLoginEnabled()) return;
  console.info(`[OTP thử nghiệm] ${purpose} ${maskIdentifier(identifier)} → ${code} (hiệu lực 5 phút)`);
}

const PURPOSE_LABEL: Record<OtpPurpose, string> = {
  LOGIN: 'đăng nhập',
  RESET_PASSWORD: 'đặt lại mật khẩu',
  VERIFY_PHONE: 'xác minh số điện thoại',
};

/** Gửi mã OTP qua email bằng Resend. Trả về true nếu Resend nhận thư thành công. */
export async function sendOtpEmail(input: {
  to: string;
  code: string;
  purpose: OtpPurpose;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey || !isDeliverableEmail(input.to)) return false;
  const fromEmail = process.env.EMAIL_FROM?.trim() || 'Elite Living <onboarding@resend.dev>';
  const label = PURPOSE_LABEL[input.purpose];

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [input.to],
        subject: `Mã xác thực Elite Living: ${input.code}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#0F223A">
            <h2 style="margin:0 0 12px">Mã xác thực ${label}</h2>
            <p>Mã OTP của bạn là:</p>
            <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:8px 0 16px">${input.code}</p>
            <p>Mã có hiệu lực trong 5 phút và chỉ dùng được một lần.</p>
            <p style="color:#6B7280;font-size:13px">Nếu bạn không yêu cầu mã này, hãy bỏ qua email. Không chia sẻ mã cho bất kỳ ai.</p>
          </div>`,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[otp-delivery] Không gửi được email OTP qua Resend:', err);
    return false;
  }
}
