import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapDbSpaceToParkingSpace, ParkingSpace, SpaceRow } from "@/types/parking";

import { MOCK_PARKING_SPACES } from "@/lib/mock-data";

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
        listings: MOCK_PARKING_SPACES.slice(0, 2),
        upcomingBookings: [
          {
            id: "bk-9941",
            bookingReference: "PM-8820-A12",
            spaceId: "sp-101",
            spaceTitle: "Secure Downtown Underground Garage - Bay A12",
            spaceAddress: "245 Market St, Financial District",
            driverId: "dr-01",
            driverName: "Alex Mercer",
            driverPhone: "+1 (415) 555-0192",
            driverEmail: "alex.mercer@example.com",
            driverAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
            hourlyRate: 7.50,
            subtotal: 45.00,
            hostPayout: 38.25,
            totalPrice: 45.00,
            status: "active",
            paymentStatus: "paid",
            vehicleModel: "Audi Q5 (White)",
            vehicleType: "suv",
            licensePlate: "7XYZ891",
            accessCode: "PM-8820-A12",
            canExtend: true,
            recoveryStatus: "none",
            createdAt: new Date().toISOString(),
          },
          {
            id: "bk-9812",
            bookingReference: "PM-4920-B88",
            spaceId: "sp-102",
            spaceTitle: "Private Residential Paved Driveway",
            spaceAddress: "712 Pine Ave, Nob Hill",
            driverId: "dr-02",
            driverName: "Elena Rostova",
            driverPhone: "+1 (415) 555-0188",
            driverEmail: "elena.r@example.com",
            driverAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80",
            startTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            endTime: new Date(Date.now() + 32 * 3600 * 1000).toISOString(),
            hourlyRate: 5.00,
            subtotal: 40.00,
            hostPayout: 34.00,
            totalPrice: 47.50,
            status: "confirmed",
            paymentStatus: "paid",
            vehicleModel: "Tesla Model Y (Grey)",
            vehicleType: "ev",
            licensePlate: "9EV8472",
            accessCode: "GATE-4920",
            canExtend: true,
            recoveryStatus: "none",
            createdAt: new Date().toISOString(),
          },
        ],
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
