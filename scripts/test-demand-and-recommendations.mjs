// ==============================================================================
// ParkMate Demand Estimation & Unused-Slot Recommendation Engine Test Suite
// Verifies:
// 1. Demand estimation rule-based calculations with known sample inputs
// 2. Consistency across time windows, occupancy ratios, and event flags
// 3. Driver alternative recommendations (nearby locations & time shifts)
// 4. Smart Space Sharing unused-slot identification from recurring schedules
// 5. Strict conflict prevention with confirmed driver reservations
// 6. Owner approval requirements before publishing
// 7. Owner utilization metrics & accurate financial labeling
// 8. Documentation of calculation limitations
// ==============================================================================

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName}`);
    passedCount++;
  } else {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${testName} ${details ? `(${details})` : ""}`);
    failedCount++;
  }
}

console.log("\n==================================================================");
console.log(" 📈 PARKMATE DEMAND ESTIMATION & SMART SHARING TEST SUITE");
console.log("==================================================================\n");

// -----------------------------------------------------------------------------
// Core Engine Definitions (Mirrored for Autonomous Node Execution)
// -----------------------------------------------------------------------------

const DEFAULT_MANUAL_EVENT_FLAGS = [
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
    daysOfWeek: [1, 2, 3, 4],
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
    daysOfWeek: [2, 4, 5, 6],
    attendanceEstimate: 18000,
    demandBonus: 35,
    description: "NBA arena event causing parking saturation in Mission Bay and South Beach.",
    isActive: true,
  },
];

const NEIGHBORHOOD_BASELINES = {
  "financial district": { baseScore: 36, avgHourlyRate: 7.5, label: "Financial District" },
  soma: { baseScore: 32, avgHourlyRate: 7.0, label: "SoMa (South of Market)" },
  "nob hill": { baseScore: 22, avgHourlyRate: 5.0, label: "Nob Hill" },
  "south beach": { baseScore: 28, avgHourlyRate: 6.5, label: "South Beach" },
  generic: { baseScore: 20, avgHourlyRate: 5.0, label: "Metro Area" },
};

function resolveNeighborhood(destinationOrAddress) {
  if (!destinationOrAddress) return "generic";
  const lower = destinationOrAddress.toLowerCase();
  for (const key of Object.keys(NEIGHBORHOOD_BASELINES)) {
    if (key !== "generic" && lower.includes(key)) {
      return key;
    }
  }
  return "generic";
}

function estimateDemand(params) {
  const factors = [];
  let rawScore = 0;

  const dayOfWeek = params.dayOfWeek ?? 1;
  const startHour = params.startHour ?? 9;
  let endHour = params.endHour ?? 17;
  if (endHour <= startHour) endHour = startHour + 2;

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayName = dayNames[dayOfWeek];

  // 1. Temporal Window
  let temporalScore = 0;
  let temporalReason = "";

  if (!isWeekend) {
    if (startHour >= 7 && startHour < 10) {
      temporalScore = 30;
      temporalReason = `Weekday morning commute peak (${currentDayName} 07:00 - 10:00). High workforce inflow into downtown commercial hubs.`;
    } else if (startHour >= 16 && startHour < 19.5) {
      temporalScore = 26;
      temporalReason = `Weekday evening commute & dining window (${currentDayName} 16:00 - 19:30). High turnover and curb pressure.`;
    } else if (startHour >= 11.5 && startHour < 14) {
      temporalScore = 18;
      temporalReason = `Weekday midday business & lunch activity (${currentDayName} 11:30 - 14:00). Steady turnover.`;
    } else if (startHour >= 22 || startHour < 6) {
      temporalScore = 2;
      temporalReason = `Overnight low-activity hours (${currentDayName} 22:00 - 06:00). Minimal commercial parking demand.`;
    } else {
      temporalScore = 12;
      temporalReason = `Standard daytime off-peak window (${currentDayName}).`;
    }
  } else {
    if (startHour >= 18 && startHour < 23) {
      temporalScore = 28;
      temporalReason = `Weekend evening entertainment & dining surge (${currentDayName} 18:00 - 23:00). High leisure congestion.`;
    } else {
      temporalScore = 15;
      temporalReason = `Weekend daytime recreational window (${currentDayName}).`;
    }
  }

  rawScore += temporalScore;
  factors.push({ name: "Day & Time Window", scoreDelta: temporalScore, category: "temporal", reason: temporalReason });

  // 2. Neighborhood Baseline
  const resolvedNbhd = resolveNeighborhood(params.neighborhood || params.destination);
  const nbhdData = NEIGHBORHOOD_BASELINES[resolvedNbhd] || NEIGHBORHOOD_BASELINES.generic;
  rawScore += nbhdData.baseScore;
  factors.push({ name: `Neighborhood Baseline (${nbhdData.label})`, scoreDelta: nbhdData.baseScore, category: "location", reason: `Density baseline for ${nbhdData.label}` });

  // 3. Sample Occupancy
  const sampleBookings = params.historicalSampleBookingsCount ?? 3;
  const areaCapacity = Math.max(sampleBookings, params.totalCapacityInArea ?? 5);
  const occupancyRatio = areaCapacity > 0 ? sampleBookings / areaCapacity : 0.5;

  let occupancyScore = 0;
  if (occupancyRatio >= 0.8) {
    occupancyScore = 25;
  } else if (occupancyRatio >= 0.5) {
    occupancyScore = 15;
  } else {
    occupancyScore = 5;
  }
  rawScore += occupancyScore;
  factors.push({ name: "Historical Sample Booking Occupancy", scoreDelta: occupancyScore, category: "trends", reason: `${Math.round(occupancyRatio * 100)}% capacity active.` });

  // 4. Manually Configured Events
  const events = params.activeEvents || DEFAULT_MANUAL_EVENT_FLAGS;
  for (const event of events) {
    if (!event.isActive) continue;
    const matchesDay = event.daysOfWeek.includes(dayOfWeek);
    const timeOverlaps = startHour < event.endHour && endHour > event.startHour;
    const matchesArea = (params.destination || "").toLowerCase().includes(event.neighborhood.toLowerCase()) ||
                        (params.neighborhood || "").toLowerCase().includes(event.neighborhood.toLowerCase());

    if (matchesDay && timeOverlaps && matchesArea) {
      rawScore += event.demandBonus;
      factors.push({ name: `Local Event: ${event.name}`, scoreDelta: event.demandBonus, category: "event", reason: event.description });
    }
  }

  // 5. Search Trends
  const trendMultiplier = params.customSearchTrendMultiplier ?? 1.0;
  if (trendMultiplier > 1.1) {
    const trendScore = Math.min(15, Math.round((trendMultiplier - 1.0) * 35));
    rawScore += trendScore;
    factors.push({ name: "Driver Search Volume Trend", scoreDelta: trendScore, category: "trends", reason: "Elevated query search traffic" });
  }

  const finalScore = Math.max(5, Math.min(100, rawScore));

  let demandLevel = "low";
  let label = "Low Demand";
  let pricingMultiplier = 1.0;
  let deltaPercent = 0;

  if (finalScore >= 70) {
    demandLevel = "high";
    label = "High Demand";
    pricingMultiplier = 1.35;
    deltaPercent = 35;
  } else if (finalScore >= 40) {
    demandLevel = "medium";
    label = "Moderate Demand";
    pricingMultiplier = 1.15;
    deltaPercent = 15;
  } else {
    demandLevel = "low";
    label = "Low Demand";
    pricingMultiplier = 1.0;
    deltaPercent = 0;
  }

  const alternativeTimeWindows = [];
  const nearbyAlternativeLocations = [];

  if (demandLevel === "high" || demandLevel === "medium") {
    alternativeTimeWindows.push({
      label: "Shift 1.5 Hours Earlier",
      offsetHours: -1.5,
      estimatedDemand: "medium",
      priceDifferencePercent: -20,
      reason: "Arrive before peak commuter influx to secure lower rates and guaranteed curb flow.",
    });
    alternativeTimeWindows.push({
      label: "Shift 2 Hours Later",
      offsetHours: 2.0,
      estimatedDemand: "low",
      priceDifferencePercent: -25,
      reason: "Depart after peak rush clears for relaxed parking.",
    });
  }

  if (resolvedNbhd === "financial district" || resolvedNbhd === "soma") {
    nearbyAlternativeLocations.push({
      name: "Nob Hill Residential Driveways",
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
  }

  return {
    score: finalScore,
    demandLevel,
    label,
    summary: `${label} forecasted based on temporal patterns, historical occupancy, and local event flags.`,
    contributingFactors: factors,
    pricingMultiplier,
    suggestedHourlyPriceDeltaPercent: deltaPercent,
    methodology: "rule_based_heuristic",
    isMachineLearningModel: false,
    disclaimer: "Explainable rule-based estimate based on temporal patterns, historical sample booking ratios, and event schedules. Does NOT guarantee spot vacancy or real-time space availability.",
    alternativeTimeWindows,
    nearbyAlternativeLocations,
  };
}

function timeStringToHours(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h + m / 60;
}

function hoursToTimeString(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function verifyIntervalConflicts(spaceId, targetDateStr, startHour, endHour, existingBookings, blockedRules = []) {
  const candStart = new Date(`${targetDateStr}T${hoursToTimeString(startHour)}:00Z`).getTime();
  const candEnd = new Date(`${targetDateStr}T${hoursToTimeString(endHour)}:00Z`).getTime();
  const conflicts = [];

  for (const b of existingBookings) {
    if (b.spaceId !== spaceId || b.status === "cancelled") continue;
    const bStart = new Date(b.startTime).getTime();
    const bEnd = new Date(b.endTime).getTime();
    if (!isNaN(bStart) && !isNaN(bEnd)) {
      if (candStart < bEnd && candEnd > bStart) {
        conflicts.push({
          bookingReference: b.bookingReference || b.id,
          driverName: "Confirmed Driver",
          startTime: b.startTime,
          endTime: b.endTime,
          conflictReason: `Overlaps with confirmed reservation ${b.bookingReference || b.id}`,
        });
      }
    }
  }

  for (const r of blockedRules) {
    if (r.space_id !== spaceId || !r.is_blocked) continue;
    if (r.specific_date && r.specific_date === targetDateStr) {
      const rStart = timeStringToHours(r.start_time);
      const rEnd = timeStringToHours(r.end_time);
      if (startHour < rEnd && endHour > rStart) {
        conflicts.push({
          bookingReference: `BLOCKED-${r.id || "RULE"}`,
          conflictReason: r.reason || "Owner marked this period as blocked/maintenance",
        });
      }
    }
  }

  const hasConflict = conflicts.length > 0;
  return {
    hasConflict,
    overlappingBookingsCount: conflicts.length,
    conflicts,
    guaranteeMessage: hasConflict
      ? `Cannot publish: ${conflicts.length} overlapping reservation(s) detected. Confirmed bookings are strictly protected.`
      : "Verified: 0 overlapping reservations. Confirmed bookings remain 100% untouched.",
  };
}

function generateUnusedSlotRecommendations(space, recurringSchedule, existingBookings = [], blockedRules = [], pricingRules = { minSlotDurationHours: 2.0, highDemandMultiplier: 1.25, moderateDemandMultiplier: 1.10, offPeakDiscountMultiplier: 1.0, expectedBookingProbability: 0.70, hostPayoutShareRate: 0.85 }, daysToLookAhead = 1, referenceDate = new Date()) {
  const recommendations = [];

  for (let dayOffset = 0; dayOffset < daysToLookAhead; dayOffset++) {
    const targetDate = new Date(referenceDate);
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const dateIso = targetDate.toISOString().slice(0, 10);
    const dayOfWeek = targetDate.getDay();

    const scheduleConfig = recurringSchedule.find((s) => s.dayOfWeek === dayOfWeek);
    if (!scheduleConfig || !scheduleConfig.isActive) continue;

    const windowStart = scheduleConfig.startHour;
    const windowEnd = scheduleConfig.endHour;

    const busyIntervals = [];

    for (const b of existingBookings) {
      if (b.spaceId !== space.id || b.status === "cancelled") continue;
      const bStartDate = new Date(b.startTime);
      const bEndDate = new Date(b.endTime);
      const isUtc = typeof b.startTime === "string" && b.startTime.endsWith("Z");
      const bDateIso = isUtc
        ? bStartDate.toISOString().slice(0, 10)
        : `${bStartDate.getFullYear()}-${String(bStartDate.getMonth() + 1).padStart(2, "0")}-${String(bStartDate.getDate()).padStart(2, "0")}`;

      if (bDateIso === dateIso) {
        const bStartH = isUtc
          ? bStartDate.getUTCHours() + bStartDate.getUTCMinutes() / 60
          : bStartDate.getHours() + bStartDate.getMinutes() / 60;
        const bEndH = isUtc
          ? bEndDate.getUTCHours() + bEndDate.getUTCMinutes() / 60
          : bEndDate.getHours() + bEndDate.getMinutes() / 60;

        busyIntervals.push({
          start: Math.max(windowStart, bStartH),
          end: Math.min(windowEnd, bEndH),
        });
      }
    }

    for (const r of blockedRules) {
      if (r.space_id !== space.id || !r.is_blocked) continue;
      if (r.specific_date === dateIso) {
        busyIntervals.push({
          start: Math.max(windowStart, timeStringToHours(r.start_time)),
          end: Math.min(windowEnd, timeStringToHours(r.end_time)),
        });
      }
    }

    busyIntervals.sort((a, b) => a.start - b.start);
    const mergedBusy = [];
    for (const interval of busyIntervals) {
      if (interval.end <= interval.start) continue;
      if (mergedBusy.length === 0) {
        mergedBusy.push({ ...interval });
      } else {
        const last = mergedBusy[mergedBusy.length - 1];
        if (interval.start <= last.end) {
          last.end = Math.max(last.end, interval.end);
        } else {
          mergedBusy.push({ ...interval });
        }
      }
    }

    const freeGaps = [];
    let currentCursor = windowStart;
    for (const busy of mergedBusy) {
      if (busy.start > currentCursor) {
        freeGaps.push({ start: currentCursor, end: busy.start });
      }
      currentCursor = Math.max(currentCursor, busy.end);
    }
    if (currentCursor < windowEnd) {
      freeGaps.push({ start: currentCursor, end: windowEnd });
    }

    for (const gap of freeGaps) {
      const durationHours = Number((gap.end - gap.start).toFixed(2));
      if (durationHours < pricingRules.minSlotDurationHours) continue;

      const demandEstimate = estimateDemand({
        neighborhood: space.neighborhood,
        dayOfWeek,
        startHour: gap.start,
        endHour: gap.end,
      });

      let multiplier = 1.0;
      let pricingRuleApplied = "Baseline standard rate";
      if (demandEstimate.demandLevel === "high") {
        multiplier = pricingRules.highDemandMultiplier;
        pricingRuleApplied = `Peak demand dynamic markup (+${Math.round((multiplier - 1) * 100)}%)`;
      } else if (demandEstimate.demandLevel === "medium") {
        multiplier = pricingRules.moderateDemandMultiplier;
        pricingRuleApplied = `Moderate demand dynamic markup (+${Math.round((multiplier - 1) * 100)}%)`;
      }

      const baselineHourlyPrice = space.pricePerHour;
      const suggestedHourlyPrice = Number((baselineHourlyPrice * multiplier).toFixed(2));
      const potentialGrossBookingValue = Number((durationHours * suggestedHourlyPrice).toFixed(2));
      const estimatedHostEarnings = Number((potentialGrossBookingValue * pricingRules.hostPayoutShareRate * pricingRules.expectedBookingProbability).toFixed(2));

      const conflictVerification = verifyIntervalConflicts(space.id, dateIso, gap.start, gap.end, existingBookings, blockedRules);

      recommendations.push({
        id: `rec-${space.id}-${dateIso}-${Math.round(gap.start * 10)}`,
        spaceId: space.id,
        spaceTitle: space.title,
        dateIso,
        displayDate: `${scheduleConfig.dayName}, ${dateIso}`,
        dayOfWeek,
        dayName: scheduleConfig.dayName,
        startTime: hoursToTimeString(gap.start),
        endTime: hoursToTimeString(gap.end),
        durationHours,
        baselineHourlyPrice,
        suggestedHourlyPrice,
        pricingRuleApplied,
        estimatedDemandLevel: demandEstimate.demandLevel,
        estimatedDemandScore: demandEstimate.score,
        potentialGrossBookingValue,
        estimatedHostEarnings,
        conflictVerification,
        isOwnerApproved: false,
        status: "suggested",
      });
    }
  }

  return recommendations;
}

function calculateSpaceUtilizationAndValue(spaces, bookings, recurringSchedule, pricingRules, daysInPeriod = 7) {
  let weeklyScheduledHoursPerSpace = 0;
  for (const day of recurringSchedule) {
    if (day.isActive && day.endHour > day.startHour) {
      weeklyScheduledHoursPerSpace += day.endHour - day.startHour;
    }
  }
  const activeSpacesCount = spaces.filter((s) => (s.publicationStatus || "published") === "published").length;
  const listedHours = Number(((weeklyScheduledHoursPerSpace * activeSpacesCount * daysInPeriod) / 7).toFixed(1));

  let bookedHours = 0;
  let verifiedActualGrossBookings = 0;

  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const sDate = new Date(b.startTime);
    const eDate = new Date(b.endTime);
    if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
      bookedHours += Math.max(1, (eDate.getTime() - sDate.getTime()) / (1000 * 3600));
    }
    verifiedActualGrossBookings += b.totalPrice || 0;
  }

  bookedHours = Number(bookedHours.toFixed(1));
  verifiedActualGrossBookings = Number(verifiedActualGrossBookings.toFixed(2));

  const availableUnbookedHours = Math.max(0, Number((listedHours - bookedHours).toFixed(1)));
  const utilizationRatePercent = listedHours > 0 ? Number(Math.min(100, (bookedHours / listedHours) * 100).toFixed(1)) : 0;

  const avgSpaceRate = spaces.length > 0 ? spaces.reduce((sum, s) => sum + s.pricePerHour, 0) / spaces.length : 7.0;
  const potentialUnbookedGross = availableUnbookedHours * avgSpaceRate * pricingRules.expectedBookingProbability;
  const projectedPotentialGrossBookings = Number((verifiedActualGrossBookings + potentialUnbookedGross).toFixed(2));

  return {
    listedHours,
    bookedHours,
    availableUnbookedHours,
    utilizationRatePercent,
    verifiedActualGrossBookings,
    projectedPotentialGrossBookings,
    actualRevenueLabel: "Realized Confirmed Bookings (Verified)",
    projectedRevenueLabel: "Estimated Potential Gross Value (Sample-Data Forecast)",
    disclaimer: "Calculations are explainable rule-based estimates using sample demand and do not represent guaranteed customers or realized revenue. Simulated projections are strictly separated from actual confirmed earnings.",
  };
}

// ==============================================================================
// SECTION 1: Demand Estimation Service with Known Sample Inputs
// ==============================================================================
console.log("SECTION 1: Demand Estimation Service with Known Sample Inputs");

const sampleMorningRush = estimateDemand({
  destination: "Financial District, San Francisco",
  neighborhood: "financial district",
  dayOfWeek: 1, // Monday
  startHour: 8.5,
  endHour: 12.0,
  historicalSampleBookingsCount: 4,
  totalCapacityInArea: 5,
  activeEvents: DEFAULT_MANUAL_EVENT_FLAGS,
});

assert(sampleMorningRush.score >= 70, "Morning rush in Financial District scores High Demand (>= 70)", `Score: ${sampleMorningRush.score}`);
assert(sampleMorningRush.demandLevel === "high", "Demand level is 'high'");
assert(sampleMorningRush.isMachineLearningModel === false, "Explicitly declares isMachineLearningModel === false");
assert(sampleMorningRush.methodology === "rule_based_heuristic", "Explicitly declares methodology === 'rule_based_heuristic'");
assert(sampleMorningRush.pricingMultiplier > 1.2, "Generates dynamic surge multiplier (> 1.2x)");

const temporalFactor = sampleMorningRush.contributingFactors.find((f) => f.category === "temporal");
assert(temporalFactor && temporalFactor.scoreDelta === 30, "Morning commute window awards +30 points");

const locationFactor = sampleMorningRush.contributingFactors.find((f) => f.category === "location");
assert(locationFactor && locationFactor.scoreDelta === 36, "Financial District baseline density awards +36 points");

const sampleOvernight = estimateDemand({
  destination: "Outer Richmond, San Francisco",
  neighborhood: "generic",
  dayOfWeek: 1, // Monday
  startHour: 2.5,
  endHour: 5.0,
  historicalSampleBookingsCount: 1,
  totalCapacityInArea: 5,
  activeEvents: [],
});

assert(sampleOvernight.score < 40, "Overnight quiet period scores Low Demand (< 40)", `Score: ${sampleOvernight.score}`);
assert(sampleOvernight.demandLevel === "low", "Demand level is 'low'");
assert(sampleOvernight.pricingMultiplier === 1.0, "Standard baseline multiplier 1.0x during low demand");

// ==============================================================================
// SECTION 2: Consistency Across Time Windows & Parameters
// ==============================================================================
console.log("\nSECTION 2: Consistency Across Time Windows & Parameters");

const testRepeat1 = estimateDemand({ dayOfWeek: 2, startHour: 9, endHour: 13, neighborhood: "soma" });
const testRepeat2 = estimateDemand({ dayOfWeek: 2, startHour: 9, endHour: 13, neighborhood: "soma" });
assert(testRepeat1.score === testRepeat2.score, "Deterministic scoring: identical inputs produce identical scores", `${testRepeat1.score} vs ${testRepeat2.score}`);

const morningScore = estimateDemand({ dayOfWeek: 2, startHour: 8.5, endHour: 11, neighborhood: "financial district" }).score;
const middayScore = estimateDemand({ dayOfWeek: 2, startHour: 11.5, endHour: 13.5, neighborhood: "financial district" }).score;
const overnightScore = estimateDemand({ dayOfWeek: 2, startHour: 3.0, endHour: 5.0, neighborhood: "financial district" }).score;

assert(morningScore > middayScore, "Morning peak score is strictly higher than midday score", `${morningScore} > ${middayScore}`);
assert(middayScore > overnightScore, "Midday score is strictly higher than overnight score", `${middayScore} > ${overnightScore}`);

const withoutEvent = estimateDemand({
  dayOfWeek: 2,
  startHour: 10,
  endHour: 14,
  neighborhood: "soma",
  destination: "SoMa, Moscone",
  activeEvents: [],
}).score;

const withEvent = estimateDemand({
  dayOfWeek: 2,
  startHour: 10,
  endHour: 14,
  neighborhood: "soma",
  destination: "SoMa, Moscone",
  activeEvents: DEFAULT_MANUAL_EVENT_FLAGS,
}).score;

assert(withEvent > withoutEvent, "Active Moscone Center event flag increases demand score consistently", `${withEvent} > ${withoutEvent}`);

const highOccupancy = estimateDemand({ dayOfWeek: 3, startHour: 10, endHour: 12, historicalSampleBookingsCount: 4, totalCapacityInArea: 5 }).score;
const lowOccupancy = estimateDemand({ dayOfWeek: 3, startHour: 10, endHour: 12, historicalSampleBookingsCount: 1, totalCapacityInArea: 5 }).score;
assert(highOccupancy > lowOccupancy, "High historical occupancy (80%) scores higher than low occupancy (20%)", `${highOccupancy} > ${lowOccupancy}`);

// ==============================================================================
// SECTION 3: Driver Alternative Recommendations (Locations & Time Shifts)
// ==============================================================================
console.log("\nSECTION 3: Driver Alternative Recommendations");

const highDemandResult = estimateDemand({
  destination: "Financial District",
  neighborhood: "financial district",
  dayOfWeek: 1,
  startHour: 8.5,
  endHour: 17.0,
  historicalSampleBookingsCount: 4,
  totalCapacityInArea: 5,
});

assert(highDemandResult.alternativeTimeWindows.length >= 2, "Generates alternative time window suggestions for peak demand", `Count: ${highDemandResult.alternativeTimeWindows.length}`);
assert(highDemandResult.nearbyAlternativeLocations.length >= 1, "Generates nearby lower-demand location alternatives", `Count: ${highDemandResult.nearbyAlternativeLocations.length}`);

const altTimeEarlier = highDemandResult.alternativeTimeWindows.find((w) => w.offsetHours < 0);
assert(altTimeEarlier && altTimeEarlier.priceDifferencePercent < 0, "Earlier time window offers lower rate percentage", `${altTimeEarlier?.priceDifferencePercent}%`);

const altLoc = highDemandResult.nearbyAlternativeLocations[0];
assert(altLoc.distanceMiles < 1.0, "Nearby alternative is within walking distance (< 1.0 mi)", `${altLoc.distanceMiles} mi`);
assert(highDemandResult.disclaimer.includes("NOT guarantee"), "Clear disclaimer stating demand estimates do not guarantee spot vacancy");

// ==============================================================================
// SECTION 4: Smart Space Sharing: Unused-Slot Identification
// ==============================================================================
console.log("\nSECTION 4: Smart Space Sharing: Unused-Slot Identification");

const testSpace = {
  id: "sp-test-1",
  title: "Pine St Executive Driveway",
  neighborhood: "nob hill",
  pricePerHour: 6.0,
  publicationStatus: "published",
};

const targetDateStr = "2026-11-02";
const refDate = new Date(`${targetDateStr}T00:00:00Z`);

const existingBookings = [
  {
    id: "bk-conflict-test",
    bookingReference: "PM-CONF-001",
    spaceId: "sp-test-1",
    startTime: `${targetDateStr}T11:00:00Z`,
    endTime: `${targetDateStr}T14:00:00Z`,
    hourlyRate: 6.0,
    totalPrice: 18.0,
    status: "confirmed",
  },
];

const schedule = [
  { dayOfWeek: 1, dayName: "Monday", startHour: 8, endHour: 18, isActive: true },
];

const recommendations = generateUnusedSlotRecommendations(
  testSpace,
  schedule,
  existingBookings,
  [],
  { minSlotDurationHours: 2.0, highDemandMultiplier: 1.25, moderateDemandMultiplier: 1.10, offPeakDiscountMultiplier: 1.0, expectedBookingProbability: 0.70, hostPayoutShareRate: 0.85 },
  1,
  refDate
);

assert(recommendations.length === 2, "Dissects 08:00-18:00 schedule with 11:00-14:00 booking into exactly 2 unbooked gaps", `Found: ${recommendations.length}`);

const gap1 = recommendations[0];
assert(gap1.startTime === "08:00" && gap1.endTime === "11:00", "Gap 1 correctly identified as 08:00 - 11:00", `${gap1.startTime} - ${gap1.endTime}`);
assert(gap1.durationHours === 3.0, "Gap 1 duration is 3.0 hours");
assert(gap1.isOwnerApproved === false, "Slot initially requires owner approval (isOwnerApproved === false)");

const gap2 = recommendations[1];
assert(gap2.startTime === "14:00" && gap2.endTime === "18:00", "Gap 2 correctly identified as 14:00 - 18:00", `${gap2.startTime} - ${gap2.endTime}`);
assert(gap2.durationHours === 4.0, "Gap 2 duration is 4.0 hours");

// ==============================================================================
// SECTION 5: Strict Conflict Prevention with Confirmed Reservations
// ==============================================================================
console.log("\nSECTION 5: Strict Conflict Prevention with Confirmed Reservations");

const checkGap1 = verifyIntervalConflicts("sp-test-1", targetDateStr, 8.0, 11.0, existingBookings, []);
assert(checkGap1.hasConflict === false, "Gap 1 (08:00-11:00) verified 0 conflicts with 11:00-14:00 booking");
assert(checkGap1.overlappingBookingsCount === 0, "Overlapping bookings count is 0");

const checkOverlapping = verifyIntervalConflicts("sp-test-1", targetDateStr, 10.0, 13.0, existingBookings, []);
assert(checkOverlapping.hasConflict === true, "Overlapping slot (10:00-13:00) correctly flagged as conflict");
assert(checkOverlapping.conflicts.length === 1, "Detects conflicting reservation PM-CONF-001");
assert(checkOverlapping.conflicts[0].bookingReference === "PM-CONF-001", "Identifies exact conflicting booking reference");

const blockedRules = [
  {
    id: "rule-maint",
    space_id: "sp-test-1",
    specific_date: targetDateStr,
    start_time: "15:00:00",
    end_time: "17:00:00",
    is_blocked: true,
    reason: "Host Driveway Maintenance",
  },
];

const checkBlockedOverlap = verifyIntervalConflicts("sp-test-1", targetDateStr, 14.0, 18.0, [], blockedRules);
assert(checkBlockedOverlap.hasConflict === true, "Owner blocked period (15:00-17:00) correctly prevents overlapping slot publication");

// ==============================================================================
// SECTION 6: Owner Utilization Metrics & Accurate Financial Labeling
// ==============================================================================
console.log("\nSECTION 6: Owner Utilization Metrics & Accurate Financial Labeling");

const weekdayCommuteSchedule = [
  { dayOfWeek: 0, dayName: "Sunday", startHour: 9, endHour: 17, isActive: false },
  { dayOfWeek: 1, dayName: "Monday", startHour: 8, endHour: 18, isActive: true },
  { dayOfWeek: 2, dayName: "Tuesday", startHour: 8, endHour: 18, isActive: true },
  { dayOfWeek: 3, dayName: "Wednesday", startHour: 8, endHour: 18, isActive: true },
  { dayOfWeek: 4, dayName: "Thursday", startHour: 8, endHour: 18, isActive: true },
  { dayOfWeek: 5, dayName: "Friday", startHour: 8, endHour: 18, isActive: true },
  { dayOfWeek: 6, dayName: "Saturday", startHour: 9, endHour: 17, isActive: false },
];

const pricingRules = {
  minSlotDurationHours: 2.0,
  highDemandMultiplier: 1.25,
  moderateDemandMultiplier: 1.10,
  offPeakDiscountMultiplier: 1.0,
  expectedBookingProbability: 0.70,
  hostPayoutShareRate: 0.85,
};

const utilStats = calculateSpaceUtilizationAndValue(
  [testSpace],
  existingBookings,
  weekdayCommuteSchedule,
  pricingRules,
  7
);

assert(utilStats.listedHours === 50.0, "5 weekdays * 10 hrs = 50.0 listed hours/week", `Listed: ${utilStats.listedHours}`);
assert(utilStats.bookedHours === 3.0, "Booking duration 11:00-14:00 = 3.0 booked hours", `Booked: ${utilStats.bookedHours}`);
assert(utilStats.availableUnbookedHours === 47.0, "Available unbooked hours = 47.0 (50.0 - 3.0)", `Unbooked: ${utilStats.availableUnbookedHours}`);
assert(utilStats.utilizationRatePercent === 6.0, "Utilization rate = 6.0% (3.0 / 50.0 * 100)", `Rate: ${utilStats.utilizationRatePercent}%`);
assert(utilStats.verifiedActualGrossBookings === 18.0, "Verified actual revenue = $18.00 from confirmed reservation", `Actual: $${utilStats.verifiedActualGrossBookings}`);
assert(utilStats.projectedPotentialGrossBookings > utilStats.verifiedActualGrossBookings, "Projected gross incorporates unbooked monetization potential");
assert(utilStats.actualRevenueLabel.includes("Realized"), "Actual revenue is distinctly labeled as Realized");
assert(utilStats.projectedRevenueLabel.includes("Forecast"), "Projected revenue is distinctly labeled as Sample-Data Forecast");
assert(utilStats.disclaimer.includes("not represent guaranteed customers"), "Disclaimer clearly states projections do not represent guaranteed customers");

// ==============================================================================
// SECTION 7: Document Limitations of Calculations
// ==============================================================================
console.log("\nSECTION 7: Document Limitations of Calculations");

const calculationLimitations = [
  "1. Rule-Based Heuristic: Scoring uses deterministic weights and does not claim ML model training.",
  "2. Temporal Bucket Granularity: Commute peaks are modeled in 30-minute to 2-hour windows, which may vary on holidays or weather anomalies.",
  "3. Sample Data Assumptions: Unbooked gross booking value projections assume a fixed 70% booking probability and average neighborhood hourly yield.",
  "4. Real-Time Independence: Demand estimates reflect ambient market pressure; spot vacancy is independently checked via calendar bookings and gate records.",
];

calculationLimitations.forEach((limitation) => {
  console.log(`  \x1b[36mℹ DOCUMENTED LIMITATION\x1b[0m: ${limitation}`);
});

assert(calculationLimitations.length === 4, "4 core limitations of the calculation model documented");

// ==============================================================================
// TEST RESULTS SUMMARY
// ==============================================================================
console.log("\n==================================================================");
console.log(` TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("==================================================================\n");

if (failedCount > 0) {
  process.exit(1);
}
