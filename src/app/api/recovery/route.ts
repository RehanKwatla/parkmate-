import { NextResponse } from "next/server";
import { RecoveryRequestSchema } from "@/lib/validations";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MOCK_RECOVERY_ALTERNATIVES } from "@/lib/mock-data";
import { mapDbSpaceToParkingSpace } from "@/types/parking";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = RecoveryRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid recovery request parameters", issues: result.error.issues },
        { status: 400 }
      );
    }

    const { bookingId, reason, userCoordinates } = result.data;
    const supabase = await createServerSupabaseClient();

    let alternativeSpace = MOCK_RECOVERY_ALTERNATIVES[0];
    let reporterId: string | null = null;

    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      reporterId = user?.id || null;

      // Find an available verified alternative space in database
      const { data: dbAltSpace } = await supabase
        .from("parking_spaces")
        .select("*, profiles:owner_id (*)")
        .eq("publication_status", "published")
        .eq("verification_status", "verified")
        .neq("id", bookingId)
        .limit(1)
        .maybeSingle();

      if (dbAltSpace) {
        const altWithProfile = dbAltSpace as unknown as { profiles?: Parameters<typeof mapDbSpaceToParkingSpace>[1] };
        alternativeSpace = mapDbSpaceToParkingSpace(dbAltSpace, altWithProfile.profiles);
      }

      if (reporterId) {
        // Record official incident report in Supabase
        await supabase.from("reports").insert({
          reporter_id: reporterId,
          booking_id: bookingId.startsWith("bk-") ? null : bookingId,
          report_type: "spot_blocked",
          description: reason,
          status: "resolved",
          resolution_notes: `ParkMate Recovery Protection triggered. Alternative space ${alternativeSpace.id} (${alternativeSpace.title}) allocated at zero additional charge.`,
        });

        // Update booking if exists in database
        if (!bookingId.startsWith("bk-")) {
          await supabase
            .from("bookings")
            .update({
              recovery_status: "recovered",
              alternative_space_id: alternativeSpace.id,
              access_code: `REC-PASS-FREE-${Math.floor(100 + Math.random() * 900)}`,
            })
            .eq("id", bookingId);

          await supabase.from("booking_events").insert({
            booking_id: bookingId,
            event_type: "resolution",
            from_status: "access_issue",
            to_status: "recovered",
            note: `Spot blocked reported: "${reason}". Partner space reallocated.`,
            created_by: reporterId,
            metadata: { alternativeSpaceId: alternativeSpace.id, userCoordinates },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      recoveryId: `rec-${Math.floor(10000 + Math.random() * 90000)}`,
      originalBookingId: bookingId,
      status: "reallocated",
      reasonRecorded: reason,
      alternativeSpace,
      message:
        "Alternative space allocated with $0.00 fee under ParkMate Booking Recovery Protection guarantee.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Recovery allocation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
