import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập trước.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập số điện thoại.' },
        { status: 400 }
      );
    }

    // Validate SĐT Việt Nam
    const cleaned = phone.replace(/\s|-/g, '');
    const isValid = /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-689]|9[0-46-9])\d{7}$/.test(cleaned);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Số điện thoại không hợp lệ.' },
        { status: 400 }
      );
    }

    // Cập nhật phone + phoneVerified
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        phone: cleaned,
        phoneVerified: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Xác minh số điện thoại thành công!',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Lỗi server.' },
      { status: 500 }
    );
  }
}
