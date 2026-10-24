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
 */

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

function passesRoomTypeFilter(roomTypeRaw: string, requested?: string): boolean {
  if (!requested || requested === 'all') return true;
  const rt = requested.toLowerCase();
  const roomTypeLower = roomTypeRaw.toLowerCase();
  if (rt === 'gac_lung' && !roomTypeLower.includes('gác') && !roomTypeLower.includes('duplex')) return false;
  if (rt === 'studio' && (roomTypeLower.includes('gác') || roomTypeLower.includes('1') || roomTypeLower.includes('2'))) return false;
  if (rt === '1pn' && !roomTypeLower.includes('1') && !roomTypeLower.includes('1pn')) return false;
  if (rt === '2pn' && !roomTypeLower.includes('2') && !roomTypeLower.includes('2pn')) return false;
  return true;
}

/**
 * Lọc và chấm điểm toàn bộ phòng ứng viên cho một người dùng (chưa sắp xếp).
 * historyVector = null → chỉ dùng giai đoạn Rule-Based (cold-start).
 */
export function scoreRoomsForUser(
  rooms: RecommenderRoom[],
  pref: RecommenderPreference,
  historyVector: number[] | null,
  options: { excludeRoomIds?: Set<number>; petDescriptionIds?: Set<number> } = {}
): ScoredRoom[] {
  const scored: ScoredRoom[] = [];
  const hasLifestylePref = Boolean(pref.lifestyle && pref.lifestyle !== 'all');

  for (const room of rooms) {
    if (options.excludeRoomIds?.has(room.id)) continue;
    const roomTypeRaw = room.roomType || '';
    if (!passesRoomTypeFilter(roomTypeRaw, pref.room_type)) continue;

    // 1. Lọc cứng ngân sách & điểm ngân sách (1.0 khi rất rẻ so với ngân sách, 0.8 khi bằng ngân sách)
    if (pref.budget_max > 0 && room.price > pref.budget_max) continue;
    const priceScore = pref.budget_max > 0 ? 0.8 + 0.2 * (1 - room.price / pref.budget_max) : 1.0;

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
    if (historyVector) {
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
  options: { excludeRoomIds?: Set<number>; petDescriptionIds?: Set<number> } = {}
): number[] {
  return scoreRoomsForUser(rooms, pref, historyVector, options)
    .sort(compareByScore)
    .map((room) => room.id);
}
