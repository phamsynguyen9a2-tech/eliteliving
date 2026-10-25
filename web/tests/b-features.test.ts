/**
 * Kiểm thử đơn vị cho các nghiệp vụ bổ sung theo đề cương (danh sách B):
 * đặt / đổi lịch xem phòng, lập hóa đơn (kể cả hàng loạt), kiểm duyệt tin, đánh giá,
 * thống kê tìm kiếm, hồ sơ nhu cầu, Top-K cá nhân hóa, thanh toán mô phỏng, đồng bộ thời gian thực, FCM.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { checkViewingSlot } from '../src/lib/viewing-slot';
import { computeBill, parseInitialReadings } from '../src/lib/billing';
import { runListingChecks, listingContentChanged } from '../src/lib/listing-checks';
import { maskReviewerName, validateReviewInput, summarize } from '../src/lib/review-rules';
import { shouldLogSearch, normalizeDistrictLabel } from '../src/lib/search-log';
import { validatePreferenceInput } from '../src/lib/preferences';
import { generateSimulatedTransactionCode, isSimulatedTransactionCode } from '../src/lib/simulated-payment';
import { shouldDeliver } from '../src/lib/realtime-bus';
import { buildServiceAccountJwt, getFirebaseConfig } from '../src/lib/push';
import {
  buildUserHistoryVector,
  rankRoomsForUser,
  scoreRoomsForUser,
  type RecommenderRoom,
} from '../src/lib/recommender-core';

const expectCode = (fn: () => unknown, code: string) =>
  assert.throws(fn, (err: unknown) => err instanceof Error && err.message.startsWith(`${code}:`));

// ------------------------------------------------------------
// Đặt lịch / đổi lịch xem phòng
// ------------------------------------------------------------
const availability = {
  available_days: ['T2', 'T3', 'T4', 'T5', 'T6'],
  slots: [
    { timeSlot: '08:00 - 09:00', enabled: true },
    { timeSlot: '14:00 - 15:00', enabled: true },
    { timeSlot: '19:00 - 20:00', enabled: false },
  ],
  notice_hours: 2,
} as any;
// Thứ Hai 05/10/2026, 10:00 sáng
const now = new Date(2026, 9, 5, 10, 0);

test('đặt lịch: ngày sai định dạng, ngày đã qua hoặc ngày không tồn tại bị từ chối', () => {
  for (const date of ['05/10/2026', '2026-10-04', '2026-02-30', '', null]) {
    assert.equal(checkViewingSlot(date, '08:00 - 09:00', availability, now).ok, false, String(date));
  }
});

test('đặt lịch: khung giờ phải hợp lệ và nằm trong khung chủ trọ mở', () => {
  assert.equal(checkViewingSlot('2026-10-06', '9h - 10h', availability, now).ok, false);
  assert.equal(checkViewingSlot('2026-10-06', '10:00 - 09:00', availability, now).ok, false);
  assert.equal(checkViewingSlot('2026-10-06', '10:00 - 11:00', availability, now).ok, false);
  // Khung 19h đã bị chủ trọ tắt
  assert.equal(checkViewingSlot('2026-10-06', '19:00 - 20:00', availability, now).ok, false);
  const ok = checkViewingSlot('2026-10-06', '14:00 - 15:00', availability, now);
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.slotStart, 14 * 60);
});

test('đặt lịch: ngày chủ trọ không đón khách bị từ chối', () => {
  // 10/10/2026 là Thứ Bảy
  const res = checkViewingSlot('2026-10-10', '08:00 - 09:00', availability, now);
  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.message, /T7/);
});

test('đặt lịch trong ngày phải báo trước đủ số giờ chủ trọ yêu cầu', () => {
  // 10:00 đặt khung 08:00 hôm nay → quá giờ; khung 14:00 còn 4 giờ ≥ 2 giờ → hợp lệ
  assert.equal(checkViewingSlot('2026-10-05', '08:00 - 09:00', availability, now).ok, false);
  assert.equal(checkViewingSlot('2026-10-05', '14:00 - 15:00', availability, now).ok, true);
  const tight = { ...availability, notice_hours: 5 };
  assert.equal(checkViewingSlot('2026-10-05', '14:00 - 15:00', tight, now).ok, false);
});

test('đặt lịch: chủ trọ chưa cấu hình khung giờ thì chỉ kiểm tra định dạng', () => {
  assert.equal(checkViewingSlot('2026-10-10', '19:30 - 20:30', null, now).ok, true);
});

// ------------------------------------------------------------
// Hóa đơn: tính tiền ở máy chủ
// ------------------------------------------------------------
const rates = { electricityRate: 3800, waterRate: 25000, internetFee: 100000, serviceFee: 150000, rent: 3_500_000 };

test('hóa đơn: tiền = tiền thuê hợp đồng + điện + nước + internet + dịch vụ', () => {
  const bill = computeBill({ electricOld: 120, electricNew: 245, waterOld: 15, waterNew: 22 }, rates);
  assert.equal(bill.electricUsed, 125);
  assert.equal(bill.electricCost, 475_000);
  assert.equal(bill.waterUsed, 7);
  assert.equal(bill.waterCost, 175_000);
  assert.equal(bill.rentCost, 3_500_000);
  assert.equal(bill.totalAmount, 3_500_000 + 475_000 + 175_000 + 100_000 + 150_000);
});

test('hóa đơn: chỉ số số thực không bị sai số dấu phẩy động', () => {
  const bill = computeBill({ electricOld: 100.1, electricNew: 100.3, waterOld: 0, waterNew: 0 }, rates);
  assert.equal(bill.electricUsed, 0.2);
  assert.equal(bill.electricCost, 760);
});

test('hóa đơn: chỉ số mới nhỏ hơn cũ, số âm hoặc không phải số bị từ chối', () => {
  expectCode(() => computeBill({ electricOld: 200, electricNew: 150, waterOld: 1, waterNew: 2 }, rates), 'INVALID_READING');
  expectCode(() => computeBill({ electricOld: 1, electricNew: 2, waterOld: 9, waterNew: 3 }, rates), 'INVALID_READING');
  expectCode(() => computeBill({ electricOld: -1, electricNew: 2, waterOld: 1, waterNew: 2 }, rates), 'INVALID_READING');
  expectCode(() => computeBill({ electricOld: NaN, electricNew: 2, waterOld: 1, waterNew: 2 }, rates), 'INVALID_READING');
});

test('lập hóa đơn hàng loạt: chỉ số đầu kỳ đọc từ biên bản nhận phòng', () => {
  assert.deepEqual(
    parseInitialReadings('Bàn giao đủ chìa khóa. Chỉ số điện ban đầu: 120 kWh. Chỉ số nước ban đầu: 15,5 m³.'),
    { electric: 120, water: 15.5 }
  );
  assert.deepEqual(parseInitialReadings(null), { electric: undefined, water: undefined });
});

// ------------------------------------------------------------
// Kiểm duyệt tin đăng
// ------------------------------------------------------------
const goodListing = {
  title: 'Phòng trọ cao cấp gần ĐH Công Thương',
  price: 3_500_000,
  deposit: 3_500_000,
  area: 25,
  latitude: 10.8064,
  longitude: 106.6283,
  address: '140 Lê Trọng Tấn, Tây Thạnh',
  district: 'Tân Phú',
  amenities: ['Wifi', 'Máy lạnh'],
  images: ['https://example.com/a.jpg'],
};

test('kiểm duyệt: tin đầy đủ vượt qua cả 6 tiêu chí', () => {
  const checks = runListingChecks(goodListing);
  assert.equal(checks.length, 6);
  assert.ok(checks.every((c) => c.ok), JSON.stringify(checks.filter((c) => !c.ok)));
});

test('kiểm duyệt: phát hiện tọa độ ngoài TP.HCM, giá / diện tích bất thường, thiếu ảnh', () => {
  const failed = (input: object) => runListingChecks({ ...goodListing, ...input }).filter((c) => !c.ok).map((c) => c.key);
  assert.deepEqual(failed({ latitude: 21.03, longitude: 105.85 }), ['location']);
  assert.deepEqual(failed({ price: 100_000 }), ['price']);
  assert.deepEqual(failed({ deposit: 50_000_000 }), ['price']);
  assert.deepEqual(failed({ area: 3 }), ['area']);
  assert.deepEqual(failed({ images: ['anh.jpg'] }), ['images']);
  assert.deepEqual(failed({ amenities: ['Wifi'] }), ['amenities']);
  assert.deepEqual(failed({ title: 'Phòng' }), ['info']);
  // Ảnh tải lên dạng data URL vẫn được tính
  assert.deepEqual(failed({ images: ['data:image/png;base64,AAAA'] }), []);
});

test('kiểm duyệt: chủ trọ sửa nội dung tin thì phải duyệt lại, đổi trạng thái thì không', () => {
  const existing = { title: 'Phòng A', price: 3_000_000, amenities: ['Wifi', 'Máy lạnh'], description: null };
  assert.equal(listingContentChanged(existing, { status: 'RENTED' }), false);
  assert.equal(listingContentChanged(existing, { price: '3000000', amenities: ['Wifi', ' Máy lạnh '] }), false);
  assert.equal(listingContentChanged(existing, { description: '' }), false);
  assert.equal(listingContentChanged(existing, { price: 3_200_000 }), true);
  assert.equal(listingContentChanged(existing, { title: 'Phòng A mới' }), true);
  assert.equal(listingContentChanged(existing, { amenities: ['Wifi'] }), true);
  assert.equal(listingContentChanged(existing, { images: ['https://example.com/x.jpg'] }), true);
});

// ------------------------------------------------------------
// Đánh giá phòng
// ------------------------------------------------------------
test('đánh giá: số sao 1–5, đánh giá thấp phải có mô tả', () => {
  assert.deepEqual(validateReviewInput({ rating: 5, comment: '  Phòng sạch  ' }), { rating: 5, comment: 'Phòng sạch' });
  assert.deepEqual(validateReviewInput({ rating: '4', comment: undefined }), { rating: 4, comment: '' });
  for (const rating of [0, 6, 3.5, 'abc', null]) {
    expectCode(() => validateReviewInput({ rating, comment: 'Bình thường' }), 'INVALID_REVIEW');
  }
  expectCode(() => validateReviewInput({ rating: 1, comment: 'Tệ' }), 'INVALID_REVIEW');
  assert.equal(validateReviewInput({ rating: 2, comment: 'Nước yếu vào buổi tối' }).rating, 2);
  expectCode(() => validateReviewInput({ rating: 5, comment: 'x'.repeat(1001) }), 'INVALID_REVIEW');
});

test('đánh giá: ẩn họ tên người thuê và tổng hợp điểm trung bình', () => {
  assert.equal(maskReviewerName('Phạm Sỹ Nguyên'), 'Nguyên P.');
  assert.equal(maskReviewerName('Nguyên'), 'Nguyên');
  assert.equal(maskReviewerName(''), 'Người thuê');
  assert.deepEqual(summarize([5, 4, 4, 1]), { average: 3.5, count: 4, distribution: [1, 0, 0, 2, 1] });
  assert.deepEqual(summarize([]), { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] });
});

// ------------------------------------------------------------
// Thống kê nhu cầu tìm kiếm
// ------------------------------------------------------------
test('nhật ký tìm kiếm: chỉ ghi lượt có tiêu chí ở trang đầu', () => {
  assert.equal(shouldLogSearch({}), false);
  assert.equal(shouldLogSearch({ district: 'all' }), false);
  assert.equal(shouldLogSearch({ district: 'Tân Phú', page: 2 }), false);
  assert.equal(shouldLogSearch({ district: 'Tân Phú' }), true);
  assert.equal(shouldLogSearch({ keyword: 'gần HUIT' }), true);
  assert.equal(shouldLogSearch({ maxPrice: 4_000_000 }), true);
  assert.equal(shouldLogSearch({ amenities: ['Wifi'] }), true);
  assert.equal(shouldLogSearch({ source: 'MOBILE_NEARBY' }), true);
});

test('nhật ký tìm kiếm: gộp các cách viết tên quận', () => {
  assert.equal(normalizeDistrictLabel('tân phú'), 'Quận Tân Phú');
  assert.equal(normalizeDistrictLabel('Quận Tân Phú'), 'Quận Tân Phú');
  assert.equal(normalizeDistrictLabel('7'), 'Quận 7');
  assert.equal(normalizeDistrictLabel('thủ đức'), 'TP. Thủ Đức');
  assert.equal(normalizeDistrictLabel('all'), null);
  assert.equal(normalizeDistrictLabel(''), null);
});

// ------------------------------------------------------------
// Hồ sơ nhu cầu người thuê (đầu vào Top-K)
// ------------------------------------------------------------
test('hồ sơ nhu cầu: chuẩn hóa dữ liệu hợp lệ', () => {
  const p = validatePreferenceInput({
    budget_max: '4000000.4',
    max_radius_km: 3.14,
    target_lat: 10.80641234,
    target_lng: 106.62834567,
    preferred_amenities: ['Wifi', ' Wifi ', '', 'Máy lạnh'],
    preferred_district: '  Tân Phú ',
  });
  assert.deepEqual(p, {
    budget_max: 4_000_000,
    max_radius_km: 3.1,
    target_lat: 10.806412,
    target_lng: 106.628346,
    preferred_amenities: ['Wifi', 'Máy lạnh'],
    preferred_district: 'Tân Phú',
  });
});

test('hồ sơ nhu cầu: ngân sách, bán kính, tọa độ sai bị từ chối', () => {
  const base = { budget_max: 4_000_000, max_radius_km: 5 };
  expectCode(() => validatePreferenceInput({ ...base, budget_max: 100 }), 'INVALID_PREFERENCE');
  expectCode(() => validatePreferenceInput({ ...base, budget_max: undefined }), 'INVALID_PREFERENCE');
  expectCode(() => validatePreferenceInput({ ...base, max_radius_km: 100 }), 'INVALID_PREFERENCE');
  expectCode(() => validatePreferenceInput({ ...base, target_lat: 10.8 }), 'INVALID_PREFERENCE');
  expectCode(() => validatePreferenceInput({ ...base, target_lat: 48.85, target_lng: 2.35 }), 'INVALID_PREFERENCE');
  assert.equal(validatePreferenceInput(base).target_lat, null);
});

// ------------------------------------------------------------
// Thanh toán mô phỏng
// ------------------------------------------------------------
test('thanh toán mô phỏng: mã giao dịch có tiền tố SIM để phân biệt với mã ngân hàng', () => {
  const code = generateSimulatedTransactionCode('HD', new Date(2026, 9, 5, 9, 7));
  assert.match(code, /^SIM-HD-2610050907-[0-9A-Z]{4}$/);
  assert.match(generateSimulatedTransactionCode('COC'), /^SIM-COC-\d{10}-[0-9A-Z]{4}$/);
  assert.equal(isSimulatedTransactionCode(code), true);
  assert.equal(isSimulatedTransactionCode('FT26278123456'), false);
  assert.equal(isSimulatedTransactionCode(null), false);
});

// ------------------------------------------------------------
// Đồng bộ thời gian thực: ai được nhận sự kiện nào
// ------------------------------------------------------------
test('real-time: sự kiện chỉ tới đúng người liên quan', () => {
  const admin = { id: 'a1', role: 'ADMIN' as const };
  const landlord = { id: 'll1', role: 'LANDLORD' as const };
  const tenant = { id: 'u1', role: 'TENANT' as const, roomIds: new Set([7]) };
  const stranger = { id: 'u2', role: 'TENANT' as const, roomIds: new Set<number>() };

  const roomEvent = { type: 'room' as const, roomId: 7, landlordId: 'll1' };
  for (const viewer of [admin, landlord, tenant, stranger, null]) assert.equal(shouldDeliver(roomEvent, viewer), true);

  const bill = { type: 'bill' as const, roomId: 7, landlordId: 'll1' };
  assert.equal(shouldDeliver(bill, admin), true);
  assert.equal(shouldDeliver(bill, landlord), true);
  assert.equal(shouldDeliver(bill, { id: 'll2', role: 'LANDLORD' }), false);
  assert.equal(shouldDeliver(bill, tenant), true);
  assert.equal(shouldDeliver(bill, stranger), false);
  assert.equal(shouldDeliver(bill, null), false);

  const notif = { type: 'notification' as const, userId: 'u2' };
  assert.equal(shouldDeliver(notif, stranger), true);
  assert.equal(shouldDeliver(notif, tenant), false);
});

// ------------------------------------------------------------
// Thông báo đẩy FCM
// ------------------------------------------------------------
test('FCM: chưa cấu hình thì tắt; JWT tài khoản dịch vụ ký RS256 hợp lệ', () => {
  assert.equal(getFirebaseConfig({} as unknown as NodeJS.ProcessEnv), null);
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const config = getFirebaseConfig({
    FIREBASE_PROJECT_ID: 'elite-living',
    FIREBASE_CLIENT_EMAIL: 'push@elite-living.iam.gserviceaccount.com',
    // Khóa trong .env thường viết trên một dòng với "\n"
    FIREBASE_PRIVATE_KEY: pem.replace(/\n/g, '\\n'),
  } as unknown as NodeJS.ProcessEnv);
  assert.ok(config);

  const jwt = buildServiceAccountJwt(config!, 1_800_000_000);
  const [header, claims, signature] = jwt.split('.');
  const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  assert.deepEqual(decode(header), { alg: 'RS256', typ: 'JWT' });
  const body = decode(claims);
  assert.equal(body.iss, 'push@elite-living.iam.gserviceaccount.com');
  assert.equal(body.scope, 'https://www.googleapis.com/auth/firebase.messaging');
  assert.equal(body.exp - body.iat, 3600);
  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${header}.${claims}`);
  assert.equal(verifier.verify(publicKey, Buffer.from(signature, 'base64url')), true);
});

// ------------------------------------------------------------
// Top-K gợi ý cá nhân hóa
// ------------------------------------------------------------
const HUIT = { lat: 10.8066, lng: 106.6286 };
const topkRoom = (id: number, price: number, km: number, amenities: string[], extra: Partial<RecommenderRoom> = {}): RecommenderRoom => ({
  id, price, area: 25, latitude: HUIT.lat + km * 0.009, longitude: HUIT.lng, amenities, hasBalcony: false, roomType: 'Studio', ...extra,
});
const topkPref = { budget_max: 5_000_000, target_lat: HUIT.lat, target_lng: HUIT.lng, preferred_amenities: ['Máy lạnh', 'Wifi'], max_radius_km: 5 };

test('Top-K: phòng rẻ hơn, gần hơn, đủ tiện ích xếp trên; điểm nằm trong [0, 1]', () => {
  const rooms = [
    topkRoom(1, 4_800_000, 4, ['Wifi']),
    topkRoom(2, 3_000_000, 0.5, ['Máy lạnh', 'Wifi']),
    topkRoom(3, 3_000_000, 3, ['Máy lạnh', 'Wifi']),
  ];
  assert.deepEqual(rankRoomsForUser(rooms, topkPref, null), [2, 3, 1]);
  for (const r of scoreRoomsForUser(rooms, topkPref, null)) assert.ok(r.score >= 0 && r.score <= 1);
});

test('Top-K: lịch sử xem / lưu / đặt lịch làm thay đổi thứ hạng (cá nhân hóa theo hành vi)', () => {
  // Hai phòng gần như ngang điểm luật; người dùng hay xem các phòng có gác và giặt sấy
  const loft = topkRoom(10, 3_500_000, 1, ['Máy lạnh', 'Wifi', 'Gác lửng', 'Máy giặt'], { area: 30 });
  const plain = topkRoom(11, 3_400_000, 1, ['Máy lạnh', 'Wifi']);
  const history = [
    topkRoom(20, 3_600_000, 2, ['Gác lửng', 'Máy giặt', 'Máy lạnh'], { area: 30 }),
    topkRoom(21, 3_700_000, 2, ['Gác lửng', 'Máy giặt'], { area: 32 }),
  ];
  const lookup = new Map(history.map((r) => [r.id, r]));
  const vector = buildUserHistoryVector([{ roomId: 20, action: 'BOOK_VIEWING' }, { roomId: 21, action: 'BOOKMARK' }], lookup);
  assert.ok(vector);
  assert.deepEqual(rankRoomsForUser([plain, loft], topkPref, null), [11, 10]);
  assert.deepEqual(rankRoomsForUser([plain, loft], topkPref, vector), [10, 11]);
  // Không có tương tác hợp lệ → quay về cold-start
  assert.equal(buildUserHistoryVector([], lookup), null);
  assert.equal(buildUserHistoryVector([{ roomId: 999, action: 'VIEW' }], lookup), null);
});

test('Top-K: bỏ phòng đã loại trừ và lọc phòng không cho nuôi thú cưng khi chọn lối sống "pet"', () => {
  const rooms = [topkRoom(1, 3_000_000, 1, ['Wifi', 'Cho nuôi thú cưng']), topkRoom(2, 3_000_000, 1, ['Wifi'])];
  assert.deepEqual(rankRoomsForUser(rooms, { ...topkPref, lifestyle: 'pet' }, null), [1]);
  assert.deepEqual(rankRoomsForUser(rooms, { ...topkPref, lifestyle: 'pet' }, null, { petDescriptionIds: new Set([2]) }), [1, 2]);
  assert.deepEqual(rankRoomsForUser(rooms, topkPref, null, { excludeRoomIds: new Set([1]) }), [2]);
});
