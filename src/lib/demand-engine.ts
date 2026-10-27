// ==============================================================================
// ParkMate Demand Estimation Engine
// Rule-Based, Explainable Heuristic Model for Parking Demand & Dynamic Pricing
//
// NOTE ON MODEL TRANSPARENCY:
// This is an explainable, deterministic rule-based score derived from temporal
// windows, historical neighborhood sample booking counts, and local event flags.
// No machine-learning model has been trained for this deployment.
// Demand estimates do NOT guarantee parking spot vacancy. Real-time availability
// is verified independently via calendar and gate-access records.
// ==============================================================================

export type DemandLevel = "low" | "medium" | "high";

export interface DemandFactorExplanation {
  name: string;
  scoreDelta: number;
  category: "temporal" | "location" | "event" | "trends";
  reason: string;
}

export interface EventFlag {
  id: string;
  name: string;
  venueOrArea: string;
  neighborhood: string;
  lat: number;
  lng: number;
  radiusMiles: number;
  startHour: number; // 0 - 23
  endHour: number;   // 0 - 23
  daysOfWeek: number[]; // 0 = Sun, 1 = Mon, ... 6 = Sat
  attendanceEstimate: number;
  demandBonus: number;
  description: string;
  isActive: boolean;
}

export interface DemandEstimateParams {
  destination?: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
  startTime?: string | Date;
  endTime?: string | Date;
  dayOfWeek?: number; // 0 - 6 (Sunday = 0)
  startHour?: number; // 0 - 23.99
  endHour?: number;   // 0 - 23.99
  historicalSampleBookingsCount?: number;
  totalCapacityInArea?: number;
  activeEvents?: EventFlag[];
  customSearchTrendMultiplier?: number;
}

export interface AlternativeTimeWindow {
  label: string;
  offsetHours: number;
  targetStartTimeIso: string;
  targetEndTimeIso: string;
  estimatedDemand: DemandLevel;
  priceDifferencePercent: number;
  reason: string;
}

export interface AlternativeLocation {
  name: string;
  neighborhood: string;
  distanceMiles: number;
  estimatedDemand: DemandLevel;
  avgPricePerHour: number;
  reason: string;
}

export interface DemandEstimateResult {
  score: number; // 0 to 100
  demandLevel: DemandLevel;
  label: string;
  summary: string;
  contributingFactors: DemandFactorExplanation[];
  pricingMultiplier: number;
  suggestedHourlyPriceDeltaPercent: number;
  methodology: "rule_based_heuristic";
  isMachineLearningModel: false;
  disclaimer: string;
  alternativeTimeWindows: AlternativeTimeWindow[];
  nearbyAlternativeLocations: AlternativeLocation[];
}

// Configured local event flags in San Francisco metro area
export const DEFAULT_MANUAL_EVENT_FLAGS: EventFlag[] = [
  {
    id: "evt-moscone-summit",
    name: "Moscone Center Tech Expo & Developer Summit",
    venueOrArea: "Moscone Center",
    neighborhood: "SoMa",
    lat: 37.7842,
    lng: -122.4015,
    radiusMiles: 0.8,
    startHour: 8,
    endHour: 18,
    daysOfWeek: [1, 2, 3, 4], // Mon - Thu
    attendanceEstimate: 14000,
    demandBonus: 32,
    description: "Major multi-day convention drawing heavy commuter & rideshare traffic into SoMa.",
    isActive: true,
  },
  {
    id: "evt-chase-center",
    name: "Golden State Warriors Evening Game",
    venueOrArea: "Chase Center",
    neighborhood: "Mission Bay",
    lat: 37.768,
    lng: -122.3877,
    radiusMiles: 1.2,
    startHour: 17,
    endHour: 22,
    daysOfWeek: [2, 4, 5, 6], // Tue, Thu, Fri, Sat
    attendanceEstimate: 18000,
    demandBonus: 35,
    description: "NBA arena event causing parking saturation in Mission Bay and South Beach.",
    isActive: true,
  },
  {
    id: "evt-oracle-park",
    name: "SF Giants Baseball Game",
    venueOrArea: "Oracle Park",
    neighborhood: "South Beach",
    lat: 37.7786,
    lng: -122.3893,
    radiusMiles: 1.0,
    startHour: 12,
    endHour: 17,
    daysOfWeek: [0, 5, 6], // Sun, Fri, Sat
    attendanceEstimate: 22000,
    demandBonus: 28,
    description: "High stadium traffic along the Embarcadero and South Beach corridors.",
    isActive: true,
  },
  {
    id: "evt-ferry-market",
    name: "Ferry Building Farmers & Artisan Market",
    venueOrArea: "SF Ferry Building",
    neighborhood: "Financial District",
    lat: 37.7955,
    lng: -122.3937,
    radiusMiles: 0.6,
    startHour: 8,
    endHour: 14,
    daysOfWeek: [2, 4, 6], // Tue, Thu, Sat
    attendanceEstimate: 7500,
    demandBonus: 18,
    description: "Waterfront commercial corridor foot & vehicle traffic surge.",
    isActive: true,
  },
  {
    id: "evt-broadway-nightlife",
    name: "North Beach & Chinatown Weekend Dining Peak",
    venueOrArea: "North Beach Strip",
    neighborhood: "North Beach",
    lat: 37.7995,
    lng: -122.408,
    radiusMiles: 0.7,
    startHour: 18,
    endHour: 23,
    daysOfWeek: [5, 6], // Fri, Sat
    attendanceEstimate: 9000,
    demandBonus: 22,
    description: "High restaurant and nightlife turnover with limited on-street capacity.",
    isActive: true,
  },
];

// Neighborhood baseline demand scores (reflecting density, parking meter rates, and transit connectivity)
export const NEIGHBORHOOD_BASELINES: Record<string, { baseScore: number; avgHourlyRate: number; label: string }> = {
  "financial district": { baseScore: 36, avgHourlyRate: 7.5, label: "Financial District" },
  soma: { baseScore: 32, avgHourlyRate: 7.0, label: "SoMa (South of Market)" },
  "mission bay": { baseScore: 30, avgHourlyRate: 6.5, label: "Mission Bay" },
  "nob hill": { baseScore: 22, avgHourlyRate: 5.0, label: "Nob Hill" },
  "south beach": { baseScore: 28, avgHourlyRate: 6.5, label: "South Beach" },
  mission: { baseScore: 24, avgHourlyRate: 5.5, label: "Mission District" },
  "north beach": { baseScore: 25, avgHourlyRate: 6.0, label: "North Beach" },
  marina: { baseScore: 20, avgHourlyRate: 5.0, label: "Marina District" },
  downtown: { baseScore: 35, avgHourlyRate: 7.25, label: "Downtown Metro" },
  generic: { baseScore: 20, avgHourlyRate: 5.0, label: "Metro Area" },
};

/**
 * Calculates Haversine distance in miles between two coordinates.
 */
function calculateDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Normalizes neighborhood name from address or destination text.
 */
export function resolveNeighborhood(destinationOrAddress?: string): string {
  if (!destinationOrAddress) return "generic";
  const lower = destinationOrAddress.toLowerCase();
  for (const key of Object.keys(NEIGHBORHOOD_BASELINES)) {
    if (key !== "generic" && lower.includes(key)) {
      return key;
    }
  }
  if (lower.includes("market") || lower.includes("montgomery") || lower.includes("california st")) {
    return "financial district";
  }
  if (lower.includes("howard") || lower.includes("folsom") || lower.includes("moscone")) {
    return "soma";
  }
  if (lower.includes("chase") || lower.includes("warriors") || lower.includes("16th st")) {
    return "mission bay";
  }
  if (lower.includes("pine") || lower.includes("california") || lower.includes("cathedral")) {
    return "nob hill";
  }
  return "generic";
}

/**
 * Estimates parking demand using an explainable, deterministic rule-based score.
 * Factors evaluated:
 * 1. Day of week and time window (rush hour vs mid-day vs evening vs overnight)
 * 2. Neighborhood density baseline
 * 3. Sample historical booking occupancy ratio
 * 4. Manually configured local event flags
 * 5. Search volume trend pressure
 */
export function estimateDemand(params: DemandEstimateParams): DemandEstimateResult {
  const factors: DemandFactorExplanation[] = [];
  let rawScore = 0;

  // 1. Resolve Day of Week and Time Window
  let dayOfWeek = params.dayOfWeek ?? 1; // Default to Monday
  let startHour = params.startHour ?? 9;  // Default to 9:00 AM
  let endHour = params.endHour ?? 17;     // Default to 5:00 PM

  if (params.startTime) {
    const sDate = new Date(params.startTime);
    if (!isNaN(sDate.getTime())) {
      dayOfWeek = sDate.getDay();
      startHour = sDate.getHours() + sDate.getMinutes() / 60;
    }
  }

  if (params.endTime) {
    const eDate = new Date(params.endTime);
    if (!isNaN(eDate.getTime())) {
      endHour = eDate.getHours() + eDate.getMinutes() / 60;
    }
  }

  // Ensure endHour >= startHour for calculation purposes
  if (endHour <= startHour) {
    endHour = startHour + 2; // minimum 2-hour window heuristic
  }

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayName = dayNames[dayOfWeek];

  // =========================================================================
  // Factor 1: Temporal Time Window & Day of Week
  // =========================================================================
  let temporalScore = 0;
  let temporalReason = "";

  if (!isWeekend) {
    // Weekday schedules
    if (startHour >= 7 && startHour < 10) {
      // Morning commute rush
      temporalScore = 30;
      temporalReason = `Weekday morning commute peak (${currentDayName} 07:00 - 10:00). High workforce inflow into downtown commercial hubs.`;
    } else if (startHour >= 16 && startHour < 19.5) {
      // Evening rush
      temporalScore = 26;
      temporalReason = `Weekday evening commute & dining window (${currentDayName} 16:00 - 19:30). High turnover and curb pressure.`;
    } else if (startHour >= 11.5 && startHour < 14) {
      // Midday business & lunch
      temporalScore = 18;
      temporalReason = `Weekday midday business & lunch activity (${currentDayName} 11:30 - 14:00). Steady turnover.`;
    } else if (startHour >= 10 && startHour < 16) {
      // Midday general
      temporalScore = 14;
      temporalReason = `Standard weekday daytime window (${currentDayName} 10:00 - 16:00). Normal commercial occupancy.`;
    } else if (startHour >= 22 || startHour < 6) {
      // Overnight
      temporalScore = 2;
      temporalReason = `Overnight low-activity hours (${currentDayName} 22:00 - 06:00). Minimal commercial parking demand.`;
    } else {
      temporalScore = 10;
      temporalReason = `Standard off-peak daytime window (${currentDayName}).`;
    }
  } else {
    // Weekend schedules
    if (startHour >= 18 && startHour < 23) {
      // Weekend nightlife & entertainment peak
      temporalScore = 28;
      temporalReason = `Weekend evening entertainment & dining surge (${currentDayName} 18:00 - 23:00). High leisure congestion.`;
    } else if (startHour >= 10 && startHour < 17) {
      // Weekend daytime shopping & recreational
      temporalScore = 20;
      temporalReason = `Weekend daytime shopping and recreational traffic (${currentDayName} 10:00 - 17:00).`;
    } else if (startHour >= 23 || startHour < 7) {
      // Weekend overnight
      temporalScore = 3;
      temporalReason = `Weekend overnight hours (${currentDayName} 23:00 - 07:00). Ample residential and street availability.`;
    } else {
      temporalScore = 8;
      temporalReason = `Weekend morning quiet window (${currentDayName}).`;
    }
  }

  rawScore += temporalScore;
  factors.push({
    name: "Day & Time Window",
    scoreDelta: temporalScore,
    category: "temporal",
    reason: temporalReason,
  });

  // =========================================================================
  // Factor 2: Neighborhood Baseline Density
  // =========================================================================
  const resolvedNbhd = resolveNeighborhood(params.neighborhood || params.destination);
  const nbhdData = NEIGHBORHOOD_BASELINES[resolvedNbhd] || NEIGHBORHOOD_BASELINES.generic;
  const locationScore = nbhdData.baseScore;

  rawScore += locationScore;
  factors.push({
    name: `Neighborhood Baseline (${nbhdData.label})`,
    scoreDelta: locationScore,
    category: "location",
    reason: `Baseline urban density for ${nbhdData.label}. Commercial hub with parking meter enforcement and high commuter transit density.`,
  });

  // =========================================================================
  // Factor 3: Sample / Historical Booking Occupancy Ratio
  // =========================================================================
  const sampleBookings = params.historicalSampleBookingsCount ?? 3;
  const areaCapacity = Math.max(sampleBookings, params.totalCapacityInArea ?? 5);
  const occupancyRatio = areaCapacity > 0 ? sampleBookings / areaCapacity : 0.5;

  let occupancyScore = 0;
  let occupancyReason = "";

  if (occupancyRatio >= 0.8) {
    occupancyScore = 25;
    occupancyReason = `High historical sample utilization (${Math.round(occupancyRatio * 100)}% capacity filled in this district bucket). Spaces book out rapidly.`;
  } else if (occupancyRatio >= 0.5) {
    occupancyScore = 15;
    occupancyReason = `Moderate historical sample utilization (${Math.round(occupancyRatio * 100)}% capacity active). Healthy steady demand.`;
  } else {
    occupancyScore = 5;
    occupancyReason = `Low historical sample utilization (${Math.round(occupancyRatio * 100)}% capacity active). Plenty of open spaces historically.`;
  }

  rawScore += occupancyScore;
  factors.push({
    name: "Historical Sample Booking Occupancy",
    scoreDelta: occupancyScore,
    category: "trends",
    reason: occupancyReason,
  });

  // =========================================================================
  // Factor 4: Manually Configured Local Event Flags
  // =========================================================================
  const activeEvents = params.activeEvents || DEFAULT_MANUAL_EVENT_FLAGS;
  let eventScore = 0;

  for (const event of activeEvents) {
    if (!event.isActive) continue;

    // Check if day of week matches event schedule
    const matchesDay = event.daysOfWeek.includes(dayOfWeek);

    // Check if time window overlaps event hours
    const eventStarts = event.startHour;
    const eventEnds = event.endHour;
    const timeOverlaps = startHour < eventEnds && endHour > eventStarts;

    // Check distance proximity if coordinates are available
    let withinProximity = false;
    if (params.lat !== undefined && params.lng !== undefined) {
      const dist = calculateDistanceMiles(params.lat, params.lng, event.lat, event.lng);
      withinProximity = dist <= event.radiusMiles;
    } else {
      // Fallback to neighborhood text match
      const destLower = (params.destination || "").toLowerCase();
      const nbhdLower = (params.neighborhood || "").toLowerCase();
      withinProximity =
        destLower.includes(event.neighborhood.toLowerCase()) ||
        nbhdLower.includes(event.neighborhood.toLowerCase()) ||
        destLower.includes(event.venueOrArea.toLowerCase());
    }

    if (matchesDay && timeOverlaps && withinProximity) {
      eventScore += event.demandBonus;
      factors.push({
        name: `Local Event: ${event.name}`,
        scoreDelta: event.demandBonus,
        category: "event",
        reason: `${event.description} (~${event.attendanceEstimate.toLocaleString()} expected attendees within ${event.radiusMiles} mi).`,
      });
    }
  }

  rawScore += eventScore;

  // =========================================================================
  // Factor 5: Search Query Volume & Demand Pressure Trend
  // =========================================================================
  const trendMultiplier = params.customSearchTrendMultiplier ?? 1.0;
  if (trendMultiplier > 1.1) {
    const trendScore = Math.min(15, Math.round((trendMultiplier - 1.0) * 35));
    rawScore += trendScore;
    factors.push({
      name: "Driver Search Volume Trend",
      scoreDelta: trendScore,
      category: "trends",
      reason: `Elevated search query traffic detected (+${Math.round((trendMultiplier - 1.0) * 100)}% above baseline baseline queries).`,
    });
  }

  // Clamp composite score between 5 and 100
  const finalScore = Math.max(5, Math.min(100, rawScore));

  // Determine Categorical Demand Level
  let demandLevel: DemandLevel = "low";
  let label = "Low Demand";
  let summary = "Ample parking availability typically expected. Standard pricing applies.";
  let pricingMultiplier = 1.0;
  let suggestedHourlyPriceDeltaPercent = 0;

  if (finalScore >= 70) {
    demandLevel = "high";
    label = "High Demand";
    summary = "High parking demand forecasted due to commute peaks or local events. Spaces fill quickly.";
    pricingMultiplier = 1.35;
    suggestedHourlyPriceDeltaPercent = 35;
  } else if (finalScore >= 40) {
    demandLevel = "medium";
    label = "Moderate Demand";
    summary = "Steady parking activity expected. Normal to moderately fast turnover.";
    pricingMultiplier = 1.15;
    suggestedHourlyPriceDeltaPercent = 15;
  } else {
    demandLevel = "low";
    label = "Low Demand";
    summary = "Low demand window. Uncrowded with ample spaces available.";
    pricingMultiplier = 1.0;
    suggestedHourlyPriceDeltaPercent = 0;
  }

  // =========================================================================
  // Generate Driver Alternative Recommendations (Time Windows & Locations)
  // =========================================================================
  const alternativeTimeWindows: AlternativeTimeWindow[] = [];
  const nearbyAlternativeLocations: AlternativeLocation[] = [];

  // Generate alternative time windows if demand is medium or high
  if (demandLevel === "high" || demandLevel === "medium") {
    // Use params.startTime/endTime if provided, or a stable deterministic anchor date for prerendering
    const baseDateIso = params.startTime || "2026-10-27T08:00:00.000Z";
    const baseEndDateIso = params.endTime || "2026-10-27T17:00:00.000Z";

    // 1. Earlier shift option
    const earlierStartHour = Math.max(6, startHour - 1.5);
    const earlierEndHour = Math.max(7, endHour - 1.5);

    const earlierDate = new Date(baseDateIso);
    earlierDate.setHours(Math.floor(earlierStartHour), (earlierStartHour % 1) * 60, 0, 0);
    const earlierEndDate = new Date(baseEndDateIso);
    earlierEndDate.setHours(Math.floor(earlierEndHour), (earlierEndHour % 1) * 60, 0, 0);

    alternativeTimeWindows.push({
      label: "Shift 1.5 Hours Earlier",
      offsetHours: -1.5,
      targetStartTimeIso: earlierDate.toISOString(),
      targetEndTimeIso: earlierEndDate.toISOString(),
      estimatedDemand: demandLevel === "high" ? "medium" : "low",
      priceDifferencePercent: -20,
      reason: "Arrive before peak commuter influx to secure lower rates and guaranteed curb flow.",
    });

    // 2. Later shift option
    const laterStartHour = Math.min(21, startHour + 2);
    const laterEndHour = Math.min(23.5, endHour + 2);
    const laterDate = new Date(baseDateIso);
    laterDate.setHours(Math.floor(laterStartHour), (laterStartHour % 1) * 60, 0, 0);
    const laterEndDate = new Date(baseEndDateIso);
    laterEndDate.setHours(Math.floor(laterEndHour), (laterEndHour % 1) * 60, 0, 0);

    alternativeTimeWindows.push({
      label: "Shift 2 Hours Later",
      offsetHours: 2.0,
      targetStartTimeIso: laterDate.toISOString(),
      targetEndTimeIso: laterEndDate.toISOString(),
      estimatedDemand: "low",
      priceDifferencePercent: -25,
      reason: "Depart after peak rush clears for relaxed parking and lower surge pricing.",
    });
  }

  // Generate alternative nearby lower-demand locations
  if (resolvedNbhd === "financial district" || resolvedNbhd === "soma" || resolvedNbhd === "downtown") {
    nearbyAlternativeLocations.push({
      name: "Nob Hill Residential Corridor",
      neighborhood: "Nob Hill",
      distanceMiles: 0.55,
      estimatedDemand: "medium",
      avgPricePerHour: 5.0,
      reason: "Only 7 min walk away with 30% lower demand pressure and residential driveway options.",
    });
    nearbyAlternativeLocations.push({
      name: "South Beach Surface Lots",
      neighborhood: "South Beach",
      distanceMiles: 0.85,
      estimatedDemand: "low",
      avgPricePerHour: 5.5,
      reason: "Open-air bays with rapid ingress, less congested than core Financial District.",
    });
  } else if (resolvedNbhd === "mission bay") {
    nearbyAlternativeLocations.push({
      name: "Potrero Hill North Slope",
      neighborhood: "Potrero Hill",
      distanceMiles: 0.9,
      estimatedDemand: "low",
      avgPricePerHour: 4.5,
      reason: "Spacious curbside driveways just outside the Chase Center event perimeter.",
    });
  } else {
    nearbyAlternativeLocations.push({
      name: "Downtown Transit Bay",
      neighborhood: "Financial District",
      distanceMiles: 0.7,
      estimatedDemand: "medium",
      avgPricePerHour: 6.5,
      reason: "Covered security garage near rapid transit lines.",
    });
  }

  return {
    score: finalScore,
    demandLevel,
    label,
    summary,
    contributingFactors: factors,
    pricingMultiplier,
    suggestedHourlyPriceDeltaPercent,
    methodology: "rule_based_heuristic",
    isMachineLearningModel: false,
    disclaimer:
      "Explainable rule-based estimate based on temporal patterns, historical sample booking ratios, and event schedules. Does NOT guarantee spot vacancy or real-time space availability.",
    alternativeTimeWindows,
    nearbyAlternativeLocations,
  };
}
