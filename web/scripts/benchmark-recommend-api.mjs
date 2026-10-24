/**
 * Đo độ trễ API gợi ý Top-K qua HTTP thật (tiêu chí đề cương: p95 < 500 ms).
 *
 * Cách chạy (máy chủ phải đang chạy, ví dụ `npm run dev` hoặc `npm run build && npm start`):
 *   node scripts/benchmark-recommend-api.mjs
 *   node scripts/benchmark-recommend-api.mjs --base http://localhost:3000 --requests 200 --concurrency 4
 *
 * Mỗi request dùng một hồ sơ nhu cầu khác nhau (ngân sách, vị trí, bán kính, tiện ích) để không
 * chỉ đo một truy vấn lặp lại. 5 request đầu là khởi động (warm-up) và không tính vào kết quả.
 * Lưu ý: chạy bằng `npm run dev` sẽ chậm hơn production; số liệu báo cáo nên đo trên bản build.
 */
const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, value, index, all) => {
    if (value.startsWith('--')) pairs.push([value.slice(2), all[index + 1]]);
    return pairs;
  }, [])
);

const BASE_URL = (args.base || 'http://localhost:3000').replace(/\/$/, '');
const TOTAL = Number(args.requests || 200);
const CONCURRENCY = Math.max(1, Number(args.concurrency || 1));
const WARMUP = 5;

const TARGETS = [
  { lat: 10.8066, lng: 106.6286 }, // HUIT
  { lat: 10.8015, lng: 106.654 },
  { lat: 10.785, lng: 106.61 },
];
const BUDGETS = [3500000, 4500000, 5500000, 7000000];
const RADII = [3, 4.5, 6];
const AMENITY_SETS = ['Máy lạnh,Gác lửng,Wifi', 'Máy lạnh,Kệ bếp,Wifi,Máy giặt', 'Ban công,Thang máy'];

function buildUrl(i) {
  const target = TARGETS[i % TARGETS.length];
  const params = new URLSearchParams({
    k: '10',
    budget: String(BUDGETS[i % BUDGETS.length]),
    lat: String(target.lat),
    lng: String(target.lng),
    radius: String(RADII[i % RADII.length]),
    amenities: AMENITY_SETS[i % AMENITY_SETS.length],
  });
  return `${BASE_URL}/api/rooms/recommend?${params}`;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[Math.min(sorted.length, rank) - 1];
}

async function timedRequest(i) {
  const t0 = performance.now();
  const res = await fetch(buildUrl(i));
  await res.arrayBuffer();
  const ms = performance.now() - t0;
  if (!res.ok) throw new Error(`HTTP ${res.status} tại request ${i}`);
  return ms;
}

async function main() {
  console.log(`Đo ${TOTAL} request tới ${BASE_URL}/api/rooms/recommend (đồng thời ${CONCURRENCY}, warm-up ${WARMUP})...`);
  for (let i = 0; i < WARMUP; i++) await timedRequest(i);

  const latencies = [];
  let next = 0;
  async function worker() {
    while (next < TOTAL) {
      const i = next++;
      latencies.push(await timedRequest(i + WARMUP));
    }
  }
  const started = performance.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const elapsed = performance.now() - started;

  const sorted = [...latencies].sort((a, b) => a - b);
  const avg = sorted.reduce((acc, v) => acc + v, 0) / sorted.length;
  const p95 = percentile(sorted, 95);
  const summary = {
    requests: sorted.length,
    concurrency: CONCURRENCY,
    avgMs: Number(avg.toFixed(2)),
    p50Ms: Number(percentile(sorted, 50).toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
    p99Ms: Number(percentile(sorted, 99).toFixed(2)),
    maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
    throughputRps: Number((sorted.length / (elapsed / 1000)).toFixed(1)),
    targetP95Ms: 500,
    passed: p95 < 500,
  };
  console.table(summary);
  console.log(summary.passed ? 'ĐẠT: p95 < 500 ms' : 'CHƯA ĐẠT: p95 >= 500 ms');
}

main().catch((err) => {
  console.error('Không đo được:', err.message);
  console.error('Kiểm tra máy chủ đã chạy chưa (npm run dev) và địa chỉ --base.');
  process.exit(1);
});
