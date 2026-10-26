import { NextResponse } from "next/server";
import { BookingCreateSchema, BookingQuoteSchema } from "@/lib/validations";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MOCK_PARKING_SPACES } from "@/lib/mock-data";
import {
  calculateBookingPrice,
  generateBookingReference,
  generateAccessCode,
  processSimulatedPayment,
  evaluateCancellationPolicy,
  getSandboxBookings,
  addSandboxBooking,
} from "@/lib/booking-engine";
import { evaluateVehicleCompatibility, DEFAULT_SAFETY_MARGINS } from "@/lib/compatibility-engine";
import { mapDbSpaceToParkingSpace, Booking, ParkingSpace, VehicleType } from "@/types/parking";
import { Json } from "@/types/database";

interface BookingWithSpaceRow {
  id: string;
  booking_reference: string;
  driver_id: string;
  space_id: string;
  start_time: string;
  end_time: string;
  vehicle_model: string;
  vehicle_type: string;
  license_plate: string;
  hourly_rate: number;
  subtotal: number;
  service_fee: number;
  tax: number;
  total_price: number;
  booking_status: "pending" | "confirmed" | "active" | "completed" | "cancelled" | "refunded" | "recovered";
  payment_status: "pending" | "paid" | "refunded" | "failed";
  access_code: string;
  can_extend: boolean;
  recovery_status: "none" | "reported" | "recovered";
  alternative_space_id: string | null;
  created_at: string;
  parking_spaces: {
    id: string;
    title: string;
    address: string;
    photos: string[];
    price_per_hour: number;
    clearance_feet: number;
    space_dimensions: string | null;
    max_vehicle_type: VehicleType;
    access_instructions: string;
    flexible_extension_supported: boolean;
    owner_id: string;
  } | null;
}

// In-memory module store to preserve bookings during sandbox sessions across page refreshes
const SANDBOX_BOOKINGS = getSandboxBookings();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // -------------------------------------------------------------------------
    // 1. Transparent Server-Side Price Quote (Pre-confirmation)
    // -------------------------------------------------------------------------
    if (action === "quote") {
      const parsedQuote = BookingQuoteSchema.safeParse({
        spaceId: searchParams.get("spaceId"),
        durationHours: searchParams.get("durationHours") || 2,
        startTime: searchParams.get("startTime") || undefined,
        endTime: searchParams.get("endTime") || undefined,
      });

      if (!parsedQuote.success) {
        return NextResponse.json({ error: "Invalid quote parameters", details: parsedQuote.error.issues }, { status: 400 });
      }

      const { spaceId, durationHours, startTime: startTimeParam, endTime: endTimeParam } = parsedQuote.data;

      const supabase = await createServerSupabaseClient();
      let space: ParkingSpace | null = null;

      if (supabase) {
        const { data: dbSpace } = await supabase
          .from("parking_spaces")
          .select("*")
          .eq("id", spaceId)
          .single();
        if (dbSpace) {
          space = {
            id: dbSpace.id,
            title: dbSpace.title,
            pricePerHour: Number(dbSpace.price_per_hour),
          } as ParkingSpace;
        }
      }

      if (!space) {
        space = MOCK_PARKING_SPACES.find((s) => s.id === spaceId) || null;
      }

      if (!space) {
        return NextResponse.json({ error: "Parking space not found" }, { status: 404 });
      }

      const start = startTimeParam ? new Date(startTimeParam) : new Date();
      const end = endTimeParam ? new Date(endTimeParam) : new Date(start.getTime() + durationHours * 3600 * 1000);

      const quote = calculateBookingPrice(space.pricePerHour, start, end);
      return NextResponse.json({
        success: true,
        spaceId: space.id,
        hourlyRate: space.pricePerHour,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        quote,
      });
    }

    // -------------------------------------------------------------------------
    // 2. Fetch User / Owner Bookings History
    // -------------------------------------------------------------------------
    const supabase = await createServerSupabaseClient();
    const roleFilter = searchParams.get("role"); // 'driver' | 'owner'

    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        let query = supabase
          .from("bookings")
          .select(
            `
            *,
            parking_spaces:space_id (
              id, title, address, photos, price_per_hour, clearance_feet,
              space_dimensions, max_vehicle_type, access_instructions,
              flexible_extension_supported, owner_id
            )
          `
          )
          .order("created_at", { ascending: false });

        if (roleFilter === "owner") {
          query = query.eq("parking_spaces.owner_id", user.id);
        } else {
          query = query.eq("driver_id", user.id);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          const formattedBookings: Booking[] = (data as unknown as BookingWithSpaceRow[]).map((b) => {
            const now = new Date();
            const sDate = new Date(b.start_time);
            const eDate = new Date(b.end_time);

            // Compute dynamic status according to current time
            let dynamicStatus = b.booking_status;
            if (b.booking_status === "confirmed" || b.booking_status === "active") {
              if (now >= eDate) {
                dynamicStatus = "completed";
              } else if (now >= sDate) {
                dynamicStatus = "active";
              } else {
                dynamicStatus = "confirmed";
              }
            }

            return {
              id: b.id,
              bookingReference: b.booking_reference,
              driverId: b.driver_id,
              spaceId: b.space_id,
              spaceTitle: b.parking_spaces?.title || "Reserved Space",
              spaceAddress: b.parking_spaces?.address || "Address available on pass",
              spaceImage:
                b.parking_spaces?.photos?.[0] ||
                "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80",
              startTime: sDate.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }),
              endTime: eDate.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }),
              vehicleModel: b.vehicle_model,
              vehicleType: b.vehicle_type as VehicleType,
              licensePlate: b.license_plate,
              hourlyRate: Number(b.hourly_rate),
              subtotal: Number(b.subtotal || b.hourly_rate * 2),
              serviceFee: Number(b.service_fee || 2.50),
              tax: Number(b.tax || 0),
              totalPrice: Number(b.total_price),
              status: dynamicStatus as Booking["status"],
              paymentStatus: b.payment_status,
              accessCode: b.access_code,
              canExtend: b.can_extend,
              recoveryStatus: b.recovery_status,
              alternativeSpaceId: b.alternative_space_id || undefined,
              createdAt: b.created_at,
            };
          });

          return NextResponse.json({
            success: true,
            source: "supabase",
            count: formattedBookings.length,
            bookings: formattedBookings,
          });
        }
      }
    }

    // Sandbox / Mock fallback (persisted in memory across client refreshes)
    return NextResponse.json({
      success: true,
      source: "sandbox",
      count: SANDBOX_BOOKINGS.length,
      bookings: SANDBOX_BOOKINGS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load bookings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = BookingCreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const {
      spaceId,
      durationHours,
      startTime,
      endTime,
      vehicleModel,
      vehicleType,
      licensePlate,
      customHeightFeet,
      customLengthFeet,
      customWidthFeet,
      paymentMethod,
      simulateFailure,
    } = result.data;

    // -------------------------------------------------------------------------
    // 1. Locate Space & Revalidate Listing Publication Status
    // -------------------------------------------------------------------------
    const supabase = await createServerSupabaseClient();
    let currentUserId: string = "driver-guest-001";
    let targetSpace: ParkingSpace | null = null;

    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        currentUserId = user.id;
      }

      const { data: dbSpace, error: spaceErr } = await supabase
        .from("parking_spaces")
        .select("*")
        .eq("id", spaceId)
        .single();

      if (!spaceErr && dbSpace) {
        targetSpace = mapDbSpaceToParkingSpace(dbSpace);
      }
    }

    if (!targetSpace) {
      targetSpace = MOCK_PARKING_SPACES.find((s) => s.id === spaceId) || null;
    }

    if (!targetSpace) {
      return NextResponse.json(
        { error: "Selected parking space does not exist or has been removed.", code: "SPACE_NOT_FOUND" },
        { status: 404 }
      );
    }

    // -------------------------------------------------------------------------
    // 2. Hard Vehicle Compatibility Re-validation
    // -------------------------------------------------------------------------
    const compatibility = evaluateVehicleCompatibility(
      targetSpace,
      {
        vehicleType,
        customHeightFeet,
        customLengthFeet,
        customWidthFeet,
      },
      DEFAULT_SAFETY_MARGINS
    );

    if (!compatibility.isCompatible) {
      return NextResponse.json(
        {
          error: "Vehicle is physically incompatible with this parking space.",
          reasons: compatibility.reasons,
          code: "VEHICLE_INCOMPATIBLE",
          details: compatibility.details,
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // 3. Time Window Normalization & Validation
    // -------------------------------------------------------------------------
    const now = new Date();
    const startTimeDate = startTime ? new Date(startTime) : now;
    let endTimeDate: Date;

    if (endTime) {
      endTimeDate = new Date(endTime);
    } else {
      endTimeDate = new Date(startTimeDate.getTime() + durationHours * 3600 * 1000);
    }

    if (isNaN(startTimeDate.getTime()) || isNaN(endTimeDate.getTime())) {
      return NextResponse.json({ error: "Invalid start or end datetime format" }, { status: 400 });
    }

    if (endTimeDate <= startTimeDate) {
      return NextResponse.json(
        { error: "Departure time must be strictly after arrival time.", code: "INVALID_TIME_RANGE" },
        { status: 400 }
      );
    }

    const sIso = startTimeDate.toISOString();
    const eIso = endTimeDate.toISOString();

    // -------------------------------------------------------------------------
    // 4. Overlap & Conflict Detection (PostgreSQL Constraints & Server Locking)
    // -------------------------------------------------------------------------
    if (supabase) {
      // Check conflicting active/confirmed bookings
      const { data: conflicts } = await supabase
        .from("bookings")
        .select("id, booking_reference, start_time, end_time")
        .eq("space_id", targetSpace.id)
        .in("booking_status", ["confirmed", "active", "pending"])
        .lt("start_time", eIso)
        .gt("end_time", sIso);

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json(
          {
            error: "Selected space is unavailable or already reserved for this timeframe.",
            code: "OVERLAPPING_BOOKING",
            conflictingBooking: conflicts[0].booking_reference,
          },
          { status: 409 }
        );
      }

      // Check owner blocked periods in availability_rules
      const sDateOnly = sIso.slice(0, 10);
      const { data: blockedRules } = await supabase
        .from("availability_rules")
        .select("id, specific_date, start_time, end_time")
        .eq("space_id", targetSpace.id)
        .eq("is_blocked", true)
        .eq("specific_date", sDateOnly);

      if (blockedRules && blockedRules.length > 0) {
        for (const r of blockedRules) {
          const ruleStart = new Date(`${r.specific_date}T${r.start_time}`).toISOString();
          const ruleEnd = new Date(`${r.specific_date}T${r.end_time}`).toISOString();
          if (sIso < ruleEnd && eIso > ruleStart) {
            return NextResponse.json(
              {
                error: "Selected space has been blocked by the owner for maintenance or private use.",
                code: "OWNER_BLOCKED_PERIOD",
              },
              { status: 409 }
            );
          }
        }
      }
    } else {
      // In-memory conflict check for sandbox mode
      const conflict = SANDBOX_BOOKINGS.find(
        (b) =>
          b.spaceId === targetSpace?.id &&
          ["confirmed", "active", "pending"].includes(b.status) &&
          new Date(b.startTime) < endTimeDate &&
          new Date(b.endTime) > startTimeDate
      );

      if (conflict) {
        return NextResponse.json(
          {
            error: "Selected space is unavailable or already reserved for this timeframe.",
            code: "OVERLAPPING_BOOKING",
            conflictingBooking: conflict.bookingReference,
          },
          { status: 409 }
        );
      }
    }

    // -------------------------------------------------------------------------
    // 5. Authoritative Server Pricing Calculation
    // -------------------------------------------------------------------------
    const priceBreakdown = calculateBookingPrice(targetSpace.pricePerHour, startTimeDate, endTimeDate);

    // -------------------------------------------------------------------------
    // 6. Server-Side Payment Verification (Simulated Test Provider)
    // -------------------------------------------------------------------------
    const paymentResult = processSimulatedPayment({
      amount: priceBreakdown.totalPrice,
      paymentMethod,
      simulateFailure,
    });

    if (!paymentResult.success) {
      return NextResponse.json(
        {
          error: paymentResult.errorMessage || "Payment declined by simulated issuer.",
          code: "PAYMENT_FAILED",
          paymentStatus: "failed",
          transactionId: paymentResult.transactionId,
        },
        { status: 402 } // 402 Payment Required
      );
    }

    // -------------------------------------------------------------------------
    // 7. Atomic Booking Creation & Access Pass Issuance
    // -------------------------------------------------------------------------
    const bookingRef = generateBookingReference();
    const accessCode = generateAccessCode(targetSpace.id);

    // Determine initial booking status
    // If arrival is within 15 minutes of now or past, mark 'active'; otherwise 'confirmed'
    const isImminent = startTimeDate.getTime() - now.getTime() <= 15 * 60 * 1000;
    const initialStatus = isImminent ? "active" : "confirmed";

    let createdBookingId = `bk-${Date.now()}`;

    if (supabase) {
      const { data: dbBooking, error: insertError } = await supabase
        .from("bookings")
        .insert({
          booking_reference: bookingRef,
          driver_id: currentUserId,
          space_id: targetSpace.id,
          start_time: sIso,
          end_time: eIso,
          booking_status: initialStatus,
          payment_status: "paid",
          hourly_rate: targetSpace.pricePerHour,
          subtotal: priceBreakdown.subtotal,
          service_fee: priceBreakdown.serviceFee,
          tax: priceBreakdown.tax,
          total_price: priceBreakdown.totalPrice,
          vehicle_model: vehicleModel,
          vehicle_type: vehicleType,
          license_plate: licensePlate,
          access_code: accessCode,
          can_extend: targetSpace.flexibleExtensionSupported,
          recovery_status: "none",
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.message.includes("no_overlapping_confirmed_bookings")) {
          return NextResponse.json(
            {
              error: "Database exclusion constraint prevented double-booking: space is already reserved.",
              code: "OVERLAPPING_BOOKING",
            },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: insertError.message }, { status: 400 });
      }

      if (dbBooking) {
        createdBookingId = dbBooking.id;

        // Record audit event in booking_events
        await supabase.from("booking_events").insert({
          booking_id: dbBooking.id,
          event_type: "status_change",
          from_status: "pending",
          to_status: initialStatus,
          note: `Booking confirmed via test payment. Reference: ${bookingRef}`,
          created_by: currentUserId,
          metadata: {
            transactionId: paymentResult.transactionId,
            priceBreakdown: { ...priceBreakdown },
            licensePlate,
          } as unknown as Json,
        });
      }
    }

    // Format new booking record
    const newBooking: Booking = {
      id: createdBookingId,
      bookingReference: bookingRef,
      driverId: currentUserId,
      spaceId: targetSpace.id,
      spaceTitle: targetSpace.title,
      spaceAddress: targetSpace.address,
      spaceImage:
        targetSpace.images?.[0] ||
        "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80",
      startTime: startTimeDate.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      endTime: endTimeDate.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      vehicleModel,
      vehicleType,
      licensePlate,
      hourlyRate: targetSpace.pricePerHour,
      subtotal: priceBreakdown.subtotal,
      serviceFee: priceBreakdown.serviceFee,
      tax: priceBreakdown.tax,
      totalPrice: priceBreakdown.totalPrice,
      status: initialStatus,
      paymentStatus: "paid",
      accessCode,
      canExtend: targetSpace.flexibleExtensionSupported,
      recoveryStatus: "none",
      createdAt: new Date().toISOString(),
    };

    // Prepend to sandbox store so it persists on page refreshes
    addSandboxBooking(newBooking);

    return NextResponse.json(
      {
        success: true,
        booking: newBooking,
        priceBreakdown,
        payment: {
          transactionId: paymentResult.transactionId,
          status: paymentResult.paymentStatus,
          method: paymentResult.method,
        },
        accessDetails: {
          code: accessCode,
          accessType: targetSpace.accessType,
          instructions: targetSpace.accessInstructions,
          recoveryGuaranteed: targetSpace.recoveryGuaranteed,
        },
        cancellationPolicy: evaluateCancellationPolicy(startTimeDate, priceBreakdown.totalPrice),
        message: "Reservation confirmed and digital parking pass issued.",
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal booking creation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
