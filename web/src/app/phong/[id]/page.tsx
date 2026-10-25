import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getRoomById, getRooms, isPubliclyListed } from '@/lib/db';
import { canPreviewUnlistedRoom } from '@/lib/room-visibility';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoomDetailClient from './RoomDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const room = await getRoomById(Number(id));

  if (!room || !isPubliclyListed(room)) {
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
  // Tin chưa duyệt: chỉ chủ trọ sở hữu và admin xem trước được
  const listed = isPubliclyListed(room);
  if (!listed && !(await canPreviewUnlistedRoom(room))) {
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

      {!listed && (
        <div role="status" className="mx-auto mt-24 w-full max-w-6xl px-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Bản xem trước:</strong>{' '}
            {room.listing_status === 'REJECTED'
              ? `tin đăng bị từ chối${room.moderation_note ? ` (lý do: ${room.moderation_note})` : ''}. Sửa lại tin để gửi duyệt lại.`
              : 'tin đăng đang chờ quản trị viên duyệt, người thuê chưa nhìn thấy trang này.'}
          </div>
        </div>
      )}

      {/* Main Room Detail Client Application */}
      <div className="flex-1">
        <RoomDetailClient room={room} relatedRooms={relatedRooms} />
      </div>

      {/* Reusable Elite Living Footer */}
      <Footer />
    </div>
  );
}
