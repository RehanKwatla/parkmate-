import { NextResponse } from "next/server";
import { SavedSpaceSchema } from "@/lib/validations";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: true, savedSpaceIds: [] });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: true, savedSpaceIds: [] });
    }

    const { data, error } = await supabase
      .from("saved_spaces")
      .select("space_id")
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const savedSpaceIds = data.map((row) => row.space_id);
    return NextResponse.json({ success: true, savedSpaceIds });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load saved spaces";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = SavedSpaceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const { spaceId } = result.data;
    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json({ success: true, saved: true });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to save favorites." },
        { status: 401 }
      );
    }

    const { error } = await supabase.from("saved_spaces").upsert({
      user_id: user.id,
      space_id: spaceId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, saved: true, spaceId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save space";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get("spaceId");

    if (!spaceId) {
      return NextResponse.json({ error: "spaceId parameter required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: true, removed: true });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to modify favorites." },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from("saved_spaces")
      .delete()
      .eq("user_id", user.id)
      .eq("space_id", spaceId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, removed: true, spaceId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to remove saved space";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
