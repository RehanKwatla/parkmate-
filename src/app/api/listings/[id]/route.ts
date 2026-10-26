import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MOCK_PARKING_SPACES } from "@/lib/mock-data";
import { mapDbSpaceToParkingSpace } from "@/types/parking";

interface RouteProps {
  params: Promise<{ id: string }>;
}

const UpdateSpaceSchema = z.object({
  title: z.string().min(5).optional(),
  description: z.string().min(15).optional(),
  pricePerHour: z.number().positive().optional(),
  pricePerDay: z.number().positive().optional(),
  publicationStatus: z.enum(["draft", "published", "paused", "archived"]).optional(),
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
        return NextResponse.json({
          success: true,
          space: mapDbSpaceToParkingSpace(dbSpace, spaceWithProfile.profiles),
        });
      }
    }

    const mock = MOCK_PARKING_SPACES.find((s) => s.id === id);
    if (mock) {
      return NextResponse.json({
        success: true,
        space: mock,
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

    const updates: {
      title?: string;
      description?: string;
      price_per_hour?: number;
      price_per_day?: number;
      publication_status?: "draft" | "published" | "paused" | "archived";
    } = {};
    if (parsed.data.title) updates.title = parsed.data.title;
    if (parsed.data.description) updates.description = parsed.data.description;
    if (parsed.data.pricePerHour) updates.price_per_hour = parsed.data.pricePerHour;
    if (parsed.data.pricePerDay) updates.price_per_day = parsed.data.pricePerDay;
    if (parsed.data.publicationStatus) updates.publication_status = parsed.data.publicationStatus;

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
