/**
 * Đánh giá offline thuật toán gợi ý Top-K (hàm thuần, không truy cập CSDL).
 *
 * Phương pháp (temporal hold-out theo từng người dùng):
 * 1. Sắp tương tác của mỗi người dùng theo thời gian. 80% đầu = tập học (train),
 *    20% cuối = tập kiểm tra (test). Người có < 2 tương tác bị bỏ qua.
 * 2. Hồ sơ Content-Based chỉ dựng từ tập học. Thuật toán KHÔNG được thấy tập kiểm tra.
 * 3. Ground truth = các phòng người dùng tương tác trong tập kiểm tra mà chưa từng gặp
 *    trong tập học. Độ liên quan có mức: VIEW = 1, BOOKMARK = 2, BOOK_VIEWING = 3.
 * 4. Ứng viên = toàn bộ phòng trong CSDL trừ các phòng đã gặp trong tập học.
 *    Xếp hạng bằng đúng hàm của API (lib/recommender-core.ts).
 * 5. Độ đo chuẩn:
 *    Precision@K = số phòng đúng trong Top-K / K
 *    Recall@K    = số phòng đúng trong Top-K / tổng số phòng liên quan của người dùng
 *    NDCG@K      = DCG@K / IDCG@K, gain = 2^rel − 1
 *    HitRate@K   = tỉ lệ người dùng có ít nhất 1 phòng đúng trong Top-K
 *    MRR@10      = trung bình 1 / thứ hạng phòng đúng đầu tiên (trong Top-10)
 *    P@K chuẩn hóa = số phòng đúng trong Top-K / min(K, số phòng liên quan) — loại bỏ "trần" của P@K
 *                    khi người dùng có ít hơn K phòng liên quan (bằng 1 khi xếp hạng hoàn hảo).
 *    Mức dự án (độ đo PHỤ): gộp danh sách phòng thành danh sách dự án/tòa nhà theo thứ tự xuất hiện,
 *                    đáp án = các dự án chứa phòng liên quan; ProjectP@K và ProjectHit@K với K = 1, 3.
 *    Trần lý thuyết: trung bình min(K, G)/K — giá trị P@K lớn nhất mà BẤT KỲ thuật toán nào đạt được.
 * 6. So sánh với các phương pháp nền: Ngẫu nhiên (giá trị kỳ vọng tính giải tích),
 *    Phổ biến nhất (đếm trên tập học của mọi người dùng), Chỉ Rule-Based (không dùng lịch sử),
 *    và Hybrid v1 (công thức cũ 0,7·rule + 0,3·cosine, lọc cứng ngân sách) để đo đóng góp của cải tiến.
 *
 * File recommender/eval_metrics.py cài đặt lại đúng quy trình này bằng Python để
 * kiểm chứng chéo trên file seed_database_complete.json.
 */
import {
  buildUserHistoryLocations,
  buildUserHistoryVector,
  INTERACTION_WEIGHTS,
  rankRoomsForUser,
  SOFT_BUDGET_TOLERANCE,
  type RecommenderPreference,
  type RecommenderRoom,
} from './recommender-core';

export interface EvalUser {
  id: string;
  preference: RecommenderPreference | null;
}

export interface EvalInteraction {
  id: number;
  userId: string;
  roomId: number;
  action: string;
  /** epoch milliseconds */
  timestamp: number;
}

export type EvalMethod = 'hybrid' | 'hybridLegacy' | 'ruleOnly' | 'popularity' | 'random';

export interface MethodMetrics {
  precision: Record<string, number>;
  recall: Record<string, number>;
  ndcg: Record<string, number>;
  hitRate: Record<string, number>;
  mrr: number;
  /** Số phòng đúng trong Top-K / min(K, số phòng liên quan) */
  normalizedPrecision: Record<string, number>;
  /** Độ đo mức dự án / tòa nhà (null với baseline ngẫu nhiên — không có kỳ vọng giải tích gọn) */
  projectPrecision: Record<string, number> | null;
  projectHitRate: Record<string, number> | null;
}

export interface OfflineEvaluation {
  protocol: {
    name: string;
    trainRatio: number;
    ks: number[];
    relevance: string;
    candidates: string;
  };
  counts: {
    rooms: number;
    usersTotal: number;
    /** Người dùng có ít nhất 1 tương tác (người dùng mẫu của bộ dữ liệu) */
    usersWithInteractions: number;
    usersEvaluated: number;
    usersWithDefaultPreference: number;
    usersSkippedTooFewInteractions: number;
    usersSkippedNoNewTestRooms: number;
    interactionsTotal: number;
    trainInteractions: number;
    testInteractions: number;
    relevantTestRooms: number;
  };
  /** Giá trị lớn nhất có thể đạt (trung bình min(K, G)/K) của P@K và ProjectP@K */
  ceilings: {
    precision: Record<string, number>;
    projectPrecision: Record<string, number>;
  };
  methods: Record<EvalMethod, MethodMetrics>;
}

const DEFAULT_KS = [5, 10];
export const PROJECT_KS = [1, 3];
const MRR_CUTOFF = 10;

/** Khóa dự án của phòng; phòng không thuộc dự án nào được coi là một "dự án" riêng. */
export function projectKeyOf(room: { id: number; projectCode?: string | null } | undefined, id: number) {
  return room?.projectCode ? `p:${room.projectCode}` : `r:${id}`;
}

/** Gộp danh sách phòng đã xếp hạng thành danh sách dự án theo thứ tự xuất hiện đầu tiên. */
export function projectRanking(ranked: number[], projectOf: (id: number) => string) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ranked) {
    const key = projectOf(id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function gainOf(action: string) {
  return INTERACTION_WEIGHTS[action] ?? 1;
}

function dcgFromGains(gains: number[]) {
  return gains.reduce((acc, g, idx) => acc + (Math.pow(2, g) - 1) / Math.log2(idx + 2), 0);
}

/** Chia train/test theo thời gian cho một người dùng. */
export function temporalSplit<T extends { timestamp: number; id: number }>(logs: T[], trainRatio: number) {
  const sorted = [...logs].sort((a, b) => a.timestamp - b.timestamp || a.id - b.id);
  const cut = Math.max(1, Math.min(sorted.length - 1, Math.floor(sorted.length * trainRatio)));
  return { train: sorted.slice(0, cut), test: sorted.slice(cut) };
}

/**
 * Các độ đo cho MỘT danh sách xếp hạng.
 * projectOf (tùy chọn) → tính thêm độ đo mức dự án với PROJECT_KS.
 */
export function metricsForRanking(
  ranked: number[],
  gains: Map<number, number>,
  ks: number[],
  projectOf?: (id: number) => string
) {
  const ideal = Array.from(gains.values()).sort((a, b) => b - a);
  const out = {
    precision: {} as Record<string, number>,
    recall: {} as Record<string, number>,
    ndcg: {} as Record<string, number>,
    hitRate: {} as Record<string, number>,
    mrr: 0,
    normalizedPrecision: {} as Record<string, number>,
    projectPrecision: null as Record<string, number> | null,
    projectHitRate: null as Record<string, number> | null,
  };
  for (const k of ks) {
    const top = ranked.slice(0, k);
    const hits = top.filter((id) => gains.has(id)).length;
    out.precision[k] = hits / k;
    out.normalizedPrecision[k] = gains.size > 0 ? hits / Math.min(k, gains.size) : 0;
    out.recall[k] = gains.size > 0 ? hits / gains.size : 0;
    out.hitRate[k] = hits > 0 ? 1 : 0;
    const dcg = dcgFromGains(top.map((id) => gains.get(id) || 0));
    const idcg = dcgFromGains(ideal.slice(0, k));
    out.ndcg[k] = idcg > 0 ? dcg / idcg : 0;
  }
  const firstHit = ranked.slice(0, MRR_CUTOFF).findIndex((id) => gains.has(id));
  out.mrr = firstHit >= 0 ? 1 / (firstHit + 1) : 0;

  if (projectOf) {
    const relevantProjects = new Set(Array.from(gains.keys()).map(projectOf));
    const projects = projectRanking(ranked, projectOf);
    out.projectPrecision = {};
    out.projectHitRate = {};
    for (const k of PROJECT_KS) {
      const hits = projects.slice(0, k).filter((key) => relevantProjects.has(key)).length;
      out.projectPrecision[k] = hits / k;
      out.projectHitRate[k] = hits > 0 ? 1 : 0;
    }
  }
  return out;
}

/**
 * Giá trị kỳ vọng của các độ đo khi xếp hạng ngẫu nhiên đều trên N ứng viên
 * (tính giải tích, nên Python và TypeScript cho cùng một kết quả, không phụ thuộc seed).
 */
export function expectedRandomMetrics(candidateCount: number, gains: Map<number, number>, ks: number[]) {
  const N = candidateCount;
  const G = gains.size;
  const gainValues = Array.from(gains.values());
  const ideal = [...gainValues].sort((a, b) => b - a);
  const meanGain = N > 0 ? gainValues.reduce((acc, g) => acc + (Math.pow(2, g) - 1), 0) / N : 0;
  const out = {
    precision: {} as Record<string, number>,
    recall: {} as Record<string, number>,
    ndcg: {} as Record<string, number>,
    hitRate: {} as Record<string, number>,
    mrr: 0,
    normalizedPrecision: {} as Record<string, number>,
    projectPrecision: null as Record<string, number> | null,
    projectHitRate: null as Record<string, number> | null,
  };

  for (const k of ks) {
    const kk = Math.min(k, N);
    out.precision[k] = N > 0 ? (G / N) * (kk / k) : 0;
    // Kỳ vọng số phòng đúng = kk·G/N, chia cho min(K, G)
    out.normalizedPrecision[k] = N > 0 && G > 0 ? (kk * G) / N / Math.min(k, G) : 0;
    out.recall[k] = N > 0 ? kk / N : 0;
    // P(không trúng phòng nào trong kk vị trí đầu)
    let pMiss = 1;
    for (let i = 0; i < kk; i++) pMiss *= Math.max(0, N - G - i) / (N - i);
    out.hitRate[k] = 1 - pMiss;
    let expectedDcg = 0;
    for (let i = 0; i < kk; i++) expectedDcg += meanGain / Math.log2(i + 2);
    const idcg = dcgFromGains(ideal.slice(0, k));
    out.ndcg[k] = idcg > 0 ? expectedDcg / idcg : 0;
  }

  // E[1/rank của phòng đúng đầu tiên] trong MRR_CUTOFF vị trí đầu
  let pNoHitYet = 1;
  let mrr = 0;
  for (let i = 0; i < Math.min(MRR_CUTOFF, N); i++) {
    const pHitHere = pNoHitYet * (G / (N - i));
    mrr += pHitHere / (i + 1);
    pNoHitYet *= Math.max(0, N - G - i) / (N - i);
  }
  out.mrr = mrr;
  return out;
}

function zeroRecord(ks: number[]) {
  return Object.fromEntries(ks.map((k) => [k, 0])) as Record<string, number>;
}

function emptyAccumulator(ks: number[], withProject: boolean): MethodMetrics {
  return {
    precision: zeroRecord(ks),
    recall: zeroRecord(ks),
    ndcg: zeroRecord(ks),
    hitRate: zeroRecord(ks),
    mrr: 0,
    normalizedPrecision: zeroRecord(ks),
    projectPrecision: withProject ? zeroRecord(PROJECT_KS) : null,
    projectHitRate: withProject ? zeroRecord(PROJECT_KS) : null,
  };
}

function accumulate(acc: MethodMetrics, m: MethodMetrics, ks: number[]) {
  for (const k of ks) {
    acc.precision[k] += m.precision[k];
    acc.recall[k] += m.recall[k];
    acc.ndcg[k] += m.ndcg[k];
    acc.hitRate[k] += m.hitRate[k];
    acc.normalizedPrecision[k] += m.normalizedPrecision[k];
  }
  acc.mrr += m.mrr;
  if (acc.projectPrecision && acc.projectHitRate && m.projectPrecision && m.projectHitRate) {
    for (const k of PROJECT_KS) {
      acc.projectPrecision[k] += m.projectPrecision[k];
      acc.projectHitRate[k] += m.projectHitRate[k];
    }
  }
}

function averaged(acc: MethodMetrics, n: number, ks: number[]): MethodMetrics {
  const d = Math.max(n, 1);
  const pick = (rec: Record<string, number>, keys: number[] = ks) => Object.fromEntries(keys.map((k) => [k, rec[k] / d]));
  return {
    precision: pick(acc.precision),
    recall: pick(acc.recall),
    ndcg: pick(acc.ndcg),
    hitRate: pick(acc.hitRate),
    mrr: acc.mrr / d,
    normalizedPrecision: pick(acc.normalizedPrecision),
    projectPrecision: acc.projectPrecision ? pick(acc.projectPrecision, PROJECT_KS) : null,
    projectHitRate: acc.projectHitRate ? pick(acc.projectHitRate, PROJECT_KS) : null,
  };
}

export function evaluateOffline(input: {
  rooms: RecommenderRoom[];
  users: EvalUser[];
  interactions: EvalInteraction[];
  defaultPreference: RecommenderPreference;
  ks?: number[];
  trainRatio?: number;
}): OfflineEvaluation {
  const ks = input.ks ?? DEFAULT_KS;
  const trainRatio = input.trainRatio ?? 0.8;
  const rooms = [...input.rooms].sort((a, b) => a.id - b.id);
  const roomById = new Map(rooms.map((room) => [room.id, room]));

  const logsByUser = new Map<string, EvalInteraction[]>();
  for (const log of input.interactions) {
    if (!roomById.has(log.roomId)) continue;
    const list = logsByUser.get(log.userId) || [];
    list.push(log);
    logsByUser.set(log.userId, list);
  }

  // Bước 1: chia train/test cho từng người dùng
  const splits = new Map<string, { train: EvalInteraction[]; test: EvalInteraction[] }>();
  let usersSkippedTooFewInteractions = 0;
  for (const user of input.users) {
    const logs = logsByUser.get(user.id) || [];
    if (logs.length < 2) {
      usersSkippedTooFewInteractions++;
      continue;
    }
    splits.set(user.id, temporalSplit(logs, trainRatio));
  }

  // Độ phổ biến chỉ đếm trên tập học (không rò rỉ tập kiểm tra)
  const popularity = new Map<number, number>();
  splits.forEach(({ train }) => {
    for (const log of train) popularity.set(log.roomId, (popularity.get(log.roomId) || 0) + gainOf(log.action));
  });
  const popularityRanking = rooms
    .map((room) => ({ id: room.id, pop: popularity.get(room.id) || 0 }))
    .sort((a, b) => b.pop - a.pop || a.id - b.id)
    .map((item) => item.id);

  const acc: Record<EvalMethod, MethodMetrics> = {
    hybrid: emptyAccumulator(ks, true),
    hybridLegacy: emptyAccumulator(ks, true),
    ruleOnly: emptyAccumulator(ks, true),
    popularity: emptyAccumulator(ks, true),
    random: emptyAccumulator(ks, false),
  };
  const projectOf = (id: number) => projectKeyOf(roomById.get(id), id);
  const ceilingSum = { precision: zeroRecord(ks), projectPrecision: zeroRecord(PROJECT_KS) };

  let usersEvaluated = 0;
  let usersSkippedNoNewTestRooms = 0;
  let usersWithDefaultPreference = 0;
  let trainInteractions = 0;
  let testInteractions = 0;
  let relevantTestRooms = 0;

  for (const user of input.users) {
    const split = splits.get(user.id);
    if (!split) continue;
    trainInteractions += split.train.length;
    testInteractions += split.test.length;

    const seen = new Set(split.train.map((log) => log.roomId));
    const gains = new Map<number, number>();
    for (const log of split.test) {
      if (seen.has(log.roomId)) continue;
      gains.set(log.roomId, Math.max(gains.get(log.roomId) || 0, gainOf(log.action)));
    }
    if (gains.size === 0) {
      usersSkippedNoNewTestRooms++;
      continue;
    }

    usersEvaluated++;
    relevantTestRooms += gains.size;
    const pref = user.preference ?? input.defaultPreference;
    if (!user.preference) usersWithDefaultPreference++;

    // Lịch sử cho Content-Based: chỉ tập học, mới nhất trước (giống API: orderBy timestamp desc)
    const history = [...split.train]
      .sort((a, b) => b.timestamp - a.timestamp || b.id - a.id)
      .map((log) => ({ roomId: log.roomId, action: log.action }));
    const historyVector = buildUserHistoryVector(history, roomById);
    const historyLocations = historyVector ? buildUserHistoryLocations(history, roomById) : null;

    // Giống hệt cấu hình API (lib/db.ts → rankRecommendations)
    const hybridRanking = rankRoomsForUser(rooms, pref, historyVector, {
      excludeRoomIds: seen,
      historyLocations,
      budgetTolerance: historyVector ? SOFT_BUDGET_TOLERANCE : 0,
    });
    const legacyRanking = rankRoomsForUser(rooms, pref, historyVector, { excludeRoomIds: seen });
    const ruleRanking = rankRoomsForUser(rooms, pref, null, { excludeRoomIds: seen });
    const popRanking = popularityRanking.filter((id) => !seen.has(id));
    const candidateCount = rooms.length - seen.size;

    accumulate(acc.hybrid, metricsForRanking(hybridRanking, gains, ks, projectOf), ks);
    accumulate(acc.hybridLegacy, metricsForRanking(legacyRanking, gains, ks, projectOf), ks);
    accumulate(acc.ruleOnly, metricsForRanking(ruleRanking, gains, ks, projectOf), ks);
    accumulate(acc.popularity, metricsForRanking(popRanking, gains, ks, projectOf), ks);
    accumulate(acc.random, expectedRandomMetrics(candidateCount, gains, ks), ks);

    const relevantProjectCount = new Set(Array.from(gains.keys()).map(projectOf)).size;
    for (const k of ks) ceilingSum.precision[k] += Math.min(k, gains.size) / k;
    for (const k of PROJECT_KS) ceilingSum.projectPrecision[k] += Math.min(k, relevantProjectCount) / k;
  }
  const ceilingDenom = Math.max(usersEvaluated, 1);

  return {
    protocol: {
      name: 'Temporal hold-out theo từng người dùng (80% học / 20% kiểm tra)',
      trainRatio,
      ks,
      relevance: 'Phòng có tương tác trong tập kiểm tra và chưa gặp trong tập học; VIEW=1, BOOKMARK=2, BOOK_VIEWING=3',
      candidates: 'Toàn bộ phòng trong CSDL trừ phòng đã gặp trong tập học; xếp hạng bằng đúng hàm của API gợi ý',
    },
    counts: {
      rooms: rooms.length,
      usersTotal: input.users.length,
      usersWithInteractions: input.users.filter((user) => logsByUser.has(user.id)).length,
      usersEvaluated,
      usersWithDefaultPreference,
      usersSkippedTooFewInteractions,
      usersSkippedNoNewTestRooms,
      interactionsTotal: input.interactions.length,
      trainInteractions,
      testInteractions,
      relevantTestRooms,
    },
    ceilings: {
      precision: Object.fromEntries(ks.map((k) => [k, ceilingSum.precision[k] / ceilingDenom])),
      projectPrecision: Object.fromEntries(PROJECT_KS.map((k) => [k, ceilingSum.projectPrecision[k] / ceilingDenom])),
    },
    methods: {
      hybrid: averaged(acc.hybrid, usersEvaluated, ks),
      hybridLegacy: averaged(acc.hybridLegacy, usersEvaluated, ks),
      ruleOnly: averaged(acc.ruleOnly, usersEvaluated, ks),
      popularity: averaged(acc.popularity, usersEvaluated, ks),
      random: averaged(acc.random, usersEvaluated, ks),
    },
  };
}
