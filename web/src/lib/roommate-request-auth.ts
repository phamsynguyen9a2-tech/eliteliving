import { NextResponse } from 'next/server';
import { getServerSession, type Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getRequests, getPostById } from '@/lib/roommate-store';
import type { RoommateRequest } from '@/lib/types';

export type RoommateSession = Session & { user: { id: string } };

export function isAdmin(session: RoommateSession): boolean {
  return session.user.role === 'ADMIN';
}

// Lấy session NextAuth; trả về response 401 nếu chưa đăng nhập.
export async function requireRoommateSession(): Promise<
  { session: RoommateSession; error?: undefined } | { session?: undefined; error: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Bạn cần đăng nhập để xem hoặc cập nhật yêu cầu ở ghép.' },
        { status: 401 }
      ),
    };
  }
  return { session: session as RoommateSession };
}

// Chủ bài đăng (in-memory): khớp user_id của bài, post_owner_id lưu kèm yêu cầu, hoặc SĐT liên hệ của bài.
function isStoreRequestOwner(r: RoommateRequest, session: RoommateSession): boolean {
  const uid = session.user.id;
  if (r.post_owner_id && r.post_owner_id === uid) return true;
  const post = getPostById(r.post_id);
  if (!post) return false;
  if (post.user_id === uid) return true;
  return !!session.user.phone && post.contact_phone === session.user.phone;
}

// Người gọi có được xem yêu cầu này (in-memory) không: người gửi, chủ bài, hoặc ADMIN.
export function canViewStoreRequest(r: RoommateRequest, session: RoommateSession): boolean {
  return isAdmin(session) || r.requester_id === session.user.id || isStoreRequestOwner(r, session);
}

// Kiểm tra quyền đổi trạng thái: chỉ chủ bài đăng hoặc ADMIN. Trả về response lỗi nếu không được phép.
export async function authorizeRequestStatusChange(
  id: string,
  session: RoommateSession
): Promise<NextResponse | null> {
  let ownerId: string | null | undefined;
  let found = false;

  try {
    const dbRequest = await prisma.roommateRequest.findUnique({
      where: { id },
      include: { post: { select: { userId: true } } },
    });
    if (dbRequest) {
      found = true;
      ownerId = dbRequest.post?.userId;
    }
  } catch {
    // Prisma offline, kiểm tra in-memory store bên dưới
  }

  const storeRequest = getRequests().find((r) => r.id === id);
  if (!found && !storeRequest) {
    return NextResponse.json(
      { success: false, message: 'Không tìm thấy yêu cầu ở ghép.' },
      { status: 404 }
    );
  }

  if (isAdmin(session)) return null;
  if (found && ownerId === session.user.id) return null;
  if (!found && storeRequest && isStoreRequestOwner(storeRequest, session)) return null;

  return NextResponse.json(
    { success: false, message: 'Chỉ chủ bài đăng mới được chấp nhận hoặc từ chối yêu cầu này.' },
    { status: 403 }
  );
}
