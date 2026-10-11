# CHỈ THỊ E2E AUTOMATION TEST & NON-DESTRUCTIVE SELF-HEALING AGENT
# DỰ ÁN: XÂY DỰNG HỆ THỐNG QUẢN LÝ NHÀ TRỌ PHÒNG TRỌ TRỰC TUYẾN (MÃ: CNTT-KLCN111)

> **THAM CHIẾU BẮT BUỘC**: `ANTIGRAVITY_TEST_ROADMAP.md` tại thư mục gốc của dự án.

## 1. NGUYÊN TẮC BẢO TỒN MÃ NGUỒN TUYỆT ĐỐI (STRICT CODE PRESERVATION RULES)
⚠️ **ĐÂY LÀ QUY TẮC CÓ ĐỘ ƯU TIÊN CAO NHẤT. VI PHẠM SẼ BỊ COI LÀ THẤT BẠI**:
1. **TUYỆT ĐỐI KHÔNG XÓA (NEVER DELETE)**: Agent không được phép xóa bất kỳ file, class, method, endpoint API, route hoặc component giao diện nào đã tồn tại trong dự án, đặc biệt là các tính năng mở rộng/tùy biến do tác giả tự phát triển (như hệ thống ở ghép `/o-ghep`, biên bản bàn giao `/handover`, chống spam, v.v.).
2. **KHÔNG CẮT GIẢM ĐỂ PASS TEST (NO MOCK-OUT OR DOWNGRADE)**: Không được comment out assertion, không biến logic thực tế thành stub/mock tĩnh, không gỡ bỏ validation chỉ để bài kiểm thử vượt qua.
3. **CƠ CHẾ SỬA LỖI KHÔNG PHÁ VỠ (NON-DESTRUCTIVE PATCHING)**:
   - Nếu phát hiện lỗi giao tiếp/đồng bộ: Chỉ sửa đổi phần mapping dữ liệu, kiểu dữ liệu (DTO), tham số hoặc logic chuyển trạng thái.
   - Giữ nguyên chữ ký hàm (Function Signature) và logic mở rộng hiện có của người phát triển; chỉ bổ sung xử lý ngoại lệ (Exception Handling) hoặc điều chỉnh câu truy vấn/giao thức.
   - Nếu một đoạn code tùy biến xung đột với luồng chuẩn, Agent phải viết adapter/wrapper bọc lại thay vì xóa code cũ.

---

## 2. MA TRẬN ĐỒNG BỘ 3 BÊN (CROSS-ROLE E2E MATRIX)
Mọi ca kiểm thử phải bao quát luồng dữ liệu liên hoàn giữa 3 vai trò:
- **Chủ trọ (Landlord)**: Đăng tin, quản lý phòng, cài đặt giờ rảnh, duyệt lịch hẹn, hợp đồng, hóa đơn điện nước.
- **Admin**: Kiểm duyệt tin đăng (`PENDING` -> `APPROVED`), giám sát vòng đời thuê, dashboard tỷ lệ lấp đầy & doanh thu, giám sát gợi ý Top-K.
- **Khách thuê (Tenant)**: Tìm kiếm lọc đa tiêu chí, gợi ý Top-K cá nhân hóa, đặt lịch xem phòng với Concurrency Control chống trùng giờ (409 Conflict), ký hợp đồng điện tử, thanh toán, hồ sơ cá nhân.

---

## 3. KẾT XUẤT BÁO CÁO: `ROADMAP_AUDIT_REPORT.md`
Sau khi thực hiện quy trình kiểm thử và tự phục hồi, Agent luôn lập báo cáo chi tiết vào file `ROADMAP_AUDIT_REPORT.md` tại thư mục gốc, bao gồm bảng đối soát các mã UC và nhật ký chi tiết các bản vá tự động.
