/**
 * Đánh giá / phản hồi phòng (đề cương: "đánh giá phản hồi", "Quản lý phản hồi/đánh giá").
 *
 * - Người thuê chỉ đánh giá được phòng mình đã thuê (có hợp đồng) hoặc đã đi xem (lịch hẹn HOÀN TẤT).
 * - Mỗi người một đánh giá cho mỗi phòng; gửi lại thì cập nhật.
 * - Chủ trọ trả lời đánh giá về phòng của mình; admin ẩn đánh giá vi phạm (kèm lý do).
 */
import prisma from './prisma';
import { getTenantScope } from './tenant-access';
import type { Review as ReviewRow, User } from '@prisma/client';

import { maskReviewerName, validateReviewInput, summarize, REVIEW_REPLY_MAX, type ReviewView } from './review-rules';

export * from './review-rules';

type RowWithRelations = ReviewRow & { user?: Pick<User, 'name'> | null; room?: { roomCode: string; title: string } | null };

function toView(row: RowWithRelations, viewerId?: string | null, opts: { showFullName?: boolean } = {}): ReviewView {
  return {
    id: row.id,
    room_id: row.roomId,
    rating: row.rating,
    comment: row.comment,
    author: opts.showFullName ? row.user?.name || 'Người thuê' : maskReviewerName(row.user?.name),
    is_mine: Boolean(viewerId && viewerId === row.userId),
    landlord_reply: row.landlordReply,
    replied_at: row.repliedAt?.toISOString() ?? null,
    is_hidden: row.isHidden,
    hidden_reason: row.hiddenReason,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    ...(row.room ? { room_code: row.room.roomCode, room_title: row.room.title } : {}),
  };
}

/** Người thuê có được đánh giá phòng này không (đã thuê hoặc đã xem phòng xong). */
export async function canReviewRoom(userId: string, roomId: number): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isBlocked: true } });
  if (!user || user.role !== 'TENANT' || user.isBlocked) return false;
  const completedViewing = await prisma.appointment.findFirst({
    where: { userId, roomId, status: 'COMPLETED' },
    select: { id: true },
  });
  if (completedViewing) return true;
  const scope = await getTenantScope(userId);
  return scope.contractRoomIds.has(roomId);
}

export async function getRoomReviews(roomId: number, viewerId?: string | null) {
  const rows = await prisma.review.findMany({
    where: { roomId, isHidden: false },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true } } },
    take: 100,
  });
  const mineRow = viewerId ? await prisma.review.findUnique({
    where: { roomId_userId: { roomId, userId: viewerId } },
    include: { user: { select: { name: true } } },
  }) : null;
  return {
    summary: summarize(rows.map((r) => r.rating)),
    items: rows.map((r) => toView(r, viewerId)),
    mine: mineRow ? toView(mineRow, viewerId) : null,
  };
}

export async function upsertReview(userId: string, roomId: number, input: { rating: unknown; comment: unknown }) {
  const { rating, comment } = validateReviewInput(input);
  if (!(await canReviewRoom(userId, roomId))) {
    throw new Error('REVIEW_NOT_ALLOWED: Bạn chỉ đánh giá được phòng đã thuê hoặc đã đi xem (lịch hẹn hoàn tất).');
  }
  const row = await prisma.review.upsert({
    where: { roomId_userId: { roomId, userId } },
    // Sửa đánh giá: giữ nguyên phản hồi cũ của chủ trọ để minh bạch lịch sử
    create: { roomId, userId, rating, comment },
    update: { rating, comment, isHidden: false, hiddenReason: null },
    include: { user: { select: { name: true } } },
  });
  return toView(row, userId);
}

export async function deleteReview(reviewId: string, actor: { id: string; role: string }) {
  const row = await prisma.review.findUnique({ where: { id: reviewId }, select: { userId: true, roomId: true } });
  if (!row) return null;
  if (actor.role !== 'ADMIN' && row.userId !== actor.id) {
    throw new Error('REVIEW_FORBIDDEN: Bạn chỉ xóa được đánh giá của mình.');
  }
  await prisma.review.delete({ where: { id: reviewId } });
  return row;
}

export async function replyToReview(reviewId: string, actor: { id: string; role: string }, reply: unknown) {
  const text = typeof reply === 'string' ? reply.trim() : '';
  if (text.length > REVIEW_REPLY_MAX) throw new Error(`INVALID_REVIEW: Phản hồi tối đa ${REVIEW_REPLY_MAX} ký tự.`);
  const row = await prisma.review.findUnique({ where: { id: reviewId }, include: { room: { select: { landlordId: true } } } });
  if (!row) return null;
  if (actor.role !== 'ADMIN' && !(actor.role === 'LANDLORD' && row.room.landlordId === actor.id)) {
    throw new Error('REVIEW_FORBIDDEN: Bạn chỉ trả lời được đánh giá về phòng của mình.');
  }
  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { landlordReply: text || null, repliedAt: text ? new Date() : null },
    include: { user: { select: { name: true } }, room: { select: { roomCode: true, title: true } } },
  });
  return toView(updated, null, { showFullName: true });
}

export async function setReviewHidden(reviewId: string, hidden: boolean, reason?: unknown) {
  const text = typeof reason === 'string' ? reason.trim() : '';
  if (hidden && text.length < 5) throw new Error('INVALID_REVIEW: Vui lòng ghi lý do ẩn đánh giá (tối thiểu 5 ký tự).');
  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { isHidden: hidden, hiddenReason: hidden ? text : null },
    include: { user: { select: { name: true } }, room: { select: { roomCode: true, title: true } } },
  });
  return toView(updated, null, { showFullName: true });
}

/** Danh sách quản lý: chủ trọ (đánh giá về phòng của mình) hoặc admin (tất cả). */
export async function listManagedReviews(opts: { landlordId?: string; filter?: 'all' | 'unreplied' | 'hidden' | 'low' }) {
  const where: NonNullable<Parameters<typeof prisma.review.findMany>[0]>['where'] = {};
  if (opts.landlordId) where.room = { landlordId: opts.landlordId };
  if (opts.filter === 'unreplied') where.landlordReply = null;
  if (opts.filter === 'hidden') where.isHidden = true;
  if (opts.filter === 'low') where.rating = { lte: 2 };
  const [rows, all] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: { user: { select: { name: true } }, room: { select: { roomCode: true, title: true } } },
    }),
    prisma.review.findMany({
      where: opts.landlordId ? { room: { landlordId: opts.landlordId }, isHidden: false } : { isHidden: false },
      select: { rating: true, landlordReply: true },
    }),
  ]);
  return {
    summary: { ...summarize(all.map((r) => r.rating)), unreplied: all.filter((r) => !r.landlordReply).length },
    items: rows.map((r) => toView(r, null, { showFullName: true })),
  };
}
