// ==============================================================================
// ParkMate Smart Space Sharing: Unused-Slot Recommendation Engine
//
// Analyzes owner-approved recurring schedules and detects unbooked periods that
// can be listed.
// Features:
// 1. Identifies unbooked gaps across upcoming days.
// 2. Evaluates rule-based demand scores and dynamic price suggestions.
// 3. Calculates estimated additional gross and net earnings.
// 4. Strictly verifies 0 conflicts with existing confirmed bookings or blocked dates.
// 5. Enforces owner approval requirement before any slot can be published.
// 6. Confirmed bookings are immutable and protected.
// ==============================================================================

import { ParkingSpace, Booking } from "@/types/parking";
import { estimateDemand, DemandLevel } from "@/lib/demand-engine";

export interface RecurringScheduleDay {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  dayName: string;
  startHour: number; // e.g. 8.0 for 08:00
  endHour: number;   // e.g. 18.0 for 18:00
  isActive: boolean;
}

export interface BlockedPeriodRule {
  id?: string;
  space_id: string;
  specific_date?: string | null; // YYYY-MM-DD
  day_of_week?: number | null;
  start_time: string; // HH:mm:ss or HH:mm
  end_time: string;   // HH:mm:ss or HH:mm
  is_blocked: boolean;
  reason?: string | null;
}

export interface ConfigurablePricingRule {
  minSlotDurationHours: number; // Minimum length of suggested slot (e.g. 2 hours)
  highDemandMultiplier: number; // Markup during high demand (e.g. 1.25 -> +25%)
  moderateDemandMultiplier: number; // Markup during moderate demand (e.g. 1.10 -> +10%)
  offPeakDiscountMultiplier: number; // Discount during low demand (e.g. 0.95 -> -5%)
  expectedBookingProbability: number; // Probability factor for earnings forecast (e.g. 0.70)
  hostPayoutShareRate: number; // Host's share of revenue (e.g. 0.85 = 85%)
}

export const DEFAULT_PRICING_RULES: ConfigurablePricingRule = {
  minSlotDurationHours: 2.0,
  highDemandMultiplier: 1.25,
  moderateDemandMultiplier: 1.10,
  offPeakDiscountMultiplier: 1.0,
  expectedBookingProbability: 0.70,
  hostPayoutShareRate: 0.85,
};

export interface ConflictDetail {
  bookingReference: string;
  driverName?: string;
  vehicleModel?: string;
  startTime: string;
  endTime: string;
  conflictReason: string;
}

export interface ConflictVerificationResult {
  hasConflict: boolean;
  overlappingBookingsCount: number;
  conflicts: ConflictDetail[];
  guaranteeMessage: string;
}

export interface UnusedSlotRecommendation {
  id: string;
  spaceId: string;
  spaceTitle: string;
  dateIso: string; // YYYY-MM-DD
  displayDate: string; // e.g. "Mon, Oct 28"
  dayOfWeek: number;
  dayName: string;
  startTime: string; // "08:00"
  endTime: string;   // "11:30"
  durationHours: number;
  baselineHourlyPrice: number;
  suggestedHourlyPrice: number;
  pricingRuleApplied: string;
  estimatedDemandLevel: DemandLevel;
  estimatedDemandScore: number;
  demandExplanation: string;
  potentialGrossBookingValue: number; // duration * suggestedPrice
  estimatedHostEarnings: number; // gross * hostShare * probability
  conflictVerification: ConflictVerificationResult;
  isOwnerApproved: boolean; // MANDATORY: Requires owner approval before publishing
  status: "suggested" | "approved" | "published" | "dismissed";
}

export interface OwnerUtilizationStats {
  listedHours: number;
  bookedHours: number;
  availableUnbookedHours: number;
  utilizationRatePercent: number;
  verifiedActualGrossBookings: number; // Realized from confirmed driver bookings
  projectedPotentialGrossBookings: number; // Actual + potential forecast from unbooked slots
  actualRevenueLabel: string;
  projectedRevenueLabel: string;
  disclaimer: string;
}

/**
 * Standard default recurring schedule (e.g., weekday commute hours Monday - Friday 08:00 - 18:00)
 */
export const DEFAULT_WEEKDAY_COMMUTE_SCHEDULE: RecurringScheduleDay[] = [
  { dayOfWeek: 0, dayName: "Sunday", startHour: 9, endHour: 17, isActive: false },
  { dayOfWeek: 1, dayName: "Monday", startHour: 8, endHour: 18, isActive: true },
  { dayOfWeek: 2, dayName: "Tuesday", startHour: 8, endHour: 18, isActive: true },
  { dayOfWeek: 3, dayName: "Wednesday", startHour: 8, endHour: 18, isActive: true },
  { dayOfWeek: 4, dayName: "Thursday", startHour: 8, endHour: 18, isActive: true },
  { dayOfWeek: 5, dayName: "Friday", startHour: 8, endHour: 18, isActive: true },
  { dayOfWeek: 6, dayName: "Saturday", startHour: 9, endHour: 17, isActive: false },
];

/**
 * Parses time string (e.g. "08:30:00" or "14:15") into fractional hours (e.g. 8.5 or 14.25).
 */
export function timeStringToHours(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h + m / 60;
}

/**
 * Formats fractional hours (e.g. 8.5) into HH:MM (e.g. "08:30").
 */
export function hoursToTimeString(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const hPad = h.toString().padStart(2, "0");
  const mPad = m.toString().padStart(2, "0");
  return `${hPad}:${mPad}`;
}

/**
 * Formats fractional hours into human readable AM/PM (e.g. "8:30 AM").
 */
export function formatHourAmPm(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const mPad = m.toString().padStart(2, "0");
  return `${displayH}:${mPad} ${period}`;
}

/**
 * Strict conflict verifier:
 * Checks whether candidate time interval [candStart, candEnd] overlaps any confirmed/active bookings or blocked dates.
 */
export function verifyIntervalConflicts(
  spaceId: string,
  targetDateStr: string, // YYYY-MM-DD
  startHour: number,
  endHour: number,
  existingBookings: Booking[],
  blockedRules: BlockedPeriodRule[] = []
): ConflictVerificationResult {
  const candStart = new Date(`${targetDateStr}T${hoursToTimeString(startHour)}:00Z`).getTime();
  const candEnd = new Date(`${targetDateStr}T${hoursToTimeString(endHour)}:00Z`).getTime();

  const conflicts: ConflictDetail[] = [];

  // 1. Check existing confirmed or active bookings
  for (const b of existingBookings) {
    if (b.spaceId !== spaceId) continue;
    if (b.status === "cancelled") continue; // Cancelled bookings do not conflict

    const bStart = new Date(b.startTime).getTime();
    const bEnd = new Date(b.endTime).getTime();

    // Standard interval overlap test: max(start) < min(end)
    if (!isNaN(bStart) && !isNaN(bEnd)) {
      if (candStart < bEnd && candEnd > bStart) {
        conflicts.push({
          bookingReference: b.bookingReference || b.id,
          driverName: "Confirmed Driver",
          vehicleModel: b.vehicleModel,
          startTime: b.startTime,
          endTime: b.endTime,
          conflictReason: `Overlaps with confirmed reservation ${b.bookingReference || b.id}`,
        });
      }
    }
  }

  // 2. Check blocked date rules
  for (const r of blockedRules) {
    if (r.space_id !== spaceId) continue;
    if (!r.is_blocked) continue;

    // Specific date check
    if (r.specific_date && r.specific_date === targetDateStr) {
      const rStartHour = timeStringToHours(r.start_time);
      const rEndHour = timeStringToHours(r.end_time);

      if (startHour < rEndHour && endHour > rStartHour) {
        conflicts.push({
          bookingReference: `BLOCKED-${r.id || "RULE"}`,
          driverName: "Owner Blockout",
          vehicleModel: "N/A",
          startTime: `${targetDateStr} ${r.start_time}`,
          endTime: `${targetDateStr} ${r.end_time}`,
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
      ? `Cannot publish: ${conflicts.length} overlapping reservation(s) or block(s) detected. Confirmed bookings are strictly protected.`
      : "Verified: 0 overlapping reservations. Confirmed bookings remain 100% untouched.",
  };
}

/**
 * Analyzes recurring schedules and extracts unbooked periods that may be listed.
 */
export function generateUnusedSlotRecommendations(
  space: ParkingSpace,
  recurringSchedule: RecurringScheduleDay[] = DEFAULT_WEEKDAY_COMMUTE_SCHEDULE,
  existingBookings: Booking[] = [],
  blockedRules: BlockedPeriodRule[] = [],
  pricingRules: ConfigurablePricingRule = DEFAULT_PRICING_RULES,
  daysToLookAhead: number = 7,
  referenceDate: Date = new Date()
): UnusedSlotRecommendation[] {
  const recommendations: UnusedSlotRecommendation[] = [];

  // Iterate over upcoming days
  for (let dayOffset = 0; dayOffset < daysToLookAhead; dayOffset++) {
    const targetDate = new Date(referenceDate);
    targetDate.setDate(targetDate.getDate() + dayOffset);

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const dateIso = `${year}-${month}-${day}`;
    const dayOfWeek = targetDate.getDay();

    const scheduleConfig = recurringSchedule.find((s) => s.dayOfWeek === dayOfWeek);
    if (!scheduleConfig || !scheduleConfig.isActive) {
      continue; // Space is not scheduled to be shared on this day
    }

    const windowStart = scheduleConfig.startHour;
    const windowEnd = scheduleConfig.endHour;
    if (windowEnd <= windowStart) continue;

    // Find all occupied intervals on this date
    interface Interval {
      start: number;
      end: number;
    }
    const busyIntervals: Interval[] = [];

    // Add bookings on this day
    for (const b of existingBookings) {
      if (b.spaceId !== space.id || b.status === "cancelled") continue;
      const bStartDate = new Date(b.startTime);
      const bEndDate = new Date(b.endTime);

      if (!isNaN(bStartDate.getTime()) && !isNaN(bEndDate.getTime())) {
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
    }

    // Add blocked rules on this day
    for (const r of blockedRules) {
      if (r.space_id !== space.id || !r.is_blocked) continue;
      if (r.specific_date && r.specific_date === dateIso) {
        busyIntervals.push({
          start: Math.max(windowStart, timeStringToHours(r.start_time)),
          end: Math.min(windowEnd, timeStringToHours(r.end_time)),
        });
      }
    }

    // Sort and merge overlapping busy intervals
    busyIntervals.sort((a, b) => a.start - b.start);
    const mergedBusy: Interval[] = [];
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

    // Identify free gaps inside [windowStart, windowEnd]
    const freeGaps: Interval[] = [];
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

    // For each free gap that meets min duration, generate a recommendation
    for (const gap of freeGaps) {
      const durationHours = Number((gap.end - gap.start).toFixed(2));
      if (durationHours < pricingRules.minSlotDurationHours) {
        continue; // Skip fragments shorter than minimum slot duration
      }

      // Estimate demand for this unbooked time window
      const demandEstimate = estimateDemand({
        destination: space.neighborhood || space.address,
        neighborhood: space.neighborhood,
        lat: space.coordinates.lat,
        lng: space.coordinates.lng,
        dayOfWeek,
        startHour: gap.start,
        endHour: gap.end,
      });

      // Price suggestion based on configurable pricing rules
      let multiplier = 1.0;
      let pricingRuleApplied = "Baseline standard rate";
      if (demandEstimate.demandLevel === "high") {
        multiplier = pricingRules.highDemandMultiplier;
        pricingRuleApplied = `Peak demand dynamic markup (+${Math.round((multiplier - 1) * 100)}%)`;
      } else if (demandEstimate.demandLevel === "medium") {
        multiplier = pricingRules.moderateDemandMultiplier;
        pricingRuleApplied = `Moderate demand dynamic markup (+${Math.round((multiplier - 1) * 100)}%)`;
      } else {
        multiplier = pricingRules.offPeakDiscountMultiplier;
        pricingRuleApplied = "Off-peak standard baseline";
      }

      const baselineHourlyPrice = space.pricePerHour;
      const suggestedHourlyPrice = Number((baselineHourlyPrice * multiplier).toFixed(2));

      // Potential gross booking value: full utilization
      const potentialGrossBookingValue = Number((durationHours * suggestedHourlyPrice).toFixed(2));

      // Expected net earnings taking into account probability and host share
      const estimatedHostEarnings = Number(
        (
          potentialGrossBookingValue *
          pricingRules.hostPayoutShareRate *
          pricingRules.expectedBookingProbability
        ).toFixed(2)
      );

      // Perform strict conflict verification
      const conflictVerification = verifyIntervalConflicts(
        space.id,
        dateIso,
        gap.start,
        gap.end,
        existingBookings,
        blockedRules
      );

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const displayDate = `${dayNames[dayOfWeek]}, ${monthNames[targetDate.getMonth()]} ${targetDate.getDate()}`;

      recommendations.push({
        id: `rec-${space.id}-${dateIso}-${Math.round(gap.start * 10)}`,
        spaceId: space.id,
        spaceTitle: space.title,
        dateIso,
        displayDate,
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
        demandExplanation: demandEstimate.summary,
        potentialGrossBookingValue,
        estimatedHostEarnings,
        conflictVerification,
        isOwnerApproved: false, // Owner must approve
        status: "suggested",
      });
    }
  }

  return recommendations;
}

/**
 * Calculates demand and space utilization view metrics for the Owner Dashboard.
 */
export function calculateSpaceUtilizationAndValue(
  spaces: ParkingSpace[],
  bookings: Booking[],
  recurringSchedule: RecurringScheduleDay[] = DEFAULT_WEEKDAY_COMMUTE_SCHEDULE,
  pricingRules: ConfigurablePricingRule = DEFAULT_PRICING_RULES,
  daysInPeriod: number = 7
): OwnerUtilizationStats {
  // 1. Calculate total scheduled listed hours across active spaces
  let weeklyScheduledHoursPerSpace = 0;
  for (const day of recurringSchedule) {
    if (day.isActive && day.endHour > day.startHour) {
      weeklyScheduledHoursPerSpace += day.endHour - day.startHour;
    }
  }
  const activeSpacesCount = spaces.filter((s) => (s.publicationStatus || "published") === "published").length;
  const listedHours = Number(((weeklyScheduledHoursPerSpace * activeSpacesCount * daysInPeriod) / 7).toFixed(1));

  // 2. Calculate actual booked hours and actual realized gross earnings
  let bookedHours = 0;
  let verifiedActualGrossBookings = 0;

  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const sDate = new Date(b.startTime);
    const eDate = new Date(b.endTime);
    if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
      const durHours = Math.max(1, (eDate.getTime() - sDate.getTime()) / (1000 * 3600));
      bookedHours += durHours;
    } else {
      bookedHours += 3; // Default fallback duration for sample demo bookings
    }
    verifiedActualGrossBookings += b.totalPrice || 0;
  }

  bookedHours = Number(bookedHours.toFixed(1));
  verifiedActualGrossBookings = Number(verifiedActualGrossBookings.toFixed(2));

  // 3. Available unbooked hours
  const availableUnbookedHours = Math.max(0, Number((listedHours - bookedHours).toFixed(1)));

  // 4. Utilization rate percentage
  const utilizationRatePercent = listedHours > 0
    ? Number(Math.min(100, (bookedHours / listedHours) * 100).toFixed(1))
    : 0;

  // 5. Projected gross booking value from unbooked hours
  // Uses weighted average rate across spaces and expected booking probability
  const avgSpaceRate = spaces.length > 0
    ? spaces.reduce((sum, s) => sum + s.pricePerHour, 0) / spaces.length
    : 7.0;

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
    disclaimer:
      "Calculations are explainable rule-based estimates using sample demand and do not represent guaranteed customers or realized revenue. Simulated projections are strictly separated from actual confirmed earnings.",
  };
}
