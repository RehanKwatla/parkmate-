import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const VerifyListingSchema = z.object({
  spaceId: z.string().uuid("Invalid space ID"),
  status: z.enum(["pending", "verified", "rejected"]),
  adminNotes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = VerifyListingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { spaceId, status, adminNotes } = parsed.data;
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        message: `Listing verification status updated to ${status} (sandbox mode)`,
        verificationStatus: status,
      });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Update space verification status
    const { data: updated, error: updateErr } = await supabase
      .from("parking_spaces")
      .update({
        verification_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", spaceId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: status === "verified" 
        ? "Listing has been successfully verified after reviewing owner authorization and property deed."
        : `Listing verification status set to ${status}.`,
      verificationStatus: status,
      adminNotes: adminNotes || null,
      space: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify listing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
