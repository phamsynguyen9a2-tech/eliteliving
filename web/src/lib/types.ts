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
  image?: string;
  phoneVerified?: boolean;
  isBlocked?: boolean;
  spamScore?: number;
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
  room_code?: string;
  room_title?: string;
  building_name?: string;
  address?: string;
  price?: number;
  room_image?: string;
  room_status?: 'AVAILABLE' | 'BOOKED_VIEWING' | 'RESERVED' | 'RENTED';
}

export interface HouseRule {
  id: string;
  order: number;
  category: 'PCCC' | 'SECURITY' | 'HYGIENE' | 'CIVILITY' | 'PETS' | 'UTILITIES' | 'CONTRACT';
  title: string;
  content: string;
  mandatory: boolean;
  isActive: boolean;
  penalty?: string;
}

export interface Contract {
  id: string;
  room_id: number;
  room_title: string;
  tenant_name: string;
  tenant_phone: string;
  tenant_citizen_id?: string;
  tenant_address?: string;
  landlord_name: string;
  landlord_phone?: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit_amount: number;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  created_at: string;
  rules?: string[];
  vehicle_count?: number;
  deposit_refund_condition?: string;
  tenant_signed?: boolean;
  tenant_signed_at?: string;
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

export interface AvailabilitySlot {
  id: string;
  timeSlot: string; // e.g. "08:30 - 09:30"
  period: 'morning' | 'afternoon' | 'evening';
  enabled: boolean;
}

export interface LandlordAvailability {
  landlord_id: string;
  available_days: string[]; // e.g. ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  slots: AvailabilitySlot[];
  notice_hours: number; // e.g. 2 hours before
  instructions: string;
}

export interface AuthSession {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'LANDLORD' | 'TENANT';
  avatar?: string;
  image?: string;
  landlordId?: string; // id if role is LANDLORD
  token?: string;
  phoneVerified?: boolean;
}

// ============================================================
// Roommate (Ở ghép) Types
// ============================================================

export interface RoommateProfile {
  id: string;
  user_id: string;
  gender: string;
  age?: number;
  occupation?: string;
  habits: string[];
  preferences?: string[];
  budget_min?: number;
  budget_max?: number;
  preferred_districts?: string[];
  bio?: string;
  lifestyle?: string;
  pet_friendly: boolean;
  smoking_status: boolean;
  created_at?: string;
  updated_at?: string;
  // Populated fields
  user_name?: string;
  user_image?: string;
}

export interface RoommatePost {
  id: string;
  room_id: number;
  user_id: string;
  title: string;
  description: string;
  shared_rent: number;
  max_people: number;
  current_people: number;
  gender_preference: string;
  required_habits: string[];
  status: 'OPEN' | 'CLOSED' | 'FULL';
  images: string[];
  contact_phone: string;
  district: string;
  address: string;
  created_at: string;
  expires_at: string;
  // Populated fields
  user_name?: string;
  user_image?: string;
  room_title?: string;
  compatibility_score?: number;
  request_count?: number;
}

export interface RoommateRequest {
  id: string;
  post_id: string;
  requester_id: string;
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_at: string;
  // Populated fields
  requester_name?: string;
  requester_phone?: string;
  requester_image?: string;
  requester_profile?: RoommateProfile;
  post_title?: string;
  post_owner_id?: string;
}

// ============================================================
// Handover (Bàn giao CSVC) Types
// ============================================================

export interface AssetTemplate {
  id: string;
  room_id: number;
  name: string;
  category: string;
  quantity: number;
}

export interface HandoverItem {
  id: string;
  handover_id: string;
  asset_name: string;
  category: string;
  quantity: number;
  condition: string; // Tốt, Bình thường, Hư hỏng, Mất
  photos: string[];
  note?: string;
  estimated_cost: number;
}

export interface Handover {
  id: string;
  contract_id: string;
  room_id: number;
  type: 'CHECK_IN' | 'CHECK_OUT';
  tenant_name: string;
  tenant_phone: string;
  landlord_name: string;
  status: 'DRAFT' | 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'DISPUTED';
  tenant_confirmed: boolean;
  landlord_confirmed: boolean;
  notes?: string;
  damage_cost: number;
  handover_date: string;
  created_at: string;
  // Populated
  items?: HandoverItem[];
  room_code?: string;
  room_title?: string;
}

export interface HandoverComparison {
  asset_name: string;
  category: string;
  check_in_condition: string;
  check_in_quantity: number;
  check_out_condition: string;
  check_out_quantity: number;
  has_damage: boolean;
  damage_cost: number;
  check_in_photos: string[];
  check_out_photos: string[];
}
