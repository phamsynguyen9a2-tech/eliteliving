import { PrismaClient, RoomStatus, UserRole, InteractionAction } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Load JSON data
  const dataPath = path.join(__dirname, '..', 'src', 'data', 'rooms_data.json');
  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const { landlords, projects, rooms, users, interactions } = rawData;

  // ============================================================
  // 1. Seed Landlords
  // ============================================================
  console.log(`📌 Seeding ${landlords.length} landlords...`);
  await prisma.landlord.createMany({
    data: landlords.map((l: any) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      email: l.email,
      role: l.role || 'LANDLORD',
      avatar: l.avatar || '',
    })),
    skipDuplicates: true,
  });
  console.log('✅ Landlords seeded');

  // ============================================================
  // 2. Seed Projects (Buildings)
  // ============================================================
  console.log(`📌 Seeding ${projects.length} projects...`);
  await prisma.project.createMany({
    data: projects.map((p: any) => ({
      slug: p.slug,
      code: p.code,
      name: p.name,
      address: p.address,
      district: p.district || 'Quận Tân Phú',
      lat: p.lat,
      lng: p.lng,
      basePrice: p.base_price,
      roomType: p.room_type,
      area: p.area,
      amenities: p.amenities || [],
      images: p.images || [],
      landlordId: p.landlord_id,
      landlordName: p.landlord_name,
      landlordPhone: p.landlord_phone,
    })),
    skipDuplicates: true,
  });
  console.log('✅ Projects seeded');

  // ============================================================
  // 3. Seed Rooms
  // ============================================================
  console.log(`📌 Seeding ${rooms.length} rooms...`);
  const ROOM_BATCH_SIZE = 200;
  for (let i = 0; i < rooms.length; i += ROOM_BATCH_SIZE) {
    const batch = rooms.slice(i, i + ROOM_BATCH_SIZE);
    await prisma.room.createMany({
      data: batch.map((r: any) => ({
        id: r.id,
        roomCode: r.room_code,
        projectCode: r.project_code || null,
        projectName: r.project_name || null,
        floor: r.floor ?? null,
        unitNumber: r.unit_number ?? null,
        hasBalcony: r.has_balcony ?? null,
        title: r.title,
        price: r.price,
        deposit: r.deposit,
        area: r.area,
        roomType: r.room_type,
        address: r.address,
        district: r.district,
        latitude: r.latitude,
        longitude: r.longitude,
        distanceToHuitKm: r.distance_to_huit_km ?? null,
        amenities: r.amenities || [],
        images: r.images || [],
        status: (r.status as RoomStatus) || 'AVAILABLE',
        landlordId: r.landlord_id,
        landlordName: r.landlord_name,
        landlordPhone: r.landlord_phone,
        electricityRate: r.electricity_rate || 0,
        waterRate: r.water_rate || 0,
        internetFee: r.internet_fee || 0,
        serviceFee: r.service_fee || 0,
        parkingFee: r.parking_fee || 0,
        description: r.description || '',
      })),
      skipDuplicates: true,
    });
    console.log(`  ✅ Rooms ${i + 1} - ${Math.min(i + ROOM_BATCH_SIZE, rooms.length)} done`);
  }
  console.log('✅ All rooms seeded');

  // ============================================================
  // 4. Seed Users
  // ============================================================
  console.log(`📌 Seeding ${users.length} users...`);
  await prisma.user.createMany({
    data: users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: (u.role as UserRole) || 'TENANT',
      budgetMax: u.preferences?.budget_max ?? null,
      preferredDistrict: u.preferences?.preferred_district ?? null,
      preferredAmenities: u.preferences?.preferred_amenities || [],
      targetLat: u.preferences?.target_lat ?? null,
      targetLng: u.preferences?.target_lng ?? null,
      maxRadiusKm: u.preferences?.max_radius_km ?? null,
    })),
    skipDuplicates: true,
  });
  console.log('✅ Users seeded');

  // ============================================================
  // 5. Seed Interactions
  // ============================================================
  console.log(`📌 Seeding ${interactions.length} interactions...`);
  const existingInteractions = await prisma.interactionLog.count();
  if (existingInteractions === 0) {
    const INT_BATCH_SIZE = 500;
    for (let i = 0; i < interactions.length; i += INT_BATCH_SIZE) {
      const batch = interactions.slice(i, i + INT_BATCH_SIZE);
      await prisma.interactionLog.createMany({
        data: batch.map((log: any) => ({
          userId: log.user_id,
          roomId: log.room_id,
          action: ((log.interaction_type || log.action || 'VIEW') as InteractionAction),
          timestamp: new Date(log.timestamp),
          rating: log.rating || 0,
        })),
        skipDuplicates: true,
      });
    }
  }
  console.log('✅ Interactions seeded');

  // ============================================================
  // Summary
  // ============================================================
  const counts = {
    landlords: await prisma.landlord.count(),
    projects: await prisma.project.count(),
    rooms: await prisma.room.count(),
    users: await prisma.user.count(),
    interactions: await prisma.interactionLog.count(),
  };
  console.log('\n🎉 Seed complete! Database summary:');
  console.table(counts);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
