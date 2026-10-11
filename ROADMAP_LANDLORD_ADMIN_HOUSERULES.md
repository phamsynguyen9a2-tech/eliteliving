# LỘ TRÌNH PHÁT TRIỂN CHI TIẾT (ROADMAP): PHÂN HỆ CHỦ TRỌ, ADMIN & QUY CHẾ NỘI QUY HỢP ĐỒNG HIỆN HÀNH
**Dự án:** Hệ Thống Quản Lý & Gợi Ý Phòng Trọ Trực Tuyến Elite Living (NhaTroTop)  
**Mã đề cương:** CNTT-KLCN111 | Khóa luận tốt nghiệp Đại học Công Thương TP.HCM (HUIT)  
**Phiên bản:** Roadmap v3.0 (Cập nhật tiêu chuẩn PCCC & Quy định pháp lý nhà trọ 2026)  

---

## MỤC LỤC TỔNG QUAN
1. [Tầm nhìn & Mục tiêu kiến trúc](#1-tầm-nhìn--mục-tiêu-kiến-trúc)
2. [Bộ Quy Chế Nội Quy Nhà Trọ & Hợp Đồng Thuê Chuẩn Hiện Hành (2024 - 2026)](#2-bộ-quy-chế-nội-quy-nhà-trọ--hợp-đồng-thuê-chuẩn-hiện-hành-2024---2026)
3. [Roadmap Phát Triển Phân Hệ Web Chủ Trọ (/chu-tro)](#3-roadmap-phát-triển-phân-hệ-web-chủ-trọ-chu-tro)
4. [Roadmap Phát Triển Phân Hệ Web Admin (/admin)](#4-roadmap-phát-triển-phân-hệ-web-admin-admin)
5. [Cơ chế Tương Tranh, Bảo Mật & Pháp Lý Số](#5-cơ-chế-tương-tranh-bảo-mật--pháp-lý-số)
6. [Kế hoạch Triển khai & Tiêu chuẩn Nghiệm thu (Acceptance Criteria)](#6-kế-hoạch-triển-khai--tiêu-chuẩn-nghiệm-thu-acceptance-criteria)

---

## 1. TẦM NHÌN & MỤC TIÊU KIẾN TRÚC

Hệ thống Elite Living định vị là nền tảng quản lý lưu trú và căn hộ dịch vụ cao cấp thế hệ mới, giải quyết triệt để 3 bài toán lớn hiện nay của thị trường bất động sản cho thuê tại TP.HCM:
1. **Minh bạch hóa & Pháp lý hóa**: Loại bỏ hợp đồng giấy viết tay dễ thất lạc, thay bằng **Hợp đồng điện tử ký số** tích hợp **Bộ nội quy chuẩn PCCC & An ninh trật tự mới nhất**.
2. **Khép kín vòng đời khách thuê**: Từ lúc tìm phòng, đặt lịch xem (chống trùng lịch 409 Conflict), lập biên bản bàn giao CSVC khi check-in, chốt chỉ số điện nước tự động, đến thanh lý hợp đồng và hoàn trả tiền cọc.
3. **Giám sát trung tâm tập trung (Centralized Administration)**: Quản trị viên (Admin) thẩm định giấy phép PCCC, kiểm duyệt tin phòng chống lừa đảo, điều tiết phân bổ đề xuất theo thuật toán AI Top-K (p95 < 500ms).

---

## 2. BỘ QUY CHẾ NỘI QUY NHÀ TRỌ & HỢP ĐỒNG THUÊ CHUẨN HIỆN HÀNH (2024 - 2026)

Căn cứ theo:
- **Bộ Luật Dân Sự 2015** (Quy định về Hợp đồng thuê tài sản);
- **Luật Nhà Ở 2023** (Có hiệu lực thi hành);
- **Luật Cư Trú 2020** (Quy định về đăng ký tạm trú);
- **Nghị định 136/2020/NĐ-CP & Chỉ thị mới nhất của UBND TP.HCM về kiểm tra an toàn PCCC đối với nhà trọ, nhà ngăn phòng cho thuê**.

### 📜 10 ĐIỀU NỘI QUY BẮT BUỘC TRONG HỢP ĐỒNG THUÊ ELITE LIVING:

#### Điều 1: Quy định về An Toàn Phòng Cháy Chữa Cháy (PCCC) & Sử Dụng Thiết Bị Điện
1. **Sạc xe điện**: Tuyệt đối nghiêm cấm sạc xe đạp điện, xe máy điện qua đêm trong phòng ngủ hoặc tự ý cắm sạc kéo dây từ phòng ra ngoài. Toàn bộ xe điện phải sạc tại **Khu vực sạc xe tập trung** có trang bị ổ cắm hẹn giờ tự ngắt và hệ thống chữa cháy tự động.
2. **Nấu nướng an toàn**: Nghiêm cấm sử dụng bình gas công nghiệp lớn (>12kg), bình gas mini cũ rỉ sét, hoặc đun nấu bằng củi than trong phòng khép kín. Khuyến khích sử dụng bếp từ, bếp hồng ngoại có rơ-le tự ngắt khi quá nhiệt.
3. **Thiết bị dễ cháy**: Cấm tàng trữ chất dễ cháy, nổ (xăng, cồn, dầu, bình xịt nén khí số lượng lớn, pháo nổ).
4. **Lối thoát hiểm**: Không được để giày dép, vật dụng cá nhân, thùng carton lấn chiếm hành lang, cầu thang bộ và ban công thoát hiểm.
5. **Ý thức cư dân**: Tắt bình nóng lạnh, bếp điện, máy sấy tóc và rút phích cắm bàn ủi khi rời khỏi phòng. Nắm rõ vị trí bình chữa cháy xách tay và chuông báo động ở từng tầng.

#### Điều 2: Quy định An Ninh Trật Tự & Giờ Giấc Ra Vào
1. Cửa ra vào tòa nhà vận hành tự động bằng **Khóa vân tay / Mã số bảo mật / Thẻ từ thông minh** 24/7.
2. Cư dân có trách nhiệm đóng chặt cửa sau khi ra vào. Tuyệt đối không chia sẻ mã mở cửa cho người ngoài hoặc mở cửa cho người lạ bám đuôi vào tòa nhà.
3. Mọi hành vi gây rối, cãi cọ, đánh nhau, tàng trữ vũ khí, sử dụng ma túy, cờ bạc, hoạt động mại dâm sẽ bị lập biên bản bàn giao Công an xử lý và chấm dứt hợp đồng ngay lập tức không hoàn cọc.

#### Điều 3: Khai Báo Cư Trú & Tiếp Đón Khách Thăm
1. **Đăng ký tạm trú**: Bên B có nghĩa vụ cung cấp bản sao CCCD gắn chip (hoặc định danh VNeID mức 2) trong vòng 24 giờ sau khi nhận phòng để Bên A thực hiện thủ tục đăng ký tạm trú với Công an phường theo Luật Cư trú.
2. **Khách đến thăm**: Khách thăm phòng được tiếp đón văn minh. Nếu khách ở lại qua đêm (sau 23:00), Bên B phải thông báo trước cho Quản lý tòa nhà qua hệ thống portal/Zalo và xuất trình CCCD của khách để đăng ký lưu trú.

#### Điều 4: Giữ Gìn Vệ Sinh Môi Trường & Xử Lý Rác Thải
1. Rác thải sinh hoạt phải được phân loại và cho vào bao nilon buộc kín, bỏ đúng nơi quy định tại phòng rác chung trước 21:00 hàng ngày.
2. Tuyệt đối không vứt rác, đầu lọc thuốc lá, đổ nước bẩn từ ban công hoặc cửa sổ ra ngoài; không để rác thải trước cửa phòng gây mùi hôi và mất mỹ quan chung.
3. Cấm xả thức ăn thừa, dầu mỡ động thực vật, băng vệ sinh vào bồn cầu, chậu rửa bát làm tắc nghẽn đường ống thoát nước thải chung.

#### Điều 5: Khung Giờ Yên Tĩnh & Văn Hóa Nếp Sống Đô Thị
1. **Khung giờ yên tĩnh (Quiet Hours)**: Từ **22:00 đêm đến 06:00 sáng hôm sau**.
2. Trong khung giờ này, cư dân không được mở loa công suất lớn, không hát karaoke, không nói chuyện to tiếng, không dịch chuyển đồ đạc gây chấn động trần sàn làm ảnh hưởng đến giấc ngủ của các phòng xung quanh.

#### Điều 6: Chính Sách Thú Cưng (Pet-Friendly)
1. Chỉ được nuôi thú cưng (chó, mèo) tại các căn phòng có đăng ký rõ trong Hợp đồng.
2. Vật nuôi phải được tiêm phòng dại định kỳ và có sổ theo dõi thú y.
3. Khi đưa thú cưng ra khu vực chung (hành lang, sân chung), phải có dây xích và rọ mõm; người nuôi phải dọn dẹp ngay nếu thú cưng phóng uế.
4. Trường hợp thú cưng làm cào rách nội thất, cửa gỗ, tường, Bên B chịu trách nhiệm bồi hoàn 100% giá trị sửa chữa.

#### Điều 7: Bảo Vệ Cơ Sở Vật Chất & Bàn Giao Thiết Bị
1. Hai bên tiến hành lập **Biên bản bàn giao cơ sở vật chất (Check-in Handover)** ghi nhận chỉ số điện nước, số lượng và hiện trạng nội thất (máy lạnh, máy giặt, tủ lạnh, giường, nệm, khóa phòng).
2. Bên B có nghĩa vụ bảo quản tài sản. Không tự ý khoan đục tường, thay đổi màu sơn hoặc kết cấu điện nước khi chưa có sự đồng ý bằng văn bản của Bên A.
3. Hỏng hóc do hao mòn tự nhiên sẽ do Bên A sửa chữa; hư hại do lỗi sử dụng bất cẩn của Bên B sẽ do Bên B chi trả theo Bảng đơn giá niêm yết.

#### Điều 8: Định Kỳ Chốt Chỉ Số Điện Nước & Thanh Toán Hóa Đơn
1. Định kỳ từ ngày **25 đến ngày cuối tháng**, Bên A chốt chỉ số công tơ điện và đồng hồ nước (khách thuê có quyền cùng giám sát hoặc đối soát ảnh chụp công tơ).
2. Tiền thuê phòng và tiền điện nước dịch vụ được thanh toán từ ngày **01 đến ngày 05 hàng tháng** qua cổng thanh toán số hoặc chuyển khoản ngân hàng.
3. Trường hợp chậm nộp quá 05 ngày không có lý do chính đáng, Bên A áp dụng phí trễ hạn hoặc tạm ngắt cung cấp tiện ích sau khi đã gửi thông báo nhắc nhở 3 lần.

#### Điều 9: Giới Hạn Số Lượng Người Ở & Phương Tiện
1. Mỗi phòng chỉ được cư trú tối đa số lượng người như đã cam kết trong hợp đồng (thường từ 1 - 2 người đối với Studio/Gác lửng, tối đa 3 - 4 người đối với 2PN).
2. Số lượng xe máy gửi tại hầm/nhà xe phải đúng biển số đã đăng ký. Để xe gọn gàng đúng vị trí ô kẻ quy định.

#### Điều 10: Chấm Dứt Hợp Đồng & Quy Định Hoàn Trả Tiền Cọc
1. Khi có nhu cầu trả phòng hoặc chấm dứt hợp đồng khi đến hạn, Bên B phải thông báo trước cho Bên A tối thiểu **30 ngày**.
2. Tiền đặt cọc được Bên A hoàn trả **100% trong vòng 03 ngày làm việc** sau khi:
   - Hai bên ký kết Biên bản bàn giao trả phòng (Check-out Handover) và kiểm đếm thiết bị nguyên vẹn.
   - Bên B hoàn tất thanh toán toàn bộ công nợ tiền thuê và điện nước tính đến ngày bàn giao.
3. Trường hợp Bên B đơn phương hủy hợp đồng trước hạn hoặc không thông báo trước đủ 30 ngày, Bên B sẽ không được nhận lại tiền đặt cọc theo quy định đảm bảo hợp đồng.

---

## 3. ROADMAP PHÁT TRIỂN PHÂN HỆ WEB CHỦ TRỌ (/chu-tro)

### 📌 Giai đoạn 1: Quản Trị Căn Hộ & Phòng Trọ (Room Asset Management)
- **Tính năng**:
  - CRUD phòng trọ với thông số kỹ thuật chi tiết: diện tích, giá thuê, tiền cọc, số lượng xe tối đa, số người tối đa, chính sách thú cưng, mức giá điện (3.800đ/kWh), nước (25.000đ/m³), dịch vụ.
  - Máy trạng thái phòng (Room FSM): `AVAILABLE` (Còn trống) ➔ `BOOKED_VIEWING` (Đã đặt lịch hẹn) ➔ `RESERVED` (Giữ chỗ) ➔ `RENTED` (Đang thuê).
  - Khóa tương tranh Pessimistic Lock khi có giao dịch xem phòng.

### 📌 Giai đoạn 2: Lịch Rảnh & Điều Phối Lịch Hẹn Xem Phòng (Appointments & Concurrency)
- **Tính năng**:
  - Thiết lập khung giờ rảnh theo tuần (thứ 2 đến CN, các ca 08:00 - 10:00, 14:00 - 16:00, 18:00 - 20:00).
  - Tiếp nhận yêu cầu xem phòng từ khách thuê, gửi phản hồi xác nhận (CONFIRMED) hoặc từ chối kèm lý do.
  - Tích hợp gọi điện nhanh và liên kết Zalo trực tiếp với khách thuê.

### 📌 Giai đoạn 3: Chốt Số Điện Nước & Tự Động Hóa Xuất Hóa Đơn (Utility Billing Engine)
- **Tính năng**:
  - Tự động lấy chỉ số cũ từ hóa đơn tháng trước, nhập chỉ số mới ➔ Tự động tính chênh lệch kWh điện, m³ nước.
  - Tổng hợp tiền thuê + điện + nước + internet + phí dịch vụ ➔ Tạo hóa đơn điện tử kèm mã QR thanh toán ngân hàng.
  - Chức năng in Phiếu Thu Tiền Phòng & Dịch Vụ chuẩn khổ A5/A4 dành cho kế toán khu trọ.
  - Cập nhật trạng thái `PAID` / `UNPAID` một chạm.

### 📌 Giai đoạn 4: Hợp Đồng Thuê Điện Tử & Tích Hợp Bộ Nội Quy Chuẩn (e-Contract & House Rules)
- **Tính năng**:
  - Quản trị Bộ 10 Điều Nội Quy Nhà Trọ & PCCC 2026: Bật/tắt điều khoản, chỉnh sửa ghi chú đặc thù từng khu nhà.
  - Lập hợp đồng mới: Nhập họ tên, SĐT, số CCCD/CMND, ngày bắt đầu, ngày kết thúc, tiền cọc.
  - Tự động gắn Bộ Nội Quy Chuẩn vào hợp đồng điện tử.
  - Cung cấp **Bản In Hợp Đồng Pháp Lý Chuẩn 2026** (Đầy đủ tiêu ngữ, điều khoản pháp lý, căn cứ Luật Dân sự & Luật Nhà ở, mã định danh chữ ký số điện tử).
  - Thanh lý hợp đồng: Giải phóng trạng thái phòng về `AVAILABLE`, ghi nhận ngày trả cọc.

### 📌 Giai đoạn 5: Biên Bản Bàn Giao Cơ Sở Vật Chất (Handover Protocol)
- **Tính năng**:
  - Tạo biên bản bàn giao khi Check-in và Check-out.
  - Kiểm kê danh mục tài sản (máy lạnh, tủ lạnh, nệm, chìa khóa, đồng hồ điện nước).
  - Đối chiếu hư hỏng, tính chi phí bồi thường khấu trừ trực tiếp vào tiền đặt cọc.

---

## 4. ROADMAP PHÁT TRIỂN PHÂN HỆ WEB ADMIN (/admin)

### 📌 Giai đoạn 1: Dashboard Thống Kê & Giám Sát Toàn Diện (System Telemetry & KPIs)
- **Tính năng**:
  - Đo lường Realtime: Tổng số phòng, tỷ lệ lấp đầy toàn hệ thống (Occupancy Rate), Doanh thu ước tính hàng tháng.
  - Phân tích cơ cấu phòng theo quận trọng điểm (Quận Tân Phú, Tân Bình, Bình Tân).
  - Biểu đồ phân bổ giá thuê và diện tích trung bình.

### 📌 Giai đoạn 2: Thẩm Định Giấy Phép & Kiểm Duyệt Tin Đăng (Audit & Room Approval)
- **Tính năng**:
  - Quy trình duyệt tin đăng phòng từ Chủ trọ: Kiểm tra vị trí GPS, diện tích thực tế, hình ảnh thật, hồ sơ an toàn PCCC.
  - Thao tác: Duyệt tin (APPROVED), Từ chối (REJECTED), Cấp huy hiệu "Đạt chuẩn an toàn PCCC 2026".
  - Ngăn chặn tin đăng ảo, spam hoặc thông tin giá bẫy.

### 📌 Giai đoạn 3: Phân Quyền & Quản Lý Định Danh Đa Vai Trò (RBAC & User Governance)
- **Tính năng**:
  - Danh mục người dùng hợp nhất (Unified Users): Chủ trọ (Landlord), Khách thuê (Tenant), Quản trị viên (Admin).
  - Khóa tài khoản vi phạm (LOCKED) / Mở khóa (ACTIVE) khi phát hiện spam hoặc hành vi tiêu cực.
  - Kiểm tra trạng thái xác thực SĐT OTP và thông tin tạm trú.

### 📌 Giai đoạn 4: Giám Sát Vòng Đời Vận Hành 3 Bên (Tripartite Contract & Billing Oversight)
- **Tính năng**:
  - Giám sát toàn bộ Hợp đồng điện tử đã ký, kiểm tra việc tuân thủ Bộ nội quy nhà trọ.
  - Giám sát tình trạng nợ đọng hóa đơn điện nước và tỷ lệ chuyển đổi từ lịch xem sang ký hợp đồng.
  - Xem và in bất kỳ hợp đồng thuê nào trong hệ thống phục vụ mục đích thanh tra pháp lý.

### 📌 Giai đoạn 5: Giám Sát & Tinh Chỉnh Mô-Đun Gợi Ý AI Top-K (Recommender Telemetry)
- **Tính năng**:
  - Đo lường chất lượng thuật toán Hybrid (Rule-based + Content-based + Cosine Similarity):
    - Độ chính xác Precision@5.
    - Xếp hạng Normalized Discounted Cumulative Gain (NDCG@5).
    - Độ trễ phản hồi (p95 Latency < 500ms, mục tiêu đạt < 100ms).
    - Tỷ lệ Click-through-rate (CTR) từ gợi ý sang đặt lịch xem phòng.
  - Nút Benchmark thuật toán trực tiếp trên hệ thống không gây gián đoạn dịch vụ.

---

## 5. CƠ CHẾ TƯƠNG TRANH, BẢO MẬT & PHÁP LÝ SỐ

1. **Khóa chống trùng lịch (Unique Slot Booking Mutex)**:
   - Ràng buộc tầng CSDL `@@unique([roomId, date, timeSlot])` trên bảng `Appointment`.
   - Tránh hiện tượng 2 khách thuê cùng đặt xem 1 phòng trong cùng 1 khung giờ; trả về HTTP 409 Conflict rõ ràng khi có xung đột.
2. **Kiểm soát phiên làm việc NextAuth + Role Cookie**:
   - Sử dụng JWT ký bí mật (`NEXTAUTH_SECRET`) kết hợp cookie `elite_role` có cờ `SameSite=Lax`.
   - Chặn đứng 100% việc rò rỉ phiên hoặc tài khoản Tenant xâm nhập trái phép vào cổng `/admin` hoặc `/chu-tro`.
3. **Tính toàn vẹn của Hợp đồng điện tử**:
   - Mỗi hợp đồng được định danh bằng mã CUID duy nhất, lưu trữ thời điểm ký (Timestamp UTC), địa chỉ IP và mã hash xác nhận của hai bên.
   - Bộ nội quy được gắn cứng vào dữ liệu hợp đồng tại thời điểm ký kết, bảo đảm tính bất biến trước pháp luật.

---

## 6. KẾ HOẠCH TRIỂN KHAI & TIÊU CHUẨN NGHIỆM THU (ACCEPTANCE CRITERIA)

| Hạng mục | Tiêu chuẩn kỹ thuật | Tiêu chuẩn giao diện / UX | Trạng thái |
|---|---|---|---|
| **Bộ Nội Quy Hợp Đồng** | Đầy đủ 10 điều khoản hiện hành (PCCC, xe điện, an ninh, thú cưng, cọc 30 ngày) | Tab chuyên dụng tại `/chu-tro`, hỗ trợ chỉnh sửa, bật tắt và in ấn dán tường | ✅ Sẵn sàng triển khai |
| **Bản In Hợp Đồng Pháp Lý** | Căn cứ Bộ Luật Dân Sự 2015 & Luật Nhà Ở 2023, có CCCD, số xe, mã số chữ ký | Khổ A4 chuẩn in ấn, phong cách Elite Living trang trọng | ✅ Sẵn sàng triển khai |
| **Quản Lý Phòng & Lịch Hẹn** | FSM 4 trạng thái, Unique Lock chống trùng 409 | Giao diện thẻ trực quan, lọc nhanh, xem chi tiết | ✅ Đã hoàn thiện & kiểm thử |
| **Điện Nước & Hóa Đơn** | Tính toán tự động theo chỉ số, tính tổng chính xác 100% | Phiếu thu A5/A4, mã QR thanh toán ngân hàng | ✅ Đã hoàn thiện & kiểm thử |
| **Web Admin Giám Sát** | RBAC chặt chẽ, kiểm duyệt tin, giám sát hợp đồng & KPI | Dashboard thống kê phân tích đa chiều | ✅ Sẵn sàng nâng cấp |
| **Độ trễ thuật toán Top-K** | p95 < 500ms (thực tế 52ms) | Gợi ý mượt mà trên Hero Search & Trang chủ | ✅ Đạt chuẩn xuất sắc |

---
*Tài liệu được biên soạn phục vụ công tác bảo vệ Khóa luận tốt nghiệp CNTT-KLCN111.*
