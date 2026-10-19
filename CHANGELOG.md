# Nhật ký cập nhật Elite Living

## 20/10/2026 — Hoàn tất kiểm chứng tối ưu tải dữ liệu

- Bản mã cuối vượt qua build production, kiểm tra TypeScript và sinh 35/35 trang. Bộ kiểm thử tối ưu tải dữ liệu đạt 6/6; ghi nhận đầy đủ kết quả tại `ROADMAP_AUDIT_REPORT.md`.
- Số đo hiệu năng bên dưới được lấy ngày 19/10 trên dev server cục bộ; chưa phải benchmark p95 hay phép đo thời gian hiển thị toàn trang.

## 19/10/2026 — Tối ưu tải danh sách và gợi ý phòng

- Trang chủ chỉ tải chế độ đang xem; bỏ yêu cầu tòa nhà trùng và tải phòng lẻ ngầm. Bộ lọc được gộp trong 250–300ms, hủy yêu cầu cũ và chặn phản hồi cũ ghi đè kết quả mới.
- Thêm chế độ `summary=true` cho API tòa nhà: 73 thẻ chỉ cần khoảng 68KB JSON trong lần đo cuối. Chi tiết phòng và bộ ảnh đầy đủ tải khi mở tòa nhà; API mặc định vẫn giữ dữ liệu đầy đủ cho các nơi đang sử dụng.
- Chi tiết tòa nhà truy vấn trực tiếp theo mã. Bản đồ chỉ tải danh sách toàn khu vực khi cần, có trạng thái đang tải/lỗi/thử lại.
- Gợi ý Top-K lấy các trường cần chấm điểm trước, tải thông tin đầy đủ sau khi chọn ứng viên; giữ công thức xếp hạng và đối soát lại trạng thái AVAILABLE trước khi trả dữ liệu. Bộ nhớ đệm 20 giây gộp yêu cầu đồng thời và xử lý an toàn khi bị vô hiệu hóa.
- Giữ kết quả cũ kèm thông báo trong lúc cập nhật; thêm giới hạn chờ 20 giây và nút thử lại. Không hiển thị lỗi mạng như một kết quả tìm kiếm rỗng thành công.
- Đo HTTP trên dev server hiện tại: trước sửa, tòa nhà và Top-K hết hạn chờ 60 giây; lần đo cuối sau sửa lần lượt 2,268 giây và 0,988 giây; chi tiết một tòa nhà 0,810 giây. Đây là các mẫu đo cục bộ, không phải p95 hoặc cam kết tốc độ cho mọi môi trường.
- Kiểm tra: 6/6 unit tests và các đối soát HTTP danh sách/chi tiết/bộ lọc/gợi ý đạt; không chạy browser/DOM hoặc ghi database. Chi tiết kiểm chứng tại `ROADMAP_AUDIT_REPORT.md`.

## 19/10/2026 — Chạy web từ thư mục gốc

- Thêm `package.json` gốc chuyển tiếp `npm run dev`, `npm run build` và `npm start` vào `web`, khắc phục lỗi ENOENT khi chạy lệnh ở `KLCN`.
- Bổ sung hướng dẫn trong README. Không chuyển dependencies hay cấu hình môi trường ra khỏi `web`.
- Đã chạy thử lệnh dev từ thư mục gốc trên cổng 3210: Next.js báo Ready, trang chủ trả HTTP 200. Phiên thử được dừng sau kiểm tra.

## 19/10/2026 — Chuyển động khi cuộn và kéo lướt

- Trang chủ, danh sách ở ghép và chi tiết phòng: tiêu đề, thẻ nội dung/phòng xuất hiện nhẹ khi vào vùng nhìn, có độ trễ ngắn giữa các thẻ; mỗi phần tử chỉ chạy một lần trong lượt gắn trang.
- Thêm thanh tiến độ cuộn mảnh màu Champagne và cuộn mượt tới các mục trên trang. Cấu hình Next.js để chuyển trang vẫn khôi phục vị trí cuộn đúng cách.
- Bộ lọc khu vực và phong cách sống có thể kéo ngang bằng chuột với quán tính nhẹ, vuốt cảm ứng, dùng phím mũi tên hoặc nút điều hướng. Có chỉ dẫn kéo và trạng thái nút ở hai đầu; ngăn click nhầm sau thao tác kéo chuột.
- Tôn trọng cài đặt giảm chuyển động: tắt hiệu ứng xuất hiện, thanh tiến độ và quán tính chuột; cuộn theo nút/link chuyển sang tức thời. Vuốt cảm ứng dùng hành vi gốc của trình duyệt.
- Bộ ảnh phòng không đổi ảnh khi trình duyệt hủy cử chỉ để cuộn dọc; không sử dụng vận tốc cũ sau khi giữ chuột/ngón tay lâu trước khi thả.
- Nội dung vẫn hiển thị khi JavaScript chưa chạy; không thêm thư viện chuyển động, không đổi API, dữ liệu hay nghiệp vụ đặt lịch.
- Kiểm tra: build + TypeScript đạt, tạo 35/35 trang; ESLint hai component mới và `TenantJourney` đạt; `git diff --check` đạt. Không chạy trình duyệt/DOM theo chỉ thị dự án. Cảnh báo `middleware` cũ của Next.js vẫn tồn tại.

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
