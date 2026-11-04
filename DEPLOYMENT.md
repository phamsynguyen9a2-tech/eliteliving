# Triển khai thử nghiệm Elite Living

Phương án được chọn là **Vercel + PostgreSQL/Supabase**. Trên Vercel, import repository, đặt **Root Directory** là `web`, Framework Preset là Next.js và Build Command là `npm run build`. File `web/vercel.json` lưu cấu hình build tối thiểu trong mã nguồn.

Các biến bắt buộc cần khai báo trong Project Settings → Environment Variables:

- `DATABASE_URL`, `DIRECT_URL`: chuỗi kết nối Supabase; tài khoản database phải được giới hạn quyền phù hợp.
- `NEXTAUTH_URL`: URL HTTPS của bản triển khai.
- `NEXTAUTH_SECRET`: chuỗi bí mật ngẫu nhiên, không dùng lại giá trị môi trường phát triển.
- `ENABLE_DEMO_LOGIN=false` cho bản dùng thử công khai.
- Firebase (nếu đã có tài khoản dịch vụ): `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
- SMS/Email OTP (nếu tích hợp): cấu hình nhà cung cấp theo `web/.env.example`.

Quy trình phát hành: mở pull request → GitHub Actions chạy test/build web và analyze/test mobile → merge `main` → Vercel build → kiểm tra health bằng `GET /api/rooms?limit=1&log=0`. Không chạy seed trên database đang có dữ liệu nghiệp vụ; chỉ chạy `npx prisma db push` sau khi đã sao lưu và rà soát schema.

Giới hạn hiện tại: realtime SSE dùng bus trong bộ nhớ một tiến trình; khi scale nhiều instance cần Redis Pub/Sub. FCM và OTP production chỉ hoạt động sau khi nhóm cấp khóa dịch vụ thật.
