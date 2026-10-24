import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import { hashPassword, verifyPassword } from "./password";
import { scopedAuthOptions } from "./auth-scope";
import { isAccountBlocked, setAccountBlockedStatus } from "./account-status";
import {
  normalizeAuthIdentifier,
  normalizeVietnamPhone,
  verifyOtpChallenge,
} from "./otp-store";
import {
  DEMO_PORTAL_PASSWORDS,
  DEMO_TENANT,
  checkPortalPassword,
  isDemoLoginEnabled,
  isGoogleOAuthConfigured,
} from "./demo-mode";

// Lỗi nghiệp vụ khi đăng ký (trùng tài khoản) — không bị nuốt bởi fallback DB offline
class RegisterConflictError extends Error {}

// Cùng một thông báo cho "không có tài khoản" và "sai mật khẩu" để không dò được tài khoản
const INVALID_PORTAL_CREDENTIALS = "Email/Số điện thoại hoặc mật khẩu không chính xác.";

// Cột password_hash của bảng landlords được thêm sau; đọc qua kiểu này để code vẫn chạy
// khi Prisma Client chưa được generate lại.
type WithPasswordHash = { passwordHash?: string | null };

// ============================================================
// Type augmentation — mở rộng session với role, phone, ...
// ============================================================
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      phone: string;
      phoneVerified: boolean;
      isBlocked: boolean;
    } & DefaultSession["user"];
  }
  interface User {
    role?: string;
    phone?: string;
    phoneVerified?: boolean;
    isBlocked?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    phone: string;
    phoneVerified: boolean;
    isBlocked: boolean;
  }
}

// ============================================================
// Danh sách domain email bị chặn (lọc rác tầng 1)
// ============================================================
const BLOCKED_EMAIL_DOMAINS = [
  "tempmail.com",
  "guerrillamail.com",
  "mailinator.com",
  "throwaway.email",
  "yopmail.com",
  "sharklasers.com",
  "10minutemail.com",
  "trashmail.com",
  "fakeinbox.com",
  "mailnesia.com",
  "dispostable.com",
  "maildrop.cc",
  "temp-mail.org",
  "guerrillamailblock.com",
  "grr.la",
  "discard.email",
  "getnada.com",
];

// Validate SĐT Việt Nam
const isValidPhone = (p: string) => {
  const cleaned = p.replace(/\s|-/g, "");
  return /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-689]|9[0-46-9])\d{7}$/.test(cleaned);
};

// ============================================================
// NextAuth Configuration
// ============================================================
const sharedAuthOptions: NextAuthOptions = {
  providers: [
    // 1. Google OAuth (Chỉ kích hoạt nếu đã cấu hình Client ID & Secret thực tế)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code",
              },
            },
          }),
        ]
      : []),

    // 2. Credentials Provider Đa Năng:
    // - Khách thuê: Email/SĐT + mật khẩu, Email/SĐT + OTP, Đăng ký, nút "Google (demo)" khi chưa có Google thật
    // - Chủ trọ & Quản trị viên (Cổng vận hành)
    CredentialsProvider({
      id: "credentials",
      name: "Xác thực Elite Living",
      credentials: {
        loginType: { label: "Loại đăng nhập", type: "text" }, // "TENANT_PASSWORD" | "TENANT_OTP" | "TENANT_REGISTER" | "GOOGLE_DEMO" | "INTERNAL"
        phone: { label: "Số điện thoại", type: "text" },
        name: { label: "Họ tên", type: "text" },
        email: { label: "Email", type: "text" },
        password: { label: "Mật khẩu", type: "password" },
        otpCode: { label: "Mã OTP", type: "text" },
        role: { label: "Vai trò", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        const { loginType, phone, name, email, password, otpCode, role } = credentials;

        // Đăng nhập chỉ bằng số điện thoại (không mật khẩu, không OTP thật) đã bị gỡ:
        // ai biết số điện thoại cũng vào được tài khoản của người đó.
        if (loginType === "PHONE") {
          throw new Error("Hình thức đăng nhập này không còn hỗ trợ. Vui lòng đăng nhập bằng mật khẩu hoặc mã OTP.");
        }

        // ------------------------------------------------------------
        // A. ĐĂNG NHẬP BẰNG MÃ OTP (EMAIL HOẶC SỐ ĐIỆN THOẠI)
        // ------------------------------------------------------------
        if (loginType === "TENANT_OTP") {
          const rawIdentifier = (email || phone || "").trim();
          if (!rawIdentifier) {
            throw new Error("Vui lòng nhập Email hoặc Số điện thoại.");
          }

          const normalizedKey = normalizeAuthIdentifier(rawIdentifier);
          const verified = verifyOtpChallenge(normalizedKey, String(otpCode || ""), "LOGIN", true);
          if (!verified.ok) {
            throw new Error(verified.message);
          }

          let dbUser = null;
          try {
            if (rawIdentifier.includes("@")) {
              dbUser = await prisma.user.findFirst({
                where: { email: { equals: normalizedKey, mode: "insensitive" } },
              });
            } else {
              const cleanedPhone = normalizeVietnamPhone(rawIdentifier);
              dbUser = await prisma.user.findFirst({
                where: {
                  OR: [
                    { phone: cleanedPhone },
                    { email: `${cleanedPhone}@khachthue.nhatrotop.vn` },
                  ],
                },
              });
            }
          } catch {
            throw new Error("Hệ thống tạm thời không thể xác thực. Vui lòng thử lại sau ít phút.");
          }

          if (!dbUser) {
            throw new Error("Không tìm thấy tài khoản khớp với thông tin đã nhập.");
          }

          if (dbUser.isBlocked) {
            throw new Error("Tài khoản của bạn đã bị khóa do vi phạm chính sách.");
          }

          if (dbUser.role && dbUser.role !== "TENANT") {
            throw new Error("Tài khoản nội bộ phải đăng nhập tại Cổng vận hành.");
          }

          // Không tự đánh dấu SĐT "đã xác minh" ở đây: mã OTP được gửi qua email đăng ký,
          // nên nó không chứng minh người dùng sở hữu số điện thoại. SĐT chỉ được xác minh
          // qua luồng "Xác minh số điện thoại" trong hồ sơ.

          return {
            id: dbUser.id,
            name: dbUser.name || "Khách thuê",
            email: dbUser.email,
            phone: dbUser.phone || "",
            role: "TENANT",
            phoneVerified: dbUser.phoneVerified,
            isBlocked: false,
            image:
              dbUser.image ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(dbUser.name || "Tenant")}`,
          };
        }

        // ------------------------------------------------------------
        // B. NÚT "GOOGLE (DEMO)" — chỉ khi bật chế độ demo và chưa có Google thật.
        // Luôn vào MỘT tài khoản demo cố định; bỏ qua email/tên trình duyệt gửi lên,
        // để không ai dùng nút này vào tài khoản của người khác.
        // ------------------------------------------------------------
        if (loginType === "GOOGLE_DEMO") {
          if (!isDemoLoginEnabled() || isGoogleOAuthConfigured()) {
            throw new Error("Đăng nhập Google demo đã tắt. Vui lòng dùng Đăng nhập với Google hoặc Email và mật khẩu.");
          }

          let dbUser = null;
          try {
            dbUser = await prisma.user.findFirst({
              where: { email: { equals: DEMO_TENANT.email, mode: "insensitive" } },
            });
            if (!dbUser) {
              dbUser = await prisma.user.create({
                data: {
                  name: DEMO_TENANT.name,
                  email: DEMO_TENANT.email,
                  phone: DEMO_TENANT.phone,
                  role: "TENANT",
                  phoneVerified: true,
                  image: DEMO_TENANT.image,
                  googleId: DEMO_TENANT.googleId,
                },
              });
            }
          } catch {
            throw new Error("Hệ thống tạm thời không thể đăng nhập. Vui lòng thử lại sau ít phút.");
          }

          if (dbUser.role !== "TENANT") {
            throw new Error("Tài khoản demo không hợp lệ.");
          }
          if (dbUser.isBlocked) {
            throw new Error("Tài khoản của bạn đã bị khóa do vi phạm chính sách.");
          }

          return {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            phone: dbUser.phone,
            role: "TENANT",
            phoneVerified: dbUser.phoneVerified,
            isBlocked: false,
            image: dbUser.image || DEMO_TENANT.image,
          };
        }

        // ------------------------------------------------------------
        // C. ĐĂNG NHẬP EMAIL / SỐ ĐIỆN THOẠI + MẬT KHẨU (KHÁCH THUÊ)
        // ------------------------------------------------------------
        if (loginType === "TENANT_PASSWORD") {
          const identifier = (email || phone || "").trim();
          if (!identifier) {
            throw new Error("Vui lòng nhập Email hoặc Số điện thoại.");
          }
          if (!password || password.trim().length < 6) {
            throw new Error("Vui lòng nhập mật khẩu tối thiểu 6 ký tự.");
          }

          const isEmail = identifier.includes("@");
          // Thông báo chung cho cả "không tồn tại" và "sai mật khẩu" để tránh dò tài khoản
          const INVALID_CREDENTIALS = "Email/Số điện thoại hoặc mật khẩu không chính xác.";
          let dbUser = null;

          try {
            if (isEmail) {
              dbUser = await prisma.user.findFirst({
                where: { email: { equals: identifier.toLowerCase(), mode: "insensitive" } },
              });
            } else {
              const cleanedPhone = normalizeVietnamPhone(identifier);
              dbUser = await prisma.user.findFirst({
                where: {
                  OR: [
                    { phone: cleanedPhone },
                    { email: `${cleanedPhone}@khachthue.nhatrotop.vn` },
                  ],
                },
              });
            }
          } catch {
            // Không thể xác minh mật khẩu khi database offline -> không cho đăng nhập
            throw new Error("Hệ thống tạm thời không thể xác thực. Vui lòng thử lại sau ít phút.");
          }

          // Không tự tạo tài khoản khi đăng nhập bằng mật khẩu — khách mới phải Đăng ký
          if (!dbUser) {
            throw new Error(INVALID_CREDENTIALS);
          }

          // Tài khoản cũ chưa có passwordHash: hướng dẫn người dùng đăng nhập bằng OTP hoặc Đặt lại mật khẩu
          if (!dbUser.passwordHash) {
            throw new Error(
              "Tài khoản này chưa thiết lập mật khẩu. Vui lòng chuyển sang 'Đăng nhập bằng OTP' hoặc bấm 'Quên mật khẩu?' để đặt mật khẩu mới."
            );
          }

          if (!(await verifyPassword(password, dbUser.passwordHash))) {
            throw new Error(INVALID_CREDENTIALS);
          }

          if (dbUser.isBlocked) {
            throw new Error("Tài khoản của bạn đã bị khóa do vi phạm chính sách.");
          }

          if (dbUser.role && dbUser.role !== "TENANT") {
            throw new Error("Tài khoản nội bộ phải đăng nhập tại Cổng vận hành.");
          }

          return {
            id: dbUser.id,
            name: dbUser.name || "Khách thuê",
            email: dbUser.email,
            phone: dbUser.phone || "",
            role: "TENANT",
            phoneVerified: dbUser.phoneVerified,
            isBlocked: false,
            image: dbUser.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(dbUser.name || "Tenant")}`,
          };
        }

        // ------------------------------------------------------------
        // D. ĐĂNG KÝ TÀI KHOẢN MỚI (DÀNH CHO KHÁCH THUÊ)
        // ------------------------------------------------------------
        if (loginType === "TENANT_REGISTER") {
          const trimmedName = (name || "").trim();
          const trimmedEmail = (email || "").trim().toLowerCase();
          const rawPhone = (phone || "").trim();
          const cleanedPhone = rawPhone ? normalizeVietnamPhone(rawPhone) : "";

          if (!trimmedName) {
            throw new Error("Vui lòng nhập Họ và tên.");
          }
          if (!trimmedEmail || !trimmedEmail.includes("@")) {
            throw new Error("Vui lòng nhập địa chỉ Email hợp lệ.");
          }

          // Lọc rác email tầng 1: kiểm tra blacklist domain email tạm thời
          const emailParts = trimmedEmail.split("@");
          const domain = emailParts[1];
          if (BLOCKED_EMAIL_DOMAINS.includes(domain)) {
            throw new Error("Tên miền email này nằm trong danh sách email tạm thời / spam. Vui lòng sử dụng Gmail, Outlook hoặc email chính thức.");
          }

          if (cleanedPhone && !isValidPhone(cleanedPhone)) {
            throw new Error("Số điện thoại không hợp lệ. Vui lòng nhập SĐT Việt Nam (VD: 0901234567).");
          }

          if (!password || password.length < 6) {
            throw new Error("Mật khẩu phải có tối thiểu 6 ký tự.");
          }

          const passwordHash = await hashPassword(password);

          let dbUser = null;
          try {
            const existing = await prisma.user.findFirst({
              where: {
                OR: [
                  { email: { equals: trimmedEmail, mode: "insensitive" } },
                  ...(cleanedPhone ? [{ phone: cleanedPhone }] : []),
                ],
              },
            });

            // Email / SĐT đã có tài khoản (kể cả tài khoản cũ chưa có mật khẩu) → không cho đăng ký
            // chồng lên, nếu không ai biết email cũng chiếm được tài khoản bằng cách "đăng ký lại".
            if (existing) {
              throw new RegisterConflictError(
                existing.role !== "TENANT"
                  ? "Email này thuộc tài khoản nội bộ, không thể đăng ký làm khách thuê."
                  : "Email hoặc Số điện thoại này đã có tài khoản. Vui lòng đăng nhập."
              );
            }

            dbUser = await prisma.user.create({
              data: {
                name: trimmedName,
                email: trimmedEmail,
                phone: cleanedPhone,
                role: "TENANT",
                // SĐT chỉ được coi là đã xác minh sau khi nhập đúng mã OTP (Hồ sơ → Xác minh SĐT)
                phoneVerified: false,
                passwordHash,
              },
            });
          } catch (error) {
            if (error instanceof RegisterConflictError) throw error;
            // Không tạo phiên cho tài khoản không có trong cơ sở dữ liệu
            throw new Error("Hệ thống tạm thời không thể tạo tài khoản. Vui lòng thử lại sau ít phút.");
          }

          if (dbUser.isBlocked) {
            throw new Error("Tài khoản này đã bị khóa do vi phạm chính sách.");
          }

          return {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            phone: dbUser.phone || "",
            role: "TENANT",
            phoneVerified: dbUser.phoneVerified,
            isBlocked: false,
            image: dbUser.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(dbUser.name)}`,
          };
        }

        // ------------------------------------------------------------
        // E. ĐĂNG NHẬP CHỦ TRỌ & ADMIN (NỘI BỘ)
        // ------------------------------------------------------------
        if (role === "ADMIN") {
          const demoEnabled = isDemoLoginEnabled();
          const identifier = (email || "").trim();

          let admin = null;
          try {
            if (identifier) {
              admin = await prisma.user.findFirst({
                where: { role: "ADMIN", email: { equals: identifier, mode: "insensitive" } },
              });
            }
            // Chế độ demo: dùng tài khoản admin có sẵn, hoặc tạo tài khoản mặc định nếu chưa có
            if (!admin && demoEnabled) {
              admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
            }
            if (!admin && demoEnabled) {
              admin = await prisma.user.create({
                data: {
                  name: "Ban Quản Trị Hệ Thống",
                  email: identifier || "admin@eliteliving.vn",
                  phone: "0903999888",
                  role: "ADMIN",
                  phoneVerified: true,
                },
              });
            }
          } catch {
            throw new Error("Hệ thống tạm thời không thể xác thực. Vui lòng thử lại sau ít phút.");
          }

          if (!admin) {
            throw new Error(INVALID_PORTAL_CREDENTIALS);
          }

          // Thứ tự: mật khẩu riêng của tài khoản → ADMIN_PORTAL_PASSWORD trong .env → mật khẩu demo
          const configuredAdminPassword = process.env.ADMIN_PORTAL_PASSWORD;
          const adminPasswordMatches = admin.passwordHash
            ? await verifyPassword(password || "", admin.passwordHash)
            : configuredAdminPassword
            ? password === configuredAdminPassword
            : await checkPortalPassword({
                password,
                storedHash: null,
                demoPassword: DEMO_PORTAL_PASSWORDS.ADMIN,
                demoEnabled,
              });
          if (!adminPasswordMatches) {
            throw new Error(INVALID_PORTAL_CREDENTIALS);
          }
          if (admin.isBlocked) {
            throw new Error("Tài khoản này đã bị khóa.");
          }
          setAccountBlockedStatus(admin.id, false);

          return {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: "ADMIN",
            phone: admin.phone,
            phoneVerified: true,
            isBlocked: false,
          };
        }

        if (role === "LANDLORD") {
          const identifier = (email || "").trim();
          if (!identifier) {
            throw new Error("Vui lòng nhập Email hoặc Số điện thoại chủ trọ.");
          }

          let landlord = null;
          try {
            landlord = await prisma.landlord.findFirst({
              where: {
                OR: [
                  { email: { equals: identifier, mode: "insensitive" } },
                  { phone: identifier.replace(/\s|-/g, "") },
                ],
              },
            });
          } catch {
            throw new Error("Hệ thống tạm thời không thể xác thực. Vui lòng thử lại sau ít phút.");
          }

          // Mỗi chủ trọ một mật khẩu riêng (cột password_hash). Tài khoản chưa được cấp mật khẩu
          // chỉ vào được bằng mật khẩu demo khi đang bật chế độ demo.
          const passwordMatches = landlord
            ? await checkPortalPassword({
                password,
                storedHash: (landlord as WithPasswordHash).passwordHash,
                demoPassword: DEMO_PORTAL_PASSWORDS.LANDLORD,
                demoEnabled: isDemoLoginEnabled(),
              })
            : false;
          if (!landlord || !passwordMatches) {
            throw new Error(INVALID_PORTAL_CREDENTIALS);
          }

          // Admin khóa chủ trọ bằng cột is_blocked của dòng users cùng id với chủ trọ
          let landlordBlocked = false;
          try {
            const linkedUser = await prisma.user.findUnique({
              where: { id: landlord.id },
              select: { isBlocked: true },
            });
            landlordBlocked = Boolean(linkedUser?.isBlocked);
          } catch {
            throw new Error("Hệ thống tạm thời không thể xác thực. Vui lòng thử lại sau ít phút.");
          }
          if (landlordBlocked) {
            setAccountBlockedStatus(landlord.id, true);
            throw new Error("Tài khoản chủ trọ này đã bị khóa. Vui lòng liên hệ quản trị viên.");
          }
          setAccountBlockedStatus(landlord.id, false);

          return {
            id: landlord.id,
            name: landlord.name,
            email: landlord.email,
            role: "LANDLORD",
            phone: landlord.phone,
            phoneVerified: true,
            isBlocked: false,
            image: landlord.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
          };
        }

        return null;
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // Google thật: chỉ cho khách thuê, gắn vào tài khoản trong cơ sở dữ liệu theo email
      if (account?.provider === "google") {
        const googleEmail = user.email?.trim().toLowerCase();
        if (!googleEmail) return false;
        if ((profile as { email_verified?: boolean } | undefined)?.email_verified === false) return false;

        // Lọc rác tầng 1: Chặn domain email spam khi đăng nhập
        const emailDomain = googleEmail.split("@")[1];
        if (emailDomain && BLOCKED_EMAIL_DOMAINS.includes(emailDomain)) {
          return false;
        }

        try {
          let dbUser = await prisma.user.findFirst({
            where: { email: { equals: googleEmail, mode: "insensitive" } },
          });
          if (dbUser && (dbUser.role !== "TENANT" || dbUser.isBlocked)) return false;
          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                name: user.name?.trim() || googleEmail.split("@")[0],
                email: googleEmail,
                role: "TENANT",
                googleId: account.providerAccountId,
                image: user.image ?? null,
                emailVerified: new Date(),
              },
            });
          } else if (!dbUser.googleId) {
            dbUser = await prisma.user.update({
              where: { id: dbUser.id },
              data: { googleId: account.providerAccountId },
            });
          }
          Object.assign(user, {
            id: dbUser.id,
            role: "TENANT",
            phone: dbUser.phone,
            phoneVerified: dbUser.phoneVerified,
            isBlocked: false,
          });
        } catch {
          return false;
        }
      }

      if (user.isBlocked) return false;
      return true;
    },

    // JWT callback — gắn thêm role, phone, avatar vào token
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role || "TENANT";
        token.phone = user.phone || "";
        token.phoneVerified = user.phoneVerified || false;
        token.isBlocked = user.isBlocked || false;
        if (user.image && !user.image.startsWith("data:")) {
          token.picture = user.image;
        }
      }

      // Google thật: token phải mang id của tài khoản trong cơ sở dữ liệu, không phải id Google
      if (account?.provider === "google" && token.email) {
        try {
          const dbUser = await prisma.user.findFirst({
            where: { email: { equals: token.email, mode: "insensitive" } },
            select: { id: true, phone: true, phoneVerified: true, isBlocked: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = "TENANT";
            token.phone = dbUser.phone;
            token.phoneVerified = dbUser.phoneVerified;
            token.isBlocked = dbUser.isBlocked;
          }
        } catch {}
      }

      // Khi trang gọi update() (sau khi xác minh SĐT, đổi tên): đọc lại từ cơ sở dữ liệu,
      // không tin dữ liệu trình duyệt gửi lên (nếu không, ai cũng tự đánh dấu "đã xác minh" được).
      if (trigger === "update" && token.role === "TENANT" && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: { name: true, phone: true, phoneVerified: true, isBlocked: true, image: true },
          });
          if (dbUser) {
            token.name = dbUser.name;
            token.phone = dbUser.phone;
            token.phoneVerified = dbUser.phoneVerified;
            token.isBlocked = dbUser.isBlocked;
            if (dbUser.image && !dbUser.image.startsWith("data:")) {
              token.picture = dbUser.image;
            }
          }
        } catch {}
      }

      // Phiên đang mở của tài khoản vừa bị admin khóa: đánh dấu để session callback trả phiên rỗng.
      // Tính lại ở mỗi lần đọc phiên (không lưu cố định), nên mở khóa là dùng lại được ngay.
      if (user) {
        setAccountBlockedStatus(token.id, Boolean(user.isBlocked));
      } else if (token.id) {
        token.isBlocked = await isAccountBlocked(token.id);
      }

      return token;
    },

    // Session callback — truyền data từ JWT vào session
    async session({ session, token }) {
      // Tài khoản đã bị khóa: trả phiên rỗng → máy chủ và giao diện coi như chưa đăng nhập
      if (token?.isBlocked) {
        return {} as typeof session;
      }
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.phone = token.phone;
        session.user.phoneVerified = token.phoneVerified;
        session.user.isBlocked = token.isBlocked;
        if (token.picture) session.user.image = token.picture;
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 ngày
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  secret:
    process.env.NEXTAUTH_SECRET ||
    (process.env.NODE_ENV !== "production"
      ? "nhatrotop_local_development_only_secret"
      : undefined),
};

export const authOptions = scopedAuthOptions(sharedAuthOptions, 'tenant');
export const portalAuthOptions = scopedAuthOptions(sharedAuthOptions, 'portal');

export default NextAuth(authOptions);
