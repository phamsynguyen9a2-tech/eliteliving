import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/request-session';
import prisma from '@/lib/prisma';
import { isDemoLoginEnabled } from '@/lib/demo-mode';
import { hashPassword } from '@/lib/password';
import {
  isValidVietnamPhone,
  issueOtpChallenge,
  normalizeAuthIdentifier,
  normalizeVietnamPhone,
  type OtpPurpose,
  verifyOtpChallenge,
} from '@/lib/otp-store';
import {
  canExposeDevOtp,
  isDeliverableEmail,
  isEmailDeliveryConfigured,
  logDevOtp,
  sendOtpEmail,
} from '@/lib/otp-delivery';

/**
 * Thông báo chung cho mọi trường hợp (có / không có tài khoản, tài khoản bị khóa, ...),
 * để không ai dùng chức năng này dò xem email / SĐT nào đã đăng ký.
 */
const GENERIC_OTP_MESSAGE =
  'Nếu thông tin trùng khớp với một tài khoản khách thuê, mã OTP đã được gửi tới email đăng ký của tài khoản đó. Mã có hiệu lực 5 phút.';

async function findTenantByIdentifier(rawIdentifier: string) {
  const normalized = normalizeAuthIdentifier(rawIdentifier);
  if (!normalized) return null;

  if (normalized.includes('@')) {
    return prisma.user.findFirst({
      where: { email: { equals: normalized, mode: 'insensitive' } },
    });
  }

  return prisma.user.findFirst({
    where: {
      OR: [
        { phone: normalized },
        { email: `${normalized}@khachthue.nhatrotop.vn` },
      ],
    },
  });
}

/** SĐT đã thuộc về tài khoản khác chưa (một SĐT chỉ gắn với một tài khoản). */
async function isPhoneTakenByAnotherUser(phone: string, userId: string) {
  const owner = await prisma.user.findFirst({
    where: { phone, NOT: { id: userId } },
    select: { id: true },
  });
  return Boolean(owner);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      phone,
      identifier,
      code,
      newPassword,
      confirmPassword,
      purpose = 'LOGIN',
      action = 'REQUEST_CODE',
    } = body;

    // =========================================================================
    // 1. YÊU CẦU MÃ OTP ĐĂNG NHẬP HOẶC QUÊN MẬT KHẨU (KHÔNG CẦN SESSION)
    // Mã chỉ được gửi tới email đăng ký của tài khoản. Response giống nhau cho mọi
    // trường hợp và không bao giờ chứa mã, trừ tài khoản demo khi đang bật demo.
    // =========================================================================
    if (action === 'REQUEST_AUTH_OTP') {
      const rawId = typeof identifier === 'string' ? identifier.trim() : typeof phone === 'string' ? phone.trim() : '';
      if (!rawId) {
        return NextResponse.json(
          { success: false, message: 'Vui lòng nhập Email hoặc Số điện thoại.' },
          { status: 400 }
        );
      }

      const isEmail = rawId.includes('@');
      if (isEmail ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawId) : !isValidVietnamPhone(rawId)) {
        return NextResponse.json(
          { success: false, message: 'Email hoặc Số điện thoại không hợp lệ.' },
          { status: 400 }
        );
      }

      // Lỗi cấu hình (không phụ thuộc tài khoản nào) nên báo rõ, không làm lộ thông tin.
      if (!isEmailDeliveryConfigured() && !isDemoLoginEnabled()) {
        return NextResponse.json(
          {
            success: false,
            message: 'Dịch vụ gửi mã OTP qua email chưa được cấu hình. Vui lòng đăng nhập bằng mật khẩu.',
          },
          { status: 503 }
        );
      }

      const otpPurpose: OtpPurpose = purpose === 'RESET_PASSWORD' ? 'RESET_PASSWORD' : 'LOGIN';
      const normalizedKey = normalizeAuthIdentifier(rawId);

      // Cấp mã (và áp giới hạn tần suất) cho MỌI định danh hợp lệ, kể cả khi không có tài khoản,
      // để thời gian chờ / thông báo 429 không tiết lộ tài khoản nào tồn tại.
      const issued = issueOtpChallenge(normalizedKey, normalizedKey, otpPurpose, 30_000);
      if (!issued.ok) {
        return NextResponse.json(
          { success: false, message: issued.message },
          { status: issued.status }
        );
      }

      const user = await findTenantByIdentifier(rawId);
      const eligible = Boolean(user && (!user.role || user.role === 'TENANT') && !user.isBlocked);

      if (user && eligible) {
        logDevOtp(otpPurpose, normalizedKey, issued.code);
        if (isDeliverableEmail(user.email)) {
          await sendOtpEmail({ to: user.email, code: issued.code, purpose: otpPurpose });
        }
      }

      const developmentCode =
        eligible && canExposeDevOtp([rawId, user?.email, user?.phone]) ? issued.code : undefined;
      return NextResponse.json({
        success: true,
        message: developmentCode
          ? 'Tài khoản demo: mã OTP thử nghiệm hiển thị bên dưới (hiệu lực 5 phút).'
          : GENERIC_OTP_MESSAGE,
        ...(developmentCode ? { developmentCode } : {}),
      });
    }

    // =========================================================================
    // 2. ĐẶT LẠI MẬT KHẨU BẰNG MÃ OTP (QUÊN MẬT KHẨU)
    // Chỉ đổi mật khẩu. KHÔNG đánh dấu SĐT đã xác minh: mã OTP đi qua email,
    // nên nó không chứng minh người dùng sở hữu số điện thoại.
    // =========================================================================
    if (action === 'RESET_PASSWORD_WITH_OTP') {
      const rawId = typeof identifier === 'string' ? identifier.trim() : typeof phone === 'string' ? phone.trim() : '';
      if (!rawId) {
        return NextResponse.json(
          { success: false, message: 'Vui lòng nhập Email hoặc Số điện thoại.' },
          { status: 400 }
        );
      }

      if (typeof newPassword !== 'string' || newPassword.trim().length < 6) {
        return NextResponse.json(
          { success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' },
          { status: 400 }
        );
      }

      if (typeof confirmPassword === 'string' && confirmPassword && newPassword !== confirmPassword) {
        return NextResponse.json(
          { success: false, message: 'Mật khẩu xác nhận không khớp.' },
          { status: 400 }
        );
      }

      const normalizedKey = normalizeAuthIdentifier(rawId);
      const verified = verifyOtpChallenge(normalizedKey, String(code || ''), 'RESET_PASSWORD', true);
      if (!verified.ok) {
        return NextResponse.json(
          { success: false, message: verified.message },
          { status: verified.status }
        );
      }

      const user = await findTenantByIdentifier(rawId);
      if (!user || (user.role && user.role !== 'TENANT') || user.isBlocked) {
        return NextResponse.json(
          { success: false, message: 'Không thể đặt lại mật khẩu cho tài khoản này.' },
          { status: 400 }
        );
      }

      const passwordHash = await hashPassword(newPassword.trim());
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      return NextResponse.json({
        success: true,
        message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.',
      });
    }

    // =========================================================================
    // 3. XÁC MINH SỐ ĐIỆN THOẠI TRONG HỒ SƠ CÁ NHÂN (CẦN ĐĂNG NHẬP)
    // Chưa tích hợp nhà mạng SMS nên chỉ chạy ở chế độ demo: mã được in ra terminal
    // của máy chủ (tài khoản demo thì hiện luôn trên màn hình).
    // =========================================================================
    const session = await getRequestSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập trước.' },
        { status: 401 }
      );
    }

    if (typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập số điện thoại.' },
        { status: 400 }
      );
    }

    const cleaned = normalizeVietnamPhone(phone);
    if (!isValidVietnamPhone(cleaned)) {
      return NextResponse.json(
        { success: false, message: 'Số điện thoại không hợp lệ.' },
        { status: 400 }
      );
    }

    if (await isPhoneTakenByAnotherUser(cleaned, session.user.id)) {
      return NextResponse.json(
        { success: false, message: 'Số điện thoại này đã được đăng ký cho một tài khoản khác.' },
        { status: 409 }
      );
    }

    if (action === 'REQUEST_CODE') {
      if (!isDemoLoginEnabled()) {
        return NextResponse.json(
          {
            success: false,
            message: 'Dịch vụ gửi OTP qua SMS chưa được cấu hình. Vui lòng liên hệ hỗ trợ.',
          },
          { status: 503 }
        );
      }

      const issued = issueOtpChallenge(session.user.id, cleaned, 'VERIFY_PHONE', 30_000);
      if (!issued.ok) {
        return NextResponse.json(
          { success: false, message: issued.message },
          { status: issued.status }
        );
      }

      logDevOtp('VERIFY_PHONE', cleaned, issued.code);
      const exposeCode = canExposeDevOtp([cleaned, session.user.email]);
      return NextResponse.json({
        success: true,
        message: exposeCode
          ? 'Tài khoản demo: mã OTP thử nghiệm hiển thị bên dưới (hiệu lực 5 phút).'
          : 'Hệ thống chưa tích hợp nhà mạng SMS. Mã OTP thử nghiệm được in ở cửa sổ terminal đang chạy máy chủ (hiệu lực 5 phút).',
        ...(exposeCode ? { developmentCode: issued.code } : {}),
      });
    }

    if (action !== 'VERIFY_CODE') {
      return NextResponse.json(
        { success: false, message: 'Hành động không hợp lệ.' },
        { status: 400 }
      );
    }

    const verified = verifyOtpChallenge(session.user.id, String(code || ''), 'VERIFY_PHONE', true);
    if (!verified.ok) {
      return NextResponse.json(
        { success: false, message: verified.message },
        { status: verified.status }
      );
    }

    if (verified.identifier !== cleaned) {
      return NextResponse.json(
        { success: false, message: 'Số điện thoại không khớp với mã OTP đã yêu cầu.' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { phone: cleaned, phoneVerified: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Xác minh số điện thoại thành công!',
    });
  } catch (err: unknown) {
    console.error('[verify-phone] Lỗi xử lý OTP:', err);
    return NextResponse.json(
      { success: false, message: 'Không thể xử lý yêu cầu OTP lúc này. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
