import type { Project, RoomStatus } from '@prisma/client';
import type { Building } from './types';

export type BuildingRoomAggregate = {
  projectCode: string | null;
  status: RoomStatus;
  _count: { _all: number };
  _min: { price: number | null };
  _max: { price: number | null };
};

export function mapBuildingSummary(
  project: Project & { rooms: { distanceToHuitKm: number | null; images: string[] }[] },
  aggregates: BuildingRoomAggregate[],
  fallbackDistance: number,
): Building {
  const groups = aggregates.filter((row) => row.projectCode === project.code);
  const count = (status?: RoomStatus) => groups.reduce((sum, row) => sum + (!status || row.status === status ? row._count._all : 0), 0);
  const prices = groups.flatMap((row) => row._min.price === null || row._max.price === null ? [] : [row._min.price, row._max.price]);
  const minPrice = prices.length ? Math.min(...prices) : project.basePrice;
  return {
    code: project.code, name: project.name, address: project.address,
    district: project.district || 'Quận Tân Phú',
    latitude: project.lat, longitude: project.lng, lat: project.lat, lng: project.lng,
    base_price: minPrice, min_price: minPrice,
    max_price: prices.length ? Math.max(...prices) : project.basePrice,
    distance_to_huit_km: project.rooms[0]?.distanceToHuitKm ?? fallbackDistance,
    total_rooms: count(), available_rooms: count('AVAILABLE'),
    booked_rooms: count('BOOKED_VIEWING'), rented_rooms: count('RENTED'),
    featured_image: (project.images[0] || project.rooms[0]?.images[0]) ?? '',
    images: project.images.slice(0, 1), amenities: project.amenities,
    landlord_id: project.landlordId, landlord_name: project.landlordName, landlord_phone: project.landlordPhone,
  };
}
