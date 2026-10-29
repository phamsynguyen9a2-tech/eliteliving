import prisma from './prisma';
import { Prisma, RoomStatus, type Room as RoomRecord } from '@prisma/client';
import { createAsyncCache } from './async-cache';
import { mapBuildingSummary } from './building-summary';
import {
  getPersistedHouseRules,
  getPersistedLandlordAvailability,
  savePersistedHouseRules,
  savePersistedLandlordAvailability,
} from './landlord-settings-store';
import {
  getAllBillPaymentClaims,
  getAllRoomDepositClaims,
  getBillPaymentClaim,
  updateBillPaymentClaimStatus,
} from './payment-claims-store';
import type { Room, Landlord, User, Appointment, Contract, UtilityBill, InteractionLog, Building, HouseRule } from './types';
import {
  buildUserHistoryVector,
  calculateHaversineDistance,
  compareByScore,
  HISTORY_WINDOW,
  scoreRoomsForUser,
  type RecommenderRoom,
} from './recommender-core';
import { evaluateOffline, type OfflineEvaluation } from './recommender-eval';
import { getRecommendationTrackingStats } from './interaction-tracking';
import { inferBillContractId, normalizeBillMonth } from './bill-ownership';
import { publishRealtime, publishRoomEvent } from './realtime-bus';
import { computeBill, parseInitialReadings } from './billing';
import { listingContentChanged } from './listing-checks';
import { addMonthsClamped } from './contract-dates';
import { checkManualRoomStatusChange, roomStatusAfterContractEnds } from './room-lifecycle';

// ============================================================
// Helper: Map Prisma model → Application type
// ============================================================

function mapPrismaRoom(r: any): Room {
  return {
    id: r.id,
    room_code: r.roomCode,
    project_code: r.projectCode ?? undefined,
    project_name: r.projectName ?? undefined,
    floor: r.floor ?? undefined,
    unit_number: r.unitNumber ?? undefined,
    has_balcony: r.hasBalcony ?? undefined,
    distance_to_huit_km: r.distanceToHuitKm ?? undefined,
    title: r.title,
    price: r.price,
    deposit: r.deposit,
    area: r.area,
    room_type: r.roomType,
    address: r.address,
    district: r.district,
    latitude: r.latitude,
    longitude: r.longitude,
    amenities: r.amenities,
    images: r.images,
    status: r.status as Room['status'],
    landlord_id: r.landlordId,
    landlord_name: r.landlordName,
    landlord_phone: r.landlordPhone,
    electricity_rate: r.electricityRate,
    water_rate: r.waterRate,
    internet_fee: r.internetFee,
    service_fee: r.serviceFee,
    parking_fee: r.parkingFee,
    description: r.description,
    listing_status: r.listingStatus ?? 'APPROVED',
    moderation_note: r.moderationNote ?? null,
    submitted_at: r.submittedAt ? new Date(r.submittedAt).toISOString() : null,
    moderated_at: r.moderatedAt ? new Date(r.moderatedAt).toISOString() : null,
  };
}

/** Điều kiện "tin đăng đã được duyệt" — áp dụng cho mọi danh sách công khai. */
export const PUBLIC_LISTING_WHERE = { listingStatus: 'APPROVED' } as const satisfies Prisma.RoomWhereInput;

export function isPubliclyListed(room: Pick<Room, 'listing_status'> | null | undefined): boolean {
  return Boolean(room) && (room!.listing_status ?? 'APPROVED') === 'APPROVED';
}

function mapPrismaAppointment(a: any): Appointment {
  return {
    id: a.id,
    room_id: a.roomId,
    user_id: a.userId,
    user_name: a.userName,
    user_phone: a.userPhone,
    date: a.date,
    time_slot: a.timeSlot,
    status: a.status as Appointment['status'],
    created_at: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
    notes: a.notes ?? undefined,
    room_code: a.room?.roomCode,
    room_title: a.room?.title,
    building_name: a.room?.project?.name,
    address: a.room?.address || a.room?.project?.address,
    price: a.room?.price,
    room_image: a.room?.images?.[0],
    room_status: a.room?.status,
  };
}

const CONTRACT_TENANT_SIGNATURE_PATTERN = /\[ELITE_CONTRACT_TENANT_SIGNED_AT:([^\]]+)\]/;

function readContractTenantSignature(contract: any): string | undefined {
  for (const handover of contract.handovers || []) {
    const match = handover.notes?.match(CONTRACT_TENANT_SIGNATURE_PATTERN);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function mapPrismaContract(c: any): Contract {
  const tenantSignedAt = readContractTenantSignature(c);
  return {
    id: c.id,
    room_id: c.roomId,
    room_title: c.roomTitle,
    tenant_name: c.tenantName,
    tenant_phone: c.tenantPhone,
    tenant_citizen_id: c.tenantCitizenId ?? c.tenant_citizen_id ?? undefined,
    tenant_address: c.tenantAddress ?? c.tenant_address ?? undefined,
    vehicle_count:
      typeof (c.vehicleCount ?? c.vehicle_count) === 'number'
        ? Number(c.vehicleCount ?? c.vehicle_count)
        : undefined,
    landlord_name: c.landlordName,
    start_date: c.startDate,
    end_date: c.endDate,
    monthly_rent: c.monthlyRent,
    deposit_amount: c.depositAmount,
    status: c.status as Contract['status'],
    created_at: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    tenant_signed: Boolean(tenantSignedAt),
    tenant_signed_at: tenantSignedAt,
  };
}

function mapPrismaBill(b: any): UtilityBill {
  return {
    id: b.id,
    room_id: b.roomId,
    room_code: b.roomCode,
    month: b.month,
    electric_old: b.electricOld,
    electric_new: b.electricNew,
    electric_used: b.electricUsed,
    electric_cost: b.electricCost,
    water_old: b.waterOld,
    water_new: b.waterNew,
    water_used: b.waterUsed,
    water_cost: b.waterCost,
    internet_cost: b.internetCost,
    service_cost: b.serviceCost,
    rent_cost: b.rentCost,
    total_amount: b.totalAmount,
    status: b.status as UtilityBill['status'],
    created_at: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
    contract_id: b.contractId ?? undefined,
  };
}

// ============================================================
// Haversine Distance Calculation (cài đặt trong lib/recommender-core.ts)
// ============================================================

export { calculateHaversineDistance };

// ============================================================
// Top-K Hybrid Recommendation Algorithm
// ============================================================

/**
 * Top-K Hybrid Recommendation Algorithm:
 * 1. Weighted Rule-Based for budget & distance (Haversine)
 * 2. Cosine Similarity for amenities matching
 * 3. Content-Based Cosine on the user's interaction history
 * Công thức nằm trong lib/recommender-core.ts, dùng chung với phần đánh giá offline.
 */
const ROOMS_CACHE_TTL_MS = 60_000; // 60 giây
/** Đặc trưng gọn của phòng dùng cho đánh giá offline (evaluateRecommenderSystem). */
const recommendationSelect = {
  id: true, price: true, roomType: true, latitude: true, longitude: true,
  amenities: true, hasBalcony: true, area: true, status: true,
} satisfies Prisma.RoomSelect;
type RoomCatalogRow = RoomRecord;
/**
 * Toàn bộ thông tin phòng (cả phòng đã thuê) — 1 truy vấn, cache 60 giây, xóa cache ngay
 * khi phòng được thêm / sửa / đổi trạng thái trong tiến trình này (invalidateRoomsCache).
 * Phòng đã thuê vẫn cần để dựng hồ sơ từ lịch sử tương tác.
 * Riêng TRẠNG THÁI phòng luôn được đọc mới từ CSDL ở mỗi request (không lấy từ cache).
 */
const roomCatalogCache = createAsyncCache<RoomCatalogRow[]>(ROOMS_CACHE_TTL_MS);

export function invalidateRoomsCache() {
  roomCatalogCache.invalidate();
}

type RecommendationSortBy = 'smart' | 'distance' | 'price' | 'area';

export interface TopKRequest {
  user_id?: string;
  budget_max: number;
  target_lat: number;
  target_lng: number;
  preferred_amenities: string[];
  max_radius_km: number;
  lifestyle?: string;
  room_type?: string;
  sortBy?: RecommendationSortBy;
}

/** Hồ sơ nhu cầu mặc định khi người dùng chưa lưu hồ sơ (gần ĐH Công Thương TP.HCM). */
export const DEFAULT_RECOMMENDER_PREFERENCE = {
  budget_max: 5000000,
  target_lat: 10.8066,
  target_lng: 106.6286,
  preferred_amenities: ['Máy lạnh', 'Gác lửng', 'Wifi'],
  max_radius_km: 5.0,
};

interface RecommendationInputs {
  roomCatalog: RoomCatalogRow[];
  availableIds: Set<number>;
  petDescriptionIds: Set<number>;
  historyRows: Array<{ roomId: number; action: string }>;
}

/**
 * Mọi truy vấn CSDL của API gợi ý chạy song song trong MỘT lượt: danh mục phòng (cache),
 * danh sách phòng đang trống (luôn đọc mới), mô tả có nhắc thú cưng (nếu cần) và lịch sử
 * tương tác của người dùng.
 */
async function loadRecommendationInputs(opts: { userId?: string; lifestyle?: string }): Promise<RecommendationInputs> {
  const [roomCatalog, availableNow, petDescriptionMatches, userInteractions] = await Promise.all([
    roomCatalogCache.read(() => prisma.room.findMany({ orderBy: { id: 'asc' } })),
    prisma.room.findMany({ where: { status: 'AVAILABLE', ...PUBLIC_LISTING_WHERE }, select: { id: true } }),
    opts.lifestyle === 'pet' ? prisma.room.findMany({
      where: { status: 'AVAILABLE', ...PUBLIC_LISTING_WHERE, OR: ['thú cưng', 'chó', 'mèo'].map((word) => ({ description: { contains: word, mode: 'insensitive' } })) },
      select: { id: true },
    }) : Promise.resolve([]),
    opts.userId
      ? prisma.interactionLog.findMany({
          where: { userId: opts.userId },
          orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
          take: HISTORY_WINDOW,
          select: { roomId: true, action: true },
        })
      : Promise.resolve([]),
  ]);
  const historyRows: Array<{ roomId: number; action: string }> = userInteractions;
  return {
    roomCatalog,
    availableIds: new Set(availableNow.map((room) => room.id)),
    petDescriptionIds: new Set(petDescriptionMatches.map((room) => room.id)),
    historyRows,
  };
}

function rankRecommendations(inputs: RecommendationInputs, userPref: TopKRequest, k: number): Room[] {
  // Ứng viên chỉ gồm phòng ĐANG TRỐNG theo truy vấn mới nhất, nên không bao giờ gợi ý
  // phòng vừa được giữ chỗ / cho thuê dù danh mục đang lấy từ cache.
  const allRooms = inputs.roomCatalog.filter((room) => inputs.availableIds.has(room.id));
  const catalogById = new Map<number, RoomCatalogRow>(inputs.roomCatalog.map((room) => [room.id, room]));

  // Hồ sơ Content-Based (VIEW=1, BOOKMARK=2, BOOK_VIEWING=3), dựng từ mọi phòng đã tương tác,
  // kể cả phòng nay đã thuê (giống hệt cách đánh giá offline).
  const userHistoryVector =
    inputs.historyRows.length > 0
      ? buildUserHistoryVector(inputs.historyRows, catalogById as Map<number, RecommenderRoom>)
      : null;

  const scoredRooms = scoreRoomsForUser(
    allRooms,
    {
      budget_max: userPref.budget_max,
      target_lat: userPref.target_lat,
      target_lng: userPref.target_lng,
      preferred_amenities: userPref.preferred_amenities,
      max_radius_km: userPref.max_radius_km,
      lifestyle: userPref.lifestyle,
      room_type: userPref.room_type,
    },
    userHistoryVector,
    { petDescriptionIds: inputs.petDescriptionIds }
  );

  // Sorting
  if (userPref.sortBy === 'distance') {
    scoredRooms.sort((a, b) => a.distanceKm - b.distanceKm);
  } else if (userPref.sortBy === 'price') {
    scoredRooms.sort((a, b) => (catalogById.get(a.id)?.price || 0) - (catalogById.get(b.id)?.price || 0));
  } else if (userPref.sortBy === 'area') {
    scoredRooms.sort((a, b) => (catalogById.get(b.id)?.area || 0) - (catalogById.get(a.id)?.area || 0));
  } else {
    // Default smart score
    scoredRooms.sort(compareByScore);
  }

  return scoredRooms.slice(0, k).flatMap((ranked) => {
    const row = catalogById.get(ranked.id);
    return row
      ? [{
          ...mapPrismaRoom({ ...row, status: 'AVAILABLE' }),
          score: ranked.score,
          calculated_distance: Number(ranked.distanceKm.toFixed(2)),
        }]
      : [];
  });
}

export async function getTopKRecommendations(userPref: TopKRequest, k: number = 6): Promise<Room[]> {
  const inputs = await loadRecommendationInputs({ userId: userPref.user_id, lifestyle: userPref.lifestyle });
  return rankRecommendations(inputs, userPref, k);
}

type StoredPreferenceRow = {
  budgetMax: number | null;
  targetLat: number | null;
  targetLng: number | null;
  maxRadiusKm: number | null;
  preferredAmenities: string[];
};

/**
 * Hồ sơ nhu cầu đã lưu trong bảng users → tham số gợi ý. Chỉ coi là "đã có hồ sơ" khi có ngân sách.
 * Dùng chung cho API gợi ý và đánh giá offline.
 */
export function storedPreferenceToRequest(row: StoredPreferenceRow | null | undefined) {
  if (!row?.budgetMax) return null;
  return {
    budget_max: row.budgetMax,
    target_lat: row.targetLat || DEFAULT_RECOMMENDER_PREFERENCE.target_lat,
    target_lng: row.targetLng || DEFAULT_RECOMMENDER_PREFERENCE.target_lng,
    preferred_amenities: row.preferredAmenities,
    max_radius_km: row.maxRadiusKm || DEFAULT_RECOMMENDER_PREFERENCE.max_radius_km,
  };
}

/**
 * Đường đi đầy đủ của API /api/rooms/recommend: đọc hồ sơ nhu cầu của người dùng SONG SONG với
 * dữ liệu phòng (một lượt truy vấn CSDL), rồi ghép tham số người dùng chọn trên giao diện.
 */
export async function getPersonalizedRecommendations(input: {
  userId?: string;
  overrides: Partial<Omit<TopKRequest, 'user_id'>>;
  k: number;
}): Promise<{ rooms: Room[]; preference: TopKRequest }> {
  const [userRow, inputs] = await Promise.all([
    input.userId
      ? prisma.user.findUnique({
          where: { id: input.userId },
          select: { budgetMax: true, targetLat: true, targetLng: true, maxRadiusKm: true, preferredAmenities: true },
        })
      : Promise.resolve(null),
    loadRecommendationInputs({ userId: input.userId, lifestyle: input.overrides.lifestyle }),
  ]);
  const stored = storedPreferenceToRequest(userRow) ?? DEFAULT_RECOMMENDER_PREFERENCE;
  const o = input.overrides;
  const preference: TopKRequest = {
    user_id: input.userId,
    budget_max: o.budget_max ?? stored.budget_max,
    target_lat: o.target_lat ?? stored.target_lat,
    target_lng: o.target_lng ?? stored.target_lng,
    max_radius_km: o.max_radius_km ?? stored.max_radius_km,
    preferred_amenities: o.preferred_amenities ?? stored.preferred_amenities,
    lifestyle: o.lifestyle,
    room_type: o.room_type,
    sortBy: o.sortBy ?? 'smart',
  };
  return { rooms: rankRecommendations(inputs, preference, input.k), preference };
}

// ============================================================
// Rooms CRUD
// ============================================================

/**
 * Get all rooms with filtering & pagination
 */
export async function getRooms(filter?: {
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
  status?: string;
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest';
  roomType?: string;
  maxElectricity?: number;
  petFriendly?: boolean;
  occupants?: string;
  bikes?: string;
  freeService?: boolean;
  moveInTime?: string;
  page?: number;
  limit?: number;
  /** true = gồm cả tin chưa duyệt / bị từ chối (chỉ dùng cho trang quản trị) */
  includeUnlisted?: boolean;
}) {
  const where: Prisma.RoomWhereInput = filter?.includeUnlisted ? {} : { ...PUBLIC_LISTING_WHERE };
  const combinedFilters: Prisma.RoomWhereInput[] = [];

  if (filter?.roomType && filter.roomType !== 'all') {
    const rt = filter.roomType.toLowerCase();
    if (rt === 'gac_lung') {
      where.roomType = { contains: 'gác', mode: 'insensitive' };
    } else if (rt === '1pn') {
      where.roomType = { contains: '1', mode: 'insensitive' };
    } else if (rt === '2pn') {
      where.roomType = { contains: '2', mode: 'insensitive' };
    } else if (rt === 'studio') {
      where.roomType = { contains: 'studio', mode: 'insensitive' };
    }
  }

  if (filter?.maxElectricity) {
    where.electricityRate = { lte: filter.maxElectricity };
  }

  if (filter?.freeService) {
    where.serviceFee = 0;
  }

  if (filter?.petFriendly) {
    combinedFilters.push({ amenities: { has: 'Cho nuôi thú cưng' } });
  }

  if (filter?.occupants && filter.occupants !== 'all') {
    if (filter.occupants === '2') {
      where.area = { ...(where.area as any), gte: 18 };
    } else if (filter.occupants === '3-4') {
      where.area = { ...(where.area as any), gte: 24 };
    } else if (filter.occupants === 'family') {
      where.area = { ...(where.area as any), gte: 30 };
    }
  }

  if (filter?.bikes && filter.bikes !== 'all') {
    if (filter.bikes === '2') {
      where.area = { ...(where.area as any), gte: 20 };
    } else if (filter.bikes === '3+') {
      where.area = { ...(where.area as any), gte: 28 };
    } else if (filter.bikes === 'car') {
      combinedFilters.push({
        OR: [
          { description: { contains: 'ô tô', mode: 'insensitive' } },
          { description: { contains: 'bãi đỗ', mode: 'insensitive' } },
          { amenities: { has: 'Bãi đỗ ô tô' } },
        ],
      });
    }
  }

  if (filter?.moveInTime === 'immediate') {
    where.status = 'AVAILABLE';
  }

  if (filter?.district && filter.district !== 'all') {
    const dFilter = filter.district.trim();
    if (/^quận\s*1$/i.test(dFilter)) {
      where.district = { equals: 'Quận 1', mode: 'insensitive' };
    } else {
      where.district = { contains: dFilter, mode: 'insensitive' };
    }
  }

  if (filter?.minPrice) {
    where.price = { ...(where.price as any), gte: filter.minPrice };
  }

  if (filter?.maxPrice) {
    where.price = { ...(where.price as any), lte: filter.maxPrice };
  }

  if (filter?.status && filter.status !== 'all') {
    where.status = filter.status as RoomStatus;
  }

  if (filter?.search) {
    combinedFilters.push({
      OR: [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { address: { contains: filter.search, mode: 'insensitive' } },
        { district: { contains: filter.search, mode: 'insensitive' } },
        { roomCode: { contains: filter.search, mode: 'insensitive' } },
        { projectName: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ],
    });
  }

  if (filter?.amenities && filter.amenities.length > 0) {
    where.amenities = { hasEvery: filter.amenities };
  }

  // Every filter group must match. In particular, a keyword must not weaken
  // the parking requirement (the previous shared OR produced false positives).
  if (combinedFilters.length > 0) {
    where.AND = combinedFilters;
  }

  // Sorting
  let orderBy: Prisma.RoomOrderByWithRelationInput = {};
  if (filter?.sort === 'price_asc') {
    orderBy = { price: 'asc' };
  } else if (filter?.sort === 'price_desc') {
    orderBy = { price: 'desc' };
  } else {
    orderBy = { id: 'asc' };
  }

  const page = filter?.page || 1;
  const limit = filter?.limit || 12;

  const [items, total] = await Promise.all([
    prisma.room.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.room.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    items: items.map(mapPrismaRoom),
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * Phòng đang trống (tin đã duyệt) quanh một vị trí, sắp theo khoảng cách Haversine.
 * Dùng cho tính năng "tìm phòng gần vị trí hiện tại" của app người thuê.
 */
export async function getRoomsNear(lat: number, lng: number, radiusKm: number, limit = 20): Promise<Room[]> {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const rows = await prisma.room.findMany({
    where: {
      ...PUBLIC_LISTING_WHERE,
      status: 'AVAILABLE',
      latitude: { gte: lat - dLat, lte: lat + dLat },
      longitude: { gte: lng - dLng, lte: lng + dLng },
    },
    take: 2000,
  });
  return rows
    .map((row) => ({ row, distance: calculateHaversineDistance(lat, lng, row.latitude, row.longitude) }))
    .filter((r) => r.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ row, distance }) => ({ ...mapPrismaRoom(row), calculated_distance: Number(distance.toFixed(2)) }));
}

/**
 * Get room by ID
 */
/** Nhiều phòng theo mã, giữ nguyên thứ tự của danh sách mã truyền vào. */
export async function getRoomsByIds(ids: number[]): Promise<Room[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.room.findMany({ where: { id: { in: ids } } });
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [mapPrismaRoom(row)] : [];
  });
}

export async function getRoomById(id: number): Promise<Room | undefined> {
  const room = await prisma.room.findUnique({ where: { id } });
  return room ? mapPrismaRoom(room) : undefined;
}

// ============================================================
// Buildings / Projects
// ============================================================

function mapPrismaBuilding(p: Prisma.ProjectGetPayload<{ include: { rooms: true } }>): Building {
  const buildingRooms = p.rooms.map(mapPrismaRoom);
  const availableRooms = buildingRooms.filter((r) => r.status === 'AVAILABLE').length;
  const bookedRooms = buildingRooms.filter((r) => r.status === 'BOOKED_VIEWING').length;
  const rentedRooms = buildingRooms.filter((r) => r.status === 'RENTED').length;

  const prices = buildingRooms.map((r) => r.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : p.basePrice;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : p.basePrice;

  return {
    code: p.code,
    name: p.name,
    address: p.address,
    district: p.district || 'Quận Tân Phú',
    latitude: p.lat,
    longitude: p.lng,
    lat: p.lat,
    lng: p.lng,
    base_price: minPrice,
    distance_to_huit_km: buildingRooms[0]?.distance_to_huit_km ?? calculateHaversineDistance(10.8066, 106.6286, p.lat, p.lng),
    min_price: minPrice,
    max_price: maxPrice,
    total_rooms: buildingRooms.length,
    available_rooms: availableRooms,
    booked_rooms: bookedRooms,
    rented_rooms: rentedRooms,
    featured_image: (p.images[0] || buildingRooms[0]?.images[0]) ?? '',
    images: p.images,
    amenities: p.amenities,
    landlord_id: p.landlordId,
    landlord_name: p.landlordName,
    landlord_phone: p.landlordPhone,
    rooms: buildingRooms,
  };
}

/**
 * Get aggregated buildings / projects with room availability breakdown
 */
export async function getBuildings(filter?: {
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  amenities?: string[];
  roomType?: string;
}): Promise<Building[]> {
  const projects = await prisma.project.findMany({
    include: { rooms: { where: PUBLIC_LISTING_WHERE } },
  });

  let buildingList: Building[] = projects.map(mapPrismaBuilding);

  // Apply filters
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    buildingList = buildingList.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        b.district.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.rooms && b.rooms.some((r) => 
          r.title.toLowerCase().includes(q) || 
          r.room_code.toLowerCase().includes(q) ||
          r.room_type.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
        ))
    );
  }

  if (filter?.roomType && filter.roomType !== 'all') {
    const rt = filter.roomType.toLowerCase();
    buildingList = buildingList.filter((b) =>
      b.rooms ? b.rooms.some((r) => {
        const roomTypeLower = (r.room_type || '').toLowerCase();
        if (rt === 'gac_lung') return roomTypeLower.includes('gác') || roomTypeLower.includes('duplex');
        if (rt === 'studio') return roomTypeLower.includes('studio');
        if (rt === '1pn') return roomTypeLower.includes('1');
        if (rt === '2pn') return roomTypeLower.includes('2');
        return true;
      }) : false
    );
  }

  if (filter?.district && filter.district !== 'all') {
    const dFilter = filter.district.trim().toLowerCase();
    buildingList = buildingList.filter((b) => {
      const bDist = b.district.trim().toLowerCase();
      if (dFilter === 'quận 1') return bDist === 'quận 1';
      return bDist.includes(dFilter);
    });
  }

  if (filter?.minPrice) {
    buildingList = buildingList.filter((b) => b.max_price >= filter.minPrice!);
  }

  if (filter?.maxPrice) {
    buildingList = buildingList.filter((b) => b.min_price <= filter.maxPrice!);
  }

  if (filter?.amenities && filter.amenities.length > 0) {
    buildingList = buildingList.filter((b) =>
      filter.amenities!.every((a) => b.amenities.some((ba) => ba.toLowerCase().includes(a.toLowerCase())))
    );
  }

  return buildingList;
}

export async function getBuildingByCode(code: string): Promise<Building | undefined> {
  // Push the exact code into the database instead of loading every room in the city.
  const project = await prisma.project.findFirst({
    where: { code: { equals: code, mode: 'insensitive' } },
    include: { rooms: { where: PUBLIC_LISTING_WHERE } },
  });
  return project ? mapPrismaBuilding(project) : undefined;
}

/** Compact opt-in listing; legacy callers still receive complete buildings/rooms. */
export async function getBuildingSummaries(
  filter?: Parameters<typeof getBuildings>[0],
  opts: { includeUnlisted?: boolean } = {}
): Promise<Building[]> {
  const roomScope: Prisma.RoomWhereInput = opts.includeUnlisted ? {} : PUBLIC_LISTING_WHERE;
  const where: Prisma.ProjectWhereInput = {};
  if (filter?.district && filter.district !== 'all') {
    const district = filter.district.trim();
    where.district = /^quận\s*1$/i.test(district)
      ? { equals: 'Quận 1', mode: 'insensitive' }
      : { contains: district, mode: 'insensitive' };
  }
  if (filter?.search) {
    const contains = { contains: filter.search, mode: 'insensitive' as const };
    where.OR = [
      { name: contains }, { address: contains }, { district: contains }, { code: contains },
      { rooms: { some: { ...roomScope, OR: [{ title: contains }, { roomCode: contains }, { roomType: contains }, { description: contains }] } } },
    ];
  }
  if (filter?.roomType && filter.roomType !== 'all') {
    const type = filter.roomType.toLowerCase();
    const terms = type === 'gac_lung' ? ['gác', 'duplex'] : type === 'studio' ? ['studio'] : type === '1pn' ? ['1'] : type === '2pn' ? ['2'] : [];
    where.rooms = { some: terms.length ? { ...roomScope, OR: terms.map((term) => ({ roomType: { contains: term, mode: 'insensitive' } })) } : roomScope };
  }
  const [projects, aggregates] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { id: 'asc' },
    }),
    prisma.room.groupBy({
      by: ['projectCode', 'status'],
      where: roomScope,
      _count: { _all: true }, _min: { price: true, id: true }, _max: { price: true },
    }),
  ]);
  // Relation take:1 may still transfer every room in Prisma's query strategy.
  // Read exactly one primary-key row per building for the image/distance fallback.
  const firstIds = projects.flatMap((project) => {
    const ids = aggregates.filter((row) => row.projectCode === project.code).flatMap((row) => row._min.id === null ? [] : [row._min.id]);
    return ids.length ? [Math.min(...ids)] : [];
  });
  const firstRooms = firstIds.length ? await prisma.room.findMany({
    where: { id: { in: firstIds } },
    select: { projectCode: true, distanceToHuitKm: true, images: true },
  }) : [];
  const byProject = new Map(firstRooms.map((room) => [room.projectCode, room]));
  return projects.map((project) => mapBuildingSummary({ ...project, rooms: byProject.has(project.code) ? [byProject.get(project.code)!] : [] }, aggregates, calculateHaversineDistance(10.8066, 106.6286, project.lat, project.lng)))
    .filter((building) => (!filter?.minPrice || building.max_price >= filter.minPrice)
      && (!filter?.maxPrice || building.min_price <= filter.maxPrice)
      && (!filter?.amenities?.length || filter.amenities.every((amenity) => building.amenities.some((value) => value.toLowerCase().includes(amenity.toLowerCase())))));
}

// ============================================================
// Appointments with Concurrency Control
// ============================================================

/**
 * Book appointment with CONCURRENCY CONTROL using PostgreSQL UNIQUE constraint
 * The unique constraint on (roomId, date, timeSlot) in the schema prevents double-booking
 * at the database level - much stronger than in-memory mutex!
 */
export async function bookAppointment(data: {
  room_id: number;
  user_id: string;
  user_name: string;
  user_phone: string;
  date: string;
  time_slot: string;
  notes?: string;
}): Promise<{ success: boolean; appointment?: Appointment; message: string }> {
  try {
    // 1. Ensure user exists (handles guest / new users). Never overwrite the
    // profile of an authenticated account with values coming from a booking form.
    const isGuestUser = data.user_id.startsWith('user_guest_');
    try {
      await prisma.user.upsert({
        where: { id: data.user_id },
        update: isGuestUser
          ? {
              name: data.user_name,
              phone: data.user_phone,
            }
          : {},
        create: {
          id: data.user_id,
          name: data.user_name,
          phone: data.user_phone,
          email: `${data.user_id}@example.com`,
          role: 'TENANT',
        },
      });
    } catch (upsertErr) {
      console.warn('User upsert fallback:', upsertErr);
    }

    // 2. Serialize room lifecycle + slot claim in one transaction. Updating the
    // room row first acquires a row lock, preventing a booking from racing a
    // transition to RESERVED/RENTED.
    const newAppointment = await prisma.$transaction(async (tx) => {
      const bookableRoom = await tx.room.updateMany({
        where: {
          id: data.room_id,
          status: { in: ['AVAILABLE', 'BOOKED_VIEWING'] },
        },
        data: { status: 'BOOKED_VIEWING' },
      });

      if (bookableRoom.count !== 1) {
        throw new Error('ROOM_NOT_BOOKABLE');
      }

      const conflict = await tx.appointment.findFirst({
        where: {
          roomId: data.room_id,
          date: data.date,
          timeSlot: data.time_slot,
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new Error('APPOINTMENT_CONFLICT');
      }

      // The current schema has a unique room/date/time key. Reuse a cancelled
      // row with a guarded update so its slot is bookable again without
      // deleting data or weakening the database concurrency constraint.
      const releasedAppointment = await tx.appointment.findFirst({
        where: {
          roomId: data.room_id,
          date: data.date,
          timeSlot: data.time_slot,
          status: 'CANCELLED',
        },
        select: { id: true },
      });

      if (releasedAppointment) {
        const claimed = await tx.appointment.updateMany({
          where: {
            id: releasedAppointment.id,
            status: 'CANCELLED',
          },
          data: {
            userId: data.user_id,
            userName: data.user_name,
            userPhone: data.user_phone,
            status: 'PENDING',
            notes: data.notes,
            createdAt: new Date(),
          },
        });

        if (claimed.count !== 1) {
          throw new Error('APPOINTMENT_CONFLICT');
        }

        const reopenedAppointment = await tx.appointment.findUnique({
          where: { id: releasedAppointment.id },
          include: {
            room: {
              include: {
                project: true,
              },
            },
          },
        });

        if (!reopenedAppointment) {
          throw new Error('Không thể khôi phục khung giờ đã được mở lại.');
        }
        return reopenedAppointment;
      }

      // PostgreSQL @@unique([roomId, date, timeSlot]) rejects simultaneous creates.
      return tx.appointment.create({
        data: {
          roomId: data.room_id,
          userId: data.user_id,
          userName: data.user_name,
          userPhone: data.user_phone,
          date: data.date,
          timeSlot: data.time_slot,
          status: 'PENDING',
          notes: data.notes,
        },
        include: {
          room: {
            include: {
              project: true,
            },
          },
        },
      });
    });

    publishRoomEvent('appointment', data.room_id, data.user_id);
    return {
      success: true,
      appointment: mapPrismaAppointment(newAppointment),
      message: 'Đặt lịch xem phòng thành công! Chủ trọ sẽ liên hệ xác nhận.',
    };
  } catch (error: unknown) {
    const prismaError = error as { code?: string; message?: string };
    // Handle unique constraint violation (concurrent bookings caught by DB index)
    if (prismaError.code === 'P2002' || prismaError.message === 'APPOINTMENT_CONFLICT') {
      return {
        success: false,
        message: 'Khung giờ này vừa được người khác đặt trước trong cùng tích tắc. Vui lòng chọn khung giờ khác!',
      };
    }
    if (prismaError.message === 'ROOM_NOT_BOOKABLE') {
      return {
        success: false,
        message: 'Phòng này hiện không còn nhận lịch xem mới.',
      };
    }
    console.error('bookAppointment error:', error);
    return {
      success: false,
      message: prismaError.message || 'Lỗi khi đặt lịch xem phòng',
    };
  }
}

/**
 * Đổi lịch xem phòng sang ngày / khung giờ khác, cùng cơ chế kiểm soát tương tranh như đặt lịch mới:
 * khóa dòng phòng, kiểm tra khung giờ mới còn trống, ràng buộc unique (phòng, ngày, khung giờ) chặn
 * hai yêu cầu đồng thời. Người thuê đổi lịch thì lịch quay về "Chờ xác nhận" để chủ trọ xác nhận lại;
 * chủ trọ / admin đổi lịch thì lịch giữ trạng thái "Đã xác nhận".
 */
export async function rescheduleAppointment(input: {
  appointmentId: string;
  actor: { id: string; role: 'TENANT' | 'LANDLORD' | 'ADMIN' };
  date: string;
  timeSlot: string;
  reason?: string;
}): Promise<{ success: true; appointment: Appointment; previous: { date: string; timeSlot: string } } | { success: false; status: number; message: string }> {
  const current = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    include: { room: { select: { landlordId: true } } },
  });
  if (!current) return { success: false, status: 404, message: 'Không tìm thấy lịch hẹn.' };
  const { actor } = input;
  const allowed =
    actor.role === 'ADMIN' ||
    (actor.role === 'LANDLORD' && current.room.landlordId === actor.id) ||
    (actor.role === 'TENANT' && current.userId === actor.id);
  if (!allowed) return { success: false, status: 403, message: 'Bạn không có quyền đổi lịch hẹn này.' };
  if (current.status !== 'PENDING' && current.status !== 'CONFIRMED') {
    return { success: false, status: 409, message: 'Chỉ đổi được lịch đang chờ hoặc đã xác nhận.' };
  }
  if (current.date === input.date && current.timeSlot === input.timeSlot) {
    return { success: false, status: 400, message: 'Ngày và khung giờ mới trùng với lịch hiện tại.' };
  }

  const nextStatus = actor.role === 'TENANT' ? 'PENDING' : 'CONFIRMED';
  const fmt = (d: string) => d.split('-').reverse().join('/');
  const note = `[Đổi lịch ${new Date().toLocaleDateString('vi-VN')}] ${fmt(current.date)} ${current.timeSlot} → ${fmt(input.date)} ${input.timeSlot}` +
    (input.reason?.trim() ? ` · Lý do: ${input.reason.trim().slice(0, 200)}` : '');
  const mergedNotes = [current.notes, note].filter(Boolean).join('\n').slice(0, 2000);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const lockRoom = await tx.room.updateMany({
        where: { id: current.roomId, status: { in: ['AVAILABLE', 'BOOKED_VIEWING'] } },
        data: { status: 'BOOKED_VIEWING' },
      });
      if (lockRoom.count !== 1) throw new Error('ROOM_NOT_BOOKABLE');

      const conflict = await tx.appointment.findFirst({
        where: {
          roomId: current.roomId,
          date: input.date,
          timeSlot: input.timeSlot,
          status: { in: ['PENDING', 'CONFIRMED'] },
          id: { not: current.id },
        },
        select: { id: true },
      });
      if (conflict) throw new Error('APPOINTMENT_CONFLICT');

      const released = await tx.appointment.findFirst({
        where: { roomId: current.roomId, date: input.date, timeSlot: input.timeSlot, status: 'CANCELLED' },
        select: { id: true },
      });
      if (released) {
        // Khung giờ mới đang giữ một lịch đã hủy (ràng buộc unique): dùng lại dòng đó cho lịch mới,
        // lịch cũ chuyển sang "Đã hủy" kèm ghi chú đổi lịch — giống cách đặt lịch mới dùng lại khung giờ đã hủy.
        const claimed = await tx.appointment.updateMany({
          where: { id: released.id, status: 'CANCELLED' },
          data: {
            userId: current.userId,
            userName: current.userName,
            userPhone: current.userPhone,
            status: nextStatus,
            notes: mergedNotes,
            createdAt: new Date(),
          },
        });
        if (claimed.count !== 1) throw new Error('APPOINTMENT_CONFLICT');
        await tx.appointment.update({
          where: { id: current.id },
          data: { status: 'CANCELLED', notes: [current.notes, `${note} (chuyển sang lịch mới)`].filter(Boolean).join('\n').slice(0, 2000) },
        });
        return tx.appointment.findUniqueOrThrow({ where: { id: released.id }, include: { room: { include: { project: true } } } });
      }

      return tx.appointment.update({
        where: { id: current.id },
        data: { date: input.date, timeSlot: input.timeSlot, status: nextStatus, notes: mergedNotes },
        include: { room: { include: { project: true } } },
      });
    });
    publishRoomEvent('appointment', current.roomId, current.userId);
    return { success: true, appointment: mapPrismaAppointment(updated), previous: { date: current.date, timeSlot: current.timeSlot } };
  } catch (error) {
    const e = error as { code?: string; message?: string };
    if (e.code === 'P2002' || e.message === 'APPOINTMENT_CONFLICT') {
      return { success: false, status: 409, message: 'Khung giờ mới đã có người đặt. Vui lòng chọn khung giờ khác.' };
    }
    if (e.message === 'ROOM_NOT_BOOKABLE') {
      return { success: false, status: 409, message: 'Phòng đã được giữ chỗ / cho thuê nên không đổi lịch xem được.' };
    }
    throw error;
  }
}

/**
 * Lịch hẹn sắp tới (đang chờ / đã xác nhận, từ hôm nay trở đi) của một số điện thoại.
 * Dùng để giới hạn đặt lịch của khách vãng lai.
 */
export async function getUpcomingAppointmentsByPhone(phone: string, fromDate: string) {
  return prisma.appointment.findMany({
    where: {
      userPhone: phone,
      status: { in: ['PENDING', 'CONFIRMED'] },
      date: { gte: fromDate },
    },
    select: { id: true, roomId: true, date: true, timeSlot: true },
  });
}

export async function getAppointmentById(id: string) {
  const row = await prisma.appointment.findUnique({ where: { id }, include: { room: { include: { project: true } } } });
  return row ? mapPrismaAppointment(row) : null;
}

/**
 * Get appointments
 */
export async function getAppointments(filter?: { room_id?: number; landlord_id?: string; user_id?: string; user_phone?: string }) {
  const where: Prisma.AppointmentWhereInput = {};
  if (filter?.room_id) where.roomId = filter.room_id;
  if (filter?.landlord_id) {
    where.room = { landlordId: filter.landlord_id };
  }
  if (filter?.user_id) {
    // Tenant ownership is bound to the authenticated user id. A phone number
    // alone is not proof of ownership and must not claim another guest's PII.
    where.userId = filter.user_id;
  } else if (filter?.user_phone) {
    where.userPhone = filter.user_phone;
  }

  const [list, depositClaims] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        room: {
          include: {
            project: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    getAllRoomDepositClaims(),
  ]);
  return list.map((a) => {
    const mapped = mapPrismaAppointment(a);
    const claim = depositClaims[String(mapped.room_id)];
    // Yêu cầu đặt cọc được lưu theo phòng; chỉ gắn vào đúng lịch hẹn đã tạo ra nó,
    // để người khác từng hẹn xem cùng phòng không thấy CCCD / SĐT của người đặt cọc.
    if (claim && claim.status !== 'CANCELLED' && claim.appointment_id === mapped.id) {
      mapped.deposit_claim = {
        transaction_code: claim.transaction_code,
        status: claim.status,
        deposit_amount: claim.deposit_amount,
        move_in_date: claim.move_in_date,
        tenant_name: claim.tenant_name,
        tenant_phone: claim.tenant_phone,
        tenant_citizen_id: claim.tenant_citizen_id,
        created_at: claim.created_at,
      };
    }
    return mapped;
  });
}

/**
 * Update appointment status & synchronize room status lifecycle
 */
export async function updateAppointmentStatus(id: string, status: Appointment['status']) {
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.update({
        where: { id },
        data: { status },
      });

      // Auto synchronize room status in the same transaction as the appointment.
      if (status === 'CONFIRMED') {
        await tx.room.updateMany({
          where: { id: appointment.roomId, status: 'AVAILABLE' },
          data: { status: 'BOOKED_VIEWING' },
        });
      } else if (status === 'CANCELLED' || status === 'COMPLETED') {
        const otherActive = await tx.appointment.findFirst({
          where: {
            roomId: appointment.roomId,
            status: { in: ['PENDING', 'CONFIRMED'] },
            id: { not: id },
          },
        });
        if (!otherActive) {
          await tx.room.updateMany({
            where: { id: appointment.roomId, status: 'BOOKED_VIEWING' },
            data: { status: 'AVAILABLE' },
          });
        }
      }

      return appointment;
    });

    publishRoomEvent('appointment', updated.roomId, updated.userId);
    return mapPrismaAppointment(updated);
  } catch {
    return null;
  }
}

// ============================================================
// Landlord APIs & Extended CRUD
// ============================================================

export async function getLandlords(): Promise<Landlord[]> {
  const list = await prisma.landlord.findMany();
  return list.map((l) => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
    email: l.email,
    role: 'LANDLORD' as const,
    avatar: l.avatar,
  }));
}

export async function getLandlordRooms(landlordId: string): Promise<Room[]> {
  const [rooms, depositClaims] = await Promise.all([
    prisma.room.findMany({
      where: { landlordId: landlordId },
      orderBy: { id: 'asc' },
    }),
    getAllRoomDepositClaims(),
  ]);
  return rooms.map((r) => {
    const mapped = mapPrismaRoom(r);
    const claim = depositClaims[String(mapped.id)];
    if (claim && claim.status !== 'CANCELLED') {
      mapped.deposit_claim = {
        transaction_code: claim.transaction_code,
        status: claim.status,
        deposit_amount: claim.deposit_amount,
        move_in_date: claim.move_in_date,
        tenant_name: claim.tenant_name,
        tenant_phone: claim.tenant_phone,
        tenant_citizen_id: claim.tenant_citizen_id,
        created_at: claim.created_at,
      };
    }
    return mapped;
  });
}

const HUIT_MAIN_LAT = 10.8061;
const HUIT_MAIN_LNG = 106.6286;

async function resolveOrUpsertBuildingProject(params: {
  landlordId: string;
  landlordName: string;
  landlordPhone: string;
  projectCode?: string | null;
  projectName?: string | null;
  buildingName?: string | null;
  address?: string;
  district?: string;
  lat?: number;
  lng?: number;
  basePrice?: number;
  roomType?: string;
  area?: number;
  amenities?: string[];
  images?: string[];
}) {
  const requestedCode = params.projectCode?.trim();
  const requestedName = (params.projectName || params.buildingName || '').trim();

  if (requestedCode) {
    const byCode = await prisma.project.findUnique({ where: { code: requestedCode } });
    // Khu trọ tìm theo mã phải thuộc đúng chủ trọ của phòng, không gắn phòng vào khu trọ của người khác
    if (byCode && byCode.landlordId !== params.landlordId) {
      throw new Error('BUILDING_NOT_OWNED: Khu trọ này thuộc chủ trọ khác, không thể gắn phòng vào.');
    }
    if (byCode) return byCode;
  }

  if (requestedName) {
    const byName = await prisma.project.findFirst({
      where: {
        landlordId: params.landlordId,
        name: { equals: requestedName, mode: 'insensitive' },
      },
    });
    if (byName) return byName;

    const slugBase = requestedName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const uniqueSuffix = Date.now().toString(36).slice(-4);
    const code = requestedCode || `BLD_${slugBase.toUpperCase().replace(/-/g, '_').slice(0, 12)}_${uniqueSuffix.toUpperCase()}`;
    const slug = `${slugBase || 'toa-nha'}-${uniqueSuffix}`;

    return prisma.project.create({
      data: {
        slug,
        code,
        name: requestedName,
        address: params.address || 'Quận Tân Phú, TP.HCM',
        district: params.district || 'Quận Tân Phú',
        lat: Number.isFinite(params.lat) ? Number(params.lat) : 10.8015,
        lng: Number.isFinite(params.lng) ? Number(params.lng) : 106.6295,
        basePrice: params.basePrice || 4200000,
        roomType: params.roomType || 'Phòng Studio',
        area: params.area || 25,
        amenities: params.amenities && params.amenities.length > 0 ? params.amenities : ['Máy lạnh', 'WC riêng', 'Wifi'],
        images: params.images && params.images.length > 0 ? params.images : [],
        landlordId: params.landlordId,
        landlordName: params.landlordName,
        landlordPhone: params.landlordPhone,
      },
    });
  }

  const existingForLandlord = await prisma.project.findFirst({
    where: { landlordId: params.landlordId },
    orderBy: { id: 'asc' },
  });
  if (existingForLandlord) return existingForLandlord;

  const fallbackCode = `BLD_${params.landlordId.toUpperCase()}`;
  const fallbackSlug = `toa-nha-${params.landlordId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return prisma.project.upsert({
    where: { code: fallbackCode },
    update: {},
    create: {
      slug: fallbackSlug,
      code: fallbackCode,
      name: `Tòa nhà ${params.landlordName}`,
      address: params.address || 'Quận Tân Phú, TP.HCM',
      district: params.district || 'Quận Tân Phú',
      lat: Number.isFinite(params.lat) ? Number(params.lat) : 10.8015,
      lng: Number.isFinite(params.lng) ? Number(params.lng) : 106.6295,
      basePrice: params.basePrice || 4200000,
      roomType: params.roomType || 'Phòng Studio',
      area: params.area || 25,
      amenities: params.amenities && params.amenities.length > 0 ? params.amenities : ['Máy lạnh', 'WC riêng', 'Wifi'],
      images: params.images && params.images.length > 0 ? params.images : [],
      landlordId: params.landlordId,
      landlordName: params.landlordName,
      landlordPhone: params.landlordPhone,
    },
  });
}

export async function createRoom(
  roomData: Partial<Room> & { landlord_id: string; building_name?: string },
  opts: { listingStatus?: 'PENDING' | 'APPROVED' } = {}
): Promise<Room> {
  const pricing = await getPricingDefaults();
  const maxRoom = await prisma.room.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true },
  });
  const newId = (maxRoom?.id || 600) + 1;

  let landlordName = roomData.landlord_name;
  let landlordPhone = roomData.landlord_phone;
  if (!landlordName || !landlordPhone) {
    const l = await prisma.landlord.findUnique({ where: { id: roomData.landlord_id } });
    landlordName = l?.name || 'Chủ trọ';
    landlordPhone = l?.phone || '0903123456';
  }

  const cleanImages = Array.isArray(roomData.images)
    ? roomData.images.map((img) => String(img).trim()).filter(Boolean)
    : [];

  const targetProject = await resolveOrUpsertBuildingProject({
    landlordId: roomData.landlord_id,
    landlordName,
    landlordPhone,
    projectCode: roomData.project_code,
    projectName: roomData.project_name,
    buildingName: roomData.building_name,
    address: roomData.address,
    district: roomData.district,
    lat: roomData.latitude,
    lng: roomData.longitude,
    basePrice: roomData.price,
    roomType: roomData.room_type,
    area: roomData.area,
    amenities: roomData.amenities,
    images: cleanImages,
  });

  const resolvedLat =
    typeof roomData.latitude === 'number' && Number.isFinite(roomData.latitude)
      ? roomData.latitude
      : targetProject.lat;
  const resolvedLng =
    typeof roomData.longitude === 'number' && Number.isFinite(roomData.longitude)
      ? roomData.longitude
      : targetProject.lng;
  const resolvedDistanceKm =
    typeof roomData.distance_to_huit_km === 'number' && Number.isFinite(roomData.distance_to_huit_km)
      ? roomData.distance_to_huit_km
      : Number(calculateHaversineDistance(resolvedLat, resolvedLng, HUIT_MAIN_LAT, HUIT_MAIN_LNG).toFixed(2));

  const created = await prisma.room.create({
    data: {
      id: newId,
      roomCode: roomData.room_code || `P-${newId}`,
      projectCode: targetProject.code,
      projectName: targetProject.name,
      floor: typeof roomData.floor === 'number' && Number.isFinite(roomData.floor) ? roomData.floor : 1,
      unitNumber: roomData.unit_number ?? newId,
      hasBalcony: Boolean(roomData.has_balcony),
      title: roomData.title || `Phòng ${roomData.room_code || newId} — ${targetProject.name}`,
      price: roomData.price || 4200000,
      deposit: roomData.deposit || roomData.price || 4200000,
      area: roomData.area || 25,
      roomType: roomData.room_type || 'Phòng Studio',
      address: roomData.address || targetProject.address || 'Quận Tân Phú, TP.HCM',
      district: roomData.district || targetProject.district || 'Quận Tân Phú',
      latitude: resolvedLat,
      longitude: resolvedLng,
      distanceToHuitKm: resolvedDistanceKm,
      amenities: roomData.amenities && roomData.amenities.length > 0 ? roomData.amenities : ['Máy lạnh', 'WC riêng', 'Wifi'],
      images: cleanImages,
      status: (roomData.status as any) || 'AVAILABLE',
      landlordId: roomData.landlord_id,
      landlordName: landlordName,
      landlordPhone: landlordPhone,
      electricityRate: roomData.electricity_rate ?? pricing.electricityRate,
      waterRate: roomData.water_rate ?? pricing.waterRate,
      internetFee: roomData.internet_fee ?? pricing.internetFee,
      serviceFee: roomData.service_fee ?? pricing.serviceFee,
      parkingFee: roomData.parking_fee ?? pricing.parkingFee,
      // Tin do chủ trọ đăng phải chờ admin duyệt; admin tự thêm thì duyệt luôn
      listingStatus: opts.listingStatus ?? 'PENDING',
      submittedAt: new Date(),
      moderatedAt: (opts.listingStatus ?? 'PENDING') === 'APPROVED' ? new Date() : null,
      description:
        roomData.description !== undefined && String(roomData.description).trim().length > 0
          ? String(roomData.description).trim()
          : `Phòng ${roomData.room_code || newId} thuộc ${targetProject.name}, diện tích ${roomData.area || 25}m².`,
    },
  });

  invalidateRoomsCache();
  publishRoomEvent('room', created.id);
  return mapPrismaRoom(created);
}

export { listingContentChanged };

export async function updateRoom(
  id: number,
  data: Partial<Room> & { building_name?: string },
  opts: { reReviewOnContentChange?: boolean } = {}
): Promise<Room | null> {
  try {
    const existing = await prisma.room.findUnique({ where: { id } });
    if (!existing) return null;

    const updatePayload: Prisma.RoomUpdateInput = {};
    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.room_code !== undefined) updatePayload.roomCode = data.room_code;
    if (data.price !== undefined) updatePayload.price = data.price;
    if (data.deposit !== undefined) updatePayload.deposit = data.deposit;
    if (data.area !== undefined) updatePayload.area = data.area;
    if (data.room_type !== undefined) updatePayload.roomType = data.room_type;
    if (data.address !== undefined) updatePayload.address = data.address;
    if (data.district !== undefined) updatePayload.district = data.district;
    if (data.amenities !== undefined) updatePayload.amenities = data.amenities;
    if (data.images !== undefined) {
      updatePayload.images = Array.isArray(data.images)
        ? data.images.map((img) => String(img).trim()).filter(Boolean)
        : [];
    }
    if (data.floor !== undefined && Number.isFinite(Number(data.floor))) {
      updatePayload.floor = Number(data.floor);
    }
    if (data.has_balcony !== undefined) {
      updatePayload.hasBalcony = Boolean(data.has_balcony);
    }
    if (data.latitude !== undefined && Number.isFinite(Number(data.latitude))) {
      updatePayload.latitude = Number(data.latitude);
    }
    if (data.longitude !== undefined && Number.isFinite(Number(data.longitude))) {
      updatePayload.longitude = Number(data.longitude);
    }
    const nextLat =
      data.latitude !== undefined && Number.isFinite(Number(data.latitude))
        ? Number(data.latitude)
        : existing.latitude;
    const nextLng =
      data.longitude !== undefined && Number.isFinite(Number(data.longitude))
        ? Number(data.longitude)
        : existing.longitude;
    if (data.latitude !== undefined || data.longitude !== undefined) {
      updatePayload.distanceToHuitKm = Number(
        calculateHaversineDistance(nextLat, nextLng, HUIT_MAIN_LAT, HUIT_MAIN_LNG).toFixed(2)
      );
    }
    if (data.project_code !== undefined || data.project_name !== undefined || data.building_name !== undefined) {
      const targetProject = await resolveOrUpsertBuildingProject({
        landlordId: existing.landlordId,
        landlordName: existing.landlordName,
        landlordPhone: existing.landlordPhone,
        projectCode: data.project_code,
        projectName: data.project_name,
        buildingName: data.building_name,
        address: data.address ?? existing.address,
        district: data.district ?? existing.district,
        lat: nextLat,
        lng: nextLng,
        basePrice: data.price ?? existing.price,
        roomType: data.room_type ?? existing.roomType,
        area: data.area ?? existing.area,
        amenities: data.amenities ?? existing.amenities,
        images: data.images ?? existing.images,
      });
      updatePayload.project = { connect: { code: targetProject.code } };
      updatePayload.projectName = targetProject.name;
    }
    if (data.status !== undefined) updatePayload.status = data.status as any;
    if (data.electricity_rate !== undefined) updatePayload.electricityRate = data.electricity_rate;
    if (data.water_rate !== undefined) updatePayload.waterRate = data.water_rate;
    if (data.internet_fee !== undefined) updatePayload.internetFee = data.internet_fee;
    if (data.service_fee !== undefined) updatePayload.serviceFee = data.service_fee;
    if (data.parking_fee !== undefined) updatePayload.parkingFee = data.parking_fee;
    if (data.description !== undefined) updatePayload.description = data.description;

    // Chủ trọ sửa nội dung tin (giá, diện tích, vị trí, ảnh, tiện ích...) → gửi duyệt lại
    if (opts.reReviewOnContentChange && listingContentChanged(existing as unknown as Record<string, unknown>, data as Record<string, unknown>)) {
      updatePayload.listingStatus = 'PENDING';
      updatePayload.submittedAt = new Date();
      updatePayload.moderationNote = null;
      updatePayload.moderatedAt = null;
    }

    const updated = await prisma.room.update({
      where: { id },
      data: updatePayload,
    });
    invalidateRoomsCache();
    publishRoomEvent('room', id);
    return mapPrismaRoom(updated);
  } catch (err) {
    // Lỗi quyền sở hữu khu trọ phải tới được route (403), không bị nuốt thành "không tìm thấy phòng"
    if (err instanceof Error && err.message.startsWith('BUILDING_NOT_OWNED:')) throw err;
    return null;
  }
}

export async function updateRoomStatus(id: number, status: RoomStatus): Promise<Room | null> {
  try {
    const updated = await prisma.room.update({
      where: { id },
      data: { status: status as any },
    });
    invalidateRoomsCache();
    publishRoomEvent('room', id);
    return mapPrismaRoom(updated);
  } catch {
    return null;
  }
}

// ============================================================
// Kiểm duyệt tin đăng
// ============================================================

export async function getModerationQueue(status: 'PENDING' | 'REJECTED' | 'APPROVED' = 'PENDING', limit = 100) {
  const rows = await prisma.room.findMany({
    where: { listingStatus: status },
    orderBy: status === 'APPROVED' ? { moderatedAt: 'desc' } : { submittedAt: 'asc' },
    take: limit,
  });
  return rows.map(mapPrismaRoom);
}

export async function countListingsByStatus() {
  const groups = await prisma.room.groupBy({ by: ['listingStatus'], _count: { _all: true } });
  const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  for (const g of groups) counts[g.listingStatus] = g._count._all;
  return counts;
}

/** Admin duyệt / từ chối tin đăng. Từ chối bắt buộc có lý do để chủ trọ sửa lại. */
export async function moderateRoom(roomId: number, decision: 'APPROVED' | 'REJECTED', note?: string | null) {
  const trimmed = String(note ?? '').trim();
  if (decision === 'REJECTED' && trimmed.length < 5) {
    throw new Error('MODERATION_NOTE_REQUIRED: Vui lòng ghi lý do từ chối (tối thiểu 5 ký tự) để chủ trọ biết cần sửa gì.');
  }
  const updated = await prisma.room.update({
    where: { id: roomId },
    data: { listingStatus: decision, moderationNote: trimmed || null, moderatedAt: new Date() },
  });
  invalidateRoomsCache();
  return mapPrismaRoom(updated);
}

// ============================================================
// Danh mục tiện ích & đơn giá mặc định
// ============================================================

export interface PricingDefaults {
  electricityRate: number;
  waterRate: number;
  internetFee: number;
  serviceFee: number;
  parkingFee: number;
}

export const FALLBACK_PRICING_DEFAULTS: PricingDefaults = {
  electricityRate: 3800,
  waterRate: 25000,
  internetFee: 100000,
  serviceFee: 150000,
  parkingFee: 120000,
};

export async function getPricingDefaults(): Promise<PricingDefaults> {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: 'pricing_defaults' } });
    const value = (row?.value ?? {}) as Partial<Record<keyof PricingDefaults, unknown>>;
    const pick = (key: keyof PricingDefaults) => {
      const n = Number(value[key]);
      return Number.isFinite(n) && n >= 0 ? n : FALLBACK_PRICING_DEFAULTS[key];
    };
    return {
      electricityRate: pick('electricityRate'),
      waterRate: pick('waterRate'),
      internetFee: pick('internetFee'),
      serviceFee: pick('serviceFee'),
      parkingFee: pick('parkingFee'),
    };
  } catch {
    return { ...FALLBACK_PRICING_DEFAULTS };
  }
}

export async function savePricingDefaults(input: Partial<PricingDefaults>): Promise<PricingDefaults> {
  const current = await getPricingDefaults();
  const next = { ...current };
  for (const key of Object.keys(FALLBACK_PRICING_DEFAULTS) as Array<keyof PricingDefaults>) {
    if (input[key] === undefined) continue;
    const n = Number(input[key]);
    if (!Number.isFinite(n) || n < 0 || n > 100_000_000) {
      throw new Error(`INVALID_PRICE: Đơn giá "${key}" không hợp lệ.`);
    }
    next[key] = Math.round(n);
  }
  await prisma.systemSetting.upsert({
    where: { key: 'pricing_defaults' },
    create: { key: 'pricing_defaults', value: next as unknown as Prisma.InputJsonValue },
    update: { value: next as unknown as Prisma.InputJsonValue },
  });
  return next;
}

/** Danh mục tiện ích; lần đầu (bảng trống) tự lấy từ các tiện ích đang dùng trong dữ liệu phòng. */
export async function getAmenityCatalog(opts: { activeOnly?: boolean } = {}) {
  let rows = await prisma.amenity.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  if (rows.length === 0) {
    const used = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT DISTINCT unnest(amenities) AS name FROM rooms ORDER BY name`;
    const names = used.map((u) => u.name.trim()).filter(Boolean);
    if (names.length > 0) {
      await prisma.amenity.createMany({
        data: names.map((name, i) => ({ name, sortOrder: i })),
        skipDuplicates: true,
      });
      rows = await prisma.amenity.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    }
  }
  return opts.activeOnly ? rows.filter((r) => r.isActive) : rows;
}

export async function deleteRoom(id: number): Promise<boolean> {
  const [contractCount, billCount, handoverCount] = await Promise.all([
    prisma.contract.count({ where: { roomId: id } }),
    prisma.utilityBill.count({ where: { roomId: id } }),
    prisma.handover.count({ where: { roomId: id } }),
  ]);

  if (contractCount > 0 || billCount > 0 || handoverCount > 0) {
    throw new Error(
      `ROOM_HAS_RECORDS: Không thể xóa phòng vì đang có ${contractCount} hợp đồng, ${billCount} hóa đơn và ${handoverCount} biên bản bàn giao cần lưu trữ đối soát.`
    );
  }

  try {
    // Only delete non-financial/non-contractual transient records
    await prisma.appointment.deleteMany({ where: { roomId: id } });
    await prisma.interactionLog.deleteMany({ where: { roomId: id } });
    await prisma.assetTemplate.deleteMany({ where: { roomId: id } });
    await prisma.roommatePost.deleteMany({ where: { roomId: id } });
    await prisma.room.delete({ where: { id } });
    invalidateRoomsCache();
    return true;
  } catch {
    return false;
  }
}

export async function createUtilityBill(billData: Omit<UtilityBill, 'id' | 'created_at'>): Promise<UtilityBill> {
  const normalizedMonth = normalizeBillMonth(billData.month);
  if (!normalizedMonth) {
    throw new Error(`INVALID_BILL_MONTH: Kỳ hóa đơn "${String(billData.month ?? '')}" không hợp lệ. Nhập theo dạng MM/YYYY, ví dụ 09/2026.`);
  }
  const duplicateMessage = `DUPLICATE_BILL_MONTH: Phòng ${billData.room_code} đã có hóa đơn kỳ ${normalizedMonth}. Không thể lập 2 hóa đơn cùng kỳ cho một phòng.`;
  const existingDuplicate = await prisma.utilityBill.findFirst({
    where: {
      roomId: billData.room_id,
      month: normalizedMonth,
    },
    select: { id: true },
  });
  if (existingDuplicate) throw new Error(duplicateMessage);

  // Hóa đơn thuộc về hợp đồng đang hiệu lực của phòng: chỉ khách thuê của hợp đồng đó thấy và thanh toán.
  const activeContract = await prisma.contract.findFirst({
    where: { roomId: billData.room_id, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, monthlyRent: true },
  });
  if (!activeContract) {
    throw new Error(
      `NO_ACTIVE_CONTRACT: Phòng ${billData.room_code} chưa có hợp đồng đang hiệu lực nên không thể lập hóa đơn. Hãy lập hóa đơn kỳ cuối trước khi thanh lý hợp đồng.`
    );
  }

  // Số tiền tính lại ở máy chủ từ đơn giá phòng + tiền thuê trên hợp đồng (không dùng số tiền client gửi)
  const roomRates = await prisma.room.findUnique({
    where: { id: billData.room_id },
    select: { roomCode: true, electricityRate: true, waterRate: true, internetFee: true, serviceFee: true, price: true },
  });
  if (!roomRates) throw new Error(`INVALID_READING: Không tìm thấy phòng #${billData.room_id}.`);
  const amounts = computeBill(
    {
      electricOld: Number(billData.electric_old),
      electricNew: Number(billData.electric_new),
      waterOld: Number(billData.water_old),
      waterNew: Number(billData.water_new),
    },
    {
      electricityRate: roomRates.electricityRate,
      waterRate: roomRates.waterRate,
      internetFee: roomRates.internetFee,
      serviceFee: roomRates.serviceFee,
      rent: activeContract.monthlyRent || roomRates.price,
    }
  );

  const bill = await prisma.utilityBill
    .create({
      data: {
        roomId: billData.room_id,
        roomCode: roomRates.roomCode,
        month: normalizedMonth,
        electricOld: Number(billData.electric_old),
        electricNew: Number(billData.electric_new),
        electricUsed: amounts.electricUsed,
        electricCost: amounts.electricCost,
        waterOld: Number(billData.water_old),
        waterNew: Number(billData.water_new),
        waterUsed: amounts.waterUsed,
        waterCost: amounts.waterCost,
        internetCost: amounts.internetCost,
        serviceCost: amounts.serviceCost,
        rentCost: amounts.rentCost,
        totalAmount: amounts.totalAmount,
        status: billData.status === 'PAID' ? 'PAID' : 'UNPAID',
        contractId: activeContract.id,
      },
    })
    .catch((err: unknown) => {
      // Hai yêu cầu lập cùng kỳ chạy song song: ràng buộc unique (room_id, month) chặn bản thứ hai
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new Error(duplicateMessage);
      }
      throw err;
    });
  publishRoomEvent('bill', billData.room_id);
  return mapPrismaBill(bill);
}

/**
 * Bảng lập hóa đơn hàng loạt: các phòng của chủ trọ đang có hợp đồng hiệu lực, chỉ số kỳ trước
 * (hóa đơn gần nhất, hoặc chỉ số ban đầu trong biên bản nhận phòng), đơn giá và trạng thái đã lập kỳ này chưa.
 */
export async function getBulkBillingSheet(landlordId: string | null, month: string) {
  const normalized = normalizeBillMonth(month);
  if (!normalized) throw new Error('INVALID_BILL_MONTH: Kỳ hóa đơn không hợp lệ.');
  const contracts = await prisma.contract.findMany({
    where: { status: 'ACTIVE', ...(landlordId ? { room: { landlordId } } : {}) },
    orderBy: { createdAt: 'desc' },
    include: {
      room: { select: { id: true, roomCode: true, title: true, electricityRate: true, waterRate: true, internetFee: true, serviceFee: true, price: true } },
      handovers: { where: { type: 'CHECK_IN' }, orderBy: { createdAt: 'desc' }, take: 1, select: { notes: true } },
    },
  });
  const seen = new Set<number>();
  const active = contracts.filter((c) => (seen.has(c.roomId) ? false : (seen.add(c.roomId), true)));
  const roomIds = active.map((c) => c.roomId);
  const [latestBills, billedThisMonth] = await Promise.all([
    prisma.utilityBill.findMany({
      where: { roomId: { in: roomIds } },
      orderBy: { createdAt: 'desc' },
      distinct: ['roomId'],
      select: { roomId: true, electricNew: true, waterNew: true, month: true },
    }),
    prisma.utilityBill.findMany({ where: { roomId: { in: roomIds }, month: normalized }, select: { roomId: true, id: true } }),
  ]);
  const latestByRoom = new Map(latestBills.map((b) => [b.roomId, b]));
  const billedRooms = new Set(billedThisMonth.map((b) => b.roomId));
  return {
    month: normalized,
    rows: active
      .map((c) => {
        const last = latestByRoom.get(c.roomId);
        const initial = parseInitialReadings(c.handovers[0]?.notes);
        return {
          room_id: c.roomId,
          room_code: c.room.roomCode,
          room_title: c.room.title,
          contract_id: c.id,
          tenant_name: c.tenantName,
          rent: c.monthlyRent || c.room.price,
          electricity_rate: c.room.electricityRate,
          water_rate: c.room.waterRate,
          internet_fee: c.room.internetFee,
          service_fee: c.room.serviceFee,
          prev_electric: last ? last.electricNew : initial.electric ?? 0,
          prev_water: last ? last.waterNew : initial.water ?? 0,
          prev_source: last ? `Hóa đơn kỳ ${last.month}` : initial.electric !== undefined ? 'Biên bản nhận phòng' : 'Chưa có (nhập tay)',
          billed: billedRooms.has(c.roomId),
        };
      })
      .sort((a, b) => a.room_code.localeCompare(b.room_code)),
  };
}

/** Lập nhiều hóa đơn cùng kỳ. Mỗi phòng xử lý riêng; phòng lỗi không làm hỏng phòng khác. */
export async function createBillsBulk(
  landlordId: string | null,
  month: string,
  items: Array<{ room_id: number; electric_old: number; electric_new: number; water_old: number; water_new: number }>
) {
  const results: Array<{ room_id: number; ok: boolean; message: string; bill?: UtilityBill }> = [];
  for (const item of items.slice(0, 300)) {
    try {
      const room = await prisma.room.findUnique({ where: { id: Number(item.room_id) }, select: { id: true, roomCode: true, landlordId: true } });
      if (!room || (landlordId && room.landlordId !== landlordId)) {
        results.push({ room_id: item.room_id, ok: false, message: 'Không có quyền lập hóa đơn cho phòng này.' });
        continue;
      }
      const bill = await createUtilityBill({
        room_id: room.id,
        room_code: room.roomCode,
        month,
        electric_old: Number(item.electric_old),
        electric_new: Number(item.electric_new),
        water_old: Number(item.water_old),
        water_new: Number(item.water_new),
        status: 'UNPAID',
      } as Omit<UtilityBill, 'id' | 'created_at'>);
      results.push({ room_id: room.id, ok: true, message: `Đã lập ${bill.total_amount.toLocaleString('vi-VN')} đ`, bill });
    } catch (err) {
      const msg = err instanceof Error ? err.message.replace(/^[A-Z_]+:\s*/, '') : 'Lỗi không xác định';
      results.push({ room_id: item.room_id, ok: false, message: msg });
    }
  }
  return { created: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
}

/**
 * Đổi trạng thái hóa đơn. null = trạng thái không hợp lệ, không có hóa đơn hoặc CSDL lỗi — khi đó
 * không có gì được ghi: hóa đơn và báo thanh toán đổi trong cùng transaction.
 */
export async function updateBillStatus(billId: string, status: 'PAID' | 'UNPAID'): Promise<UtilityBill | null> {
  if (status !== 'PAID' && status !== 'UNPAID') return null;
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const bill = await tx.utilityBill.update({
        where: { id: billId },
        data: { status },
      });
      await updateBillPaymentClaimStatus(billId, status === 'PAID' ? 'CONFIRMED' : 'CLEARED', tx);
      return bill;
    });
    publishRoomEvent('bill', updated.roomId);
    const mapped = mapPrismaBill(updated);
    const claim = await getBillPaymentClaim(billId);
    if (claim) {
      mapped.payment_claim = {
        transaction_code: claim.transaction_code,
        status: claim.status,
        reported_at: claim.reported_at,
        confirmed_at: claim.confirmed_at,
        tenant_name: claim.tenant_name,
        tenant_phone: claim.tenant_phone,
      };
    }
    return mapped;
  } catch {
    return null;
  }
}

export async function getUtilityBills(filter?: { roomId?: number; roomIds?: number[]; landlordId?: string }): Promise<UtilityBill[]> {
  const where: Prisma.UtilityBillWhereInput = {};
  if (filter?.roomId) where.roomId = filter.roomId;
  else if (filter?.roomIds) where.roomId = { in: filter.roomIds };
  if (filter?.landlordId) where.room = { landlordId: filter.landlordId };

  const [list, claims] = await Promise.all([
    prisma.utilityBill.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    }),
    getAllBillPaymentClaims(),
  ]);
  return list.map((b) => {
    const mapped = mapPrismaBill(b);
    const claim = claims[String(mapped.id)];
    if (claim) {
      mapped.payment_claim = {
        transaction_code: claim.transaction_code,
        status: mapped.status === 'PAID' ? 'CONFIRMED' : claim.status,
        reported_at: claim.reported_at,
        confirmed_at: claim.confirmed_at,
        tenant_name: claim.tenant_name,
        tenant_phone: claim.tenant_phone,
      };
    }
    return mapped;
  });
}

/**
 * Hóa đơn thuộc các hợp đồng cho trước (dùng cho khách thuê): hóa đơn mới theo contractId,
 * hóa đơn cũ chưa có contractId thì suy ra bằng inferBillContractId. Khách thuê cũ không thấy
 * hóa đơn của khách mới cùng phòng, và ngược lại.
 */
export async function getUtilityBillsForContracts(contractIds: Iterable<string>): Promise<UtilityBill[]> {
  const owned = new Set(contractIds);
  if (owned.size === 0) return [];
  const ownedContracts = await prisma.contract.findMany({
    where: { id: { in: Array.from(owned) } },
    select: { roomId: true },
  });
  const roomIds = Array.from(new Set(ownedContracts.map((contract) => contract.roomId)));
  if (roomIds.length === 0) return [];
  const [bills, roomContracts] = await Promise.all([
    getUtilityBills({ roomIds }),
    prisma.contract.findMany({
      where: { roomId: { in: roomIds } },
      select: { id: true, roomId: true, createdAt: true, startDate: true, endDate: true },
    }),
  ]);
  return bills.filter((bill) => {
    const contractId = inferBillContractId(
      { roomId: bill.room_id, createdAt: bill.created_at, month: bill.month, contractId: bill.contract_id },
      roomContracts
    );
    return contractId !== null && owned.has(contractId);
  });
}

/** Hợp đồng sở hữu một hóa đơn (theo contractId, hoặc suy ra với hóa đơn cũ). */
export async function resolveBillContractId(bill: {
  roomId: number;
  createdAt: Date;
  month: string;
  contractId?: string | null;
}) {
  if (bill.contractId) return bill.contractId;
  const roomContracts = await prisma.contract.findMany({
    where: { roomId: bill.roomId },
    select: { id: true, roomId: true, createdAt: true, startDate: true, endDate: true },
  });
  return inferBillContractId(bill, roomContracts);
}

export async function createContract(contractData: Omit<Contract, 'id' | 'created_at'>): Promise<Contract> {
  const citizenId = contractData.tenant_citizen_id?.trim() || null;
  const address = contractData.tenant_address?.trim() || null;
  const vehicleCount = Number.isFinite(Number(contractData.vehicle_count))
    ? Math.max(0, Math.round(Number(contractData.vehicle_count)))
    : 0;

  // Kiểm tra phòng, tạo hợp đồng, ghi thông tin bổ sung và đổi trạng thái phòng cùng commit hoặc cùng
  // rollback: lỗi giữa chừng không để lại phòng "Đang thuê" không có hợp đồng.
  // Không tự chấm dứt hợp đồng của người đang ở: phòng đang có hợp đồng ACTIVE thì từ chối.
  const contract = await prisma.$transaction(async (tx) => {
    if (contractData.status === 'ACTIVE') {
      const current = await tx.contract.findFirst({
        where: { roomId: contractData.room_id, status: 'ACTIVE' },
        select: { tenantName: true },
      });
      if (current) {
        throw new Error(
          `ROOM_HAS_ACTIVE_CONTRACT: Phòng đang có hợp đồng hiệu lực của ${current.tenantName}. Vui lòng thanh lý hợp đồng đó trước khi lập hợp đồng mới.`
        );
      }
      // Khóa dòng phòng: chỉ phòng Còn trống / Đã đặt lịch mới lập hợp đồng trực tiếp được
      const rented = await tx.room.updateMany({
        where: { id: contractData.room_id, status: { in: ['AVAILABLE', 'BOOKED_VIEWING'] } },
        data: { status: 'RENTED' },
      });
      if (rented.count !== 1) {
        const room = await tx.room.findUnique({ where: { id: contractData.room_id }, select: { status: true } });
        if (!room) throw new Error('ROOM_NOT_FOUND: Không tìm thấy phòng cần lập hợp đồng.');
        if (room.status === 'RESERVED') {
          throw new Error('ROOM_RESERVED: Phòng đang được giữ chỗ. Vui lòng dùng chức năng Check-in cho khách đã đặt cọc.');
        }
        throw new Error('ROOM_NOT_AVAILABLE: Phòng không ở trạng thái có thể lập hợp đồng mới.');
      }
      await tx.appointment.updateMany({
        where: { roomId: contractData.room_id, status: { in: ['PENDING', 'CONFIRMED'] } },
        data: { status: 'COMPLETED' },
      });
    }

    const created = await tx.contract.create({
      data: {
        roomId: contractData.room_id,
        roomTitle: contractData.room_title,
        tenantName: contractData.tenant_name,
        tenantPhone: contractData.tenant_phone,
        landlordName: contractData.landlord_name,
        startDate: contractData.start_date,
        endDate: contractData.end_date,
        monthlyRent: contractData.monthly_rent,
        depositAmount: contractData.deposit_amount,
        status: contractData.status as any,
      },
    });

    await tx.$executeRaw`
      UPDATE contracts
      SET tenant_citizen_id = ${citizenId},
          tenant_address = ${address},
          vehicle_count = ${vehicleCount}
      WHERE id = ${created.id}
    `;
    return created;
  });
  invalidateRoomsCache();
  publishRoomEvent('contract', contractData.room_id);

  return mapPrismaContract({
    ...contract,
    tenantCitizenId: citizenId,
    tenantAddress: address,
    vehicleCount,
  });
}

export async function getContracts(filter?: { landlordId?: string; tenantPhone?: string }): Promise<Contract[]> {
  const where: Prisma.ContractWhereInput = {};
  if (filter?.landlordId) where.room = { landlordId: filter.landlordId };
  if (filter?.tenantPhone) where.tenantPhone = filter.tenantPhone;

  const list = await prisma.contract.findMany({
    where,
    include: {
      handovers: {
        select: { notes: true },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  // Cột bổ sung chỉ đọc cho đúng các hợp đồng vừa lấy (trước đây quét toàn bảng contracts mỗi lần gọi)
  const extraRows =
    list.length === 0
      ? []
      : await prisma.$queryRaw<
          Array<{
            id: string;
            tenant_citizen_id: string | null;
            tenant_address: string | null;
            vehicle_count: number | null;
          }>
        >`SELECT id, tenant_citizen_id, tenant_address, vehicle_count FROM contracts WHERE id IN (${Prisma.join(list.map((c) => c.id))})`;

  const extraById = new Map(extraRows.map((r) => [r.id, r]));

  return list.map((c) => {
    const extra = extraById.get(c.id);
    return mapPrismaContract({
      ...c,
      tenantCitizenId: extra?.tenant_citizen_id ?? undefined,
      tenantAddress: extra?.tenant_address ?? undefined,
      vehicleCount: extra?.vehicle_count ?? 0,
    });
  });
}

/**
 * Persists the tenant's electronic signature without changing the legacy
 * Contract schema. The marker lives on the contract's check-in handover,
 * which is already part of the same legal dossier and survives reloads.
 */
export async function signContractAsTenant(contractId: string): Promise<{ signedAt: string } | null> {
  return prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findUnique({
      where: { id: contractId },
      include: { handovers: { orderBy: { createdAt: 'desc' } } },
    });
    if (!contract) return null;

    const existingSignedAt = readContractTenantSignature(contract);
    if (existingSignedAt) return { signedAt: existingSignedAt };

    const handover =
      contract.handovers.find((item) => item.type === 'CHECK_IN') || contract.handovers[0];
    if (!handover) throw new Error('CONTRACT_HANDOVER_REQUIRED');

    const signedAt = new Date().toISOString();
    const existingNotes = handover.notes?.trim();
    const signatureMarker = `[ELITE_CONTRACT_TENANT_SIGNED_AT:${signedAt}]`;
    await tx.handover.update({
      where: { id: handover.id },
      data: { notes: existingNotes ? `${existingNotes}\n${signatureMarker}` : signatureMarker },
    });

    return { signedAt };
  });
}

/**
 * Kết thúc một hợp đồng ACTIVE và trả phòng về trạng thái đúng, trong transaction đang mở.
 * null = không có hợp đồng; hợp đồng đã kết thúc thì ném CONTRACT_NOT_ACTIVE (không "thanh lý lại"
 * hợp đồng cũ, vì việc đó từng đưa phòng của lượt thuê sau về Còn trống).
 */
export async function endActiveContractInTx(tx: Prisma.TransactionClient, contractId: string) {
  const existing = await tx.contract.findUnique({ where: { id: contractId }, select: { id: true } });
  if (!existing) return null;
  const ended = await tx.contract.updateMany({
    where: { id: contractId, status: 'ACTIVE' },
    data: { status: 'TERMINATED' },
  });
  if (ended.count !== 1) {
    throw new Error('CONTRACT_NOT_ACTIVE: Hợp đồng này đã kết thúc hoặc không còn hiệu lực.');
  }
  const contract = await tx.contract.findUniqueOrThrow({ where: { id: contractId } });

  const room = await tx.room.findUnique({ where: { id: contract.roomId }, select: { status: true } });
  let roomStatus = room?.status ?? null;
  if (room) {
    const otherActive = await tx.contract.findFirst({
      where: { roomId: contract.roomId, status: 'ACTIVE' },
      select: { id: true },
    });
    const openAppointment = await tx.appointment.findFirst({
      where: { roomId: contract.roomId, status: { in: ['PENDING', 'CONFIRMED'] } },
      select: { id: true },
    });
    const next = roomStatusAfterContractEnds(room.status, {
      hasActiveContract: Boolean(otherActive),
      hasOpenAppointment: Boolean(openAppointment),
    });
    if (next) {
      await tx.room.update({ where: { id: contract.roomId }, data: { status: next } });
      roomStatus = next;
    }
  }
  return { contract, roomStatus };
}

/**
 * Thanh lý hợp đồng. null = không tìm thấy hợp đồng hoặc CSDL lỗi; hợp đồng đã kết thúc thì ném
 * lỗi CONTRACT_NOT_ACTIVE để route trả 409. `roomId` giữ lại cho tương thích: phòng luôn lấy từ hợp đồng.
 */
export async function terminateContract(contractId: string, roomId?: number): Promise<Contract | null> {
  void roomId;
  try {
    const result = await prisma.$transaction((tx) => endActiveContractInTx(tx, contractId));
    if (!result) return null;
    invalidateRoomsCache();
    publishRoomEvent('contract', result.contract.roomId);
    return mapPrismaContract(result.contract);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('CONTRACT_NOT_ACTIVE:')) throw err;
    return null;
  }
}

/** Gia hạn hợp đồng ACTIVE thêm `months` tháng tính từ ngày hết hạn hiện tại (không tràn ngày cuối tháng). */
export async function renewActiveContract(contractId: string, months: number): Promise<Contract> {
  const renewed = await prisma.$transaction(async (tx) => {
    const current = await tx.contract.findUnique({ where: { id: contractId } });
    if (!current) throw new Error('CONTRACT_NOT_FOUND: Không tìm thấy hợp đồng cần gia hạn.');
    if (current.status !== 'ACTIVE') {
      throw new Error('CONTRACT_NOT_ACTIVE: Hợp đồng đã kết thúc nên không thể gia hạn. Vui lòng lập hợp đồng mới.');
    }
    const endDate = addMonthsClamped(current.endDate, months);
    // Chỉ cập nhật đúng phiên bản vừa đọc: hai lần gia hạn cùng lúc không cộng chồng sai
    const updated = await tx.contract.updateMany({
      where: { id: contractId, status: 'ACTIVE', endDate: current.endDate },
      data: { endDate },
    });
    if (updated.count !== 1) {
      throw new Error('CONTRACT_CHANGED: Hợp đồng vừa được cập nhật. Vui lòng tải lại và thử lại.');
    }
    return { ...current, endDate };
  });
  publishRoomEvent('contract', renewed.roomId);
  return mapPrismaContract(renewed);
}

/**
 * Admin / chủ trọ đổi tay trạng thái phòng — chỉ các chuyển đổi khớp dữ liệu thuê
 * (xem checkManualRoomStatusChange). Lỗi ném dạng `MÃ: thông báo`.
 */
export async function changeRoomStatusManually(id: number, next: unknown): Promise<Room> {
  const updated = await prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({ where: { id }, select: { status: true } });
    if (!room) throw new Error('ROOM_NOT_FOUND: Không tìm thấy phòng.');
    const activeContract = await tx.contract.findFirst({ where: { roomId: id, status: 'ACTIVE' }, select: { id: true } });
    const openAppointment = await tx.appointment.findFirst({
      where: { roomId: id, status: { in: ['PENDING', 'CONFIRMED'] } },
      select: { id: true },
    });
    const latestClaim = await tx.depositClaim.findFirst({
      where: { roomId: id },
      orderBy: { createdAt: 'desc' },
      select: { status: true },
    });
    const check = checkManualRoomStatusChange(room.status, next, {
      hasActiveContract: Boolean(activeContract),
      hasOpenAppointment: Boolean(openAppointment),
      hasPendingDeposit: latestClaim?.status === 'PENDING_CONFIRMATION',
    });
    if (!check.ok) {
      throw new Error(`${check.status === 400 ? 'INVALID_ROOM_STATUS' : 'ROOM_STATUS_CONFLICT'}: ${check.message}`);
    }
    const changed = await tx.room.updateMany({
      where: { id, status: room.status },
      data: { status: next as RoomStatus },
    });
    if (changed.count !== 1) {
      throw new Error('ROOM_STATUS_CONFLICT: Trạng thái phòng vừa thay đổi. Vui lòng tải lại và thử lại.');
    }
    return tx.room.findUniqueOrThrow({ where: { id } });
  });
  invalidateRoomsCache();
  publishRoomEvent('room', id);
  return mapPrismaRoom(updated);
}

/**
 * Một bên ký biên bản bàn giao. Biên bản trả phòng do khách thuê gửi (chủ trọ chưa ký) là yêu cầu
 * trả phòng: chủ trọ ký = đồng ý, hợp đồng kết thúc và phòng được giải phóng trong cùng transaction.
 */
export async function signHandover(handoverId: string, side: 'TENANT' | 'LANDLORD') {
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.handover.findUnique({ where: { id: handoverId } });
    if (!current) return null;
    // Biên bản trả phòng chủ trọ chưa ký = yêu cầu trả phòng của khách (đọc trước khi cập nhật)
    const isTenantCheckoutRequest = current.type === 'CHECK_OUT' && !current.landlordConfirmed;
    const tenantConfirmed = side === 'TENANT' ? true : current.tenantConfirmed;
    const landlordConfirmed = side === 'LANDLORD' ? true : current.landlordConfirmed;
    const updated = await tx.handover.update({
      where: { id: handoverId },
      data: {
        tenantConfirmed,
        landlordConfirmed,
        status: tenantConfirmed && landlordConfirmed ? 'CONFIRMED' : 'PENDING_CONFIRMATION',
      },
    });

    let contractEnded = false;
    if (side === 'LANDLORD' && isTenantCheckoutRequest) {
      const contract = await tx.contract.findUnique({ where: { id: current.contractId }, select: { status: true } });
      if (contract?.status === 'ACTIVE') {
        await endActiveContractInTx(tx, current.contractId);
        contractEnded = true;
      }
    }
    return { handover: updated, contractEnded };
  });
  if (result?.contractEnded) {
    invalidateRoomsCache();
    publishRoomEvent('contract', result.handover.roomId);
  }
  return result;
}

// Availability & House Rules configuration store (PostgreSQL `landlord_settings` + disk persistence)
export async function getLandlordAvailability(landlordId: string) {
  return getPersistedLandlordAvailability(landlordId);
}

export async function saveLandlordAvailability(landlordId: string, data: any) {
  return savePersistedLandlordAvailability(landlordId, data);
}

export async function getLandlordHouseRules(landlordId?: string) {
  return getPersistedHouseRules(landlordId);
}

export async function saveLandlordHouseRules(landlordId: string | undefined, rules: HouseRule[]) {
  return savePersistedHouseRules(landlordId, rules);
}

/**
 * Giữ chữ ký hàm cho các nơi đang gọi. Không còn tự sinh hợp đồng / hóa đơn / lịch hẹn mẫu;
 * dữ liệu mẫu do bản cũ tạo được xóa bằng scripts/cleanup-demo-data.ts.
 */
export async function ensureLandlordDemoData(_landlordId: string) {
  return;
}

// ============================================================
// Admin Stats & Recommender Real Evaluation
// ============================================================

export type RecommenderMethodKey = 'hybrid' | 'ruleOnly' | 'popularity' | 'random';

export interface RecommenderMethodSummary {
  key: RecommenderMethodKey;
  label: string;
  precisionAt5: number;
  precisionAt10: number;
  recallAt5: number;
  recallAt10: number;
  ndcgAt5: number;
  ndcgAt10: number;
  hitRateAt5: number;
  hitRateAt10: number;
  mrr: number;
}

export interface RecommenderEvaluationResult {
  evaluatedAt: string;
  dataset: {
    totalRooms: number;
    /** Số người dùng thực sự được đánh giá (có tập kiểm tra) */
    totalUsers: number;
    usersTotal: number;
    totalInteractions: number;
    trainInteractions: number;
    /** Tương tác thuộc tập kiểm tra (ground truth) */
    groundTruthInteractions: number;
    relevantTestRooms: number;
  };
  protocol: OfflineEvaluation['protocol'];
  metrics: {
    precisionAt5: number;
    precisionAt10: number;
    recallAt5: number;
    recallAt10: number;
    ndcgAt5: number;
    ndcgAt10: number;
    hitRateAt5: number;
    hitRateAt10: number;
    mrr: number;
    /** null = chưa đo (chỉ đo khi bấm "Chạy đánh giá") */
    avgLatencyMs: number | null;
    p50LatencyMs: number | null;
    p95LatencyMs: number | null;
    latencySamples: number;
    latencyMeasuredAt: string | null;
    benchmarkExecutionTimeMs: number;
  };
  baselines: RecommenderMethodSummary[];
  thesisTargetCompliance: {
    precisionAt5: { target: string; actual: string; passed: boolean };
    ndcgAt5: { target: string; actual: string; passed: boolean };
    p95Latency: { target: string; actual: string; passed: boolean | null };
    dataSampleTarget: { target: string; actual: string; passed: boolean };
  };
}

const RECOMMENDER_EVAL_CACHE_MS = 10 * 60_000;
const LATENCY_SAMPLE_USERS = 30;
const METHOD_LABELS: Record<RecommenderMethodKey, string> = {
  hybrid: 'Hybrid (thuật toán của hệ thống)',
  ruleOnly: 'Chỉ Rule-Based (không dùng lịch sử)',
  popularity: 'Phổ biến nhất (baseline)',
  random: 'Ngẫu nhiên (baseline, giá trị kỳ vọng)',
};

let cachedRecommenderEval: { timestamp: number; result: RecommenderEvaluationResult } | null = null;
let lastLatencyMeasurement: {
  avg: number;
  p50: number;
  p95: number;
  samples: number;
  measuredAt: string;
} | null = null;

const pct = (value: number) => Number((value * 100).toFixed(2));
const ratio4 = (value: number) => Number(value.toFixed(4));

/** Percentile theo phương pháp nearest-rank. */
function percentile(sortedValues: number[], p: number) {
  if (sortedValues.length === 0) return 0;
  const rank = Math.max(1, Math.ceil((p / 100) * sortedValues.length));
  return sortedValues[Math.min(sortedValues.length, rank) - 1];
}

/**
 * Đánh giá thuật toán gợi ý trên dữ liệu trong CSDL.
 * - Độ chính xác: temporal hold-out 80/20, xem lib/recommender-eval.ts.
 * - Độ trễ (chỉ khi measureLatency): gọi đúng đường đi của API (getPersonalizedRecommendations)
 *   cho tối đa 30 người dùng có lịch sử, đo cả thời gian truy vấn CSDL. Đo p95 qua HTTP bằng
 *   scripts/benchmark-recommend-api.mjs.
 */
export async function evaluateRecommenderSystem(
  forceRefresh = false,
  options: { measureLatency?: boolean } = {}
): Promise<RecommenderEvaluationResult> {
  if (!forceRefresh && cachedRecommenderEval && Date.now() - cachedRecommenderEval.timestamp < RECOMMENDER_EVAL_CACHE_MS) {
    return cachedRecommenderEval.result;
  }

  const benchmarkStart = performance.now();

  const [rooms, users, interactions] = await Promise.all([
    prisma.room.findMany({
      select: recommendationSelect,
      orderBy: { id: 'asc' },
    }),
    prisma.user.findMany({
      where: { role: 'TENANT' },
      select: {
        id: true,
        budgetMax: true,
        preferredAmenities: true,
        targetLat: true,
        targetLng: true,
        maxRadiusKm: true,
      },
      orderBy: { id: 'asc' },
    }),
    prisma.interactionLog.findMany({
      select: { id: true, userId: true, roomId: true, action: true, timestamp: true },
    }),
  ]);

  // Hồ sơ nhu cầu giống hệt cách API /api/rooms/recommend dựng từ bảng users
  const evalUsers = users.map((u) => ({ id: u.id, preference: storedPreferenceToRequest(u) }));

  const offline = evaluateOffline({
    rooms,
    users: evalUsers,
    interactions: interactions.map((log) => ({
      id: log.id,
      userId: log.userId,
      roomId: log.roomId,
      action: String(log.action),
      timestamp: log.timestamp.getTime(),
    })),
    defaultPreference: DEFAULT_RECOMMENDER_PREFERENCE,
  });

  if (options.measureLatency) {
    const evaluatedIds = new Set(interactions.map((log) => log.userId));
    const sampleUsers = evalUsers.filter((u) => evaluatedIds.has(u.id)).slice(0, LATENCY_SAMPLE_USERS);
    const latencies: number[] = [];
    for (const u of sampleUsers) {
      // Đo đúng đường đi của API /api/rooms/recommend (đọc hồ sơ + dữ liệu phòng + xếp hạng)
      const t0 = performance.now();
      await getPersonalizedRecommendations({ userId: u.id, overrides: {}, k: 10 });
      latencies.push(performance.now() - t0);
    }
    if (latencies.length > 0) {
      const sorted = [...latencies].sort((a, b) => a - b);
      lastLatencyMeasurement = {
        avg: Number((sorted.reduce((acc, v) => acc + v, 0) / sorted.length).toFixed(2)),
        p50: Number(percentile(sorted, 50).toFixed(2)),
        p95: Number(percentile(sorted, 95).toFixed(2)),
        samples: sorted.length,
        measuredAt: new Date().toISOString(),
      };
    }
  }

  const summarize = (key: RecommenderMethodKey): RecommenderMethodSummary => {
    const m = offline.methods[key];
    return {
      key,
      label: METHOD_LABELS[key],
      precisionAt5: pct(m.precision[5]),
      precisionAt10: pct(m.precision[10]),
      recallAt5: pct(m.recall[5]),
      recallAt10: pct(m.recall[10]),
      ndcgAt5: ratio4(m.ndcg[5]),
      ndcgAt10: ratio4(m.ndcg[10]),
      hitRateAt5: pct(m.hitRate[5]),
      hitRateAt10: pct(m.hitRate[10]),
      mrr: ratio4(m.mrr),
    };
  };
  const hybrid = summarize('hybrid');
  const baselines = (['hybrid', 'ruleOnly', 'popularity', 'random'] as RecommenderMethodKey[]).map(summarize);

  const c = offline.counts;
  const dataWithinOutline =
    c.rooms >= 300 && c.rooms <= 500 &&
    c.usersWithInteractions >= 50 && c.usersWithInteractions <= 100 &&
    c.interactionsTotal >= 1000 && c.interactionsTotal <= 2000;
  const p95 = lastLatencyMeasurement?.p95 ?? null;

  const result: RecommenderEvaluationResult = {
    evaluatedAt: new Date().toISOString(),
    dataset: {
      totalRooms: c.rooms,
      totalUsers: c.usersEvaluated,
      usersTotal: c.usersTotal,
      totalInteractions: c.interactionsTotal,
      trainInteractions: c.trainInteractions,
      groundTruthInteractions: c.testInteractions,
      relevantTestRooms: c.relevantTestRooms,
    },
    protocol: offline.protocol,
    metrics: {
      precisionAt5: hybrid.precisionAt5,
      precisionAt10: hybrid.precisionAt10,
      recallAt5: hybrid.recallAt5,
      recallAt10: hybrid.recallAt10,
      ndcgAt5: hybrid.ndcgAt5,
      ndcgAt10: hybrid.ndcgAt10,
      hitRateAt5: hybrid.hitRateAt5,
      hitRateAt10: hybrid.hitRateAt10,
      mrr: hybrid.mrr,
      avgLatencyMs: lastLatencyMeasurement?.avg ?? null,
      p50LatencyMs: lastLatencyMeasurement?.p50 ?? null,
      p95LatencyMs: p95,
      latencySamples: lastLatencyMeasurement?.samples ?? 0,
      latencyMeasuredAt: lastLatencyMeasurement?.measuredAt ?? null,
      benchmarkExecutionTimeMs: Math.max(1, Math.round(performance.now() - benchmarkStart)),
    },
    baselines,
    thesisTargetCompliance: {
      precisionAt5: {
        target: '>= 70.0%',
        actual: `${hybrid.precisionAt5}%`,
        passed: hybrid.precisionAt5 >= 70,
      },
      ndcgAt5: {
        target: '>= 0.75',
        actual: `${hybrid.ndcgAt5}`,
        passed: hybrid.ndcgAt5 >= 0.75,
      },
      p95Latency: {
        target: '< 500ms',
        actual: p95 === null ? 'chưa đo' : `${p95}ms`,
        passed: p95 === null ? null : p95 < 500,
      },
      dataSampleTarget: {
        target: '300 – 500 phòng; 50 – 100 người dùng; 1.000 – 2.000 tương tác',
        actual: `${c.rooms} phòng; ${c.usersWithInteractions} người dùng có tương tác; ${c.interactionsTotal} tương tác`,
        passed: dataWithinOutline,
      },
    },
  };

  cachedRecommenderEval = { timestamp: Date.now(), result };
  return result;
}

export async function getAdminStats() {
  const [
    roomStatusGroups,
    districtStats,
    totalUsers,
    totalLandlords,
    appointmentStatusGroups,
    contractStatusGroups,
    totalBills,
    tracking,
    evalResult,
    listingCounts,
    activeContractRows,
  ] = await Promise.all([
    prisma.room.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.room.groupBy({
      by: ['district'],
      _count: { id: true },
      _avg: { price: true },
      _sum: { price: true },
    }),
    prisma.user.count(),
    prisma.landlord.count(),
    prisma.appointment.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.contract.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.utilityBill.count(),
    getRecommendationTrackingStats(),
    evaluateRecommenderSystem(false),
    countListingsByStatus(),
    // Doanh thu theo khu vực lấy từ hợp đồng đang hiệu lực (tiền thuê thật khách đã ký), không phải giá niêm yết
    prisma.contract.findMany({
      where: { status: 'ACTIVE' },
      select: { monthlyRent: true, room: { select: { district: true } } },
    }),
  ]);

  const contractRentByDistrict = new Map<string, { rentedRooms: number; contractRent: number }>();
  for (const row of activeContractRows) {
    const key = row.room?.district || 'Khác';
    const entry = contractRentByDistrict.get(key) || { rentedRooms: 0, contractRent: 0 };
    entry.rentedRooms += 1;
    entry.contractRent += row.monthlyRent || 0;
    contractRentByDistrict.set(key, entry);
  }

  let totalRooms = 0;
  let availableCount = 0;
  let bookedCount = 0;
  let reservedCount = 0;
  let rentedCount = 0;
  for (const g of roomStatusGroups) {
    totalRooms += g._count.id;
    if (g.status === 'AVAILABLE') availableCount = g._count.id;
    else if (g.status === 'BOOKED_VIEWING') bookedCount = g._count.id;
    else if (g.status === 'RESERVED') reservedCount = g._count.id;
    else if (g.status === 'RENTED') rentedCount = g._count.id;
  }

  let totalAppointments = 0;
  let activeAppointments = 0;
  for (const g of appointmentStatusGroups) {
    totalAppointments += g._count.id;
    if (g.status === 'PENDING' || g.status === 'CONFIRMED') {
      activeAppointments += g._count.id;
    }
  }

  let totalContracts = 0;
  let activeContracts = 0;
  for (const g of contractStatusGroups) {
    totalContracts += g._count.id;
    if (g.status === 'ACTIVE') {
      activeContracts += g._count.id;
    }
  }

  const { VIEW: viewInteractions, BOOKMARK: bookmarkInteractions, BOOK_VIEWING: bookingInteractions } =
    tracking.interactionCounts;
  const totalInteractions = viewInteractions + bookmarkInteractions + bookingInteractions;

  // Phòng được xem nhiều nhất (từ lượt VIEW thật của khách thuê)
  const topViewedRows = tracking.topViewedRooms.length
    ? await prisma.room.findMany({
        where: { id: { in: tracking.topViewedRooms.map((row) => row.roomId) } },
        select: { id: true, roomCode: true, title: true, district: true },
      })
    : [];
  const topViewedById = new Map(topViewedRows.map((row) => [row.id, row]));

  const occupancyRate = totalRooms > 0 ? (rentedCount / totalRooms) * 100 : 0;

  return {
    totalRooms,
    availableCount,
    bookedCount,
    reservedCount,
    rentedCount,
    occupancyRate: Number(occupancyRate.toFixed(1)),
    totalUsers,
    totalLandlords,
    totalAppointments,
    activeAppointments,
    totalContracts,
    activeContracts,
    totalBills,
    districtStats: districtStats
      .map((d) => ({
        district: d.district,
        count: d._count.id,
        avgPrice: Math.round(d._avg.price || 0),
        /** Số hợp đồng đang hiệu lực của các phòng trong khu vực */
        rentedRooms: contractRentByDistrict.get(d.district)?.rentedRooms ?? 0,
        /** Tổng tiền thuê / tháng theo các hợp đồng đang hiệu lực (chưa gồm điện nước, dịch vụ) */
        contractRent: contractRentByDistrict.get(d.district)?.contractRent ?? 0,
        /** Tổng giá niêm yết của mọi phòng, tức mức tối đa nếu cho thuê kín — chỉ để tham khảo */
        listedRent: d._sum.price || 0,
      }))
      .sort((a, b) => b.contractRent - a.contractRent || b.count - a.count),
    listingCounts,
    contractRentTotal: activeContractRows.reduce((sum, row) => sum + (row.monthlyRent || 0), 0),
    recommenderMetrics: {
      precisionAt5: evalResult.metrics.precisionAt5,
      ndcgAt5: evalResult.metrics.ndcgAt5,
      avgLatencyMs: evalResult.metrics.avgLatencyMs,
      p95LatencyMs: evalResult.metrics.p95LatencyMs,
      recallAt5: evalResult.metrics.recallAt5,
      hitRateAt10: evalResult.metrics.hitRateAt10,
      evaluatedUsers: evalResult.dataset.totalUsers,
      evaluatedAt: evalResult.evaluatedAt,
      totalInteractions,
      viewCount: viewInteractions,
      bookmarkCount: bookmarkInteractions,
      bookingInteractionCount: bookingInteractions,
      // Đo trên hành vi thật với danh sách gợi ý Top-K (lượt hiển thị → bấm → đặt lịch)
      trackingReady: tracking.ready,
      impressions: tracking.impressions,
      impressionItems: tracking.impressionItems,
      engagedItems: tracking.engagedItems,
      recommendationBookings: tracking.bookedItems,
      ctr: tracking.ctr,
      clickToBookRate: tracking.clickToBookRate,
      impressionToBookRate: tracking.impressionToBookRate,
      topViewedRooms: tracking.topViewedRooms.map((row) => ({
        roomId: row.roomId,
        views: row.views,
        roomCode: topViewedById.get(row.roomId)?.roomCode ?? `#${row.roomId}`,
        title: topViewedById.get(row.roomId)?.title ?? '',
        district: topViewedById.get(row.roomId)?.district ?? '',
      })),
    },
  };
}

export async function getUserById(userId: string): Promise<User | undefined> {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return undefined;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role as User['role'],
    preferences: u.budgetMax
      ? {
          budget_max: u.budgetMax,
          preferred_district: u.preferredDistrict || '',
          preferred_amenities: u.preferredAmenities,
          target_lat: u.targetLat || 10.8066,
          target_lng: u.targetLng || 106.6286,
          max_radius_km: u.maxRadiusKm || 5.0,
        }
      : undefined,
  };
}

export async function getAllUsers(): Promise<User[]> {
  const list = await prisma.user.findMany();
  return list.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role as User['role'],
    preferences: u.budgetMax
      ? {
          budget_max: u.budgetMax,
          preferred_district: u.preferredDistrict || '',
          preferred_amenities: u.preferredAmenities,
          target_lat: u.targetLat || 10.8066,
          target_lng: u.targetLng || 106.6286,
          max_radius_km: u.maxRadiusKm || 5.0,
        }
      : undefined,
  }));
}
