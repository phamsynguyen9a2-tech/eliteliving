# AGENTS RULES & PROJECT DIRECTIVES — ELITE LIVING (NHATROTOP)

## 1. 🚫 RÀNG BUỘC KIỂM THỬ: TUYỆT ĐỐI KHÔNG CHẠY DOM / BROWSER SUBAGENT
- **Quy tắc bất biến**: AI **KHÔNG ĐƯỢC PHÉP** gọi công cụ `browser_subagent` để mở trình duyệt, cào DOM hay chụp màn hình website nhằm mục đích kiểm thử hoặc kiểm tra giao diện.
- **Lý do**: Yêu cầu trực tiếp từ người dùng nhằm tránh lãng phí token, tránh làm chậm hệ thống, và giữ môi trường máy phát triển ổn định.
- **Phương pháp kiểm thử thay thế hợp chuẩn**:
  - Chạy `npx next build` (hoặc `npm run build`) để kiểm tra compile, routing, và type checking tĩnh.
  - Phân tích mã nguồn TypeScript / React trực tiếp.
  - Người dùng sẽ tự mở và kiểm tra giao diện trên trình duyệt thực tế của họ.

## 2. 🎨 BẢNG MÀU THƯƠNG HIỆU ELITE LIVING (ROADMAP CHỦ ĐẠO)
- **Primary Accent (Vàng Champagne)**: `#B89C66`, Hover `#A38752`, Shadow `shadow-[#B89C66]/25`. Dùng cho tất cả nút bấm chính, tab active, viền focus, highlight.
- **Deep Navy**: `#0F223A`. Dùng cho typography tiêu đề, navbar, modal backdrop (`bg-[#0F223A]/45 backdrop-blur-sm`).
- **Canvas Nền**: `#F8F8F6` (Kem ngà sang trọng).
- **Viền Slate**: `#E5E3DE`.
- **CẤM KỴ**: Tuyệt đối **KHÔNG SỬ DỤNG MÀU XANH LÁ CÂY** (`#00875A`, `#059669`, emerald, green) làm màu nút hay màu chủ đạo trên toàn hệ thống.

## 3. 🌐 FONT CHỮ VÀ TIẾNG VIỆT
- Toàn bộ website sử dụng **Google Inter** với đầy đủ các bộ ký tự `subsets: ["latin", "vietnamese"]` trong `layout.tsx` và `globals.css`.
- Đảm bảo hiển thị trơn tru, không bị lỗi dấu tiếng Việt trên bất kỳ thiết bị nào.

## 4. 🔄 ĐỒNG BỘ ĐA TÀI KHOẢN TÍNH NĂNG Ở GHÉP (`/o-ghep`)
- Người dùng A đăng bài tìm bạn ở ghép -> dữ liệu lưu vào store & database.
- Người dùng B xem bài đăng của A -> có thể gửi yêu cầu kết nối kèm SĐT và lời nhắn.
- Người dùng A vào `/o-ghep/ho-so` -> thấy ngay danh sách yêu cầu nhận được từ B, có thể chấp nhận/từ chối/liên hệ qua Zalo hoặc SĐT.
- Người dùng B vào `/o-ghep/ho-so` -> xem được trạng thái yêu cầu của mình được cập nhật theo thời gian thực.

## 5. 🛡️ CHỈ THỊ VẬN HÀNH: E2E AUTOMATION TEST & NON-DESTRUCTIVE SELF-HEALING
- **Tài liệu gốc bắt buộc**: Xem chi tiết tại [ANTIGRAVITY_TEST_ROADMAP.md](ANTIGRAVITY_TEST_ROADMAP.md) ở thư mục gốc.
- **Quy tắc bảo tồn mã nguồn tuyệt đối (Strict Code Preservation)**:
  1. **TUYỆT ĐỐI KHÔNG XÓA**: Không xóa bất kỳ file, class, method, endpoint API, route hoặc component giao diện nào đã tồn tại trong dự án, đặc biệt là các tính năng mở rộng/tùy biến do tác giả phát triển.
  2. **KHÔNG CẮT GIẢM ĐỂ PASS TEST**: Không comment out assertion, không biến logic thực tế thành stub/mock tĩnh, không gỡ bỏ validation chỉ để bài test vượt qua.
  3. **CƠ CHẾ SỬA LỖI KHÔNG PHÁ VỠ (NON-DESTRUCTIVE)**: Chỉ sửa đổi mapping dữ liệu, DTO, tham số hoặc logic chuyển trạng thái; giữ nguyên chữ ký hàm (Function Signature). Nếu code tùy biến xung đột với luồng chuẩn, Agent phải viết adapter/wrapper bọc lại thay vì xóa code cũ.
- **Nghiệp vụ đối soát theo Đề cương CNTT-KLCN111**:
  - Phân hệ A: Xác thực & Phân quyền (RBAC - Admin, Landlord, Tenant).
  - Phân hệ B: Web Admin (Kiểm duyệt tin, vòng đời thuê, dashboard thống kê, giám sát gợi ý).
  - Phân hệ C: Web Chủ trọ (CRUD phòng, lịch rảnh, điện nước hóa đơn, hợp đồng).
  - Phân hệ D: Web Khách thuê & Mobile App (Tìm kiếm lọc đa tiêu chí, xem chi tiết, đặt lịch, hợp đồng điện tử, thanh toán, FCM).
  - Phân hệ E: 2 Nghiệp vụ phức tạp trọng tâm:
    - UC-CORE-01: Gợi ý Top-K cá nhân hóa (Cold-Start Weighted Rule-Based + Content-Based Cosine/Haversine, p95 < 500ms).
    - UC-CORE-02: Đặt lịch xem phòng & Kiểm soát tương tranh Concurrency Control (Lock chống trùng lịch 409, FSM Còn trống -> Đã đặt lịch -> Giữ chỗ -> Đang thuê).
  - Phân hệ F: Bảo toàn 100% các tính năng tùy biến/mở rộng (Custom Features).
- **Kết xuất báo cáo**: Sau mỗi chu trình kiểm thử và tự động khắc phục, kết xuất báo cáo hoàn chỉnh ra file `ROADMAP_AUDIT_REPORT.md`.
