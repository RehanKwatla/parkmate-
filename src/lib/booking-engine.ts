// ==============================================================================
// ParkMate Booking Integrity & FlexPark Engine
// Implements:
// 1. Authoritative server-side price calculation
// 2. Booking state machine with strict transition guards
// 3. FlexPark extension validation and atomic conflict checks
// 4. Cancellation policy evaluation
// 5. Test-mode payment verification (never stores card numbers)
// ==============================================================================

import { BookingStatus, PaymentStatus } from "@/types/database";
import { Booking } from "@/types/parking";
import { INITIAL_USER_BOOKINGS } from "@/lib/mock-data";

export interface PriceBreakdown {
  durationHours: number;
  hourlyRate: number;
  subtotal: number;
  serviceFee: number;
  tax: number;
  totalPrice: number;
}

export const PARK_SERVICE_FEE = 2.50; // Fixed platform service fee ($2.50)
export const PARK_TAX_RATE = 0.08;     // Municipal & state tax rate (8%)

/**
 * Calculates authoritative booking prices strictly on the server.
 */
export function calculateBookingPrice(
  hourlyRate: number,
  startTime: Date | string,
  endTime: Date | string
): PriceBreakdown {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) {
    throw new Error("End time must be strictly after start time.");
  }

  // Round up to nearest full hour, minimum 1 hour
  const durationHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
  const subtotal = Number((hourlyRate * durationHours).toFixed(2));
  const serviceFee = PARK_SERVICE_FEE;
  const tax = Number((subtotal * PARK_TAX_RATE).toFixed(2));
  const totalPrice = Number((subtotal + serviceFee + tax).toFixed(2));

  return {
    durationHours,
    hourlyRate,
    subtotal,
    serviceFee,
    tax,
    totalPrice,
  };
}

/**
 * Generates an alphanumeric booking reference: PM-XXXX-XXXX
 */
export function generateBookingReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `PM-${part1}-${part2}`;
}

/**
 * Generates a human-readable gate/entry access code: PASS-XXXX-XXXX
 */
export function generateAccessCode(spaceId?: string): string {
  const pin = Math.floor(1000 + Math.random() * 9000);
  const suffix = spaceId ? spaceId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() : "SAFE";
  return `PASS-${pin}-${suffix}`;
}

/**
 * Validates state transitions according to the ParkMate Booking Lifecycle State Machine.
 * Allowed transitions:
 * - pending -> confirmed, cancelled, failed
 * - confirmed -> active, cancelled
 * - active -> completed, access_issue, cancelled
 * - access_issue -> recovered, completed, cancelled
 * - completed -> (terminal)
 * - cancelled -> (terminal)
 */
export function isValidBookingStateTransition(
  fromStatus: BookingStatus | string,
  toStatus: BookingStatus | string
): { isValid: boolean; reason?: string } {
  if (fromStatus === toStatus) {
    return { isValid: true };
  }

  const validTransitions: Record<string, string[]> = {
    pending: ["confirmed", "cancelled", "failed"],
    confirmed: ["active", "cancelled"],
    active: ["completed", "access_issue", "cancelled"],
    access_issue: ["recovered", "completed", "cancelled", "active"],
    recovered: ["active", "completed"],
    completed: [], // Terminal state
    cancelled: [], // Terminal state
    refunded: [],  // Terminal state
  };

  const allowed = validTransitions[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    return {
      isValid: false,
      reason: `Invalid status transition: A booking in state "${fromStatus}" cannot be transitioned to "${toStatus}".`,
    };
  }

  return { isValid: true };
}

/**
 * Evaluates the cancellation refund policy.
 * - More than 2 hours before start_time: 100% full refund including service fee.
 * - Within 2 hours before start_time: Refund subtotal & tax, service fee retained.
 * - After start_time: Non-refundable (or partial pro-rata credit by host approval).
 */
export function evaluateCancellationPolicy(
  startTime: Date | string,
  totalPrice: number,
  serviceFee: number = PARK_SERVICE_FEE,
  now: Date = new Date()
): { eligibleForRefund: boolean; refundAmount: number; policyTier: "full" | "partial" | "none"; note: string } {
  const start = new Date(startTime).getTime();
  const current = now.getTime();
  const diffHours = (start - current) / (1000 * 60 * 60);

  if (diffHours >= 2.0) {
    return {
      eligibleForRefund: true,
      refundAmount: totalPrice,
      policyTier: "full",
      note: "Full refund authorized (> 2 hours prior to arrival).",
    };
  } else if (diffHours > 0) {
    const partial = Math.max(0, Number((totalPrice - serviceFee).toFixed(2)));
    return {
      eligibleForRefund: true,
      refundAmount: partial,
      policyTier: "partial",
      note: "Partial refund: Subtotal refunded, standard service fee retained (< 2 hours prior).",
    };
  } else {
    return {
      eligibleForRefund: false,
      refundAmount: 0,
      policyTier: "none",
      note: "Non-refundable: Scheduled arrival time has already commenced.",
    };
  }
}

export interface ExistingBookingSlot {
  id: string;
  spaceId: string;
  startTime: string;
  endTime: string;
  bookingStatus: string;
}

export interface BlockedCalendarPeriod {
  spaceId: string;
  date: string;
  startTime: string;
  endTime: string;
}

/**
 * FlexPark: Evaluates extension availability on an active or confirmed booking.
 * Guarantees that an extension will never overlap a subsequent reservation or blocked period.
 */
export function evaluateFlexParkExtension(params: {
  currentBookingId: string;
  spaceId: string;
  hourlyRate: number;
  currentEndTime: string | Date;
  additionalHours: number;
  existingBookings: ExistingBookingSlot[];
  blockedPeriods?: BlockedCalendarPeriod[];
}): {
  canExtend: boolean;
  conflictReason?: string;
  newEndTime: string;
  additionalCost: number;
  tax: number;
  totalAdditional: number;
} {
  const currentEnd = new Date(params.currentEndTime);
  const newEnd = new Date(currentEnd.getTime() + params.additionalHours * 60 * 60 * 1000);

  const newEndIso = newEnd.toISOString();
  const currentEndIso = currentEnd.toISOString();

  // 1. Check for conflicting subsequent bookings
  for (const b of params.existingBookings) {
    // Skip self
    if (b.id === params.currentBookingId) continue;
    if (b.spaceId !== params.spaceId) continue;
    if (!["confirmed", "active", "pending"].includes(b.bookingStatus)) continue;

    // Conflict exists if the extended timeframe [currentEnd, newEnd] overlaps with another booking [b.startTime, b.endTime]
    const bStart = new Date(b.startTime).toISOString();
    const bEnd = new Date(b.endTime).toISOString();

    if (currentEndIso < bEnd && newEndIso > bStart) {
      const conflictFormatted = new Date(b.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      return {
        canExtend: false,
        conflictReason: `Extension unavailable: Another driver has already reserved this space starting at ${conflictFormatted}.`,
        newEndTime: currentEndIso,
        additionalCost: 0,
        tax: 0,
        totalAdditional: 0,
      };
    }
  }

  // 2. Check for owner-defined calendar blocked periods
  if (params.blockedPeriods) {
    for (const block of params.blockedPeriods) {
      if (block.spaceId !== params.spaceId) continue;
      const blockStart = new Date(`${block.date}T${block.startTime}`).toISOString();
      const blockEnd = new Date(`${block.date}T${block.endTime}`).toISOString();

      if (currentEndIso < blockEnd && newEndIso > blockStart) {
        return {
          canExtend: false,
          conflictReason: `Extension unavailable: Space owner has scheduled a blocked period starting on ${block.date} at ${block.startTime}.`,
          newEndTime: currentEndIso,
          additionalCost: 0,
          tax: 0,
          totalAdditional: 0,
        };
      }
    }
  }

  // Calculate additional charge
  const additionalCost = Number((params.hourlyRate * params.additionalHours).toFixed(2));
  const tax = Number((additionalCost * PARK_TAX_RATE).toFixed(2));
  const totalAdditional = Number((additionalCost + tax).toFixed(2));

  return {
    canExtend: true,
    newEndTime: newEndIso,
    additionalCost,
    tax,
    totalAdditional,
  };
}

/**
 * Simulated Payment Provider for Test Mode.
 * Verifies simulated payment intents server-side and never stores raw card details.
 */
export interface PaymentResult {
  success: boolean;
  transactionId: string;
  paymentStatus: PaymentStatus;
  errorMessage?: string;
  method: string;
}

export function processSimulatedPayment(params: {
  amount: number;
  paymentMethod?: string;
  simulateFailure?: boolean;
}): PaymentResult {
  const transactionId = `txn_test_${Math.random().toString(36).substring(2, 12)}`;

  if (params.simulateFailure || params.paymentMethod === "simulate_failure") {
    return {
      success: false,
      transactionId,
      paymentStatus: "failed",
      errorMessage: "Simulated payment failed: Card declined by test issuer (insufficient funds or simulated card error).",
      method: "test_card",
    };
  }

  return {
    success: true,
    transactionId,
    paymentStatus: "paid",
    method: params.paymentMethod || "test_card_visa",
  };
}

// ==============================================================================
// Shared In-Memory Sandbox Persistence
// Preserves sandbox bookings and reports across all Next.js route handlers
// ==============================================================================

export interface InMemoryReport {
  id: string;
  bookingId: string;
  spaceId: string;
  reporterId: string;
  problemType: string;
  description: string;
  status: "open" | "investigating" | "resolved" | "dismissed";
  resolutionNotes?: string;
  createdAt: string;
  isDemo: boolean;
}

const GLOBAL_SANDBOX_BOOKINGS: Booking[] = [...INITIAL_USER_BOOKINGS];
const GLOBAL_SANDBOX_REPORTS: InMemoryReport[] = [
  {
    id: "rep-demo-01",
    bookingId: "bk-demo-fail",
    spaceId: "sp-101",
    reporterId: "user-demo",
    problemType: "space_occupied",
    description: "Another car is parked in reserved space #A12 upon arrival.",
    status: "open",
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    isDemo: true,
  },
];

export function getSandboxBookings(): Booking[] {
  return GLOBAL_SANDBOX_BOOKINGS;
}

export function findSandboxBooking(id: string): Booking | undefined {
  return GLOBAL_SANDBOX_BOOKINGS.find((b) => b.id === id);
}

export function addSandboxBooking(booking: Booking): void {
  const existingIdx = GLOBAL_SANDBOX_BOOKINGS.findIndex((b) => b.id === booking.id);
  if (existingIdx >= 0) {
    GLOBAL_SANDBOX_BOOKINGS[existingIdx] = booking;
  } else {
    GLOBAL_SANDBOX_BOOKINGS.unshift(booking);
  }
}

export function updateSandboxBooking(id: string, updates: Partial<Booking>): Booking | undefined {
  const booking = GLOBAL_SANDBOX_BOOKINGS.find((b) => b.id === id);
  if (!booking) return undefined;
  Object.assign(booking, updates);
  return booking;
}

export function getSandboxReports(): InMemoryReport[] {
  return GLOBAL_SANDBOX_REPORTS;
}

export function addSandboxReport(report: InMemoryReport): void {
  GLOBAL_SANDBOX_REPORTS.unshift(report);
}

export function updateSandboxReport(
  id: string,
  updates: Partial<InMemoryReport>
): InMemoryReport | undefined {
  const rep = GLOBAL_SANDBOX_REPORTS.find((r) => r.id === id);
  if (!rep) return undefined;
  Object.assign(rep, updates);
  return rep;
}

