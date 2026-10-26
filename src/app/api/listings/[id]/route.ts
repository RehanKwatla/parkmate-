import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MOCK_PARKING_SPACES } from "@/lib/mock-data";
import { mapDbSpaceToParkingSpace } from "@/types/parking";
import { Database } from "@/types/database";

interface RouteProps {
  params: Promise<{ id: string }>;
}

const UpdateSpaceSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  pricePerHour: z.coerce.number().positive().optional(),
  pricePerDay: z.coerce.number().positive().optional(),
  pricePerMonth: z.coerce.number().positive().optional().nullable(),
  publicationStatus: z.enum(["draft", "published", "paused", "archived"]).optional(),
  photos: z.array(z.string()).optional(),
  clearanceFeet: z.coerce.number().positive().optional(),
  spaceDimensions: z.string().optional(),
  isCovered: z.boolean().optional(),
  hasEvCharging: z.boolean().optional(),
  isAccessible: z.boolean().optional(),
  draftStep: z.number().int().min(1).max(8).optional(),
});

export async function GET(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    if (supabase) {
      const { data: dbSpace, error } = await supabase
        .from("parking_spaces")
        .select("*, profiles:owner_id (*)")
        .eq("id", id)
        .single();

      if (!error && dbSpace) {
        const spaceWithProfile = dbSpace as unknown as { profiles?: Parameters<typeof mapDbSpaceToParkingSpace>[1] };
        
        // Also fetch availability rules for this space
        const { data: rules } = await supabase
          .from("availability_rules")
          .select("*")
          .eq("space_id", id);

        return NextResponse.json({
          success: true,
          space: mapDbSpaceToParkingSpace(dbSpace, spaceWithProfile.profiles),
          availabilityRules: rules || [],
        });
      }
    }

    const mock = MOCK_PARKING_SPACES.find((s) => s.id === id);
    if (mock) {
      return NextResponse.json({
        success: true,
        space: mock,
        availabilityRules: [],
      });
    }

    return NextResponse.json({ error: "Parking space not found" }, { status: 404 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load parking space";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateSpaceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: true, message: "Updated (sandbox mode)" });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Sign in required to update listing." },
        { status: 401 }
      );
    }

    // Verify ownership
    const { data: space, error: fetchErr } = await supabase
      .from("parking_spaces")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (fetchErr || !space) {
      return NextResponse.json({ error: "Parking space not found." }, { status: 404 });
    }

    if (space.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You are not the owner of this parking space." },
        { status: 403 }
      );
    }

    const updates: Database["public"]["Tables"]["parking_spaces"]["Update"] = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.pricePerHour !== undefined) updates.price_per_hour = parsed.data.pricePerHour;
    if (parsed.data.pricePerDay !== undefined) updates.price_per_day = parsed.data.pricePerDay;
    if (parsed.data.pricePerMonth !== undefined) updates.price_per_month = parsed.data.pricePerMonth;
    if (parsed.data.publicationStatus !== undefined) updates.publication_status = parsed.data.publicationStatus;
    if (parsed.data.photos !== undefined) updates.photos = parsed.data.photos;
    if (parsed.data.clearanceFeet !== undefined) updates.clearance_feet = parsed.data.clearanceFeet;
    if (parsed.data.spaceDimensions !== undefined) updates.space_dimensions = parsed.data.spaceDimensions;
    if (parsed.data.isCovered !== undefined) updates.is_covered = parsed.data.isCovered;
    if (parsed.data.hasEvCharging !== undefined) updates.has_ev_charging = parsed.data.hasEvCharging;
    if (parsed.data.isAccessible !== undefined) updates.is_accessible = parsed.data.isAccessible;
    if (parsed.data.draftStep !== undefined) updates.draft_step = parsed.data.draftStep;

    const { data: updated, error: updateErr } = await supabase
      .from("parking_spaces")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Listing updated successfully.",
      space: mapDbSpaceToParkingSpace(updated),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update listing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: true, message: "Deleted (sandbox mode)" });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    // Verify ownership
    const { data: space } = await supabase
      .from("parking_spaces")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (!space || space.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this space." }, { status: 403 });
    }

    const { error: deleteErr } = await supabase
      .from("parking_spaces")
      .delete()
      .eq("id", id);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Parking space deleted successfully." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete parking space";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
