/**
 * Lõi thuật toán gợi ý Top-K (hàm thuần, không truy cập CSDL).
 *
 * Dùng chung cho:
 * - API gợi ý thật: getTopKRecommendations (lib/db.ts)
 * - Đánh giá offline: lib/recommender-eval.ts (và bản Python recommender/eval_metrics.py
 *   cài đặt lại đúng các công thức này)
 *
 * Nhờ vậy số đo Precision/NDCG phản ánh đúng thuật toán đang chạy trên web.
 *
 * Giai đoạn 1 — Weighted Rule-Based (cold-start):
 *   Lọc cứng phòng vượt ngân sách / ngoài bán kính, rồi
 *   Score_rule = 0.40·S_budget + 0.35·S_distance(Haversine) + 0.25·S_amenities(Cosine)
 * Giai đoạn 2 — Content-Based (khi có lịch sử tương tác):
 *   Score = 0.70·Score_rule + 0.30·Cosine(Vector_u, Vector_r)
 *   Vector_u = trung bình có trọng số (VIEW=1, BOOKMARK=2, BOOK_VIEWING=3) của vector các phòng đã tương tác.
 * Giai đoạn 2+ — Content-Based + Vị trí lịch sử (khi truyền options.historyLocations):
 *   Score = 0.20·Score_rule + 0.30·Cosine(Vector_u, Vector_r) + 0.50·S_location
 *   S_location = Σ w_i·exp(−d(r, phòng_i) / 0,1 km) / Σ w_i, với phòng_i là phòng đã tương tác
 *   (Haversine) — phòng cùng tòa / sát vách các phòng người dùng đã quan tâm được ưu tiên.
 *   Ngân sách được nới mềm tới +20% (options.budgetTolerance), phòng vượt ngân sách bị trừ điểm dần.
 *   Trọng số chọn trên tập validation tách từ tập học (không dùng tập kiểm tra).
 */
import { matchesRoomTypeFilter } from './room-type';

export const CANONICAL_AMENITY_KEYS = [
  'máy lạnh',
  'wc riêng',
  'gác',
  'kệ bếp',
  'tủ lạnh',
  'máy giặt',
  'ban công',
  'vân tay',
  'giờ giấc tự do',
  'thang máy',
  'giữ xe',
  'wifi',
] as const;

export const INTERACTION_WEIGHTS: Record<string, number> = {
  VIEW: 1.0,
  BOOKMARK: 2.0,
  BOOK_VIEWING: 3.0,
};

export const RULE_WEIGHTS = { price: 0.4, distance: 0.35, amenity: 0.25 } as const;
export const HYBRID_WEIGHTS = { rule: 0.7, history: 0.3 } as const;
/** Trọng số khi có thêm tín hiệu vị trí lịch sử (chọn bằng validation tách từ tập học). */
export const HYBRID_LOCATION_WEIGHTS = { rule: 0.2, history: 0.3, location: 0.5 } as const;
/** Thang khoảng cách (km) của kernel vị trí: ~0,1 km ≈ cùng tòa / cùng dãy trọ. */
export const HISTORY_LOCATION_SCALE_KM = 0.1;
/** Mức nới ngân sách mềm dùng ở giai đoạn có lịch sử (+20%). */
export const SOFT_BUDGET_TOLERANCE = 0.2;
/** Số tương tác gần nhất dùng để dựng hồ sơ người dùng (giống truy vấn take: 40 của API). */
export const HISTORY_WINDOW = 40;

export interface RecommenderRoom {
  id: number;
  price: number;
  area: number;
  latitude: number;
  longitude: number;
  amenities: string[];
  hasBalcony?: boolean | null;
  roomType?: string | null;
  /** Mã dự án / tòa nhà (chỉ dùng cho độ đo mức dự án khi đánh giá offline). */
  projectCode?: string | null;
}

/** Vị trí một phòng đã tương tác, kèm tổng trọng số hành vi trên phòng đó. */
export interface HistoryLocation {
  latitude: number;
  longitude: number;
  weight: number;
}

export interface RecommenderPreference {
  budget_max: number;
  target_lat: number;
  target_lng: number;
  preferred_amenities: string[];
  max_radius_km: number;
  lifestyle?: string;
  room_type?: string;
}

export interface HistoryLog {
  roomId: number;
  action: string;
}

export interface ScoredRoom {
  id: number;
  score: number;
  distanceKm: number;
}

export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Cosine = tích vô hướng / (chuẩn Euclid của A × chuẩn Euclid của B). */
export function computeDotProductCosine(vecA: number[], vecB: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    const a = vecA[i] || 0;
    const b = vecB[i] || 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }
  if (normA <= 0 || normB <= 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Vector đặc trưng phòng: [giá chuẩn hóa, diện tích chuẩn hóa, ban công, 12 bit tiện ích]. */
export function buildRoomContentVector(room: RecommenderRoom): number[] {
  const amenLower = room.amenities.map((a) => a.toLowerCase());
  const priceNorm = Math.min(1, Math.max(0, room.price / 10000000));
  const areaNorm = Math.min(1, Math.max(0, room.area / 50));
  const balconyBit = room.hasBalcony ? 1 : 0;
  const amenityBits = CANONICAL_AMENITY_KEYS.map((key) =>
    amenLower.some((a) => a.includes(key)) ? 1 : 0
  );
  return [priceNorm, areaNorm, balconyBit, ...amenityBits];
}

/**
 * Vector hồ sơ người dùng từ lịch sử tương tác (đã sắp mới nhất trước).
 * Chỉ dùng HISTORY_WINDOW tương tác đầu; phòng không có trong roomLookup bị bỏ qua.
 */
export function buildUserHistoryVector(
  logs: HistoryLog[],
  roomLookup: Map<number, RecommenderRoom>
): number[] | null {
  if (logs.length === 0) return null;
  const dim = 3 + CANONICAL_AMENITY_KEYS.length;
  const accVec = new Array<number>(dim).fill(0);
  let totalWeight = 0;

  for (const log of logs.slice(0, HISTORY_WINDOW)) {
    const interactedRoom = roomLookup.get(log.roomId);
    if (!interactedRoom) continue;
    const weight = INTERACTION_WEIGHTS[log.action] ?? 1.0;
    const rVec = buildRoomContentVector(interactedRoom);
    for (let i = 0; i < dim; i++) {
      accVec[i] += rVec[i] * weight;
    }
    totalWeight += weight;
  }

  return totalWeight > 0 ? accVec.map((v) => v / totalWeight) : null;
}

/**
 * Vị trí các phòng đã tương tác (cùng cửa sổ HISTORY_WINDOW với buildUserHistoryVector),
 * gộp theo phòng và cộng trọng số hành vi. Trả về null khi không có tương tác hợp lệ.
 */
export function buildUserHistoryLocations(
  logs: HistoryLog[],
  roomLookup: Map<number, RecommenderRoom>
): HistoryLocation[] | null {
  const byRoom = new Map<number, HistoryLocation>();
  for (const log of logs.slice(0, HISTORY_WINDOW)) {
    const room = roomLookup.get(log.roomId);
    if (!room) continue;
    const weight = INTERACTION_WEIGHTS[log.action] ?? 1.0;
    const existing = byRoom.get(room.id);
    if (existing) existing.weight += weight;
    else byRoom.set(room.id, { latitude: room.latitude, longitude: room.longitude, weight });
  }
  return byRoom.size > 0 ? Array.from(byRoom.values()) : null;
}

/** S_location ∈ [0, 1]: độ gần (kernel mũ theo Haversine) tới các phòng đã tương tác, có trọng số. */
export function computeHistoryLocationAffinity(
  locations: HistoryLocation[],
  room: { latitude: number; longitude: number },
  scaleKm: number = HISTORY_LOCATION_SCALE_KM
): number {
  let acc = 0;
  let total = 0;
  for (const loc of locations) {
    const d = calculateHaversineDistance(loc.latitude, loc.longitude, room.latitude, room.longitude);
    acc += loc.weight * Math.exp(-d / scaleKm);
    total += loc.weight;
  }
  return total > 0 ? acc / total : 0;
}

function passesRoomTypeFilter(roomTypeRaw: string, requested?: string): boolean {
  if (!requested || requested === 'all') return true;
  return matchesRoomTypeFilter(roomTypeRaw, requested);
}

/**
 * Lọc và chấm điểm toàn bộ phòng ứng viên cho một người dùng (chưa sắp xếp).
 * historyVector = null → chỉ dùng giai đoạn Rule-Based (cold-start).
 * options.historyLocations → bật thêm tín hiệu vị trí lịch sử (HYBRID_LOCATION_WEIGHTS).
 * options.budgetTolerance (mặc định 0 = lọc cứng) → cho phép phòng vượt ngân sách tới tỉ lệ này.
 */
export function scoreRoomsForUser(
  rooms: RecommenderRoom[],
  pref: RecommenderPreference,
  historyVector: number[] | null,
  options: {
    excludeRoomIds?: Set<number>;
    petDescriptionIds?: Set<number>;
    historyLocations?: HistoryLocation[] | null;
    budgetTolerance?: number;
  } = {}
): ScoredRoom[] {
  const scored: ScoredRoom[] = [];
  const hasLifestylePref = Boolean(pref.lifestyle && pref.lifestyle !== 'all');
  const budgetTolerance = Math.max(0, options.budgetTolerance ?? 0);
  const historyLocations = options.historyLocations && options.historyLocations.length > 0 ? options.historyLocations : null;

  for (const room of rooms) {
    if (options.excludeRoomIds?.has(room.id)) continue;
    const roomTypeRaw = room.roomType || '';
    if (!passesRoomTypeFilter(roomTypeRaw, pref.room_type)) continue;

    // 1. Lọc ngân sách & điểm ngân sách (1.0 khi rất rẻ so với ngân sách, 0.8 khi bằng ngân sách).
    //    Mặc định lọc cứng; khi có budgetTolerance thì phòng vượt ngân sách bị trừ điểm dần (0.6 ở mức +20%).
    if (pref.budget_max > 0 && room.price > pref.budget_max * (1 + budgetTolerance)) continue;
    const budgetRatio = pref.budget_max > 0 ? room.price / pref.budget_max : 0;
    const priceScore =
      pref.budget_max <= 0 ? 1.0 : budgetRatio <= 1 ? 0.8 + 0.2 * (1 - budgetRatio) : 0.8 - (budgetRatio - 1);

    // 2. Lọc cứng bán kính & điểm khoảng cách (Haversine)
    const distanceKm = calculateHaversineDistance(pref.target_lat, pref.target_lng, room.latitude, room.longitude);
    if (pref.max_radius_km > 0 && distanceKm > pref.max_radius_km) continue;
    const distanceScore = Math.max(0, 1 - distanceKm / Math.max(1, pref.max_radius_km));

    // 3. Lối sống (nếu người dùng chọn) & Cosine tiện ích
    const amenLower = room.amenities.map((a) => a.toLowerCase());
    let lifestyleAffinity = 1.0;
    if (pref.lifestyle === 'student') {
      let pts = 0;
      if (room.price <= 4500000) pts += 0.4;
      if (amenLower.some((a) => a.includes('gác'))) pts += 0.3;
      if (distanceKm <= 2.5) pts += 0.3;
      lifestyleAffinity = Math.max(0.4, pts);
    } else if (pref.lifestyle === 'office') {
      let pts = 0;
      if (amenLower.some((a) => a.includes('máy lạnh'))) pts += 0.4;
      if (amenLower.some((a) => a.includes('giặt') || a.includes('bếp'))) pts += 0.35;
      if (room.hasBalcony) pts += 0.25;
      lifestyleAffinity = Math.max(0.4, pts);
    } else if (pref.lifestyle === 'couple') {
      let pts = 0;
      if (room.area >= 28) pts += 0.55;
      const rt = roomTypeRaw.toLowerCase();
      if (rt.includes('1') || rt.includes('2') || rt.includes('duplex')) pts += 0.45;
      lifestyleAffinity = Math.max(0.4, pts);
    } else if (pref.lifestyle === 'pet') {
      const hasPet =
        amenLower.some((a) => a.includes('thú cưng') || a.includes('nuôi thú') || a.includes('pet')) ||
        Boolean(options.petDescriptionIds?.has(room.id));
      if (!hasPet) continue;
      lifestyleAffinity = 1.0;
    } else if (pref.lifestyle === 'balcony') {
      const hasBalcony = room.hasBalcony || amenLower.some((a) => a.includes('ban công') || a.includes('cửa sổ'));
      if (!hasBalcony) continue;
      lifestyleAffinity = 1.0;
    } else if (pref.lifestyle === 'flexible') {
      lifestyleAffinity = amenLower.some((a) => a.includes('tự do') || a.includes('vân tay')) ? 1.0 : 0.5;
    }

    let amenityCosine = 1.0;
    if (pref.preferred_amenities.length > 0) {
      // Vector sở thích nhị phân (toàn 1) so với vector khớp tiện ích của phòng
      const userAmenityVec = pref.preferred_amenities.map(() => 1);
      const roomAmenityVec = pref.preferred_amenities.map((wanted) =>
        amenLower.some((ra) => ra.includes(wanted.toLowerCase())) ? 1 : 0
      );
      amenityCosine = computeDotProductCosine(userAmenityVec, roomAmenityVec);
    }
    const amenityScore = hasLifestylePref ? 0.7 * amenityCosine + 0.3 * lifestyleAffinity : amenityCosine;

    const ruleScore =
      RULE_WEIGHTS.price * priceScore + RULE_WEIGHTS.distance * distanceScore + RULE_WEIGHTS.amenity * amenityScore;

    let rawScore = ruleScore;
    if (historyVector && historyLocations) {
      const historyCosine = computeDotProductCosine(historyVector, buildRoomContentVector(room));
      const locationAffinity = computeHistoryLocationAffinity(historyLocations, room);
      rawScore =
        HYBRID_LOCATION_WEIGHTS.rule * ruleScore +
        HYBRID_LOCATION_WEIGHTS.history * historyCosine +
        HYBRID_LOCATION_WEIGHTS.location * locationAffinity;
    } else if (historyVector) {
      const historyCosine = computeDotProductCosine(historyVector, buildRoomContentVector(room));
      rawScore = HYBRID_WEIGHTS.rule * ruleScore + HYBRID_WEIGHTS.history * historyCosine;
    }

    scored.push({
      id: room.id,
      score: Math.min(1, Math.max(0, Number(rawScore.toFixed(4)))),
      distanceKm,
    });
  }

  return scored;
}

/** Thứ tự xếp hạng mặc định ("smart"): điểm giảm dần, hòa điểm thì mã phòng tăng dần. */
export function compareByScore(a: { id: number; score?: number }, b: { id: number; score?: number }) {
  return (b.score || 0) - (a.score || 0) || a.id - b.id;
}

/** Danh sách mã phòng đã xếp hạng (dùng cho đánh giá offline). */
export function rankRoomsForUser(
  rooms: RecommenderRoom[],
  pref: RecommenderPreference,
  historyVector: number[] | null,
  options: Parameters<typeof scoreRoomsForUser>[3] = {}
): number[] {
  return scoreRoomsForUser(rooms, pref, historyVector, options)
    .sort(compareByScore)
    .map((room) => room.id);
}
