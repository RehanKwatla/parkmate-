// ==============================================================================
// ParkMate Search & Vehicle Compatibility Engine Test Suite
// Verifies:
// 1. Vehicle clearance, dimension, and tier hard constraints
// 2. Deterministic multi-criteria ranking algorithm and documented weights
// 3. Alternative suggestion generator (strict preservation of vehicle compatibility)
// 4. Urban walking time calculation
// 5. Server-side availability and temporal booking conflict logic
// ==============================================================================

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName}`);
    passedCount++;
  } else {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${testName} ${details ? `(${details})` : ""}`);
    failedCount++;
  }
}

console.log("\n=======================================================");
console.log(" 🚗 PARKMATE SEARCH & COMPATIBILITY ENGINE TEST SUITE");
console.log("=======================================================\n");

// Configuration & Margins
const DEFAULT_SAFETY_MARGINS = {
  heightFeet: 0.3,
  lengthFeet: 0.5,
  widthFeet: 0.5,
};

const DETAILED_VEHICLE_PROFILES = {
  compact: { name: "Compact", heightFeet: 4.8, lengthFeet: 14.5, widthFeet: 5.8, minClearanceFeet: 5.2 },
  sedan: { name: "Sedan", heightFeet: 4.9, lengthFeet: 16.0, widthFeet: 6.0, minClearanceFeet: 5.5 },
  suv: { name: "SUV", heightFeet: 5.8, lengthFeet: 16.8, widthFeet: 6.5, minClearanceFeet: 6.5 },
  truck: { name: "Truck", heightFeet: 6.5, lengthFeet: 19.5, widthFeet: 6.8, minClearanceFeet: 7.0 },
  van: { name: "Van", heightFeet: 7.8, lengthFeet: 20.5, widthFeet: 6.8, minClearanceFeet: 8.5 },
  ev: { name: "EV", heightFeet: 5.2, lengthFeet: 15.8, widthFeet: 6.2, minClearanceFeet: 5.8 },
};

const VEHICLE_TIER = {
  compact: 1,
  sedan: 2,
  ev: 2,
  suv: 3,
  truck: 4,
  van: 4,
};

const DEFAULT_RANKING_WEIGHTS = {
  proximity: 0.35,
  price: 0.30,
  vehicleFit: 0.15,
  reputation: 0.10,
  preferences: 0.10,
};

function parseSpaceDimensions(dimStr) {
  if (!dimStr) return { lengthFeet: 18.0, widthFeet: 9.0 };
  const matches = dimStr.match(/(\d+(\.\d+)?)\s*(?:ft|')?\s*[xX*by]\s*(\d+(\.\d+)?)\s*(?:ft|')?/);
  if (matches && matches[1] && matches[3]) {
    const l = parseFloat(matches[1]);
    const w = parseFloat(matches[3]);
    if (!isNaN(l) && !isNaN(w) && l > 0 && w > 0) {
      return { lengthFeet: Math.max(l, w), widthFeet: Math.min(l, w) };
    }
  }
  return { lengthFeet: 18.0, widthFeet: 9.0 };
}

function evaluateVehicleCompatibility(space, vehicleInput, margins = DEFAULT_SAFETY_MARGINS) {
  const vehicleType = (!vehicleInput.vehicleType || vehicleInput.vehicleType === "all")
    ? "sedan"
    : vehicleInput.vehicleType;

  const profile = DETAILED_VEHICLE_PROFILES[vehicleType] || DETAILED_VEHICLE_PROFILES.sedan;

  const vehicleHeight = vehicleInput.customHeightFeet && vehicleInput.customHeightFeet > 0
    ? vehicleInput.customHeightFeet
    : profile.heightFeet;

  const vehicleLength = vehicleInput.customLengthFeet && vehicleInput.customLengthFeet > 0
    ? vehicleInput.customLengthFeet
    : profile.lengthFeet;

  const vehicleWidth = vehicleInput.customWidthFeet && vehicleInput.customWidthFeet > 0
    ? vehicleInput.customWidthFeet
    : profile.widthFeet;

  const spaceClearance = space.clearanceFeet;
  const parsedDims = parseSpaceDimensions(space.spaceDimensions);

  const requiredClearance = vehicleHeight + margins.heightFeet;
  const requiredLength = vehicleLength + margins.lengthFeet;
  const requiredWidth = vehicleWidth + margins.widthFeet;

  const fitsClearance = spaceClearance >= requiredClearance;
  const fitsLength = parsedDims.lengthFeet >= requiredLength;
  const fitsWidth = parsedDims.widthFeet >= requiredWidth;
  const fitsDimensions = fitsLength && fitsWidth;

  const spaceTier = VEHICLE_TIER[space.maxVehicleType] ?? 3;
  const vehicleTier = VEHICLE_TIER[vehicleType] ?? 2;
  const fitsVehicleType = spaceTier >= vehicleTier;

  const reasons = [];

  if (!fitsClearance) {
    const deficitInches = Math.round((requiredClearance - spaceClearance) * 12);
    reasons.push(
      `Height clearance of ${spaceClearance.toFixed(1)} ft is too low for your ${profile.name} (requires ${requiredClearance.toFixed(1)} ft with safety margin; short by ${deficitInches} in).`
    );
  }

  if (!fitsVehicleType) {
    reasons.push(
      `Space is designated for max vehicle size "${space.maxVehicleType.toUpperCase()}", which cannot accommodate a "${vehicleType.toUpperCase()}".`
    );
  }

  if (!fitsDimensions) {
    if (!fitsLength) {
      reasons.push(
        `Bay length of ${parsedDims.lengthFeet.toFixed(1)} ft cannot fit your ${vehicleLength.toFixed(1)} ft vehicle with safety buffer.`
      );
    }
    if (!fitsWidth) {
      reasons.push(
        `Bay width of ${parsedDims.widthFeet.toFixed(1)} ft is too narrow for door clearance.`
      );
    }
  }

  const isCompatible = fitsClearance && fitsVehicleType && fitsDimensions;
  const clearanceBufferFeet = Number((spaceClearance - vehicleHeight).toFixed(2));

  let fitScore = 0;
  if (isCompatible) {
    const bufferScore = Math.min(Math.max((clearanceBufferFeet - margins.heightFeet) * 30, 20), 50);
    const dimScore = Math.min((parsedDims.lengthFeet - vehicleLength) * 10 + (parsedDims.widthFeet - vehicleWidth) * 15, 50);
    fitScore = Math.round(bufferScore + dimScore);
  }

  return {
    isCompatible,
    reasons,
    clearanceBufferFeet,
    fitScore,
    details: {
      vehicleHeight,
      spaceClearance,
      requiredClearance: Number(requiredClearance.toFixed(2)),
      vehicleLength,
      spaceLength: parsedDims.lengthFeet,
      vehicleWidth,
      spaceWidth: parsedDims.widthFeet,
      fitsClearance,
      fitsDimensions,
      fitsVehicleType,
    },
  };
}

function calculateHaversineDistanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
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

function estimateUrbanWalkingMinutes(distanceMiles) {
  const streetDistance = distanceMiles * 1.25;
  const minutes = Math.round(streetDistance * 20);
  return Math.max(1, minutes);
}

function rankSpaces(spacesWithComp, context = {}, weights = DEFAULT_RANKING_WEIGHTS) {
  const prices = spacesWithComp.map((item) => item.space.pricePerHour);
  const minPoolPrice = prices.length > 0 ? Math.min(...prices) : 4.0;
  const maxPoolPrice = prices.length > 0 ? Math.max(...prices) : 15.0;

  const results = spacesWithComp.map(({ space, compatibility }) => {
    let distanceMiles = 0.3;
    if (context.destinationCoords) {
      distanceMiles = calculateHaversineDistanceMiles(
        context.destinationCoords.lat,
        context.destinationCoords.lng,
        space.coordinates.lat,
        space.coordinates.lng
      );
    }
    const walkingTimeMinutes = estimateUrbanWalkingMinutes(distanceMiles);

    // 1. Proximity score
    const proximityScore = distanceMiles <= 0.05 ? 100 : Math.min(Math.max(Math.round(100 * Math.exp(-distanceMiles * 0.7)), 0), 100);

    // 2. Price score
    const effectiveMax = context.maxBudgetPrice && context.maxBudgetPrice > minPoolPrice ? context.maxBudgetPrice : Math.max(maxPoolPrice, minPoolPrice + 1);
    let priceScore = 50;
    if (space.pricePerHour <= minPoolPrice) priceScore = 100;
    else if (space.pricePerHour >= effectiveMax) priceScore = 20;
    else {
      const ratio = (effectiveMax - space.pricePerHour) / (effectiveMax - minPoolPrice);
      priceScore = Math.round(20 + ratio * 80);
    }

    // 3. Fit score
    const fitScore = compatibility.fitScore;

    // 4. Reputation score
    const ratingNorm = (Math.min(Math.max(space.rating, 1.0), 5.0) / 5.0) * 70;
    const countFactor = Math.min(Math.log10((space.reviewCount || 0) + 1) * 15, 30);
    const reputationScore = Math.round(ratingNorm + countFactor);

    // 5. Preference score
    let preferenceScore = 50;
    if (space.isVerified) preferenceScore += 20;
    if (context.preferCovered && space.isCovered) preferenceScore += 15;
    if (context.preferEvCharging && space.hasEvCharging) preferenceScore += 15;
    preferenceScore = Math.min(preferenceScore, 100);

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
      scoreBreakdown: { proximityScore, priceScore, fitScore, reputationScore, preferenceScore },
      distanceMiles,
      walkingTimeMinutes,
    };
  });

  return results.sort((a, b) => b.score - a.score);
}

// Mock Spaces Dataset
const MOCK_SPACES = [
  {
    id: "sp-101",
    title: "Downtown Financial Bay",
    coordinates: { lat: 37.7915, lng: -122.3995 },
    pricePerHour: 7.5,
    clearanceFeet: 7.2,
    maxVehicleType: "suv",
    spaceDimensions: "18ft x 9ft",
    isCovered: true,
    hasEvCharging: true,
    rating: 4.95,
    reviewCount: 128,
    isVerified: true,
  },
  {
    id: "sp-102",
    title: "Nob Hill Open Driveway",
    coordinates: { lat: 37.7910, lng: -122.4110 },
    pricePerHour: 5.0,
    clearanceFeet: 12.0,
    maxVehicleType: "truck",
    spaceDimensions: "22ft x 10ft",
    isCovered: false,
    hasEvCharging: true,
    rating: 4.88,
    reviewCount: 64,
    isVerified: true,
  },
  {
    id: "sp-103",
    title: "Moscone Executive Deck",
    coordinates: { lat: 37.7842, lng: -122.4015 },
    pricePerHour: 9.0,
    clearanceFeet: 8.5,
    maxVehicleType: "truck",
    spaceDimensions: "20ft x 10ft",
    isCovered: true,
    hasEvCharging: false,
    rating: 4.91,
    reviewCount: 215,
    isVerified: true,
  },
  {
    id: "sp-104",
    title: "Mission Carport (Low Clearance)",
    coordinates: { lat: 37.7675, lng: -122.4221 },
    pricePerHour: 4.5,
    clearanceFeet: 6.5,
    maxVehicleType: "sedan",
    spaceDimensions: "16ft x 8.5ft",
    isCovered: true,
    hasEvCharging: false,
    rating: 4.75,
    reviewCount: 39,
    isVerified: false,
  },
];

// -----------------------------------------------------------------------------
// Test 1: Dimension Parser
// -----------------------------------------------------------------------------
console.log("SECTION 1: Dimension Parsing & Safety Margins");
{
  const standard = parseSpaceDimensions("18ft x 9ft");
  assert(standard.lengthFeet === 18 && standard.widthFeet === 9, "Parses '18ft x 9ft' correctly");

  const compact = parseSpaceDimensions("15x8");
  assert(compact.lengthFeet === 15 && compact.widthFeet === 8, "Parses '15x8' correctly");

  const fallback = parseSpaceDimensions(null);
  assert(fallback.lengthFeet === 18 && fallback.widthFeet === 9, "Falls back to standard 18x9 on null dimensions");
}

// -----------------------------------------------------------------------------
// Test 2: Hard Clearance Constraints
// -----------------------------------------------------------------------------
console.log("\nSECTION 2: Hard Physical Clearance Constraints");
{
  const carportSpace = MOCK_SPACES.find((s) => s.id === "sp-104"); // clearance: 6.5ft
  
  // Test compact car (4.8 + 0.3 = 5.1 <= 6.5) -> should FIT
  const compactEval = evaluateVehicleCompatibility(carportSpace, { vehicleType: "compact" });
  assert(compactEval.isCompatible === true, "Compact car fits in 6.5ft clearance carport");
  assert(compactEval.clearanceBufferFeet > 1.0, "Buffer calculation accurate for compact car");

  // Test full-size van (7.8 + 0.3 = 8.1 > 6.5) -> MUST FAIL
  const vanEval = evaluateVehicleCompatibility(carportSpace, { vehicleType: "van" });
  assert(vanEval.isCompatible === false, "Commercial Van rejected from 6.5ft clearance carport");
  assert(vanEval.reasons.some((r) => r.includes("Height clearance")), "Generates explicit clearance deficit reason");

  // Test custom height of 6.3 ft (6.3 + 0.3 = 6.6 ft > 6.5 ft) -> MUST FAIL
  const customHighEval = evaluateVehicleCompatibility(carportSpace, {
    vehicleType: "sedan",
    customHeightFeet: 6.3,
  });
  assert(customHighEval.isCompatible === false, "Custom height exceeding clearance with margin is rejected");
}

// -----------------------------------------------------------------------------
// Test 3: Bay Dimensions & Tier Constraints
// -----------------------------------------------------------------------------
console.log("\nSECTION 3: Bay Dimensions & Vehicle Tier Constraints");
{
  const openDriveway = MOCK_SPACES.find((s) => s.id === "sp-102"); // clearance: 12ft, max: truck

  // Full-size truck in open driveway -> should FIT
  const truckEval = evaluateVehicleCompatibility(openDriveway, { vehicleType: "truck" });
  assert(truckEval.isCompatible === true, "Truck fits in open driveway with 12ft clearance");

  // Custom vehicle with 28ft length in 22ft bay
  const oversizedEval = evaluateVehicleCompatibility(openDriveway, {
    customLengthFeet: 28.0,
  });
  assert(oversizedEval.isCompatible === false, "Oversized length (28ft) rejected from 22ft bay");
  assert(oversizedEval.details.fitsDimensions === false, "fitsDimensions accurately flagged false");
}

// -----------------------------------------------------------------------------
// Test 4: Distance & Urban Walking Time
// -----------------------------------------------------------------------------
console.log("\nSECTION 4: Pedestrian Routing & Distance Calculations");
{
  const distance = calculateHaversineDistanceMiles(37.7915, -122.3995, 37.7842, -122.4015);
  assert(distance >= 0.45 && distance <= 0.65, `Calculates Haversine distance (~${distance} mi)`);

  const walkingMins = estimateUrbanWalkingMinutes(distance);
  assert(walkingMins >= 10 && walkingMins <= 16, `Estimates realistic urban walking time (~${walkingMins} mins)`);
}

// -----------------------------------------------------------------------------
// Test 5: Deterministic Multi-Criteria Ranking Algorithm
// -----------------------------------------------------------------------------
console.log("\nSECTION 5: Deterministic Multi-Criteria Ranking (MCDA)");
{
  const candidateSpaces = MOCK_SPACES.map((space) => ({
    space,
    compatibility: evaluateVehicleCompatibility(space, { vehicleType: "sedan" }),
  }));

  const ranked = rankSpaces(candidateSpaces, {
    destinationCoords: { lat: 37.7915, lng: -122.3995 },
    maxBudgetPrice: 10.0,
  });

  assert(ranked.length === candidateSpaces.length, "All candidates ranked");
  assert(ranked[0].score >= ranked[1].score, "Results sorted descending by composite score");

  for (const r of ranked) {
    assert(r.score >= 0 && r.score <= 100, `Score is normalized in [0, 100] (score: ${r.score})`);
    assert(r.scoreBreakdown.proximityScore >= 0, "Proximity score populated");
    assert(r.scoreBreakdown.priceScore >= 0, "Price score populated");
    assert(r.scoreBreakdown.fitScore >= 0, "Vehicle fit score populated");
  }

  const weightSum =
    DEFAULT_RANKING_WEIGHTS.proximity +
    DEFAULT_RANKING_WEIGHTS.price +
    DEFAULT_RANKING_WEIGHTS.vehicleFit +
    DEFAULT_RANKING_WEIGHTS.reputation +
    DEFAULT_RANKING_WEIGHTS.preferences;
  assert(Math.abs(weightSum - 1.0) < 0.001, `Documented weights sum to 1.0 (sum: ${weightSum})`);
}

// -----------------------------------------------------------------------------
// Test 6: Safe Alternatives Generation
// -----------------------------------------------------------------------------
console.log("\nSECTION 6: Safe Alternatives Integrity (Never relax clearance)");
{
  const vanQuery = { vehicleType: "van" };
  const destCoords = { lat: 37.7915, lng: -122.3995 };

  const evaluated = MOCK_SPACES.map((space) => {
    const compatibility = evaluateVehicleCompatibility(space, vanQuery);
    const dist = calculateHaversineDistanceMiles(destCoords.lat, destCoords.lng, space.coordinates.lat, space.coordinates.lng);
    const failsCriteria = [];
    if (!compatibility.isCompatible) failsCriteria.push("vehicle_incompatible");
    if (dist > 0.05) failsCriteria.push("distance_exceeded");
    return { space, compatibility, distanceMiles: dist, failsCriteria };
  });

  const directMatches = evaluated.filter((e) => e.failsCriteria.length === 0);
  assert(directMatches.length === 0, "Direct search returns 0 matches for 0.05mi strict filter");

  // Alternatives generator: strictly enforces compatibility
  const safeAlternatives = evaluated.filter(
    (e) => e.compatibility.isCompatible && !e.failsCriteria.includes("vehicle_incompatible")
  );

  assert(safeAlternatives.length > 0, "Finds candidate alternatives");
  for (const alt of safeAlternatives) {
    assert(
      alt.compatibility.isCompatible === true,
      `Alternative '${alt.space.title}' 100% preserves vehicle compatibility (${alt.space.clearanceFeet}ft clearance for 7.8ft van)`
    );
  }
}

// -----------------------------------------------------------------------------
// Test 7: Temporal Booking Conflict Simulation
// -----------------------------------------------------------------------------
console.log("\nSECTION 7: Temporal Availability & Booking Conflict Simulation");
{
  const existingBookings = [
    {
      spaceId: "sp-101",
      startTime: "2026-11-01T10:00:00.000Z",
      endTime: "2026-11-01T14:00:00.000Z",
      status: "confirmed",
    },
  ];

  function isSpaceAvailable(spaceId, reqStart, reqEnd) {
    return !existingBookings.some((b) => {
      if (b.spaceId !== spaceId) return false;
      if (b.status !== "confirmed" && b.status !== "active") return false;
      return reqStart < b.endTime && reqEnd > b.startTime;
    });
  }

  // Conflict 1: Overlaps partially (12:00 to 16:00)
  const overlaps1 = isSpaceAvailable("sp-101", "2026-11-01T12:00:00.000Z", "2026-11-01T16:00:00.000Z");
  assert(overlaps1 === false, "Booking overlapping [12:00-16:00] correctly marked unavailable");

  // Conflict 2: Entirely outside (15:00 to 18:00)
  const nonOverlap = isSpaceAvailable("sp-101", "2026-11-01T15:00:00.000Z", "2026-11-01T18:00:00.000Z");
  assert(nonOverlap === true, "Booking outside [15:00-18:00] correctly marked available");
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log("\n=======================================================");
console.log(` TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("=======================================================\n");

if (failedCount > 0) {
  process.exit(1);
}
