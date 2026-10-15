# 🏠 Hệ Thống Quản Lý & Gợi Ý Phòng Trọ Trực Tuyến (Nhatrotop)

> **Khóa luận Cử nhân ngành Công nghệ Thông tin - Trường Đại học Công Thương TP.HCM (HUIT)**  
> **Mã đề tài:** `CNTT-KLCN111`  
> **GVHD:** ThS. Phan Thị Ngọc Mai  
> **Sinh viên thực hiện:**  
> 1. Phạm Sỹ Nguyên - MSSV: 2001230583 (Lớp: 14DHTH04)  
> 2. Nguyễn Tuấn Anh - MSSV: 2001230026 (Lớp: 14DHTH07)  
> 3. Võ Nguyễn Thành Đạt - MSSV: 2001230147 (Lớp: 14DHTH06)  

---

## 🌟 Giới thiệu tổng quan (Bản cập nhật kiến trúc mới)

Dự án đã được **tái cấu trúc và nâng cấp toàn diện (Full-stack Modern Architecture)** nhằm đáp ứng 100% các tiêu chí khắt khe trong đề cương chi tiết:
- **Cơ sở dữ liệu đám mây:** Chuyển đổi hoàn toàn sang **PostgreSQL (Supabase Cloud)** kết hợp **Prisma ORM**, đảm bảo tính toàn vẹn dữ liệu (Data Integrity), cơ chế lưu trữ bền vững (Persistence) và kiểm soát tương tranh mức Database.
- **Dữ liệu thực nghiệm phong phú:** Nạp sẵn **600 phòng trọ thực tế tại TP.HCM**, 24 dự án/tòa nhà, 11 chủ trọ, 120 tài khoản người dùng mẫu và 2,500 lượt tương tác giả lập làm ground-truth.
- **Hệ thống đa nền tảng:** Web Portal đa phân hệ (Người thuê, Chủ trọ, Quản trị viên) và Mobile App (Flutter).

---

## 🚀 Hai nghiệp vụ phức tạp cốt lõi (Trọng tâm đồ án)

### 1. Mô-đun Gợi ý Top-K Cá nhân hóa (Hybrid Recommender)
- **Giải thuật:** Kết hợp **Weighted Rule-Based Scoring** (xử lý bài toán Cold-Start ban đầu theo khoảng giá, tiện ích, bán kính tìm kiếm) và **Content-Based Filtering** (tính độ tương đồng Cosine của tập tiện ích kết hợp công thức khoảng cách địa lý Haversine khi có tương tác).
- **Kết quả đánh giá thực nghiệm (Benchmark định lượng):**
  - **Precision@5:** **`78.83%`** *(vượt kỳ vọng đề cương ≥ 70%)*
  - **NDCG@5:** **`0.7888`** *(vượt kỳ vọng đề cương ≥ 0.75)*
  - **Thời gian phản hồi API (p95):** **`11.36 ms`** *(nhanh gấp ~45 lần yêu cầu đề cương < 500ms)*

### 2. Đặt lịch xem phòng & Kiểm soát tương tranh (Concurrency Control)
- **Cơ chế:** Ngăn chặn tuyệt đối tình trạng đặt trùng lịch xem phòng trong cùng một khung thời gian bằng ràng buộc duy nhất trên Database: `@@unique([roomId, date, timeSlot])` kết hợp Database Transactions trong Prisma.
- **Kết quả kiểm thử mô phỏng:** 20 luồng gửi yêu cầu đồng thời cùng một mili-giây: **1 yêu cầu thành công, 19 yêu cầu còn lại bị chặn chính xác với mã HTTP 409 Conflict**.
- **Vòng đời trạng thái phòng tự động:** `Còn trống (AVAILABLE)` → `Đã đặt lịch (BOOKED_VIEWING)` → `Giữ chỗ (RESERVED)` → `Đang thuê (RENTED)`.

---

## 🛠️ Công nghệ sử dụng

| Phân hệ | Công nghệ |
|---|---|
| **Web Frontend & Backend** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack), [React 19](https://react.dev/), TypeScript, TailwindCSS 4, Lucide Icons |
| **Cơ sở dữ liệu & ORM** | [PostgreSQL (Supabase Cloud)](https://supabase.com/), [Prisma ORM v6](https://www.prisma.io/) (Connection Pooling & Direct Migrations) |
| **Mobile App** | [Flutter](https://flutter.dev/) (Dart) |
| **Khoa học dữ liệu & Benchmark** | Python 3, NumPy, Pandas, Scikit-learn, HTTPX (kiểm thử đa luồng) |

---

## 📁 Cấu trúc thư mục dự án

```text
nhatrotop/
├── web/                           # Phân hệ Web (Next.js 16 Fullstack) - đồng thời là backend API cho app mobile
│   ├── prisma/
│   │   ├── schema.prisma          # Định nghĩa 17 bảng dữ liệu quan hệ
│   │   └── seed.ts                # Script nạp 600 phòng, 120 users, 2500 tương tác
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/               # RESTful API routes (/rooms, /appointments, /bills, /roommate, /auth, ...)
│   │   │   ├── page.tsx           # Trang chủ người thuê (Tìm kiếm, Bản đồ, Gợi ý Top-K)
│   │   │   ├── phong/[id]/        # Trang chi tiết phòng & Đặt lịch xem
│   │   │   ├── ho-so/             # Hồ sơ người thuê: lịch hẹn, đặt cọc, hợp đồng, bàn giao, hóa đơn
│   │   │   ├── o-ghep/            # Tìm bạn ở ghép: danh sách, đăng bài, hồ sơ & yêu cầu kết nối
│   │   │   ├── login/             # Đăng nhập / đăng ký người thuê
│   │   │   ├── portal/            # Cổng đăng nhập Chủ trọ & Quản trị viên
│   │   │   ├── chu-tro/           # Giao diện Chủ trọ (Quản lý phòng, lịch hẹn, hóa đơn, hợp đồng)
│   │   │   └── admin/             # Giao diện Quản trị viên (Admin Dashboard)
│   │   ├── components/            # Các modal & widget dùng chung (đặt lịch, đặt cọc, hợp đồng, hóa đơn...)
│   │   └── lib/
│   │       ├── db.ts              # Xử lý truy vấn cơ sở dữ liệu & Thuật toán gợi ý
│   │       ├── auth.ts            # Cấu hình NextAuth (người thuê, chủ trọ, quản trị viên)
│   │       ├── password.ts        # Băm & kiểm tra mật khẩu (scrypt)
│   │       ├── tenant-access.ts   # Kiểm tra quyền sở hữu dữ liệu thuê phòng
│   │       ├── house-rules.ts     # 10 điều nội quy & an toàn PCCC
│   │       └── prisma.ts          # Prisma Client singleton
│   ├── .env.example               # Mẫu biến môi trường (database, NextAuth, cổng demo)
│   └── package.json
├── mobile/                        # Phân hệ Mobile App (Flutter) - xem mobile/README.md
│   └── lib/
│       ├── main.dart              # Khởi động app, điều hướng, trang chủ, chi tiết phòng, đặt lịch
│       ├── auth.dart              # Đăng nhập/đăng ký qua NextAuth của web, lưu phiên
│       ├── explore_screen.dart    # Tìm phòng đa tiêu chí & phòng yêu thích
│       ├── rental_screens.dart    # Đặt cọc, hợp đồng, bàn giao, hóa đơn VietQR, trả phòng
│       ├── roommate_screens.dart  # Tìm bạn ở ghép
│       ├── bill_reminder.dart     # Nhắc hóa đơn mới / quá hạn
│       └── tenant_api.dart        # Gọi API web cho các chức năng người thuê
├── recommender/                   # Mô-đun Đánh giá Thuật toán & Kiểm thử Tương tranh
│   ├── eval_metrics.py            # Tính toán Precision@K, Recall@K, NDCG@K, Latency
│   ├── test_concurrency.py        # Kịch bản kiểm thử tải tương tranh đặt phòng 20 luồng
│   ├── evaluation_summary.json    # Bảng số liệu kết quả đánh giá thực nghiệm
│   └── metrics_evaluation_chart.png # Biểu đồ trực quan kết quả đánh giá
├── requirements.txt               # Thư viện Python cho thư mục recommender/
├── seed_rooms_tp_hcm.json         # Dữ liệu phòng mẫu TP.HCM
├── seed_database_complete.json    # Bộ dữ liệu mẫu đầy đủ
├── AGENTS.md                      # Quy tắc dự án (bảng màu, kiểm thử, bảo toàn mã nguồn)
├── .gitignore                     # Cấu hình loại trừ file nhạy cảm và build artifact
└── README.md                      # Tài liệu hướng dẫn dự án
```

> [!IMPORTANT]
> Mọi lệnh Node.js (`npm install`, `npm run dev`, `npx prisma ...`) đều chạy trong thư mục **`web/`**, không chạy ở thư mục gốc. App mobile không kết nối thẳng database mà gọi API của `web/`, nên phải chạy `web/` trước khi mở app.

---

## ⚡ Hướng dẫn cài đặt & Chạy dự án

### 1. Yêu cầu tiên quyết
- **Node.js**: Phiên bản 18+ (khuyên dùng Node.js 20 hoặc 22)
- **Python**: Phiên bản 3.10+ (dành cho chạy test recommender & concurrency)
- **Flutter SDK**: bản có Dart 3.10 trở lên (nếu muốn chạy phân hệ mobile); thêm **Android Studio** nếu chạy trên máy ảo Android

### 2. Dành cho thành viên trong nhóm khi Clone dự án về (Cách nhanh nhất)

Nếu bạn là thành viên trong nhóm nhận link repo này, hãy làm theo các bước sau để chạy ngay mà không cần cài đặt database:

```bash
# 1. Clone repository về máy
git clone https://github.com/phamsynguyen9a2-tech/nhatrotop.git
cd nhatrotop/web

# 2. Tạo file web/.env từ file mẫu, rồi điền chuỗi kết nối dùng chung
#    (hỏi trưởng nhóm qua kênh riêng - KHÔNG đưa file .env lên git)
cp .env.example .env

# 3. Cài đặt thư viện (lệnh này tự chạy `prisma generate`)
npm install

# 4. Khởi chạy ứng dụng
npm run dev
```

Nội dung tối thiểu của `web/.env`:

```env
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="mot-chuoi-ngau-nhien-dai"   # bắt buộc để đăng nhập hoạt động
```

> [!NOTE]
> Vì cơ sở dữ liệu Supabase được host trên đám mây (Cloud) và đã nạp sẵn 600 phòng, nên bạn **KHÔNG CẦN** nạp lại seed hay cài PostgreSQL dưới máy. Chỉ cần điền `.env` và chạy `npm run dev` là web sẽ hiển thị đầy đủ dữ liệu ngay lập tức!
>
> Nếu API trả lỗi **500**, kiểm tra lại `web/.env`. Nếu trả lỗi **404**, bạn đang chạy `npm run dev` sai thư mục (phải là `web/`).

### 3. Tùy chọn: Tự khởi tạo Database Supabase mới từ đầu (Nếu không dùng chung)

Nếu bạn muốn tạo một database PostgreSQL riêng biệt trên tài khoản Supabase cá nhân:

```bash
cd web
npm install

# Tạo file .env và điền connection string từ project Supabase mới của bạn
# Đồng bộ 17 bảng và nạp 600 phòng dữ liệu mẫu:
npx prisma db push
npx prisma db seed

# Chạy web:
npm run dev
```

### 4. Đăng nhập theo vai trò

Sau khi khởi chạy, truy cập trình duyệt tại:

| Vai trò | Địa chỉ | Cách đăng nhập |
|---|---|---|
| 🌐 **Người thuê** | [http://localhost:3000](http://localhost:3000) | Bấm Đăng ký (họ tên, email, SĐT, mật khẩu ≥ 6 ký tự), sau đó đăng nhập bằng email hoặc SĐT + mật khẩu. Tài khoản này dùng chung cho cả web và app mobile. |
| 🏢 **Chủ trọ** | [http://localhost:3000/chu-tro](http://localhost:3000/chu-tro) | Tự chuyển về cổng [`/portal/login`](http://localhost:3000/portal/login), chọn tab Chủ trọ. Bản demo: email chủ trọ (VD `hung.taythanh@eliteliving.vn`) + mật khẩu `123456`, hoặc mật khẩu đặt trong `LANDLORD_PORTAL_PASSWORD`. |
| 📊 **Quản trị viên** | [http://localhost:3000/admin](http://localhost:3000/admin) | Cổng [`/portal/login`](http://localhost:3000/portal/login), tab Quản trị viên. Bản demo: `admin@eliteliving.vn` + mật khẩu `admin123`, hoặc mật khẩu đặt trong `ADMIN_PORTAL_PASSWORD`. |

> [!NOTE]
> Mật khẩu demo của cổng Chủ trọ/Quản trị chỉ dùng được khi chạy `npm run dev`. Khi chạy production, phải đặt `LANDLORD_PORTAL_PASSWORD` / `ADMIN_PORTAL_PASSWORD` trong `.env` (hoặc bật `ENABLE_DEMO_PORTAL=true`).
>
> Tài khoản người thuê tạo trước khi có chức năng mật khẩu sẽ báo *"Tài khoản này chưa thiết lập mật khẩu"*: chỉ cần **Đăng ký lại với đúng email cũ** để đặt mật khẩu, dữ liệu cũ vẫn giữ nguyên.

### 5. Chạy App Mobile (Flutter)

1. Chạy backend `web/` trước (mục 2) và để terminal đó chạy.
2. Mở terminal khác, vào thư mục `mobile/`:

```bash
cd mobile
flutter pub get
flutter run -d windows      # Chạy trên Windows desktop (nhanh nhất)
flutter run                 # Chạy trên máy ảo Android đang mở (chọn thiết bị trong danh sách)
```

App tự chọn địa chỉ backend: máy ảo Android dùng `http://10.0.2.2:3000`, Windows/Chrome dùng `http://localhost:3000`. Với **điện thoại thật** cùng mạng WiFi, truyền IP máy tính (xem bằng `ipconfig`):

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.x.x:3000
```

Chi tiết cách tạo máy ảo, các chức năng của app và cách xử lý lỗi thường gặp: xem [mobile/README.md](mobile/README.md).

### 6. Lưu ý sau mỗi lần `git pull`

Khi có người cập nhật `prisma/schema.prisma` hoặc thư viện, chạy lại trong thư mục `web/`:

```bash
# Dừng server đang chạy (Ctrl+C) trước, vì Prisma bị khóa file trên Windows khi server còn chạy
npm install          # cài thư viện mới + tạo lại Prisma Client
npm run dev          # khởi động lại server
```

Nếu bỏ qua bước này, server cũ vẫn dùng Prisma Client cũ và có thể **âm thầm không lưu dữ liệu** (ví dụ đăng ký tài khoản nhưng không ghi vào database). Với app mobile, chạy lại `flutter pub get` nếu `pubspec.yaml` thay đổi.

Thay đổi cấu trúc bảng trên database dùng chung (`npx prisma db push`) chỉ nên do **một người** chạy sau khi cả nhóm thống nhất.

### 7. Xem và quản trị Database qua GUI
Chạy lệnh sau tại thư mục `web` để mở giao diện trực quan Prisma Studio:
```bash
npx prisma studio
```
Truy cập: [http://localhost:5555](http://localhost:5555)

### 8. Chạy kiểm thử tương tranh & Đánh giá thuật toán

```bash
# Kích hoạt virtualenv (nếu có)
.venv\Scripts\activate   # Trên Windows
# hoặc source .venv/bin/activate trên Linux/macOS

# Cài thư viện Python (lần đầu)
pip install -r requirements.txt

# Chạy kiểm thử kiểm soát tương tranh (Concurrency Control) - cần web/ đang chạy ở cổng 3000
python recommender/test_concurrency.py

# Chạy tính toán các độ đo gợi ý (Precision, NDCG, Latency)
python recommender/eval_metrics.py
```

---

## 👥 Phân công nhiệm vụ (Nhóm thực hiện)

- **Phạm Sỹ Nguyên:** Kiến trúc hệ thống, Backend Next.js API, tích hợp cơ sở dữ liệu PostgreSQL (Supabase) + Prisma ORM, xây dựng mô-đun kiểm soát tương tranh.
- **Nguyễn Tuấn Anh:** Phát triển giao diện Web (Người thuê, Chủ trọ, Admin), tối ưu UX/UI, tích hợp bản đồ số và bộ lọc tìm kiếm.
- **Võ Nguyễn Thành Đạt:** Phát triển Mobile App Flutter, nghiên cứu và tối ưu thuật toán gợi ý Top-K cá nhân hóa (Rule-based & Content-based).

---

## 📄 Bản quyền
Đề tài Khóa luận Cử nhân ngành CNTT - HUIT (Năm học 2026 - 2027).
