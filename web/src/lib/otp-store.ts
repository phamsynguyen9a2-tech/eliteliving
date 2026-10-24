import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

export type OtpPurpose = 'VERIFY_PHONE' | 'LOGIN' | 'RESET_PASSWORD';

export type OtpChallengeRecord = {
  identifier: string;
  purpose: OtpPurpose;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  requestedAt: number;
};

const otpGlobal = globalThis as unknown as {
  eliteUnifiedOtpChallenges?: Map<string, OtpChallengeRecord>;
  eliteOtpIssueLog?: Map<string, number[]>;
};

const otpChallenges =
  otpGlobal.eliteUnifiedOtpChallenges || new Map<string, OtpChallengeRecord>();
otpGlobal.eliteUnifiedOtpChallenges = otpChallenges;

/** Thời điểm các lần cấp mã gần đây cho từng định danh, để giới hạn số mã mỗi giờ. */
const otpIssueLog = otpGlobal.eliteOtpIssueLog || new Map<string, number[]>();
otpGlobal.eliteOtpIssueLog = otpIssueLog;

export const OTP_MAX_ISSUES_PER_HOUR = 5;
const ONE_HOUR_MS = 60 * 60_000;

/** Dọn các mã đã hết hạn để bộ nhớ không phình ra theo thời gian. */
function pruneExpiredChallenges(now: number) {
  otpChallenges.forEach((challenge, key) => {
    if (challenge.expiresAt < now) otpChallenges.delete(key);
  });
  otpIssueLog.forEach((times, key) => {
    const recent = times.filter((t) => now - t < ONE_HOUR_MS);
    if (recent.length === 0) otpIssueLog.delete(key);
    else otpIssueLog.set(key, recent);
  });
}

export const hashOtpCode = (code: string) =>
  createHash('sha256').update(code.trim()).digest('hex');

export const normalizeVietnamPhone = (phone: string) => {
  const cleaned = phone.replace(/\s|-/g, '').trim();
  return cleaned.startsWith('+84') ? `0${cleaned.slice(3)}` : cleaned;
};

export const isValidVietnamPhone = (phone: string) => {
  const cleaned = normalizeVietnamPhone(phone);
  return /^0(3[2-9]|5[2689]|7[06-9]|8[1-689]|9[0-46-9])\d{7}$/.test(cleaned);
};

export const normalizeAuthIdentifier = (raw: string) => {
  const trimmed = raw.trim();
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }
  return normalizeVietnamPhone(trimmed);
};

const makeChallengeKey = (key: string, purpose: OtpPurpose) =>
  `${purpose}:${normalizeAuthIdentifier(key)}`;

export function issueOtpChallenge(
  key: string,
  identifier: string,
  purpose: OtpPurpose,
  cooldownMs = 30_000
): { ok: true; code: string; expiresAt: number } | { ok: false; status: number; message: string } {
  const storageKey = makeChallengeKey(key, purpose);
  const now = Date.now();
  pruneExpiredChallenges(now);
  const existing = otpChallenges.get(storageKey);

  if (existing && now - existing.requestedAt < cooldownMs) {
    const remainSec = Math.ceil((cooldownMs - (now - existing.requestedAt)) / 1000);
    return {
      ok: false,
      status: 429,
      message: `Vui lòng chờ ${remainSec} giây trước khi yêu cầu mã OTP mới.`,
    };
  }

  // Mỗi mã cho nhập sai tối đa 5 lần; giới hạn thêm số mã mỗi giờ để không thể dò mã
  // bằng cách xin mã mới liên tục.
  const recentIssues = (otpIssueLog.get(storageKey) || []).filter((t) => now - t < ONE_HOUR_MS);
  if (recentIssues.length >= OTP_MAX_ISSUES_PER_HOUR) {
    const retryMin = Math.ceil((ONE_HOUR_MS - (now - recentIssues[0])) / 60_000);
    return {
      ok: false,
      status: 429,
      message: `Bạn đã yêu cầu quá nhiều mã OTP. Vui lòng thử lại sau khoảng ${retryMin} phút.`,
    };
  }
  recentIssues.push(now);
  otpIssueLog.set(storageKey, recentIssues);

  const code = String(randomInt(100000, 1_000_000));
  const expiresAt = now + 5 * 60_000;

  otpChallenges.set(storageKey, {
    identifier: normalizeAuthIdentifier(identifier),
    purpose,
    codeHash: hashOtpCode(code),
    expiresAt,
    attempts: 0,
    requestedAt: now,
  });

  return { ok: true, code, expiresAt };
}

export function verifyOtpChallenge(
  key: string,
  code: string,
  purpose: OtpPurpose,
  consume = true
): { ok: true; identifier: string } | { ok: false; status: number; message: string } {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
    return {
      ok: false,
      status: 400,
      message: 'Mã OTP phải gồm đúng 6 chữ số.',
    };
  }

  const storageKey = makeChallengeKey(key, purpose);
  const challenge = otpChallenges.get(storageKey);

  if (!challenge || challenge.expiresAt < Date.now()) {
    otpChallenges.delete(storageKey);
    return {
      ok: false,
      status: 410,
      message: 'Mã OTP đã hết hạn hoặc chưa được yêu cầu. Vui lòng nhận mã OTP mới.',
    };
  }

  if (challenge.attempts >= 5) {
    otpChallenges.delete(storageKey);
    return {
      ok: false,
      status: 429,
      message: 'Bạn đã nhập sai quá 5 lần. Vui lòng yêu cầu mã OTP mới.',
    };
  }

  const suppliedHash = Buffer.from(hashOtpCode(code));
  const expectedHash = Buffer.from(challenge.codeHash);
  if (!timingSafeEqual(suppliedHash, expectedHash)) {
    challenge.attempts += 1;
    otpChallenges.set(storageKey, challenge);
    return {
      ok: false,
      status: 400,
      message: 'Mã OTP không chính xác. Vui lòng kiểm tra lại.',
    };
  }

  if (consume) {
    otpChallenges.delete(storageKey);
  }

  return { ok: true, identifier: challenge.identifier };
}
