# 🌐 Phân Hệ Web - Nhatrotop (Next.js 16 + React 19 + TypeScript + Prisma)

Phân hệ Web ứng dụng cho đề tài **Hệ thống Quản lý & Gợi ý Phòng trọ Trực tuyến** (Mã đề tài: `CNTT-KLCN111` - HUIT).

Chi tiết toàn bộ kiến trúc đề tài, dữ liệu thực nghiệm và kết quả đánh giá thuật toán được mô tả đầy đủ tại [README.md chính của dự án](../README.md).

---

## 👥 Hướng dẫn cho Thành viên trong Nhóm (Chạy ngay sau khi Clone)

Nếu bạn vừa tải (clone) dự án này về máy:

### Bước 1: Tạo file cấu hình `.env`
Tạo file `.env` ngay trong thư mục `web/` (`web/.env`) và dán connection string (lấy từ bạn Nguyên hoặc người quản trị database):

```env
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

### Bước 2: Cài đặt thư viện
```bash
npm install
```
*(Lệnh này sẽ tự động tải toàn bộ thư mục `node_modules` tương thích với máy của bạn).*

### Bước 3: Khởi chạy Web Server
```bash
npm run dev
```

Mở trình duyệt truy cập:
- 🏠 **Trang Người thuê:** [http://localhost:3000](http://localhost:3000)
- 🏢 **Trang Chủ trọ:** [http://localhost:3000/chu-tro](http://localhost:3000/chu-tro)
- 📊 **Trang Quản trị:** [http://localhost:3000/admin](http://localhost:3000/admin)

> [!NOTE]
> Database Supabase đã có sẵn 600 phòng trên Cloud, bạn chỉ cần điền đúng `.env` là dữ liệu sẽ hiển thị ngay mà không cần cài đặt thêm phần mềm cơ sở dữ liệu nào dưới máy!

---

## 🛠️ Các lệnh hữu ích khác

| Lệnh | Chức năng |
|---|---|
| `npm run dev` | Khởi chạy server phát triển trên cổng 3000 |
| `npm run build` | Build kiểm tra toàn bộ code sản phẩm |
| `npm run db:studio` | Mở giao diện web Prisma Studio quản lý dữ liệu tại `http://localhost:5555` |
| `npm run db:push` | Đồng bộ cấu trúc schema trong `prisma/schema.prisma` lên database |
| `npm run db:seed` | Nạp lại 600 phòng, 120 users, 2500 tương tác vào database |
