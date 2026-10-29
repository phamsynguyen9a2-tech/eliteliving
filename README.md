# 🏠 Elite Living — Hệ thống quản lý & gợi ý phòng trọ trực tuyến

> **Khóa luận Cử nhân ngành Công nghệ Thông tin — Trường Đại học Công Thương TP.HCM (HUIT)**
> **Mã đề tài:** `CNTT-KLCN111` · **GVHD:** ThS. Phan Thị Ngọc Mai
>
> **Sinh viên thực hiện:**
> 1. Phạm Sỹ Nguyên — MSSV 2001230583 (14DHTH04)
> 2. Nguyễn Tuấn Anh — MSSV 2001230026 (14DHTH07)
> 3. Võ Nguyễn Thành Đạt — MSSV 2001230147 (14DHTH06)

Elite Living kết nối **người thuê**, **chủ trọ** và **quản trị viên** trên cùng một cơ sở dữ liệu và một bộ RESTful API:

- **Website Người thuê** — tìm kiếm, lọc đa tiêu chí, gợi ý Top-K, đặt lịch xem phòng, đặt cọc, hợp đồng điện tử, hóa đơn, tìm bạn ở ghép.
- **Website Chủ trọ** — quản lý phòng, khung giờ đón khách, lịch hẹn, đặt cọc, check-in, hợp đồng, biên bản bàn giao, chỉ số điện nước và hóa đơn.
- **Web Admin** — kiểm duyệt tin đăng, quản lý tài khoản và phân quyền, giám sát quy trình thuê, Dashboard thống kê, giám sát mô-đun gợi ý.
- **Ứng dụng di động (Flutter, Android)** — dành cho người thuê: Top-K, tìm phòng lân cận theo GPS, đặt lịch, hóa đơn, thông báo đẩy FCM.

---

## 📑 Mục lục

1. [Hai nghiệp vụ trọng tâm](#-hai-nghiệp-vụ-trọng-tâm)
2. [Chức năng theo vai trò](#-chức-năng-theo-vai-trò)
3. [Công nghệ](#️-công-nghệ)
4. [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
5. [Cài đặt & chạy web](#-cài-đặt--chạy-web)
6. [Tài khoản đăng nhập](#-tài-khoản-đăng-nhập)
7. [Chạy app mobile](#-chạy-app-mobile)
8. [Kiểm thử](#-kiểm-thử)
9. [Xử lý lỗi thường gặp](#-xử-lý-lỗi-thường-gặp)
10. [Triển khai production](#-triển-khai-production)
11. [Phân công](#-phân-công)

---

## 🚀 Hai nghiệp vụ trọng tâm

### 1. Gợi ý Top-K phòng trọ cá nhân hóa (UC-CORE-01)

Cài đặt trong [`web/src/lib/recommender-core.ts`](web/src/lib/recommender-core.ts), API `GET /api/rooms/recommend`.

| Giai đoạn | Cách tính |
|---|---|
| **Lọc cứng** | Loại phòng vượt ngân sách hoặc nằm ngoài bán kính (khoảng cách Haversine) |
| **Rule-Based** (người dùng mới — cold-start) | `0,40 × S_ngân sách + 0,35 × S_khoảng cách + 0,25 × S_tiện ích (Cosine)` |
| **Content-Based** (đã có lịch sử) | Vector phòng 15 chiều; hồ sơ người dùng = trung bình có trọng số 40 tương tác gần nhất (xem = 1, lưu = 2, đặt lịch = 3) |
| **Hybrid** | `0,70 × Score_rule + 0,30 × Cosine(hồ sơ, phòng)` |

**Đánh giá offline** — tách theo thời gian 80/20 cho từng người dùng, trên 1.335 phòng, 120 người dùng, 2.500 lượt tương tác:

| Phương pháp | P@5 | P@10 | Recall@10 | NDCG@5 | NDCG@10 | HitRate@10 |
|---|---|---|---|---|---|---|
| **Hybrid (hệ thống)** | **3,17%** | **3,83%** | **10,08%** | **0,0293** | **0,0504** | **32,50%** |
| Chỉ Rule-Based | 2,50% | 3,08% | 8,35% | 0,0277 | 0,0444 | 28,33% |
| Phổ biến nhất | 1,83% | 1,33% | 4,39% | 0,0233 | 0,0266 | 12,50% |
| Ngẫu nhiên (kỳ vọng) | 0,29% | 0,29% | 0,76% | 0,0029 | 0,0045 | 2,86% |

Hybrid tốt hơn mọi phương pháp nền nhưng **chưa đạt** kỳ vọng của đề cương (P@5 ≥ 70%, NDCG@5 ≥ 0,75), do tập ứng viên lớn và dữ liệu tương tác mô phỏng còn thưa. Thời gian phản hồi API đạt **p95 ≈ 325 ms** (< 500 ms) khi đo 200 request, mức đồng thời 4, trên bản build production.

### 2. Đặt lịch xem phòng & kiểm soát tương tranh (UC-CORE-02)

- **Ba lớp chống trùng lịch:** ràng buộc duy nhất `unique_slot_booking (room_id, date, time_slot)`; cập nhật dòng phòng có điều kiện trong cùng transaction; lỗi trùng trả **HTTP 409 Conflict**.
- **Thực nghiệm:** 20 yêu cầu đồng thời cùng phòng, cùng ngày, cùng khung giờ → **1 thành công, 19 bị chặn 409**.
- **Máy trạng thái phòng:** `Còn trống (AVAILABLE)` → `Đã đặt lịch (BOOKED_VIEWING)` → `Giữ chỗ (RESERVED)` → `Đang thuê (RENTED)`; mọi phép chuyển không hợp lệ đều bị từ chối.
- **Đồng bộ thời gian thực:** Server-Sent Events qua `/api/events` cho web; thông báo đẩy FCM cho mobile.

---

## 👥 Chức năng theo vai trò

| Vai trò | Chức năng chính |
|---|---|
| **Khách vãng lai** | Xem, tìm kiếm phòng; đặt lịch xem (giới hạn theo IP và SĐT); xem / hủy lịch đã đặt bằng **link tra cứu riêng** tại `/lich-hen` |
| **Người thuê** | Đăng ký bằng email/SĐT + mật khẩu, OTP, Google; hồ sơ nhu cầu cho gợi ý; đặt / đổi / hủy lịch; đặt cọc; ký hợp đồng điện tử; báo thanh toán hóa đơn (giả lập); đánh giá phòng; phòng yêu thích; ở ghép |
| **Chủ trọ** | Đăng phòng (chờ admin duyệt); khung giờ đón khách; xác nhận lịch hẹn; xác nhận cọc & check-in; hợp đồng, gia hạn, trả phòng; biên bản bàn giao; chỉ số điện nước, hóa đơn lẻ / hàng loạt; nội quy; yêu cầu bảo trì |
| **Quản trị viên** | Kiểm duyệt tin đăng; quản lý tài khoản, khóa / đổi vai trò (thu hồi phiên ngay); quản lý khu trọ, phòng, tiện ích – đơn giá; giám sát thanh toán; Dashboard; đánh giá mô-đun gợi ý |

**Bảo mật:** phiên JWT trong cookie HttpOnly, tách riêng phiên người thuê và cổng vận hành; mật khẩu băm bằng scrypt; OTP hiệu lực 5 phút, tối đa 5 lần nhập sai; mọi API kiểm tra vai trò và quyền sở hữu bản ghi (trả 401/403).

---

## 🛠️ Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Web (giao diện + API) | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5, Tailwind CSS 4, Lucide Icons |
| Xác thực | NextAuth 4 (phiên JWT) |
| Cơ sở dữ liệu | PostgreSQL trên Supabase, Prisma ORM 6 — **30 bảng** |
| Mobile | Flutter (Dart): `http`, `shared_preferences`, `geolocator`, `firebase_messaging` |
| Dịch vụ ngoài | Firebase Cloud Messaging (HTTP v1), Resend (email OTP), OpenStreetMap (bản đồ) |
| Đánh giá & kiểm thử | `node:test` + `tsx`, `flutter_test`; Python 3 (`httpx`, `numpy`, `matplotlib`) |

---

## 📁 Cấu trúc thư mục

```text
eliteliving/
├── web/                         # Next.js: 3 phân hệ web + toàn bộ RESTful API (mobile cũng gọi API này)
│   ├── prisma/
│   │   ├── schema.prisma        # Lược đồ 30 bảng
│   │   └── seed.ts              # Nạp dữ liệu mẫu từ src/data/rooms_data.json
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Trang chủ người thuê (tìm kiếm, bản đồ, Top-K)
│   │   │   ├── phong/[id]/      # Chi tiết phòng, đặt lịch xem
│   │   │   ├── ho-so/           # Hồ sơ người thuê: lịch hẹn, cọc, hợp đồng, hóa đơn, bảo mật
│   │   │   ├── lich-hen/        # Lịch đã đặt của khách vãng lai (link tra cứu)
│   │   │   ├── o-ghep/          # Tìm bạn ở ghép
│   │   │   ├── portal/login/    # Cổng đăng nhập Chủ trọ & Quản trị viên
│   │   │   ├── chu-tro/         # Website Chủ trọ
│   │   │   ├── admin/           # Web Admin
│   │   │   └── api/             # RESTful API (rooms, appointments, contracts, bills, events, ...)
│   │   ├── components/          # Modal, widget dùng chung
│   │   └── lib/                 # Nghiệp vụ: db.ts, recommender-core.ts, auth.ts, realtime-bus.ts, ...
│   ├── tests/                   # 15 nhóm kiểm thử tự động (115 ca)
│   ├── scripts/                 # set-portal-password.ts, benchmark-recommend-api.mjs, ...
│   └── .env.example             # Mẫu biến môi trường
├── mobile/                      # App Flutter cho người thuê — xem mobile/README.md
│   ├── lib/                     # main.dart, tenant_api.dart, rental_screens.dart, ...
│   └── test/                    # 9 nhóm widget test (29 ca)
├── recommender/                 # Python: đánh giá gợi ý offline, kiểm thử tương tranh
│   ├── eval_metrics.py
│   ├── test_concurrency.py
│   └── evaluation_summary.json
├── seed_database_complete.json  # Bộ dữ liệu đánh giá (1.335 phòng, 120 người dùng, 2.500 tương tác)
├── requirements.txt             # Thư viện Python
├── package.json                 # Lối tắt: npm run dev / build / start chuyển vào web/
└── AGENTS.md                    # Quy ước dự án (bảng màu, kiểm thử, bảo toàn mã nguồn)
```

---

## ⚡ Cài đặt & chạy web

### Yêu cầu

- **Node.js** 20 trở lên (nhóm dùng Node 24)
- **Git**
- Tùy chọn: **Flutter SDK** + **Android Studio** (chạy mobile), **Python 3.10+** (đánh giá gợi ý, kiểm thử tương tranh)

> [!IMPORTANT]
> Terminal mặc định trên Windows là **PowerShell 5.1**, không hiểu `&&`. Các lệnh dưới đây được viết **mỗi dòng một lệnh** — chạy lần lượt từng dòng.

### Cách nhanh nhất (dùng chung database của nhóm)

```bash
git clone https://github.com/phamsynguyen9a2-tech/eliteliving.git
cd eliteliving/web
cp .env.example .env
```

Mở `web/.env`, điền chuỗi kết nối database (xin trưởng nhóm qua kênh riêng — **không** đưa `.env` lên Git), rồi:

```bash
npm install
npm run dev
```

Mở **http://localhost:3000**. Database Supabase đã có sẵn dữ liệu (1.335 phòng, 73 tòa nhà, 27 chủ trọ) nên **không cần** nạp seed.

> Ở thư mục gốc cũng chạy được `npm run dev` / `npm run build` / `npm start` — lệnh tự chuyển vào `web/`.

### Biến môi trường (`web/.env`)

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `DATABASE_URL` | ✅ | Kết nối Supabase qua pooler (cổng 6543) — app dùng khi chạy |
| `DIRECT_URL` | ✅ | Kết nối trực tiếp (cổng 5432) — Prisma dùng cho `db push` |
| `NEXTAUTH_URL` | ✅ | Địa chỉ web, ví dụ `http://localhost:3000` |
| `NEXTAUTH_SECRET` | ✅ | Chuỗi ngẫu nhiên dài; dùng ký phiên đăng nhập và link tra cứu lịch hẹn |
| `ENABLE_DEMO_LOGIN` | | `"true"` để bật chế độ demo khi chạy production (với `npm run dev` luôn bật) |
| `ADMIN_PORTAL_PASSWORD` | | Mật khẩu admin khi tài khoản admin chưa có mật khẩu riêng |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | | Đăng nhập Google thật; để trống thì dùng nút Google demo |
| `RESEND_API_KEY`, `EMAIL_FROM` | | Gửi OTP qua email; để trống thì OTP in ra terminal (chế độ demo) |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | | Gửi thông báo đẩy FCM tới app mobile |
| `DEMO_OTP_ALLOWLIST`, `DEMO_OTP_IN_RESPONSE` | | Hiện mã OTP trên màn hình khi demo (xem chú thích trong `.env.example`) |

### Tự tạo database riêng (không dùng chung)

Tạo project Supabase mới, điền `DATABASE_URL` / `DIRECT_URL` của project đó, rồi trong `web/`:

```bash
npx prisma db push
npx prisma db seed
```

> [!WARNING]
> **Không** chạy `prisma db push` hoặc `db seed` trên database dùng chung của nhóm khi chưa thống nhất — có thể làm mất dữ liệu demo.

### Sau mỗi lần `git pull`

Dừng server (`Ctrl+C`) rồi chạy lại trong `web/` — Prisma trên Windows bị khóa file khi server còn chạy:

```bash
npm install
npm run dev
```

Bỏ qua bước này, server có thể dùng Prisma Client cũ và **không lưu được dữ liệu mới**. Với mobile, chạy lại `flutter pub get` nếu `pubspec.yaml` thay đổi.

### Xem database bằng giao diện

```bash
npx prisma studio
```

Mở http://localhost:5555.

---

## 🔑 Tài khoản đăng nhập

| Vai trò | Địa chỉ | Cách đăng nhập |
|---|---|---|
| 🌐 **Người thuê** | http://localhost:3000 | Bấm **Đăng nhập / Đăng ký** — email hoặc SĐT + mật khẩu (≥ 6 ký tự), OTP, hoặc Google. Dùng chung cho web và mobile. |
| 🏢 **Chủ trọ** | http://localhost:3000/portal/login → tab *Chủ trọ* | Email chủ trọ, ví dụ `hung.bhh@eliteliving.vn`. Chế độ demo: mật khẩu `123456`, hoặc bấm đăng nhập 1 chạm. |
| 📊 **Quản trị viên** | http://localhost:3000/portal/login → tab *Quản trị viên* | `admin@eliteliving.vn`. Chế độ demo: mật khẩu `admin123`. |

- **Chế độ demo** (mật khẩu demo, đăng nhập 1 chạm, nút Google demo, OTP in ra terminal) **tự bật khi chạy `npm run dev`**. Khi chạy production chỉ bật nếu đặt `ENABLE_DEMO_LOGIN="true"`.
- Cấp mật khẩu riêng cho chủ trọ / admin (sau đó mật khẩu demo không còn dùng được cho tài khoản đó):
  ```bash
  npx tsx scripts/set-portal-password.ts admin@eliteliving.vn <mật-khẩu-mới>
  ```
- **Admin và Chủ trọ dùng chung một phiên** (cookie cổng vận hành). Muốn mở cả ba phân hệ cùng lúc: người thuê và chủ trọ ở cửa sổ thường, admin ở **cửa sổ ẩn danh** (`Ctrl+Shift+N`).
- Mã OTP chỉ lưu trong bộ nhớ của server: khởi động lại server thì mã cũ mất, cần gửi lại mã.

---

## 📱 Chạy app mobile

1. Chạy web (mục trên) và để terminal đó chạy.
2. Mở máy ảo Android (hoặc mở Android Studio → **Device Manager** → ▶):
   ```bash
   flutter emulators --launch Pixel_5
   ```
3. Ở terminal khác, trong thư mục `mobile/`:
   ```bash
   flutter pub get
   ```
   ```bash
   flutter run -d emulator-5554
   ```

Máy ảo tự gọi backend tại `http://10.0.2.2:3000` (chính là `localhost:3000` của máy tính). Điện thoại thật cùng WiFi: thêm `--dart-define=API_BASE_URL=http://<IP-máy-tính>:3000` (xem IP bằng `ipconfig`). Thông báo đẩy cần thêm các tham số `--dart-define=FIREBASE_...`.

Chi tiết chức năng, tạo máy ảo, cấu hình Firebase: [mobile/README.md](mobile/README.md).

---

## 🧪 Kiểm thử

| Bộ kiểm thử | Lệnh | Quy mô |
|---|---|---|
| Web (đơn vị + tích hợp, Prisma giả lập — không cần database) | `npm test` (trong `web/`) | 115 ca, 15 nhóm |
| Mobile (widget test) | `flutter test` (trong `mobile/`) | 29 ca, 9 nhóm |
| Phân tích tĩnh mobile | `flutter analyze` | — |
| Kiểm tra kiểu + build production | `npm run build` (trong `web/`, **dừng `npm run dev` trước**) | — |

**Đánh giá gợi ý & tương tranh (Python)** — ở thư mục gốc:

```bash
pip install -r requirements.txt
```

```bash
python recommender/eval_metrics.py
```

```bash
python recommender/test_concurrency.py
```

- `eval_metrics.py` không cần server; đọc `seed_database_complete.json` và ghi kết quả vào `recommender/evaluation_summary.json`.
- `test_concurrency.py` gửi 20 yêu cầu đặt lịch đồng thời tới `http://localhost:3000` — **cần web đang chạy**, và sẽ tạo lịch hẹn thật trên database đang kết nối.

**Đo hiệu năng API gợi ý** (cần web đang chạy, nên đo trên bản production `npm run build` + `npm start`), trong `web/`:

```bash
node scripts/benchmark-recommend-api.mjs --requests 200 --concurrency 4
```

Trang Admin › *Chất lượng gợi ý* cũng có nút **Chạy đánh giá** trên dữ liệu đang vận hành.

---

## 🩺 Xử lý lỗi thường gặp

| Hiện tượng | Nguyên nhân & cách xử lý |
|---|---|
| `The token '&&' is not a valid statement separator` | PowerShell 5.1 không hỗ trợ `&&` — chạy từng lệnh một dòng, hoặc dùng `;` |
| `EPERM: operation not permitted, rename ... query_engine-windows.dll.node` | `npm install` / `npm run build` chạy khi `npm run dev` đang mở. Dừng server (`Ctrl+C`) rồi chạy lại |
| Trình duyệt báo `Failed to fetch` / *Lỗi kết nối* | Server dev đã dừng — chạy lại `npm run dev` trong `web/`. Không chạy `npm run build` song song với `npm run dev` |
| API trả **500** ngay khi mở trang | Sai hoặc thiếu `web/.env` (`DATABASE_URL`, `NEXTAUTH_SECRET`) |
| API trả **404** | Chạy `npm run dev` sai thư mục — phải là `web/` hoặc thư mục gốc |
| Cảnh báo *hydration* có class `mdl-js` | Do tiện ích Chrome sửa HTML; không phải lỗi app. Thử bằng cửa sổ ẩn danh |
| Đăng ký xong nhưng không thấy tài khoản | Prisma Client cũ sau `git pull` — dừng server, `npm install`, chạy lại |
| `flutter run` lỗi Gradle `InternalProblems` | Gradle wrapper phải là **8.14** (`mobile/android/gradle/wrapper/gradle-wrapper.properties`) |
| App mobile không tải được dữ liệu | Web chưa chạy, hoặc không truy cập được `10.0.2.2:3000` từ máy ảo |

---

## 🌍 Triển khai production

1. Tạo dự án trên **Vercel** từ repo GitHub, **Root Directory** = `web`, Framework Preset = Next.js, lệnh build `npm run build`.
2. Khai báo biến môi trường: `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL` (địa chỉ HTTPS của bản triển khai), `NEXTAUTH_SECRET` (**chuỗi mới, bắt buộc**), `ENABLE_DEMO_LOGIN` (`"false"` khi chạy thật), cùng biến Firebase / Resend nếu dùng.
3. Cấp mật khẩu riêng cho admin và chủ trọ bằng `scripts/set-portal-password.ts` — khi tắt chế độ demo, mật khẩu demo không còn tác dụng.
4. Chỉ chạy `npx prisma db push` sau khi đã sao lưu database; **không** chạy seed trên database có dữ liệu thật.
5. Mobile: `flutter build apk` với `--dart-define=API_BASE_URL=https://<địa-chỉ-triển-khai>` và cấu hình Firebase.

---

## 🤝 Phân công

- **Phạm Sỹ Nguyên:** kiến trúc hệ thống, backend Next.js API, PostgreSQL (Supabase) + Prisma, mô-đun kiểm soát tương tranh.
- **Nguyễn Tuấn Anh:** giao diện web (Người thuê, Chủ trọ, Admin), UX/UI, bản đồ số và bộ lọc tìm kiếm.
- **Võ Nguyễn Thành Đạt:** ứng dụng mobile Flutter, nghiên cứu và tối ưu thuật toán gợi ý Top-K (Rule-Based & Content-Based).

---

## 📄 Bản quyền

Đề tài Khóa luận Cử nhân ngành CNTT — Trường Đại học Công Thương TP.HCM, năm học 2026 – 2027.
