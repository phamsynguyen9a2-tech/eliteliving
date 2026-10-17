import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/request-session';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

import prisma from '@/lib/prisma';

type PhoneOtpChallenge = {
  phone: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  requestedAt: number;
};

const otpGlobal = globalThis as unknown as {
  elitePhoneOtpChallenges?: Map<string, PhoneOtpChallenge>;
};
const phoneOtpChallenges =
  otpGlobal.elitePhoneOtpChallenges || new Map<string, PhoneOtpChallenge>();
otpGlobal.elitePhoneOtpChallenges = phoneOtpChallenges;

const hashOtp = (code: string) => createHash('sha256').update(code).digest('hex');

const normalizePhone = (phone: string) => {
  const cleaned = phone.replace(/\s|-/g, '');
  return cleaned.startsWith('+84') ? `0${cleaned.slice(3)}` : cleaned;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getRequestSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập trước.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { phone, code, action = 'REQUEST_CODE' } = body;

    if (typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập số điện thoại.' },
        { status: 400 }
      );
    }

    // Validate SĐT Việt Nam
    const cleaned = normalizePhone(phone);
    const isValid = /^0(3[2-9]|5[2689]|7[06-9]|8[1-689]|9[0-46-9])\d{7}$/.test(cleaned);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Số điện thoại không hợp lệ.' },
        { status: 400 }
      );
    }

    if (action === 'REQUEST_CODE') {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          {
            success: false,
            message: 'Dịch vụ gửi OTP chưa được cấu hình. Vui lòng liên hệ hỗ trợ.',
          },
          { status: 503 }
        );
      }

      const previous = phoneOtpChallenges.get(session.user.id);
      const now = Date.now();
      if (previous && now - previous.requestedAt < 60_000) {
        return NextResponse.json(
          { success: false, message: 'Vui lòng chờ 60 giây trước khi yêu cầu mã mới.' },
          { status: 429 }
        );
      }

      const developmentCode = String(randomInt(100000, 1_000_000));
      phoneOtpChallenges.set(session.user.id, {
        phone: cleaned,
        codeHash: hashOtp(developmentCode),
        expiresAt: now + 5 * 60_000,
        attempts: 0,
        requestedAt: now,
      });

      return NextResponse.json({
        success: true,
        message: 'Mã OTP thử nghiệm có hiệu lực trong 5 phút.',
        developmentCode,
      });
    }

    if (action !== 'VERIFY_CODE' || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, message: 'Mã OTP phải gồm đúng 6 chữ số.' },
        { status: 400 }
      );
    }

    const challenge = phoneOtpChallenges.get(session.user.id);
    if (!challenge || challenge.phone !== cleaned || challenge.expiresAt < Date.now()) {
      phoneOtpChallenges.delete(session.user.id);
      return NextResponse.json(
        { success: false, message: 'Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.' },
        { status: 410 }
      );
    }
    if (challenge.attempts >= 5) {
      phoneOtpChallenges.delete(session.user.id);
      return NextResponse.json(
        { success: false, message: 'Bạn đã nhập sai quá số lần cho phép. Vui lòng yêu cầu mã mới.' },
        { status: 429 }
      );
    }

    const suppliedHash = Buffer.from(hashOtp(code));
    const expectedHash = Buffer.from(challenge.codeHash);
    if (!timingSafeEqual(suppliedHash, expectedHash)) {
      challenge.attempts += 1;
      phoneOtpChallenges.set(session.user.id, challenge);
      return NextResponse.json(
        { success: false, message: 'Mã OTP không chính xác.' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { phone: cleaned, phoneVerified: true },
    });
    phoneOtpChallenges.delete(session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Xác minh số điện thoại thành công!',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi server.';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
