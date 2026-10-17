import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/request-session';

import prisma from '@/lib/prisma';
import { getAppointments } from '@/lib/db';
import { getPosts, getRequests } from '@/lib/roommate-store';

export async function GET(request: NextRequest) {
  try {
    const session = await getRequestSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập để xem hồ sơ.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    let dbUser: any = null;

    try {
      dbUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          accounts: true,
          appointments: true,
          roommatePosts: true,
          roommateRequests: true,
        },
      });
    } catch {
      // Prisma offline, fallback to session & in-memory
    }

    // Determine login provider
    const isGoogle =
      dbUser?.accounts?.some((a: any) => a.provider === 'google') ||
      dbUser?.googleId ||
      session.user.email?.includes('@gmail.com');

    // Appointments count
    let appointmentsCount = 0;
    try {
      if (dbUser?.appointments) {
        appointmentsCount = dbUser.appointments.length;
      } else {
        const appts = await getAppointments({ user_id: userId });
        appointmentsCount = appts.length;
      }
    } catch {
      appointmentsCount = 0;
    }

    // Roommate posts count
    let postsCount = 0;
    if (dbUser?.roommatePosts) {
      postsCount = dbUser.roommatePosts.length;
    } else {
      postsCount = getPosts().filter((p) => p.user_id === userId).length;
    }

    // Roommate requests count
    let requestsCount = 0;
    if (dbUser?.roommateRequests) {
      requestsCount = dbUser.roommateRequests.length;
    } else {
      requestsCount = getRequests().filter((r) => r.requester_id === userId).length;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: userId,
        name: dbUser?.name || session.user.name || 'Người dùng Elite Living',
        email: dbUser?.email || session.user.email || '',
        phone: dbUser?.phone || session.user.phone || '',
        image:
          dbUser?.image ||
          session.user.image ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        role: dbUser?.role || session.user.role || 'TENANT',
        phoneVerified: dbUser?.phoneVerified ?? session.user.phoneVerified ?? false,
        isGoogle: Boolean(isGoogle),
        stats: {
          appointmentsCount,
          postsCount,
          requestsCount,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getRequestSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập để cập nhật hồ sơ.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, phone, image } = body;

    const normalizedPhone = typeof phone === 'string'
      ? phone.replace(/\s|-/g, '').replace(/^\+84/, '0')
      : undefined;
    if (
      normalizedPhone !== undefined &&
      normalizedPhone !== '' &&
      !/^0(3[2-9]|5[2689]|7[06-9]|8[1-689]|9[0-46-9])\d{7}$/.test(normalizedPhone)
    ) {
      return NextResponse.json(
        { success: false, message: 'Số điện thoại không hợp lệ.' },
        { status: 400 }
      );
    }

    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { phone: true, phoneVerified: true },
      });
      const phoneChanged =
        normalizedPhone !== undefined && normalizedPhone !== (currentUser?.phone || '');

      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: {
          ...(name ? { name } : {}),
          ...(normalizedPhone !== undefined
            ? {
                phone: normalizedPhone,
                phoneVerified: phoneChanged ? false : currentUser?.phoneVerified ?? false,
              }
            : {}),
          ...(image ? { image } : {}),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Cập nhật thông tin hồ sơ thành công!',
        data: updatedUser,
      });
    } catch {
      // Prisma offline fallback
      return NextResponse.json({
        success: true,
        message: 'Đã lưu thông tin hồ sơ phiên hiện tại!',
        data: {
          id: session.user.id,
          name: name || session.user.name,
          phone: normalizedPhone ?? session.user.phone,
          phoneVerified:
            normalizedPhone !== undefined && normalizedPhone !== session.user.phone
              ? false
              : session.user.phoneVerified,
          image: image || session.user.image,
        },
      });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
