import { NextResponse } from "next/server";
import { z } from "zod";
import { ListingCreateSchema } from "@/lib/validations";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MOCK_PARKING_SPACES } from "@/lib/mock-data";
import { mapDbSpaceToParkingSpace, ParkingSpace, SpaceRow, SpaceCategory } from "@/types/parking";

const QuerySchema = z.object({
  destination: z.string().optional(),
  category: z.string().optional(),
  vehicle: z.string().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  owner: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      destination: searchParams.get("destination") || undefined,
      category: searchParams.get("category") || undefined,
      vehicle: searchParams.get("vehicle") || undefined,
      maxPrice: searchParams.get("maxPrice") || undefined,
      owner: searchParams.get("owner") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { destination, category, vehicle, maxPrice, owner } = parsed.data;
    const supabase = await createServerSupabaseClient();

    if (supabase) {
      // 1. Owner Hub Request (owner=me)
      if (owner === "me") {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return NextResponse.json(
            { error: "Authentication required to view owner listings." },
            { status: 401 }
          );
        }

        const { data: ownerSpaces, error: ownerErr } = await supabase
          .from("parking_spaces")
          .select("*, profiles:owner_id (*)")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

        interface SpaceWithProfile extends SpaceRow {
          profiles?: Parameters<typeof mapDbSpaceToParkingSpace>[1];
        }

        if (!ownerErr && ownerSpaces && ownerSpaces.length > 0) {
          const spaces: ParkingSpace[] = (ownerSpaces as unknown as SpaceWithProfile[]).map((s) =>
            mapDbSpaceToParkingSpace(s, s.profiles)
          );
          return NextResponse.json({
            success: true,
            source: "supabase",
            count: spaces.length,
            data: spaces,
          });
        }
      }

      // 2. Public Marketplace Search
      let query = supabase
        .from("parking_spaces")
        .select("*, profiles:owner_id (*)")
        .eq("publication_status", "published")
        .eq("verification_status", "verified");

      if (category && category !== "all") {
        query = query.eq("category", category as SpaceCategory);
      }

      if (maxPrice) {
        query = query.lte("price_per_hour", maxPrice);
      }

      const { data: dbSpaces, error: dbErr } = await query.order("rating", { ascending: false });

      if (!dbErr && dbSpaces && dbSpaces.length > 0) {
        interface SpaceWithProfile extends SpaceRow {
          profiles?: Parameters<typeof mapDbSpaceToParkingSpace>[1];
        }
        let mapped = (dbSpaces as unknown as SpaceWithProfile[]).map((s) =>
          mapDbSpaceToParkingSpace(s, s.profiles)
        );

        if (destination) {
          const q = destination.toLowerCase();
          mapped = mapped.filter(
            (s) =>
              s.title.toLowerCase().includes(q) ||
              s.address.toLowerCase().includes(q) ||
              s.neighborhood.toLowerCase().includes(q) ||
              s.city.toLowerCase().includes(q)
          );
        }

        if (vehicle && vehicle !== "all") {
          mapped = mapped.filter(
            (s) => s.maxVehicleType === vehicle || s.maxVehicleType === "truck"
          );
        }

        return NextResponse.json({
          success: true,
          source: "supabase",
          count: mapped.length,
          data: mapped,
        });
      }
    }

    // 3. Graceful Sandbox / Mock Data Fallback
    let spaces = [...MOCK_PARKING_SPACES];

    if (destination) {
      const q = destination.toLowerCase();
      spaces = spaces.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          s.neighborhood.toLowerCase().includes(q)
      );
    }

    if (category && category !== "all") {
      spaces = spaces.filter((s) => s.category === category);
    }

    if (vehicle && vehicle !== "all") {
      spaces = spaces.filter((s) => s.maxVehicleType === vehicle || s.maxVehicleType === "truck");
    }

    if (maxPrice) {
      spaces = spaces.filter((s) => s.pricePerHour <= maxPrice);
    }

    return NextResponse.json({
      success: true,
      source: "sandbox",
      count: spaces.length,
      data: spaces,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = ListingCreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase connection is not available." },
        { status: 503 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in as a space owner to list a space." },
        { status: 401 }
      );
    }

    const data = result.data;

    // Insert new space
    const { data: newSpace, error: insertError } = await supabase
      .from("parking_spaces")
      .insert({
        owner_id: user.id,
        title: data.title,
        description: data.description,
        address: data.address,
        neighborhood: data.neighborhood,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        price_per_hour: data.pricePerHour,
        price_per_day: data.pricePerDay,
        category: data.category,
        photos: data.photos,
        is_covered: data.isCovered,
        has_ev_charging: data.hasEvCharging,
        ev_charger_type: data.evChargerType || null,
        verification_status: "verified",
        publication_status: "published",
        is_demo_seed: false,
        max_vehicle_type: data.maxVehicleType,
        clearance_feet: data.clearanceFeet,
        access_type: data.accessType,
        access_instructions: data.accessInstructions,
        security_features: data.securityFeatures,
        rules: data.rules,
        flexible_extension_supported: data.flexibleExtensionSupported,
        recovery_guaranteed: data.recoveryGuaranteed,
        available_slots_count: data.availableSlotsCount,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Insert default weekly availability rules
    const rulesToInsert = Array.from({ length: 7 }, (_, day) => ({
      space_id: newSpace.id,
      day_of_week: day,
      start_time: "08:00:00",
      end_time: "20:00:00",
      is_blocked: false,
    }));

    await supabase.from("availability_rules").insert(rulesToInsert);

    return NextResponse.json(
      {
        success: true,
        message: "Parking space published successfully!",
        space: mapDbSpaceToParkingSpace(newSpace),
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create listing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
