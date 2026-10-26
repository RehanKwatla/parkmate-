import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const BlockPeriodRequestSchema = z.object({
  spaceId: z.string().uuid("Invalid space ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/).default("00:00:00"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/).default("23:59:59"),
  reason: z.string().trim().min(2, "Reason must be at least 2 characters").default("Owner reserved / maintenance"),
});

const UpdateScheduleRequestSchema = z.object({
  spaceId: z.string().uuid("Invalid space ID"),
  weeklySchedule: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string(),
      endTime: z.string(),
      isBlocked: z.boolean(),
    })
  ).min(1),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get("spaceId");

    if (!spaceId) {
      return NextResponse.json({ error: "spaceId query parameter is required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        rules: [],
        upcomingBookings: [],
      });
    }

    // 1. Fetch availability rules
    const { data: rules, error: rulesErr } = await supabase
      .from("availability_rules")
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false });

    if (rulesErr) {
      return NextResponse.json({ error: rulesErr.message }, { status: 400 });
    }

    // 2. Fetch upcoming confirmed/active bookings on this space
    const now = new Date().toISOString();
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*, profiles:driver_id (display_name, phone)")
      .eq("space_id", spaceId)
      .in("booking_status", ["confirmed", "active", "pending"])
      .gte("end_time", now)
      .order("start_time", { ascending: true });

    return NextResponse.json({
      success: true,
      rules: rules || [],
      upcomingBookings: bookings || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load availability";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action || "block_period";

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 503 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Handle action: block a specific date / period
    if (action === "block_period") {
      const parsed = BlockPeriodRequestSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", issues: parsed.error.issues },
          { status: 400 }
        );
      }

      const { spaceId, date, startTime, endTime, reason } = parsed.data;

      // Verify user owns the space
      const { data: space } = await supabase
        .from("parking_spaces")
        .select("owner_id, title")
        .eq("id", spaceId)
        .single();

      if (!space || space.owner_id !== user.id) {
        return NextResponse.json({ error: "Forbidden: You do not own this space" }, { status: 403 });
      }

      // Format full timestamps for conflict detection
      const blockStart = new Date(`${date}T${startTime.length === 5 ? `${startTime}:00` : startTime}`).toISOString();
      const blockEnd = new Date(`${date}T${endTime.length === 5 ? `${endTime}:00` : endTime}`).toISOString();

      // CONFLICT DETECTION: Check against confirmed/active bookings
      const { data: conflictingBookings, error: conflictErr } = await supabase
        .from("bookings")
        .select("id, booking_reference, start_time, end_time, vehicle_model, driver_id, profiles:driver_id (display_name)")
        .eq("space_id", spaceId)
        .in("booking_status", ["confirmed", "active", "pending"])
        .lt("start_time", blockEnd)
        .gt("end_time", blockStart);

      if (conflictErr) {
        return NextResponse.json({ error: conflictErr.message }, { status: 500 });
      }

      if (conflictingBookings && conflictingBookings.length > 0) {
        const first = conflictingBookings[0];
        interface DriverProfile {
          display_name?: string;
        }
        const profile = first.profiles as unknown as DriverProfile | null;

        return NextResponse.json(
          {
            error: `Cannot block availability: Confirmed booking ${first.booking_reference} is already scheduled during this timeframe.`,
            conflict: {
              bookingReference: first.booking_reference,
              startTime: first.start_time,
              endTime: first.end_time,
              vehicleModel: first.vehicle_model,
              driverName: profile?.display_name || "Reserved Driver",
            },
          },
          { status: 409 }
        );
      }

      const dateObj = new Date(date);
      const dayOfWeek = isNaN(dateObj.getDay()) ? 0 : dateObj.getDay();

      // Insert blocked rule
      const { data: newRule, error: insertErr } = await supabase
        .from("availability_rules")
        .insert({
          space_id: spaceId,
          day_of_week: dayOfWeek,
          specific_date: date,
          start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
          end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
          is_blocked: true,
          reason,
        })
        .select()
        .single();

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: "Blocked period scheduled successfully without booking conflicts.",
        rule: newRule,
      });
    }

    // Handle action: update recurring weekly schedule
    if (action === "update_schedule") {
      const parsed = UpdateScheduleRequestSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", issues: parsed.error.issues },
          { status: 400 }
        );
      }

      const { spaceId, weeklySchedule } = parsed.data;

      // Verify user owns the space
      const { data: space } = await supabase
        .from("parking_spaces")
        .select("owner_id")
        .eq("id", spaceId)
        .single();

      if (!space || space.owner_id !== user.id) {
        return NextResponse.json({ error: "Forbidden: You do not own this space" }, { status: 403 });
      }

      // Check for conflicts with upcoming bookings
      // If a day is being blocked or operating hours are reduced
      const now = new Date().toISOString();
      const { data: upcomingBookings } = await supabase
        .from("bookings")
        .select("id, booking_reference, start_time, end_time, vehicle_model")
        .eq("space_id", spaceId)
        .in("booking_status", ["confirmed", "active", "pending"])
        .gte("end_time", now);

      if (upcomingBookings && upcomingBookings.length > 0) {
        for (const booking of upcomingBookings) {
          const bStart = new Date(booking.start_time);
          const bEnd = new Date(booking.end_time);
          const dow = bStart.getDay();

          const ruleForDay = weeklySchedule.find((s) => s.dayOfWeek === dow);
          if (ruleForDay) {
            if (ruleForDay.isBlocked) {
              return NextResponse.json(
                {
                  error: `Cannot block day ${dow}: Confirmed booking ${booking.booking_reference} is already scheduled on this day.`,
                  conflict: booking,
                },
                { status: 409 }
              );
            }

            // Check if booking starts earlier or ends later than allowed hours
            const bStartHour = bStart.getHours() + bStart.getMinutes() / 60;
            const bEndHour = bEnd.getHours() + bEnd.getMinutes() / 60;
            const [ruleStartH, ruleStartM] = ruleForDay.startTime.split(":").map(Number);
            const [ruleEndH, ruleEndM] = ruleForDay.endTime.split(":").map(Number);
            const scheduleStartHour = ruleStartH + (ruleStartM || 0) / 60;
            const scheduleEndHour = ruleEndH + (ruleEndM || 0) / 60;

            if (bStartHour < scheduleStartHour || bEndHour > scheduleEndHour) {
              return NextResponse.json(
                {
                  error: `Cannot restrict hours on this day: Confirmed booking ${booking.booking_reference} falls outside the new window (${ruleForDay.startTime} - ${ruleForDay.endTime}).`,
                  conflict: booking,
                },
                { status: 409 }
              );
            }
          }
        }
      }

      // Delete existing weekly rules (where specific_date is null)
      await supabase
        .from("availability_rules")
        .delete()
        .eq("space_id", spaceId)
        .is("specific_date", null);

      // Insert new weekly rules
      const rulesToInsert = weeklySchedule.map((s) => ({
        space_id: spaceId,
        day_of_week: s.dayOfWeek,
        start_time: s.startTime.length === 5 ? `${s.startTime}:00` : s.startTime,
        end_time: s.endTime.length === 5 ? `${s.endTime}:00` : s.endTime,
        is_blocked: s.isBlocked,
      }));

      const { data: inserted, error: insertErr } = await supabase
        .from("availability_rules")
        .insert(rulesToInsert)
        .select();

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: "Weekly schedule updated successfully without booking conflicts.",
        rules: inserted,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update availability";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("ruleId");
    const spaceId = searchParams.get("spaceId");

    if (!ruleId || !spaceId) {
      return NextResponse.json({ error: "ruleId and spaceId are required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: true, message: "Rule deleted (sandbox mode)" });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Verify ownership of the space
    const { data: space } = await supabase
      .from("parking_spaces")
      .select("owner_id")
      .eq("id", spaceId)
      .single();

    if (!space || space.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this space" }, { status: 403 });
    }

    const { error: deleteErr } = await supabase
      .from("availability_rules")
      .delete()
      .eq("id", ruleId)
      .eq("space_id", spaceId);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Availability rule removed." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete rule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
