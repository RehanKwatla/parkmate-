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

// Configured local event flags in Pune metro area
export const DEFAULT_MANUAL_EVENT_FLAGS: EventFlag[] = [
  {
    id: "evt-hinjawadi-tech-summit",
    name: "Hinjawadi Infotech Summit & Commuter Rush",
    venueOrArea: "Rajiv Gandhi Infotech Park Phase 1",
    neighborhood: "Hinjawadi",
    lat: 18.5913,
    lng: 73.7389,
    radiusMiles: 1.2,
    startHour: 8,
    endHour: 19,
    daysOfWeek: [1, 2, 3, 4, 5], // Mon - Fri
    attendanceEstimate: 25000,
    demandBonus: 32,
    description: "Peak corporate commuter traffic across Phase 1 & 2 IT corridors.",
    isActive: true,
  },
  {
    id: "evt-fc-road-weekend",
    name: "FC Road & Fergusson College Cultural & Dining Peak",
    venueOrArea: "Fergusson College Road",
    neighborhood: "FC Road",
    lat: 18.5186,
    lng: 73.8415,
    radiusMiles: 0.8,
    startHour: 16,
    endHour: 23,
    daysOfWeek: [5, 6, 0], // Fri, Sat, Sun
    attendanceEstimate: 18000,
    demandBonus: 30,
    description: "High restaurant, boutique shopping, and college cultural festival turnover.",
    isActive: true,
  },
  {
    id: "evt-kp-nightlife",
    name: "Koregaon Park Weekend Dining & Cafe Surge",
    venueOrArea: "Lane 5-7 North Main Road",
    neighborhood: "Koregaon Park",
    lat: 18.5362,
    lng: 73.8940,
    radiusMiles: 0.9,
    startHour: 18,
    endHour: 24,
    daysOfWeek: [5, 6, 0], // Fri, Sat, Sun
    attendanceEstimate: 15000,
    demandBonus: 28,
    description: "Nightlife, fine dining, and boutique lifestyle traffic in KP.",
    isActive: true,
  },
  {
    id: "evt-phoenix-viman",
    name: "Phoenix Marketcity Weekend Shopping Surge",
    venueOrArea: "Phoenix Marketcity, Viman Nagar",
    neighborhood: "Viman Nagar",
    lat: 18.5620,
    lng: 73.9168,
    radiusMiles: 1.0,
    startHour: 12,
    endHour: 22,
    daysOfWeek: [0, 6], // Sat, Sun
    attendanceEstimate: 30000,
    demandBonus: 26,
    description: "Massive retail footfall and airport corridor commuter confluence.",
    isActive: true,
  },
  {
    id: "evt-balewadi-stadium",
    name: "Shree Shiv Chhatrapati Sports Complex Games",
    venueOrArea: "Balewadi Stadium, Baner Corridor",
    neighborhood: "Baner",
    lat: 18.5772,
    lng: 73.7683,
    radiusMiles: 1.5,
    startHour: 15,
    endHour: 22,
    daysOfWeek: [2, 4, 6, 0],
    attendanceEstimate: 18000,
    demandBonus: 24,
    description: "National games and concerts causing traffic buildup near Baner and Expressway.",
    isActive: true,
  },
];

// Neighborhood baseline demand scores in Pune
export const NEIGHBORHOOD_BASELINES: Record<string, { baseScore: number; avgHourlyRate: number; label: string }> = {
  hinjawadi: { baseScore: 38, avgHourlyRate: 40, label: "Hinjawadi Infotech Park" },
  shivajinagar: { baseScore: 36, avgHourlyRate: 50, label: "Shivajinagar Central" },
  "fc road": { baseScore: 38, avgHourlyRate: 50, label: "FC Road & Deccan" },
  deccan: { baseScore: 35, avgHourlyRate: 45, label: "Deccan Gymkhana" },
  "koregaon park": { baseScore: 38, avgHourlyRate: 60, label: "Koregaon Park (KP)" },
  baner: { baseScore: 34, avgHourlyRate: 45, label: "Baner High Street" },
  aundh: { baseScore: 32, avgHourlyRate: 40, label: "Aundh & Parihar Chowk" },
  kothrud: { baseScore: 30, avgHourlyRate: 35, label: "Kothrud & Karve Road" },
  "viman nagar": { baseScore: 35, avgHourlyRate: 45, label: "Viman Nagar & Airport Area" },
  kharadi: { baseScore: 34, avgHourlyRate: 45, label: "Kharadi EON Free Zone" },
  wakad: { baseScore: 32, avgHourlyRate: 35, label: "Wakad & Bhumkar Chowk" },
  magarpatta: { baseScore: 34, avgHourlyRate: 40, label: "Magarpatta Cybercity" },
  hadapsar: { baseScore: 30, avgHourlyRate: 30, label: "Hadapsar Industrial Hub" },
  pimpri: { baseScore: 28, avgHourlyRate: 30, label: "Pimpri PCMC" },
  chinchwad: { baseScore: 28, avgHourlyRate: 30, label: "Chinchwad Station" },
  generic: { baseScore: 25, avgHourlyRate: 40, label: "Pune Metro Area" },
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
  if (lower.includes("hinjawadi") || lower.includes("infotech") || lower.includes("wipro circle")) {
    return "hinjawadi";
  }
  if (lower.includes("koregaon") || lower.includes("north main") || lower.includes("german bakery")) {
    return "koregaon park";
  }
  if (lower.includes("fergusson") || lower.includes("fc road") || lower.includes("goodluck")) {
    return "fc road";
  }
  if (lower.includes("deccan") || lower.includes("jm road") || lower.includes("sambhajinagar")) {
    return "deccan";
  }
  if (lower.includes("baner") || lower.includes("balewadi")) {
    return "baner";
  }
  if (lower.includes("aundh") || lower.includes("parihar") || lower.includes("iti road")) {
    return "aundh";
  }
  if (lower.includes("kothrud") || lower.includes("karve") || lower.includes("vanaz")) {
    return "kothrud";
  }
  if (lower.includes("viman") || lower.includes("lohegaon") || lower.includes("airport")) {
    return "viman nagar";
  }
  if (lower.includes("kharadi") || lower.includes("eon") || lower.includes("wtc")) {
    return "kharadi";
  }
  if (lower.includes("wakad") || lower.includes("bhumkar") || lower.includes("hinjewadi")) {
    return "wakad";
  }
  if (lower.includes("magarpatta") || lower.includes("hadapsar") || lower.includes("amanora")) {
    return "magarpatta";
  }
  if (lower.includes("pimpri") || lower.includes("chinchwad") || lower.includes("pcmc")) {
    return "chinchwad";
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
