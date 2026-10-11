import { prisma } from '../src/lib/prisma';

async function main() {
  const count = await prisma.$executeRawUnsafe(`
    UPDATE rooms SET service_fee = 0 WHERE id % 5 = 0;
  `);
  console.log('Successfully updated free service rooms. Count:', count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
