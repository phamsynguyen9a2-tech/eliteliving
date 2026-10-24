/**
 * Chỉ đọc: liệt kê dữ liệu đang nằm trong bảng landlord_settings (tạo bằng SQL thủ công) và các file .data.
 *   npx tsx scripts/inspect-legacy-store.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string; data_type: string; is_nullable: string }>>(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'landlord_settings' ORDER BY ordinal_position`
    );
    console.log('Cột của landlord_settings:', JSON.stringify(columns));
    if (columns.length > 0) {
      const rows = await prisma.$queryRawUnsafe<Array<{ landlord_id: string; availability: unknown; house_rules: unknown }>>(
        `SELECT landlord_id, availability, house_rules FROM landlord_settings`
      );
      console.log(`Số dòng: ${rows.length}`);
      for (const row of rows) {
        const summarize = (value: unknown) =>
          value == null ? 'null' : Array.isArray(value) ? `mảng ${value.length} phần tử` : typeof value === 'object' ? `object ${Object.keys(value as object).length} khóa` : typeof value;
        console.log(`- ${row.landlord_id}: availability=${summarize(row.availability)}, house_rules=${summarize(row.house_rules)}`);
      }
    }
  } catch (err) {
    console.log('Không đọc được landlord_settings:', err instanceof Error ? err.message : err);
  } finally {
    await prisma.$disconnect();
  }
  for (const file of ['landlord-settings.json', 'payment-claims.json', 'notifications.json']) {
    const p = path.join(process.cwd(), '.data', file);
    console.log(`.data/${file}: ${fs.existsSync(p) ? `${fs.statSync(p).size} bytes` : 'không có'}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
