export type RoomStatus = 'AVAILABLE' | 'BOOKED_VIEWING' | 'RESERVED' | 'RENTED';

export interface Room {
  id: number;
  room_code: string;
  project_code?: string;
  project_name?: string;
  floor?: number;
  unit_number?: number;
  has_balcony?: boolean;
  distance_to_huit_km?: number;
  title: string;
  price: number;
  deposit: number;
  area: number;
  room_type: string;
  address: string;
  district: string;
  latitude: number;
  longitude: number;
  amenities: string[];
  images: string[];
  status: RoomStatus;
  landlord_id: string;
  landlord_name: string;
  landlord_phone: string;
  electricity_rate: number;
  water_rate: number;
  internet_fee: number;
  service_fee: number;
  parking_fee: number;
  description: string;
  detail_url?: string;
  score?: number; // recommendation score
  calculated_distance?: number;
}

export interface Building {
  code: string;
  name: string;
  address: string;
  district: string;
  latitude: number;
  longitude: number;
  distance_to_huit_km: number;
  min_price: number;
  max_price: number;
  total_rooms: number;
  available_rooms: number;
  booked_rooms: number;
  rented_rooms: number;
  featured_image: string;
  images: string[];
  amenities: string[];
  landlord_id: string;
  landlord_name: string;
  landlord_phone: string;
  rooms?: Room[];
}

export interface Landlord {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'LANDLORD';
  avatar: string;
}

export interface UserPreference {
  budget_max: number;
  preferred_district: string;
  preferred_amenities: string[];
  target_lat: number;
  target_lng: number;
  max_radius_km: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'TENANT' | 'LANDLORD' | 'ADMIN';
  preferences?: UserPreference;
}

export interface Appointment {
  id: string;
  room_id: number;
  user_id: string;
  user_name: string;
  user_phone: string;
  date: string; // YYYY-MM-DD
  time_slot: string; // e.g., '09:00 - 10:00'
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  created_at: string;
  notes?: string;
}

export interface Contract {
  id: string;
  room_id: number;
  room_title: string;
  tenant_name: string;
  tenant_phone: string;
  landlord_name: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit_amount: number;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  created_at: string;
}

export interface UtilityBill {
  id: string;
  room_id: number;
  room_code: string;
  month: string; // MM/YYYY
  electric_old: number;
  electric_new: number;
  electric_used: number;
  electric_cost: number;
  water_old: number;
  water_new: number;
  water_used: number;
  water_cost: number;
  internet_cost: number;
  service_cost: number;
  rent_cost: number;
  total_amount: number;
  status: 'UNPAID' | 'PAID';
  created_at: string;
}

export interface InteractionLog {
  interaction_id: number;
  user_id: string;
  room_id: number;
  action: 'VIEW' | 'BOOKMARK' | 'BOOK_VIEWING';
  timestamp: string;
  rating: number;
}
