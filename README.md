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
├── web/                           # Phân hệ Web (Next.js 16 Fullstack)
│   ├── prisma/
│   │   ├── schema.prisma          # Định nghĩa 7 bảng dữ liệu quan hệ
│   │   └── seed.ts                # Script nạp 600 phòng, 120 users, 2500 tương tác
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/               # RESTful API routes (/rooms, /appointments, /admin, ...)
│   │   │   ├── admin/             # Giao diện Quản trị viên (Admin Dashboard)
│   │   │   ├── chu-tro/           # Giao diện Chủ trọ (Quản lý phòng & lịch hẹn)
│   │   │   ├── phong/[id]/        # Trang chi tiết phòng & Đặt lịch xem
│   │   │   └── page.tsx           # Trang chủ người thuê (Tìm kiếm, Bản đồ, Gợi ý Top-K)
│   │   └── lib/
│   │       ├── db.ts              # Xử lý truy vấn cơ sở dữ liệu & Thuật toán gợi ý
│   │       └── prisma.ts          # Prisma Client singleton
│   ├── .env.example               # Mẫu biến môi trường kết nối database
│   └── package.json
├── mobile/                        # Phân hệ Mobile App (Flutter)
│   └── lib/
│       └── main.dart              # Giao diện tìm phòng, định vị lân cận, đặt lịch
├── recommender/                   # Mô-đun Đánh giá Thuật toán & Kiểm thử Tương tranh
│   ├── eval_metrics.py            # Tính toán Precision@K, Recall@K, NDCG@K, Latency
│   ├── test_concurrency.py        # Kịch bản kiểm thử tải tương tranh đặt phòng 20 luồng
│   ├── evaluation_summary.json    # Bảng số liệu kết quả đánh giá thực nghiệm
│   └── metrics_evaluation_chart.png # Biểu đồ trực quan kết quả đánh giá
├── .gitignore                     # Cấu hình loại trừ file nhạy cảm và build artifact
└── README.md                      # Tài liệu hướng dẫn dự án
```

---

## ⚡ Hướng dẫn cài đặt & Chạy dự án

### 1. Yêu cầu tiên quyết
- **Node.js**: Phiên bản 18+ (khuyên dùng Node.js 20 hoặc 22)
- **Python**: Phiên bản 3.10+ (dành cho chạy test recommender & concurrency)
- **Flutter SDK**: (Nếu muốn chạy phân hệ mobile)

### 2. Dành cho thành viên trong nhóm khi Clone dự án về (Cách nhanh nhất)

Nếu bạn là thành viên trong nhóm nhận link repo này, hãy làm theo các bước sau để chạy ngay mà không cần cài đặt database:

```bash
# 1. Clone repository về máy
git clone https://github.com/phamsynguyen9a2-tech/nhatrotop.git
cd nhatrotop/web

# 2. Tạo file .env và dán connection string (hỏi trưởng nhóm hoặc người tạo database để lấy chuỗi kết nối dùng chung):
# File: web/.env
# DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
# DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# 3. Cài đặt các thư viện cần thiết (tự động tạo lại node_modules)
npm install

# 4. Khởi chạy ứng dụng
npm run dev
```

> [!NOTE]
> Vì cơ sở dữ liệu Supabase được host trên đám mây (Cloud) và đã nạp sẵn 600 phòng, nên bạn **KHÔNG CẦN** nạp lại seed hay cài PostgreSQL dưới máy. Chỉ cần điền `.env` và chạy `npm run dev` là web sẽ hiển thị đầy đủ dữ liệu ngay lập tức!

### 3. Tùy chọn: Tự khởi tạo Database Supabase mới từ đầu (Nếu không dùng chung)

Nếu bạn muốn tạo một database PostgreSQL riêng biệt trên tài khoản Supabase cá nhân:

```bash
cd web
npm install

# Tạo file .env và điền connection string từ project Supabase mới của bạn
# Đồng bộ bảng và nạp 600 phòng dữ liệu mẫu:
npx prisma generate
npx prisma db push
npx prisma db seed

# Chạy web:
npm run dev
```

Sau khi khởi chạy, truy cập trình duyệt tại:
- 🌐 **Người thuê:** [http://localhost:3000](http://localhost:3000)
- 🏢 **Chủ trọ:** [http://localhost:3000/chu-tro](http://localhost:3000/chu-tro)
- 📊 **Quản trị viên:** [http://localhost:3000/admin](http://localhost:3000/admin)

### 3. Xem và quản trị Database qua GUI
Chạy lệnh sau tại thư mục `web` để mở giao diện trực quan Prisma Studio:
```bash
npx prisma studio
```
Truy cập: [http://localhost:5555](http://localhost:5555)

### 4. Chạy kiểm thử tương tranh & Đánh giá thuật toán

```bash
# Kích hoạt virtualenv (nếu có)
.venv\Scripts\activate   # Trên Windows
# hoặc source .venv/bin/activate trên Linux/macOS

# Chạy kiểm thử kiểm soát tương tranh (Concurrency Control)
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
