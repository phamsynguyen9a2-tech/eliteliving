/**
 * CRUD danh mục trên Web Admin (đề cương thang điểm mục 6: "Quản lý danh mục cốt lõi (CRUD):
 * chủ trọ, người thuê, khu trọ, phòng trọ, đơn giá, tiện ích và trạng thái phòng").
 * Phòng dùng createRoom / updateRoom / deleteRoom trong lib/db.ts; file này lo khu trọ, tài khoản, tiện ích.
 */
import prisma from './prisma';
import { invalidateRoomsCache } from './db';

const slugify = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export interface BuildingInput {
  code?: string;
  name?: string;
  address?: string;
  district?: string;
  lat?: number;
  lng?: number;
  landlordId?: string;
  basePrice?: number;
  roomType?: string;
  area?: number;
  amenities?: string[];
  images?: string[];
}

function cleanList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return Array.from(new Set(value.map((v) => String(v).trim()).filter(Boolean)));
}

export function validateBuildingInput(input: BuildingInput, mode: 'create' | 'update') {
  const errors: string[] = [];
  const need = mode === 'create';
  if (need || input.name !== undefined) if (!String(input.name || '').trim()) errors.push('tên tòa nhà');
  if (need || input.address !== undefined) if (String(input.address || '').trim().length < 5) errors.push('địa chỉ');
  if (need || input.district !== undefined) if (!String(input.district || '').trim()) errors.push('quận');
  if (need || input.lat !== undefined || input.lng !== undefined) {
    const lat = Number(input.lat);
    const lng = Number(input.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 10.3 || lat > 11.2 || lng < 106.3 || lng > 107.1) errors.push('tọa độ trong TP.HCM');
  }
  if (need && !String(input.landlordId || '').trim()) errors.push('chủ trọ phụ trách');
  if (errors.length) throw new Error(`INVALID_INPUT: Vui lòng nhập đúng ${errors.join(', ')}.`);
}

export async function createBuilding(input: BuildingInput) {
  validateBuildingInput(input, 'create');
  const landlord = await prisma.landlord.findUnique({ where: { id: String(input.landlordId) } });
  if (!landlord) throw new Error('INVALID_INPUT: Không tìm thấy chủ trọ phụ trách.');
  const name = String(input.name).trim();
  const suffix = Date.now().toString(36).slice(-4).toUpperCase();
  const code = (input.code?.trim() || `BLD_${slugify(name).toUpperCase().replace(/-/g, '_').slice(0, 14)}_${suffix}`).slice(0, 40);
  if (await prisma.project.findUnique({ where: { code } })) throw new Error('DUPLICATE: Mã tòa nhà đã tồn tại.');
  return prisma.project.create({
    data: {
      code,
      slug: `${slugify(name) || 'toa-nha'}-${suffix.toLowerCase()}`,
      name,
      address: String(input.address).trim(),
      district: String(input.district).trim(),
      lat: Number(input.lat),
      lng: Number(input.lng),
      basePrice: Number(input.basePrice) > 0 ? Number(input.basePrice) : 4_000_000,
      roomType: input.roomType?.trim() || 'Phòng Studio',
      area: Number(input.area) > 0 ? Number(input.area) : 25,
      amenities: cleanList(input.amenities) ?? [],
      images: cleanList(input.images) ?? [],
      landlordId: landlord.id,
      landlordName: landlord.name,
      landlordPhone: landlord.phone,
    },
  });
}

export async function updateBuilding(code: string, input: BuildingInput) {
  validateBuildingInput(input, 'update');
  const existing = await prisma.project.findUnique({ where: { code } });
  if (!existing) return null;
  let landlordFields = {};
  if (input.landlordId && input.landlordId !== existing.landlordId) {
    const landlord = await prisma.landlord.findUnique({ where: { id: input.landlordId } });
    if (!landlord) throw new Error('INVALID_INPUT: Không tìm thấy chủ trọ phụ trách.');
    landlordFields = { landlordId: landlord.id, landlordName: landlord.name, landlordPhone: landlord.phone };
  }
  const updated = await prisma.project.update({
    where: { code },
    data: {
      ...(input.name !== undefined ? { name: String(input.name).trim() } : {}),
      ...(input.address !== undefined ? { address: String(input.address).trim() } : {}),
      ...(input.district !== undefined ? { district: String(input.district).trim() } : {}),
      ...(input.lat !== undefined ? { lat: Number(input.lat) } : {}),
      ...(input.lng !== undefined ? { lng: Number(input.lng) } : {}),
      ...(input.basePrice !== undefined && Number(input.basePrice) > 0 ? { basePrice: Number(input.basePrice) } : {}),
      ...(input.roomType !== undefined ? { roomType: String(input.roomType).trim() } : {}),
      ...(input.area !== undefined && Number(input.area) > 0 ? { area: Number(input.area) } : {}),
      ...(cleanList(input.amenities) ? { amenities: cleanList(input.amenities) } : {}),
      ...(cleanList(input.images) ? { images: cleanList(input.images) } : {}),
      ...landlordFields,
    },
  });
  // Đổi tên tòa nhà thì đồng bộ tên dự án lưu trên từng phòng
  if (input.name !== undefined && updated.name !== existing.name) {
    await prisma.room.updateMany({ where: { projectCode: code }, data: { projectName: updated.name } });
  }
  invalidateRoomsCache();
  return updated;
}

export async function deleteBuilding(code: string) {
  const roomCount = await prisma.room.count({ where: { projectCode: code } });
  if (roomCount > 0) {
    throw new Error(`HAS_RECORDS: Tòa nhà còn ${roomCount} phòng. Hãy xóa hoặc chuyển các phòng sang tòa khác trước.`);
  }
  const removed = await prisma.project.deleteMany({ where: { code } });
  return removed.count > 0;
}

// ------------------------------------------------------------
// Tài khoản
// ------------------------------------------------------------

export async function updateAccount(userId: string, input: { name?: unknown; email?: unknown; phone?: unknown }) {
  const name = typeof input.name === 'string' ? input.name.trim() : undefined;
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : undefined;
  const phone = typeof input.phone === 'string' ? input.phone.replace(/\s|-/g, '').replace(/^\+84/, '0') : undefined;
  if (name !== undefined && (name.length < 2 || name.length > 100)) throw new Error('INVALID_INPUT: Họ tên phải từ 2 đến 100 ký tự.');
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('INVALID_INPUT: Email không hợp lệ.');
  if (phone !== undefined && phone !== '' && !/^0\d{9}$/.test(phone)) throw new Error('INVALID_INPUT: Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0.');

  const [user, landlord] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.landlord.findUnique({ where: { id: userId } }),
  ]);
  if (!user && !landlord) return null;
  if (email && user && email !== user.email) {
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken && taken.id !== userId) throw new Error('DUPLICATE: Email đã được dùng cho tài khoản khác.');
  }
  // Đổi số điện thoại thì phải xác minh lại (SĐT đã xác minh là căn cứ ghép hợp đồng của người thuê)
  const phoneChanged = phone !== undefined && user && phone !== user.phone;
  await prisma.$transaction(async (tx) => {
    if (user) {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(phoneChanged ? { phoneVerified: false } : {}),
        },
      });
    }
    if (landlord) {
      await tx.landlord.update({
        where: { id: userId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(phone !== undefined && phone ? { phone } : {}),
        },
      });
      // Tên / SĐT chủ trọ hiển thị trên tin đăng và tòa nhà
      if (name !== undefined || (phone !== undefined && phone)) {
        const data = { ...(name !== undefined ? { landlordName: name } : {}), ...(phone ? { landlordPhone: phone } : {}) };
        await tx.room.updateMany({ where: { landlordId: userId }, data });
        await tx.project.updateMany({ where: { landlordId: userId }, data });
      }
    }
  });
  invalidateRoomsCache();
  return { id: userId, name, email, phone, phoneReverification: Boolean(phoneChanged) };
}

/**
 * Xóa tài khoản. Không xóa khi còn dữ liệu nghiệp vụ (hợp đồng, lịch hẹn, phòng) để giữ lịch sử
 * đối soát — trường hợp đó admin dùng chức năng Khóa tài khoản.
 */
export async function deleteAccount(userId: string, actorId: string) {
  if (userId === actorId) throw new Error('FORBIDDEN: Không thể tự xóa tài khoản đang đăng nhập.');
  const [user, landlord] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, phone: true, phoneVerified: true } }),
    prisma.landlord.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);
  if (!user && !landlord) return false;
  if (user?.role === 'ADMIN') {
    const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (admins <= 1) throw new Error('FORBIDDEN: Hệ thống phải còn ít nhất một quản trị viên.');
  }
  const [rooms, projects, appointments, contracts] = await Promise.all([
    prisma.room.count({ where: { landlordId: userId } }),
    prisma.project.count({ where: { landlordId: userId } }),
    prisma.appointment.count({ where: { userId } }),
    user?.phone && user.phoneVerified ? prisma.contract.count({ where: { tenantPhone: user.phone } }) : Promise.resolve(0),
  ]);
  const blockers = [
    rooms ? `${rooms} phòng` : '',
    projects ? `${projects} tòa nhà` : '',
    appointments ? `${appointments} lịch hẹn` : '',
    contracts ? `${contracts} hợp đồng` : '',
  ].filter(Boolean);
  if (blockers.length) {
    throw new Error(`HAS_RECORDS: Tài khoản còn ${blockers.join(', ')} cần lưu trữ. Hãy khóa tài khoản thay vì xóa.`);
  }
  await prisma.$transaction(async (tx) => {
    if (user) {
      await tx.interactionLog.deleteMany({ where: { userId } });
      await tx.roommateRequest.deleteMany({ where: { requesterId: userId } });
      await tx.roommatePost.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    }
    if (landlord) await tx.landlord.delete({ where: { id: userId } });
  });
  return true;
}

// ------------------------------------------------------------
// Danh mục tiện ích
// ------------------------------------------------------------

export async function addAmenity(name: unknown, category: unknown) {
  const clean = String(name || '').trim();
  if (clean.length < 2 || clean.length > 60) throw new Error('INVALID_INPUT: Tên tiện ích phải từ 2 đến 60 ký tự.');
  const existing = await prisma.amenity.findFirst({ where: { name: { equals: clean, mode: 'insensitive' } } });
  if (existing) throw new Error('DUPLICATE: Tiện ích này đã có trong danh mục.');
  const max = await prisma.amenity.aggregate({ _max: { sortOrder: true } });
  return prisma.amenity.create({
    data: { name: clean, category: String(category || 'Tiện ích').trim() || 'Tiện ích', sortOrder: (max._max.sortOrder ?? 0) + 1 },
  });
}

/** Sửa tiện ích; đổi tên thì đổi luôn trong dữ liệu phòng, tòa nhà và hồ sơ nhu cầu. */
export async function updateAmenity(id: number, input: { name?: unknown; category?: unknown; isActive?: unknown }) {
  const existing = await prisma.amenity.findUnique({ where: { id } });
  if (!existing) return null;
  const name = input.name !== undefined ? String(input.name).trim() : existing.name;
  if (name.length < 2 || name.length > 60) throw new Error('INVALID_INPUT: Tên tiện ích phải từ 2 đến 60 ký tự.');
  if (name !== existing.name) {
    const dup = await prisma.amenity.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } } });
    if (dup) throw new Error('DUPLICATE: Đã có tiện ích cùng tên.');
  }
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.amenity.update({
      where: { id },
      data: {
        name,
        ...(input.category !== undefined ? { category: String(input.category).trim() || 'Tiện ích' } : {}),
        ...(typeof input.isActive === 'boolean' ? { isActive: input.isActive } : {}),
      },
    });
    if (name !== existing.name) {
      await tx.$executeRaw`UPDATE rooms SET amenities = array_replace(amenities, ${existing.name}, ${name})`;
      await tx.$executeRaw`UPDATE projects SET amenities = array_replace(amenities, ${existing.name}, ${name})`;
      await tx.$executeRaw`UPDATE users SET preferred_amenities = array_replace(preferred_amenities, ${existing.name}, ${name})`;
    }
    return row;
  });
  invalidateRoomsCache();
  return updated;
}

/** Xóa khỏi danh mục (phòng đang có tiện ích này vẫn giữ nguyên). */
export async function deleteAmenity(id: number) {
  const removed = await prisma.amenity.deleteMany({ where: { id } });
  return removed.count > 0;
}
