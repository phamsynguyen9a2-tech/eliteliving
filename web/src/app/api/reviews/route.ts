import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/request-session';
import { businessErrorResponse } from '@/lib/admin-guard';
import {
  canReviewRoom,
  deleteReview,
  getRoomReviews,
  listManagedReviews,
  replyToReview,
  setReviewHidden,
  upsertReview,
} from '@/lib/reviews';
import { publishRoomEvent } from '@/lib/realtime-bus';

const ERRORS = { INVALID_REVIEW: 400, REVIEW_NOT_ALLOWED: 403, REVIEW_FORBIDDEN: 403 };

async function currentUser() {
  const session = await getRequestSession().catch(() => null);
  const user = session?.user as { id?: string; role?: string } | undefined;
  return user?.id ? { id: user.id, role: user.role || 'TENANT' } : null;
}

/**
 * GET /api/reviews?roomId=…            → đánh giá công khai của phòng (+ đánh giá của tôi, quyền đánh giá)
 * GET /api/reviews?scope=manage&filter= → chủ trọ: đánh giá về phòng của mình; admin: tất cả
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const user = await currentUser();

  if (searchParams.get('scope') === 'manage') {
    if (!user || (user.role !== 'LANDLORD' && user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập cổng chủ trọ / quản trị.' }, { status: 401 });
    }
    const raw = searchParams.get('filter');
    const filter = raw === 'unreplied' || raw === 'hidden' || raw === 'low' ? raw : 'all';
    const data = await listManagedReviews({ landlordId: user.role === 'LANDLORD' ? user.id : undefined, filter });
    return NextResponse.json({ success: true, data });
  }

  const roomId = Number(searchParams.get('roomId'));
  if (!Number.isInteger(roomId) || roomId <= 0) {
    return NextResponse.json({ success: false, message: 'Thiếu mã phòng.' }, { status: 400 });
  }
  const viewerId = user?.role === 'TENANT' ? user.id : null;
  const [data, canReview] = await Promise.all([
    getRoomReviews(roomId, viewerId),
    viewerId ? canReviewRoom(viewerId, roomId) : Promise.resolve(false),
  ]);
  return NextResponse.json({ success: true, data: { ...data, canReview, signedIn: Boolean(viewerId) } });
}

/** POST { roomId, rating, comment } — người thuê gửi / sửa đánh giá */
export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== 'TENANT') {
    return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập tài khoản người thuê để đánh giá.' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const roomId = Number(body.roomId);
  if (!Number.isInteger(roomId) || roomId <= 0) {
    return NextResponse.json({ success: false, message: 'Thiếu mã phòng.' }, { status: 400 });
  }
  try {
    const review = await upsertReview(user.id, roomId, body);
    publishRoomEvent('review', roomId);
    return NextResponse.json({ success: true, data: review, message: 'Cảm ơn bạn đã đánh giá phòng.' });
  } catch (err) {
    const mapped = businessErrorResponse(err, ERRORS);
    if (mapped) return mapped;
    throw err;
  }
}

/**
 * PATCH { id, reply }            — chủ trọ (phòng của mình) / admin trả lời đánh giá
 * PATCH { id, hidden, reason }   — admin ẩn / hiện đánh giá vi phạm
 */
export async function PATCH(request: NextRequest) {
  const user = await currentUser();
  if (!user || (user.role !== 'LANDLORD' && user.role !== 'ADMIN')) {
    return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập cổng chủ trọ / quản trị.' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ success: false, message: 'Thiếu mã đánh giá.' }, { status: 400 });
  try {
    if (typeof body.hidden === 'boolean') {
      if (user.role !== 'ADMIN') {
        return NextResponse.json({ success: false, message: 'Chỉ quản trị viên được ẩn đánh giá.' }, { status: 403 });
      }
      const review = await setReviewHidden(id, body.hidden, body.reason);
      publishRoomEvent('review', review.room_id);
      return NextResponse.json({ success: true, data: review, message: body.hidden ? 'Đã ẩn đánh giá.' : 'Đã hiện lại đánh giá.' });
    }
    const review = await replyToReview(id, user, body.reply);
    if (!review) return NextResponse.json({ success: false, message: 'Không tìm thấy đánh giá.' }, { status: 404 });
    publishRoomEvent('review', review.room_id);
    return NextResponse.json({ success: true, data: review, message: 'Đã lưu phản hồi.' });
  } catch (err) {
    const mapped = businessErrorResponse(err, ERRORS);
    if (mapped) return mapped;
    return NextResponse.json({ success: false, message: 'Không tìm thấy đánh giá.' }, { status: 404 });
  }
}

/** DELETE ?id=… — người viết hoặc admin xóa đánh giá */
export async function DELETE(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập.' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id') || '';
  try {
    const removed = await deleteReview(id, user);
    if (!removed) return NextResponse.json({ success: false, message: 'Không tìm thấy đánh giá.' }, { status: 404 });
    publishRoomEvent('review', removed.roomId);
    return NextResponse.json({ success: true, message: 'Đã xóa đánh giá.' });
  } catch (err) {
    const mapped = businessErrorResponse(err, ERRORS);
    if (mapped) return mapped;
    throw err;
  }
}
