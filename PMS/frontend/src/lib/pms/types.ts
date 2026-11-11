// Backend (Django REST) cevaplarının şekli. Alan adları API ile birebir aynıdır (snake_case).
// ID'ler UUID string'dir. DRF, Decimal alanları string olarak gönderir ("120.00").

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";
export type ReservationSource = "direct" | "airbnb" | "booking" | "other";
export type TaskStatus = "pending" | "in_progress" | "completed";

export interface PropertyImage {
  id: number;
  property: string;
  image: string;
  alt_text: string;
}

export interface Property {
  id: string;
  name: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  postal_code: string;
  max_guests: number;
  bedroom_count: number;
  bed_count: number;
  bathroom_count: number;
  area: string;
  base_price: string;
  is_active: boolean;
  images: PropertyImage[];
  created_at: string;
  updated_at: string;
}

export interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  nationality: string;
  notes: string | null;
  identity_number_masked: string; // identity_number sadece yazılır, okunmaz
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  property: string; // property id
  guest: string; // guest id
  check_in: string; // yyyy-MM-dd
  check_out: string;
  adults: number;
  children: number;
  total_price: string;
  currency: string;
  status: ReservationStatus;
  source: ReservationSource;
  special_requests: string;
  created_at: string;
  updated_at: string;
}

export interface StayRecord {
  id: string;
  reservation: string;
  actual_check_in: string | null;
  actual_check_out: string | null;
  notes: string;
}

export interface HousekeepingTask {
  id: string;
  property: string;
  reservation: string | null;
  assigned_to: number | null;
  status: TaskStatus;
  scheduled_date: string;
  completed_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface GeneralTask {
  id: string;
  property: string;
  description: string;
  assigned_to: number | null;
  due_date: string;
  completed_date: string | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}
