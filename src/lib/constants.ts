import { SpaceCategory, VehiclePreset } from "@/types/parking";

export const VEHICLE_PRESETS: VehiclePreset[] = [
  {
    id: "compact",
    name: "Compact / Hatchback",
    category: "Mini, Fiat 500, Golf, Civic",
    heightFeet: 4.8,
    description: "Fits any standard or compact spot.",
  },
  {
    id: "sedan",
    name: "Sedan / Mid-Size",
    category: "Camry, Accord, Model 3, C-Class",
    heightFeet: 4.9,
    description: "Standard residential and garage clearance.",
  },
  {
    id: "suv",
    name: "SUV / Crossover",
    category: "CR-V, RAV4, Explorer, Model Y",
    heightFeet: 5.8,
    description: "Requires minimum 6'0\" ceiling clearance.",
  },
  {
    id: "truck",
    name: "Full-Size Truck / Van",
    category: "F-150, Silverado, Ram 1500, Sprinter",
    heightFeet: 6.8,
    description: "Requires 7'0\"+ clearance and extended bay length.",
  },
  {
    id: "ev",
    name: "Electric Vehicle (EV)",
    category: "Tesla, Taycan, Ioniq, Rivian",
    heightFeet: 5.5,
    description: "Filtered for Level 2 or DC Fast Charging compatibility.",
  },
];

export interface CategoryItem {
  id: SpaceCategory;
  label: string;
  description: string;
  iconName: string;
}

export const CATEGORIES: CategoryItem[] = [
  { id: "all", label: "All Spaces", description: "View every verified parking spot", iconName: "LayoutGrid" },
  { id: "covered", label: "Covered & Garage", description: "Protected from sun, snow, and rain", iconName: "Warehouse" },
  { id: "ev_charging", label: "EV Charging", description: "Level 2 and DC Fast Charging on-site", iconName: "Zap" },
  { id: "daily", label: "Daily Pass", description: "Guaranteed flat-rate all-day parking", iconName: "Calendar" },
  { id: "monthly", label: "Monthly Reserved", description: "Dedicated spot with monthly billing", iconName: "Clock" },
  { id: "event", label: "Stadium & Events", description: "Close to arenas, theatres, and venues", iconName: "Ticket" },
  { id: "airport", label: "Airport Parking", description: "Long-term lots with shuttle/train access", iconName: "Plane" },
];

export const DEFAULT_CITY = "Pune";
export const DEFAULT_STATE = "Maharashtra";
export const DEFAULT_PUNE_COORDINATES = { lat: 18.5204, lng: 73.8567, zoom: 12 };

export const POPULAR_DESTINATIONS = [
  { name: "Hinjawadi Infotech Park", city: "Pune, Maharashtra", spotsCount: 48 },
  { name: "Shivajinagar & FC Road", city: "Pune, Maharashtra", spotsCount: 65 },
  { name: "Koregaon Park (North Main Rd)", city: "Pune, Maharashtra", spotsCount: 38 },
  { name: "Baner High Street", city: "Pune, Maharashtra", spotsCount: 52 },
  { name: "Viman Nagar & Phoenix Mall", city: "Pune, Maharashtra", spotsCount: 44 },
  { name: "Kothrud & Karve Road", city: "Pune, Maharashtra", spotsCount: 36 },
  { name: "Wakad & Bhumkar Chowk", city: "Pune, Maharashtra", spotsCount: 40 },
  { name: "Magarpatta Cybercity (Hadapsar)", city: "Pune, Maharashtra", spotsCount: 42 },
  { name: "Kharadi EON Free Zone", city: "Pune, Maharashtra", spotsCount: 34 },
  { name: "Pimpri-Chinchwad (PCMC)", city: "Pune, Maharashtra", spotsCount: 29 },
];
