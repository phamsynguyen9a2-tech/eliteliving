import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getLandlords } from '@/lib/db';
import { authOptions } from '@/lib/auth';

// Predefined verified admin and landlord demo accounts
const ADMIN_ACCOUNT = {
  id: 'admin_sys_1',
  name: 'Ban Quản Trị Hệ Thống (Admin Lead)',
  email: 'admin@eliteliving.vn',
  phone: '0903999888',
  role: 'ADMIN' as const,
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
};

export async function GET() {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEMO_PORTAL !== 'true') {
    return NextResponse.json({ success: true, data: { admin: null, landlords: [] } });
  }

  const landlords = await getLandlords();

  return NextResponse.json({
    success: true,
    data: {
      admin: ADMIN_ACCOUNT,
      landlords: landlords.slice(0, 6).map((l) => ({
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        role: 'LANDLORD',
        avatar: l.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
      })),
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const verifiedSession = await getServerSession(authOptions);
    if (!verifiedSession?.user) {
      return NextResponse.json(
        { success: false, message: 'Phiên đăng nhập vận hành chưa được xác thực.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { role } = body;

    if (verifiedSession.user.role !== role) {
      return NextResponse.json(
        { success: false, message: 'Vai trò yêu cầu không khớp với phiên đăng nhập.' },
        { status: 403 }
      );
    }

    if (role === 'TENANT') {
      return NextResponse.json(
        {
          success: false,
          message: 'Cổng vận hành nội bộ chỉ dành cho Chủ trọ và Quản trị viên. Quý khách vui lòng đăng nhập tại trang Khách thuê.',
        },
        { status: 403 }
      );
    }

    // 1. ADMIN LOGIN
    if (role === 'ADMIN') {
      return NextResponse.json({
        success: true,
        message: 'Đăng nhập Quản trị viên thành công!',
        session: {
          id: verifiedSession.user.id,
          name: verifiedSession.user.name || ADMIN_ACCOUNT.name,
          email: verifiedSession.user.email || ADMIN_ACCOUNT.email,
          phone: verifiedSession.user.phone || ADMIN_ACCOUNT.phone,
          role: 'ADMIN',
          avatar: verifiedSession.user.image || ADMIN_ACCOUNT.avatar,
        },
        redirectTo: '/admin',
      });
    }

    // 2. LANDLORD LOGIN
    if (role === 'LANDLORD') {
      const landlords = await getLandlords();
      let matchedLandlord = null;

      matchedLandlord = landlords.find((l) => l.id === verifiedSession.user.id) || null;

      if (!matchedLandlord) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy tài khoản Chủ trọ này trong hệ thống.' },
          { status: 404 }
        );
      }

      if (matchedLandlord.id !== verifiedSession.user.id) {
        return NextResponse.json(
          { success: false, message: 'Tài khoản Chủ trọ không khớp với phiên đăng nhập.' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Chào mừng Chủ trọ ${matchedLandlord.name}!`,
        session: {
          id: matchedLandlord.id,
          name: matchedLandlord.name,
          email: matchedLandlord.email,
          phone: matchedLandlord.phone,
          role: 'LANDLORD',
          landlordId: matchedLandlord.id,
          avatar: matchedLandlord.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
        },
        redirectTo: '/chu-tro',
      });
    }

    return NextResponse.json({ success: false, message: 'Vai trò không hợp lệ.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi xác thực cổng vận hành.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
