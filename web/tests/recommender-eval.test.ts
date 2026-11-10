import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildUserHistoryLocations,
  buildUserHistoryVector,
  computeHistoryLocationAffinity,
  rankRoomsForUser,
  scoreRoomsForUser,
  type RecommenderRoom,
} from '../src/lib/recommender-core';
import {
  evaluateOffline,
  expectedRandomMetrics,
  metricsForRanking,
  projectRanking,
  temporalSplit,
} from '../src/lib/recommender-eval';

const HUIT = { lat: 10.8066, lng: 106.6286 };

function room(id: number, price: number, offsetKm = 0, amenities: string[] = ['Máy lạnh', 'Wifi']): RecommenderRoom {
  // ~0,009 độ vĩ ≈ 1 km
  return { id, price, area: 25, latitude: HUIT.lat + offsetKm * 0.009, longitude: HUIT.lng, amenities, hasBalcony: false, roomType: 'Studio' };
}

const pref = {
  budget_max: 5_000_000,
  target_lat: HUIT.lat,
  target_lng: HUIT.lng,
  preferred_amenities: ['Máy lạnh', 'Wifi'],
  max_radius_km: 3,
};

test('lọc cứng: phòng vượt ngân sách hoặc ngoài bán kính không bao giờ được gợi ý', () => {
  const rooms = [room(1, 4_000_000, 1), room(2, 6_000_000, 1), room(3, 4_000_000, 5)];
  const ids = scoreRoomsForUser(rooms, pref, null).map((r) => r.id);
  assert.deepEqual(ids, [1]);
});

test('Precision, Recall (chia cho tổng số phòng liên quan) và NDCG tính đúng', () => {
  const gains = new Map([[2, 3], [9, 1]]);
  const m = metricsForRanking([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], gains, [5, 10]);
  assert.equal(m.precision[5], 1 / 5);
  assert.equal(m.recall[5], 1 / 2);
  assert.equal(m.recall[10], 1);
  assert.equal(m.hitRate[5], 1);
  assert.equal(m.mrr, 1 / 2);
  const dcg5 = (2 ** 3 - 1) / Math.log2(3);
  const idcg5 = (2 ** 3 - 1) / Math.log2(2) + (2 ** 1 - 1) / Math.log2(3);
  assert.ok(Math.abs(m.ndcg[5] - dcg5 / idcg5) < 1e-12);
});

test('baseline ngẫu nhiên dùng giá trị kỳ vọng giải tích', () => {
  const m = expectedRandomMetrics(10, new Map([[1, 1]]), [5]);
  assert.ok(Math.abs(m.precision[5] - 0.1) < 1e-12);
  assert.ok(Math.abs(m.hitRate[5] - 0.5) < 1e-12);
  const harmonic10 = Array.from({ length: 10 }, (_, i) => 1 / (i + 1)).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(m.mrr - harmonic10 / 10) < 1e-12);
});

test('chia train/test theo thời gian: tương tác mới nhất luôn nằm ở tập kiểm tra', () => {
  const logs = [5, 1, 4, 2, 3].map((t) => ({ id: t, timestamp: t * 1000 }));
  const { train, test: testLogs } = temporalSplit(logs, 0.8);
  assert.deepEqual(train.map((l) => l.id), [1, 2, 3, 4]);
  assert.deepEqual(testLogs.map((l) => l.id), [5]);
});

test('không rò rỉ đáp án: đổi phòng trong tập kiểm tra không làm đổi thứ hạng của thuật toán', () => {
  const rooms = Array.from({ length: 30 }, (_, i) => room(i + 1, 3_000_000 + i * 50_000, (i % 10) * 0.25));
  const users = [{ id: 'u1', preference: pref }];
  const train = [1, 2, 3, 4].map((roomId, i) => ({ id: i + 1, userId: 'u1', roomId, action: 'VIEW', timestamp: (i + 1) * 1000 }));
  const run = (testRoomId: number) =>
    evaluateOffline({
      rooms,
      users,
      interactions: [...train, { id: 99, userId: 'u1', roomId: testRoomId, action: 'BOOK_VIEWING', timestamp: 99_000 }],
      defaultPreference: pref,
    });

  // Thứ hạng mà thuật toán tạo ra chỉ phụ thuộc tập học
  const ranking = rankRoomsForUser(rooms, pref, null, { excludeRoomIds: new Set([1, 2, 3, 4]) });
  const topRoom = ranking[0];
  const lastRoom = ranking[ranking.length - 1];

  const hitTop = run(topRoom);
  const hitLast = run(lastRoom);
  assert.equal(hitTop.counts.usersEvaluated, 1);
  assert.equal(hitTop.counts.trainInteractions, 4);
  assert.equal(hitTop.methods.ruleOnly.hitRate[5], 1, 'phòng đứng đầu bảng xếp hạng phải được tính là trúng');
  assert.equal(hitLast.methods.ruleOnly.hitRate[10], 0, 'phòng xếp cuối không được "tự nhiên" lọt vào Top-10');
});

test('nới ngân sách mềm: chỉ khi truyền budgetTolerance, phòng vượt ngân sách bị trừ điểm', () => {
  const rooms = [room(1, 4_000_000, 1), room(2, 5_500_000, 1), room(3, 6_500_000, 1)];
  // Mặc định vẫn lọc cứng
  assert.deepEqual(scoreRoomsForUser(rooms, pref, null).map((r) => r.id), [1]);
  const soft = scoreRoomsForUser(rooms, pref, null, { budgetTolerance: 0.2 });
  assert.deepEqual(soft.map((r) => r.id), [1, 2], 'phòng vượt quá +20% vẫn bị loại');
  assert.ok(soft[0].score > soft[1].score, 'phòng trong ngân sách phải được điểm cao hơn');
});

test('vị trí lịch sử: phòng cùng tòa với phòng đã quan tâm được xếp trên', () => {
  const seenRoom = room(10, 4_000_000, 2);
  const sameBuilding = room(11, 4_000_000, 2); // cùng tọa độ với phòng đã xem
  const nearTarget = room(12, 4_000_000, 1); // gần điểm đích hơn nhưng xa lịch sử
  const lookup = new Map([[10, seenRoom]]);
  const logs = [{ roomId: 10, action: 'BOOK_VIEWING' }];
  const vector = buildUserHistoryVector(logs, lookup);
  const locations = buildUserHistoryLocations(logs, lookup);
  assert.ok(locations && locations.length === 1 && locations[0].weight === 3);
  assert.ok(Math.abs(computeHistoryLocationAffinity(locations!, sameBuilding) - 1) < 1e-12);
  assert.deepEqual(rankRoomsForUser([nearTarget, sameBuilding], pref, vector), [12, 11]);
  assert.deepEqual(rankRoomsForUser([nearTarget, sameBuilding], pref, vector, { historyLocations: locations }), [11, 12]);
  assert.equal(buildUserHistoryLocations([{ roomId: 999, action: 'VIEW' }], lookup), null);
});

test('P@K chuẩn hóa và độ đo mức dự án', () => {
  const gains = new Map([[2, 1], [7, 1]]);
  const projectOf = (id: number) => (id <= 3 ? 'A' : id <= 6 ? 'B' : 'C');
  const m = metricsForRanking([1, 2, 4, 5, 6, 7, 8], gains, [5], projectOf);
  assert.equal(m.precision[5], 1 / 5);
  assert.equal(m.normalizedPrecision[5], 1 / 2, 'chia cho min(5, 2)');
  assert.deepEqual(projectRanking([1, 2, 4, 5, 6, 7, 8], projectOf), ['A', 'B', 'C']);
  assert.equal(m.projectPrecision?.[1], 1);
  assert.equal(m.projectPrecision?.[3], 2 / 3);
  assert.equal(m.projectHitRate?.[1], 1);
  const r = expectedRandomMetrics(10, new Map([[1, 1]]), [5]);
  assert.ok(Math.abs(r.normalizedPrecision[5] - 0.5) < 1e-12);
  assert.equal(r.projectPrecision, null);
});

test('đánh giá offline báo cáo trần lý thuyết min(K, G)/K', () => {
  const rooms = Array.from({ length: 20 }, (_, i) => room(i + 1, 3_000_000 + i * 50_000, (i % 5) * 0.4));
  const logs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((roomId, i) => ({ id: i + 1, userId: 'u1', roomId, action: 'VIEW', timestamp: (i + 1) * 1000 }));
  const out = evaluateOffline({ rooms, users: [{ id: 'u1', preference: pref }], interactions: logs, defaultPreference: pref });
  // 10 tương tác → 2 phòng kiểm tra → P@5 tối đa = 2/5
  assert.ok(Math.abs(out.ceilings.precision[5] - 2 / 5) < 1e-12);
  assert.ok(out.methods.hybridLegacy, 'phải có phương pháp đối chứng Hybrid v1');
});
