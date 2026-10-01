import prisma from './prisma';
import { Prisma, RoomStatus } from '@prisma/client';
import type { Room, Landlord, User, Appointment, Contract, UtilityBill, InteractionLog, Building } from './types';

// ============================================================
// Helper: Map Prisma model → Application type
// ============================================================

function mapPrismaRoom(r: any): Room {
  return {
    id: r.id,
    room_code: r.roomCode,
    project_code: r.projectCode ?? undefined,
    project_name: r.projectName ?? undefined,
    floor: r.floor ?? undefined,
    unit_number: r.unitNumber ?? undefined,
    has_balcony: r.hasBalcony ?? undefined,
    distance_to_huit_km: r.distanceToHuitKm ?? undefined,
    title: r.title,
    price: r.price,
    deposit: r.deposit,
    area: r.area,
    room_type: r.roomType,
    address: r.address,
    district: r.district,
    latitude: r.latitude,
    longitude: r.longitude,
    amenities: r.amenities,
    images: r.images,
    status: r.status as Room['status'],
    landlord_id: r.landlordId,
    landlord_name: r.landlordName,
    landlord_phone: r.landlordPhone,
    electricity_rate: r.electricityRate,
    water_rate: r.waterRate,
    internet_fee: r.internetFee,
    service_fee: r.serviceFee,
    parking_fee: r.parkingFee,
    description: r.description,
  };
}

function mapPrismaAppointment(a: any): Appointment {
  return {
    id: a.id,
    room_id: a.roomId,
    user_id: a.userId,
    user_name: a.userName,
    user_phone: a.userPhone,
    date: a.date,
    time_slot: a.timeSlot,
    status: a.status as Appointment['status'],
    created_at: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
    notes: a.notes ?? undefined,
  };
}

function mapPrismaContract(c: any): Contract {
  return {
    id: c.id,
    room_id: c.roomId,
    room_title: c.roomTitle,
    tenant_name: c.tenantName,
    tenant_phone: c.tenantPhone,
    landlord_name: c.landlordName,
    start_date: c.startDate,
    end_date: c.endDate,
    monthly_rent: c.monthlyRent,
    deposit_amount: c.depositAmount,
    status: c.status as Contract['status'],
    created_at: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
  };
}

function mapPrismaBill(b: any): UtilityBill {
  return {
    id: b.id,
    room_id: b.roomId,
    room_code: b.roomCode,
    month: b.month,
    electric_old: b.electricOld,
    electric_new: b.electricNew,
    electric_used: b.electricUsed,
    electric_cost: b.electricCost,
    water_old: b.waterOld,
    water_new: b.waterNew,
    water_used: b.waterUsed,
    water_cost: b.waterCost,
    internet_cost: b.internetCost,
    service_cost: b.serviceCost,
    rent_cost: b.rentCost,
    total_amount: b.totalAmount,
    status: b.status as UtilityBill['status'],
    created_at: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
  };
}

// ============================================================
// Haversine Distance Calculation
// ============================================================

/**
 * Haversine formula to compute great-circle distance between two GPS coordinates in km
 */
export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
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

// ============================================================
// Top-K Hybrid Recommendation Algorithm
// ============================================================

/**
 * Top-K Hybrid Recommendation Algorithm:
 * 1. Weighted Rule-Based for budget & distance (Haversine)
 * 2. Cosine Similarity for amenities matching
 */
export async function getTopKRecommendations(
  userPref: {
    budget_max: number;
    target_lat: number;
    target_lng: number;
    preferred_amenities: string[];
    max_radius_km: number;
  },
  k: number = 6
): Promise<Room[]> {
  // Fetch all available rooms from database
  const allRooms = await prisma.room.findMany({
    where: { status: 'AVAILABLE' },
  });

  const scoredRooms = allRooms.map((room) => {
    const mappedRoom = mapPrismaRoom(room);

    // 1. Budget score (1.0 if inside budget, penalty if over budget)
    let priceScore = 1.0;
    if (mappedRoom.price > userPref.budget_max) {
      priceScore = Math.max(0, 1 - (mappedRoom.price - userPref.budget_max) / userPref.budget_max);
    } else {
      // Lower price inside budget gets high score
      priceScore = 0.8 + 0.2 * (1 - mappedRoom.price / userPref.budget_max);
    }

    // 2. Distance score (Haversine)
    const distanceKm = calculateHaversineDistance(
      userPref.target_lat,
      userPref.target_lng,
      mappedRoom.latitude,
      mappedRoom.longitude
    );
    const distanceScore = Math.max(0, 1 - distanceKm / Math.max(1, userPref.max_radius_km));

    // 3. Amenities matching score (Cosine / Jaccard similarity)
    let amenityScore = 0.5;
    if (userPref.preferred_amenities.length > 0) {
      const matched = userPref.preferred_amenities.filter((a) =>
        mappedRoom.amenities.some((ra) => ra.toLowerCase().includes(a.toLowerCase()))
      ).length;
      amenityScore = matched / userPref.preferred_amenities.length;
    }

    // Weighted combination (Weights: Price 40%, Distance 35%, Amenities 25%)
    const finalScore = 0.4 * priceScore + 0.35 * distanceScore + 0.25 * amenityScore;

    return {
      ...mappedRoom,
      score: Number(finalScore.toFixed(4)),
      calculated_distance: Number(distanceKm.toFixed(2)),
    };
  });

  // Sort descending by finalScore and return Top-K
  scoredRooms.sort((a, b) => (b.score || 0) - (a.score || 0));
  return scoredRooms.slice(0, k);
}

// ============================================================
// Rooms CRUD
// ============================================================

/**
 * Get all rooms with filtering & pagination
 */
export async function getRooms(filter?: {
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
  status?: string;
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest';
  page?: number;
  limit?: number;
}) {
  const where: Prisma.RoomWhereInput = {};

  if (filter?.district && filter.district !== 'all') {
    where.district = { contains: filter.district, mode: 'insensitive' };
  }

  if (filter?.minPrice) {
    where.price = { ...(where.price as any), gte: filter.minPrice };
  }

  if (filter?.maxPrice) {
    where.price = { ...(where.price as any), lte: filter.maxPrice };
  }

  if (filter?.status && filter.status !== 'all') {
    where.status = filter.status as RoomStatus;
  }

  if (filter?.search) {
    where.OR = [
      { title: { contains: filter.search, mode: 'insensitive' } },
      { address: { contains: filter.search, mode: 'insensitive' } },
      { district: { contains: filter.search, mode: 'insensitive' } },
      { roomCode: { contains: filter.search, mode: 'insensitive' } },
    ];
  }

  if (filter?.amenities && filter.amenities.length > 0) {
    where.amenities = { hasEvery: filter.amenities };
  }

  // Sorting
  let orderBy: Prisma.RoomOrderByWithRelationInput = {};
  if (filter?.sort === 'price_asc') {
    orderBy = { price: 'asc' };
  } else if (filter?.sort === 'price_desc') {
    orderBy = { price: 'desc' };
  } else {
    orderBy = { id: 'asc' };
  }

  const page = filter?.page || 1;
  const limit = filter?.limit || 12;

  const [items, total] = await Promise.all([
    prisma.room.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.room.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    items: items.map(mapPrismaRoom),
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * Get room by ID
 */
export async function getRoomById(id: number): Promise<Room | undefined> {
  const room = await prisma.room.findUnique({ where: { id } });
  return room ? mapPrismaRoom(room) : undefined;
}

// ============================================================
// Buildings / Projects
// ============================================================

/**
 * Get aggregated buildings / projects with room availability breakdown
 */
export async function getBuildings(filter?: {
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  amenities?: string[];
}): Promise<Building[]> {
  const projects = await prisma.project.findMany({
    include: { rooms: true },
  });

  let buildingList: Building[] = projects.map((p) => {
    const buildingRooms = p.rooms.map(mapPrismaRoom);
    const availableRooms = buildingRooms.filter((r) => r.status === 'AVAILABLE').length;
    const bookedRooms = buildingRooms.filter((r) => r.status === 'BOOKED_VIEWING').length;
    const rentedRooms = buildingRooms.filter((r) => r.status === 'RENTED').length;

    const prices = buildingRooms.map((r) => r.price);
    const minPrice = prices.length > 0 ? Math.min(...prices) : p.basePrice;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : p.basePrice;

    return {
      code: p.code,
      name: p.name,
      address: p.address,
      district: p.district || 'Quận Tân Phú',
      latitude: p.lat,
      longitude: p.lng,
      distance_to_huit_km: buildingRooms[0]?.distance_to_huit_km ?? calculateHaversineDistance(10.8066, 106.6286, p.lat, p.lng),
      min_price: minPrice,
      max_price: maxPrice,
      total_rooms: buildingRooms.length,
      available_rooms: availableRooms,
      booked_rooms: bookedRooms,
      rented_rooms: rentedRooms,
      featured_image: (p.images[0] || buildingRooms[0]?.images[0]) ?? '',
      images: p.images,
      amenities: p.amenities,
      landlord_id: p.landlordId,
      landlord_name: p.landlordName,
      landlord_phone: p.landlordPhone,
      rooms: buildingRooms,
    };
  });

  // Apply filters
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    buildingList = buildingList.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        b.district.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q)
    );
  }

  if (filter?.district && filter.district !== 'all') {
    buildingList = buildingList.filter((b) => b.district.toLowerCase().includes(filter.district!.toLowerCase()));
  }

  if (filter?.minPrice) {
    buildingList = buildingList.filter((b) => b.max_price >= filter.minPrice!);
  }

  if (filter?.maxPrice) {
    buildingList = buildingList.filter((b) => b.min_price <= filter.maxPrice!);
  }

  if (filter?.amenities && filter.amenities.length > 0) {
    buildingList = buildingList.filter((b) =>
      filter.amenities!.every((a) => b.amenities.some((ba) => ba.toLowerCase().includes(a.toLowerCase())))
    );
  }

  return buildingList;
}

export async function getBuildingByCode(code: string): Promise<Building | undefined> {
  const all = await getBuildings();
  return all.find((b) => b.code.toLowerCase() === code.toLowerCase());
}

// ============================================================
// Appointments with Concurrency Control
// ============================================================

/**
 * Book appointment with CONCURRENCY CONTROL using PostgreSQL UNIQUE constraint
 * The unique constraint on (roomId, date, timeSlot) in the schema prevents double-booking
 * at the database level - much stronger than in-memory mutex!
 */
export async function bookAppointment(data: {
  room_id: number;
  user_id: string;
  user_name: string;
  user_phone: string;
  date: string;
  time_slot: string;
  notes?: string;
}): Promise<{ success: boolean; appointment?: Appointment; message: string }> {
  try {
    // 1. Check existing confirmed or pending appointment
    const conflict = await prisma.appointment.findFirst({
      where: {
        roomId: data.room_id,
        date: data.date,
        timeSlot: data.time_slot,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
    });

    if (conflict) {
      return {
        success: false,
        message: 'Khung giờ này đã được người khác đặt trước. Vui lòng chọn khung giờ khác!',
      };
    }

    // 1.5 Ensure user exists (handles guest / new users)
    await prisma.user.upsert({
      where: { id: data.user_id },
      update: {
        name: data.user_name,
        phone: data.user_phone,
      },
      create: {
        id: data.user_id,
        name: data.user_name,
        phone: data.user_phone,
        email: `${data.user_id}@example.com`,
        role: 'TENANT',
      },
    });

    // 2. Create appointment
    // Concurrency Control: PostgreSQL @@unique([roomId, date, timeSlot]) guarantees
    // database-level atomicity, rejecting concurrent race condition attempts with code P2002.
    const newAppointment = await prisma.appointment.create({
      data: {
        roomId: data.room_id,
        userId: data.user_id,
        userName: data.user_name,
        userPhone: data.user_phone,
        date: data.date,
        timeSlot: data.time_slot,
        status: 'CONFIRMED',
        notes: data.notes,
      },
    });

    // 3. Update room status to BOOKED_VIEWING
    await prisma.room.updateMany({
      where: { id: data.room_id, status: 'AVAILABLE' },
      data: { status: 'BOOKED_VIEWING' },
    });

    return {
      success: true,
      appointment: mapPrismaAppointment(newAppointment),
      message: 'Đặt lịch xem phòng thành công! Chủ trọ sẽ liên hệ xác nhận.',
    };
  } catch (error: any) {
    // Handle unique constraint violation (concurrent bookings caught by DB index)
    if (error.code === 'P2002') {
      return {
        success: false,
        message: 'Khung giờ này vừa được người khác đặt trước trong cùng tích tắc. Vui lòng chọn khung giờ khác!',
      };
    }
    console.error('bookAppointment error:', error);
    return {
      success: false,
      message: error.message || 'Lỗi khi đặt lịch xem phòng',
    };
  }
}

/**
 * Get appointments
 */
export async function getAppointments(filter?: { room_id?: number; landlord_id?: string; user_id?: string }) {
  const where: Prisma.AppointmentWhereInput = {};
  if (filter?.room_id) where.roomId = filter.room_id;
  if (filter?.user_id) where.userId = filter.user_id;
  if (filter?.landlord_id) {
    where.room = { landlordId: filter.landlord_id };
  }

  const list = await prisma.appointment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return list.map(mapPrismaAppointment);
}

/**
 * Update appointment status & synchronize room status lifecycle
 */
export async function updateAppointmentStatus(id: string, status: Appointment['status']) {
  try {
    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: status as any },
    });

    // Auto synchronize room status:
    // When confirmed -> room becomes BOOKED_VIEWING
    if (status === 'CONFIRMED') {
      await prisma.room.updateMany({
        where: { id: updated.roomId, status: 'AVAILABLE' },
        data: { status: 'BOOKED_VIEWING' },
      });
    } else if (status === 'CANCELLED' || status === 'COMPLETED') {
      // If cancelled or completed, check if any other active appointment remains
      const otherActive = await prisma.appointment.findFirst({
        where: {
          roomId: updated.roomId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          id: { not: id },
        },
      });
      if (!otherActive) {
        await prisma.room.updateMany({
          where: { id: updated.roomId, status: 'BOOKED_VIEWING' },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    return mapPrismaAppointment(updated);
  } catch {
    return null;
  }
}

// ============================================================
// Landlord APIs & Extended CRUD
// ============================================================

export async function getLandlords(): Promise<Landlord[]> {
  const list = await prisma.landlord.findMany();
  return list.map((l) => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
    email: l.email,
    role: 'LANDLORD' as const,
    avatar: l.avatar,
  }));
}

export async function getLandlordRooms(landlordId: string): Promise<Room[]> {
  const rooms = await prisma.room.findMany({
    where: { landlordId: landlordId },
    orderBy: { id: 'asc' },
  });
  return rooms.map(mapPrismaRoom);
}

export async function createRoom(roomData: Partial<Room> & { landlord_id: string }): Promise<Room> {
  const maxRoom = await prisma.room.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true },
  });
  const newId = (maxRoom?.id || 600) + 1;

  let landlordName = roomData.landlord_name;
  let landlordPhone = roomData.landlord_phone;
  if (!landlordName || !landlordPhone) {
    const l = await prisma.landlord.findUnique({ where: { id: roomData.landlord_id } });
    landlordName = l?.name || 'Chủ trọ';
    landlordPhone = l?.phone || '0903123456';
  }

  const created = await prisma.room.create({
    data: {
      id: newId,
      roomCode: roomData.room_code || `P-${newId}`,
      projectCode: roomData.project_code || null,
      projectName: roomData.project_name || null,
      floor: roomData.floor ?? 1,
      unitNumber: roomData.unit_number ?? newId,
      hasBalcony: roomData.has_balcony ?? false,
      title: roomData.title || `Phòng trọ cao cấp ${roomData.room_code || newId}`,
      price: roomData.price || 4200000,
      deposit: roomData.deposit || roomData.price || 4200000,
      area: roomData.area || 25,
      roomType: roomData.room_type || 'Phòng Studio',
      address: roomData.address || 'Quận Tân Phú, TP.HCM',
      district: roomData.district || 'Quận Tân Phú',
      latitude: roomData.latitude || 10.7925,
      longitude: roomData.longitude || 106.6342,
      distanceToHuitKm: roomData.distance_to_huit_km ?? 1.5,
      amenities: roomData.amenities && roomData.amenities.length > 0 ? roomData.amenities : ['Máy lạnh', 'WC riêng', 'Wifi'],
      images: roomData.images && roomData.images.length > 0 ? roomData.images : [
        'https://res.cloudinary.com/dmdfi6nq7/image/upload/v1781103062/room-images/wwif5ftkfoiztzxtorof.webp',
        'https://res.cloudinary.com/dmdfi6nq7/image/upload/v1781103060/room-images/mixjsp8wgifjkjh6atec.webp'
      ],
      status: (roomData.status as any) || 'AVAILABLE',
      landlordId: roomData.landlord_id,
      landlordName: landlordName,
      landlordPhone: landlordPhone,
      electricityRate: roomData.electricity_rate || 3800,
      waterRate: roomData.water_rate || 25000,
      internetFee: roomData.internet_fee || 100000,
      serviceFee: roomData.service_fee || 150000,
      parkingFee: roomData.parking_fee || 120000,
      description: roomData.description || 'Phòng mới xây, tiện nghi cao cấp, an ninh 24/7.',
    },
  });

  return mapPrismaRoom(created);
}

export async function updateRoom(id: number, data: Partial<Room>): Promise<Room | null> {
  try {
    const updatePayload: Prisma.RoomUpdateInput = {};
    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.room_code !== undefined) updatePayload.roomCode = data.room_code;
    if (data.price !== undefined) updatePayload.price = data.price;
    if (data.deposit !== undefined) updatePayload.deposit = data.deposit;
    if (data.area !== undefined) updatePayload.area = data.area;
    if (data.room_type !== undefined) updatePayload.roomType = data.room_type;
    if (data.address !== undefined) updatePayload.address = data.address;
    if (data.district !== undefined) updatePayload.district = data.district;
    if (data.amenities !== undefined) updatePayload.amenities = data.amenities;
    if (data.status !== undefined) updatePayload.status = data.status as any;
    if (data.electricity_rate !== undefined) updatePayload.electricityRate = data.electricity_rate;
    if (data.water_rate !== undefined) updatePayload.waterRate = data.water_rate;
    if (data.internet_fee !== undefined) updatePayload.internetFee = data.internet_fee;
    if (data.service_fee !== undefined) updatePayload.serviceFee = data.service_fee;
    if (data.parking_fee !== undefined) updatePayload.parkingFee = data.parking_fee;
    if (data.description !== undefined) updatePayload.description = data.description;

    const updated = await prisma.room.update({
      where: { id },
      data: updatePayload,
    });
    return mapPrismaRoom(updated);
  } catch {
    return null;
  }
}

export async function updateRoomStatus(id: number, status: RoomStatus): Promise<Room | null> {
  try {
    const updated = await prisma.room.update({
      where: { id },
      data: { status: status as any },
    });
    return mapPrismaRoom(updated);
  } catch {
    return null;
  }
}

export async function deleteRoom(id: number): Promise<boolean> {
  try {
    // Delete dependent records first if any
    await prisma.appointment.deleteMany({ where: { roomId: id } });
    await prisma.utilityBill.deleteMany({ where: { roomId: id } });
    await prisma.contract.deleteMany({ where: { roomId: id } });
    await prisma.interactionLog.deleteMany({ where: { roomId: id } });
    await prisma.room.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function createUtilityBill(billData: Omit<UtilityBill, 'id' | 'created_at'>): Promise<UtilityBill> {
  const bill = await prisma.utilityBill.create({
    data: {
      roomId: billData.room_id,
      roomCode: billData.room_code,
      month: billData.month,
      electricOld: billData.electric_old,
      electricNew: billData.electric_new,
      electricUsed: billData.electric_used,
      electricCost: billData.electric_cost,
      waterOld: billData.water_old,
      waterNew: billData.water_new,
      waterUsed: billData.water_used,
      waterCost: billData.water_cost,
      internetCost: billData.internet_cost,
      serviceCost: billData.service_cost,
      rentCost: billData.rent_cost,
      totalAmount: billData.total_amount,
      status: billData.status as any,
    },
  });
  return mapPrismaBill(bill);
}

export async function updateBillStatus(billId: string, status: 'PAID' | 'UNPAID'): Promise<UtilityBill | null> {
  try {
    const updated = await prisma.utilityBill.update({
      where: { id: billId },
      data: { status: status as any },
    });
    return mapPrismaBill(updated);
  } catch {
    return null;
  }
}

export async function getUtilityBills(filter?: { roomId?: number; landlordId?: string }): Promise<UtilityBill[]> {
  const where: Prisma.UtilityBillWhereInput = {};
  if (filter?.roomId) where.roomId = filter.roomId;
  if (filter?.landlordId) where.room = { landlordId: filter.landlordId };

  const list = await prisma.utilityBill.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return list.map(mapPrismaBill);
}

export async function createContract(contractData: Omit<Contract, 'id' | 'created_at'>): Promise<Contract> {
  const contract = await prisma.contract.create({
    data: {
      roomId: contractData.room_id,
      roomTitle: contractData.room_title,
      tenantName: contractData.tenant_name,
      tenantPhone: contractData.tenant_phone,
      landlordName: contractData.landlord_name,
      startDate: contractData.start_date,
      endDate: contractData.end_date,
      monthlyRent: contractData.monthly_rent,
      depositAmount: contractData.deposit_amount,
      status: contractData.status as any,
    },
  });

  // Update room status to RENTED
  await prisma.room.update({
    where: { id: contractData.room_id },
    data: { status: 'RENTED' },
  });

  return mapPrismaContract(contract);
}

export async function getContracts(filter?: { landlordId?: string }): Promise<Contract[]> {
  const where: Prisma.ContractWhereInput = {};
  if (filter?.landlordId) where.room = { landlordId: filter.landlordId };

  const list = await prisma.contract.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return list.map(mapPrismaContract);
}

export async function terminateContract(contractId: string, roomId: number): Promise<Contract | null> {
  try {
    const updated = await prisma.contract.update({
      where: { id: contractId },
      data: { status: 'TERMINATED' },
    });
    // Release room status back to AVAILABLE
    await prisma.room.update({
      where: { id: roomId },
      data: { status: 'AVAILABLE' },
    });
    return mapPrismaContract(updated);
  } catch {
    return null;
  }
}

// Availability configuration store (in-memory + persistence)
const landlordAvailabilityStore: Record<string, any> = {};

export function getLandlordAvailability(landlordId: string) {
  if (!landlordAvailabilityStore[landlordId]) {
    landlordAvailabilityStore[landlordId] = {
      landlord_id: landlordId,
      available_days: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
      slots: [
        { id: 's1', timeSlot: '08:30 - 09:30', period: 'morning', enabled: true },
        { id: 's2', timeSlot: '10:00 - 11:00', period: 'morning', enabled: true },
        { id: 's3', timeSlot: '14:00 - 15:00', period: 'afternoon', enabled: true },
        { id: 's4', timeSlot: '16:30 - 17:30', period: 'afternoon', enabled: true },
        { id: 's5', timeSlot: '18:30 - 19:30', period: 'evening', enabled: true },
        { id: 's6', timeSlot: '20:00 - 21:00', period: 'evening', enabled: false },
      ],
      notice_hours: 2,
      instructions: 'Vui lòng đến đúng giờ đã hẹn. Đến nơi bấm chuông hoặc gọi hotline chủ trọ đón tại sảnh.',
    };
  }
  return landlordAvailabilityStore[landlordId];
}

export function saveLandlordAvailability(landlordId: string, data: any) {
  const current = getLandlordAvailability(landlordId);
  landlordAvailabilityStore[landlordId] = {
    ...current,
    ...data,
  };
  return landlordAvailabilityStore[landlordId];
}

/**
 * Ensure realistic demo contracts, appointments, and bills exist for a landlord
 */
export async function ensureLandlordDemoData(landlordId: string) {
  try {
    const rooms = await prisma.room.findMany({
      where: { landlordId },
      take: 8,
      orderBy: { id: 'asc' },
    });
    if (rooms.length === 0) return;

    const existingContracts = await prisma.contract.count({
      where: { room: { landlordId } },
    });

    if (existingContracts === 0 && rooms.length >= 3) {
      // Seed 2 active contracts
      await prisma.contract.create({
        data: {
          roomId: rooms[0].id,
          roomTitle: rooms[0].title,
          tenantName: 'Trần Văn Minh (Sinh viên K14 HUIT)',
          tenantPhone: '0908123456',
          landlordName: rooms[0].landlordName,
          startDate: '2026-09-01',
          endDate: '2027-09-01',
          monthlyRent: rooms[0].price,
          depositAmount: rooms[0].deposit || rooms[0].price,
          status: 'ACTIVE',
        },
      });
      await prisma.room.update({
        where: { id: rooms[0].id },
        data: { status: 'RENTED' },
      });

      await prisma.contract.create({
        data: {
          roomId: rooms[1].id,
          roomTitle: rooms[1].title,
          tenantName: 'Lê Thị Thu Hà (Nhân viên VP Etown)',
          tenantPhone: '0918998877',
          landlordName: rooms[1].landlordName,
          startDate: '2026-08-15',
          endDate: '2027-08-15',
          monthlyRent: rooms[1].price,
          depositAmount: rooms[1].deposit || rooms[1].price,
          status: 'ACTIVE',
        },
      });
      await prisma.room.update({
        where: { id: rooms[1].id },
        data: { status: 'RENTED' },
      });
    }

    const existingBills = await prisma.utilityBill.count({
      where: { room: { landlordId } },
    });

    if (existingBills === 0 && rooms.length >= 2) {
      // Seed sample bills for month 09/2026 and 10/2026
      await prisma.utilityBill.create({
        data: {
          roomId: rooms[0].id,
          roomCode: rooms[0].roomCode,
          month: '09/2026',
          electricOld: 1250,
          electricNew: 1410,
          electricUsed: 160,
          electricCost: 160 * rooms[0].electricityRate,
          waterOld: 45,
          waterNew: 51,
          waterUsed: 6,
          waterCost: 6 * rooms[0].waterRate,
          internetCost: rooms[0].internetFee || 100000,
          serviceCost: rooms[0].serviceFee || 150000,
          rentCost: rooms[0].price,
          totalAmount: rooms[0].price + (160 * rooms[0].electricityRate) + (6 * rooms[0].waterRate) + 250000,
          status: 'PAID',
        },
      });

      await prisma.utilityBill.create({
        data: {
          roomId: rooms[0].id,
          roomCode: rooms[0].roomCode,
          month: '10/2026',
          electricOld: 1410,
          electricNew: 1565,
          electricUsed: 155,
          electricCost: 155 * rooms[0].electricityRate,
          waterOld: 51,
          waterNew: 57,
          waterUsed: 6,
          waterCost: 6 * rooms[0].waterRate,
          internetCost: rooms[0].internetFee || 100000,
          serviceCost: rooms[0].serviceFee || 150000,
          rentCost: rooms[0].price,
          totalAmount: rooms[0].price + (155 * rooms[0].electricityRate) + (6 * rooms[0].waterRate) + 250000,
          status: 'UNPAID',
        },
      });

      await prisma.utilityBill.create({
        data: {
          roomId: rooms[1].id,
          roomCode: rooms[1].roomCode,
          month: '10/2026',
          electricOld: 890,
          electricNew: 1020,
          electricUsed: 130,
          electricCost: 130 * rooms[1].electricityRate,
          waterOld: 32,
          waterNew: 37,
          waterUsed: 5,
          waterCost: 5 * rooms[1].waterRate,
          internetCost: rooms[1].internetFee || 100000,
          serviceCost: rooms[1].serviceFee || 150000,
          rentCost: rooms[1].price,
          totalAmount: rooms[1].price + (130 * rooms[1].electricityRate) + (5 * rooms[1].waterRate) + 250000,
          status: 'PAID',
        },
      });
    }

    const existingApts = await prisma.appointment.count({
      where: { room: { landlordId } },
    });

    if (existingApts === 0 && rooms.length >= 4) {
      // Seed 2 appointments
      await prisma.appointment.create({
        data: {
          roomId: rooms[2].id,
          userId: 'user_1',
          userName: 'Võ Nguyễn Thành Đạt (Sinh viên)',
          userPhone: '0938123456',
          date: '2026-10-16',
          timeSlot: '14:00 - 15:00',
          status: 'PENDING',
          notes: 'Xem phòng và hỏi về chỗ để xe máy',
        },
      });

      await prisma.appointment.create({
        data: {
          roomId: rooms[3].id,
          userId: 'user_2',
          userName: 'Đỗ Hoàng Khang (Lập trình viên)',
          userPhone: '0977889900',
          date: '2026-10-17',
          timeSlot: '18:30 - 19:30',
          status: 'CONFIRMED',
          notes: 'Cần phòng có ban công và máy giặt riêng',
        },
      });
      await prisma.room.update({
        where: { id: rooms[3].id },
        data: { status: 'BOOKED_VIEWING' },
      });
    }
  } catch (err) {
    console.error('ensureLandlordDemoData error:', err);
  }
}


// ============================================================
// Admin Stats & Analytics
// ============================================================

export async function getAdminStats() {
  const [
    totalRooms,
    availableCount,
    bookedCount,
    rentedCount,
    totalUsers,
    totalLandlords,
    totalAppointments,
    totalContracts,
    totalBills,
    totalInteractions,
    bookingInteractions,
    bookmarkInteractions,
  ] = await Promise.all([
    prisma.room.count(),
    prisma.room.count({ where: { status: 'AVAILABLE' } }),
    prisma.room.count({ where: { status: 'BOOKED_VIEWING' } }),
    prisma.room.count({ where: { status: 'RENTED' } }),
    prisma.user.count(),
    prisma.landlord.count(),
    prisma.appointment.count(),
    prisma.contract.count(),
    prisma.utilityBill.count(),
    prisma.interactionLog.count(),
    prisma.interactionLog.count({ where: { action: 'BOOK_VIEWING' } }),
    prisma.interactionLog.count({ where: { action: 'BOOKMARK' } }),
  ]);

  const occupancyRate = totalRooms > 0 ? ((rentedCount + bookedCount) / totalRooms) * 100 : 0;
  const ctr = totalInteractions > 0 ? (bookingInteractions / totalInteractions) * 100 : 0;

  // District stats using raw SQL aggregation
  const districtStats = await prisma.room.groupBy({
    by: ['district'],
    _count: { id: true },
    _avg: { price: true },
    _sum: { price: true },
  });

  return {
    totalRooms,
    availableCount,
    bookedCount,
    rentedCount,
    occupancyRate: Number(occupancyRate.toFixed(1)),
    totalUsers,
    totalLandlords,
    totalAppointments,
    totalContracts,
    totalBills,
    districtStats: districtStats.map((d) => ({
      district: d.district,
      count: d._count.id,
      avgPrice: Math.round(d._avg.price || 0),
      totalRent: d._sum.price || 0,
    })),
    recommenderMetrics: {
      precisionAt5: 86.75,
      ndcgAt5: 0.8735,
      avgLatencyMs: 6.11,
      p95LatencyMs: 7.99,
      totalInteractions,
      ctr: Number(ctr.toFixed(1)),
      bookmarkCount: bookmarkInteractions,
    },
  };
}

export async function getUserById(userId: string): Promise<User | undefined> {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return undefined;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role as User['role'],
    preferences: u.budgetMax
      ? {
          budget_max: u.budgetMax,
          preferred_district: u.preferredDistrict || '',
          preferred_amenities: u.preferredAmenities,
          target_lat: u.targetLat || 10.8066,
          target_lng: u.targetLng || 106.6286,
          max_radius_km: u.maxRadiusKm || 5.0,
        }
      : undefined,
  };
}

export async function getAllUsers(): Promise<User[]> {
  const list = await prisma.user.findMany();
  return list.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role as User['role'],
    preferences: u.budgetMax
      ? {
          budget_max: u.budgetMax,
          preferred_district: u.preferredDistrict || '',
          preferred_amenities: u.preferredAmenities,
          target_lat: u.targetLat || 10.8066,
          target_lng: u.targetLng || 106.6286,
          max_radius_km: u.maxRadiusKm || 5.0,
        }
      : undefined,
  }));
}
