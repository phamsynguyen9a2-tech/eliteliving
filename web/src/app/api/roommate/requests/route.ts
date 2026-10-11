import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getRequests, addRequest, updateRequestStatus, getPostById, getPosts } from '@/lib/roommate-store';
import { checkRateLimit } from '@/lib/spam-filter';
import type { RoommateRequest } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
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
    let list = [...getRequests()];

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
          .filter((p) => p.user_id === ownerId || p.contact_phone === ownerId)
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
    const session = await getServerSession(authOptions);
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

    // Get Post information to link owner and title
    const matchedPost = getPostById(post_id);

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
      post_title: matchedPost?.title || 'Phòng ở ghép Elite Living',
      post_owner_id: matchedPost?.user_id,
    };

    // Try DB insertion
    try {
      await prisma.roommateRequest.create({
        data: {
          id: newRequest.id,
          postId: post_id,
          requesterId: actualRequesterId,
          message: message || '',
          status: 'PENDING',
        },
      });
    } catch {}

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
    const body = await request.json();
    const { id, status } = body;

    if (!id || !['PENDING', 'ACCEPTED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu cập nhật trạng thái không hợp lệ.' },
        { status: 400 }
      );
    }

    // Update in DB if available
    try {
      await prisma.roommateRequest.update({
        where: { id },
        data: { status },
      });
    } catch {}

    // Update in-memory store
    const updated = updateRequestStatus(id, status);

    return NextResponse.json({
      success: true,
      message: `Cập nhật trạng thái yêu cầu kết nối thành công: ${status}`,
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
