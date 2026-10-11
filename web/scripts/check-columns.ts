import { prisma } from '../src/lib/prisma';

async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" TIMESTAMP(3);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "image" TEXT;`);
  console.log('Successfully added missing columns: email_verified, image');
}

main().catch(console.error).finally(() => prisma.$disconnect());
