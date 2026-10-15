import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// ============================================================
// Băm & xác minh mật khẩu khách thuê bằng scrypt (node:crypto, không cần thêm thư viện)
// Định dạng lưu trong users.password_hash: "scrypt$<salt hex>$<hash hex>"
// ============================================================
const KEY_LENGTH = 64;
const PREFIX = "scrypt";

const deriveKey = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (err, key) => (err ? reject(err) : resolve(key)));
  });

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `${PREFIX}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [prefix, saltHex, keyHex] = stored.split("$");
  if (prefix !== PREFIX || !saltHex || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");
  const actual = await deriveKey(password, Buffer.from(saltHex, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
