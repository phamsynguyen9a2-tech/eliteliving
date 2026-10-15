# 📱 Phân Hệ Mobile - SmartTro (Flutter)

App Flutter dành cho **người thuê** của đề tài *Hệ thống Quản lý & Gợi ý Phòng trọ Trực tuyến* (`CNTT-KLCN111` - HUIT). Tổng quan đề tài xem tại [README.md chính](../README.md).

App **không kết nối thẳng database**: mọi dữ liệu đi qua API của backend Next.js trong thư mục [`web/`](../web). Tài khoản người thuê dùng chung giữa web và app.

```
App Flutter ──HTTP/JSON──► web/ (Next.js API, cổng 3000) ──Prisma──► PostgreSQL (Supabase)
```

---

## Chức năng

| Nhóm | Chức năng |
|---|---|
| Tài khoản | Đăng ký, đăng nhập (email/SĐT + mật khẩu), nhớ phiên, sửa hồ sơ, xác minh SĐT bằng OTP |
| Tìm phòng | Gợi ý Top-K, tìm kiếm đa tiêu chí (quận, ngân sách, dạng phòng, số người, xe, điện rẻ, thú cưng...), phòng yêu thích |
| Xem & thuê phòng | Đặt lịch xem phòng, hủy lịch, đặt cọc VietQR, hủy giữ chỗ, hợp đồng điện tử & ký số, gia hạn, trả phòng, biên bản bàn giao |
| Hóa đơn | Xem & thanh toán VietQR, nhắc hóa đơn mới / quá hạn (hạn ngày 05 tháng sau, phạt 50.000đ/ngày theo nội quy), lịch sử đã thanh toán |
| Ở ghép | Danh sách & lọc bài đăng, gửi yêu cầu kết nối, đăng bài, duyệt yêu cầu, hồ sơ ở ghép |
| Thông báo | Thông báo hóa đơn, hợp đồng, gia hạn |

## Cấu trúc mã nguồn

```text
lib/
├── main.dart              # Khởi động, điều hướng 5 tab, trang chủ, chi tiết phòng, đặt lịch, lịch hẹn, cá nhân
├── auth.dart              # Đăng nhập/đăng ký qua NextAuth của web, lưu cookie phiên
├── auth_screen.dart       # Màn hình Đăng nhập / Đăng ký
├── explore_screen.dart    # Tìm phòng đa tiêu chí & phòng yêu thích
├── rental_screens.dart    # Thuê phòng: đặt cọc, hợp đồng, bàn giao, hóa đơn, trả phòng
├── bill_reminder.dart     # Tính hạn thanh toán, quá hạn, phí phạt; badge & banner nhắc
├── account_screens.dart   # Sửa hồ sơ, xác minh SĐT, thông báo, hồ sơ ở ghép
├── roommate.dart          # Gọi API ở ghép
├── roommate_screens.dart  # Các màn hình ở ghép
├── tenant_api.dart        # Gọi API web cho chức năng người thuê, lưu phòng yêu thích
└── ui_kit.dart            # Thành phần giao diện dùng chung (màu Elite Living)
test/                      # Widget test & unit test
```

---

## Chạy app

### 1. Chuẩn bị
- **Flutter SDK** (Dart 3.10 trở lên). Kiểm tra bằng `flutter doctor`.
- **Backend `web/` đang chạy** ở `http://localhost:3000` (xem [README chính](../README.md), mục 2). Không có backend thì app vẫn mở nhưng báo *"Không tải được dữ liệu"*.

### 2. Cài thư viện

```bash
cd mobile
flutter pub get
```

### 3. Chọn thiết bị và chạy

```bash
flutter devices                 # xem danh sách thiết bị
flutter run -d windows          # Windows desktop (nhanh nhất)
flutter run -d chrome           # Trình duyệt
flutter run                     # Máy ảo Android / điện thoại đang kết nối
```

Khi app đang chạy: `r` hot reload, `R` khởi động lại, `q` thoát.

### Máy ảo Android
- **Tạo máy ảo (một lần):** Android Studio → *More Actions* → *Virtual Device Manager* → **+** → chọn mẫu máy → *Finish*.
- **Chấp nhận giấy phép (một lần):** `flutter doctor --android-licenses`, gõ `y` cho tất cả.
- **Bật máy ảo không cần mở Android Studio:**

```bash
flutter emulators
flutter emulators --launch <tên_máy_ảo>
```

### Địa chỉ backend
App tự chọn theo nền tảng (xem `kBaseUrl` trong `lib/main.dart`):

| Chạy trên | Địa chỉ backend |
|---|---|
| Windows / Chrome | `http://localhost:3000` |
| Máy ảo Android | `http://10.0.2.2:3000` (địa chỉ máy tính nhìn từ máy ảo) |
| Điện thoại thật cùng WiFi | truyền IP máy tính: `flutter run --dart-define=API_BASE_URL=http://192.168.x.x:3000` |

App được phép gọi `http://` (không mã hóa) trên Android nhờ `android:usesCleartextTraffic="true"` trong `android/app/src/main/AndroidManifest.xml`, phục vụ chạy với backend local.

---

## Kiểm thử

```bash
flutter analyze
flutter test
```

---

## Lỗi thường gặp

| Hiện tượng | Nguyên nhân & cách xử lý |
|---|---|
| `No pubspec.yaml file found` | Đang đứng sai thư mục. Chạy `cd mobile` trước. |
| App báo HTTP **404** | Backend chạy sai thư mục. Phải chạy `npm run dev` trong `web/`. |
| App báo HTTP **500** | Thiếu hoặc sai `web/.env` (chuỗi kết nối database, `NEXTAUTH_SECRET`). |
| Máy ảo không tải được dữ liệu | Backend chưa chạy, hoặc chạy với địa chỉ khác `10.0.2.2:3000`. |
| Đăng ký xong nhưng đăng nhập lại báo sai | Server web cũ chưa khởi động lại sau khi pull: dừng server, chạy `npm install` rồi `npm run dev` trong `web/`. |
| *"Tài khoản này chưa thiết lập mật khẩu"* | Tài khoản tạo trước khi có mật khẩu: đăng ký lại với đúng email cũ. |
| Build Windows báo cần Developer Mode | Windows cần bật Developer Mode để build plugin: chạy `start ms-settings:developers`. Chạy trên Android không cần. |
