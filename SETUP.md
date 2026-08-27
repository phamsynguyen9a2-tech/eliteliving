# 📦 Hướng dẫn Cài đặt & Chạy thử NhàTrọTop

> **Dự án:** CNTT-KLCN111 – Hệ thống quản lý nhà trọ/phòng trọ trực tuyến  
> **Nhóm:** Phạm Sỹ Nguyên, Nguyễn Tuấn Anh, Võ Nguyễn Thành Đạt  
> **GVHD:** Phan Thị Ngọc Mai

---

## 🔧 Bước 1: Cài đặt Node.js

1. Truy cập: https://nodejs.org/en/download
2. Tải bản **Node.js LTS** (≥ v20) cho Windows
3. Chạy file `.msi`, tick **"Add to PATH"**
4. Mở PowerShell mới và kiểm tra:

```powershell
node --version   # v20.x.x trở lên
npm --version    # 10.x.x trở lên
```

---

## 🗄️ Bước 2: Cài đặt PostgreSQL

1. Truy cập: https://www.postgresql.org/download/windows/
2. Tải **PostgreSQL 16** cho Windows x86-64
3. Cài đặt, đặt password `postgres` (hoặc tùy ý), port `5432`

### Tạo database:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE nhatrotop_db;"
```

Hoặc dùng pgAdmin 4 → Databases → Create → Database → Name: `nhatrotop_db`

---

## 📂 Bước 3: Mở project

Thư mục dự án:
```
C:\Users\ABC\.gemini\antigravity-ide\scratch\nhatrotop\
```

> 💡 Set thư mục này làm **Active Workspace** trong Antigravity IDE.

---

## ⚙️ Bước 4: Cấu hình biến môi trường

Mở `.env.local` và sửa:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/nhatrotop_db"
```

---

## 📦 Bước 5: Cài dependencies

```powershell
cd C:\Users\ABC\.gemini\antigravity-ide\scratch\nhatrotop
npm install
```

---

## 🔄 Bước 6: Khởi tạo database

```powershell
npm run db:generate
npm run db:migrate
```

Khi hỏi tên migration: nhập `init`

---

## 🌱 Bước 7: Seed dữ liệu mẫu

```powershell
npm run db:seed
```

---

## 🚀 Bước 8: Chạy dev server

```powershell
npm run dev
```

Truy cập các URL:

| URL | Portal |
|-----|--------|
| http://localhost:3000/tim-phong | 🟢 Người thuê – Tìm phòng |
| http://localhost:3000/phong/tp-101 | 🟢 Chi tiết phòng |
| http://localhost:3000/goi-y | 🟢 Gợi ý Top-K |
| http://localhost:3000/dat-lich/TP-101 | 🟢 Đặt lịch |
| http://localhost:3000/tai-khoan/dashboard | 🟢 Dashboard người thuê |
| http://localhost:3000/admin/dashboard | 🔴 Admin Dashboard |
| http://localhost:3000/admin/users | 🔴 Quản lý người dùng |
| http://localhost:3000/admin/rooms | 🔴 Quản lý phòng |
| http://localhost:3000/admin/schedules | 🔴 Lịch xem phòng |
| http://localhost:3000/landlord/dashboard | 🟠 Chủ trọ Dashboard |
| http://localhost:3000/landlord/rooms/new | 🟠 Đăng phòng mới |
| http://localhost:3000/dang-nhap | 🔑 Đăng nhập |

---

## 🎨 Prisma Studio (xem database)

```powershell
npm run db:studio
```

→ http://localhost:5555

---

## ❓ Lỗi thường gặp

| Lỗi | Cách xử lý |
|-----|-----------|
| `node: not recognized` | Cài Node.js, mở PowerShell mới |
| `connect ECONNREFUSED 5432` | Khởi động PostgreSQL service |
| `database does not exist` | Tạo database ở Bước 2 |
| `P1001: Can't reach database` | Kiểm tra DATABASE_URL trong .env.local |
| Port 3000 bận | Chạy `npm run dev -- -p 3001` |
