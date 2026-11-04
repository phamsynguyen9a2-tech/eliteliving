import { calculateHaversineDistance } from './recommender-core';

export interface RoomLocation {
  latitude: number;
  longitude: number;
}

export interface DiscoverableRoom extends RoomLocation {
  price: number;
  amenities: string[];
}

export function getGeoBoundingBox(lat: number, lng: number, radiusKm: number) {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}

export function distanceFromCenter(room: RoomLocation, lat: number, lng: number) {
  return calculateHaversineDistance(lat, lng, room.latitude, room.longitude);
}

export function roomMatchesRadius(room: RoomLocation, lat: number, lng: number, radiusKm: number) {
  return distanceFromCenter(room, lat, lng) <= radiusKm;
}

/** Điều kiện AND dùng chung cho ca kiểm thử ngân sách + bán kính + tiện ích. */
export function roomMatchesDiscoveryFilters(
  room: DiscoverableRoom,
  filters: { lat: number; lng: number; radiusKm: number; minPrice?: number; maxPrice?: number; amenities?: string[] }
) {
  if (!roomMatchesRadius(room, filters.lat, filters.lng, filters.radiusKm)) return false;
  if (filters.minPrice !== undefined && room.price < filters.minPrice) return false;
  if (filters.maxPrice !== undefined && room.price > filters.maxPrice) return false;
  return (filters.amenities || []).every((amenity) => room.amenities.includes(amenity));
}
