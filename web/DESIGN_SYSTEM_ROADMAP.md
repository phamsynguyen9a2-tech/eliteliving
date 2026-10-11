# ELITE LIVING — DESIGN SYSTEM & AI ROADMAP

Tài liệu này đóng vai trò kim chỉ nam quy định hệ thống nhận diện màu sắc, phong cách thẩm mỹ và lộ trình phát triển kỹ thuật cho bất kỳ AI Agent hay Lập trình viên nào tham gia dự án.

---

## 🎨 1. QUY TẮC MÀU BẮT BUỘC (MANDATORY COLOR PALETTE)

> ⚠️ **ĐIỀU CẤM KỴ TUYỆT ĐỐI**:
> **KHÔNG ĐƯỢC PHÉP dùng màu xanh lá cây (`#00875A`, `#059669`, Emerald, Green) làm màu nút, màu nhận diện hay màu chủ đạo**. Tất cả phải được chuyển sang màu **Vàng Đồng Champagne (#B89C66)** và **Navy Sang Trọng (#0F223A)** theo màu thương hiệu của Elite Living.

### Bảng Mã Màu Chi Tiết:
* **Primary Brand Accent (Màu Vàng Đồng)**: `#B89C66`
  * Hover: `#A38752`
  * Active / Focus Ring: `ring-[#B89C66]/20`
  * Shadow: `shadow-[#B89C66]/25`
  * Vị trí dùng: Nút Submit chính, Tab Active, Viền input khi focus, Slogan, Highlight quan trọng.
* **Deep Navy (Màu Xanh Đen Navy)**: `#0F223A`
  * Text Heading: `#0F223A`
  * Overlay Backdrop: `bg-[#0F223A]/45` kết hợp `backdrop-blur-sm`
  * Vị trí dùng: Tiêu đề trang, Tên thương hiệu ELITE LIVING, chữ đậm chất lượng cao.
* **Warm Ivory Canvas (Màu Kem Ngà Nền)**: `#F8F8F6`
  * Toàn bộ background của web và header khi cuộn.
* **Warm Slate Border (Viền)**: `#E5E3DE`
  * Viền các khối card, viền input, đường chia cách.

---

## 🗺️ 2. LỘ TRÌNH (ROADMAP) PHÁT TRIỂN & CHUẨN HÓA MÀU SẮC CHO AI

### Giai đoạn 1: Chuẩn hóa Đăng nhập & Xác thực khách hàng (Đã hoàn thành ✅)
* [x] Form Đăng nhập & Đăng ký chuyển sang dạng **Modal Overlay** với nền làm mờ nhẹ (`backdrop-blur-sm bg-[#0F223A]/45`).
* [x] Đổi toàn bộ màu xanh lá cây sang màu Vàng Đồng `#B89C66` (Nút bấm, Viền ô mật khẩu, Tab chọn, Thông báo).
* [x] Tách riêng hoàn toàn Cổng Quản trị & Chủ trọ sang `/portal/login`.
* [x] Nút đăng nhập Google 1-Click tức thì (không bao giờ bị treo spinner).

### Giai đoạn 2: Tính năng Ở Ghép (`/o-ghep`) (Đã hoàn thành ✅)
* [x] Đồng bộ màu sắc Champagne Gold `#B89C66` và Deep Navy `#0F223A` trên toàn bộ các trang `/o-ghep`, `/o-ghep/[id]`, `/o-ghep/dang-bai`, `/o-ghep/ho-so`.
* [x] Sửa lỗi font chữ tiếng Việt (chuyển sang Google Inter với subset latin & vietnamese).
* [x] Bổ sung dữ liệu bài đăng ở ghép dựa trên các dự án phòng trọ thật từ database (Tây Thạnh, Khuông Việt, Hồ Đắc Di, Tân Kỳ Tân Quý...).
* [x] Liên kết đồng bộ đa tài khoản: Đăng bài, gửi yêu cầu kết nối, phê duyệt yêu cầu trong thời gian thực.

### Giai đoạn 3: Bàn Giao Cơ Sở Vật Chất Cho Chủ Trọ (`/chu-tro`)
* [x] Hệ thống Checklist trang thiết bị (nội thất, đồ điện tử, chỉ số công tơ điện nước).
* [x] Biên bản bàn giao Check-in và Check-out với chữ ký điện tử.
* [ ] Bảng điều khiển tài chính chủ trọ sử dụng tông màu Gold/Navy của Elite Living.

### Giai đoạn 4: Đặt Lịch & Hợp Đồng Điện Tử Cho Khách Thuê
* [ ] Modal Đặt lịch hẹn xem phòng tích hợp lịch chọn ngày giờ sang trọng.
* [ ] Xem hóa đơn điện nước và ký hợp đồng trực tuyến ngay trên nền web.

---

## 🚫 3. QUY ĐỊNH BẮT BUỘC CHO AI: KHÔNG CHẠY DOM / BROWSER SUBAGENT ĐỂ KIỂM THỬ GIAO DIỆN
1. **Tuyệt đối KHÔNG gọi công cụ `browser_subagent` để mở trình duyệt, cào DOM hay chụp ảnh màn hình web**.
2. **Quy trình kiểm thử hợp lệ**:
   - Sử dụng `npx next build` hoặc `npm run build` để kiểm tra compile và type check 100% không có lỗi.
   - Kiểm tra logic code JSX/TSX và API endpoints.
   - Để người dùng trực tiếp trải nghiệm và kiểm thử giao diện thực tế.

---

## 📐 4. CHECKLIST KIỂM ĐỊNH MÀU SẮC CHO MỌI COMMIT/TRANG MỚI

Khi tạo hoặc sửa bất kỳ trang/linh kiện nào, AI phải tự kiểm tra:
1. Nút bấm chính có phải là `bg-[#B89C66]` không? (Nếu có class green/emerald, lập tức sửa lại).
2. Ô input khi click vào có viền `#B89C66` không?
3. Nền trang có phải là `#F8F8F6` không?
4. Tiêu đề chính có phải là `#0F223A` không?
5. Các modal có dùng `bg-[#0F223A]/45 backdrop-blur-sm` không?
