# Kịch bản UAT — Elite Living

Ngày chuẩn bị: 27/10/2026. Các ca có “Chờ người dùng” cần nhóm thao tác trên trình duyệt/điện thoại thật và điền cột kết quả; agent không mở browser theo `AGENTS.md`.

| Mã | Vai trò | Bước kiểm thử | Dữ liệu | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|---|---|
| UAT-ADM-01 | Admin | Đăng nhập, đổi mật khẩu với mật khẩu cũ sai/đúng | Admin demo | Sai bị từ chối; đúng cập nhật thành công | Chờ người dùng |
| UAT-ADM-02 | Admin | Duyệt tin mới của chủ trọ | Tin `PENDING` | Tin thành `APPROVED`, xuất hiện tìm kiếm/Top-K | Chờ người dùng |
| UAT-LAN-01 | Chủ trọ | Tạo và sửa khu trọ | Địa chỉ/tọa độ TP.HCM | Khu trọ chỉ thuộc tài khoản hiện tại | Chờ người dùng |
| UAT-LAN-02 | Chủ trọ | Thử gắn phòng vào mã khu trọ chủ khác | `projectCode` của chủ khác | HTTP 403, không ghi dữ liệu | Đã kiểm bằng unit test |
| UAT-LAN-03 | Chủ trọ | Mở chuông sau khi khách yêu cầu gia hạn | Hợp đồng ACTIVE | Thấy `CONTRACT_RENEWAL_REQUEST` | Chờ người dùng |
| UAT-TEN-01 | Người thuê | Lọc giá + GPS/bán kính + Wifi/Máy lạnh | ≤5 triệu, 3 km | Mọi kết quả thỏa cả ba điều kiện | Đã kiểm logic; chờ UI |
| UAT-TEN-02 | 20 khách | Đặt cùng phòng/ngày/giờ | Phòng #1, 23/11/2026, 10:30 | 1 thành công, 19 HTTP 409 | Đạt 1/19 ngày 27/10/2026 |
| UAT-TEN-03 | Người thuê | Thanh toán, chủ trọ xác nhận | Hóa đơn UNPAID | Thành PAID và nhận biên lai | Chờ người dùng |
| UAT-MOB-01 | Mobile | Chủ trọ xác nhận lịch/lập hóa đơn/check-in | Firebase thật | Thiết bị nhận FCM và hộp thư có bản ghi | Chờ cấu hình Firebase |
| UAT-EXT-01 | Hai người thuê | Đăng bài/gửi/duyệt yêu cầu ở ghép | Hai tài khoản thật | Hai phía thấy trạng thái đồng bộ | Chờ người dùng |
