import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/request-session';
import { prisma } from '@/lib/prisma';
import { getAdminErrorResponse, withDatabaseReadRetry } from '@/lib/database-resilience';
import { setAccountBlockedStatus, setAccountRoleStatus } from '@/lib/account-status';
import { hashPassword } from '@/lib/password';
import { lifecycleErrorResponse } from '@/lib/lifecycle-errors';

import {
  evaluateRecommenderSystem,
  getAdminStats,
  getBuildingSummaries,
  getContracts,
  getUtilityBills,
  getAppointments,
  getLandlords,
  updateAppointmentStatus,
  updateBillStatus,
  terminateContract,
  changeRoomStatusManually,
  updateRoom,
  createRoom,
} from '@/lib/db';

/** Độ dài tối thiểu của mật khẩu: tài khoản vận hành (chủ trọ, admin) chặt hơn khách thuê. */
function minPasswordLength(role: string) {
  return role === 'TENANT' ? 6 : 8;
}

function validatePassword(password: unknown, role: string): string | null {
  if (typeof password !== 'string' || !password) return 'Vui lòng nhập mật khẩu ban đầu cho tài khoản.';
  const min = minPasswordLength(role);
  if (password.length < min) return `Mật khẩu phải có tối thiểu ${min} ký tự.`;
  if (password.length > 128) return 'Mật khẩu quá dài (tối đa 128 ký tự).';
  return null;
}

/**
 * Sau khi đổi vai trò: chủ trọ đăng nhập bằng mật khẩu ở bảng landlords, admin/khách thuê bằng
 * mật khẩu ở bảng users. Nếu bảng cần dùng chưa có mật khẩu thì chép mật khẩu sẵn có sang,
 * để người dùng vẫn đăng nhập được bằng mật khẩu cũ.
 */
async function syncPasswordAfterRoleChange(userId: string, role: string) {
  const [user, landlord] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } }),
    prisma.landlord.findUnique({ where: { id: userId }, select: { passwordHash: true } }),
  ]);
  if (role === 'LANDLORD' && landlord && !landlord.passwordHash && user?.passwordHash) {
    await prisma.landlord.update({ where: { id: userId }, data: { passwordHash: user.passwordHash } });
  }
  if (role !== 'LANDLORD' && user && !user.passwordHash && landlord?.passwordHash) {
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: landlord.passwordHash } });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getRequestSession();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Bạn không có quyền truy cập dữ liệu quản trị.' },
        { status: session?.user ? 403 : 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') || 'all';

    // If only requesting stats
    if (section === 'stats') {
      const stats = await withDatabaseReadRetry(() => getAdminStats());
      return NextResponse.json({ success: true, data: { stats } });
    }

    // Run all admin queries in parallel for < 1s response time
    const [
      stats,
      buildings,
      roomsList,
      rawUsers,
      landlords,
      rawAppointments,
      rawContracts,
      rawBills,
      landlordsWithPassword,
    ] = await withDatabaseReadRetry(() =>
      Promise.all([
        getAdminStats(),
        getBuildingSummaries(undefined, { includeUnlisted: true }),
        prisma.room.findMany({
          orderBy: { id: 'asc' },
          select: {
            id: true,
            roomCode: true,
            projectCode: true,
            projectName: true,
            title: true,
            price: true,
            deposit: true,
            area: true,
            roomType: true,
            district: true,
            status: true,
            landlordId: true,
            landlordName: true,
            landlordPhone: true,
            amenities: true,
            images: true,
            address: true,
            latitude: true,
            longitude: true,
            description: true,
            electricityRate: true,
            waterRate: true,
            internetFee: true,
            serviceFee: true,
            parkingFee: true,
            listingStatus: true,
            moderationNote: true,
          },
        }),
        prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
        }),
        getLandlords(),
        getAppointments(),
        getContracts(),
        getUtilityBills(),
        prisma.landlord.findMany({ where: { passwordHash: { not: null } }, select: { id: true } }),
      ])
    );
    const landlordPasswordIds = new Set(landlordsWithPassword.map((l) => l.id));

    // Unified user directory (đọc trạng thái khóa isBlocked thực tế từ cơ sở dữ liệu)
    const userById = new Map(rawUsers.map((u) => [u.id, u]));
    const landlordIds = new Set(landlords.map((l) => l.id));

    const unifiedUsers = [
      // Landlords as users (kết hợp trạng thái khóa/vai trò nếu đã lưu trong bảng users)
      ...landlords.map((l) => {
        const linkedUser = userById.get(l.id);
        return {
          id: l.id,
          name: linkedUser?.name || l.name,
          email: linkedUser?.email || l.email || `${l.id}@eliteliving.vn`,
          phone: linkedUser?.phone || l.phone,
          role: linkedUser?.role || l.role || 'LANDLORD',
          status: linkedUser?.isBlocked ? 'LOCKED' : 'ACTIVE',
          hasPassword: (linkedUser?.role || l.role || 'LANDLORD') === 'LANDLORD'
            ? landlordPasswordIds.has(l.id)
            : Boolean(linkedUser?.passwordHash),
          createdAt: linkedUser?.createdAt
            ? linkedUser.createdAt.toISOString().split('T')[0]
            : '2026-08-15',
        };
      }),
      // Users from User table (Admin, Tenants, and newly created accounts)
      ...rawUsers
        .filter((u) => !landlordIds.has(u.id))
        .map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role || 'TENANT',
          status: u.isBlocked ? 'LOCKED' : 'ACTIVE',
          hasPassword: Boolean(u.passwordHash),
          createdAt: u.createdAt ? u.createdAt.toISOString().split('T')[0] : '2026-09-01',
        })),
    ];

    // Normalize both camelCase and snake_case fields for Admin UI
    const appointments = rawAppointments.map((a) => ({
      ...a,
      roomId: a.room_id,
      userId: a.user_id,
      userName: a.user_name,
      userPhone: a.user_phone,
      timeSlot: a.time_slot,
      createdAt: a.created_at,
    }));

    const contracts = rawContracts.map((c) => ({
      ...c,
      roomId: c.room_id,
      roomTitle: c.room_title,
      tenantName: c.tenant_name,
      tenantPhone: c.tenant_phone,
      landlordName: c.landlord_name,
      startDate: c.start_date,
      endDate: c.end_date,
      monthlyRent: c.monthly_rent,
      depositAmount: c.deposit_amount,
      createdAt: c.created_at,
    }));

    const bills = rawBills.map((b) => ({
      ...b,
      roomId: b.room_id,
      roomCode: b.room_code,
      electricOld: b.electric_old,
      electricNew: b.electric_new,
      electricUsed: b.electric_used,
      electricCost: b.electric_cost,
      waterOld: b.water_old,
      waterNew: b.water_new,
      waterUsed: b.water_used,
      waterCost: b.water_cost,
      internetCost: b.internet_cost,
      serviceCost: b.service_cost,
      rentCost: b.rent_cost,
      totalAmount: b.total_amount,
      createdAt: b.created_at,
    }));

    // 8. Amenities Frequency Breakdown across ALL rooms in the database
    const amenityCounts: Record<string, number> = {};
    roomsList.forEach((r) => {
      r.amenities.forEach((a) => {
        amenityCounts[a] = (amenityCounts[a] || 0) + 1;
      });
    });

    const amenitiesStats = Object.entries(amenityCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        buildings,
        rooms: roomsList,
        users: unifiedUsers,
        appointments,
        contracts,
        bills,
        amenities: amenitiesStats,
      },
    });
  } catch (error: any) {
    console.error('Admin data GET error:', error);
    const response = getAdminErrorResponse(error);
    return NextResponse.json(
      response.body,
      { status: response.status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getRequestSession();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Bạn không có quyền thực hiện thao tác quản trị.' },
        { status: session?.user ? 403 : 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    // 1. Room Status update
    if (action === 'UPDATE_ROOM_STATUS') {
      const { roomId, status } = body;
      // Đổi tay chỉ cho các chuyển đổi khớp vòng đời thuê (không bỏ qua hợp đồng / đặt cọc đang có)
      try {
        const updated = await changeRoomStatusManually(Number(roomId), status);
        return NextResponse.json({ success: true, data: updated, message: 'Đã cập nhật trạng thái phòng.' });
      } catch (err) {
        const errorResponse = lifecycleErrorResponse(err);
        if (errorResponse) return errorResponse;
        throw err;
      }
    }

    // 2. Room Edit/Override
    if (action === 'UPDATE_ROOM') {
      const { roomId, roomData } = body;
      const updated = await updateRoom(Number(roomId), roomData);
      if (!updated) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy phòng cần chỉnh sửa.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: updated, message: 'Đã lưu thông tin phòng.' });
    }

    // 3. Appointment Status update (Confirm / Cancel / Complete)
    if (action === 'UPDATE_APPOINTMENT_STATUS') {
      const { appointmentId, status } = body;
      const updated = await updateAppointmentStatus(appointmentId, status);
      if (!updated) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy lịch hẹn hoặc không thể cập nhật trạng thái.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: updated, message: 'Đã cập nhật trạng thái lịch hẹn.' });
    }

    // 4. Utility Bill Status update (PAID / UNPAID)
    if (action === 'UPDATE_BILL_STATUS') {
      const { billId, status } = body;
      const updated = await updateBillStatus(billId, status);
      if (!updated) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy hóa đơn cần cập nhật.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: updated, message: 'Đã cập nhật trạng thái hóa đơn.' });
    }

    // 5. Terminate Contract
    if (action === 'TERMINATE_CONTRACT') {
      const { contractId, roomId } = body;
      let updated;
      try {
        updated = await terminateContract(contractId, Number(roomId));
      } catch (err) {
        const errorResponse = lifecycleErrorResponse(err);
        if (errorResponse) return errorResponse;
        throw err;
      }
      if (!updated) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy hợp đồng hoặc không thể thanh lý.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: updated, message: 'Đã thanh lý hợp đồng và giải phóng phòng.' });
    }

    // 6. User Status Toggle (Active / Locked) — lưu thực tế cột isBlocked vào cơ sở dữ liệu
    if (action === 'TOGGLE_USER_STATUS') {
      const { userId, status } = body;
      if (typeof userId !== 'string' || !userId.trim()) {
        return NextResponse.json(
          { success: false, message: 'Thiếu mã định danh tài khoản cần cập nhật.' },
          { status: 400 }
        );
      }
      if (status !== 'ACTIVE' && status !== 'LOCKED') {
        return NextResponse.json(
          { success: false, message: 'Trạng thái tài khoản không hợp lệ.' },
          { status: 400 }
        );
      }
      if (userId === session.user.id) {
        return NextResponse.json(
          { success: false, message: 'Không thể tự khóa tài khoản Quản trị viên đang đăng nhập.' },
          { status: 400 }
        );
      }

      const isBlocked = status === 'LOCKED';
      const existingUser = await prisma.user.findUnique({ where: { id: userId } });

      if (existingUser) {
        await prisma.user.update({
          where: { id: userId },
          data: { isBlocked },
        });
      } else {
        const landlord = await prisma.landlord.findUnique({ where: { id: userId } });
        if (!landlord) {
          return NextResponse.json(
            { success: false, message: 'Không tìm thấy tài khoản này trong cơ sở dữ liệu.' },
            { status: 404 }
          );
        }
        const landlordEmail = landlord.email || `${landlord.id}@eliteliving.vn`;
        await prisma.user.upsert({
          where: { id: landlord.id },
          update: { isBlocked },
          create: {
            id: landlord.id,
            name: landlord.name,
            email: landlordEmail,
            phone: landlord.phone,
            role: 'LANDLORD',
            isBlocked,
            phoneVerified: true,
          },
        });
      }

      // Phiên đang mở của tài khoản bị khóa mất hiệu lực ngay ở request kế tiếp
      setAccountBlockedStatus(userId, isBlocked);

      return NextResponse.json({
        success: true,
        message: isBlocked
          ? 'Đã khóa tài khoản. Phiên đăng nhập đang mở của tài khoản này cũng bị đăng xuất.'
          : 'Đã mở khóa tài khoản thành công.',
        data: { userId, status },
      });
    }

    // 7. Change User Role — lưu thực tế vai trò vào cơ sở dữ liệu và đồng bộ bảng landlords nếu cần
    if (action === 'CHANGE_USER_ROLE') {
      const { userId, role } = body;
      if (typeof userId !== 'string' || !userId.trim()) {
        return NextResponse.json(
          { success: false, message: 'Thiếu mã tài khoản cần phân quyền.' },
          { status: 400 }
        );
      }
      if (!['TENANT', 'LANDLORD', 'ADMIN'].includes(role)) {
        return NextResponse.json(
          { success: false, message: 'Vai trò phân quyền không hợp lệ.' },
          { status: 400 }
        );
      }
      if (userId === session.user.id && role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, message: 'Không thể tự hạ quyền tài khoản Quản trị viên đang đăng nhập.' },
          { status: 400 }
        );
      }

      const existingUser = await prisma.user.findUnique({ where: { id: userId } });
      if (existingUser) {
        const updated = await prisma.user.update({
          where: { id: userId },
          data: { role: role as any },
        });
        if (role === 'LANDLORD') {
          await prisma.landlord.upsert({
            where: { id: updated.id },
            update: {
              name: updated.name,
              email: updated.email,
              phone: updated.phone,
              role: 'LANDLORD',
            },
            create: {
              id: updated.id,
              name: updated.name,
              email: updated.email,
              phone: updated.phone,
              role: 'LANDLORD',
            },
          });
        } else {
          // Hạ quyền chủ trọ: dòng landlords (giữ nguyên phòng, hợp đồng) cũng đổi vai trò,
          // để đăng nhập cổng chủ trọ bằng tài khoản này bị từ chối
          await prisma.landlord.updateMany({ where: { id: updated.id }, data: { role } });
        }
      } else {
        const landlord = await prisma.landlord.findUnique({ where: { id: userId } });
        if (!landlord) {
          return NextResponse.json(
            { success: false, message: 'Không tìm thấy tài khoản cần phân quyền trong cơ sở dữ liệu.' },
            { status: 404 }
          );
        }
        const landlordEmail = landlord.email || `${landlord.id}@eliteliving.vn`;
        await prisma.landlord.update({
          where: { id: landlord.id },
          data: { role },
        });
        await prisma.user.upsert({
          where: { id: landlord.id },
          update: { role: role as any },
          create: {
            id: landlord.id,
            name: landlord.name,
            email: landlordEmail,
            phone: landlord.phone,
            role: role as any,
            phoneVerified: true,
          },
        });
      }

      await syncPasswordAfterRoleChange(userId, role);
      // Phiên đang mở với vai trò cũ mất hiệu lực ngay ở request kế tiếp
      setAccountRoleStatus(userId, role);

      return NextResponse.json({
        success: true,
        message: `Đã cập nhật vai trò thành ${role} trong cơ sở dữ liệu.`,
        data: { userId, role },
      });
    }

    // 8. Create New User Account — kiểm tra trùng lặp và lưu thực tế vào cơ sở dữ liệu
    if (action === 'CREATE_USER') {
      const trimmedName = typeof body.name === 'string' ? body.name.trim() : '';
      const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : '';
      const cleanedPhone = rawPhone.replace(/\s|-/g, '');
      const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const role = ['TENANT', 'LANDLORD', 'ADMIN'].includes(body.role) ? body.role : 'TENANT';

      if (trimmedName.length < 2) {
        return NextResponse.json(
          { success: false, message: 'Họ và tên phải có tối thiểu 2 ký tự.' },
          { status: 400 }
        );
      }
      const passwordError = validatePassword(body.password, role);
      if (passwordError) {
        return NextResponse.json({ success: false, message: passwordError }, { status: 400 });
      }
      const passwordHash = await hashPassword(String(body.password));
      if (!/^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-689]|9[0-46-9])\d{7}$/.test(cleanedPhone)) {
        return NextResponse.json(
          { success: false, message: 'Số điện thoại không hợp lệ (ví dụ: 0901234567).' },
          { status: 400 }
        );
      }

      const normalizedPhone = cleanedPhone.startsWith('+84')
        ? `0${cleanedPhone.slice(3)}`
        : cleanedPhone;
      const finalEmail = rawEmail || `${normalizedPhone}@khachthue.eliteliving.vn`;
      if (!finalEmail.includes('@')) {
        return NextResponse.json(
          { success: false, message: 'Địa chỉ email không hợp lệ.' },
          { status: 400 }
        );
      }

      const duplicateUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: finalEmail, mode: 'insensitive' } },
            { phone: normalizedPhone },
          ],
        },
      });
      if (duplicateUser) {
        return NextResponse.json(
          {
            success: false,
            message: 'Email hoặc số điện thoại này đã được đăng ký cho một tài khoản khác.',
          },
          { status: 409 }
        );
      }

      const newId = role === 'LANDLORD' ? `landlord_${Date.now()}` : `user_${Date.now()}`;
      const created = await prisma.user.create({
        data: {
          id: newId,
          name: trimmedName,
          email: finalEmail,
          phone: normalizedPhone,
          role: role as any,
          phoneVerified: true,
          passwordHash,
        },
      });

      if (role === 'LANDLORD') {
        await prisma.landlord.upsert({
          where: { id: newId },
          update: {
            name: trimmedName,
            email: finalEmail,
            phone: normalizedPhone,
            role: 'LANDLORD',
            passwordHash,
          },
          create: {
            id: newId,
            name: trimmedName,
            email: finalEmail,
            phone: normalizedPhone,
            role: 'LANDLORD',
            passwordHash,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message:
          role === 'TENANT'
            ? 'Đã tạo tài khoản. Khách thuê đăng nhập bằng email/SĐT và mật khẩu vừa đặt.'
            : 'Đã tạo tài khoản. Đăng nhập tại Cổng vận hành bằng email và mật khẩu vừa đặt.',
        data: {
          id: created.id,
          name: created.name,
          email: created.email,
          phone: created.phone,
          role: created.role,
          status: created.isBlocked ? 'LOCKED' : 'ACTIVE',
          hasPassword: true,
          createdAt: created.createdAt.toISOString().split('T')[0],
        },
      });
    }

    // 8b. Cấp lại mật khẩu cho tài khoản (khách thuê, chủ trọ, admin)
    if (action === 'RESET_USER_PASSWORD') {
      const { userId } = body;
      if (typeof userId !== 'string' || !userId.trim()) {
        return NextResponse.json({ success: false, message: 'Thiếu mã tài khoản.' }, { status: 400 });
      }
      const [user, landlord] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } }),
        prisma.landlord.findUnique({ where: { id: userId }, select: { id: true } }),
      ]);
      if (!user && !landlord) {
        return NextResponse.json({ success: false, message: 'Không tìm thấy tài khoản.' }, { status: 404 });
      }
      const effectiveRole = user?.role || 'LANDLORD';
      const passwordError = validatePassword(body.password, effectiveRole);
      if (passwordError) {
        return NextResponse.json({ success: false, message: passwordError }, { status: 400 });
      }
      const passwordHash = await hashPassword(String(body.password));
      await Promise.all([
        user ? prisma.user.update({ where: { id: userId }, data: { passwordHash } }) : Promise.resolve(null),
        landlord ? prisma.landlord.update({ where: { id: userId }, data: { passwordHash } }) : Promise.resolve(null),
      ]);
      return NextResponse.json({
        success: true,
        message: 'Đã cấp mật khẩu mới. Hãy gửi mật khẩu này cho người dùng qua kênh riêng.',
        data: { userId, hasPassword: true },
      });
    }

    // 9. Đánh giá thuật toán gợi ý: temporal hold-out 80/20 trên CSDL + đo độ trễ của hàm API thật
    if (action === 'RUN_RECOMMENDER_BENCHMARK') {
      const evaluation = await evaluateRecommenderSystem(true, { measureLatency: true });
      return NextResponse.json({
        success: true,
        data: evaluation,
      });
    }

    return NextResponse.json({ success: false, message: 'Thao tác không được hỗ trợ' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin POST error:', error);
    const response = getAdminErrorResponse(error);
    return NextResponse.json(
      response.body,
      { status: response.status }
    );
  }
}
