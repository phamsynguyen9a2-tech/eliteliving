import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/request-session';

import prisma from '@/lib/prisma';
import { getRequests, addRequest, getPostById, getPosts } from '@/lib/roommate-store';
import { checkRateLimit } from '@/lib/spam-filter';
import type { RoommateRequest } from '@/lib/types';
import {
  requireRoommateSession,
  isAdmin,
  canViewStoreRequest,
  authorizeRequestStatusChange,
  prismaErrorCode,
  saveRequestStatus,
} from '@/lib/roommate-request-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRoommateSession();
    if (auth.error) return auth.error;
    const { session } = auth;

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const requesterId = searchParams.get('requesterId');
    const ownerId = searchParams.get('ownerId');

    // 1. Try fetching from Prisma DB if connected
    try {
      const where: any = {};
      if (postId) where.postId = postId;
      if (requesterId) where.requesterId = requesterId;
      if (ownerId) where.post = { userId: ownerId };
      // Không phải ADMIN: chỉ thấy yêu cầu mình gửi hoặc yêu cầu gửi tới bài đăng của mình
      if (!isAdmin(session)) {
        where.AND = [
          { OR: [{ requesterId: session.user.id }, { post: { userId: session.user.id } }] },
        ];
      }

      const dbRequests = await prisma.roommateRequest.findMany({
        where,
        include: {
          requester: { include: { roommateProfile: true } },
          post: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (dbRequests && dbRequests.length > 0) {
        return NextResponse.json({
          success: true,
          data: dbRequests.map((r) => ({
            id: r.id,
            post_id: r.postId,
            requester_id: r.requesterId,
            message: r.message,
            status: r.status,
            created_at: r.createdAt.toISOString(),
            requester_name: r.requester.name,
            requester_phone: r.requester.phone,
            requester_image: r.requester.image,
            post_title: r.post.title,
            post_owner_id: r.post.userId,
          })),
        });
      }
    } catch {
      // Prisma offline, fallback to in-memory store
    }

    // 2. Query in-memory requestsStore
    let list = getRequests().filter((r) => canViewStoreRequest(r, session));

    if (postId) {
      list = list.filter((r) => r.post_id === postId);
    }
    if (requesterId) {
      list = list.filter((r) => r.requester_id === requesterId);
    }
    if (ownerId) {
      // Find all posts owned by this user
      const userPostIds = new Set(
        getPosts()
          .filter(
            (p) =>
              p.user_id === ownerId ||
              p.contact_phone === ownerId ||
              // Chủ bài đăng khớp theo SĐT của tài khoản đang đăng nhập
              (ownerId === session.user.id && !!session.user.phone && !!session.user.phoneVerified && p.contact_phone === session.user.phone)
          )
          .map((p) => p.id)
      );
      list = list.filter((r) => r.post_owner_id === ownerId || userPostIds.has(r.post_id));
    }

    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getRequestSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Bạn cần đăng nhập tài khoản để gửi yêu cầu ở ghép.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { post_id, message, requester_name, requester_phone } = body;

    const actualRequesterId = session.user.id;
    const actualName = session.user.name || requester_name || 'Khách thuê';
    const actualPhone = session.user.phone || requester_phone || '';

    if (!post_id) {
      return NextResponse.json({ success: false, message: 'Thiếu mã bài đăng (post_id)' }, { status: 400 });
    }

    // Rate Limit check
    if (session?.user?.id) {
      try {
        const rateCheck = await checkRateLimit(session.user.id, 'ROOMMATE_REQUEST');
        if (!rateCheck.allowed) {
          return NextResponse.json(
            { success: false, message: rateCheck.message },
            { status: 429 }
          );
        }
      } catch {}
    }

    // Bài đăng trong CSDL là nguồn chính
    let dbPost: { id: string; userId: string; title: string; status: string } | null = null;
    try {
      dbPost = await prisma.roommatePost.findUnique({
        where: { id: String(post_id) },
        select: { id: true, userId: true, title: true, status: true },
      });
    } catch {
      // CSDL không kết nối được (chế độ offline): dùng bài đăng ở bộ nhớ bên dưới
    }

    // Get Post information to link owner and title
    const matchedPost = getPostById(post_id);
    if (!dbPost && !matchedPost) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy bài đăng ở ghép.' }, { status: 404 });
    }
    const postOwnerId = dbPost?.userId ?? matchedPost?.user_id;
    if (postOwnerId === actualRequesterId) {
      return NextResponse.json(
        { success: false, message: 'Bạn không thể gửi yêu cầu kết nối tới bài đăng của chính mình.' },
        { status: 400 }
      );
    }
    if (dbPost && dbPost.status !== 'OPEN') {
      return NextResponse.json(
        { success: false, message: 'Bài đăng này đã đóng, không nhận thêm yêu cầu ở ghép.' },
        { status: 409 }
      );
    }

    const newRequest: RoommateRequest = {
      id: `req_${Date.now()}`,
      post_id,
      requester_id: actualRequesterId,
      message: message || '',
      status: 'PENDING',
      created_at: new Date().toISOString(),
      requester_name: actualName,
      requester_phone: actualPhone,
      requester_image: session?.user?.image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
      post_title: dbPost?.title || matchedPost?.title || 'Phòng ở ghép Elite Living',
      post_owner_id: postOwnerId,
    };

    // Bài đăng có trong CSDL: phải lưu được vào CSDL mới báo thành công (không nuốt lỗi).
    // Chỉ bài đăng mẫu / CSDL offline mới lưu tạm ở bộ nhớ như trước.
    if (dbPost) {
      try {
        await prisma.roommateRequest.create({
          data: {
            id: newRequest.id,
            postId: dbPost.id,
            requesterId: actualRequesterId,
            message: message || '',
            status: 'PENDING',
          },
        });
      } catch (err) {
        if (prismaErrorCode(err) === 'P2002') {
          return NextResponse.json(
            { success: false, message: 'Bạn đã gửi yêu cầu kết nối tới bài đăng này rồi. Vui lòng chờ chủ bài đăng phản hồi.' },
            { status: 409 }
          );
        }
        console.error('[roommate/requests] Không lưu được yêu cầu ở ghép:', err);
        return NextResponse.json(
          { success: false, message: 'Không lưu được yêu cầu ở ghép. Vui lòng thử lại sau.' },
          { status: 500 }
        );
      }
    } else if (
      getRequests().some((r) => r.post_id === post_id && r.requester_id === actualRequesterId)
    ) {
      return NextResponse.json(
        { success: false, message: 'Bạn đã gửi yêu cầu kết nối tới bài đăng này rồi. Vui lòng chờ chủ bài đăng phản hồi.' },
        { status: 409 }
      );
    }

    // Add to in-memory store
    addRequest(newRequest);

    return NextResponse.json({
      success: true,
      message: 'Gửi yêu cầu kết nối ở ghép thành công! Chủ bài đăng sẽ sớm phản hồi bạn.',
      data: newRequest,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRoommateSession();
    if (auth.error) return auth.error;

    const body = await request.json();
    const { id, status } = body;

    if (!id || !['PENDING', 'ACCEPTED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu cập nhật trạng thái không hợp lệ.' },
        { status: 400 }
      );
    }

    const forbidden = await authorizeRequestStatusChange(id, auth.session);
    if (forbidden) return forbidden;

    // Lỗi CSDL được báo thật, không báo thành công
    const saved = await saveRequestStatus(id, status);
    if ('error' in saved) return saved.error;

    return NextResponse.json({
      success: true,
      message: `Cập nhật trạng thái yêu cầu kết nối thành công: ${status}`,
      data: saved.data,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
