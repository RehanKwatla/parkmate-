import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MOCK_PARKING_SPACES, INITIAL_USER_BOOKINGS } from "@/lib/mock-data";
import { mapDbSpaceToParkingSpace, ParkingSpace, SpaceRow, Booking } from "@/types/parking";
import {
  generateUnusedSlotRecommendations,
  calculateSpaceUtilizationAndValue,
  verifyIntervalConflicts,
  timeStringToHours,
  DEFAULT_WEEKDAY_COMMUTE_SCHEDULE,
  DEFAULT_PRICING_RULES,
  BlockedPeriodRule,
} from "@/lib/slot-recommendation-engine";

const ApproveSlotRequestSchema = z.object({
  action: z.enum(["approve_and_publish", "dismiss"]),
  spaceId: z.string().min(1, "Space ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/),
  approvedHourlyPrice: z.coerce.number().positive(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const specificSpaceId = searchParams.get("spaceId");

    const supabase = await createServerSupabaseClient();
    let spaces: ParkingSpace[] = [];
    let bookings: Booking[] = [];
    let blockedRules: BlockedPeriodRule[] = [];
    let isDatabaseConnected = false;

    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // 1. Fetch user's spaces
        const { data: dbSpaces } = await supabase
          .from("parking_spaces")
          .select("*, profiles:owner_id (*)")
          .eq("owner_id", user.id);

        if (dbSpaces && dbSpaces.length > 0) {
          interface SpaceWithProfile extends SpaceRow {
            profiles?: Parameters<typeof mapDbSpaceToParkingSpace>[1];
          }
          spaces = (dbSpaces as unknown as SpaceWithProfile[]).map((s) =>
            mapDbSpaceToParkingSpace(s, s.profiles)
          );
          isDatabaseConnected = true;

          const spaceIds = spaces.map((s) => s.id);

          // 2. Fetch bookings on these spaces
          const { data: dbBookings } = await supabase
            .from("bookings")
            .select("*, parking_spaces!inner(title, address)")
            .in("space_id", spaceIds)
            .in("booking_status", ["confirmed", "active", "pending"]);

          if (dbBookings) {
            bookings = dbBookings.map((b) => ({
              id: b.id,
              bookingReference: b.booking_reference,
              spaceId: b.space_id,
              spaceTitle: b.parking_spaces?.title || "Parking Space",
              spaceAddress: b.parking_spaces?.address || "Address",
              spaceImage: "",
              startTime: b.start_time,
              endTime: b.end_time,
              vehicleModel: b.vehicle_model,
              vehicleType: (b.vehicle_type as any) || "sedan",
              licensePlate: b.license_plate,
              hourlyRate: Number(b.hourly_rate),
              totalPrice: Number(b.total_price),
              status: b.booking_status as any,
              accessCode: b.access_code,
              canExtend: true,
            }));
          }

          // 3. Fetch availability rules
          const { data: dbRules } = await supabase
            .from("availability_rules")
            .select("*")
            .in("space_id", spaceIds);

          if (dbRules) {
            blockedRules = dbRules as BlockedPeriodRule[];
          }
        }
      }
    }

    // Sandbox / Mock fallback if database returned no spaces or user not logged in
    if (spaces.length === 0) {
      spaces = MOCK_PARKING_SPACES.slice(0, 2);
      bookings = INITIAL_USER_BOOKINGS;
      blockedRules = [
        {
          id: "rule-demo-block-1",
          space_id: "sp-101",
          specific_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
          start_time: "13:00",
          end_time: "15:00",
          is_blocked: true,
          reason: "Owner Maintenance Window",
        },
      ];
    }

    // Filter to specific space if requested
    const targetSpaces = specificSpaceId
      ? spaces.filter((s) => s.id === specificSpaceId)
      : spaces;

    // Generate unused slot recommendations for each target space
    const allRecommendations = targetSpaces.flatMap((space) =>
      generateUnusedSlotRecommendations(
        space,
        DEFAULT_WEEKDAY_COMMUTE_SCHEDULE,
        bookings,
        blockedRules,
        DEFAULT_PRICING_RULES,
        7 // 7-day lookahead window
      )
    );

    // Calculate utilization & gross booking value view stats
    const utilizationStats = calculateSpaceUtilizationAndValue(
      targetSpaces,
      bookings,
      DEFAULT_WEEKDAY_COMMUTE_SCHEDULE,
      DEFAULT_PRICING_RULES,
      7
    );

    return NextResponse.json({
      success: true,
      source: isDatabaseConnected ? "supabase" : "sandbox",
      spacesCount: targetSpaces.length,
      recommendations: allRecommendations,
      utilizationStats,
      pricingRules: DEFAULT_PRICING_RULES,
      recurringSchedule: DEFAULT_WEEKDAY_COMMUTE_SCHEDULE,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load slot recommendations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ApproveSlotRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid slot approval request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { action, spaceId, date, startTime, endTime, approvedHourlyPrice, notes } = parsed.data;

    if (action === "dismiss") {
      return NextResponse.json({
        success: true,
        action: "dismissed",
        message: "Slot recommendation dismissed.",
      });
    }

    const startH = timeStringToHours(startTime);
    const endH = timeStringToHours(endTime);

    if (endH <= startH) {
      return NextResponse.json(
        { error: "End time must be strictly after start time." },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // 1. Strict Conflict Verification: Never alter or overlap confirmed bookings!
    let existingBookings: Booking[] = [];
    let blockedRules: BlockedPeriodRule[] = [];

    if (supabase) {
      const { data: dbBookings } = await supabase
        .from("bookings")
        .select("*")
        .eq("space_id", spaceId)
        .in("booking_status", ["confirmed", "active", "pending"]);

      if (dbBookings) {
        existingBookings = dbBookings.map((b) => ({
          id: b.id,
          bookingReference: b.booking_reference,
          spaceId: b.space_id,
          spaceTitle: "",
          spaceAddress: "",
          spaceImage: "",
          startTime: b.start_time,
          endTime: b.end_time,
          vehicleModel: b.vehicle_model,
          vehicleType: "sedan",
          licensePlate: b.license_plate,
          hourlyRate: Number(b.hourly_rate),
          totalPrice: Number(b.total_price),
          status: b.booking_status as any,
          accessCode: b.access_code,
          canExtend: true,
        }));
      }

      const { data: dbRules } = await supabase
        .from("availability_rules")
        .select("*")
        .eq("space_id", spaceId);

      if (dbRules) {
        blockedRules = dbRules as BlockedPeriodRule[];
      }
    } else {
      existingBookings = INITIAL_USER_BOOKINGS.filter((b) => b.spaceId === spaceId);
    }

    const conflictCheck = verifyIntervalConflicts(
      spaceId,
      date,
      startH,
      endH,
      existingBookings,
      blockedRules
    );

    if (conflictCheck.hasConflict) {
      return NextResponse.json(
        {
          error: "Conflict detected: The suggested slot overlaps an existing confirmed reservation or blocked period.",
          details: conflictCheck.conflicts,
          protectionPolicy: "Confirmed driver bookings are immutable and protected from alteration.",
        },
        { status: 409 }
      );
    }

    // 2. Publish owner-approved availability slot
    let newRuleId = `rule-approved-${Date.now()}`;

    if (supabase) {
      // In Supabase, insert an unblocked availability rule for this date
      const { data: insertedRule, error: insertErr } = await supabase
        .from("availability_rules")
        .insert({
          space_id: spaceId,
          specific_date: date,
          start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
          end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
          is_blocked: false,
          reason: notes || `Owner approved smart slot at $${approvedHourlyPrice.toFixed(2)}/hr`,
        })
        .select()
        .single();

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 400 });
      }
      if (insertedRule) {
        newRuleId = insertedRule.id;
      }
    }

    return NextResponse.json({
      success: true,
      action: "published",
      ruleId: newRuleId,
      publishedSlot: {
        spaceId,
        date,
        startTime,
        endTime,
        approvedHourlyPrice,
        isOwnerApproved: true,
        publishedAt: new Date().toISOString(),
      },
      message: `Owner approval confirmed. Unused slot on ${date} (${startTime} - ${endTime}) published at $${approvedHourlyPrice.toFixed(2)}/hr with 0 booking conflicts.`,
      conflictVerification: conflictCheck,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to approve and publish slot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
