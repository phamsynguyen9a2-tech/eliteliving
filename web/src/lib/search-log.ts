/**
 * Ghi nhật ký tìm kiếm phòng để thống kê "khu vực có nhu cầu tìm kiếm cao" (đề cương 6a).
 * Chỉ ghi lượt tìm có tiêu chí (khu vực, từ khóa, giá, loại phòng, tiện ích) ở trang đầu kết quả,
 * không ghi lượt tải danh sách mặc định hay lật trang.
 */
import prisma from './prisma';

export type SearchSource = 'WEB_SEARCH' | 'MOBILE_SEARCH' | 'MOBILE_NEARBY';

export interface SearchLogInput {
  userId?: string | null;
  source: SearchSource;
  district?: string | null;
  keyword?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  roomType?: string | null;
  amenities?: string[] | null;
  page?: number;
  resultCount: number;
}

export function shouldLogSearch(input: Omit<SearchLogInput, 'resultCount' | 'source'> & { source?: SearchSource }): boolean {
  if ((input.page ?? 1) > 1) return false;
  if (input.source === 'MOBILE_NEARBY') return true;
  const district = (input.district || '').trim().toLowerCase();
  return Boolean(
    (district && district !== 'all') ||
      (input.keyword || '').trim() ||
      input.minPrice ||
      input.maxPrice ||
      (input.roomType && input.roomType !== 'all') ||
      (input.amenities && input.amenities.length > 0)
  );
}

/** Chuẩn hóa tên quận để gộp thống kê: "tân phú" / "Quận Tân Phú" → "Quận Tân Phú". */
export function normalizeDistrictLabel(value: string | null | undefined): string | null {
  const raw = String(value || '').trim();
  if (!raw || raw.toLowerCase() === 'all') return null;
  const lower = raw.toLowerCase();
  if (lower.startsWith('quận') || lower.startsWith('huyện') || lower.startsWith('tp.') || lower.startsWith('thành phố')) {
    return raw.replace(/\s+/g, ' ').replace(/^\S/, (c) => c.toUpperCase());
  }
  if (/^\d+$/.test(lower)) return `Quận ${lower}`;
  if (lower.includes('thủ đức')) return 'TP. Thủ Đức';
  const titled = raw.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return `Quận ${titled}`;
}

export async function logSearch(input: SearchLogInput) {
  if (!shouldLogSearch(input)) return;
  try {
    await prisma.searchLog.create({
      data: {
        userId: input.userId || null,
        source: input.source,
        district: normalizeDistrictLabel(input.district),
        keyword: input.keyword?.trim().slice(0, 100) || null,
        minPrice: input.minPrice ?? null,
        maxPrice: input.maxPrice ?? null,
        roomType: input.roomType && input.roomType !== 'all' ? input.roomType : null,
        amenities: (input.amenities || []).slice(0, 20),
        resultCount: input.resultCount,
      },
    });
  } catch (err) {
    console.warn('[search-log] Không ghi được lượt tìm kiếm:', err);
  }
}

export interface DemandInsights {
  windowDays: number;
  totalSearches: number;
  districts: Array<{ district: string; searches: number; share: number; avgMaxPrice: number | null }>;
  topRooms: Array<{ roomId: number; roomCode: string; title: string; district: string; views: number; saves: number; bookings: number; score: number }>;
}

/** Khu vực được tìm nhiều nhất và phòng được quan tâm nhiều nhất trong N ngày gần đây. */
export async function getDemandInsights(windowDays = 30): Promise<DemandInsights> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const [totalSearches, districtGroups, interactionGroups] = await Promise.all([
    prisma.searchLog.count({ where: { createdAt: { gte: since } } }),
    prisma.searchLog.groupBy({
      by: ['district'],
      where: { createdAt: { gte: since }, district: { not: null } },
      _count: { _all: true },
      _avg: { maxPrice: true },
      orderBy: { _count: { district: 'desc' } },
      take: 10,
    }),
    prisma.interactionLog.groupBy({
      by: ['roomId', 'action'],
      where: { timestamp: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  const perRoom = new Map<number, { views: number; saves: number; bookings: number }>();
  for (const g of interactionGroups) {
    const entry = perRoom.get(g.roomId) || { views: 0, saves: 0, bookings: 0 };
    if (g.action === 'VIEW') entry.views += g._count._all;
    else if (g.action === 'BOOKMARK') entry.saves += g._count._all;
    else entry.bookings += g._count._all;
    perRoom.set(g.roomId, entry);
  }
  // Điểm quan tâm: xem = 1, lưu = 2, đặt lịch = 3 (cùng trọng số với bộ gợi ý)
  const ranked = Array.from(perRoom.entries())
    .map(([roomId, c]) => ({ roomId, ...c, score: c.views + 2 * c.saves + 3 * c.bookings }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  const rooms = ranked.length
    ? await prisma.room.findMany({ where: { id: { in: ranked.map((r) => r.roomId) } }, select: { id: true, roomCode: true, title: true, district: true } })
    : [];
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const districtTotal = districtGroups.reduce((s, g) => s + g._count._all, 0);

  return {
    windowDays,
    totalSearches,
    districts: districtGroups.map((g) => ({
      district: g.district || 'Khác',
      searches: g._count._all,
      share: districtTotal ? Number(((g._count._all / districtTotal) * 100).toFixed(1)) : 0,
      avgMaxPrice: g._avg.maxPrice ? Math.round(g._avg.maxPrice) : null,
    })),
    topRooms: ranked.flatMap((r) => {
      const room = roomById.get(r.roomId);
      return room ? [{ ...r, roomCode: room.roomCode, title: room.title, district: room.district }] : [];
    }),
  };
}
