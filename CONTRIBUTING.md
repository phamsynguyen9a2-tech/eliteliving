# 📋 Hướng Dẫn Làm Việc Với GitHub – Dự Án NhàTrọTop

> **Bắt buộc đọc trước khi bắt đầu làm việc.**  
> Tài liệu này quy định cách mọi thành viên trong nhóm phải làm việc với Git/GitHub để tránh xung đột code và bảo vệ nhánh `main`.

---

## 🌿 1. Quy Tắc Nhánh (Branch Rules)

### ❌ TUYỆT ĐỐI KHÔNG làm:
- **Không push thẳng lên nhánh `main`** – nhánh `main` là code ổn định, đã được kiểm tra
- Không force push (`git push --force`) lên bất kỳ nhánh nào đang được người khác dùng
- Không xoá nhánh của người khác khi chưa hỏi

### ✅ Quy trình đúng:
```
main (nhánh chính – chỉ merge qua Pull Request)
├── dev (nhánh phát triển chung)
│   ├── feature/ten-chuc-nang   ← mỗi người tạo nhánh riêng
│   ├── fix/ten-loi-can-sua
│   └── hotfix/sua-gap
```

---

## 🔀 2. Quy Trình Làm Việc Chuẩn (Workflow)

### Bước 1 – Lấy code mới nhất trước khi bắt đầu
```bash
git checkout main
git pull origin main
```

### Bước 2 – Tạo nhánh mới cho tính năng/sửa lỗi
```bash
# Tính năng mới
git checkout -b feature/ten-chuc-nang

# Sửa lỗi
git checkout -b fix/mo-ta-loi

# Ví dụ thực tế
git checkout -b feature/them-chuc-nang-loc-phong
git checkout -b fix/loi-hien-thi-modal-dang-nhap
```

### Bước 3 – Code, sau đó commit thường xuyên
```bash
git add .
git commit -m "feat: them bo loc gia phong tro"
```

### Bước 4 – Push nhánh lên GitHub
```bash
git push origin feature/ten-chuc-nang
```

### Bước 5 – Tạo Pull Request (PR) trên GitHub
1. Vào repo trên GitHub
2. Nhấn **"Compare & pull request"**
3. Chọn merge vào nhánh `main` (hoặc `dev`)
4. Điền mô tả những gì đã làm
5. Gán reviewer cho thành viên khác trong nhóm
6. Chờ review → được duyệt → merge

---

## 📝 3. Quy Tắc Đặt Tên Commit

Dùng format: `<loại>: <mô tả ngắn>`

| Loại | Ý nghĩa | Ví dụ |
|---|---|---|
| `feat` | Thêm tính năng mới | `feat: them modal dang nhap` |
| `fix` | Sửa lỗi | `fix: loi filter phong theo gia` |
| `style` | Chỉnh giao diện, CSS | `style: chinh mau nut thue ngay` |
| `refactor` | Tái cấu trúc code | `refactor: tach component RoomCard` |
| `docs` | Cập nhật tài liệu | `docs: cap nhat CONTRIBUTING.md` |
| `chore` | Cài package, cấu hình | `chore: them package lucide-react` |

> 💡 **Ghi commit bằng tiếng Việt không dấu hoặc tiếng Anh** để tránh lỗi encoding.

---

## 🔀 4. Quy Tắc Đặt Tên Nhánh

```
feature/ten-chuc-nang-viet-lien-khong-dau
fix/mo-ta-loi-can-sua
hotfix/sua-gap-loi-nghiem-trong
docs/cap-nhat-tai-lieu
```

**Ví dụ thực tế trong dự án:**
```
feature/trang-tim-phong-co-filter
feature/modal-dang-nhap-dat-lich
fix/loi-hien-thi-phong-theo-quan
feature/tich-hop-google-login
```

---

## ⚠️ 5. Xử Lý Conflict (Xung Đột Code)

Khi có conflict, **đừng hoảng loạn**, làm theo bước sau:

```bash
# 1. Kéo code mới nhất từ main về nhánh của bạn
git checkout feature/nhanh-cua-ban
git merge main

# 2. Git sẽ báo các file bị conflict
# 3. Mở file bị conflict, tìm đoạn:
# <<<<<<< HEAD
#   code của bạn
# =======
#   code từ main
# >>>>>>> main

# 4. Giữ lại phần đúng, xoá các dấu <<<, ===, >>>
# 5. Sau khi sửa xong:
git add .
git commit -m "fix: resolve conflict voi main"
git push
```

> 🆘 Nếu không tự giải quyết được conflict → **báo ngay cho trưởng nhóm**, đừng tự ý xoá code của người khác.

---

## 🔐 6. Bảo Mật – Những Thứ KHÔNG Được Push Lên Git

> File `.gitignore` đã được cấu hình, nhưng **vẫn cần chú ý**:

| ❌ Không push | Lý do |
|---|---|
| `.env`, `.env.local` | Chứa API key, database password |
| `node_modules/` | Quá nặng, không cần thiết |
| `.next/` | Build output, tự generate |
| File `*.key`, `*.pem` | Chứng chỉ bảo mật |
| Thông tin tài khoản, mật khẩu thật | Nguy hiểm nếu lộ |

**Nếu lỡ push nhầm file nhạy cảm:**
```bash
# Xoá file khỏi Git nhưng giữ trên máy
git rm --cached .env
git commit -m "chore: xoa file env khoi git"
git push
```
Sau đó **thay đổi ngay** mọi API key/password đã bị lộ.

---

## 👥 7. Phân Công Nhánh Trong Nhóm

Để tránh conflict, mỗi người nên phụ trách phần riêng:

| Thành viên | Phụ trách | Nhánh ví dụ |
|---|---|---|
| Phạm Sỹ Nguyên | Giao diện người thuê, tích hợp AI | `feature/tenant-ui` |
| Nguyễn Tuấn Anh | Backend API, Prisma, Database | `feature/api-backend` |
| Võ Nguyễn Thành Đạt | Admin dashboard, báo cáo | `feature/admin-dashboard` |

---

## 📦 8. Cài Đặt Môi Trường Khi Clone Về

Sau khi được thêm vào repo và clone về máy:

```bash
# 1. Clone repo
git clone https://github.com/phamsynguyen9a2-tech/nhatrotop.git
cd nhatrotop

# 2. Cài dependencies
npm install

# 3. Tạo file môi trường (hỏi trưởng nhóm để lấy nội dung)
# Tạo file .env.local và điền thông tin được cung cấp

# 4. Chạy server
npm run dev
```

> 🔑 **File `.env.local` không có trong repo** (đã gitignore). Hỏi **Phạm Sỹ Nguyên** để lấy nội dung file này.

---

## 🚨 9. Các Tình Huống Khẩn Cấp

### Push nhầm lên main?
```bash
# Hoàn tác commit cuối (chưa push)
git reset --soft HEAD~1

# Nếu đã push rồi → báo ngay trưởng nhóm
```

### Lỡ xoá code quan trọng?
```bash
# Xem lịch sử commit
git log --oneline

# Khôi phục về commit cũ
git checkout <commit-hash> -- src/path/to/file.tsx
```

### Nhánh của bạn bị lỗi nghiêm trọng?
```bash
# Tạo nhánh mới từ main, làm lại
git checkout main
git pull
git checkout -b feature/ten-nhanh-moi
```

---

## ✅ 10. Checklist Trước Khi Tạo Pull Request

- [ ] Code chạy được không lỗi (`npm run dev` bình thường)
- [ ] Không có file `.env` hoặc thông tin nhạy cảm trong commit
- [ ] Đã test tính năng trên trình duyệt
- [ ] Commit message rõ ràng, dễ hiểu
- [ ] Đã pull code mới nhất từ `main` về nhánh của mình
- [ ] Không xoá hoặc thay đổi code của người khác nếu không cần thiết

---

*Tài liệu này do **Phạm Sỹ Nguyên** soạn thảo – NhàTrọTop CNTT-KLCN111*  
*Cập nhật lần cuối: 08/2026*
