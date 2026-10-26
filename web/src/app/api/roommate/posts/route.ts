import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/request-session';

import prisma from '@/lib/prisma';
import { getPosts, addPost } from '@/lib/roommate-store';
import { calculateCompatibility, rankRoommatePosts } from '@/lib/roommate-matcher';
import { checkRateLimit } from '@/lib/spam-filter';
import type { RoommatePost } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get('district');
    const gender = searchParams.get('gender');
    const maxRent = searchParams.get('maxRent') ? Number(searchParams.get('maxRent')) : undefined;
    const search = searchParams.get('search')?.toLowerCase();
    const userId = searchParams.get('userId');
    const authorId = searchParams.get('authorId');

    // Attempt DB fetch, fallback to memory store
    let posts = [...getPosts()];
    try {
      const dbPosts = await prisma.roommatePost.findMany({
        where: { status: 'OPEN' },
        include: { user: true, room: true },
        orderBy: { createdAt: 'desc' },
      });
      if (dbPosts && dbPosts.length > 0) {
        posts = dbPosts.map((p) => ({
          id: p.id,
          room_id: p.roomId,
          user_id: p.userId,
          title: p.title,
          description: p.description,
          shared_rent: p.sharedRent,
          max_people: p.maxPeople,
          current_people: p.currentPeople,
          gender_preference: p.genderPreference,
          required_habits: p.requiredHabits,
          status: p.status as any,
          images: p.images,
          contact_phone: p.contactPhone,
          district: p.district || (p.room?.district ?? 'Quận Tân Phú'),
          address: p.address || (p.room?.address ?? ''),
          created_at: p.createdAt.toISOString(),
          expires_at: p.expiresAt.toISOString(),
          user_name: p.user?.name || 'Người thuê',
          user_image: p.user?.image || undefined,
          room_title: p.room?.title || undefined,
        }));
      }
    } catch {
      // Prisma offline, fallback to in-memory postsStore
    }

    // Filters
    if (district && district !== 'all') {
      posts = posts.filter((p) => p.district.toLowerCase().includes(district.toLowerCase()));
    }
    if (gender && gender !== 'all') {
      posts = posts.filter((p) => p.gender_preference === gender || p.gender_preference === 'Không yêu cầu');
    }
    if (maxRent) {
      posts = posts.filter((p) => p.shared_rent <= maxRent);
    }
    if (search) {
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search) ||
          p.district.toLowerCase().includes(search) ||
          p.required_habits.some((h) => h.toLowerCase().includes(search))
      );
    }

    if (authorId) {
      posts = posts.filter((p) => p.user_id === authorId || p.contact_phone === authorId);
    }

    // Compatibility Calculation if user profile is available
    if (userId) {
      try {
        let userProfile = null;
        try {
          userProfile = await prisma.roommateProfile.findUnique({
            where: { userId },
          });
        } catch {}

        if (userProfile) {
          const scoredPosts = posts.map((p) => {
            const score = calculateCompatibility(
              {
                gender: userProfile!.gender,
                habits: userProfile!.habits,
                lifestyle: userProfile!.lifestyle || undefined,
                petFriendly: userProfile!.petFriendly,
                smokingStatus: userProfile!.smokingStatus,
              },
              {
                genderPreference: p.gender_preference,
                requiredHabits: p.required_habits,
                sharedRent: p.shared_rent,
              }
            );
            return { ...p, score, compatibility_score: score };
          });

          posts = rankRoommatePosts(scoredPosts, 20);
        }
      } catch (err) {
        console.error('Error calculating compatibility:', err);
      }
    }

    return NextResponse.json({
      success: true,
      data: posts,
      total: posts.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getRequestSession();
    // Bài đăng luôn đứng tên người đang đăng nhập (không nhận user_id từ body) và luôn qua giới hạn chống spam
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập để đăng tin tìm bạn ở ghép.' },
        { status: 401 }
      );
    }
    const body = await request.json();

    const userId = session.user.id;
    const userName = session.user.name || 'Khách thuê';
    const userImage = session.user.image || '';
    const userPhone = session.user.phone || body.contact_phone || '0903123456';

    // Anti-spam check: Rate limit
    try {
      const rateCheck = await checkRateLimit(userId, 'ROOMMATE_POST');
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { success: false, message: rateCheck.message },
          { status: 429 }
        );
      }
    } catch {}

    const {
      title,
      description,
      shared_rent,
      max_people = 2,
      current_people = 1,
      gender_preference = 'Không yêu cầu',
      required_habits = ['Sạch sẽ', 'Ngủ sớm'],
      images = [],
      district = 'Quận Tân Phú',
      address = '',
      room_id = 101,
      contact_phone = userPhone,
    } = body;

    if (!title || !description || !shared_rent) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng điền đầy đủ tiêu đề, mô tả và giá tiền chia sẻ.' },
        { status: 400 }
      );
    }

    const newPost: RoommatePost = {
      id: `post_${Date.now()}`,
      room_id: Number(room_id),
      user_id: userId,
      title,
      description,
      shared_rent: Number(shared_rent),
      max_people: Number(max_people),
      current_people: Number(current_people),
      gender_preference,
      required_habits: Array.isArray(required_habits) ? required_habits : [required_habits],
      status: 'OPEN',
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'],
      contact_phone,
      district,
      address,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      user_name: userName,
      user_image: userImage,
    };

    // Try DB insertion
    try {
      const created = await prisma.roommatePost.create({
        data: {
          id: newPost.id,
          roomId: newPost.room_id,
          userId: newPost.user_id,
          title: newPost.title,
          description: newPost.description,
          sharedRent: newPost.shared_rent,
          maxPeople: newPost.max_people,
          currentPeople: newPost.current_people,
          genderPreference: newPost.gender_preference,
          requiredHabits: newPost.required_habits,
          images: newPost.images,
          contactPhone: newPost.contact_phone,
          district: newPost.district,
          address: newPost.address,
          expiresAt: new Date(newPost.expires_at),
        },
      });
      if (created) {
        newPost.id = created.id;
      }
    } catch {}

    // Add to in-memory store
    addPost(newPost);

    return NextResponse.json({
      success: true,
      message: 'Đăng tin tìm bạn ở ghép thành công!',
      data: newPost,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
