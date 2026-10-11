# ROADMAP CHI TIẾT: NÂNG CẤP BỘ LỌC TÌM KIẾM & HỆ THỐNG GỢI Ý THÔNG MINH
**HỆ THỐNG CĂN HỘ CAO CẤP ELITE LIVING (NHATROTOP)**

---

## TỔNG QUAN YÊU CẦU & MỤC TIÊU PHÁT TRIỂN
Dựa trên phân tích hành vi thực tế của khách thuê (sinh viên, nhân viên văn phòng, cặp đôi, gia đình trẻ) tại khu vực Tây Sài Gòn (**Quận Tân Phú • Quận Tân Bình • Quận Bình Tân**), tài liệu này vạch ra lộ trình kiến trúc chi tiết để nâng cấp toàn diện **2 cấu phần cốt lõi trên trang chủ**:
1. **Phần 1: Khối Gợi Ý Căn Hộ & Phòng Trọ Phù Hợp Nhất (AI Smart Matching Widget)**
2. **Phần 2: Khối Tìm Căn Hộ Ngay (Hero Search & Advanced Filter Engine)**

---

## 🎨 QUY TẮC MÀU SẮC THƯƠNG HIỆU BẮT BUỘC (BRAND COLOR SYSTEM)
Tuân thủ tuyệt đối quy định trong `AGENTS.md` và `color-design-system.md`:
* **Champagne Gold (`#B89C66`)**: Nút CTA chính, tag giá thuê nổi bật, tab đang chọn, viền focus input, badge % tương thích cao.
* **Deep Navy (`#0F223A`)**: Tiêu đề H1/H2, nền banner/header, navbar, text thương hiệu, các nút hành động phụ.
* **Warm Ivory Canvas (`#F8F8F6`)**: Màu nền toàn bộ website và các section.
* **Warm Slate Border (`#E5E3DE`)**: Màu viền các thẻ card, viền input, đường phân cách.
* **CẤM KỴ**: Tuyệt đối **KHÔNG DÙNG MÀU XANH LÁ CÂY** (`#00875A`, `#059669`, emerald, green), không dùng gradient xanh tím generic.

---

## PHẦN 1: KHỐI "GỢI Ý CĂN HỘ & PHÒNG TRỌ PHÙ HỢP NHẤT" (AI SMART MATCHING)

### 1.1. Hiện trạng & Nhược điểm cũ
* Sử dụng nền gradient xanh tím/xanh ngọc chói không đúng nhận diện Elite Living.
* Bán kính cố định chỉ tính từ một mốc duy nhất là ĐH Công Thương (HUIT).
* Chỉ lọc đơn thuần theo 2 thanh trượt (Ngân sách & Bán kính), thiếu các nhu cầu sống thực tế của khách thuê.

### 1.2. Nâng cấp Bán Kính Từ Mọi Địa Điểm Trọng Điểm & Tuyến Đường (Landmarks & Custom Corridors)
Cho phép khách hàng đo bán kính chính xác bằng công thức **Haversine Distance** từ:
1. **Các Trung tâm Thương mại & Điểm vui chơi giải trí lớn**:
   * *Aeon Mall Tân Phú (Celadon)*: `10.8016, 106.6163`
   * *Aeon Mall Bình Tân*: `10.7432, 106.6125`
   * *Công viên Văn hóa Đầm Sen*: `10.7684, 106.6438`
   * *Sân bay Quốc tế Tân Sơn Nhất*: `10.8185, 106.6588`
2. **Các Trường Đại học & Cụm văn phòng**:
   * *ĐH Công Thương TP.HCM (HUIT 140 Lê Trọng Tấn)*: `10.8066, 106.6286`
   * *Tòa nhà ETown Cộng Hòa (Tân Bình)*: `10.8015, 106.6482`
   * *Cụm KCN Tân Bình*: `10.8150, 106.6210`
3. **Các Tuyến đường Huyết mạch (Corridors)**:
   * Trục Tân Phú: *Lê Trọng Tấn, Tây Thạnh, Tân Kỳ Tân Quý, Vườn Lài, Thoại Ngọc Hầu, Lũy Bán Bích*.
   * Trục Tân Bình: *Cộng Hòa, Trường Chinh, Âu Cơ, Hoàng Hoa Thám, CMT8*.
   * Trục Bình Tân: *Tên Lửa, Kinh Dương Vương, Tân Hòa Đông*.
4. **Định vị GPS Hiện tại**:
   * Nút **"Vị trí hiện tại của tôi"** sử dụng Geolocation API của trình duyệt, tự động tìm phòng quanh bán kính người dùng đang đứng.

### 1.3. Bộ Lọc Đề Xuất Theo Lối Sống & Phong Cách Sống (Lifestyle Personas)
Thay vì chỉ lọc giá, bổ sung 6 Tab phong cách sống giúp cá nhân hóa 1-click:
* 🎓 **Sinh viên HUIT / ĐH Tiết kiệm**: Ưu tiên ngân sách dưới 4.5 triệu, cách trường dưới 2.5km, có gác lửng, giá điện nước bình dân.
* 💼 **Dân văn phòng / Chuyên viên IT**: Ưu tiên phòng yên tĩnh, bàn làm việc, wifi tốc độ cao, máy giặt riêng, an ninh vân tay, gần ETown/Cộng Hòa.
* 👫 **Cặp đôi / Nhóm bạn ở chung**: Ưu tiên diện tích rộng trên 30m2, dạng phòng 1PN/2PN hoặc gác lửng đúc cao không đụng đầu, bếp rộng nấu ăn.
* 🐶 **Cho nuôi thú cưng (Pet-friendly)**: Lọc các tòa nhà và chủ nhà thân thiện với chó mèo, có ban công thoáng đãng.
* 🌿 **Ban công & Cửa sổ lớn view thoáng**: Đón nắng tự nhiên, thông gió tự nhiên, có chỗ phơi đồ riêng.
* 🔑 **Giờ giấc tự do 100% không chung chủ**: Cửa cổng thẻ từ/vân tay 24/7, có bảo vệ hoặc camera an ninh giám sát.

### 1.4. Nâng Cấp Thuật Toán Matching (Hybrid Scoring Algorithm)
Công thức tính điểm tương thích:
$$\text{Score} = w_1 \cdot S_{\text{budget}} + w_2 \cdot S_{\text{distance}} + w_3 \cdot S_{\text{lifestyle}} + w_4 \cdot S_{\text{amenities}}$$
* Trả về chỉ số phần trăm tương thích (VD: **96% Phù hợp**).
* Hiển thị thời gian phản hồi API (Latency ms) và khoảng cách thực tế chính xác tới 0.1km.

---

## PHẦN 2: KHỐI "TÌM CĂN HỘ NGAY" (HERO SEARCH & ADVANCED FILTER ENGINE)

### 2.1. Kiến Trúc Bộ Lọc Chuyên Sâu (Deep Filtering Capabilities)
Mở rộng thanh tìm kiếm ở đầu trang với ngăn lọc nâng cao (**Advanced Filter Drawer / Accordion**) đáp ứng 100% câu hỏi của người đi thuê:

| Tiêu chí | Các tùy chọn chi tiết | Giá trị truy vấn (Query Params) |
| :--- | :--- | :--- |
| **1. Số người ở** | • 1 người (Độc thân/Yên tĩnh)<br>• 2 người (Bạn bè/Cặp đôi)<br>• 3 - 4 người (Nhóm SV/Gia đình trẻ)<br>• Gia đình 4+ người | `occupants=1 \| 2 \| 3 \| 4` |
| **2. Số lượng xe máy & Ô tô** | • 1 xe máy<br>• 2 xe máy<br>• 3+ xe máy<br>• Có chỗ đậu ô tô | `bikes=1 \| 2 \| 3 \| car` |
| **3. Ràng buộc Chi phí Điện & Dịch vụ** | • Điện giá rẻ/Nhà nước (< 3.800 đ/kWh)<br>• Nước máy thủy cục<br>• Miễn phí dịch vụ / Quản lý<br>• Trọn gói chi phí | `maxElectricity=3800`<br>`freeService=true` |
| **4. Nuôi thú cưng** | • Tất cả<br>• Cho phép nuôi thú cưng (Chó/mèo)<br>• Không nuôi thú cưng | `petFriendly=true \| false` |
| **5. Thời gian dọn vào** | • Ở ngay trong tuần<br>• Đầu tháng sau<br>• Đặt cọc giữ phòng trước<br>• Chọn ngày cụ thể (Date Picker) | `moveIn=immediate \| next_month \| [date]` |
| **6. Dạng phòng cần tìm** | • Tất cả loại phòng<br>• Gác lửng đúc cao<br>• Studio không gác (Cửa sổ/Ban công)<br>• 1 Phòng ngủ riêng (1PN)<br>• 2 Phòng ngủ (2PN)<br>• Duplex cao cấp | `roomType=duplex \| studio \| 1pn \| 2pn` |

### 2.2. Đồng Bộ Giao Diện & Tương Tác
* Bổ sung nút **"Bộ lọc nâng cao"** (kèm huy hiệu đếm số lượng bộ lọc đang kích hoạt).
* Tích hợp thanh chọn nhanh các trục đường hot (`Lê Trọng Tấn`, `Tây Thạnh`, `Cộng Hòa`, `Tân Kỳ Tân Quý`, `Vườn Lài`, `Tên Lửa`...).
* Nút **"Tìm Căn Hộ Ngay"** thiết kế kích thước lớn, màu Deep Navy `#0F223A` hoặc Champagne Gold `#B89C66`, hiệu ứng hover mượt mà.

---

## 📅 LỘ TRÌNH TRIỂN KHAI KỸ THUẬT (EXECUTION STEPS)
1. **Bước 1**: Nâng cấp API Backend:
   * [api/rooms/recommend/route.ts](file:///d:/KLCN/web/src/app/api/rooms/recommend/route.ts): Hỗ trợ tọa độ landmark linh hoạt, filter theo `lifestyle`, `roomType`, `sortBy`.
   * [api/rooms/route.ts](file:///d:/KLCN/web/src/app/api/rooms/route.ts) & [lib/db.ts](file:///d:/KLCN/web/src/lib/db.ts): Bổ sung lọc `occupants`, `petFriendly`, `maxElectricity`, `roomType`.
2. **Bước 2**: Viết lại linh kiện [TopKWidget.tsx](file:///d:/KLCN/web/src/components/TopKWidget.tsx) theo đúng bảng màu Champagne Gold `#B89C66` & Deep Navy `#0F223A`. Tích hợp Landmark dropdown, Lifestyle tabs, và thẻ phòng hiển thị chi tiết.
3. **Bước 3**: Viết lại khối "Tìm Căn Hộ Ngay" trên [app/page.tsx](file:///d:/KLCN/web/src/app/page.tsx) với đầy đủ drawer bộ lọc chi tiết (người ở, xe máy, giá điện, thú cưng, ngày vào ở, dạng phòng).
4. **Bước 4**: Kiểm thử tĩnh bằng `npx next build` đảm bảo 100% không có lỗi compile/type check.
5. **Bước 5**: Tuân thủ luật `AGENTS.md` (Tuyệt đối không chạy `browser_subagent`).
