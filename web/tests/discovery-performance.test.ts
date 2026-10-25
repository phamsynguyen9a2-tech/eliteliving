import assert from 'node:assert/strict';
import test from 'node:test';
import { createAsyncCache } from '../src/lib/async-cache';
import { mapBuildingSummary, type BuildingRoomAggregate } from '../src/lib/building-summary';
import { getTopKRecommendations, invalidateRoomsCache } from '../src/lib/db';
import prisma from '../src/lib/prisma';
import type { Prisma, Room } from '@prisma/client';

test('concurrent cold reads share work and TTL starts after the load completes', async () => {
  let now = 0;
  let calls = 0;
  let finish!: (value: number) => void;
  const cache = createAsyncCache<number>(20, () => now);
  const load = () => { calls++; return new Promise<number>((resolve) => { finish = resolve; }); };
  const first = cache.read(load);
  const second = cache.read(load);
  assert.equal(first, second);
  await Promise.resolve();
  now = 100;
  finish(7);
  assert.deepEqual(await Promise.all([first, second]), [7, 7]);
  now = 119;
  assert.equal(await cache.read(load), 7);
  assert.equal(calls, 1);
  now = 120;
  assert.equal(await cache.read(async () => 8), 8);
});

test('invalidation prevents a late response from repopulating the cache', async () => {
  let finish!: (value: string) => void;
  const cache = createAsyncCache<string>(20000);
  const old = cache.read(() => new Promise<string>((resolve) => { finish = resolve; }));
  await Promise.resolve();
  cache.invalidate();
  assert.equal(await cache.read(async () => 'fresh'), 'fresh');
  finish('stale');
  assert.equal(await old, 'stale');
  assert.equal(await cache.read(async () => 'wrong'), 'fresh');
});

test('a failed read is not retained and a retry can succeed', async () => {
  const cache = createAsyncCache<number>(20000);
  await assert.rejects(cache.read(async () => { throw new Error('offline'); }), /offline/);
  assert.equal(await cache.read(async () => 42), 42);
});

const project = {
  id: 1, slug: 'building-a', code: 'A', name: 'Tòa nhà A', address: 'TP.HCM', district: 'Quận 1',
  lat: 10.8, lng: 106.6, basePrice: 4000000, roomType: 'Studio', area: 25,
  images: ['building.jpg'], amenities: ['Wifi'], landlordId: 'owner', landlordName: 'Chủ trọ', landlordPhone: '0123',
  rooms: [{ distanceToHuitKm: 0, images: ['room.jpg'] }],
};
const aggregates: BuildingRoomAggregate[] = [
  { projectCode: 'A', status: 'AVAILABLE', _count: { _all: 2 }, _min: { price: 3000000 }, _max: { price: 4500000 } },
  { projectCode: 'A', status: 'BOOKED_VIEWING', _count: { _all: 1 }, _min: { price: 3500000 }, _max: { price: 3500000 } },
  { projectCode: 'A', status: 'RESERVED', _count: { _all: 1 }, _min: { price: 2500000 }, _max: { price: 2500000 } },
  { projectCode: 'A', status: 'RENTED', _count: { _all: 3 }, _min: { price: 5000000 }, _max: { price: 6000000 } },
  { projectCode: 'B', status: 'AVAILABLE', _count: { _all: 99 }, _min: { price: 1 }, _max: { price: 99999999 } },
];

test('summary preserves counts and price range including reserved/rented rooms without full room payload', () => {
  const result = mapBuildingSummary(project, aggregates, 5);
  assert.equal(result.total_rooms, 7);
  assert.equal(result.available_rooms, 2);
  assert.equal(result.booked_rooms, 1);
  assert.equal(result.rented_rooms, 3);
  assert.equal(result.min_price, 2500000);
  assert.equal(result.max_price, 6000000);
  assert.equal(result.base_price, result.min_price);
  assert.equal(result.featured_image, 'building.jpg');
  assert.equal(result.distance_to_huit_km, 0);
  assert.equal(result.rooms, undefined);
  assert.equal(result.landlord_phone, project.landlordPhone);
});

test('empty buildings retain base price and distance/image fallbacks', () => {
  const empty = mapBuildingSummary({ ...project, rooms: [], images: [] }, [], 3.5);
  assert.equal(empty.total_rooms, 0);
  assert.equal(empty.min_price, project.basePrice);
  assert.equal(empty.max_price, project.basePrice);
  assert.equal(empty.distance_to_huit_km, 3.5);
  assert.equal(empty.featured_image, '');
  const fallback = mapBuildingSummary({ ...project, images: [] }, aggregates, 3.5);
  assert.equal(fallback.featured_image, 'room.jpg');
});

test('cached rankings hydrate complete rooms and exclude rooms whose live status changed', async () => {
  const room = (id: number, price: number): Room => ({
    id, roomCode: `P${id}`, projectCode: 'A', projectName: 'Tòa A', floor: 1, unitNumber: id,
    hasBalcony: false, title: `Phòng ${id}`, price, deposit: price, area: 25, roomType: 'Studio',
    address: 'TP.HCM', district: 'Quận 1', latitude: 10.8, longitude: 106.6, distanceToHuitKm: 1,
    amenities: [], images: [`${id}.jpg`], status: 'AVAILABLE', landlordId: 'owner', landlordName: 'Chủ trọ',
    landlordPhone: '0123', electricityRate: 3800, waterRate: 25000, internetFee: 100000,
    serviceFee: 0, parkingFee: 100000, description: id === 1 ? 'Cho nuôi mèo' : 'Phòng yên tĩnh',
    listingStatus: 'APPROVED', moderationNote: null, submittedAt: null, moderatedAt: null,
  });
  const rooms = [room(1, 2000000), room(2, 1000000)];
  let catalogReads = 0;
  let liveStatusReads = 0;
  const originalFindMany = prisma.room.findMany;
  const findMany = async (args: Prisma.RoomFindManyArgs = {}) => {
    // 1. Danh mục phòng đầy đủ (được cache): không có điều kiện where
    if (!args.where) {
      catalogReads++;
      return rooms.map((item) => ({ ...item }));
    }
    assert.equal(args.where.status, 'AVAILABLE');
    // 2. Phòng có mô tả nhắc thú cưng
    if (args.where.OR) {
      return rooms
        .filter((item) => item.status === 'AVAILABLE' && item.description.includes('mèo'))
        .map(({ id }) => ({ id }));
    }
    // 3. Trạng thái trống đọc mới ở mỗi request
    liveStatusReads++;
    assert.deepEqual(args.select, { id: true });
    return rooms.filter((item) => item.status === 'AVAILABLE').map(({ id }) => ({ id }));
  };
  // Prisma's delegate is a Proxy without a regular method descriptor.
  // This isolated test uses ordinary promises in place of Prisma's generic lazy promise.
  prisma.room.findMany = findMany as unknown as typeof prisma.room.findMany;
  invalidateRoomsCache();
  try {
    const preference = { budget_max: 5000000, target_lat: 10.8, target_lng: 106.6, preferred_amenities: [], max_radius_km: 5 };
    const initial = await getTopKRecommendations(preference, 2);
    assert.deepEqual(initial.map((item) => item.id), [2, 1]);
    assert.deepEqual(initial[0].images, ['2.jpg']);
    assert.equal(initial[0].electricity_rate, 3800);
    assert.equal(initial[0].description, 'Phòng yên tĩnh');
    const pet = await getTopKRecommendations({ ...preference, lifestyle: 'pet' }, 2);
    assert.equal(pet[0].id, 1, 'description-only pet matches retain their ranking bonus');
    rooms[0].status = 'RESERVED';
    const current = await getTopKRecommendations(preference, 2);
    assert.deepEqual(current.map((item) => item.id), [2], 'a room reserved after caching is never recommended');
    assert.equal(catalogReads, 1, 'the room catalog is read once and cached');
    assert.equal(liveStatusReads, 3, 'live availability is read on every request');
  } finally {
    prisma.room.findMany = originalFindMany;
    invalidateRoomsCache();
  }
});
