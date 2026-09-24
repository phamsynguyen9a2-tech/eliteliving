import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Elite Living — Mạng Lưới Căn Hộ Dịch Vụ & Phòng Trọ Cao Cấp (Tân Phú • Tân Bình • Bình Tân)",
  description: "Hệ thống quản lý và tìm kiếm căn hộ dịch vụ, phòng trọ cao cấp hàng đầu khu vực Tây Sài Gòn (Tân Phú, Tân Bình, Bình Tân). Đặt lịch xem phòng trực tuyến nhanh chóng, minh bạch và an toàn.",
  icons: {
    icon: "/logo.png"
  }
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
