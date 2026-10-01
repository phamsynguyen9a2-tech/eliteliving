import { NextRequest, NextResponse } from 'next/server';
import { getLandlords } from '@/lib/db';

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
    const body = await request.json();
    const { role, email, password, landlordId, isQuickLogin } = body;

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
      if (!isQuickLogin && password && password !== 'admin123' && password !== '123456') {
        return NextResponse.json(
          { success: false, message: 'Mật khẩu quản trị viên không chính xác (mặc định demo: admin123 hoặc 123456)' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Đăng nhập Quản trị viên thành công!',
        session: {
          ...ADMIN_ACCOUNT,
          token: `token_admin_${Date.now()}`,
        },
        redirectTo: '/admin',
      });
    }

    // 2. LANDLORD LOGIN
    if (role === 'LANDLORD') {
      const landlords = await getLandlords();
      let matchedLandlord = null;

      if (landlordId) {
        matchedLandlord = landlords.find((l) => l.id === landlordId);
      } else if (email) {
        matchedLandlord = landlords.find(
          (l) => l.email.toLowerCase() === email.toLowerCase() || l.phone === email
        );
      }

      // Default to first landlord if none matched in demo
      if (!matchedLandlord && landlords.length > 0) {
        matchedLandlord = landlords[0];
      }

      if (!matchedLandlord) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy tài khoản Chủ trọ này trong hệ thống.' },
          { status: 404 }
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
          token: `token_landlord_${matchedLandlord.id}_${Date.now()}`,
        },
        redirectTo: '/chu-tro',
      });
    }

    return NextResponse.json({ success: false, message: 'Vai trò không hợp lệ.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
