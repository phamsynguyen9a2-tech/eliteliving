/**
 * Cấp / đặt lại mật khẩu cho Chủ trọ, Quản trị viên, hoặc Khách thuê (khi khách nhờ cấp lại).
 *
 *   npx tsx scripts/set-portal-password.ts <email hoặc SĐT> <mật khẩu mới>
 *
 * Ví dụ: npx tsx scripts/set-portal-password.ts hung.taythanh@eliteliving.vn MatKhauRieng@2026
 *
 * Thứ tự tìm: bảng landlords (email hoặc SĐT) → tài khoản ADMIN trong bảng users (email)
 * → tài khoản khách thuê trong bảng users (email hoặc SĐT). Mật khẩu được băm bằng scrypt.
 * Chủ trọ / admin cần tối thiểu 8 ký tự; khách thuê tối thiểu 6 ký tự (giống form đăng ký).
 * Cần chạy `npx prisma db push` một lần trước để bảng landlords có cột password_hash.
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

async function main() {
  const [identifierArg, password] = process.argv.slice(2);
  const identifier = identifierArg?.trim();

  if (!identifier || !password) {
    console.error('Cách dùng: npx tsx scripts/set-portal-password.ts <email hoặc SĐT> <mật khẩu mới>');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('Mật khẩu cần tối thiểu 6 ký tự.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await hashPassword(password);
    const phone = identifier.replace(/\s|-/g, '');

    const landlord = await prisma.landlord.findFirst({
      where: { OR: [{ email: { equals: identifier, mode: 'insensitive' } }, { phone }] },
    });
    if (landlord) {
      if (password.length < 8) {
        console.error('Mật khẩu chủ trọ cần tối thiểu 8 ký tự.');
        process.exit(1);
      }
      await prisma.landlord.update({ where: { id: landlord.id }, data: { passwordHash } });
      console.log(`Đã đặt mật khẩu cho chủ trọ: ${landlord.name} (${landlord.email})`);
      return;
    }

    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN', email: { equals: identifier, mode: 'insensitive' } },
    });
    if (admin) {
      if (password.length < 8) {
        console.error('Mật khẩu quản trị viên cần tối thiểu 8 ký tự.');
        process.exit(1);
      }
      await prisma.user.update({ where: { id: admin.id }, data: { passwordHash } });
      console.log(`Đã đặt mật khẩu cho quản trị viên: ${admin.name} (${admin.email})`);
      return;
    }

    const tenant = await prisma.user.findFirst({
      where: {
        role: 'TENANT',
        OR: [{ email: { equals: identifier, mode: 'insensitive' } }, { phone }],
      },
    });
    if (tenant) {
      await prisma.user.update({ where: { id: tenant.id }, data: { passwordHash } });
      console.log(`Đã đặt mật khẩu cho khách thuê: ${tenant.name} (${tenant.email})`);
      return;
    }

    console.error(`Không tìm thấy tài khoản nào có email/SĐT "${identifier}".`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
