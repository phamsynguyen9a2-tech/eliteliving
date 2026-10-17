import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import { hashPassword, verifyPassword } from "./password";
import { scopedAuthOptions } from "./auth-scope";

// Lỗi nghiệp vụ khi đăng ký (trùng tài khoản) — không bị nuốt bởi fallback DB offline
class RegisterConflictError extends Error {}

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
    // - Đăng nhập bằng SĐT cho Người thuê (Phone Login)
    // - Đăng nhập Google Demo (khi chưa cấu hình Google Cloud Console)
    // - Đăng nhập Chủ trọ & Quản trị viên
    CredentialsProvider({
      id: "credentials",
      name: "Xác thực NhaTroTop",
      credentials: {
        loginType: { label: "Loại đăng nhập", type: "text" }, // "PHONE" | "GOOGLE_DEMO" | "INTERNAL"
        phone: { label: "Số điện thoại", type: "text" },
        otp: { label: "Mã OTP", type: "text" },
        name: { label: "Họ tên", type: "text" },
        email: { label: "Email", type: "text" },
        password: { label: "Mật khẩu", type: "password" },
        role: { label: "Vai trò", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        const { loginType, phone, otp, name, email, password, role } = credentials;

        // ------------------------------------------------------------
        // A. ĐĂNG NHẬP BẰNG SỐ ĐIỆN THOẠI (DÀNH CHO KHÁCH THUÊ)
        // ------------------------------------------------------------
        if (loginType === "PHONE" || (phone && !password)) {
          const cleanedPhone = (phone || "").replace(/\s|-/g, "");
          if (!isValidPhone(cleanedPhone)) {
            throw new Error("Số điện thoại không hợp lệ. Vui lòng nhập SĐT Việt Nam.");
          }

          // Kiểm tra OTP (Demo chấp nhận bất kỳ mã 6 số hoặc "123456")
          if (otp && otp.length !== 6 && otp !== "123456") {
            throw new Error("Mã OTP phải gồm 6 chữ số.");
          }

          const defaultName = name && name.trim() ? name.trim() : `Khách thuê ${cleanedPhone.slice(-4)}`;
          const defaultEmail = `${cleanedPhone}@khachthue.nhatrotop.vn`;

          let dbUser = null;
          try {
            // Tìm trong DB nếu có
            dbUser = await prisma.user.findFirst({
              where: {
                OR: [{ phone: cleanedPhone }, { email: defaultEmail }],
              },
            });

            if (!dbUser) {
              // Tạo user mới
              dbUser = await prisma.user.create({
                data: {
                  name: defaultName,
                  phone: cleanedPhone,
                  email: defaultEmail,
                  role: "TENANT",
                  phoneVerified: true,
                },
              });
            } else if (!dbUser.phoneVerified) {
              dbUser = await prisma.user.update({
                where: { id: dbUser.id },
                data: { phoneVerified: true, phone: cleanedPhone },
              });
            }
          } catch {
            // Fallback an toàn nếu database offline
            dbUser = {
              id: `user_phone_${cleanedPhone}`,
              name: defaultName,
              email: defaultEmail,
              phone: cleanedPhone,
              role: "TENANT" as const,
              phoneVerified: true,
              isBlocked: false,
              image: null,
            };
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
            phoneVerified: true,
            isBlocked: false,
            image: dbUser.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(dbUser.name)}`,
          };
        }

        // ------------------------------------------------------------
        // B. ĐĂNG NHẬP GOOGLE DEMO (1-CLICK DÀNH CHO KHÁCH THUÊ)
        // ------------------------------------------------------------
        if (loginType === "GOOGLE_DEMO") {
          const demoEmail = email || "nguyen.pham.huit@gmail.com";
          const demoName = name || "Phạm Sỹ Nguyên (Sinh viên K14 HUIT)";
          const demoPhone = phone || "0912345678";
          const demoImage = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80";

          let dbUser = null;
          try {
            dbUser = await prisma.user.findFirst({
              where: { email: demoEmail },
            });
            if (!dbUser) {
              dbUser = await prisma.user.create({
                data: {
                  name: demoName,
                  email: demoEmail,
                  phone: demoPhone,
                  role: "TENANT",
                  phoneVerified: true,
                  image: demoImage,
                  googleId: "google_demo_10928374",
                },
              });
            }
          } catch {
            dbUser = {
              id: "user_google_demo_1",
              name: demoName,
              email: demoEmail,
              phone: demoPhone,
              role: "TENANT" as const,
              phoneVerified: true,
              isBlocked: false,
              image: demoImage,
            };
          }

          return {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            phone: dbUser.phone,
            role: "TENANT",
            phoneVerified: true,
            isBlocked: false,
            image: dbUser.image || demoImage,
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
              const cleanedPhone = identifier.replace(/\s|-/g, "");
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

          // Tài khoản cũ (tạo qua OTP / Google / bản trước khi có mật khẩu) chưa có hash:
          // không tự đặt mật khẩu ở lần đăng nhập đầu, mà hướng dẫn Đăng ký lại để thiết lập.
          if (!dbUser.passwordHash) {
            throw new Error(
              "Tài khoản này chưa thiết lập mật khẩu. Vui lòng đăng nhập bằng SĐT (OTP) hoặc Đăng ký lại với cùng Email để đặt mật khẩu."
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
          const cleanedPhone = rawPhone.replace(/\s|-/g, "");

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
                  { email: trimmedEmail },
                  ...(cleanedPhone ? [{ phone: cleanedPhone }] : []),
                ],
              },
            });

            if (existing) {
              if (existing.passwordHash) {
                throw new RegisterConflictError("Email hoặc Số điện thoại này đã được đăng ký. Vui lòng đăng nhập.");
              }
              if (existing.role !== "TENANT") {
                throw new RegisterConflictError("Email này thuộc tài khoản nội bộ, không thể đăng ký làm khách thuê.");
              }
              // Tài khoản cũ chưa có mật khẩu (OTP / Google / bản trước) -> Đăng ký lại sẽ đặt mật khẩu
              dbUser = await prisma.user.update({
                where: { id: existing.id },
                data: {
                  name: trimmedName || existing.name,
                  phone: cleanedPhone || existing.phone,
                  passwordHash,
                },
              });
            } else {
              dbUser = await prisma.user.create({
                data: {
                  name: trimmedName,
                  email: trimmedEmail,
                  phone: cleanedPhone,
                  role: "TENANT",
                  phoneVerified: Boolean(cleanedPhone),
                  passwordHash,
                },
              });
            }
          } catch (error) {
            if (error instanceof RegisterConflictError) throw error;
            dbUser = {
              id: `tenant_reg_${Date.now()}`,
              name: trimmedName,
              email: trimmedEmail,
              phone: cleanedPhone,
              role: "TENANT" as const,
              phoneVerified: Boolean(cleanedPhone),
              isBlocked: false,
              image: null,
            };
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
          const demoPortalEnabled =
            process.env.NODE_ENV !== "production" || process.env.ENABLE_DEMO_PORTAL === "true";
          const configuredAdminPassword = process.env.ADMIN_PORTAL_PASSWORD;
          const adminPasswordMatches = configuredAdminPassword
            ? password === configuredAdminPassword
            : demoPortalEnabled && (password === "admin123" || password === "123456");
          if (!adminPasswordMatches) {
            throw new Error("Mật khẩu Quản trị viên không chính xác.");
          }

          let admin = null;
          try {
            admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
            if (!admin) {
              admin = await prisma.user.create({
                data: {
                  name: "Ban Quản Trị Hệ Thống",
                  email: email || "admin@eliteliving.vn",
                  phone: "0903999888",
                  role: "ADMIN",
                  phoneVerified: true,
                },
              });
            }
          } catch (error) {
            if (process.env.NODE_ENV === "production") throw error;
            admin = {
              id: "admin_sys_lead",
              name: "Ban Quản Trị Hệ Thống",
              email: email || "admin@eliteliving.vn",
              phone: "0903999888",
              role: "ADMIN" as const,
              phoneVerified: true,
            };
          }

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
          const demoPortalEnabled =
            process.env.NODE_ENV !== "production" || process.env.ENABLE_DEMO_PORTAL === "true";
          const configuredLandlordPassword = process.env.LANDLORD_PORTAL_PASSWORD;
          const landlordPasswordMatches = configuredLandlordPassword
            ? password === configuredLandlordPassword
            : demoPortalEnabled && password === "123456";
          if (!landlordPasswordMatches) {
            throw new Error("Mật khẩu Chủ trọ không chính xác.");
          }

          let landlord = null;
          try {
            landlord = await prisma.landlord.findFirst({
              where: {
                OR: [
                  { email: { equals: email, mode: "insensitive" } },
                  { phone: email },
                ],
              },
            });
          } catch {}

          if (!landlord && process.env.NODE_ENV === "production") {
            throw new Error("Không tìm thấy tài khoản Chủ trọ.");
          }

          const landlordId = landlord?.id || "landlord_tp_1";
          const landlordName = landlord?.name || "Nguyễn Văn Hùng (Chủ trọ Tân Phú)";
          const landlordEmail = landlord?.email || (email || "hung.nguyen@eliteliving.vn");
          const landlordPhone = landlord?.phone || "0903123456";

          return {
            id: landlordId,
            name: landlordName,
            email: landlordEmail,
            role: "LANDLORD",
            phone: landlordPhone,
            phoneVerified: true,
            isBlocked: false,
            image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
          };
        }

        return null;
      },
    }),
  ],

  callbacks: {
    // Lọc rác tầng 1: Chặn domain email spam khi đăng nhập
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const emailDomain = user.email.split("@")[1]?.toLowerCase();
        if (emailDomain && BLOCKED_EMAIL_DOMAINS.includes(emailDomain)) {
          return false;
        }
      }

      if (user.isBlocked) return false;
      return true;
    },

    // JWT callback — gắn thêm role, phone, avatar vào token
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role || "TENANT";
        token.phone = user.phone || "";
        token.phoneVerified = user.phoneVerified || false;
        token.isBlocked = user.isBlocked || false;
        if (user.image) token.picture = user.image;
      }

      // Khi update session (sau xác minh SĐT)
      if (trigger === "update" && session) {
        if (session.phone) token.phone = session.phone;
        if (session.phoneVerified !== undefined) token.phoneVerified = session.phoneVerified;
        if (session.name) token.name = session.name;
      }

      return token;
    },

    // Session callback — truyền data từ JWT vào session
    async session({ session, token }) {
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
