// ==============================================================================
// ParkMate Vehicle Compatibility Engine
// Enforces hard physical constraints (clearance, dimensions, vehicle restrictions,
// and temporal availability) with configurable safety margins.
// ==============================================================================

import { VehicleType, ParkingSpace } from "@/types/parking";

export interface VehicleProfile {
  id: VehicleType;
  name: string;
  category: string;
  heightFeet: number;
  lengthFeet: number;
  widthFeet: number;
  minClearanceFeet: number;
  description: string;
}

export interface SafetyMargins {
  heightFeet: number; // Buffer above vehicle roof (e.g. 0.3 ft ~ 3.6 inches)
  lengthFeet: number; // Front/rear bumper margin (e.g. 0.5 ft ~ 6 inches)
  widthFeet: number;  // Side/door clearance margin (e.g. 0.5 ft ~ 6 inches)
}

export const DEFAULT_SAFETY_MARGINS: SafetyMargins = {
  heightFeet: 0.3,
  lengthFeet: 0.5,
  widthFeet: 0.5,
};

export const DETAILED_VEHICLE_PROFILES: Record<VehicleType, VehicleProfile> = {
  compact: {
    id: "compact",
    name: "Compact / Mini",
    category: "Mini Cooper, Fiat 500, VW Golf, Honda Civic",
    heightFeet: 4.8,
    lengthFeet: 14.5,
    widthFeet: 5.8,
    minClearanceFeet: 5.2,
    description: "Compact bay compatible. Lowest clearance requirement.",
  },
  sedan: {
    id: "sedan",
    name: "Sedan / Mid-Size",
    category: "Toyota Camry, Honda Accord, Tesla Model 3, BMW 3 Series",
    heightFeet: 4.9,
    lengthFeet: 16.0,
    widthFeet: 6.0,
    minClearanceFeet: 5.5,
    description: "Standard residential and parking deck clearance.",
  },
  suv: {
    id: "suv",
    name: "SUV / Crossover",
    category: "Honda CR-V, Toyota RAV4, Ford Explorer, Tesla Model Y",
    heightFeet: 5.8,
    lengthFeet: 16.8,
    widthFeet: 6.5,
    minClearanceFeet: 6.5,
    description: "Requires minimum 6'5\" ceiling clearance.",
  },
  truck: {
    id: "truck",
    name: "Full-Size Pickup Truck",
    category: "Ford F-150, Chevy Silverado, Ram 1500, Rivian R1T",
    heightFeet: 6.5,
    lengthFeet: 19.5,
    widthFeet: 6.8,
    minClearanceFeet: 7.0,
    description: "Requires 7'0\"+ clearance and extended bay length (20ft+).",
  },
  van: {
    id: "van",
    name: "Commercial Van / Sprinter",
    category: "Mercedes Sprinter, Ford Transit, Ram ProMaster",
    heightFeet: 7.8,
    lengthFeet: 20.5,
    widthFeet: 6.8,
    minClearanceFeet: 8.5,
    description: "High-roof vehicle. Cannot enter underground residential garages.",
  },
  ev: {
    id: "ev",
    name: "Electric Vehicle (All)",
    category: "Tesla, Hyundai Ioniq, Porsche Taycan, Lucid Air",
    heightFeet: 5.2,
    lengthFeet: 15.8,
    widthFeet: 6.2,
    minClearanceFeet: 5.8,
    description: "Optimized for spaces offering Level 2 or DC Fast Charging.",
  },
};

// Hierarchy of space vehicle capacity:
// compact < sedan = ev < suv < truck = van
const VEHICLE_TIER: Record<VehicleType, number> = {
  compact: 1,
  sedan: 2,
  ev: 2,
  suv: 3,
  truck: 4,
  van: 4,
};

export interface VehicleQueryInput {
  vehicleType?: VehicleType | "all";
  customHeightFeet?: number;
  customLengthFeet?: number;
  customWidthFeet?: number;
}

export interface CompatibilityResult {
  isCompatible: boolean;
  reasons: string[];
  clearanceBufferFeet: number;
  fitScore: number; // 0 to 100 for ranking comfort
  details: {
    vehicleHeight: number;
    spaceClearance: number;
    requiredClearance: number;
    vehicleLength: number;
    spaceLength: number;
    vehicleWidth: number;
    spaceWidth: number;
    fitsClearance: boolean;
    fitsDimensions: boolean;
    fitsVehicleType: boolean;
  };
}

/**
 * Parses space dimensions string (e.g. "18ft x 9ft" or "20x10" or "19.5 x 8")
 */
export function parseSpaceDimensions(dimStr?: string | null): { lengthFeet: number; widthFeet: number } {
  if (!dimStr) return { lengthFeet: 18.0, widthFeet: 9.0 }; // Standard US parking space default

  const matches = dimStr.match(/(\d+(\.\d+)?)\s*(?:ft|')?\s*[xX*by]\s*(\d+(\.\d+)?)\s*(?:ft|')?/);
  if (matches && matches[1] && matches[3]) {
    const l = parseFloat(matches[1]);
    const w = parseFloat(matches[3]);
    if (!isNaN(l) && !isNaN(w) && l > 0 && w > 0) {
      return { lengthFeet: Math.max(l, w), widthFeet: Math.min(l, w) };
    }
  }

  return { lengthFeet: 18.0, widthFeet: 9.0 };
}

/**
 * Evaluates hard physical constraints between a vehicle and a parking space.
 * Enforces:
 * 1. Height clearance >= vehicle height + safety margin
 * 2. Vehicle type capacity tier
 * 3. Physical bay length and width >= vehicle dimensions + safety margins
 */
export function evaluateVehicleCompatibility(
  space: ParkingSpace,
  vehicleInput: VehicleQueryInput,
  margins: SafetyMargins = DEFAULT_SAFETY_MARGINS
): CompatibilityResult {
  // If user selected "all", treat as generic standard sedan compatibility
  const vehicleType = (!vehicleInput.vehicleType || vehicleInput.vehicleType === "all")
    ? "sedan"
    : vehicleInput.vehicleType;

  const profile = DETAILED_VEHICLE_PROFILES[vehicleType] || DETAILED_VEHICLE_PROFILES.sedan;

  // Determine effective vehicle dimensions (user custom dimensions override profile)
  const vehicleHeight = vehicleInput.customHeightFeet && vehicleInput.customHeightFeet > 0
    ? vehicleInput.customHeightFeet
    : profile.heightFeet;

  const vehicleLength = vehicleInput.customLengthFeet && vehicleInput.customLengthFeet > 0
    ? vehicleInput.customLengthFeet
    : profile.lengthFeet;

  const vehicleWidth = vehicleInput.customWidthFeet && vehicleInput.customWidthFeet > 0
    ? vehicleInput.customWidthFeet
    : profile.widthFeet;

  const spaceClearance = space.clearanceFeet;
  const parsedDims = parseSpaceDimensions(space.spaceDimensions);

  const requiredClearance = vehicleHeight + margins.heightFeet;
  const requiredLength = vehicleLength + margins.lengthFeet;
  const requiredWidth = vehicleWidth + margins.widthFeet;

  const fitsClearance = spaceClearance >= requiredClearance;
  const fitsLength = parsedDims.lengthFeet >= requiredLength;
  const fitsWidth = parsedDims.widthFeet >= requiredWidth;
  const fitsDimensions = fitsLength && fitsWidth;

  // Space max vehicle type check
  const spaceTier = VEHICLE_TIER[space.maxVehicleType] ?? 3;
  const vehicleTier = VEHICLE_TIER[vehicleType] ?? 2;
  const fitsVehicleType = spaceTier >= vehicleTier;

  const reasons: string[] = [];

  if (!fitsClearance) {
    const deficitInches = Math.round((requiredClearance - spaceClearance) * 12);
    reasons.push(
      `Height clearance of ${spaceClearance.toFixed(1)} ft is too low for your ${profile.name} (requires ${requiredClearance.toFixed(1)} ft with safety margin; short by ${deficitInches} in).`
    );
  }

  if (!fitsVehicleType) {
    reasons.push(
      `Space is designated for max vehicle size "${space.maxVehicleType.toUpperCase()}", which cannot accommodate a "${vehicleType.toUpperCase()}".`
    );
  }

  if (!fitsDimensions) {
    if (!fitsLength) {
      reasons.push(
        `Bay length of ${parsedDims.lengthFeet.toFixed(1)} ft cannot fit your ${vehicleLength.toFixed(1)} ft vehicle with safety buffer.`
      );
    }
    if (!fitsWidth) {
      reasons.push(
        `Bay width of ${parsedDims.widthFeet.toFixed(1)} ft is too narrow for door clearance (requires ${requiredWidth.toFixed(1)} ft).`
      );
    }
  }

  const isCompatible = fitsClearance && fitsVehicleType && fitsDimensions;
  const clearanceBufferFeet = Number((spaceClearance - vehicleHeight).toFixed(2));

  // Compute a 0-100 fit comfort score for ranking
  let fitScore = 0;
  if (isCompatible) {
    // Generous buffer gives higher score, up to 100
    const bufferScore = Math.min(Math.max((clearanceBufferFeet - margins.heightFeet) * 30, 20), 50);
    const dimScore = Math.min((parsedDims.lengthFeet - vehicleLength) * 10 + (parsedDims.widthFeet - vehicleWidth) * 15, 50);
    fitScore = Math.round(bufferScore + dimScore);
  }

  return {
    isCompatible,
    reasons,
    clearanceBufferFeet,
    fitScore,
    details: {
      vehicleHeight,
      spaceClearance,
      requiredClearance: Number(requiredClearance.toFixed(2)),
      vehicleLength,
      spaceLength: parsedDims.lengthFeet,
      vehicleWidth,
      spaceWidth: parsedDims.widthFeet,
      fitsClearance,
      fitsDimensions,
      fitsVehicleType,
    },
  };
}
