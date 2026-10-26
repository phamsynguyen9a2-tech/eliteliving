import { NextResponse } from 'next/server';
import { type Session } from 'next-auth';
import { getRequestSession } from '@/lib/request-session';

import prisma from '@/lib/prisma';
import { getRequests, getPostById, updateRequestStatus } from '@/lib/roommate-store';
import type { RoommateRequest } from '@/lib/types';

export type RoommateSession = Session & { user: { id: string } };

export function isAdmin(session: RoommateSession): boolean {
  return session.user.role === 'ADMIN';
}

// Lấy session NextAuth; trả về response 401 nếu chưa đăng nhập.
export async function requireRoommateSession(): Promise<
  { session: RoommateSession; error?: undefined } | { session?: undefined; error: NextResponse }
> {
  const session = await getRequestSession();
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
  // Chỉ khớp theo SĐT khi SĐT của tài khoản đã được xác minh.
  return !!session.user.phone && !!session.user.phoneVerified && post.contact_phone === session.user.phone;
}

// Người gọi có được xem yêu cầu này (in-memory) không: người gửi, chủ bài, hoặc ADMIN.
export function canViewStoreRequest(r: RoommateRequest, session: RoommateSession): boolean {
  return isAdmin(session) || r.requester_id === session.user.id || isStoreRequestOwner(r, session);
}

/** Mã lỗi Prisma (P2002 trùng khóa, P2025 không có bản ghi, …) hoặc null với lỗi khác. */
export function prismaErrorCode(err: unknown): string | null {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === 'string' && /^P\d{4}$/.test(code) ? code : null;
}

/**
 * Lưu trạng thái yêu cầu ở ghép. CSDL là nơi lưu chính: lỗi CSDL được báo thật (500), không báo
 * thành công. Chỉ yêu cầu không có trong CSDL (bài đăng mẫu / chế độ offline) mới cập nhật ở bộ nhớ.
 */
export async function saveRequestStatus(
  id: string,
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
): Promise<{ data: unknown } | { error: NextResponse }> {
  try {
    const updated = await prisma.roommateRequest.update({ where: { id }, data: { status } });
    updateRequestStatus(id, status);
    return { data: updated };
  } catch (err) {
    if (prismaErrorCode(err) !== 'P2025' && prismaErrorCode(err) !== null) {
      return {
        error: NextResponse.json(
          { success: false, message: 'Không lưu được trạng thái yêu cầu ở ghép. Vui lòng thử lại.' },
          { status: 500 }
        ),
      };
    }
    // Không có trong CSDL (P2025) hoặc CSDL không kết nối được: dùng bộ nhớ nếu yêu cầu nằm ở đó
    const inMemory = updateRequestStatus(id, status);
    if (inMemory) return { data: inMemory };
    return {
      error: NextResponse.json(
        prismaErrorCode(err) === 'P2025'
          ? { success: false, message: 'Không tìm thấy yêu cầu ở ghép.' }
          : { success: false, message: 'Không lưu được trạng thái yêu cầu ở ghép. Vui lòng thử lại.' },
        { status: prismaErrorCode(err) === 'P2025' ? 404 : 500 }
      ),
    };
  }
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
