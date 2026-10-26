import { NextResponse } from "next/server";
import { BookingCreateSchema } from "@/lib/validations";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MOCK_PARKING_SPACES, INITIAL_USER_BOOKINGS } from "@/lib/mock-data";

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
  total_price: number;
  booking_status: "active" | "upcoming" | "completed" | "cancelled" | "recovered" | "pending";
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
    flexible_extension_supported: boolean;
    owner_id: string;
  } | null;
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
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
              id, title, address, photos, price_per_hour, flexible_extension_supported, owner_id
            )
          `
          )
          .order("created_at", { ascending: false });

        if (roleFilter === "owner") {
          // Filter to spaces owned by this user
          query = query.eq("parking_spaces.owner_id", user.id);
        } else {
          // Default: bookings made by this driver
          query = query.eq("driver_id", user.id);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          const formattedBookings = (data as unknown as BookingWithSpaceRow[]).map((b) => ({
            id: b.id,
            bookingReference: b.booking_reference,
            driverId: b.driver_id,
            spaceId: b.space_id,
            spaceTitle: b.parking_spaces?.title || "Reserved Space",
            spaceAddress: b.parking_spaces?.address || "Address available on pass",
            spaceImage:
              b.parking_spaces?.photos?.[0] ||
              "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80",
            startTime: new Date(b.start_time).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            endTime: new Date(b.end_time).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            vehicleModel: b.vehicle_model,
            vehicleType: b.vehicle_type,
            licensePlate: b.license_plate,
            hourlyRate: Number(b.hourly_rate),
            totalPrice: Number(b.total_price),
            status: b.booking_status,
            accessCode: b.access_code,
            canExtend: b.can_extend,
            recoveryStatus: b.recovery_status,
            alternativeSpaceId: b.alternative_space_id,
            createdAt: b.created_at,
          }));

          return NextResponse.json({
            success: true,
            source: "supabase",
            count: formattedBookings.length,
            bookings: formattedBookings,
          });
        }
      }
    }

    // Fallback: Return initial demo user bookings
    return NextResponse.json({
      success: true,
      source: "demo",
      count: INITIAL_USER_BOOKINGS.length,
      bookings: INITIAL_USER_BOOKINGS,
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

    const { spaceId, durationHours, vehicleModel, vehicleType, licensePlate } = result.data;

    const supabase = await createServerSupabaseClient();
    let currentUserId: string | null = null;

    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      currentUserId = user?.id || null;
    }

    // Calculate time window
    const now = new Date();
    const startTimeDate = result.data.startTime ? new Date(result.data.startTime) : now;
    const endTimeDate = new Date(startTimeDate.getTime() + durationHours * 60 * 60 * 1000);

    // 1. Try Supabase Atomic Transaction first if Supabase is connected
    if (supabase && currentUserId) {
      // Execute PostgreSQL transaction function with locking & exclusion
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        "create_booking_atomic",
        {
          p_driver_id: currentUserId,
          p_space_id: spaceId,
          p_start_time: startTimeDate.toISOString(),
          p_end_time: endTimeDate.toISOString(),
          p_vehicle_model: vehicleModel,
          p_vehicle_type: vehicleType,
          p_license_plate: licensePlate,
          p_service_fee: 2.50,
          p_tax_rate: 0.08,
        }
      );

      if (rpcError) {
        if (
          rpcError.message.includes("already reserved") ||
          rpcError.message.includes("exclusion") ||
          rpcError.message.includes("conflict")
        ) {
          return NextResponse.json(
            {
              error: "Selected space is unavailable or has conflicting bookings for this timeframe.",
              code: "OVERLAPPING_BOOKING",
            },
            { status: 409 }
          );
        }

        // If RPC isn't deployed yet, fall back to direct Supabase insert
        const { data: spaceData, error: spaceErr } = await supabase
          .from("parking_spaces")
          .select("*")
          .eq("id", spaceId)
          .single();

        if (!spaceErr && spaceData) {
          const subtotal = Number(spaceData.price_per_hour) * durationHours;
          const serviceFee = 2.50;
          const tax = Number((subtotal * 0.08).toFixed(2));
          const totalPrice = subtotal + serviceFee + tax;
          const bookingRef = `PM-${Math.floor(1000 + Math.random() * 9000)}-${spaceData.id.slice(0, 4).toUpperCase()}`;
          const accessCode = `PASS-${Math.floor(1000 + Math.random() * 9000)}-${spaceData.id.slice(0, 4).toUpperCase()}`;

          const { data: newBooking, error: insertError } = await supabase
            .from("bookings")
            .insert({
              booking_reference: bookingRef,
              driver_id: currentUserId,
              space_id: spaceId,
              start_time: startTimeDate.toISOString(),
              end_time: endTimeDate.toISOString(),
              booking_status: "active",
              payment_status: "paid",
              hourly_rate: Number(spaceData.price_per_hour),
              subtotal,
              service_fee: serviceFee,
              tax,
              total_price: totalPrice,
              vehicle_model: vehicleModel,
              vehicle_type: vehicleType,
              license_plate: licensePlate,
              access_code: accessCode,
              can_extend: spaceData.flexible_extension_supported,
              recovery_status: "none",
            })
            .select()
            .single();

          if (insertError) {
            if (insertError.message.includes("no_overlapping_confirmed_bookings")) {
              return NextResponse.json(
                {
                  error: "Selected space is already reserved for this timeframe. Database constraint prevented overlap.",
                  code: "OVERLAPPING_BOOKING",
                },
                { status: 409 }
              );
            }
            return NextResponse.json({ error: insertError.message }, { status: 400 });
          }

          // Record booking event
          await supabase.from("booking_events").insert({
            booking_id: newBooking.id,
            event_type: "status_change",
            from_status: "created",
            to_status: "active",
            note: "Reservation confirmed and payment authorized",
            created_by: currentUserId,
            metadata: { hours: durationHours, totalPrice },
          });

          return NextResponse.json(
            {
              success: true,
              source: "supabase",
              booking: {
                id: newBooking.id,
                bookingReference: newBooking.booking_reference,
                spaceId: spaceData.id,
                spaceTitle: spaceData.title,
                spaceAddress: spaceData.address,
                spaceImage: spaceData.photos[0],
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
                hourlyRate: Number(spaceData.price_per_hour),
                totalPrice,
                status: "active",
                accessCode,
                canExtend: spaceData.flexible_extension_supported,
                recoveryStatus: "none",
              },
            },
            { status: 201 }
          );
        }
      } else if (rpcResult) {
        return NextResponse.json(
          {
            success: true,
            source: "supabase_rpc",
            booking: rpcResult,
          },
          { status: 201 }
        );
      }
    }

    // 2. Demo Seed Fallback (when user is browsing in sandbox or not signed in)
    const mockSpace = MOCK_PARKING_SPACES.find((s) => s.id === spaceId) || MOCK_PARKING_SPACES[0];

    const subtotal = mockSpace.pricePerHour * durationHours;
    const serviceFee = 2.50;
    const taxes = Number((subtotal * 0.08).toFixed(2));
    const totalPrice = subtotal + serviceFee + taxes;

    const newBooking = {
      id: `bk-${Math.floor(1000 + Math.random() * 9000)}`,
      bookingReference: `PM-${Math.floor(1000 + Math.random() * 9000)}-${mockSpace.id.toUpperCase()}`,
      spaceId: mockSpace.id,
      spaceTitle: mockSpace.title,
      spaceAddress: mockSpace.address,
      spaceImage: mockSpace.images[0],
      startTime: "Today, Immediate",
      endTime: `Today, +${durationHours} hrs`,
      vehicleModel,
      vehicleType,
      licensePlate,
      hourlyRate: mockSpace.pricePerHour,
      totalPrice,
      status: "active" as const,
      accessCode: `PM-${Math.floor(1000 + Math.random() * 9000)}-${mockSpace.id.toUpperCase()}`,
      canExtend: mockSpace.flexibleExtensionSupported,
      recoveryStatus: "none" as const,
      requiresAuthPrompt: !currentUserId,
    };

    return NextResponse.json(
      {
        success: true,
        source: "demo",
        booking: newBooking,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process booking reservation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
