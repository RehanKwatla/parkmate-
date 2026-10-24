import { NextResponse } from "next/server";
import { z } from "zod";
import { MOCK_RECOVERY_ALTERNATIVES } from "@/lib/mock-data";

const RecoveryRequestSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().min(3),
  userCoordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
});

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

    const { bookingId, reason } = result.data;

    // Allocate backup partner space
    const alternativeSpace = MOCK_RECOVERY_ALTERNATIVES[0];

    return NextResponse.json({
      success: true,
      recoveryId: `rec-${Math.floor(10000 + Math.random() * 90000)}`,
      originalBookingId: bookingId,
      status: "reallocated",
      reasonRecorded: reason,
      alternativeSpace,
      message: "Alternative space allocated with 0 extra fee under ParkMate Booking Recovery Protection.",
    });
  } catch {
    return NextResponse.json(
      { error: "Recovery allocation failed" },
      { status: 500 }
    );
  }
}
