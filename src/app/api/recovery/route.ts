import { NextResponse } from "next/server";
import {
  ReportAccessProblemSchema,
  ConfirmReplacementSchema,
  UpdateReportStatusSchema,
  RecoveryRequestSchema,
} from "@/lib/validations";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MOCK_PARKING_SPACES, MOCK_RECOVERY_ALTERNATIVES } from "@/lib/mock-data";
import {
  findRecoveryAlternatives,
  validateReplacementAvailability,
  processRecoveryRefundAndEscalation,
  getHumanReadableProblemName,
  AccessProblemType,
} from "@/lib/recovery-engine";
import {
  generateAccessCode,
  getSandboxBookings,
  findSandboxBooking,
  updateSandboxBooking,
  getSandboxReports,
  addSandboxReport,
  updateSandboxReport,
  ExistingBookingSlot,
} from "@/lib/booking-engine";
import { mapDbSpaceToParkingSpace, ParkingSpace, VehicleType } from "@/types/parking";
import { Json } from "@/types/database";
import { getClientIdentifier, checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";

export async function POST(request: Request) {
  try {
    // -------------------------------------------------------------------------
    // Rate Limiting: Max 20 recovery requests per minute per client
    // -------------------------------------------------------------------------
    const clientIp = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientIp, "recovery_requests", { limit: 20, windowMs: 60 * 1000 });
    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit.limit, rateLimit.remaining, rateLimit.resetInSeconds, "booking recovery");
    }

    const body = await request.json();
    const action = body.action || (body.problemType || body.reason ? "report" : "report");

    // =========================================================================
    // ACTION 1: Report an Access Problem & Search Alternatives
    // =========================================================================
    if (action === "report") {
      let bookingId = body.bookingId;
      let problemType: AccessProblemType = body.problemType || "space_occupied";
      let notes = body.notes || body.reason || "";
      const userCoordinates = body.userCoordinates;
      const isDemo = Boolean(body.isDemo);

      const parsed = ReportAccessProblemSchema.safeParse({
        bookingId,
        problemType,
        notes,
        userCoordinates,
        isDemo,
      });

      if (!parsed.success) {
        // Fallback to legacy RecoveryRequestSchema for compatibility
        const legacyParsed = RecoveryRequestSchema.safeParse(body);
        if (!legacyParsed.success) {
          return NextResponse.json(
            { error: "Invalid recovery request parameters", issues: parsed.error.issues },
            { status: 400 }
          );
        }
        bookingId = legacyParsed.data.bookingId;
        problemType = (legacyParsed.data.problemType as AccessProblemType) || "space_occupied";
        notes = legacyParsed.data.reason || legacyParsed.data.notes || "";
      } else {
        bookingId = parsed.data.bookingId;
        problemType = parsed.data.problemType;
        notes = parsed.data.notes || "";
      }

      const supabase = await createServerSupabaseClient();
      let dbBooking = null;
      let currentSpace: ParkingSpace | null = null;
      let candidateSpaces: ParkingSpace[] = [...MOCK_PARKING_SPACES, ...MOCK_RECOVERY_ALTERNATIVES];
      let existingSlots: ExistingBookingSlot[] = [];

      // 1. Fetch booking details
      if (supabase && !bookingId.startsWith("bk-")) {
        const { data: bData } = await supabase
          .from("bookings")
          .select("*, parking_spaces (*)")
          .eq("id", bookingId)
          .maybeSingle();

        if (bData) {
          dbBooking = bData;
          if (bData.parking_spaces) {
            currentSpace = mapDbSpaceToParkingSpace(bData.parking_spaces);
          }
        }

        // Fetch candidate spaces from DB
        const { data: dbSpaces } = await supabase
          .from("parking_spaces")
          .select("*, profiles:owner_id (*)")
          .eq("publication_status", "published");

        if (dbSpaces && dbSpaces.length > 0) {
          interface SpaceWithProf {
            profiles?: Parameters<typeof mapDbSpaceToParkingSpace>[1];
          }
          candidateSpaces = dbSpaces.map((s) => mapDbSpaceToParkingSpace(s, (s as unknown as SpaceWithProf).profiles));
        }

        // Fetch existing bookings to check conflicts
        const { data: allBks } = await supabase
          .from("bookings")
          .select("id, space_id, start_time, end_time, booking_status");

        if (allBks) {
          existingSlots = allBks.map((b) => ({
            id: b.id,
            spaceId: b.space_id,
            startTime: b.start_time,
            endTime: b.end_time,
            bookingStatus: b.booking_status,
          }));
        }
      }

      // 2. Fallback to Sandbox Memory
      const sandboxBooking = findSandboxBooking(bookingId);
      if (!currentSpace && sandboxBooking) {
        currentSpace =
          candidateSpaces.find((s) => s.id === sandboxBooking.spaceId) ||
          MOCK_PARKING_SPACES[0];
      }

      if (!currentSpace) {
        currentSpace = MOCK_PARKING_SPACES[0];
      }

      const bookingStartTime = dbBooking?.start_time || sandboxBooking?.startTime || new Date().toISOString();
      const bookingEndTime = dbBooking?.end_time || sandboxBooking?.endTime || new Date(Date.now() + 4 * 3600 * 1000).toISOString();
      const vehicleType: VehicleType = (dbBooking?.vehicle_type as VehicleType) || sandboxBooking?.vehicleType || "suv";
      const hourlyRate = dbBooking ? Number(dbBooking.hourly_rate) : sandboxBooking?.hourlyRate || 7.50;
      const totalPrice = dbBooking ? Number(dbBooking.total_price) : sandboxBooking?.totalPrice || 45.00;

      // Extract existing slots from sandbox bookings if in sandbox
      if (existingSlots.length === 0) {
        existingSlots = getSandboxBookings().map((b) => ({
          id: b.id,
          spaceId: b.spaceId,
          startTime: b.startTime,
          endTime: b.endTime,
          bookingStatus: b.status,
        }));
      }

      // 3. Record official incident report & update booking status
      const reportId = `rep-${Math.floor(10000 + Math.random() * 90000)}`;
      const problemLabel = getHumanReadableProblemName(problemType);
      const fullDescription = notes ? `${problemLabel}: ${notes}` : problemLabel;

      if (supabase && !bookingId.startsWith("bk-")) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        await supabase.from("reports").insert({
          id: reportId,
          reporter_id: user?.id || "anonymous",
          booking_id: bookingId,
          space_id: currentSpace.id,
          report_type: problemType === "space_occupied" ? "spot_blocked" : "access_failure",
          description: fullDescription,
          status: "open",
        });

        await supabase
          .from("bookings")
          .update({
            booking_status: "access_issue",
            recovery_status: "reported",
          })
          .eq("id", bookingId);

        await supabase.from("booking_events").insert({
          booking_id: bookingId,
          event_type: "access_issue",
          from_status: dbBooking?.booking_status || "active",
          to_status: "access_issue",
          note: fullDescription,
          created_by: user?.id || null,
          metadata: { problemType, userCoordinates, isDemo } as unknown as Json,
        });
      }

      // Update sandbox state
      if (sandboxBooking) {
        updateSandboxBooking(bookingId, {
          status: "access_issue",
          recoveryStatus: "reported",
        });
      }

      addSandboxReport({
        id: reportId,
        bookingId,
        spaceId: currentSpace.id,
        reporterId: "user-current",
        problemType,
        description: fullDescription,
        status: "open",
        createdAt: new Date().toISOString(),
        isDemo,
      });

      // 4. Run Alternative Space Matching Engine
      const alternatives = findRecoveryAlternatives({
        currentSpace,
        booking: {
          id: bookingId,
          spaceId: currentSpace.id,
          startTime: bookingStartTime,
          endTime: bookingEndTime,
          vehicleType,
          originalHourlyRate: hourlyRate,
          totalPrice,
        },
        candidateSpaces,
        existingBookings: existingSlots,
        userCoords: userCoordinates,
        isDemo,
      });

      return NextResponse.json({
        success: true,
        reportId,
        bookingId,
        status: "access_issue",
        recoveryStatus: "reported",
        problemType,
        problemLabel,
        alternatives,
        hasAlternatives: alternatives.length > 0,
        cancellationPolicy: {
          eligibleForImmediateRefund: true,
          refundAmount: totalPrice,
          inconvenienceCredit: 500.00,
          resolutionNote:
            "If none of these alternatives work for you, you can request an instant 100% refund plus ₹500 inconvenience credit.",
        },
        message:
          alternatives.length > 0
            ? `Report recorded. We found ${alternatives.length} compatible alternative spaces nearby with 100% price protection.`
            : "Report recorded. No compatible spaces are currently available nearby. You are eligible for an immediate 100% refund.",
      });
    }

    // =========================================================================
    // ACTION 2: Confirm Replacement Space Selection
    // =========================================================================
    if (action === "confirm_replacement") {
      const parsed = ConfirmReplacementSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid replacement confirmation parameters", issues: parsed.error.issues },
          { status: 400 }
        );
      }

      const { bookingId, replacementSpaceId } = parsed.data;
      const supabase = await createServerSupabaseClient();

      let targetBooking = null;
      let existingSlots: ExistingBookingSlot[] = [];

      if (supabase && !bookingId.startsWith("bk-")) {
        const { data: bData } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", bookingId)
          .maybeSingle();
        targetBooking = bData;

        const { data: allBks } = await supabase
          .from("bookings")
          .select("id, space_id, start_time, end_time, booking_status");

        if (allBks) {
          existingSlots = allBks.map((b) => ({
            id: b.id,
            spaceId: b.space_id,
            startTime: b.start_time,
            endTime: b.end_time,
            bookingStatus: b.booking_status,
          }));
        }
      }

      const sandboxBooking = findSandboxBooking(bookingId);
      if (!targetBooking && sandboxBooking) {
        targetBooking = {
          id: sandboxBooking.id,
          space_id: sandboxBooking.spaceId,
          start_time: sandboxBooking.startTime,
          end_time: sandboxBooking.endTime,
          booking_status: sandboxBooking.status,
          total_price: sandboxBooking.totalPrice,
        };
        existingSlots = getSandboxBookings().map((b) => ({
          id: b.id,
          spaceId: b.spaceId,
          startTime: b.startTime,
          endTime: b.endTime,
          bookingStatus: b.status,
        }));
      }

      if (!targetBooking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      // Check replacement space availability (concurrency check)
      const availabilityCheck = validateReplacementAvailability({
        replacementSpaceId,
        startTime: targetBooking.start_time,
        endTime: targetBooking.end_time,
        existingBookings: existingSlots,
      });

      if (!availabilityCheck.isAvailable) {
        return NextResponse.json(
          {
            error: "Replacement space conflict",
            code: "REPLACEMENT_CONFLICT",
            message:
              availabilityCheck.conflictReason ||
              "This replacement space was reserved by another driver. Please pick another option.",
          },
          { status: 409 }
        );
      }

      // Find replacement space object
      const pool = [...MOCK_PARKING_SPACES, ...MOCK_RECOVERY_ALTERNATIVES];
      let replacementSpace = pool.find((s) => s.id === replacementSpaceId);

      if (!replacementSpace && supabase) {
        const { data: sData } = await supabase
          .from("parking_spaces")
          .select("*, profiles:owner_id (*)")
          .eq("id", replacementSpaceId)
          .maybeSingle();

        if (sData) {
          interface SpWithProf {
            profiles?: Parameters<typeof mapDbSpaceToParkingSpace>[1];
          }
          replacementSpace = mapDbSpaceToParkingSpace(sData, (sData as unknown as SpWithProf).profiles);
        }
      }

      if (!replacementSpace) {
        replacementSpace = MOCK_RECOVERY_ALTERNATIVES[0];
      }

      const newAccessCode = generateAccessCode(replacementSpace.id);

      // Atomically update booking in DB or sandbox
      if (supabase && !bookingId.startsWith("bk-")) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        await supabase
          .from("bookings")
          .update({
            space_id: replacementSpace.id,
            booking_status: "active",
            recovery_status: "recovered",
            alternative_space_id: replacementSpace.id,
            access_code: newAccessCode,
          })
          .eq("id", bookingId);

        await supabase.from("booking_events").insert({
          booking_id: bookingId,
          event_type: "resolution",
          from_status: "access_issue",
          to_status: "recovered",
          note: `Replacement space confirmed: "${replacementSpace.title}" (${replacementSpace.address}). Zero additional fee under ParkMate Recovery Protection.`,
          created_by: user?.id || null,
          metadata: {
            alternativeSpaceId: replacementSpace.id,
            newAccessCode,
          } as unknown as Json,
        });

        // Update open report to resolved
        await supabase
          .from("reports")
          .update({
            status: "resolved",
            resolution_notes: `Allocated replacement space ${replacementSpace.title} at ${replacementSpace.address}.`,
          })
          .eq("booking_id", bookingId)
          .eq("status", "open");
      }

      if (sandboxBooking) {
        updateSandboxBooking(bookingId, {
          spaceId: replacementSpace.id,
          spaceTitle: `[RECOVERED] ${replacementSpace.title}`,
          spaceAddress: replacementSpace.address,
          spaceImage: replacementSpace.images?.[0] || sandboxBooking.spaceImage,
          status: "active",
          recoveryStatus: "recovered",
          alternativeSpaceId: replacementSpace.id,
          accessCode: newAccessCode,
        });
      }

      // Update sandbox report
      const rep = getSandboxReports().find((r) => r.bookingId === bookingId && r.status === "open");
      if (rep) {
        updateSandboxReport(rep.id, {
          status: "resolved",
          resolutionNotes: `Driver confirmed backup space: ${replacementSpace.title}`,
        });
      }

      return NextResponse.json({
        success: true,
        bookingId,
        status: "active",
        recoveryStatus: "recovered",
        replacementSpace,
        newAccessCode,
        message:
          "Replacement parking space confirmed at ₹0 additional charge under ParkMate Booking Recovery Protection.",
      });
    }

    // =========================================================================
    // ACTION 3: Cancel and Request 100% Refund + Credit
    // =========================================================================
    if (action === "cancel_and_refund") {
      const bookingId = body.bookingId;
      if (!bookingId) {
        return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
      }

      const sandboxBooking = findSandboxBooking(bookingId);
      const totalPrice = sandboxBooking?.totalPrice || 45.00;

      const resolution = processRecoveryRefundAndEscalation({
        bookingId,
        totalPrice,
        reason: body.reason || "No suitable replacement space available / driver opted for refund.",
      });

      const supabase = await createServerSupabaseClient();
      if (supabase && !bookingId.startsWith("bk-")) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        await supabase
          .from("bookings")
          .update({
            booking_status: "refunded",
            payment_status: "refunded",
            recovery_status: "reported",
          })
          .eq("id", bookingId);

        await supabase.from("booking_events").insert({
          booking_id: bookingId,
          event_type: "cancellation",
          from_status: "access_issue",
          to_status: "refunded",
          note: resolution.resolutionSummary,
          created_by: user?.id || null,
          metadata: { resolution } as unknown as Json,
        });

        await supabase
          .from("reports")
          .update({
            status: "resolved",
            resolution_notes: resolution.resolutionSummary,
          })
          .eq("booking_id", bookingId);
      }

      if (sandboxBooking) {
        updateSandboxBooking(bookingId, {
          status: "cancelled",
          recoveryStatus: "reported",
        });
      }

      return NextResponse.json({
        success: true,
        status: "refunded",
        bookingId,
        refundAmount: resolution.refundAmount,
        inconvenienceCredit: resolution.inconvenienceCredit,
        ticketId: resolution.ticketId,
        supportPhone: resolution.supportPhone,
        message: resolution.resolutionSummary,
      });
    }

    return NextResponse.json({ error: "Unknown recovery action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Recovery operation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const bookingId = searchParams.get("bookingId");

    // Owner reviews reported access problems
    if (action === "owner_reports") {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: spaces } = await supabase
            .from("parking_spaces")
            .select("id")
            .eq("owner_id", user.id);

          const spaceIds = (spaces || []).map((s) => s.id);
          if (spaceIds.length > 0) {
            const { data: reports } = await supabase
              .from("reports")
              .select("*, parking_spaces (id, title, address), profiles:reporter_id (display_name, phone)")
              .in("space_id", spaceIds)
              .order("created_at", { ascending: false });

            return NextResponse.json({
              success: true,
              source: "supabase",
              reports: reports || [],
            });
          }
        }
      }

      // Fallback to sandbox reports
      return NextResponse.json({
        success: true,
        source: "sandbox",
        reports: getSandboxReports(),
      });
    }

    // Retrieve active report & fresh alternatives for a single booking
    if (bookingId) {
      const sandboxBooking = findSandboxBooking(bookingId);
      const reports = getSandboxReports().filter((r) => r.bookingId === bookingId);
      return NextResponse.json({
        success: true,
        booking: sandboxBooking || null,
        activeReport: reports[0] || null,
      });
    }

    return NextResponse.json({
      success: true,
      reports: getSandboxReports(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch recovery data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const reportId = body.reportId;

    const parsed = UpdateReportStatusSchema.safeParse(body);
    if (!parsed.success || !reportId) {
      return NextResponse.json(
        { error: "Invalid report update parameters", issues: parsed.error?.issues },
        { status: 400 }
      );
    }

    const { status, resolutionNotes } = parsed.data;
    const supabase = await createServerSupabaseClient();

    if (supabase && !reportId.startsWith("rep-demo-")) {
      await supabase
        .from("reports")
        .update({
          status,
          resolution_notes: resolutionNotes || null,
        })
        .eq("id", reportId);
    }

    const updated = updateSandboxReport(reportId, {
      status,
      resolutionNotes,
    });

    return NextResponse.json({
      success: true,
      reportId,
      status,
      resolutionNotes,
      updated,
      message: `Report status updated to ${status}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
