// ==============================================================================
// ParkMate Deterministic Multi-Criteria Ranking Engine
// 
// Architecture & Ranking Philosophy:
// This ranking engine evaluates valid candidate spaces using a transparent,
// deterministic weighted multi-criteria decision algorithm (MCDA).
// It does NOT use trained AI, stochastic weights, or black-box heuristics.
//
// Hard constraints (vehicle clearance, schedule availability, reservation conflicts)
// are strictly enforced BEFORE ranking. Ranking NEVER overrides a hard constraint.
// ==============================================================================

import { ParkingSpace } from "@/types/parking";
import { CompatibilityResult } from "./compatibility-engine";

export interface RankingWeights {
  proximity: number;   // W_prox: Proximity to user destination (0.35)
  price: number;       // W_price: Price competitiveness relative to budget (0.30)
  vehicleFit: number;  // W_fit: Clearance headroom & bay comfort buffer (0.15)
  reputation: number;  // W_rep: Verified host rating & review volume (0.10)
  preferences: number; // W_pref: Exact amenity match (Covered, EV, Keypad) (0.10)
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  proximity: 0.35,
  price: 0.30,
  vehicleFit: 0.15,
  reputation: 0.10,
  preferences: 0.10,
};

export interface RankingContext {
  destinationCoords?: { lat: number; lng: number };
  maxBudgetPrice?: number;
  minPriceInPool?: number;
  maxPriceInPool?: number;
  preferCovered?: boolean;
  preferEvCharging?: boolean;
}

export interface RankedSpaceResult {
  space: ParkingSpace;
  compatibility: CompatibilityResult;
  score: number; // 0 to 100
  scoreBreakdown: {
    proximityScore: number;
    priceScore: number;
    fitScore: number;
    reputationScore: number;
    preferenceScore: number;
  };
  distanceMiles: number;
  walkingTimeMinutes: number;
}

/**
 * Calculates straight-line distance between two GPS coordinates using Haversine formula.
 */
export function calculateHaversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Calculates estimated walking time based on standard pedestrian pace (~20 mins per mile / 3.0 mph)
 * plus a 1.25 urban street-grid routing factor.
 */
export function estimateUrbanWalkingMinutes(distanceMiles: number): number {
  const streetDistance = distanceMiles * 1.25;
  const minutes = Math.round(streetDistance * 20);
  return Math.max(1, minutes);
}

/**
 * Normalizes proximity into a 0-100 score based on an exponential decay function.
 * 0.1 miles -> 100, 0.5 miles -> 75, 1.0 miles -> 50, 2.0+ miles -> 15.
 */
function computeProximityScore(distanceMiles: number): number {
  if (distanceMiles <= 0.05) return 100;
  const score = 100 * Math.exp(-distanceMiles * 0.7);
  return Math.min(Math.max(Math.round(score), 0), 100);
}

/**
 * Normalizes price competitiveness into a 0-100 score.
 * Lower prices within the searched budget achieve higher scores.
 */
function computePriceScore(
  pricePerHour: number,
  minPrice: number,
  maxPrice: number,
  budgetCap?: number
): number {
  const effectiveMax = budgetCap && budgetCap > minPrice ? budgetCap : Math.max(maxPrice, minPrice + 1);
  if (pricePerHour <= minPrice) return 100;
  if (pricePerHour >= effectiveMax) return 20;

  const ratio = (effectiveMax - pricePerHour) / (effectiveMax - minPrice);
  return Math.round(20 + ratio * 80);
}

/**
 * Evaluates host reliability and review reputation into a 0-100 score.
 */
function computeReputationScore(rating: number, reviewCount: number): number {
  const ratingNorm = (Math.min(Math.max(rating, 1.0), 5.0) / 5.0) * 70;
  const countFactor = Math.min(Math.log10(reviewCount + 1) * 15, 30);
  return Math.round(ratingNorm + countFactor);
}

/**
 * Evaluates amenity match (covered, EV, verified title) into a 0-100 score.
 */
function computePreferenceScore(
  space: ParkingSpace,
  context: RankingContext
): number {
  let score = 50; // Baseline
  if (space.isVerified) score += 20;
  if (context.preferCovered && space.isCovered) score += 15;
  if (context.preferEvCharging && space.hasEvCharging) score += 15;
  if (space.accessType === "instant_keypad" || space.accessType === "qr_scanner") score += 10;
  return Math.min(score, 100);
}

/**
 * Ranks an array of valid, compatible parking spaces using deterministic multi-criteria scoring.
 */
export function rankSpaces(
  spacesWithComp: Array<{ space: ParkingSpace; compatibility: CompatibilityResult }>,
  context: RankingContext = {},
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS
): RankedSpaceResult[] {
  // Normalize pool prices
  const prices = spacesWithComp.map((item) => item.space.pricePerHour);
  const minPoolPrice = prices.length > 0 ? Math.min(...prices) : 4.0;
  const maxPoolPrice = prices.length > 0 ? Math.max(...prices) : 15.0;

  const results: RankedSpaceResult[] = spacesWithComp.map(({ space, compatibility }) => {
    // Distance calculation
    let distanceMiles = 0.3; // Default baseline if no coordinates supplied
    if (context.destinationCoords) {
      distanceMiles = calculateHaversineDistanceMiles(
        context.destinationCoords.lat,
        context.destinationCoords.lng,
        space.coordinates.lat,
        space.coordinates.lng
      );
    }
    const walkingTimeMinutes = estimateUrbanWalkingMinutes(distanceMiles);

    const proximityScore = computeProximityScore(distanceMiles);
    const priceScore = computePriceScore(
      space.pricePerHour,
      minPoolPrice,
      maxPoolPrice,
      context.maxBudgetPrice
    );
    const fitScore = compatibility.fitScore;
    const reputationScore = computeReputationScore(space.rating, space.reviewCount);
    const preferenceScore = computePreferenceScore(space, context);

    // Multi-criteria composite score
    const composite =
      weights.proximity * proximityScore +
      weights.price * priceScore +
      weights.vehicleFit * fitScore +
      weights.reputation * reputationScore +
      weights.preferences * preferenceScore;

    return {
      space,
      compatibility,
      score: Number(composite.toFixed(1)),
      scoreBreakdown: {
        proximityScore,
        priceScore,
        fitScore,
        reputationScore,
        preferenceScore,
      },
      distanceMiles,
      walkingTimeMinutes,
    };
  });

  // Default sorting: Highest score first
  return results.sort((a, b) => b.score - a.score);
}
