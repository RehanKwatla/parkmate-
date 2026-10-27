import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MOCK_PARKING_SPACES } from "@/lib/mock-data";
import { mapDbSpaceToParkingSpace, ParkingSpace, SpaceRow, VehicleType } from "@/types/parking";
import {
  evaluateVehicleCompatibility,
  CompatibilityResult,
  DEFAULT_SAFETY_MARGINS,
} from "@/lib/compatibility-engine";
import {
  rankSpaces,
  calculateHaversineDistanceMiles,
  estimateUrbanWalkingMinutes,
  RankedSpaceResult,
  DEFAULT_RANKING_WEIGHTS,
} from "@/lib/ranking-engine";
import { estimateDemand, DemandEstimateResult } from "@/lib/demand-engine";

const SearchQuerySchema = z.object({
  destination: z.string().trim().optional(),
  destLat: z.coerce.number().optional(),
  destLng: z.coerce.number().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  vehicleType: z.enum(["compact", "sedan", "suv", "truck", "van", "ev", "all"]).optional().default("all"),
  customHeightFeet: z.coerce.number().positive().optional(),
  customLengthFeet: z.coerce.number().positive().optional(),
  customWidthFeet: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  maxDistanceMiles: z.coerce.number().positive().optional(),
  onlyCovered: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
  onlyEv: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
  sortBy: z.enum(["recommended", "price_asc", "price_desc", "rating", "distance"]).optional().default("recommended"),
});

export interface SearchResponsePayload {
  success: boolean;
  source: "supabase" | "sandbox";
  count: number;
  totalPoolCount: number;
  data: RankedSpaceResult[];
  alternatives: Array<RankedSpaceResult & { alternativeReason: string }>;
  query: z.infer<typeof SearchQuerySchema>;
  appliedWeights: typeof DEFAULT_RANKING_WEIGHTS;
  destinationCoords?: { lat: number; lng: number };
  demandEstimate?: DemandEstimateResult;
}

// Default reference coordinates for San Francisco Financial District
const DEFAULT_SF_COORDS = { lat: 37.7915, lng: -122.3995 };

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = SearchQuerySchema.safeParse({
      destination: searchParams.get("destination") || undefined,
      destLat: searchParams.get("destLat") || undefined,
      destLng: searchParams.get("destLng") || undefined,
      startTime: searchParams.get("startTime") || undefined,
      endTime: searchParams.get("endTime") || undefined,
      vehicleType: (searchParams.get("vehicleType") as VehicleType) || undefined,
      customHeightFeet: searchParams.get("customHeightFeet") || undefined,
      customLengthFeet: searchParams.get("customLengthFeet") || undefined,
      customWidthFeet: searchParams.get("customWidthFeet") || undefined,
      maxPrice: searchParams.get("maxPrice") || undefined,
      maxDistanceMiles: searchParams.get("maxDistanceMiles") || undefined,
      onlyCovered: searchParams.get("onlyCovered") || undefined,
      onlyEv: searchParams.get("onlyEv") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid search parameters", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const q = parsed.data;

    // Validate time window if provided
    if (q.startTime && q.endTime) {
      const sDate = new Date(q.startTime);
      const eDate = new Date(q.endTime);
      if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid arrival or departure timestamp format." },
          { status: 400 }
        );
      }
      if (eDate <= sDate) {
        return NextResponse.json(
          { error: "Departure time must be strictly after arrival time." },
          { status: 400 }
        );
      }
    }

    // Determine target destination coordinates
    let destCoords: { lat: number; lng: number } | undefined = undefined;
    if (q.destLat !== undefined && q.destLng !== undefined) {
      destCoords = { lat: q.destLat, lng: q.destLng };
    } else if (q.destination) {
      // Basic geocode heuristic for demo/testing
      const dLower = q.destination.toLowerCase();
      if (dLower.includes("nob hill")) destCoords = { lat: 37.791, lng: -122.411 };
      else if (dLower.includes("soma") || dLower.includes("moscone")) destCoords = { lat: 37.7842, lng: -122.4015 };
      else if (dLower.includes("mission")) destCoords = { lat: 37.7675, lng: -122.4221 };
      else if (dLower.includes("airport") || dLower.includes("sfo")) destCoords = { lat: 37.6213, lng: -122.379 };
      else destCoords = DEFAULT_SF_COORDS;
    } else {
      destCoords = DEFAULT_SF_COORDS;
    }

    const supabase = await createServerSupabaseClient();
    let allSpaces: ParkingSpace[] = [];
    let dataSource: "supabase" | "sandbox" = "sandbox";
    const unavailableSpaceIds = new Set<string>();

    if (supabase) {
      const { data: dbSpaces, error: dbErr } = await supabase
        .from("parking_spaces")
        .select("*, profiles:owner_id (*)")
        .eq("publication_status", "published");

      if (!dbErr && dbSpaces && dbSpaces.length > 0) {
        interface SpaceWithProfile extends SpaceRow {
          profiles?: Parameters<typeof mapDbSpaceToParkingSpace>[1];
        }
        allSpaces = (dbSpaces as unknown as SpaceWithProfile[]).map((s) =>
          mapDbSpaceToParkingSpace(s, s.profiles)
        );
        dataSource = "supabase";

        // Server-Side Availability Verification via Bookings & Rules
        if (q.startTime && q.endTime) {
          const sIso = new Date(q.startTime).toISOString();
          const eIso = new Date(q.endTime).toISOString();

          // 1. Check overlapping confirmed/active bookings
          const { data: conflictingBookings } = await supabase
            .from("bookings")
            .select("space_id")
            .in("booking_status", ["confirmed", "active", "pending"])
            .lt("start_time", eIso)
            .gt("end_time", sIso);

          if (conflictingBookings) {
            for (const b of conflictingBookings) {
              unavailableSpaceIds.add(b.space_id);
            }
          }

          // 2. Check blocked date rules
          const sDateOnly = sIso.slice(0, 10);
          const { data: blockedRules } = await supabase
            .from("availability_rules")
            .select("space_id, specific_date, start_time, end_time")
            .eq("is_blocked", true)
            .eq("specific_date", sDateOnly);

          if (blockedRules) {
            for (const r of blockedRules) {
              const ruleStart = new Date(`${r.specific_date}T${r.start_time}`).toISOString();
              const ruleEnd = new Date(`${r.specific_date}T${r.end_time}`).toISOString();
              if (sIso < ruleEnd && eIso > ruleStart) {
                unavailableSpaceIds.add(r.space_id);
              }
            }
          }
        }
      }
    }

    // Fallback to mock spaces if database returned no published spaces
    if (allSpaces.length === 0) {
      allSpaces = [...MOCK_PARKING_SPACES];
      dataSource = "sandbox";
    }

    // =========================================================================
    // Compatibility & Hard Constraint Evaluation
    // =========================================================================
    const vehicleQuery = {
      vehicleType: q.vehicleType,
      customHeightFeet: q.customHeightFeet,
      customLengthFeet: q.customLengthFeet,
      customWidthFeet: q.customWidthFeet,
    };

    interface EvaluatedCandidate {
      space: ParkingSpace;
      compatibility: CompatibilityResult;
      isAvailable: boolean;
      distanceMiles: number;
      walkingTimeMinutes: number;
      failsCriteria: string[];
    }

    const evaluatedPool: EvaluatedCandidate[] = allSpaces.map((space) => {
      const compatibility = evaluateVehicleCompatibility(space, vehicleQuery, DEFAULT_SAFETY_MARGINS);
      const isAvailable = !unavailableSpaceIds.has(space.id);
      
      const distanceMiles = destCoords
        ? calculateHaversineDistanceMiles(
            destCoords.lat,
            destCoords.lng,
            space.coordinates.lat,
            space.coordinates.lng
          )
        : 0.5;

      const walkingTimeMinutes = estimateUrbanWalkingMinutes(distanceMiles);
      const failsCriteria: string[] = [];

      // Hard vehicle compatibility check
      if (!compatibility.isCompatible) {
        failsCriteria.push("vehicle_incompatible");
      }

      // Hard availability check
      if (!isAvailable) {
        failsCriteria.push("temporally_unavailable");
      }

      // Hard preference filters
      if (q.onlyCovered && !space.isCovered) {
        failsCriteria.push("not_covered");
      }
      if (q.onlyEv && !space.hasEvCharging) {
        failsCriteria.push("no_ev");
      }
      if (q.maxPrice && space.pricePerHour > q.maxPrice) {
        failsCriteria.push("price_exceeded");
      }
      if (q.maxDistanceMiles && distanceMiles > q.maxDistanceMiles) {
        failsCriteria.push("distance_exceeded");
      }

      // Destination string match
      if (q.destination) {
        const text = q.destination.toLowerCase();
        const matchesText =
          space.title.toLowerCase().includes(text) ||
          space.address.toLowerCase().includes(text) ||
          space.neighborhood.toLowerCase().includes(text) ||
          space.city.toLowerCase().includes(text);
        if (!matchesText && distanceMiles > 5.0) {
          failsCriteria.push("destination_mismatch");
        }
      }

      return {
        space,
        compatibility,
        isAvailable,
        distanceMiles,
        walkingTimeMinutes,
        failsCriteria,
      };
    });

    // 1. Direct valid candidates: MUST pass all hard criteria
    const validCandidates = evaluatedPool.filter((c) => c.failsCriteria.length === 0);

    // Rank valid candidates using multi-criteria deterministic scoring
    const rankingContext = {
      destinationCoords: destCoords,
      maxBudgetPrice: q.maxPrice,
      preferCovered: q.onlyCovered,
      preferEvCharging: q.onlyEv,
    };

    const rankedValid: RankedSpaceResult[] = rankSpaces(
      validCandidates.map((c) => ({ space: c.space, compatibility: c.compatibility })),
      rankingContext,
      DEFAULT_RANKING_WEIGHTS
    );

    // Apply secondary sort order if requested
    if (q.sortBy === "price_asc") {
      rankedValid.sort((a, b) => a.space.pricePerHour - b.space.pricePerHour);
    } else if (q.sortBy === "price_desc") {
      rankedValid.sort((a, b) => b.space.pricePerHour - a.space.pricePerHour);
    } else if (q.sortBy === "rating") {
      rankedValid.sort((a, b) => b.space.rating - a.space.rating);
    } else if (q.sortBy === "distance") {
      rankedValid.sort((a, b) => a.distanceMiles - b.distanceMiles);
    }

    // =========================================================================
    // Useful Alternatives Generation
    // MANDATORY: Never silently relax vehicle compatibility or availability!
    // An alternative MUST be 100% physically compatible and available.
    // We only relax soft preferences: distance radius, budget, or covered/EV tags.
    // =========================================================================
    const alternatives: Array<RankedSpaceResult & { alternativeReason: string }> = [];

    if (rankedValid.length === 0) {
      // Find candidate spaces that strictly satisfy vehicle fit AND availability,
      // but were excluded only by soft filters (distance, price, or covered/EV)
      const compatibleAvailablePool = evaluatedPool.filter(
        (c) =>
          c.compatibility.isCompatible &&
          c.isAvailable &&
          !c.failsCriteria.includes("vehicle_incompatible") &&
          !c.failsCriteria.includes("temporally_unavailable")
      );

      if (compatibleAvailablePool.length > 0) {
        const rankedAlts = rankSpaces(
          compatibleAvailablePool.map((c) => ({ space: c.space, compatibility: c.compatibility })),
          rankingContext,
          DEFAULT_RANKING_WEIGHTS
        );

        for (const alt of rankedAlts) {
          const match = compatibleAvailablePool.find((c) => c.space.id === alt.space.id);
          const reasons: string[] = [];

          if (match?.failsCriteria.includes("distance_exceeded")) {
            reasons.push(
              `Located ${alt.distanceMiles.toFixed(1)} miles away (approx ${alt.walkingTimeMinutes} min walk)`
            );
          }
          if (match?.failsCriteria.includes("price_exceeded") && q.maxPrice) {
            const diff = (alt.space.pricePerHour - q.maxPrice).toFixed(2);
            reasons.push(`$${alt.space.pricePerHour.toFixed(2)}/hr (+$${diff} above your $${q.maxPrice} filter)`);
          }
          if (match?.failsCriteria.includes("not_covered") && q.onlyCovered) {
            reasons.push("Open-air bay with full vehicle clearance");
          }
          if (match?.failsCriteria.includes("no_ev") && q.onlyEv) {
            reasons.push("Standard space without dedicated EV plug");
          }

          const altExplanation =
            reasons.length > 0
              ? `Safe vehicle fit: ${reasons.join(" • ")}`
              : `Guaranteed physical fit for your vehicle profile (${alt.compatibility.clearanceBufferFeet.toFixed(1)} ft headroom buffer)`;

          alternatives.push({
            ...alt,
            alternativeReason: altExplanation,
          });

          if (alternatives.length >= 3) break;
        }
      }
    }

    // Compute explainable demand estimate for search parameters
    const demandEstimate = estimateDemand({
      destination: q.destination,
      lat: destCoords?.lat,
      lng: destCoords?.lng,
      startTime: q.startTime,
      endTime: q.endTime,
      historicalSampleBookingsCount: unavailableSpaceIds.size > 0 ? unavailableSpaceIds.size : 2,
      totalCapacityInArea: Math.max(5, allSpaces.length),
    });

    const payload: SearchResponsePayload = {
      success: true,
      source: dataSource,
      count: rankedValid.length,
      totalPoolCount: allSpaces.length,
      data: rankedValid,
      alternatives,
      query: q,
      appliedWeights: DEFAULT_RANKING_WEIGHTS,
      destinationCoords: destCoords,
      demandEstimate,
    };

    return NextResponse.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal search error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
