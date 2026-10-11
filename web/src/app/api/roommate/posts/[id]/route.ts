import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPostById } from '@/lib/roommate-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Try DB first
    try {
      const dbPost = await prisma.roommatePost.findUnique({
        where: { id },
        include: {
          user: {
            include: { roommateProfile: true }
          },
          room: true,
          requests: true,
        },
      });

      if (dbPost) {
        return NextResponse.json({
          success: true,
          data: {
            id: dbPost.id,
            room_id: dbPost.roomId,
            user_id: dbPost.userId,
            title: dbPost.title,
            description: dbPost.description,
            shared_rent: dbPost.sharedRent,
            max_people: dbPost.maxPeople,
            current_people: dbPost.currentPeople,
            gender_preference: dbPost.genderPreference,
            required_habits: dbPost.requiredHabits,
            status: dbPost.status,
            images: dbPost.images,
            contact_phone: dbPost.contactPhone,
            district: dbPost.district,
            address: dbPost.address,
            created_at: dbPost.createdAt.toISOString(),
            expires_at: dbPost.expiresAt.toISOString(),
            user_name: dbPost.user?.name,
            user_image: dbPost.user?.image,
            room_title: dbPost.room?.title,
            requester_count: dbPost.requests?.length || 0,
            poster_profile: dbPost.user?.roommateProfile,
          },
        });
      }
    } catch {}

    // Fallback to shared in-memory store
    const matched = getPostById(id);
    if (!matched) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy bài đăng ở ghép này.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: matched,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
