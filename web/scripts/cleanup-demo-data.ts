/**
 * Xóa dữ liệu demo do hàm ensureLandlordDemoData (bản cũ) tự sinh khi chủ trọ mở /chu-tro:
 *   - 2 hợp đồng "Trần Văn Minh (Sinh viên K14 HUIT)", "Lê Thị Thu Hà (Nhân viên VP Etown)"
 *     cùng biên bản bàn giao, hóa đơn và báo thanh toán gắn với chúng;
 *   - 3 hóa đơn mẫu kỳ 09/2026, 10/2026 (chỉ số điện nước cố định) trên các phòng đó;
 *   - 2 lịch hẹn "Võ Nguyễn Thành Đạt (Sinh viên)", "Đỗ Hoàng Khang (Lập trình viên)".
 * Trước đây code ẩn các bản ghi này bằng bộ lọc tên cứng (notIn); nay bộ lọc đã bỏ nên cần xóa hẳn.
 *
 *   npx tsx scripts/cleanup-demo-data.ts          # xem trước, không ghi gì
 *   npx tsx scripts/cleanup-demo-data.ts --apply  # sao lưu ra .data/ rồi xóa
 *
 * Chỉ khớp đúng tên + số điện thoại mà hàm demo đã dùng, nên không đụng tới dữ liệu thật.
 * Trạng thái phòng bị dữ liệu demo đổi (RENTED / BOOKED_VIEWING) được tính lại theo dữ liệu còn lại.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient, type RoomStatus } from '@prisma/client';

const DEMO_CONTRACTS = [
  { tenantName: 'Trần Văn Minh (Sinh viên K14 HUIT)', tenantPhone: '0908123456' },
  { tenantName: 'Lê Thị Thu Hà (Nhân viên VP Etown)', tenantPhone: '0918998877' },
];
const DEMO_APPOINTMENTS = [
  { userName: 'Võ Nguyễn Thành Đạt (Sinh viên)', userPhone: '0938123456' },
  { userName: 'Đỗ Hoàng Khang (Lập trình viên)', userPhone: '0977889900' },
];
/** Chỉ số điện / nước mà hàm demo ghi cứng cho 3 hóa đơn mẫu */
const DEMO_BILL_METERS = [
  { month: '09/2026', electricOld: 1250, electricNew: 1410, waterOld: 45, waterNew: 51 },
  { month: '10/2026', electricOld: 1410, electricNew: 1565, waterOld: 51, waterNew: 57 },
  { month: '10/2026', electricOld: 890, electricNew: 1020, waterOld: 32, waterNew: 37 },
];

async function main() {
  const apply = process.argv.includes('--apply');
  const prisma = new PrismaClient();
  try {
    const contracts = await prisma.contract.findMany({ where: { OR: DEMO_CONTRACTS } });
    const contractIds = contracts.map((c) => c.id);
    const contractRoomIds = Array.from(new Set(contracts.map((c) => c.roomId)));

    const handovers = await prisma.handover.findMany({
      where: { contractId: { in: contractIds } },
      include: { items: true },
    });

    const bills = await prisma.utilityBill.findMany({
      where: {
        OR: [
          { contractId: { in: contractIds } },
          { roomId: { in: contractRoomIds }, OR: DEMO_BILL_METERS },
        ],
      },
      include: { payment: true },
    });

    const appointments = await prisma.appointment.findMany({ where: { OR: DEMO_APPOINTMENTS } });

    const affectedRoomIds = Array.from(
      new Set([...contractRoomIds, ...bills.map((b) => b.roomId), ...appointments.map((a) => a.roomId)])
    );
    const rooms = await prisma.room.findMany({
      where: { id: { in: affectedRoomIds } },
      select: { id: true, roomCode: true, status: true },
    });

    console.log(`Hợp đồng demo: ${contracts.length}`);
    for (const c of contracts) console.log(`  - ${c.id} | phòng ${c.roomId} | ${c.tenantName} | ${c.status}`);
    console.log(`Biên bản bàn giao gắn với hợp đồng demo: ${handovers.length}`);
    for (const h of handovers) console.log(`  - ${h.id} | ${h.type} | ${h.items.length} tài sản`);
    console.log(`Hóa đơn demo: ${bills.length}`);
    for (const b of bills) {
      console.log(`  - ${b.roomCode} kỳ ${b.month} | ${b.status} | ${b.totalAmount.toLocaleString('vi-VN')}đ${b.payment ? ' | có báo thanh toán' : ''}`);
    }
    console.log(`Lịch hẹn demo: ${appointments.length}`);
    for (const a of appointments) console.log(`  - ${a.id} | phòng ${a.roomId} | ${a.userName} | ${a.date} ${a.timeSlot} | ${a.status}`);

    if (contracts.length + bills.length + appointments.length === 0) {
      console.log('\nKhông còn dữ liệu demo nào.');
      return;
    }
    if (!apply) {
      console.log('\nĐây là bản xem trước. Chạy lại với --apply để sao lưu rồi xóa.');
      return;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dataDir = path.join(process.cwd(), '.data');
    fs.mkdirSync(dataDir, { recursive: true });
    const backupFile = path.join(dataDir, `demo-cleanup-backup-${stamp}.json`);
    fs.writeFileSync(
      backupFile,
      JSON.stringify({ createdAt: new Date().toISOString(), contracts, handovers, bills, appointments, rooms }, null, 2),
      'utf8'
    );
    console.log(`\nĐã sao lưu vào ${backupFile}`);

    const handoverIds = handovers.map((h) => h.id);
    const billIds = bills.map((b) => b.id);
    const appointmentIds = appointments.map((a) => a.id);

    const roomUpdates: Array<{ id: number; roomCode: string; from: RoomStatus; to: RoomStatus }> = [];
    await prisma.$transaction(async (tx) => {
      await tx.handoverItem.deleteMany({ where: { handoverId: { in: handoverIds } } });
      await tx.handover.deleteMany({ where: { id: { in: handoverIds } } });
      await tx.billPayment.deleteMany({ where: { billId: { in: billIds } } });
      await tx.utilityBill.deleteMany({ where: { id: { in: billIds } } });
      await tx.contract.deleteMany({ where: { id: { in: contractIds } } });
      await tx.appointment.deleteMany({ where: { id: { in: appointmentIds } } });

      // Tính lại trạng thái phòng mà dữ liệu demo đã đổi
      for (const room of rooms) {
        if (room.status !== 'RENTED' && room.status !== 'BOOKED_VIEWING') continue;
        const [activeContract, upcoming] = await Promise.all([
          tx.contract.findFirst({ where: { roomId: room.id, status: 'ACTIVE' }, select: { id: true } }),
          tx.appointment.findFirst({
            where: { roomId: room.id, status: { in: ['PENDING', 'CONFIRMED'] } },
            select: { id: true },
          }),
        ]);
        const next: RoomStatus = activeContract ? 'RENTED' : upcoming ? 'BOOKED_VIEWING' : 'AVAILABLE';
        if (next !== room.status) {
          await tx.room.update({ where: { id: room.id }, data: { status: next } });
          roomUpdates.push({ id: room.id, roomCode: room.roomCode, from: room.status, to: next });
        }
      }
    });

    console.log(
      `Đã xóa ${contracts.length} hợp đồng, ${handovers.length} biên bản bàn giao, ${bills.length} hóa đơn, ${appointments.length} lịch hẹn.`
    );
    for (const r of roomUpdates) console.log(`  - Phòng ${r.roomCode}: ${r.from} → ${r.to}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
