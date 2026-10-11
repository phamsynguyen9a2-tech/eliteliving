import prisma from "./prisma";

// ============================================================
// Spam Filter — Hệ thống lọc rác đa tầng
// ============================================================

/**
 * Giới hạn hành động mỗi ngày cho từng loại
 */
const DAILY_LIMITS: Record<string, number> = {
  BOOK_VIEWING: 10,   // Tối đa 10 lịch hẹn/ngày
  BOOKMARK: 50,       // Tối đa 50 bookmark/ngày
  ROOMMATE_REQUEST: 5, // Tối đa 5 yêu cầu ở ghép/ngày
  ROOMMATE_POST: 3,    // Tối đa 3 bài đăng ở ghép/ngày
  REPORT: 10,          // Tối đa 10 báo cáo/ngày
};

/**
 * Điểm spam cho từng hành vi vi phạm
 */
const SPAM_SCORE_MAP: Record<string, number> = {
  CANCEL_APPOINTMENT: 3,      // Hủy lịch hẹn → +3
  FREQUENT_CANCEL: 5,         // Hủy lịch liên tục (>=3 lần/tuần) → +5
  REPORTED_BY_LANDLORD: 5,    // Bị chủ trọ report → +5
  REPORTED_BY_ADMIN: 10,      // Bị admin report → +10
  SPAM_CONTENT: 7,            // Nội dung spam/quảng cáo → +7
  FAKE_BOOKING: 10,           // Đặt lịch giả → +10
};

/** Ngưỡng block tự động */
const AUTO_BLOCK_THRESHOLD = 20;

/**
 * Kiểm tra rate limit trước khi thực hiện hành động
 * @returns true nếu cho phép, false nếu bị chặn
 */
export async function checkRateLimit(
  userId: string,
  actionType: string
): Promise<{ allowed: boolean; message?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isBlocked: true,
      phoneVerified: true,
      spamScore: true,
      dailyActionCount: true,
      lastActionAt: true,
    },
  });

  if (!user) return { allowed: false, message: "Người dùng không tồn tại." };

  // Tầng 1: Kiểm tra block
  if (user.isBlocked) {
    return { allowed: false, message: "Tài khoản của bạn đã bị khóa do vi phạm chính sách. Vui lòng liên hệ quản trị viên." };
  }

  // Tầng 2: Kiểm tra xác minh SĐT
  if (!user.phoneVerified) {
    return { allowed: false, message: "Vui lòng xác minh số điện thoại trước khi thực hiện hành động này." };
  }

  // Tầng 3: Kiểm tra spam score
  if (user.spamScore >= AUTO_BLOCK_THRESHOLD) {
    // Tự động block
    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true },
    });
    return { allowed: false, message: "Tài khoản đã bị khóa tự động do vi phạm quá nhiều lần." };
  }

  // Tầng 4: Kiểm tra rate limit (reset hàng ngày)
  const limit = DAILY_LIMITS[actionType];
  if (limit) {
    const now = new Date();
    const lastAction = user.lastActionAt;
    let dailyCount = user.dailyActionCount;

    // Reset nếu đã qua ngày mới
    if (lastAction) {
      const lastDate = new Date(lastAction);
      if (lastDate.toDateString() !== now.toDateString()) {
        dailyCount = 0;
      }
    }

    if (dailyCount >= limit) {
      return {
        allowed: false,
        message: `Bạn đã vượt quá giới hạn ${limit} lần/${actionType} mỗi ngày. Vui lòng thử lại vào ngày mai.`,
      };
    }

    // Cập nhật counter
    await prisma.user.update({
      where: { id: userId },
      data: {
        dailyActionCount: dailyCount + 1,
        lastActionAt: now,
      },
    });
  }

  return { allowed: true };
}

/**
 * Tăng spam score cho user
 */
export async function increaseSpamScore(
  userId: string,
  reason: keyof typeof SPAM_SCORE_MAP
): Promise<{ newScore: number; blocked: boolean }> {
  const points = SPAM_SCORE_MAP[reason] || 1;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      spamScore: { increment: points },
    },
    select: { spamScore: true },
  });

  const blocked = user.spamScore >= AUTO_BLOCK_THRESHOLD;
  if (blocked) {
    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true },
    });
  }

  return { newScore: user.spamScore, blocked };
}

/**
 * Reset spam score (Admin action)
 */
export async function resetSpamScore(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      spamScore: 0,
      isBlocked: false,
      dailyActionCount: 0,
    },
  });
}

/**
 * Kiểm tra email có phải domain rác không
 */
const BLOCKED_DOMAINS = [
  "tempmail.com", "guerrillamail.com", "mailinator.com",
  "throwaway.email", "yopmail.com", "sharklasers.com",
  "10minutemail.com", "trashmail.com", "fakeinbox.com",
  "mailnesia.com", "dispostable.com", "maildrop.cc",
  "temp-mail.org", "guerrillamailblock.com", "grr.la",
  "discard.email", "getnada.com",
];

export function isSpamEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? BLOCKED_DOMAINS.includes(domain) : true;
}
