/**
 * Ghi hành vi người dùng cho bộ gợi ý Top-K và đo CTR / tỉ lệ chuyển đổi.
 *
 * - InteractionLog (dùng để cá nhân hóa): VIEW khi khách thuê đã đăng nhập mở trang phòng,
 *   BOOKMARK khi lưu phòng (nút tim), BOOK_VIEWING khi đặt lịch xem phòng.
 * - RecommendationImpression / RecommendationEvent (dùng để đo chất lượng gợi ý):
 *   mỗi lần danh sách Top-K hiển thị là một impression; mở chi tiết (CLICK) hoặc đặt lịch (BOOK)
 *   một phòng thuộc danh sách đó là một event. Ghi được cả với khách chưa đăng nhập.
 */
import prisma from './prisma';

/** Không ghi lại VIEW của cùng người dùng cho cùng phòng trong khoảng này (tránh F5 làm lệch dữ liệu). */
export const VIEW_DEDUPE_WINDOW_MS = 30 * 60_000;
/** Lượt bấm / đặt lịch chỉ được tính cho danh sách gợi ý hiển thị trong khoảng này. */
export const RECOMMENDATION_ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60_000;
export const RECOMMENDATION_SOURCES = ['WEB_TOPK', 'MOBILE_HOME'] as const;
export type RecommendationSource = (typeof RECOMMENDATION_SOURCES)[number];

export function isRecommendationSource(value: unknown): value is RecommendationSource {
  return typeof value === 'string' && (RECOMMENDATION_SOURCES as readonly string[]).includes(value);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isRecommendationId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/** Chỉ ghi hành vi của tài khoản khách thuê có thật (không ghi admin / chủ trọ / khách vãng lai). */
async function isTenantAccount(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isBlocked: true } });
  return Boolean(user && user.role === 'TENANT' && !user.isBlocked);
}

export async function recordImpression(input: {
  id: string;
  userId?: string | null;
  source: RecommendationSource;
  roomIds: number[];
}) {
  if (input.roomIds.length === 0) return;
  await prisma.recommendationImpression.create({
    data: {
      id: input.id,
      userId: input.userId && (await isTenantAccount(input.userId)) ? input.userId : null,
      source: input.source,
      roomIds: input.roomIds,
      itemCount: input.roomIds.length,
    },
  });
}

/**
 * Ghi CLICK / BOOK cho một phòng thuộc danh sách gợi ý. Bỏ qua (không lỗi) khi mã gợi ý không tồn tại,
 * đã quá hạn, hoặc phòng không nằm trong danh sách đó — nên không thể "bơm" CTR bằng mã tùy ý.
 */
export async function recordRecommendationEvent(input: {
  recommendationId: string;
  roomId: number;
  action: 'CLICK' | 'BOOK';
}): Promise<boolean> {
  if (!isRecommendationId(input.recommendationId)) return false;
  const impression = await prisma.recommendationImpression.findUnique({
    where: { id: input.recommendationId },
    select: { roomIds: true, createdAt: true },
  });
  if (!impression) return false;
  if (Date.now() - impression.createdAt.getTime() > RECOMMENDATION_ATTRIBUTION_WINDOW_MS) return false;
  if (!impression.roomIds.includes(input.roomId)) return false;
  await prisma.recommendationEvent.createMany({
    data: [{ impressionId: input.recommendationId, roomId: input.roomId, action: input.action }],
    skipDuplicates: true,
  });
  return true;
}

/** VIEW: khách thuê đã đăng nhập mở trang chi tiết phòng. */
export async function recordRoomView(userId: string | null | undefined, roomId: number): Promise<boolean> {
  if (!(await isTenantAccount(userId))) return false;
  const recent = await prisma.interactionLog.findFirst({
    where: {
      userId: userId!,
      roomId,
      action: 'VIEW',
      timestamp: { gte: new Date(Date.now() - VIEW_DEDUPE_WINDOW_MS) },
    },
    select: { id: true },
  });
  if (recent) return false;
  try {
    await prisma.interactionLog.create({ data: { userId: userId!, roomId, action: 'VIEW' } });
    return true;
  } catch {
    // Mã phòng không tồn tại (vi phạm khóa ngoại): bỏ qua, không làm hỏng lượt bấm gợi ý đi kèm
    return false;
  }
}

/** BOOK_VIEWING: khách thuê đã đăng nhập đặt lịch xem phòng thành công. */
export async function recordBookingInteraction(input: {
  userId: string | null | undefined;
  roomId: number;
  recommendationId?: string | null;
}) {
  const tasks: Promise<unknown>[] = [];
  if (await isTenantAccount(input.userId)) {
    tasks.push(prisma.interactionLog.create({ data: { userId: input.userId!, roomId: input.roomId, action: 'BOOK_VIEWING' } }));
  }
  if (input.recommendationId) {
    tasks.push(recordRecommendationEvent({ recommendationId: input.recommendationId, roomId: input.roomId, action: 'BOOK' }));
  }
  await Promise.all(tasks);
}

// ------------------------------------------------------------
// Phòng đã lưu (nút tim) — BOOKMARK
// ------------------------------------------------------------

export async function isRoomSaved(userId: string, roomId: number) {
  const row = await prisma.savedRoom.findUnique({ where: { userId_roomId: { userId, roomId } }, select: { roomId: true } });
  return Boolean(row);
}

export async function listSavedRoomIds(userId: string) {
  const rows = await prisma.savedRoom.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { roomId: true },
  });
  return rows.map((row) => row.roomId);
}

/** Lưu phòng và ghi BOOKMARK (một lần cho mỗi lần lưu). */
export async function saveRoom(userId: string, roomId: number) {
  const created = await prisma.savedRoom.createMany({ data: [{ userId, roomId }], skipDuplicates: true });
  if (created.count > 0) {
    await prisma.interactionLog.create({ data: { userId, roomId, action: 'BOOKMARK' } });
  }
}

/**
 * Bỏ lưu phòng: xóa cả các bản ghi BOOKMARK của phòng đó, để hồ sơ sở thích dùng cho gợi ý
 * phản ánh đúng danh sách yêu thích hiện tại (VIEW và BOOK_VIEWING vẫn giữ nguyên).
 */
export async function unsaveRoom(userId: string, roomId: number) {
  await prisma.$transaction([
    prisma.savedRoom.deleteMany({ where: { userId, roomId } }),
    prisma.interactionLog.deleteMany({ where: { userId, roomId, action: 'BOOKMARK' } }),
  ]);
}

// ------------------------------------------------------------
// Thống kê cho trang Admin
// ------------------------------------------------------------

export interface RecommendationTrackingStats {
  /** false khi bảng theo dõi chưa được tạo (chưa chạy `npx prisma db push`) */
  ready: boolean;
  impressions: number;
  impressionItems: number;
  clickedItems: number;
  bookedItems: number;
  engagedItems: number;
  /** CTR = số phòng được bấm hoặc đặt lịch / số lượt phòng được hiển thị trong danh sách gợi ý (%) */
  ctr: number;
  /** Tỉ lệ chuyển đổi = số phòng được đặt lịch / số phòng được bấm (%) */
  clickToBookRate: number;
  /** Tỉ lệ đặt lịch trên lượt hiển thị = số phòng được đặt lịch / số lượt phòng hiển thị (%) */
  impressionToBookRate: number;
  interactionCounts: { VIEW: number; BOOKMARK: number; BOOK_VIEWING: number };
  topViewedRooms: Array<{ roomId: number; views: number }>;
}

const percent = (num: number, den: number) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);

export async function getRecommendationTrackingStats(): Promise<RecommendationTrackingStats> {
  const interactionCounts = { VIEW: 0, BOOKMARK: 0, BOOK_VIEWING: 0 };
  let topViewedRooms: RecommendationTrackingStats['topViewedRooms'] = [];
  try {
    const [groups, top] = await Promise.all([
      prisma.interactionLog.groupBy({ by: ['action'], _count: { id: true } }),
      prisma.interactionLog.groupBy({
        by: ['roomId'],
        where: { action: 'VIEW' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);
    for (const g of groups) interactionCounts[g.action] = g._count.id;
    topViewedRooms = top.map((row) => ({ roomId: row.roomId, views: row._count.id }));
  } catch {
    // giữ giá trị 0
  }

  try {
    const [impressionAgg, eventGroups] = await Promise.all([
      prisma.recommendationImpression.aggregate({ _count: { id: true }, _sum: { itemCount: true } }),
      prisma.recommendationEvent.groupBy({ by: ['impressionId', 'roomId', 'action'] }),
    ]);
    const impressionItems = impressionAgg._sum.itemCount || 0;
    const clicked = new Set<string>();
    const booked = new Set<string>();
    for (const e of eventGroups) {
      const key = `${e.impressionId}:${e.roomId}`;
      if (e.action === 'CLICK') clicked.add(key);
      else booked.add(key);
    }
    const engaged = new Set([...Array.from(clicked), ...Array.from(booked)]);
    return {
      ready: true,
      impressions: impressionAgg._count.id,
      impressionItems,
      clickedItems: clicked.size,
      bookedItems: booked.size,
      engagedItems: engaged.size,
      ctr: percent(engaged.size, impressionItems),
      clickToBookRate: percent(booked.size, engaged.size),
      impressionToBookRate: percent(booked.size, impressionItems),
      interactionCounts,
      topViewedRooms,
    };
  } catch {
    return {
      ready: false,
      impressions: 0,
      impressionItems: 0,
      clickedItems: 0,
      bookedItems: 0,
      engagedItems: 0,
      ctr: 0,
      clickToBookRate: 0,
      impressionToBookRate: 0,
      interactionCounts,
      topViewedRooms,
    };
  }
}
