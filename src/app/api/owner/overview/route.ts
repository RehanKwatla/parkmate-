import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapDbSpaceToParkingSpace, ParkingSpace, SpaceRow } from "@/types/parking";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        source: "sandbox",
        stats: {
          totalEarnings: 2840.50,
          pendingPayout: 320.00,
          activeSpacesCount: 2,
          totalBookingsCount: 84,
          averageHourlyYield: 6.85,
        },
        listings: [],
        upcomingBookings: [],
        recentIssues: [],
      });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // 1. Fetch all spaces owned by the user
    const { data: spaces, error: spacesErr } = await supabase
      .from("parking_spaces")
      .select("*, profiles:owner_id (*)")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (spacesErr) {
      return NextResponse.json({ error: spacesErr.message }, { status: 400 });
    }

    const spaceIds = (spaces || []).map((s) => s.id);

    interface SpaceWithProfile extends SpaceRow {
      profiles?: Parameters<typeof mapDbSpaceToParkingSpace>[1];
    }
    const mappedSpaces: ParkingSpace[] = (spaces as unknown as SpaceWithProfile[] || []).map((s) =>
      mapDbSpaceToParkingSpace(s, s.profiles)
    );

    // If owner has no spaces yet
    if (spaceIds.length === 0) {
      return NextResponse.json({
        success: true,
        source: "supabase",
        stats: {
          totalEarnings: 0,
          pendingPayout: 0,
          activeSpacesCount: 0,
          totalBookingsCount: 0,
          averageHourlyYield: 0,
        },
        listings: [],
        upcomingBookings: [],
        recentIssues: [],
      });
    }

    // 2. Fetch all bookings for the owner's spaces
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*, profiles:driver_id (id, display_name, phone, email, avatar_url), parking_spaces (id, title, address)")
      .in("space_id", spaceIds)
      .order("start_time", { ascending: false });

    // 3. Compute real financial metrics
    let totalEarnings = 0;
    let pendingPayout = 0;
    let completedCount = 0;
    let activeOrUpcomingCount = 0;
    const now = new Date();

    const formattedBookings = (bookings || []).map((b) => {
      const subtotal = Number(b.subtotal || b.total_price * 0.85); // host payout before platform fee
      if (b.payment_status === "paid") {
        totalEarnings += subtotal;
        if (new Date(b.end_time) >= now) {
          pendingPayout += subtotal;
        }
      }

      if (b.booking_status === "completed") {
        completedCount++;
      } else if (b.booking_status === "confirmed" || b.booking_status === "active") {
        activeOrUpcomingCount++;
      }

      interface BookingSpaceInfo {
        id?: string;
        title?: string;
        address?: string;
      }
      interface BookingDriverInfo {
        id?: string;
        display_name?: string;
        phone?: string;
        email?: string;
        avatar_url?: string;
      }

      const sp = b.parking_spaces as unknown as BookingSpaceInfo | null;
      const dr = b.profiles as unknown as BookingDriverInfo | null;

      return {
        id: b.id,
        bookingReference: b.booking_reference,
        spaceId: b.space_id,
        spaceTitle: sp?.title || "Parking Spot",
        spaceAddress: sp?.address || "",
        driverId: b.driver_id,
        driverName: dr?.display_name || "Guest Driver",
        driverPhone: dr?.phone || "",
        driverEmail: dr?.email || "",
        driverAvatar: dr?.avatar_url || "",
        startTime: b.start_time,
        endTime: b.end_time,
        hourlyRate: Number(b.hourly_rate),
        subtotal: Number(b.subtotal),
        hostPayout: subtotal,
        totalPrice: Number(b.total_price),
        status: b.booking_status,
        paymentStatus: b.payment_status,
        vehicleModel: b.vehicle_model,
        vehicleType: b.vehicle_type,
        licensePlate: b.license_plate,
        accessCode: b.access_code,
        canExtend: b.can_extend,
        recoveryStatus: b.recovery_status,
        createdAt: b.created_at,
      };
    });

    // 4. Fetch recent reports & issues for owner's spaces
    const { data: reports } = await supabase
      .from("reports")
      .select("*, profiles:reporter_id (display_name), bookings (booking_reference)")
      .in("space_id", spaceIds)
      .order("created_at", { ascending: false })
      .limit(10);

    const activeSpaces = mappedSpaces.filter((s) => s.publicationStatus === "published");
    const avgYield = activeSpaces.length > 0 
      ? activeSpaces.reduce((acc, curr) => acc + curr.pricePerHour, 0) / activeSpaces.length 
      : 0;

    return NextResponse.json({
      success: true,
      source: "supabase",
      stats: {
        totalEarnings: Number(totalEarnings.toFixed(2)),
        pendingPayout: Number(pendingPayout.toFixed(2)),
        activeSpacesCount: activeSpaces.length,
        totalSpacesCount: mappedSpaces.length,
        totalBookingsCount: (bookings || []).length,
        completedCount,
        activeOrUpcomingCount,
        averageHourlyYield: Number(avgYield.toFixed(2)),
      },
      listings: mappedSpaces,
      upcomingBookings: formattedBookings,
      recentIssues: reports || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load owner overview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
