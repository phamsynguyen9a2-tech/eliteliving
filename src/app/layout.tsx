import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'vietnamese'] })

export const metadata: Metadata = {
  title: {
    default: 'NhàTrọTop – Tìm phòng trọ nhanh chóng, tin cậy tại TP.HCM',
    template: '%s | NhàTrọTop',
  },
  description: 'Hệ thống quản lý nhà trọ/phòng trọ trực tuyến – tìm kiếm, đặt lịch xem phòng và thuê phòng dễ dàng.',
  keywords: ['phòng trọ', 'nhà trọ', 'thuê phòng', 'tìm phòng', 'TP.HCM'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
