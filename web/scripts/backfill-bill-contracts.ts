/**
 * Gắn hợp đồng cho các hóa đơn cũ (lập trước khi bảng utility_bills có cột contract_id).
 *
 *   npx tsx scripts/backfill-bill-contracts.ts          # xem trước, không ghi gì
 *   npx tsx scripts/backfill-bill-contracts.ts --apply  # ghi contract_id vào CSDL
 *
 * Quy tắc (giống lib/bill-ownership.ts): ưu tiên hợp đồng cùng phòng có thời hạn bao trùm kỳ hóa đơn;
 * nếu không có thì lấy hợp đồng cùng phòng được tạo gần nhất TRƯỚC thời điểm lập hóa đơn.
 * Hóa đơn không khớp hợp đồng nào được giữ nguyên (null) và sẽ không hiện với khách thuê nào.
 * Cần chạy `npx prisma db push` trước để có cột contract_id.
 */
import { PrismaClient } from '@prisma/client';
import { inferBillContractId } from '../src/lib/bill-ownership';

async function main() {
  const apply = process.argv.includes('--apply');
  const prisma = new PrismaClient();
  try {
    const bills = await prisma.utilityBill.findMany({
      where: { contractId: null },
      select: { id: true, roomId: true, roomCode: true, month: true, createdAt: true, contractId: true },
      orderBy: { createdAt: 'asc' },
    });
    if (bills.length === 0) {
      console.log('Không có hóa đơn nào cần gắn hợp đồng.');
      return;
    }

    const roomIds = Array.from(new Set(bills.map((bill) => bill.roomId)));
    const contracts = await prisma.contract.findMany({
      where: { roomId: { in: roomIds } },
      select: { id: true, roomId: true, createdAt: true, startDate: true, endDate: true, tenantName: true },
    });
    const tenantByContract = new Map(contracts.map((c) => [c.id, c.tenantName]));

    let assigned = 0;
    let orphan = 0;
    for (const bill of bills) {
      const contractId = inferBillContractId(bill, contracts);
      if (!contractId) {
        orphan++;
        console.log(`- ${bill.roomCode} kỳ ${bill.month}: không có hợp đồng tương ứng → giữ nguyên`);
        continue;
      }
      assigned++;
      console.log(`- ${bill.roomCode} kỳ ${bill.month} → hợp đồng ${contractId} (${tenantByContract.get(contractId) ?? ''})`);
      if (apply) {
        await prisma.utilityBill.update({ where: { id: bill.id }, data: { contractId } });
      }
    }

    console.log(`\n${assigned} hóa đơn gắn được hợp đồng, ${orphan} hóa đơn không có hợp đồng tương ứng.`);
    if (!apply) console.log('Đây là bản xem trước. Chạy lại với --apply để ghi vào cơ sở dữ liệu.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
