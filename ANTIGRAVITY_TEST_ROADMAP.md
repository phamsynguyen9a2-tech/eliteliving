# CHỈ THỊ VẬN HÀNH: E2E AUTOMATION TEST & NON-DESTRUCTIVE SELF-HEALING AGENT
# DỰ ÁN: XÂY DỰNG HỆ THỐNG QUẢN LÝ NHÀ TRỌ PHÒNG TRỌ TRỰC TUYẾN (MÃ: CNTT-KLCN111)

## 1. NGUYÊN TẮC BẢO TỒN MÃ NGUỒN (STRICT CODE PRESERVATION RULES)
⚠️ ĐÂY LÀ QUY TẮC BẮT BUỘC CÓ ĐỘ ƯU TIÊN CAO NHẤT. VI PHẠM SẼ BỊ COI LÀ THẤT BẠI:
1. TUYỆT ĐỐI KHÔNG XÓA (NEVER DELETE): Agent không được phép xóa bất kỳ file, class, method, endpoint API, route hoặc component giao diện nào đã tồn tại trong dự án, đặc biệt là các tính năng mở rộng/tùy biến do tác giả tự phát triển.
2. KHÔNG CẮT GIẢM ĐỂ PASS TEST (NO MOCK-OUT OR DOWNGRADE): Không được comment out assertion, không biến logic thực tế thành stub/mock tĩnh, không gỡ bỏ validation chỉ để bài kiểm thử vượt qua.
3. CƠ CHẾ SỬA LỖI KHÔNG PHÁ VỠ (NON-DESTRUCTIVE PATCHING):
   - Nếu phát hiện lỗi giao tiếp/đồng bộ: Chỉ sửa đổi phần mapping dữ liệu, kiểu dữ liệu (DTO), tham số hoặc logic chuyển trạng thái.
   - Giữ nguyên chữ ký hàm (Function Signature) và logic mở rộng hiện có của người phát triển; chỉ bổ sung xử lý ngoại lệ (Exception Handling) hoặc điều chỉnh câu truy vấn/giao thức.
   - Nếu một đoạn code tùy biến xung đột với luồng chuẩn, Agent phải viết adapter/wrapper bọc lại thay vì xóa code cũ.

---

## 2. DANH MỤC NGHIỆP VỤ ĐỐI SOÁT THEO ĐỀ CƯƠNG CNTT-KLCN111
Agent phải kiểm thử theo danh mục nghiệp vụ được quy định trong đề cương:

### A. Phân hệ Xác thực & Phân quyền (RBAC - JWT/Session)
- [ ] UC-AUTH-01: Đăng ký, đăng nhập, đăng xuất, đổi mật khẩu.
- [ ] UC-AUTH-02: Kiểm soát truy cập API theo 3 vai trò: Admin, Chủ trọ (Landlord), Người thuê (Tenant). Ngăn chặn truy cập chéo trái phép.

### B. Phân hệ Quản trị (Web Admin)
- [ ] UC-ADM-01: Quản lý định danh người dùng; khóa/mở tài khoản vi phạm.
- [ ] UC-ADM-02: Kiểm duyệt tin đăng của chủ trọ: thẩm định tính hợp lệ của thông tin phòng, tọa độ GPS/vị trí, bảng giá thuê, diện tích, tiện ích và hình ảnh thực tế trước khi công khai.
- [ ] UC-ADM-03: Giám sát vòng đời thuê: hợp đồng điện tử, bảng kê chỉ số, hóa đơn điện nước định kỳ và lịch sử thanh toán giả lập.
- [ ] UC-ADM-04: Dashboard thống kê trực quan: tỷ lệ lấp đầy phòng trống, doanh thu ước tính theo khu vực, khu vực nhu cầu cao và phòng được quan tâm.
- [ ] UC-ADM-05: Giám sát mô-đun gợi ý: thống kê tỷ lệ click-through và chuyển đổi sang đặt lịch xem phòng.

### C. Phân hệ Vận hành (Web Chủ trọ)
- [ ] UC-LAN-01: Khởi tạo/cập nhật danh mục khu trọ, phòng trọ (CRUD), đơn giá, tiện ích, vị trí tọa độ.
- [ ] UC-LAN-02: Thiết lập khung giờ rảnh để khách đặt lịch; tiếp nhận, duyệt hoặc hủy lịch hẹn.
- [ ] UC-LAN-03: Ghi nhận chỉ số điện nước định kỳ, tự động tính toán xuất hóa đơn hàng tháng.
- [ ] UC-LAN-04: Quản lý vòng đời hợp đồng thuê và danh sách khách thuê.

### D. Phân hệ Người thuê (Web Portal & Mobile App)
- [ ] UC-TEN-01: Đăng ký/thiết lập hồ sơ nhu cầu cá nhân; tìm kiếm/lọc đa tiêu chí (ngân sách, bán kính, tiện ích).
- [ ] UC-TEN-02: Xem chi tiết phòng, vị trí bản đồ số (Geocoding/Maps); đặt lịch xem phòng trực tuyến.
- [ ] UC-TEN-03: Đăng ký thuê, tạo/ký hợp đồng điện tử và thanh toán hóa đơn giả lập.
- [ ] UC-TEN-04: Đánh giá và gửi phản hồi sau khi thuê.
- [ ] UC-TEN-05: Nhận thông báo đẩy (Push Notification/FCM) khi thay đổi trạng thái lịch xem, hợp đồng, hóa đơn.

### E. Hai nghiệp vụ phức tạp trọng tâm (Bắt buộc kiểm thử chuyên sâu)
- [ ] UC-CORE-01: GỢI Ý TOP-K CÁ NHÂN HÓA:
  - Kiểm tra Cold-Start bằng Weighted Rule-Based Scoring (giá trần, bán kính, tiện ích).
  - Kiểm tra tương tác bằng Content-Based Filtering (Cosine Similarity + khoảng cách Haversine).
  - Xác thực ngưỡng hiệu năng: Thời gian phản hồi API gợi ý p95 < 500ms.
  - Ngăn chặn triệt để việc gợi ý phòng chưa được Admin duyệt (`PENDING`/`REJECTED`) hoặc phòng đã đủ người (`RENTED`).
- [ ] UC-CORE-02: ĐẶT LỊCH XEM PHÒNG & KIỂM SOÁT TƯƠNG TRANH (CONCURRENCY CONTROL):
  - Chạy kịch bản 2 Người thuê cùng đặt chung một khung giờ trên 1 phòng trọ: Hệ thống bắt buộc phải khóa (Lock) và báo trùng lịch đối với yêu cầu đến sau.
  - Kiểm tra máy trạng thái tự động (Finite State Machine):
    `Còn trống` ➔ `Đã đặt lịch` ➔ `Giữ chỗ` ➔ `Đang thuê`.
  - Kiểm tra đồng bộ dữ liệu tức thời qua RESTful API và WebSocket/FCM giữa Web Admin, Web Chủ trọ và Web/Mobile Người thuê.

### F. Phân hệ Tính năng tự tạo / Mở rộng (Custom Features)
- [ ] CUSTOM-EXT: Quét toàn bộ các router, controller, service không nằm trong danh mục trên để lập danh sách kiểm thử độc lập, đảm bảo giữ nguyên vẹn logic nghiệp vụ mở rộng.

---

## 3. MA TRẬN KIỂM THỬ ĐỒNG BỘ 3 BÊN (CROSS-ROLE E2E MATRIX)

Agent phải chạy các kịch bản liên hoàn giữa 3 vai trò:

| Bước | Hành động | Vai trò thực hiện | Hệ thống đồng bộ đích | Điều kiện nghiệm thu (Assertion) |
|---|---|---|---|---|
| Step 1 | Đăng tin phòng mới | Chủ trọ | Web Admin, DB | DB lưu trạng thái `PENDING`. Khách thuê tìm kiếm KHÔNG thấy. |
| Step 2 | Duyệt tin đăng | Admin | Web Chủ trọ, Mobile/Web Khách | Trạng thái chuyển thành `APPROVED`. Phòng xuất hiện trên tìm kiếm & Top-K. |
| Step 3 | Đặt lịch xem phòng | Khách thuê A | Web Chủ trọ | Chủ trọ nhận thông báo/thấy lịch ở trạng thái `WAITING_CONFIRM`. |
| Step 4 | Tranh chấp giờ xem | Khách thuê B | Client B | Khách B cố đặt cùng giờ với Khách A -> Hệ thống báo lỗi Conflict (409). |
| Step 5 | Xác nhận lịch & Giữ chỗ | Chủ trọ | Mobile Khách A, Web Admin | Phòng đổi trạng thái `Đã đặt lịch` / `Giữ chỗ`. FCM gửi thông báo về máy Khách A. |
| Step 6 | Lập hợp đồng & Hóa đơn | Chủ trọ | Khách thuê, Admin | Trạng thái phòng thành `Đang thuê`. Số phòng trống giảm 1. Admin cập nhật tỷ lệ lấp đầy. |

---

## 4. QUY TRÌNH PHÁT HIỆN & TỰ ĐỘNG SỬA LỖI (SAFE SELF-HEALING PROTOCOL)

Khi một ca kiểm thử thất bại (Assertion Failed):
1. **Cô lập nguyên nhân:**
   - Xem log máy chủ, mã phản hồi HTTP, payload JSON và truy vấn Database.
   - Xác định lỗi do: Thiếu dữ liệu, sai câu lệnh SQL/ORM, sai logic trạng thái, hay lỗi giao diện.
2. **Kiểm tra vùng an toàn (Safety Check):**
   - Xác định file chứa lỗi có thuộc phần tính năng tự tạo (Custom Features) hay không.
   - Nếu là tính năng tự tạo: CHỈ sửa lỗi cú pháp, lỗi interface/DTO không tương thích; KHÔNG ĐƯỢC XÓA bỏ tính năng.
3. **Thực hiện bản vá (Non-Destructive Patch):**
   - Tiến hành sửa đổi mã nguồn một cách tối thiểu, chính xác.
   - Thêm xử lý đồng bộ giao dịch (Transaction Rollback, Concurrency Lock) nếu lỗi liên quan đến đặt lịch hoặc trạng thái phòng.
4. **Kiểm thử hồi quy (Regression Test):**
   - Chạy lại bài test bị fail.
   - Chạy lại TOÀN BỘ các bài test của 3 phân hệ để chắc chắn việc sửa chữa không làm hỏng tính năng khác.

---

## 5. ĐỊNH DẠNG BÁO CÁO: `ROADMAP_AUDIT_REPORT.md`

Sau khi hoàn tất toàn bộ chu trình, Agent tạo file `ROADMAP_AUDIT_REPORT.md` theo cấu trúc sau:

# BÁO CÁO TOÀN DIỆN: KIỂM THỬ HỆ THỐNG VÀ TỰ ĐỘNG KHẮC PHỤC
*Căn cứ theo Đề cương chi tiết Khóa luận tốt nghiệp CNTT-KLCN111*

## 1. TỔNG KẾT THỰC THI
- Tổng số Use Case kiểm thử: [Số lượng]
- Đạt chuẩn ban đầu: [Số lượng]
- Lỗi logic/đồng bộ phát hiện và ĐÃ TỰ SỬA THÀNH CÔNG: [Số lượng]
- Tính năng tự tạo (Custom) được bảo toàn: 100% (Không xóa bất kỳ tính năng nào)

## 2. BẢNG ĐỐI SOÁT CHI TIẾT THEO ĐỀ CƯƠNG
| Mã UC | Tên tính năng | Vai trò | Trạng thái | Hành động khắc phục | Mức độ đồng bộ |
|---|---|---|---|---|---|
| UC-ADM-02 | Duyệt tin phòng trọ | Admin <-> Landlord | PASSED | Không | Realtime API |
| UC-CORE-01| Thuật toán Top-K (Cold-Start & Content-Based) | Tenant | PASSED | Đã tối ưu truy vấn Haversine | Đạt p95 < 500ms |
| UC-CORE-02| Concurrency Control khi đặt lịch | Tenant <-> Landlord | PASSED | Thêm Pessimistic/Optimistic Lock | Ngăn trùng lịch 100% |
| CUSTOM-XX | [Tên tính năng tự chế của bạn] | [Vai trò] | PASSED | Giữ nguyên code, fix tương thích | Đạt yêu cầu |

## 3. NHẬT KÝ CHI TIẾT CÁC LỖI ĐÃ TỰ ĐỘNG SỬA (SELF-HEALED LOGS)
### [BUG-ID]: [Tên ngắn gọn]
- **Vị trí file:** `đường/dẫn/file`
- **Hiện tượng:** [Lỗi logic, mất đồng bộ hay tranh chấp dữ liệu]
- **Nguyên nhân kỹ thuật:** [Phân tích chi tiết]
- **Mã nguồn can thiệp (Diff):**
  ```diff
  - code_cu
  + code_moi
  ```
- **Cam kết bảo toàn:** [Xác nhận không làm ảnh hưởng đến các hàm/tính năng tự tạo lân cận]
- **Kết quả kiểm thử lại:** PASSED
