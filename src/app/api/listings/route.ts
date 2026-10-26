import { NextResponse } from "next/server";
import { z } from "zod";
import { ListingCreateSchema, ListingDraftSaveSchema } from "@/lib/validations";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MOCK_PARKING_SPACES } from "@/lib/mock-data";
import { mapDbSpaceToParkingSpace, ParkingSpace, SpaceRow, SpaceCategory } from "@/types/parking";
import { Database, VerificationStatus, PublicationStatus } from "@/types/database";

const QuerySchema = z.object({
  destination: z.string().optional(),
  category: z.string().optional(),
  vehicle: z.string().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  owner: z.string().optional(),
  includeDrafts: z.string().optional(),
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
      includeDrafts: searchParams.get("includeDrafts") || undefined,
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

      // 2. Public Marketplace Search (published spaces)
      let query = supabase
        .from("parking_spaces")
        .select("*, profiles:owner_id (*)")
        .eq("publication_status", "published");

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
    const isDraft = body.publicationStatus === "draft" || body.isDraft === true;

    // Validate using appropriate schema
    let data;
    if (isDraft) {
      const draftResult = ListingDraftSaveSchema.safeParse(body);
      if (!draftResult.success) {
        return NextResponse.json(
          { error: "Draft validation failed", issues: draftResult.error.issues },
          { status: 400 }
        );
      }
      data = draftResult.data;
    } else {
      const publishResult = ListingCreateSchema.safeParse(body);
      if (!publishResult.success) {
        return NextResponse.json(
          { error: "Validation failed", issues: publishResult.error.issues },
          { status: 400 }
        );
      }
      data = publishResult.data;
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
        { error: "You must be signed in as a space owner to list or save a space." },
        { status: 401 }
      );
    }

    const targetSpaceId = data.id;

    // If targetSpaceId is provided, check if space exists and verify ownership for update
    if (targetSpaceId) {
      const { data: existingSpace } = await supabase
        .from("parking_spaces")
        .select("owner_id")
        .eq("id", targetSpaceId)
        .single();

      if (existingSpace && existingSpace.owner_id !== user.id) {
        return NextResponse.json(
          { error: "Forbidden: You are not authorized to update this listing." },
          { status: 403 }
        );
      }
    }

    // Determine verification status: newly published owner listings are 'pending' verification for admin review
    const verificationStatus: VerificationStatus = "pending";
    const publicationStatus: PublicationStatus = isDraft ? "draft" : ((data.publicationStatus || "published") as PublicationStatus);

    const spacePayload: Database["public"]["Tables"]["parking_spaces"]["Insert"] = {
      owner_id: user.id,
      title: data.title || "Untitled Parking Space",
      description: data.description || "No description provided yet.",
      address: data.address || "Pending Address",
      neighborhood: data.neighborhood || "San Francisco",
      city: data.city || "San Francisco",
      latitude: data.latitude ?? 37.7749,
      longitude: data.longitude ?? -122.4194,
      price_per_hour: data.pricePerHour ?? 5.0,
      price_per_day: data.pricePerDay ?? 30.0,
      price_per_month: data.pricePerMonth ?? null,
      category: data.category || "covered",
      photos: data.photos && data.photos.length > 0 ? data.photos : ["https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80"],
      is_covered: data.isCovered ?? false,
      has_ev_charging: data.hasEvCharging ?? false,
      ev_charger_type: data.evChargerType || null,
      verification_status: verificationStatus,
      publication_status: publicationStatus,
      is_authorized: Boolean(data.isAuthorized),
      authorized_at: data.isAuthorized ? new Date().toISOString() : null,
      draft_step: data.draftStep || 1,
      space_dimensions: data.spaceDimensions || "18ft x 9ft",
      clearance_feet: data.clearanceFeet ?? 7.5,
      height_clearance_inches: data.heightClearanceInches ?? null,
      is_accessible: data.isAccessible ?? false,
      max_vehicle_type: data.maxVehicleType || "suv",
      access_type: data.accessType || "instant_keypad",
      access_instructions: data.accessInstructions || "",
      security_features: data.securityFeatures || [],
      rules: data.rules || [],
      flexible_extension_supported: data.flexibleExtensionSupported ?? true,
      recovery_guaranteed: data.recoveryGuaranteed ?? true,
      available_slots_count: data.availableSlotsCount ?? 1,
    };

    let resultSpace: SpaceRow;

    if (targetSpaceId) {
      // Update existing draft/listing
      const { data: updated, error: updateError } = await supabase
        .from("parking_spaces")
        .update(spacePayload)
        .eq("id", targetSpaceId)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
      resultSpace = updated;
    } else {
      // Insert new listing
      const { data: inserted, error: insertError } = await supabase
        .from("parking_spaces")
        .insert(spacePayload)
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 });
      }
      resultSpace = inserted;
    }

    // Insert or update weekly schedule if provided
    if (data.weeklySchedule && data.weeklySchedule.length > 0) {
      // Delete existing weekly rules for this space
      await supabase
        .from("availability_rules")
        .delete()
        .eq("space_id", resultSpace.id)
        .is("specific_date", null);

      const rulesToInsert = data.weeklySchedule.map((r) => ({
        space_id: resultSpace.id,
        day_of_week: r.dayOfWeek,
        start_time: r.startTime.length === 5 ? `${r.startTime}:00` : r.startTime,
        end_time: r.endTime.length === 5 ? `${r.endTime}:00` : r.endTime,
        is_blocked: r.isBlocked,
      }));

      await supabase.from("availability_rules").insert(rulesToInsert);
    } else if (!targetSpaceId && !isDraft) {
      // Default weekly availability
      const defaultRules = Array.from({ length: 7 }, (_, day) => ({
        space_id: resultSpace.id,
        day_of_week: day,
        start_time: "08:00:00",
        end_time: "20:00:00",
        is_blocked: false,
      }));
      await supabase.from("availability_rules").insert(defaultRules);
    }

    // Insert blocked periods if provided
    if (data.blockedPeriods && data.blockedPeriods.length > 0) {
      for (const bp of data.blockedPeriods) {
        const bpDate = new Date(bp.date);
        const dayOfWeek = isNaN(bpDate.getDay()) ? 0 : bpDate.getDay();

        await supabase.from("availability_rules").insert({
          space_id: resultSpace.id,
          day_of_week: dayOfWeek,
          specific_date: bp.date,
          start_time: bp.startTime || "00:00:00",
          end_time: bp.endTime || "23:59:59",
          is_blocked: true,
          reason: bp.reason || "Owner reserved",
        });
      }
    }

    const mapped = mapDbSpaceToParkingSpace(resultSpace);

    return NextResponse.json(
      {
        success: true,
        message: isDraft ? "Draft saved successfully." : "Parking space published successfully!",
        space: mapped,
        isDraft,
      },
      { status: targetSpaceId ? 200 : 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process listing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
