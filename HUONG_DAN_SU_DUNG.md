# Hướng dẫn sử dụng Elite Living

## Tài khoản và môi trường demo

Khởi động web bằng `npm run dev` ở thư mục gốc hoặc `npm run dev` trong `web`. Chế độ demo chỉ dùng ở máy phát triển. Admin mẫu: `admin@eliteliving.vn` / `admin123`. Chủ trọ chưa được cấp mật khẩu riêng có thể dùng `123456` khi `ENABLE_DEMO_LOGIN=true`. Người thuê nên đăng ký tài khoản mới để dữ liệu lịch hẹn, cọc và hợp đồng gắn đúng tài khoản.

## Người thuê web và mobile

1. Đăng ký/đăng nhập, vào Hồ sơ nhu cầu để lưu ngân sách, vị trí, bán kính và tiện ích.
2. Tại trang tìm phòng, kết hợp khu vực, giá, bán kính quanh vị trí hiện tại và nhiều tiện ích bắt buộc. Chỉ tin đã duyệt và phòng còn nhận lịch mới được hiển thị.
3. Mở chi tiết phòng, chọn khung giờ chủ trọ cho phép và gửi lịch xem. Nếu người khác vừa đặt cùng phòng/ngày/giờ, hệ thống trả 409 và yêu cầu chọn giờ khác.
4. Theo dõi lịch trong Hồ sơ; sau khi giữ chỗ có thể gửi cọc mô phỏng, ký hợp đồng điện tử, xem biên bản bàn giao và hóa đơn.
5. Mobile có cùng tài khoản, thêm tìm gần GPS và hộp thư/FCM. FCM chỉ hoạt động khi nhóm cấu hình Firebase thật.

## Chủ trọ

1. Đăng nhập `/portal/login`, vào tab **Khu trọ** để tạo/cập nhật địa chỉ, tọa độ, ảnh và tiện ích chung; sau đó thêm phòng vào đúng khu trọ của mình.
2. Tin phòng mới/sửa nội dung quan trọng chuyển sang chờ Admin duyệt. Chủ trọ không thể gắn phòng vào mã khu trọ của tài khoản khác.
3. Thiết lập Khung giờ đón khách, duyệt/hủy/hoàn tất lịch xem và theo dõi chuông thông báo, gồm yêu cầu gia hạn hợp đồng.
4. Lập hợp đồng, nhận phòng, ghi điện nước và lập hóa đơn lẻ/hàng loạt. “Tự động” hiện tại là tự lấy chỉ số cũ và tự tính tiền; thao tác tạo hóa đơn vẫn do chủ trọ xác nhận.
5. Khi đổi hóa đơn sang Đã thanh toán, hệ thống gửi biên lai vào hộp thư người thuê. Đổi mật khẩu tại tab Doanh thu, Cư dân & Bảo trì.

## Quản trị viên

1. Duyệt tin theo 6 tiêu chí: thông tin, tọa độ, giá, diện tích, tiện ích và ảnh.
2. Quản lý khu trọ/phòng/tài khoản, khóa tài khoản vi phạm và theo dõi lịch hẹn, hợp đồng, hóa đơn.
3. Mở Chất lượng gợi ý để xem CTR/chuyển đổi và kết quả đánh giá. Đổi mật khẩu trong menu tài khoản; hệ thống bắt buộc kiểm mật khẩu hiện tại.
4. Chuẩn bị demo bằng thao tác qua giao diện: một tin chờ duyệt, một đánh giá thật sau trải nghiệm, và vài hợp đồng ở nhiều quận. Mọi dữ liệu mô phỏng phải ghi nhãn trong báo cáo.

## Ở ghép

Người A đăng bài; người B gửi yêu cầu kèm SĐT/lời nhắn. Người A xem yêu cầu nhận được và chấp nhận/từ chối/liên hệ; người B thấy trạng thái cập nhật tại `/o-ghep/ho-so`.

Ảnh minh họa cần được nhóm chụp trên thiết bị thật trước khi nộp báo cáo, vì quy tắc dự án không cho phép agent tự mở trình duyệt/chụp DOM.
