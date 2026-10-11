import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Elite Living — Mạng Lưới Căn Hộ Dịch Vụ & Phòng Trọ Cao Cấp (Tân Phú • Tân Bình • Bình Tân)",
  description: "Hệ thống quản lý và tìm kiếm căn hộ dịch vụ, phòng trọ cao cấp hàng đầu khu vực Tây Sài Gòn (Tân Phú, Tân Bình, Bình Tân). Đặt lịch xem phòng trực tuyến nhanh chóng, minh bạch và an toàn.",
  icons: {
    icon: "/logo.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#F8F8F6] text-[#0F223A]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
