import { PrismaClient, UserRole, RoomStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu mẫu...')

  // === Admin ===
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nhatrotop.vn' },
    update: {},
    create: {
      email: 'admin@nhatrotop.vn',
      phone: '0901000001',
      password: '$2b$10$hashed', // thực tế dùng bcrypt
      fullName: 'Quản Trị Viên',
      role: UserRole.ADMIN,
    },
  })

  // === Chủ trọ ===
  const landlordUser = await prisma.user.upsert({
    where: { email: 'chutro@nhatrotop.vn' },
    update: {},
    create: {
      email: 'chutro@nhatrotop.vn',
      phone: '0901000002',
      password: '$2b$10$hashed',
      fullName: 'Nguyễn Văn Hùng',
      role: UserRole.LANDLORD,
      landlordProfile: {
        create: {
          bankName: 'Vietcombank',
          bankAccount: '1234567890',
          verified: true,
        },
      },
    },
    include: { landlordProfile: true },
  })

  // === Người thuê ===
  const tenantUser = await prisma.user.upsert({
    where: { email: 'nguoithue@nhatrotop.vn' },
    update: {},
    create: {
      email: 'nguoithue@nhatrotop.vn',
      phone: '0901000003',
      password: '$2b$10$hashed',
      fullName: 'Trần Thị Mai',
      role: UserRole.TENANT,
      tenantProfile: {
        create: {
          workplace: 'Công ty TNHH ABC',
          workplaceAddress: '123 Nguyễn Văn Linh, Q.7',
          workplaceLat: 10.7367,
          workplaceLng: 106.7009,
          budgetMin: 3000000,
          budgetMax: 6000000,
          preferredArea: 'Quận 7',
        },
      },
    },
  })

  // === Tiện ích ===
  const amenities = [
    { name: 'Máy lạnh', icon: 'ac_unit', category: 'appliance' },
    { name: 'Máy giặt riêng', icon: 'local_laundry_service', category: 'appliance' },
    { name: 'Giường', icon: 'bed', category: 'furniture' },
    { name: 'Tủ quần áo', icon: 'door_sliding', category: 'furniture' },
    { name: 'Nệm', icon: 'airline_seat_individual_suite', category: 'furniture' },
    { name: 'Sofa', icon: 'chair', category: 'furniture' },
    { name: 'Bàn & ghế', icon: 'desk', category: 'furniture' },
    { name: 'Tủ lạnh', icon: 'kitchen', category: 'appliance' },
    { name: 'Tivi', icon: 'tv', category: 'appliance' },
    { name: 'Bình nóng lạnh', icon: 'hot_tub', category: 'appliance' },
    { name: 'Wifi', icon: 'wifi', category: 'service' },
    { name: 'Hầm xe', icon: 'garage', category: 'service' },
    { name: 'Camera an ninh', icon: 'videocam', category: 'service' },
    { name: 'Bảo vệ 24/7', icon: 'security', category: 'service' },
  ]

  for (const a of amenities) {
    await prisma.amenity.upsert({
      where: { name: a.name },
      update: {},
      create: a,
    })
  }

  // === Khu trọ ===
  if (landlordUser.landlordProfile) {
    const area1 = await prisma.area.create({
      data: {
        landlordId: landlordUser.landlordProfile.id,
        name: 'Khu trọ Tân Phú',
        address: '22 Tân Quý, P. Tân Sơn Nhì',
        ward: 'Tân Sơn Nhì',
        district: 'Tân Phú',
        city: 'TP.HCM',
        lat: 10.7872,
        lng: 106.6260,
        description: 'Khu trọ cao cấp, an ninh 24/7, gần chợ Tân Bình',
      },
    })

    // === Phòng trọ ===
    const roomData = [
      { roomCode: 'TP-101', name: 'Phòng TP.101', floor: 1, area: 28.0, price: 4500000, deposit: 9000000, status: RoomStatus.AVAILABLE, isPublished: true },
      { roomCode: 'TP-102', name: 'Phòng TP.102', floor: 1, area: 32.0, price: 5200000, deposit: 10400000, status: RoomStatus.OCCUPIED, isPublished: true },
      { roomCode: 'TP-201', name: 'Phòng TP.201', floor: 2, area: 28.0, price: 4500000, deposit: 9000000, status: RoomStatus.AVAILABLE, isPublished: true },
      { roomCode: 'TP-202', name: 'Phòng TP.202', floor: 2, area: 35.0, price: 5800000, deposit: 11600000, status: RoomStatus.SCHEDULED, isPublished: true },
      { roomCode: 'TP-301', name: 'Phòng TP.301', floor: 3, area: 40.0, price: 6500000, deposit: 13000000, status: RoomStatus.AVAILABLE, isPublished: true },
      { roomCode: 'TP-302', name: 'Phòng TP.302', floor: 3, area: 25.0, price: 3800000, deposit: 7600000, status: RoomStatus.RESERVED, isPublished: false },
    ]

    for (const r of roomData) {
      await prisma.room.upsert({
        where: { roomCode: r.roomCode },
        update: {},
        create: {
          ...r,
          areaId: area1.id,
          description: `Phòng rộng rãi, thoáng mát, đầy đủ nội thất. Tầng ${r.floor}, diện tích ${r.area}m².`,
        },
      })
    }
  }

  console.log('✅ Seed dữ liệu hoàn thành!')
  console.log('👤 Admin: admin@nhatrotop.vn')
  console.log('🏠 Chủ trọ: chutro@nhatrotop.vn')
  console.log('🙋 Người thuê: nguoithue@nhatrotop.vn')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
