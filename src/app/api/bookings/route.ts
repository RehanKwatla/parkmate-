import { NextResponse } from "next/server";
import { z } from "zod";
import { MOCK_PARKING_SPACES } from "@/lib/mock-data";

const BookingCreateSchema = z.object({
  spaceId: z.string().min(1, "Space ID is required"),
  durationHours: z.number().int().min(1).max(24),
  vehicleModel: z.string().min(2, "Vehicle model is required"),
  vehicleType: z.enum(["compact", "sedan", "suv", "truck", "van", "ev"]),
  licensePlate: z.string().min(2, "License plate is required"),
});

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
    const space = MOCK_PARKING_SPACES.find((s) => s.id === spaceId);

    if (!space) {
      return NextResponse.json(
        { error: "Parking space not found" },
        { status: 404 }
      );
    }

    const subtotal = space.pricePerHour * durationHours;
    const serviceFee = 2.50;
    const taxes = Number((subtotal * 0.08).toFixed(2));
    const totalPrice = subtotal + serviceFee + taxes;

    const newBooking = {
      id: `bk-${Math.floor(1000 + Math.random() * 9000)}`,
      spaceId: space.id,
      spaceTitle: space.title,
      spaceAddress: space.address,
      spaceImage: space.images[0],
      startTime: "Today, Immediate",
      endTime: `Today, +${durationHours} hrs`,
      vehicleModel,
      vehicleType,
      licensePlate,
      hourlyRate: space.pricePerHour,
      totalPrice,
      status: "active",
      accessCode: `PM-${Math.floor(1000 + Math.random() * 9000)}-${space.id.substring(3).toUpperCase()}`,
      canExtend: space.flexibleExtensionSupported,
      recoveryGuaranteed: space.recoveryGuaranteed,
    };

    return NextResponse.json(
      { success: true, booking: newBooking },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to process booking reservation" },
      { status: 500 }
    );
  }
}
