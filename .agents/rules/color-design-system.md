# QUY TẮC BẢNG MÀU CHỦ ĐẠO & THIẾT KẾ ELITE LIVING (DESIGN SYSTEM RULES)

> **LƯU Ý BẮT BUỘC DÀNH CHO AI (AGENT MANDATORY RULE)**:
> Mọi trang (pages), linh kiện (components), modal, nút bấm, form đăng ký/đăng nhập và tính năng được tạo mới hoặc chỉnh sửa trong dự án này **PHẢI TUÂN THỦ 100% BẢNG MÀU CHỦ ĐẠO DƯỚI ĐÂY**.
> **TUYỆT ĐỐI KHÔNG SỬ DỤNG MÀU XANH LÁ CÂY (`#00875A`, `#059669`, Emerald, Green) LÀM MÀU CHỦ ĐẠO, NÚT BẤM, TAB HAY NHẬN DIỆN THƯƠNG HIỆU.**

---

## 1. BẢNG MÀU CHUẨN THƯƠNG HIỆU (BRAND COLOR PALETTE)

| Vai trò màu | Mã HEX / Tailwind | Ý nghĩa & Vị trí ứng dụng |
| :--- | :--- | :--- |
| **Màu Nhấn Chủ Đạo (Primary Accent)** | **`#B89C66`** (Elite Champagne Gold)<br>Hover: `#A38752`<br>Shadow: `shadow-[#B89C66]/25` | **Màu quan trọng nhất**: Dùng cho nút bấm chính (CTA button), tab đang kích hoạt, viền focus input, icon ổ khóa, icon quan trọng, tiêu đề phụ slogan, đường kẻ nổi bật. |
| **Màu Nền Tảng (Deep Navy)** | **`#0F223A`** (Luxury Navy)<br>Phụ: `#1E3A5F` | Dùng cho tiêu đề thương hiệu chính **ELITE LIVING**, tiêu đề H1/H2/H3, thanh điều hướng (navbar), lớp phủ làm mờ nền (`bg-[#0F223A]/45`). |
| **Màu Nền Web Canvas (Warm Ivory)** | **`#F8F8F6`** (Kem ngà cao cấp) | Toàn bộ màu nền trang web, nền header, nền body của toàn hệ thống. Không dùng màu trắng bệch #FFFFFF cho cả màn hình. |
| **Màu Nền Thẻ / Modal (Surface)** | **`#FFFFFF`** (Trắng tinh khiết) | Nền của các thẻ card sản phẩm, modal popup, dropdown menu. Bo góc lớn `rounded-2xl` hoặc `rounded-[28px]`. |
| **Màu Viền & Phân Cách (Border)** | **`#E5E3DE`** (Warm Slate) | Đường viền thẻ card, viền input, viền header, đường phân cách giữa các section. |
| **Màu Chữ Mờ (Muted Text)** | **`#64748B`** / **`#94A3B8`** | Mô tả phụ, placeholder trong input, nhãn thứ cấp. |

---

## 2. QUY CHUẨN NÚT BẤM & TRƯỜNG DỮ LIỆU (UI COMPONENTS)

### 2.1. Nút bấm chính (Primary Action Button)
```html
<button className="py-3 px-4 bg-[#B89C66] hover:bg-[#A38752] text-white font-bold text-sm rounded-2xl shadow-lg shadow-[#B89C66]/25 transition-all flex items-center justify-center gap-2">
  <span>Tên hành động</span>
  <span className="w-5.5 h-5.5 rounded-full bg-white/20 flex items-center justify-center">→</span>
</button>
```

### 2.2. Nút bấm viền vàng (Secondary Outline Button)
```html
<button className="px-4 py-2 border-[1.5px] border-[#B89C66] text-[#B89C66] hover:bg-[#B89C66] hover:text-white transition-all text-xs font-bold uppercase tracking-wider rounded-xs shadow-xs">
  Tên nút
</button>
```

### 2.3. Ô nhập liệu (Input Fields & Focus State)
* Bình thường: `border-[#E5E7EB] bg-white text-[#0F223A] placeholder-[#9CA3AF]`
* Khi focus: `focus:border-[#B89C66] focus:ring-4 focus:ring-[#B89C66]/15 outline-none`
* Khi active/selected: `border-[#B89C66] ring-2 ring-[#B89C66]/15`

### 2.4. Pill Tab Switcher
* Khung nền: `bg-[#F1F3F5] rounded-2xl p-1.5`
* Tab đang chọn: `bg-white text-[#B89C66] shadow-sm font-bold rounded-xl`
* Tab chưa chọn: `text-[#64748B] hover:text-[#0F223A]`

### 2.5. Modal & Overlay
* Backdrop: `fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F223A]/45 backdrop-blur-sm`
* Card Modal: `bg-white rounded-[28px] border border-[#E5E3DE] shadow-[0_20px_60px_-15px_rgba(15,34,58,0.25)]`

---

## 3. LOGO & HUY HIỆU THƯƠNG HIỆU
* Logo icon: Sử dụng hình khiên tab treo chứa chìa khóa vàng `/logo-icon-transparent.png`.
* Text Logo:
  * Dòng 1: **ELITE LIVING** — `font-black text-[#0F223A] tracking-[0.06em] uppercase`
  * Dòng 2: **HỆ THỐNG PHÒNG TRỌ CHO THUÊ** — `font-bold text-[#B89C66] tracking-[0.2em] uppercase`

---

## 4. DANH MỤC TRANG & BỘ PHẬN ĐÃ ĐƯỢC CHUẨN HÓA
1. `Navbar.tsx`: Nút đăng nhập viền vàng `#B89C66`, menu active `#B89C66`.
2. `AuthModal.tsx`: Modal Đăng nhập/Đăng ký tông Vàng `#B89C66` & Navy `#0F223A`, không dùng màu xanh lá cây.
3. Trang chủ `/`: Hero banner dải ruy băng mờ viền vàng `#B89C66`.
4. Trang Ở Ghép `/o-ghep`, `/o-ghep/dang-bai`, `/o-ghep/ho-so`: Các thẻ card, badge, nút tìm bạn ở ghép, các tab quản lý đồng bộ bảng màu Gold & Navy.
5. Cổng nội bộ `/portal/login`: Tách riêng, màu sắc chuyên nghiệp.

---

## 5. 🚫 QUY ĐỊNH BẮT BUỘC DÀNH CHO AI: KHÔNG CHẠY DOM / BROWSER SUBAGENT ĐỂ KIỂM THỬ GIAO DIỆN
- **TUYỆT ĐỐI KHÔNG sử dụng công cụ `browser_subagent` để mở trình duyệt, cào DOM hay chụp màn hình website**.
- **Phương pháp kiểm thử thay thế hợp lệ**:
  1. Sử dụng kiểm tra tĩnh (Static Analysis & Type Checking) thông qua `npx next build` hoặc `npm run build`.
  2. Rà soát code JSX/TSX và logic state/API.
  3. Người dùng sẽ trực tiếp trải nghiệm và kiểm tra giao diện trên trình duyệt của họ.

