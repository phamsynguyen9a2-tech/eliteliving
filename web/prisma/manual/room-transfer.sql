-- Elite Living - Tính năng ĐỔI PHÒNG (2026-11-08)
-- Tương đương "npx prisma db push" cho phần schema mới: CHỈ TẠO MỚI 2 enum + bảng room_transfer_requests,
-- không sửa bảng cũ. Dùng khi máy không kết nối được cổng 5432 (DIRECT_URL) để chạy db push:
-- dán toàn bộ vào Supabase Dashboard > SQL Editor > Run. Chạy một lần.
BEGIN;

-- CreateEnum
CREATE TYPE "RoomTransferStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferSettlementStatus" AS ENUM ('NONE', 'UNPAID', 'PENDING_CONFIRMATION', 'SETTLED');

-- CreateTable
CREATE TABLE "room_transfer_requests" (
    "id" TEXT NOT NULL,
    "from_contract_id" TEXT NOT NULL,
    "from_room_id" INTEGER NOT NULL,
    "to_room_id" INTEGER NOT NULL,
    "landlord_id" TEXT NOT NULL,
    "tenant_user_id" TEXT,
    "tenant_name" TEXT NOT NULL,
    "tenant_phone" TEXT NOT NULL,
    "desired_date" TEXT NOT NULL,
    "note" TEXT,
    "status" "RoomTransferStatus" NOT NULL DEFAULT 'PENDING',
    "pending_key" TEXT,
    "reject_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),
    "new_contract_id" TEXT,
    "transfer_date" TEXT,
    "old_rent" DOUBLE PRECISION,
    "new_rent" DOUBLE PRECISION,
    "old_deposit" DOUBLE PRECISION,
    "new_deposit" DOUBLE PRECISION,
    "deposit_diff" DOUBLE PRECISION,
    "rent_diff" DOUBLE PRECISION,
    "remaining_days" INTEGER,
    "days_in_month" INTEGER,
    "month_already_billed" BOOLEAN,
    "old_electric_prev" DOUBLE PRECISION,
    "old_electric_final" DOUBLE PRECISION,
    "old_water_prev" DOUBLE PRECISION,
    "old_water_final" DOUBLE PRECISION,
    "new_electric_start" DOUBLE PRECISION,
    "new_water_start" DOUBLE PRECISION,
    "utility_cost" DOUBLE PRECISION,
    "damage_cost" DOUBLE PRECISION,
    "total_diff" DOUBLE PRECISION,
    "settlement_status" "TransferSettlementStatus" NOT NULL DEFAULT 'NONE',
    "settlement_tx_code" TEXT,
    "settlement_reported_at" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),

    CONSTRAINT "room_transfer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "room_transfer_requests_pending_key_key" ON "room_transfer_requests"("pending_key");

-- CreateIndex
CREATE INDEX "room_transfer_requests_landlord_id_created_at_idx" ON "room_transfer_requests"("landlord_id", "created_at");

-- CreateIndex
CREATE INDEX "room_transfer_requests_from_contract_id_idx" ON "room_transfer_requests"("from_contract_id");

-- AddForeignKey
ALTER TABLE "room_transfer_requests" ADD CONSTRAINT "room_transfer_requests_from_contract_id_fkey" FOREIGN KEY ("from_contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_transfer_requests" ADD CONSTRAINT "room_transfer_requests_from_room_id_fkey" FOREIGN KEY ("from_room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_transfer_requests" ADD CONSTRAINT "room_transfer_requests_to_room_id_fkey" FOREIGN KEY ("to_room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;


COMMIT;
