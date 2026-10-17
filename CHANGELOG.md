# Nhật ký cập nhật Elite Living

## 17/10/2026 — Mở rộng dữ liệu TP.HCM, tách phiên đăng nhập và đồng bộ dropdown

Bản cập nhật tổng hợp các thay đổi trong workspace sau commit `37f4383`.

### Giao diện dropdown

- Đồng bộ 32 trường chọn với nền sáng, chữ Navy, viền Champagne, bo góc 14px và trạng thái focus rõ ràng.
- Thêm dấu chọn, nền Champagne nhạt, xoay mũi tên và chuyển động mở/đóng cho danh sách chọn trên trình duyệt hỗ trợ; trình duyệt khác giữ bộ chọn native.
- Thêm `DropdownPanel` dùng chung cho menu tài khoản người thuê, thông báo và tài khoản cổng vận hành; hỗ trợ đóng bằng Escape, bấm ngoài và chuyển focus ra ngoài.
- Menu đóng không nhận tương tác; Escape đưa focus về nút mở; menu thông báo và tài khoản không mở đồng thời.
- Hỗ trợ giảm chuyển động theo thiết lập thiết bị. Giữ nguyên giá trị, validation và nghiệp vụ của các trường chọn một.

### Dữ liệu và tìm kiếm phòng

- Mở rộng bộ dữ liệu seed từ 24 lên 73 tòa nhà, 600 lên 1.335 phòng và 11 lên 27 chủ trọ, thuộc 14 khu vực trong danh mục dự án.
- Đồng bộ `seed_database_complete.json` và `web/src/data/rooms_data.json`; bộ dữ liệu phẳng `seed_rooms_tp_hcm.json` tăng từ 138 lên 285 mục.
- Bổ sung script `web/scripts/extract-ezhouse-hcm.mjs` để tổng hợp dữ liệu và tạo bộ seed. Các con số trên là quy mô dữ liệu dự án, không phải xác nhận tồn kho phòng trực tiếp.
- Mở rộng danh mục khu vực trên trang tìm phòng, ở ghép, quản trị, chủ trọ và footer; bổ sung địa điểm, tuyến đường tham chiếu cho Top-K.
- Sửa so khớp Quận 1 để không lấy nhầm Quận 10 và Quận 12 trong danh sách phòng, tòa nhà và bộ lọc quản trị.
- Seed sử dụng thêm dữ liệu theo lô và bỏ qua bản ghi trùng; không xóa lịch sử tương tác, chỉ seed tương tác khi bảng đang rỗng.

### Xác thực và phân quyền

- Tách cookie/phiên đăng nhập của người thuê và cổng vận hành, thêm endpoint `/api/portal-auth/[...nextauth]` và hàm đăng nhập/đăng xuất riêng cho portal.
- Kiểm tra vai trò và phạm vi phiên trong JWT; từ chối tái sử dụng phiên chủ trọ/quản trị ở giao diện người thuê.
- API dùng chung chọn phiên theo `x-auth-scope`, đồng thời giữ kiểm tra chữ ký cookie, RBAC và quyền sở hữu dữ liệu.
- Middleware cổng vận hành đọc phiên portal; các trang quản trị, chủ trọ và component dùng chung gửi đúng phạm vi phiên.
- Bổ sung kiểm thử tự động cho cookie, token, credentials và kịch bản HTTP cục bộ cho hai phiên đăng nhập.

### Kiểm thử và tài liệu

- Điều chỉnh widget test tải trang chủ mobile để chờ render hoàn tất trước khi kiểm tra trạng thái cuối.
- Web build gần nhất trong cùng phiên làm việc: `npx next build` đạt, gồm TypeScript và sinh 35/35 trang. Sau build chỉ bổ sung tài liệu và quy tắc Git ignore.
- ESLint component `DropdownPanel.tsx` đạt.
- Chạy lại bộ unit test phạm vi xác thực: 3/3 đạt.
- Chạy lại widget test tải trang chủ mobile: 3/3 đạt.
- Kiểm tra JSON: hai bộ dữ liệu đầy đủ khớp nhau; không trùng ID; giữ các ID đã có; tham chiếu phòng/tòa nhà/chủ trọ và người dùng/tương tác hợp lệ.
- Không chạy browser/DOM/screenshot, không chạy lại toàn bộ E2E nghiệp vụ hoặc ghi dữ liệu lên database trong lần chuẩn bị đẩy GitHub này.
- Cảnh báo Next.js về quy ước `middleware` cũ vẫn còn. Giao diện danh sách native được tăng cường tùy hỗ trợ trình duyệt.
- Bổ sung ignore cho `web/.data/` để dữ liệu thông báo phát sinh cục bộ không đi vào Git; giữ nguyên file trên máy. Không đưa `.env`, thư viện cài đặt và thư mục build vào bản cập nhật.

### Khi nhận bản cập nhật

- Cập nhật mã nguồn và dùng cấu hình môi trường riêng theo hướng dẫn hiện có của dự án.
- Phiên cổng vận hành cũ có thể cần đăng nhập lại để nhận cookie riêng.
- Cập nhật GitHub chỉ đưa mã nguồn và bộ seed lên repository; không tự triển khai website hoặc đồng bộ database đang chạy. Script seed bỏ qua bản ghi đã có, không ghi đè chúng.
