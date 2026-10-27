import { NextResponse } from "next/server";
import { BookingStatusUpdateSchema } from "@/lib/validations";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  evaluateFlexParkExtension,
  evaluateCancellationPolicy,
  isValidBookingStateTransition,
} from "@/lib/booking-engine";
import { processPayment, processRefund } from "@/lib/payment-engine";
import { getClientIdentifier, checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { INITIAL_USER_BOOKINGS } from "@/lib/mock-data";
import { BookingStatus } from "@/types/database";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    if (supabase) {
      const { data: booking, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          parking_spaces:space_id (
            id, title, address, photos, price_per_hour, clearance_feet,
            space_dimensions, max_vehicle_type, access_instructions,
            access_type, security_features, rules, owner_id,
            profiles:owner_id (display_name, phone)
          )
        `
        )
        .eq("id", id)
        .single();

      if (!error && booking) {
        interface SpaceWithHost {
          id: string;
          title: string;
          address: string;
          photos: string[];
          price_per_hour: number;
          clearance_feet: number;
          space_dimensions: string | null;
          access_instructions: string;
          access_type: string;
          security_features: string[];
          rules: string[];
          profiles?: { display_name: string; phone: string | null } | null;
        }
        const space = booking.parking_spaces as unknown as SpaceWithHost | null;

        return NextResponse.json({
          success: true,
          booking: {
            id: booking.id,
            bookingReference: booking.booking_reference,
            driverId: booking.driver_id,
            spaceId: booking.space_id,
            spaceTitle: space?.title || "Reserved Space",
            spaceAddress: space?.address || "Address available on pass",
            spaceImage: space?.photos?.[0] || "",
            startTime: booking.start_time,
            endTime: booking.end_time,
            vehicleModel: booking.vehicle_model,
            vehicleType: booking.vehicle_type,
            licensePlate: booking.license_plate,
            hourlyRate: Number(booking.hourly_rate),
            subtotal: Number(booking.subtotal || booking.hourly_rate),
            serviceFee: Number(booking.service_fee || 2.50),
            tax: Number(booking.tax || 0),
            totalPrice: Number(booking.total_price),
            status: booking.booking_status,
            paymentStatus: booking.payment_status,
            accessCode: booking.access_code,
            canExtend: booking.can_extend,
            recoveryStatus: booking.recovery_status,
            accessInstructions: space?.access_instructions || "",
            accessType: space?.access_type || "instant_keypad",
            hostName: space?.profiles?.display_name || "Space Host",
            hostPhone: space?.profiles?.phone || "+1 (555) 019-2831",
            cancellationPolicy: evaluateCancellationPolicy(booking.start_time, Number(booking.total_price)),
          },
        });
      }
    }

    // Sandbox / Mock fallback
    const mockMatch = INITIAL_USER_BOOKINGS.find((b) => b.id === id);
    if (mockMatch) {
      return NextResponse.json({
        success: true,
        booking: {
          ...mockMatch,
          cancellationPolicy: evaluateCancellationPolicy(new Date().toISOString(), mockMatch.totalPrice),
        },
      });
    }

    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load reservation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    // -------------------------------------------------------------------------
    // Rate Limiting: Max 20 booking modification attempts per minute
    // -------------------------------------------------------------------------
    const clientIp = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientIp, "booking_patch", { limit: 20, windowMs: 60 * 1000 });
    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit.limit, rateLimit.remaining, rateLimit.resetInSeconds, "reservation modification");
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = BookingStatusUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { action, status: requestedStatus, additionalHours, reason, simulateFailure } = parsed.data;
    const supabase = await createServerSupabaseClient();

    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const currentUserId = user?.id || "driver-guest-001";

      // 1. Fetch current booking
      const { data: booking, error: fetchErr } = await supabase
        .from("bookings")
        .select("*, parking_spaces:space_id (owner_id, price_per_hour, title, flexible_extension_supported)")
        .eq("id", id)
        .single();

      if (fetchErr || !booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      interface SpaceInfo {
        owner_id: string;
        price_per_hour: number;
        title: string;
        flexible_extension_supported: boolean;
      }
      const spaceInfo = booking.parking_spaces as unknown as SpaceInfo | null;

      // Ownership authorization guard
      if (user && booking.driver_id !== user.id && spaceInfo?.owner_id !== user.id) {
        return NextResponse.json(
          { error: "Unauthorized: You do not have permission to modify this reservation.", code: "FORBIDDEN" },
          { status: 403 }
        );
      }

      // =======================================================================
      // ACTION: FLEXPARK EXTENSION
      // =======================================================================
      if (action === "extend") {
        if (!additionalHours || additionalHours < 1) {
          return NextResponse.json(
            { error: "Valid additionalHours (1-24) required for extension." },
            { status: 400 }
          );
        }

        if (!booking.can_extend) {
          return NextResponse.json(
            { error: "This space does not support time extensions." },
            { status: 400 }
          );
        }

        if (["completed", "cancelled", "refunded"].includes(booking.booking_status)) {
          return NextResponse.json(
            { error: `Cannot extend a reservation that is already ${booking.booking_status}.` },
            { status: 400 }
          );
        }

        // Fetch all active/confirmed bookings on this space to detect subsequent conflicts
        const { data: otherBookings } = await supabase
          .from("bookings")
          .select("id, space_id, start_time, end_time, booking_status")
          .eq("space_id", booking.space_id)
          .in("booking_status", ["confirmed", "active", "pending"]);

        // Fetch blocked calendar periods
        const { data: blockedRules } = await supabase
          .from("availability_rules")
          .select("space_id, specific_date, start_time, end_time")
          .eq("space_id", booking.space_id)
          .eq("is_blocked", true);

        const formattedExisting = (otherBookings || []).map((b) => ({
          id: b.id,
          spaceId: b.space_id,
          startTime: b.start_time,
          endTime: b.end_time,
          bookingStatus: b.booking_status,
        }));

        const formattedBlocked = (blockedRules || []).map((r) => ({
          spaceId: r.space_id,
          date: r.specific_date || "",
          startTime: r.start_time,
          endTime: r.end_time,
        }));

        const hourlyRate = Number(spaceInfo?.price_per_hour || booking.hourly_rate);

        // Run FlexPark extension conflict evaluation
        const evalResult = evaluateFlexParkExtension({
          currentBookingId: booking.id,
          spaceId: booking.space_id,
          hourlyRate,
          currentEndTime: booking.end_time,
          additionalHours,
          existingBookings: formattedExisting,
          blockedPeriods: formattedBlocked,
        });

        // If conflict detected, strictly preserve original booking and explain conflict
        if (!evalResult.canExtend) {
          return NextResponse.json(
            {
              error: evalResult.conflictReason,
              code: "EXTENSION_CONFLICT",
              originalEndTime: booking.end_time,
            },
            { status: 409 }
          );
        }

        // Process payment for extension charge via Payment Engine
        const paymentResult = await processPayment({
          amount: evalResult.totalAdditional,
          simulateFailure,
          metadata: {
            bookingId: id,
            action: "extension",
            additionalHours,
          },
        });

        if (!paymentResult.success) {
          return NextResponse.json(
            {
              error: paymentResult.errorMessage || "Extension payment failed.",
              code: "PAYMENT_FAILED",
              paymentStatus: "failed",
              mode: paymentResult.mode,
              disclaimer: paymentResult.disclaimer,
              originalEndTime: booking.end_time,
            },
            { status: 402 }
          );
        }

        // Atomically update booking with extended end_time and new total_price
        const newTotal = Number((Number(booking.total_price) + evalResult.totalAdditional).toFixed(2));
        const { data: updatedBooking, error: updateErr } = await supabase
          .from("bookings")
          .update({
            end_time: evalResult.newEndTime,
            total_price: newTotal,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();

        if (updateErr) {
          if (updateErr.message.includes("no_overlapping_confirmed_bookings")) {
            return NextResponse.json(
              {
                error: "Database constraint prevented extension: a concurrent reservation was confirmed.",
                code: "EXTENSION_CONFLICT",
              },
              { status: 409 }
            );
          }
          return NextResponse.json({ error: updateErr.message }, { status: 400 });
        }

        // Record audit event in booking_events
        await supabase.from("booking_events").insert({
          booking_id: id,
          event_type: "extension",
          note: `FlexPark: Session extended by +${additionalHours}hr (+$${evalResult.totalAdditional.toFixed(2)}).`,
          created_by: currentUserId,
          metadata: {
            additionalHours,
            cost: evalResult.additionalCost,
            tax: evalResult.tax,
            totalAdditional: evalResult.totalAdditional,
            newEndTime: evalResult.newEndTime,
            transactionId: paymentResult.transactionId,
          },
        });

        return NextResponse.json({
          success: true,
          booking: updatedBooking,
          extension: {
            additionalHours,
            totalAdditional: evalResult.totalAdditional,
            newEndTime: evalResult.newEndTime,
            transactionId: paymentResult.transactionId,
          },
          message: `Booking successfully extended by +${additionalHours} hour(s).`,
        });
      }

      // =======================================================================
      // ACTION: CANCELLATION (Releases Space Availability)
      // =======================================================================
      if (action === "cancel") {
        // Guard state machine transition
        const transitionCheck = isValidBookingStateTransition(booking.booking_status, "cancelled");
        if (!transitionCheck.isValid) {
          return NextResponse.json({ error: transitionCheck.reason }, { status: 400 });
        }

        // Evaluate refund policy
        const policy = evaluateCancellationPolicy(booking.start_time, Number(booking.total_price));

        // Process refund transaction with transparent test/real mode declaration
        const refund = await processRefund({
          transactionId: `txn_${id}`,
          refundAmount: policy.refundAmount,
          policyTier: policy.policyTier,
          reason: reason || policy.note,
          isDemoTransaction: true,
        });

        const { data: updatedBooking, error: cancelErr } = await supabase
          .from("bookings")
          .update({
            booking_status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();

        if (cancelErr) {
          return NextResponse.json({ error: cancelErr.message }, { status: 400 });
        }

        // Record cancellation event in booking_events
        await supabase.from("booking_events").insert({
          booking_id: id,
          event_type: "cancellation",
          from_status: booking.booking_status,
          to_status: "cancelled",
          note: reason || policy.note,
          created_by: currentUserId,
          metadata: {
            refundAmount: policy.refundAmount,
            policyTier: policy.policyTier,
            refundId: refund.refundId,
            isDemoRefund: refund.isDemoRefund,
            disclaimer: refund.disclaimer,
            cancelledAt: new Date().toISOString(),
          },
        });

        return NextResponse.json({
          success: true,
          booking: updatedBooking,
          cancellation: {
            refundAmount: policy.refundAmount,
            policyTier: policy.policyTier,
            note: policy.note,
            releasedAvailability: true,
            refundId: refund.refundId,
            isDemoRefund: refund.isDemoRefund,
            disclaimer: refund.disclaimer,
          },
          message: "Reservation successfully cancelled. Space slot has been released.",
        });
      }

      // =======================================================================
      // ACTION: STATUS UPDATE (Lifecycle Transitions)
      // =======================================================================
      if (requestedStatus) {
        const transitionCheck = isValidBookingStateTransition(booking.booking_status, requestedStatus);
        if (!transitionCheck.isValid) {
          return NextResponse.json({ error: transitionCheck.reason }, { status: 400 });
        }

        const { data: updatedBooking, error: statusErr } = await supabase
          .from("bookings")
          .update({
            booking_status: requestedStatus as BookingStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();

        if (statusErr) {
          return NextResponse.json({ error: statusErr.message }, { status: 400 });
        }

        await supabase.from("booking_events").insert({
          booking_id: id,
          event_type: requestedStatus === "access_issue" ? "access_issue" : "status_change",
          from_status: booking.booking_status,
          to_status: requestedStatus,
          note: reason || `Status updated to ${requestedStatus}`,
          created_by: currentUserId,
        });

        return NextResponse.json({
          success: true,
          booking: updatedBooking,
          message: `Booking status transitioned to ${requestedStatus}.`,
        });
      }
    }

    // Sandbox / Mock fallback response
    return NextResponse.json({
      success: true,
      bookingId: id,
      message: `Reservation ${action || "status"} processed (sandbox mode).`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update reservation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
