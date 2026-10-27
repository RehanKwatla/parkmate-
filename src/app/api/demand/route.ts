import { NextResponse } from "next/server";
import { z } from "zod";
import { estimateDemand, DEFAULT_MANUAL_EVENT_FLAGS } from "@/lib/demand-engine";

const DemandQuerySchema = z.object({
  destination: z.string().trim().optional(),
  neighborhood: z.string().trim().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
  startHour: z.coerce.number().min(0).max(24).optional(),
  endHour: z.coerce.number().min(0).max(24).optional(),
  historicalSampleBookingsCount: z.coerce.number().int().min(0).optional(),
  totalCapacityInArea: z.coerce.number().int().min(1).optional(),
  customSearchTrendMultiplier: z.coerce.number().min(0.5).max(3.0).optional(),
  includeEvents: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = DemandQuerySchema.safeParse({
      destination: searchParams.get("destination") || undefined,
      neighborhood: searchParams.get("neighborhood") || undefined,
      lat: searchParams.get("lat") || undefined,
      lng: searchParams.get("lng") || undefined,
      startTime: searchParams.get("startTime") || undefined,
      endTime: searchParams.get("endTime") || undefined,
      dayOfWeek: searchParams.get("dayOfWeek") || undefined,
      startHour: searchParams.get("startHour") || undefined,
      endHour: searchParams.get("endHour") || undefined,
      historicalSampleBookingsCount: searchParams.get("historicalSampleBookingsCount") || undefined,
      totalCapacityInArea: searchParams.get("totalCapacityInArea") || undefined,
      customSearchTrendMultiplier: searchParams.get("customSearchTrendMultiplier") || undefined,
      includeEvents: searchParams.get("includeEvents") || true,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid demand parameters", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const q = parsed.data;
    const demandResult = estimateDemand({
      destination: q.destination,
      neighborhood: q.neighborhood,
      lat: q.lat,
      lng: q.lng,
      startTime: q.startTime,
      endTime: q.endTime,
      dayOfWeek: q.dayOfWeek,
      startHour: q.startHour,
      endHour: q.endHour,
      historicalSampleBookingsCount: q.historicalSampleBookingsCount,
      totalCapacityInArea: q.totalCapacityInArea,
      customSearchTrendMultiplier: q.customSearchTrendMultiplier,
      activeEvents: DEFAULT_MANUAL_EVENT_FLAGS,
    });

    return NextResponse.json({
      success: true,
      data: demandResult,
      availableEvents: DEFAULT_MANUAL_EVENT_FLAGS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to calculate demand estimate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const demandResult = estimateDemand({
      destination: body.destination,
      neighborhood: body.neighborhood,
      lat: body.lat,
      lng: body.lng,
      startTime: body.startTime,
      endTime: body.endTime,
      dayOfWeek: body.dayOfWeek,
      startHour: body.startHour,
      endHour: body.endHour,
      historicalSampleBookingsCount: body.historicalSampleBookingsCount,
      totalCapacityInArea: body.totalCapacityInArea,
      customSearchTrendMultiplier: body.customSearchTrendMultiplier,
      activeEvents: body.customEvents || DEFAULT_MANUAL_EVENT_FLAGS,
    });

    return NextResponse.json({
      success: true,
      data: demandResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to simulate demand";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
