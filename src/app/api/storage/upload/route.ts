import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  try {
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
        { error: "Authentication required to upload photos." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type: ${file.type}. Allowed formats: JPEG, PNG, WEBP.`,
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 5MB maximum upload limit." },
        { status: 400 }
      );
    }

    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("parking-photos")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("parking-photos").getPublicUrl(uploadData.path);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: uploadData.path,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to upload image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
