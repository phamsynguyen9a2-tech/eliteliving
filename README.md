# NhàTrọTop – Đồ Án Lập Trình Web

Hệ thống tìm kiếm và quản lý phòng trọ trực tuyến tại TP.HCM. Yêu cầu toàn bộ thành viên đọc kỹ quy định trước khi bắt tay vào code.

---

## 1. Quy Định Workflow Git

Nhánh `main` đã được khóa bảo vệ. Không ai có quyền push hoặc merge trực tiếp vào nhánh `main`. Mọi thay đổi phải thông qua **Pull Request** và được ít nhất 1 thành viên khác review.

### Quy trình làm việc chuẩn:

1. Luôn pull code mới nhất từ main trước khi làm việc: `git pull origin main`
2. Tạo nhánh mới dựa trên task được phân công. Đặt tên nhánh theo cú pháp `feature/ten-chuc-nang` (Ví dụ: `feature/trang-tim-phong`). Lệnh: `git checkout -b feature/ten-chuc-nang`
3. Sau khi code xong, commit rõ ràng và push nhánh lên. Lệnh: `git add .` → `git commit -m "feat: mo ta ngan gon"` → `git push origin feature/ten-chuc-nang`
4. Lên GitHub, tạo **Pull Request (PR)** từ nhánh của mình trở vào `main`.

---

## 2. Quy Định Code & UI

Để đảm bảo giao diện đồng bộ và không bị rối nát, yêu cầu tuân thủ tuyệt đối:

- **Không tự ý đổi màu chủ đạo:** Toàn bộ màu xanh lá (`#1b6b3a`, `#2d8653`) đã được định nghĩa trong `tailwind.config.js`. Không hardcode màu trực tiếp vào component.
- **Dùng class CSS chung:** Các class như `btn-primary`, `btn-secondary`, `form-input`, `room-card`, `badge-green`... đã được định nghĩa trong `globals.css`. Tái sử dụng thay vì tự viết lại.
- **Dùng component có sẵn:** Trước khi tạo component mới, kiểm tra trong `src/components/` xem đã có chưa. Nếu có thì lấy ra dùng, không tự code lại.
- **Không xoá code của người khác** khi không được phân công chỉnh sửa phần đó.

---

## 3. Cấu Trúc Thư Mục

```
nhatrotop/
├── prisma/                 # Cơ sở dữ liệu – schema và migration
│   ├── schema.prisma       # Định nghĩa các bảng dữ liệu
│   └── seed.ts             # Dữ liệu mẫu
├── src/
│   ├── app/
│   │   ├── (admin)/        # Giao diện quản trị viên
│   │   ├── (auth)/         # Trang đăng nhập, đăng ký
│   │   ├── (landlord)/     # Giao diện chủ trọ
│   │   ├── (tenant)/       # Giao diện người thuê trọ
│   │   ├── globals.css     # CSS dùng chung toàn bộ dự án
│   │   └── layout.tsx      # Layout gốc
│   └── components/
│       ├── admin/          # Component riêng cho trang Admin
│       ├── landlord/       # Component riêng cho trang Chủ trọ
│       └── tenant/         # Component riêng cho trang Người thuê
├── .env.local              # Biến môi trường (KHÔNG có trong Git)
├── .gitignore
├── CONTRIBUTING.md         # Hướng dẫn Git chi tiết
├── next.config.js
├── tailwind.config.js      # Cấu hình màu sắc, font chữ toàn dự án
└── package.json
```

---

## 4. Phân Công Thành Viên

| Thành viên | Vai trò | Phần phụ trách |
|---|---|---|
| **Phạm Sỹ Nguyên** | Trưởng nhóm | Giao diện người thuê, Modal đăng nhập, AI gợi ý phòng |
| **Nguyễn Tuấn Anh** | Backend | API Routes, Prisma ORM, Database, Authentication |
| **Võ Nguyễn Thành Đạt** | Frontend | Admin Dashboard, Giao diện chủ trọ, Báo cáo thống kê |

---

## 5. Công Nghệ Sử Dụng

| Công nghệ | Mục đích |
|---|---|
| **Next.js 14** (App Router) | Framework React fullstack |
| **TypeScript** | Kiểm soát kiểu dữ liệu |
| **Tailwind CSS** | Styling giao diện |
| **Prisma ORM** | Kết nối và quản lý cơ sở dữ liệu |
| **SQLite** (dev) / **PostgreSQL** (prod) | Cơ sở dữ liệu |
| **Lucide React** | Bộ icon thống nhất |
| **NextAuth.js** | Xác thực người dùng |

---

## 6. Cài Đặt & Chạy Dự Án

```bash
# 1. Clone repo về máy
git clone https://github.com/phamsynguyen9a2-tech/nhatrotop.git
cd nhatrotop

# 2. Cài đặt các package
npm install

# 3. Tạo file môi trường
# Liên hệ Phạm Sỹ Nguyên để lấy nội dung file .env.local

# 4. Khởi tạo database (lần đầu)
npx prisma migrate dev
npx prisma db seed

# 5. Chạy server
npm run dev
# → Mở trình duyệt tại http://localhost:3000
```

---

## 7. Các Trang Chính

| Đường dẫn | Mô tả | Vai trò |
|---|---|---|
| `/tim-phong` | Tìm phòng, lọc, xem danh sách | Người thuê (không cần đăng nhập) |
| `/phong/[slug]` | Chi tiết phòng | Người thuê |
| `/dat-lich/[roomId]` | Đặt lịch xem phòng | Người thuê (cần đăng nhập) |
| `/tai-khoan/dashboard` | Trang cá nhân người thuê | Người thuê |
| `/dang-nhap` | Đăng nhập | Tất cả |
| `/dang-ky` | Đăng ký tài khoản | Tất cả |
| `/landlord/dashboard` | Quản lý phòng trọ | Chủ trọ |
| `/admin/dashboard` | Quản trị hệ thống | Admin |

---

## 8. Lưu Ý Quan Trọng

> ⚠️ **File `.env.local` không có trong repo** vì chứa thông tin nhạy cảm. Liên hệ **Phạm Sỹ Nguyên** để lấy file này trước khi chạy dự án.

> 📖 Đọc thêm **[CONTRIBUTING.md](./CONTRIBUTING.md)** để biết chi tiết quy trình Git, cách xử lý conflict và các tình huống khẩn cấp.

---

*© 2026 NhàTrọTop – CNTT-KLCN111 | Nhóm: Phạm Sỹ Nguyên, Nguyễn Tuấn Anh, Võ Nguyễn Thành Đạt*
