/**
 * Thuật toán Roommate Matching — Tính Compatibility Score
 *
 * Score = w1 × GenderMatch
 *       + w2 × HabitsSimilarity (Jaccard Index)
 *       + w3 × LifestyleMatch
 *       + w4 × BudgetMatch
 *       + w5 × LocationProximity
 *
 * Kết quả: Score ∈ [0, 1] → hiển thị dạng phần trăm
 */

// Trọng số mặc định
const WEIGHTS = {
  gender: 0.25,
  habits: 0.30,
  lifestyle: 0.15,
  budget: 0.20,
  location: 0.10,
};

interface MatchProfile {
  gender: string;
  habits: string[];
  lifestyle?: string;
  budget?: number;
  lat?: number;
  lng?: number;
  petFriendly?: boolean;
  smokingStatus?: boolean;
}

interface MatchPost {
  genderPreference: string;
  requiredHabits: string[];
  sharedRent: number;
  latitude?: number;
  longitude?: number;
}

/**
 * Tính Jaccard Similarity giữa hai tập hợp
 */
function jaccardSimilarity(setA: string[], setB: string[]): number {
  if (setA.length === 0 && setB.length === 0) return 1;
  const a = new Set(setA.map((s) => s.toLowerCase().trim()));
  const b = new Set(setB.map((s) => s.toLowerCase().trim()));
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Tính khoảng cách Haversine giữa 2 tọa độ (km)
 */
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Tính Compatibility Score giữa một người dùng (profile) và một bài ở ghép (post)
 * @returns score ∈ [0, 1]
 */
export function calculateCompatibility(
  profile: MatchProfile,
  post: MatchPost
): number {
  // 1. Gender Match (0 hoặc 1)
  let genderScore = 1;
  if (
    post.genderPreference !== "Không yêu cầu" &&
    post.genderPreference !== profile.gender
  ) {
    genderScore = 0;
  }

  // 2. Habits Similarity (Jaccard)
  const habitsScore = jaccardSimilarity(profile.habits, post.requiredHabits);

  // 3. Lifestyle Match
  // Nếu không có thông tin → 0.5 (trung tính)
  const lifestyleScore = profile.lifestyle ? 0.7 : 0.5;

  // 4. Budget Match — so sánh ngân sách vs giá chia
  let budgetScore = 0.5;
  if (profile.budget && post.sharedRent > 0) {
    const ratio = profile.budget / post.sharedRent;
    if (ratio >= 1.0) budgetScore = 1.0;       // Đủ hoặc dư ngân sách
    else if (ratio >= 0.8) budgetScore = 0.8;    // Hơi thiếu
    else if (ratio >= 0.6) budgetScore = 0.5;    // Thiếu khá nhiều
    else budgetScore = 0.2;                       // Quá chênh lệch
  }

  // 5. Location Proximity
  let locationScore = 0.5;
  if (
    profile.lat && profile.lng &&
    post.latitude && post.longitude
  ) {
    const dist = haversineDistance(
      profile.lat, profile.lng,
      post.latitude, post.longitude
    );
    // Gần <= 2km → 1.0, 2-5km → 0.7, 5-10km → 0.4, >10km → 0.1
    if (dist <= 2) locationScore = 1.0;
    else if (dist <= 5) locationScore = 0.7;
    else if (dist <= 10) locationScore = 0.4;
    else locationScore = 0.1;
  }

  // Tổng hợp
  const score =
    WEIGHTS.gender * genderScore +
    WEIGHTS.habits * habitsScore +
    WEIGHTS.lifestyle * lifestyleScore +
    WEIGHTS.budget * budgetScore +
    WEIGHTS.location * locationScore;

  // Bonus: Pet & Smoking compatibility (±0.05 mỗi yếu tố)
  // Giả sử bài ở ghép yêu cầu "Không thú cưng" hoặc "Không hút thuốc" qua requiredHabits
  let bonus = 0;
  const hasNoPet = post.requiredHabits.some(h =>
    h.toLowerCase().includes("không thú cưng") || h.toLowerCase().includes("no pet")
  );
  const hasNoSmoke = post.requiredHabits.some(h =>
    h.toLowerCase().includes("không hút thuốc") || h.toLowerCase().includes("no smoking")
  );

  if (hasNoPet && !profile.petFriendly) bonus += 0.03;
  if (hasNoPet && profile.petFriendly) bonus -= 0.05;
  if (hasNoSmoke && !profile.smokingStatus) bonus += 0.03;
  if (hasNoSmoke && profile.smokingStatus) bonus -= 0.05;

  return Math.max(0, Math.min(1, score + bonus));
}

/**
 * Sắp xếp danh sách bài ở ghép theo compatibility score (giảm dần)
 * Trả về Top-K bài phù hợp nhất
 */
export function rankRoommatePosts<T extends { score: number }>(
  posts: T[],
  topK: number = 10
): T[] {
  return posts
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
