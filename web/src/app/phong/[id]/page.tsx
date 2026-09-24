import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getRoomById, getRooms } from '@/lib/db';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoomDetailClient from './RoomDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const room = await getRoomById(Number(id));

  if (!room) {
    return {
      title: 'Không tìm thấy phòng | ELITE LIVING',
      description: 'Phòng trọ hoặc căn hộ dịch vụ bạn đang tìm kiếm không tồn tại hoặc đã ngưng cho thuê.'
    };
  }

  return {
    title: `${room.room_code}: ${room.title} | ELITE LIVING`,
    description: `Thuê căn hộ ${room.room_code} tại ${room.address}. Giá thuê ${room.price.toLocaleString('vi-VN')} đ/tháng, diện tích ${room.area}m². Đặt lịch xem phòng trực tuyến 24/7 an toàn, tiện lợi.`,
    openGraph: {
      title: `${room.room_code}: ${room.title}`,
      description: `${room.address} • Giá thuê: ${room.price.toLocaleString('vi-VN')} đ/tháng`,
      images: room.images && room.images.length > 0 ? [{ url: room.images[0] }] : []
    }
  };
}

export default async function RoomDetailPage({ params }: PageProps) {
  const { id } = await params;
  const roomId = Number(id);
  const room = await getRoomById(roomId);

  if (!room) {
    notFound();
  }

  // Get related rooms: prefer same project, fallback to same district
  const allInDistrict = (await getRooms({ district: room.district, limit: 8 })).items;
  const relatedRooms = allInDistrict
    .filter((r) => r.id !== room.id)
    .slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
      {/* Global Navbar with scroll animation */}
      <Navbar />

      {/* Main Room Detail Client Application */}
      <div className="flex-1">
        <RoomDetailClient room={room} relatedRooms={relatedRooms} />
      </div>

      {/* Reusable Elite Living Footer */}
      <Footer />
    </div>
  );
}
