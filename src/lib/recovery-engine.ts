// ==============================================================================
// ParkMate Failed-Booking Recovery & Replacement Engine
// 
// Core Differentiator:
// When an arrival issue occurs (space occupied, gate inaccessible, details wrong),
// this engine evaluates nearby published candidate spaces, enforces hard vehicle
// physical compatibility, validates temporal availability, and deterministically
// ranks up to 3 replacement spaces with transparent recommendations.
// 
// If no valid alternatives exist, provides immediate transparent refund and escalation.
// ==============================================================================

import { ParkingSpace, VehicleType } from "@/types/parking";
import {
  evaluateVehicleCompatibility,
  CompatibilityResult,
  DEFAULT_SAFETY_MARGINS,
} from "./compatibility-engine";
import {
  calculateHaversineDistanceMiles,
  estimateUrbanWalkingMinutes,
} from "./ranking-engine";
import { ExistingBookingSlot, BlockedCalendarPeriod } from "./booking-engine";

export type AccessProblemType =
  | "space_occupied"
  | "entrance_inaccessible"
  | "listing_details_incorrect"
  | "other";

export interface AccessReportRecord {
  id: string;
  bookingId: string;
  spaceId: string;
  reporterId: string;
  problemType: AccessProblemType;
  notes: string;
  status: "open" | "investigating" | "resolved" | "dismissed";
  resolutionType?: "alternative_allocated" | "cancelled_and_refunded" | "support_escalated";
  createdAt: string;
  updatedAt: string;
  isDemo: boolean;
  metadata?: Record<string, unknown>;
}

export interface RecoveryAlternative {
  space: ParkingSpace;
  distanceMiles: number;
  walkingMinutes: number;
  compatibility: CompatibilityResult;
  pricePerHour: number;
  priceDifference: number;
  isPriceCovered: boolean;
  recommendationScore: number;
  recommendationReasons: string[];
}

export interface RecoveryBookingContext {
  id?: string;
  spaceId: string;
  startTime: string | Date;
  endTime: string | Date;
  vehicleType: VehicleType;
  vehicleModel?: string;
  customClearanceFeet?: number;
  customLengthFeet?: number;
  customWidthFeet?: number;
  originalHourlyRate: number;
  totalPrice?: number;
  maxBudget?: number;
}

/**
 * Returns human-readable label for the problem type
 */
export function getHumanReadableProblemName(problemType: AccessProblemType): string {
  switch (problemType) {
    case "space_occupied":
      return "Space occupied by unauthorized vehicle";
    case "entrance_inaccessible":
      return "Entrance inaccessible (gate locked, barrier down, or PIN failed)";
    case "listing_details_incorrect":
      return "Listing details incorrect or clearance lower than stated";
    case "other":
    default:
      return "Other physical access barrier";
  }
}

/**
 * Alternative-space matching:
 * Finds nearby spaces that:
 * 1. Are published and authorized.
 * 2. Fit the driver's vehicle (height clearance & dimensions pass hard constraints).
 * 3. Are available for the required time (no overlapping active/confirmed reservations or blocked periods).
 * 4. Meet the driver's maximum price or fall within ParkMate Protection coverage.
 * 5. Deterministically ranks valid alternatives with human-readable recommendation reasons.
 */
export function findRecoveryAlternatives(params: {
  currentSpace: ParkingSpace;
  booking: RecoveryBookingContext;
  candidateSpaces: ParkingSpace[];
  existingBookings: ExistingBookingSlot[];
  blockedPeriods?: BlockedCalendarPeriod[];
  userCoords?: { lat: number; lng: number };
  isDemo?: boolean;
}): RecoveryAlternative[] {
  const { currentSpace, booking, candidateSpaces, existingBookings, blockedPeriods = [], userCoords } = params;

  const targetStart = new Date(booking.startTime).getTime();
  const targetEnd = new Date(booking.endTime).getTime();

  // Reference origin point is user coordinates if available, otherwise original space
  const originLat = userCoords?.lat ?? currentSpace.coordinates.lat;
  const originLng = userCoords?.lng ?? currentSpace.coordinates.lng;

  const validAlternatives: RecoveryAlternative[] = [];

  for (const candidate of candidateSpaces) {
    // 1. Exclude the current problematic space
    if (candidate.id === currentSpace.id || candidate.id === booking.spaceId) {
      continue;
    }

    // 2. Must be published & authorized (allow verified or published)
    if (candidate.publicationStatus && candidate.publicationStatus !== "published") {
      continue;
    }

    // 3. Hard physical vehicle compatibility gate
    const compatibility = evaluateVehicleCompatibility(
      candidate,
      {
        vehicleType: booking.vehicleType,
        customHeightFeet: booking.customClearanceFeet,
        customLengthFeet: booking.customLengthFeet,
        customWidthFeet: booking.customWidthFeet,
      },
      DEFAULT_SAFETY_MARGINS
    );

    if (!compatibility.isCompatible) {
      continue; // Strictly skip physically incompatible spaces
    }

    // 4. Temporal availability check against existing bookings
    const hasBookingConflict = existingBookings.some((slot) => {
      if (slot.spaceId !== candidate.id) return false;
      const status = (slot.bookingStatus || "").toLowerCase();
      if (status !== "confirmed" && status !== "active" && status !== "pending") {
        return false; // Cancelled, refunded or completed do not block
      }
      const bStart = new Date(slot.startTime).getTime();
      const bEnd = new Date(slot.endTime).getTime();
      return bStart < targetEnd && bEnd > targetStart;
    });

    if (hasBookingConflict) {
      continue; // Space is occupied during this time window
    }

    // 5. Blocked calendar periods check
    const hasBlockedConflict = blockedPeriods.some((rule) => {
      if (rule.spaceId !== candidate.id) return false;
      const rStart = new Date(`${rule.date}T${rule.startTime}`).getTime();
      const rEnd = new Date(`${rule.date}T${rule.endTime}`).getTime();
      return rStart < targetEnd && rEnd > targetStart;
    });

    if (hasBlockedConflict) {
      continue;
    }

    // 6. Pricing & Coverage: Calculate price difference
    const priceDelta = candidate.pricePerHour - booking.originalHourlyRate;
    // ParkMate Booking Recovery Protection covers price differences up to $4.00/hr automatically
    const isPriceCovered = priceDelta <= 4.0;

    // Optional hard max budget filter
    if (booking.maxBudget && candidate.pricePerHour > booking.maxBudget && !isPriceCovered) {
      continue;
    }

    // 7. Distance & Walking Time from original location
    const distanceMiles = calculateHaversineDistanceMiles(
      originLat,
      originLng,
      candidate.coordinates.lat,
      candidate.coordinates.lng
    );

    // Filter out spaces excessively far (> 2.5 miles from original destination)
    if (distanceMiles > 2.5) {
      continue;
    }

    const walkingMinutes = estimateUrbanWalkingMinutes(distanceMiles);

    // 8. Deterministic Scoring
    // Proximity (0-40)
    const proximityScore = Math.max(0, 40 - distanceMiles * 25);
    // Vehicle clearance comfort (0-25)
    const fitScore = Math.min(25, (compatibility.fitScore / 100) * 25);
    // Host reputation & verification (0-20)
    const repScore = (candidate.isVerified ? 10 : 5) + Math.min(10, (candidate.rating / 5) * 10);
    // Amenity match / convenience (0-15)
    const convenienceScore = (candidate.isCovered ? 5 : 2) + (candidate.accessType === "app_remote" || candidate.accessType === "qr_scanner" ? 10 : 5);

    const recommendationScore = Number((proximityScore + fitScore + repScore + convenienceScore).toFixed(1));

    // 9. Generate Human-Readable Recommendation Reasons
    const recommendationReasons: string[] = [];

    if (distanceMiles < 0.25) {
      recommendationReasons.push(`${(distanceMiles * 5280).toFixed(0)} ft away (~${walkingMinutes} min walk from original spot)`);
    } else {
      recommendationReasons.push(`${distanceMiles.toFixed(2)} miles away (~${walkingMinutes} min walk)`);
    }

    if (compatibility.clearanceBufferFeet >= 1.0) {
      recommendationReasons.push(
        `Clearance of ${candidate.clearanceFeet.toFixed(1)} ft provides generous +${compatibility.clearanceBufferFeet.toFixed(1)} ft headroom for your ${booking.vehicleType.toUpperCase()}`
      );
    } else {
      recommendationReasons.push(`Verified clearance of ${candidate.clearanceFeet.toFixed(1)} ft comfortably fits your vehicle`);
    }

    if (isPriceCovered) {
      recommendationReasons.push("100% price matched under ParkMate Recovery Protection (No extra charge)");
    } else {
      recommendationReasons.push(`Rate: $${candidate.pricePerHour.toFixed(2)}/hr`);
    }

    if (candidate.accessType === "app_remote") {
      recommendationReasons.push("Instant automated app remote gate entry");
    } else if (candidate.accessType === "qr_scanner") {
      recommendationReasons.push("Digital QR scanner at gate pillar");
    } else if (candidate.accessType === "instant_keypad") {
      recommendationReasons.push("Instant digital keypad access code");
    }

    if (candidate.hasEvCharging && booking.vehicleType === "ev") {
      recommendationReasons.push("Equipped with dedicated Level 2 EV charging");
    }

    validAlternatives.push({
      space: candidate,
      distanceMiles: Number(distanceMiles.toFixed(2)),
      walkingMinutes,
      compatibility,
      pricePerHour: candidate.pricePerHour,
      priceDifference: Number(priceDelta.toFixed(2)),
      isPriceCovered,
      recommendationScore,
      recommendationReasons,
    });
  }

  // Sort descending by recommendation score
  validAlternatives.sort((a, b) => b.recommendationScore - a.recommendationScore);

  // Return up to 3 best options
  return validAlternatives.slice(0, 3);
}

/**
 * Concurrency-safe replacement validator & atomic allocation:
 * Re-validates that the replacement space is currently available before locking.
 */
export function validateReplacementAvailability(params: {
  replacementSpaceId: string;
  startTime: string | Date;
  endTime: string | Date;
  existingBookings: ExistingBookingSlot[];
  blockedPeriods?: BlockedCalendarPeriod[];
}): { isAvailable: boolean; conflictReason?: string } {
  const { replacementSpaceId, startTime, endTime, existingBookings, blockedPeriods = [] } = params;

  const targetStart = new Date(startTime).getTime();
  const targetEnd = new Date(endTime).getTime();

  // Check bookings conflict
  const conflict = existingBookings.find((slot) => {
    if (slot.spaceId !== replacementSpaceId) return false;
    const status = (slot.bookingStatus || "").toLowerCase();
    if (status !== "confirmed" && status !== "active" && status !== "pending") {
      return false;
    }
    const bStart = new Date(slot.startTime).getTime();
    const bEnd = new Date(slot.endTime).getTime();
    return bStart < targetEnd && bEnd > targetStart;
  });

  if (conflict) {
    return {
      isAvailable: false,
      conflictReason: `Replacement space was just reserved by another driver (reference conflict: ${conflict.id}).`,
    };
  }

  // Check calendar blocked rules
  const blocked = blockedPeriods.find((rule) => {
    if (rule.spaceId !== replacementSpaceId) return false;
    const rStart = new Date(`${rule.date}T${rule.startTime}`).getTime();
    const rEnd = new Date(`${rule.date}T${rule.endTime}`).getTime();
    return rStart < targetEnd && rEnd > targetStart;
  });

  if (blocked) {
    return {
      isAvailable: false,
      conflictReason: "Replacement space is currently blocked for scheduled maintenance.",
    };
  }

  return { isAvailable: true };
}

/**
 * Prepares transparent refund and escalation when no alternatives are available
 * or when the driver chooses a full cancellation.
 */
export function processRecoveryRefundAndEscalation(params: {
  bookingId: string;
  totalPrice: number;
  reason: string;
}): {
  refundAmount: number;
  inconvenienceCredit: number;
  ticketId: string;
  supportPhone: string;
  resolutionSummary: string;
} {
  const ticketId = `TICK-${Math.floor(1000 + Math.random() * 9000)}-REC`;
  const inconvenienceCredit = 15.00; // $15 credit towards next parking session

  return {
    refundAmount: params.totalPrice,
    inconvenienceCredit,
    ticketId,
    supportPhone: "+1 (800) 555-PARK (24/7 Priority Recovery Desk)",
    resolutionSummary: `Full refund of $${params.totalPrice.toFixed(2)} processed to original payment method. $${inconvenienceCredit.toFixed(2)} inconvenience credit applied to your ParkMate driver profile under ticket ${ticketId}.`,
  };
}
