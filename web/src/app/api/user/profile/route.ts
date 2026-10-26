import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/request-session';

import prisma from '@/lib/prisma';
import { getAppointments } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { otherPhoneOwnerWhere } from '@/lib/guest-booking-limit';
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

    // Determine login provider (chỉ tính tài khoản thực sự liên kết Google OAuth và chưa đặt mật khẩu riêng)
    const hasGoogleOAuth =
      dbUser?.accounts?.some((a: any) => a.provider === 'google') ||
      Boolean(dbUser?.googleId);
    const hasPassword = Boolean(dbUser?.passwordHash);
    const isGoogle = Boolean(hasGoogleOAuth && !hasPassword);

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
        hasPassword,
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

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true, phoneVerified: true },
    });
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy tài khoản người dùng.' },
        { status: 404 }
      );
    }

    const phoneChanged =
      normalizedPhone !== undefined && normalizedPhone !== (currentUser.phone || '');

    // Một SĐT chỉ thuộc về một tài khoản. Không cho nhận SĐT đang gắn với tài khoản khác,
    // vì SĐT là khóa để khớp hợp đồng, biên bản bàn giao và hóa đơn của khách thuê.
    if (phoneChanged && normalizedPhone) {
      const phoneOwner = await prisma.user.findFirst({
        where: otherPhoneOwnerWhere(normalizedPhone, session.user.id),
        select: { id: true },
      });
      if (phoneOwner) {
        return NextResponse.json(
          { success: false, message: 'Số điện thoại này đã được đăng ký cho một tài khoản khác.' },
          { status: 409 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(normalizedPhone !== undefined
          ? {
              phone: normalizedPhone,
              phoneVerified: phoneChanged ? false : currentUser.phoneVerified ?? false,
            }
          : {}),
        ...(image ? { image: String(image).trim() } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Cập nhật thông tin hồ sơ thành công!',
      data: updatedUser,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err?.message || 'Không thể lưu thông tin hồ sơ lên máy chủ. Vui lòng thử lại.',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getRequestSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập để đổi mật khẩu.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' },
        { status: 400 }
      );
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Mật khẩu xác nhận không khớp với mật khẩu mới.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy tài khoản trong cơ sở dữ liệu.' },
        { status: 404 }
      );
    }

    if (user.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, message: 'Vui lòng nhập mật khẩu hiện tại.' },
          { status: 400 }
        );
      }
      const isValidCurrent = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValidCurrent) {
        return NextResponse.json(
          { success: false, message: 'Mật khẩu hiện tại không chính xác.' },
          { status: 400 }
        );
      }
      if (currentPassword === newPassword) {
        return NextResponse.json(
          { success: false, message: 'Mật khẩu mới phải khác mật khẩu hiện tại.' },
          { status: 400 }
        );
      }
    }

    const nextHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: nextHash },
    });

    return NextResponse.json({
      success: true,
      message: 'Cập nhật mật khẩu tài khoản thành công!',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err?.message || 'Không thể cập nhật mật khẩu lúc này. Vui lòng thử lại sau.',
      },
      { status: 500 }
    );
  }
}
