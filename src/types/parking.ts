export type VehicleType = 'compact' | 'sedan' | 'suv' | 'truck' | 'van' | 'ev';

export type SpaceCategory = 
  | 'all'
  | 'covered' 
  | 'ev_charging' 
  | 'daily' 
  | 'monthly' 
  | 'event' 
  | 'airport';

export type AccessType = 
  | 'instant_keypad' 
  | 'app_remote' 
  | 'qr_scanner' 
  | 'on_site_attendant' 
  | 'physical_permit';

export interface HostProfile {
  name: string;
  avatar: string;
  rating: number;
  joinedYear: number;
  responseTime: string;
  isSuperhost: boolean;
  phone?: string;
}

export interface ParkingSpace {
  id: string;
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
  category: SpaceCategory;
  images: string[];
  rating: number;
  reviewCount: number;
  isCovered: boolean;
  hasEvCharging: boolean;
  evChargerType?: string;
  isVerified: boolean;
  isDemoSeed: boolean;
  walkingDistance: string; // e.g. "3 min walk to Convention Center"
  maxVehicleType: VehicleType;
  clearanceFeet: number; // e.g. 7.2 (7ft 2in)
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
  totalPrice: number;
  status: 'active' | 'upcoming' | 'completed' | 'cancelled' | 'recovered';
  accessCode: string;
  canExtend: boolean;
  recoveryStatus?: 'none' | 'reported' | 'recovered';
  alternativeSpaceId?: string;
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
  vehicleType: VehicleType | 'all';
  category: SpaceCategory;
  minPrice: number;
  maxPrice: number;
  onlyCovered: boolean;
  onlyEvCharging: boolean;
  maxWalkingDistanceMins: number;
  sortBy: 'recommended' | 'price_asc' | 'price_desc' | 'proximity' | 'rating';
}

export interface DemandPrediction {
  hourlyMultiplier: number;
  currentDemandLevel: 'low' | 'moderate' | 'high' | 'surge';
  reason: string;
  recommendedPrice: number;
  nearbyEvents: string[];
}
