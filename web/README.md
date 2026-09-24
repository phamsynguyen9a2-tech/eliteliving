# 🌐 Phân Hệ Web - Nhatrotop (Next.js 16 + React 19 + TypeScript + Prisma)

Phân hệ Web ứng dụng cho đề tài **Hệ thống Quản lý & Gợi ý Phòng trọ Trực tuyến** (Mã đề tài: `CNTT-KLCN111`).

Chi tiết toàn bộ kiến trúc đề tài, dữ liệu thực nghiệm và kết quả đánh giá thuật toán được mô tả đầy đủ tại [README.md chính của dự án](../README.md).

---

## 🚀 Khởi chạy nhanh

### 1. Cài đặt thư viện
```bash
npm install
```

### 2. Thiết lập cơ sở dữ liệu (Supabase PostgreSQL + Prisma)
Tạo file `.env` dựa theo mẫu `.env.example`:
```env
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

Sau đó chạy các lệnh:
```bash
# 1. Sinh Prisma Client
npm run db:generate

# 2. Tạo bảng trên Supabase
npm run db:push

# 3. Nạp 600 phòng dữ liệu mẫu, 24 dự án, 120 users, 2500 tương tác
npm run db:seed
```

### 3. Chạy server phát triển
```bash
npm run dev
```
Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).

### 4. Mở GUI quản lý Database (Prisma Studio)
```bash
npm run db:studio
```
Mở trình duyệt tại [http://localhost:5555](http://localhost:5555).
