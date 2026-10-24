import { NextResponse } from "next/server";
import { z } from "zod";
import { MOCK_PARKING_SPACES } from "@/lib/mock-data";

const QuerySchema = z.object({
  destination: z.string().optional(),
  category: z.string().optional(),
  vehicle: z.string().optional(),
  maxPrice: z.coerce.number().positive().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      destination: searchParams.get("destination") || undefined,
      category: searchParams.get("category") || undefined,
      vehicle: searchParams.get("vehicle") || undefined,
      maxPrice: searchParams.get("maxPrice") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { destination, category, vehicle, maxPrice } = parsed.data;

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
      count: spaces.length,
      data: spaces,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
