import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/request-session';

import prisma from '@/lib/prisma';
import { INITIAL_ROOMMATE_PROFILES } from '@/lib/../data/sample_roommates';
import type { RoommateProfile } from '@/lib/types';

// In-memory profiles store
const profilesStore: Record<string, RoommateProfile> = { ...INITIAL_ROOMMATE_PROFILES };

export async function GET(request: NextRequest) {
  try {
    const session = await getRequestSession();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập hoặc cung cấp userId.' },
        { status: 401 }
      );
    }

    // Try DB
    try {
      const profile = await prisma.roommateProfile.findUnique({
        where: { userId },
        include: { user: true },
      });
      if (profile) {
        return NextResponse.json({
          success: true,
          data: {
            id: profile.id,
            user_id: profile.userId,
            gender: profile.gender,
            age: profile.age ?? undefined,
            occupation: profile.occupation ?? undefined,
            habits: profile.habits,
            preferences: profile.preferences,
            bio: profile.bio ?? undefined,
            lifestyle: profile.lifestyle ?? undefined,
            pet_friendly: profile.petFriendly,
            smoking_status: profile.smokingStatus,
            created_at: profile.createdAt.toISOString(),
            updated_at: profile.updatedAt.toISOString(),
            user_name: profile.user?.name,
            user_image: profile.user?.image ?? undefined,
          },
        });
      }
    } catch {}

    const cached = profilesStore[userId];
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    return NextResponse.json({
      success: true,
      data: null,
      message: 'Chưa tạo hồ sơ ở ghép',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getRequestSession();
    const body = await request.json();
    const userId = session?.user?.id || body.user_id || 'user_guest';

    const {
      gender = 'Khác',
      age,
      occupation,
      habits = [],
      preferences = [],
      bio = '',
      lifestyle = 'Ambivert',
      pet_friendly = false,
      smoking_status = false,
    } = body;

    const profileData: RoommateProfile = {
      id: `prof_${userId}`,
      user_id: userId,
      gender,
      age: age ? Number(age) : undefined,
      occupation,
      habits: Array.isArray(habits) ? habits : [],
      preferences: Array.isArray(preferences) ? preferences : [],
      bio,
      lifestyle,
      pet_friendly: Boolean(pet_friendly),
      smoking_status: Boolean(smoking_status),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_name: session?.user?.name || body.user_name || 'Người dùng',
      user_image: session?.user?.image || undefined,
    };

    // Try DB upsert
    try {
      await prisma.roommateProfile.upsert({
        where: { userId },
        create: {
          id: profileData.id,
          userId,
          gender,
          age: profileData.age,
          occupation,
          habits: profileData.habits,
          preferences: profileData.preferences,
          bio,
          lifestyle,
          petFriendly: profileData.pet_friendly,
          smokingStatus: profileData.smoking_status,
        },
        update: {
          gender,
          age: profileData.age,
          occupation,
          habits: profileData.habits,
          preferences: profileData.preferences,
          bio,
          lifestyle,
          petFriendly: profileData.pet_friendly,
          smokingStatus: profileData.smoking_status,
        },
      });
    } catch {}

    profilesStore[userId] = profileData;

    return NextResponse.json({
      success: true,
      message: 'Cập nhật hồ sơ ở ghép thành công!',
      data: profileData,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
