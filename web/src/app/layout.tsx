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
  title: "Elite Living — Phòng trọ và căn hộ dịch vụ tại TP.HCM",
  description: "Hơn 1.335 căn hộ và studio tại 73 tòa nhà ở TP.HCM. Thông tin & hình ảnh đối tác minh bạch, giá niêm yết, đặt lịch xem phòng online.",
  icons: {
    icon: "/logo.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      data-scroll-behavior="smooth"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#F8F8F6] text-[#0F223A]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
