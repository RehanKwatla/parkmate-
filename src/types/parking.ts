import { Database, UserRole } from "./database";

export type VehicleType = "compact" | "sedan" | "suv" | "truck" | "van" | "ev";

export type SpaceCategory =
  | "all"
  | "covered"
  | "ev_charging"
  | "daily"
  | "monthly"
  | "event"
  | "airport";

export type AccessType =
  | "instant_keypad"
  | "app_remote"
  | "qr_scanner"
  | "on_site_attendant"
  | "physical_permit";

export interface HostProfile {
  id?: string;
  name: string;
  avatar: string;
  rating: number;
  joinedYear: number;
  responseTime: string;
  isSuperhost: boolean;
  phone?: string;
  email?: string;
  role?: UserRole;
}

export interface ParkingSpace {
  id: string;
  ownerId?: string;
  title: string;
  description: string;
  address: string;
  neighborhood: string;
  city: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  pricePerHour: number;
  pricePerDay: number;
  pricePerMonth?: number;
  category: SpaceCategory;
  images: string[];
  rating: number;
  reviewCount: number;
  isCovered: boolean;
  hasEvCharging: boolean;
  evChargerType?: string;
  isVerified: boolean;
  isDemoSeed: boolean;
  publicationStatus?: "draft" | "published" | "paused" | "archived";
  verificationStatus?: "pending" | "verified" | "rejected";
  isAuthorized?: boolean;
  spaceDimensions?: string;
  heightClearanceInches?: number;
  isAccessible?: boolean;
  draftStep?: number;
  walkingDistance: string;
  maxVehicleType: VehicleType;
  clearanceFeet: number;
  accessType: AccessType;
  accessInstructions: string;
  securityFeatures: string[];
  host: HostProfile;
  rules: string[];
  recoveryGuaranteed: boolean;
  flexibleExtensionSupported: boolean;
  availableSlotsCount: number;
}

export interface Booking {
  id: string;
  bookingReference?: string;
  driverId?: string;
  spaceId: string;
  spaceTitle: string;
  spaceAddress: string;
  spaceImage: string;
  startTime: string;
  endTime: string;
  vehicleModel: string;
  vehicleType: VehicleType;
  licensePlate: string;
  hourlyRate: number;
  subtotal?: number;
  serviceFee?: number;
  tax?: number;
  totalPrice: number;
  status: "active" | "upcoming" | "completed" | "cancelled" | "recovered" | "pending" | "confirmed" | "access_issue";
  paymentStatus?: "pending" | "paid" | "refunded" | "failed";
  accessCode: string;
  canExtend: boolean;
  recoveryStatus?: "none" | "reported" | "recovered";
  alternativeSpaceId?: string;
  createdAt?: string;
}

export interface VehiclePreset {
  id: VehicleType;
  name: string;
  category: string;
  heightFeet: number;
  description: string;
}

export interface FilterState {
  destination: string;
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
  vehicleType: VehicleType | "all";
  category: SpaceCategory;
  minPrice: number;
  maxPrice: number;
  onlyCovered: boolean;
  onlyEvCharging: boolean;
  maxWalkingDistanceMins: number;
  sortBy: "recommended" | "price_asc" | "price_desc" | "proximity" | "rating";
}

export interface DemandPrediction {
  hourlyMultiplier: number;
  currentDemandLevel: "low" | "moderate" | "high" | "surge";
  reason: string;
  recommendedPrice: number;
  nearbyEvents: string[];
}

export type SpaceRow = Database["public"]["Tables"]["parking_spaces"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

export function mapDbSpaceToParkingSpace(
  dbSpace: SpaceRow,
  hostProfile?: Partial<ProfileRow> | null
): ParkingSpace {
  return {
    id: dbSpace.id,
    ownerId: dbSpace.owner_id,
    title: dbSpace.title,
    description: dbSpace.description,
    address: dbSpace.address,
    neighborhood: dbSpace.neighborhood,
    city: dbSpace.city,
    coordinates: {
      lat: Number(dbSpace.latitude),
      lng: Number(dbSpace.longitude),
    },
    pricePerHour: Number(dbSpace.price_per_hour),
    pricePerDay: Number(dbSpace.price_per_day),
    pricePerMonth: dbSpace.price_per_month ? Number(dbSpace.price_per_month) : undefined,
    category: dbSpace.category as SpaceCategory,
    images: dbSpace.photos && dbSpace.photos.length > 0 ? dbSpace.photos : [
      "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80"
    ],
    rating: Number(dbSpace.rating),
    reviewCount: dbSpace.review_count,
    isCovered: dbSpace.is_covered,
    hasEvCharging: dbSpace.has_ev_charging,
    evChargerType: dbSpace.ev_charger_type || undefined,
    isVerified: dbSpace.verification_status === "verified",
    isDemoSeed: dbSpace.is_demo_seed,
    publicationStatus: dbSpace.publication_status,
    verificationStatus: dbSpace.verification_status,
    isAuthorized: dbSpace.is_authorized,
    spaceDimensions: dbSpace.space_dimensions || undefined,
    heightClearanceInches: dbSpace.height_clearance_inches ? Number(dbSpace.height_clearance_inches) : undefined,
    isAccessible: dbSpace.is_accessible,
    draftStep: dbSpace.draft_step || 1,
    walkingDistance: dbSpace.walking_distance,
    maxVehicleType: dbSpace.max_vehicle_type as VehicleType,
    clearanceFeet: Number(dbSpace.clearance_feet),
    accessType: dbSpace.access_type as AccessType,
    accessInstructions: dbSpace.access_instructions,
    securityFeatures: dbSpace.security_features || [],
    host: {
      id: hostProfile?.id || dbSpace.owner_id,
      name: hostProfile?.display_name || "Verified Space Host",
      avatar:
        hostProfile?.avatar_url ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      rating: 4.95,
      joinedYear: 2024,
      responseTime: hostProfile?.response_time || "under 10 mins",
      isSuperhost: hostProfile?.is_superhost ?? true,
      phone: hostProfile?.phone || undefined,
      email: hostProfile?.email || undefined,
      role: hostProfile?.role || "owner",
    },
    rules: dbSpace.rules || [],
    recoveryGuaranteed: dbSpace.recovery_guaranteed,
    flexibleExtensionSupported: dbSpace.flexible_extension_supported,
    availableSlotsCount: dbSpace.available_slots_count,
  };
}
