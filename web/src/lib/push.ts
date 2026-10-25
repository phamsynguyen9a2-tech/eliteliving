/**
 * Thông báo đẩy tới app người thuê qua Firebase Cloud Messaging (FCM HTTP v1).
 *
 * Cấu hình bằng biến môi trường (lấy từ tài khoản dịch vụ Firebase: Project settings → Service accounts
 * → Generate new private key):
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * Chưa cấu hình thì không gửi (thông báo vẫn nằm trong hộp thư web/app), không báo lỗi.
 */
import { createSign } from 'node:crypto';
import prisma from './prisma';

interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export function getFirebaseConfig(env: NodeJS.ProcessEnv = process.env): FirebaseConfig | null {
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

export function isPushConfigured() {
  return getFirebaseConfig() !== null;
}

const base64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** JWT ký RS256 để đổi lấy access token OAuth2 của Google (không cần thư viện firebase-admin). */
export function buildServiceAccountJwt(config: FirebaseConfig, nowSeconds = Math.floor(Date.now() / 1000)) {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: config.clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    })
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${base64url(signer.sign(config.privateKey))}`;
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(config: FirebaseConfig): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: buildServiceAccountJwt(config),
    }),
  });
  if (!res.ok) throw new Error(`FCM OAuth ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/** Gửi thông báo đẩy tới mọi thiết bị đã đăng ký của người dùng. Không ném lỗi. */
export async function sendPushToUser(userId: string | null | undefined, payload: PushPayload): Promise<{ sent: number; skipped?: string }> {
  const config = getFirebaseConfig();
  if (!config) return { sent: 0, skipped: 'FCM chưa cấu hình' };
  if (!userId) return { sent: 0, skipped: 'Không xác định người nhận' };
  try {
    const devices = await prisma.deviceToken.findMany({ where: { userId }, select: { token: true } });
    if (devices.length === 0) return { sent: 0, skipped: 'Người nhận chưa đăng ký thiết bị' };
    const accessToken = await getAccessToken(config);
    let sent = 0;
    await Promise.all(
      devices.map(async ({ token }) => {
        const res = await fetch(`https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: payload.title.slice(0, 120), body: payload.body.slice(0, 400) },
              data: payload.data ?? {},
              android: { priority: 'high' },
            },
          }),
        });
        if (res.ok) {
          sent += 1;
          return;
        }
        const text = await res.text();
        // Mã thiết bị hết hạn / gỡ app: xóa để lần sau không gửi lại
        if (res.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(text)) {
          await prisma.deviceToken.deleteMany({ where: { token } });
        } else {
          console.warn('[push] FCM lỗi', res.status, text.slice(0, 200));
        }
      })
    );
    return { sent };
  } catch (err) {
    console.warn('[push] Không gửi được thông báo đẩy:', err);
    return { sent: 0, skipped: 'Lỗi gửi FCM' };
  }
}

export async function registerDeviceToken(userId: string, token: string, platform: string) {
  const clean = token.trim();
  if (clean.length < 20 || clean.length > 4096) throw new Error('INVALID_TOKEN: Mã thiết bị không hợp lệ.');
  await prisma.deviceToken.upsert({
    where: { token: clean },
    create: { token: clean, userId, platform: platform.slice(0, 20) || 'android' },
    // Thiết bị đổi người đăng nhập thì chuyển mã sang người dùng mới
    update: { userId, platform: platform.slice(0, 20) || 'android' },
  });
}

export async function unregisterDeviceToken(userId: string, token: string) {
  await prisma.deviceToken.deleteMany({ where: { token: token.trim(), userId } });
}
