# 📦 Hướng Dẫn Cài Đặt & Chạy Dự Án NhàTrọTop

> **Dự án:** CNTT-KLCN111 – Hệ thống quản lý nhà trọ/phòng trọ trực tuyến  
> **Nhóm:** Phạm Sỹ Nguyên, Nguyễn Tuấn Anh, Võ Nguyễn Thành Đạt  
> **GVHD:** Phan Thị Ngọc Mai

> ⚠️ **Đọc kỹ từng bước trước khi chạy.** Nếu bỏ qua bước nào sẽ bị lỗi!

---

## ✅ Yêu Cầu Phần Mềm Cần Cài Trước

| Phần mềm | Phiên bản | Link tải |
|---|---|---|
| **Node.js** | ≥ v20 LTS | https://nodejs.org/en/download |
| **PostgreSQL** | 16 | https://www.postgresql.org/download/windows/ |
| **Git** | mới nhất | https://git-scm.com/download/win |
| **VS Code** (khuyến nghị) | mới nhất | https://code.visualstudio.com/ |

---

## 🔧 Bước 1: Cài Đặt Node.js

1. Tải bản **Node.js LTS (≥ v20)** từ https://nodejs.org
2. Chạy file `.msi`, tick chọn **"Add to PATH"** khi cài
3. Mở PowerShell mới, kiểm tra:

```powershell
node --version   # phải ra v20.x.x trở lên
npm --version    # phải ra 10.x.x trở lên
```

---

## 🗄️ Bước 2: Cài Đặt & Cấu Hình PostgreSQL

### 2.1 – Cài PostgreSQL
1. Tải **PostgreSQL 16** từ https://www.postgresql.org/download/windows/
2. Chạy installer, chọn:
   - Bỏ tick **Stack Builder** (không cần)
   - Password: đặt `12345` (hoặc tùy ý, nhớ để dùng ở bước sau)
   - Port: `5432` (giữ mặc định)
3. Hoàn tất cài đặt

### 2.2 – Tạo Database
Mở **PowerShell** và chạy lệnh sau (nhập password `12345` khi được hỏi):

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE nhatrotop_db;"
```

**Hoặc** dùng **pgAdmin 4** (được cài kèm PostgreSQL):
1. Mở pgAdmin 4
2. Đăng nhập bằng password bạn đặt lúc cài
3. Click phải **Databases** → **Create** → **Database**
4. Điền `nhatrotop_db` → Save

### 2.3 – Kiểm tra PostgreSQL đang chạy
```powershell
# Kiểm tra service PostgreSQL có đang chạy không
Get-Service -Name "postgresql*"
# Phải thấy Status: Running
```

Nếu **Stopped**, khởi động lại:
```powershell
Start-Service -Name "postgresql-x64-16"
```

---

## 📂 Bước 3: Clone Dự Án Về Máy

```powershell
git clone https://github.com/phamsynguyen9a2-tech/nhatrotop.git
cd nhatrotop
```

---

## ⚙️ Bước 4: Tạo File Môi Trường `.env.local`

> ❗ File này **KHÔNG có trong Git** vì chứa thông tin nhạy cảm. Bạn phải tự tạo.

Tạo file `.env.local` trong thư mục gốc dự án với nội dung sau:

```env
# Database – thay 12345 bằng password PostgreSQL bạn đặt lúc cài
DATABASE_URL="postgresql://postgres:12345@localhost:5432/nhatrotop_db"

# Next.js Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="nhatrotop-secret-2026"

# App
NEXT_PUBLIC_APP_NAME="NhàTrọTop"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> 💡 **Lưu ý quan trọng:**  
> - Nếu bạn đặt password PostgreSQL khác `12345`, hãy thay vào phần `postgres:12345`  
> - Ví dụ password là `abcd1234` thì sửa thành: `postgresql://postgres:abcd1234@localhost:5432/nhatrotop_db`

---

## 📦 Bước 5: Cài Đặt Dependencies

```powershell
npm install
```

> Đợi khoảng 1–3 phút, đừng tắt cửa sổ.

---

## 🔄 Bước 6: Khởi Tạo Database (Chạy 1 lần duy nhất)

```powershell
# Tạo Prisma client
npx prisma generate

# Chạy migration (tạo các bảng trong database)
npx prisma migrate dev --name init
```

> Nếu thấy `✔ Your database is now in sync` là thành công.

---

## 🌱 Bước 7: Nạp Dữ Liệu Mẫu (Seed)

```powershell
npm run db:seed
```

> Lệnh này tạo dữ liệu mẫu: phòng trọ, người dùng, hợp đồng... để test giao diện.

---

## 🚀 Bước 8: Chạy Server

```powershell
npm run dev
```

Mở trình duyệt tại **http://localhost:3000**

### Các trang có thể truy cập:

| URL | Trang | Ghi chú |
|---|---|---|
| `/tim-phong` | Tìm phòng trọ | Không cần đăng nhập |
| `/phong/tp-101` | Chi tiết phòng | Không cần đăng nhập |
| `/dang-nhap` | Đăng nhập | - |
| `/dang-ky` | Đăng ký | - |
| `/dat-lich/TP-101` | Đặt lịch xem phòng | Cần đăng nhập |
| `/tai-khoan/dashboard` | Dashboard người thuê | Cần đăng nhập |
| `/landlord/dashboard` | Chủ trọ | Cần đăng nhập |
| `/admin/dashboard` | Quản trị | Cần đăng nhập |

---

## 🎨 Bước 9: Xem Database (Tùy chọn)

Prisma Studio giúp xem/sửa dữ liệu trực quan:

```powershell
npx prisma studio
```

→ Mở trình duyệt tại **http://localhost:5555**

---

## ❓ Lỗi Thường Gặp & Cách Xử Lý

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| `node: not recognized` | Chưa cài Node.js hoặc chưa restart terminal | Cài Node.js, mở PowerShell **mới** |
| `connect ECONNREFUSED 127.0.0.1:5432` | PostgreSQL chưa chạy | Mở Services → khởi động `postgresql-x64-16` |
| `database "nhatrotop_db" does not exist` | Chưa tạo database | Làm lại Bước 2.2 |
| `password authentication failed` | Sai password trong `.env.local` | Kiểm tra lại mật khẩu PostgreSQL ở Bước 4 |
| `P1001: Can't reach database server` | Sai `DATABASE_URL` | Kiểm tra lại file `.env.local` |
| `Module not found` | Chưa chạy `npm install` | Chạy lại `npm install` |
| Port 3000 bận | Đang có app khác dùng port 3000 | Chạy `npm run dev -- -p 3001` |
| `Cannot find .env.local` | Chưa tạo file | Làm lại Bước 4 |

---

## 📞 Liên Hệ Hỗ Trợ

Nếu gặp lỗi không tự xử lý được, liên hệ:

- **Phạm Sỹ Nguyên** (Trưởng nhóm) – qua nhóm chat hoặc GitHub Issues
- Tạo **Issue** trên GitHub: https://github.com/phamsynguyen9a2-tech/nhatrotop/issues

---

*© 2026 NhàTrọTop – CNTT-KLCN111*

