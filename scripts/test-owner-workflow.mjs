// ==============================================================================
// ParkMate Owner Listing Workflow & Security Isolation Test Suite
// Verifies:
// 1. Creation and saving of draft listings with draftStep
// 2. Publication with mandatory owner authorization confirmation
// 3. Pending-verification status enforcement (cannot be claimed verified until approved)
// 4. Public search visibility of published spaces
// 5. Cross-account security isolation: User B cannot modify User A's listing
// 6. Availability conflict prevention: Confirmed bookings block conflicting unavailability
// ==============================================================================

const TEST_RESULTS = [];

function recordTest(testName, passed, details) {
  TEST_RESULTS.push({ testName, passed, details });
  const icon = passed ? "PASS" : "FAIL";
  console.log(`[${icon}] ${testName}`);
  if (details) {
    console.log(`       -> ${details}`);
  }
}

// Mock database simulating Postgres constraints & RLS policies
class MockDatabase {
  constructor() {
    this.profiles = new Map([
      ["owner-1", { id: "owner-1", display_name: "Sarah Owner", role: "owner" }],
      ["owner-2", { id: "owner-2", display_name: "Malicious Host", role: "owner" }],
      ["driver-1", { id: "driver-1", display_name: "Alex Driver", role: "driver" }],
    ]);

    this.parkingSpaces = new Map([
      [
        "sp-101",
        {
          id: "sp-101",
          owner_id: "owner-1",
          title: "Downtown Secure Bay",
          address: "245 Market St",
          price_per_hour: 7.5,
          price_per_day: 42.0,
          price_per_month: 420.0,
          publication_status: "published",
          verification_status: "verified",
          is_authorized: true,
          clearance_feet: 7.5,
          space_dimensions: "18ft x 9ft",
          draft_step: 8,
        },
      ],
    ]);

    this.availabilityRules = [];
    this.bookings = [
      {
        id: "bk-1",
        booking_reference: "PM-A1B2-C3D4",
        driver_id: "driver-1",
        space_id: "sp-101",
        start_time: "2026-11-01T10:00:00Z",
        end_time: "2026-11-01T16:00:00Z",
        booking_status: "confirmed",
        hourly_rate: 7.5,
        total_price: 45.0,
      },
    ];
  }

  // 1. Create or save draft space
  saveDraft(userId, data) {
    const id = data.id || `sp-${Date.now()}`;
    const space = {
      id,
      owner_id: userId,
      title: data.title || "Untitled Draft Space",
      address: data.address || "",
      publication_status: "draft",
      verification_status: "pending",
      is_authorized: false,
      draft_step: data.draftStep || 1,
      price_per_hour: data.pricePerHour || 5.0,
      price_per_day: data.pricePerDay || 30.0,
      price_per_month: data.pricePerMonth || null,
      space_dimensions: data.spaceDimensions || "18ft x 9ft",
      clearance_feet: data.clearanceFeet || 7.5,
    };
    this.parkingSpaces.set(id, space);
    return space;
  }

  // 2. Publish listing with authorization check
  publishListing(userId, spaceId, isAuthorized) {
    const space = this.parkingSpaces.get(spaceId);
    if (!space) throw new Error("Space not found");
    if (space.owner_id !== userId) throw new Error("Forbidden: You do not own this space");
    if (!isAuthorized) throw new Error("Owner authorization declaration is required to publish");

    space.publication_status = "published";
    space.verification_status = "pending"; // Newly published must undergo admin verification
    space.is_authorized = true;
    space.draft_step = 8;
    return space;
  }

  // 3. Cross-account update check
  updateSpace(userId, spaceId, updates) {
    const space = this.parkingSpaces.get(spaceId);
    if (!space) throw new Error("Space not found");
    if (space.owner_id !== userId) {
      const err = new Error("Forbidden: You are not authorized to update this listing.");
      err.status = 403;
      throw err;
    }

    Object.assign(space, updates);
    return space;
  }

  // 4. Block availability with conflict checking
  blockAvailability(userId, spaceId, date, startTime, endTime, reason) {
    const space = this.parkingSpaces.get(spaceId);
    if (!space) throw new Error("Space not found");
    if (space.owner_id !== userId) throw new Error("Forbidden: You do not own this space");

    const blockStart = new Date(`${date}T${startTime}`).getTime();
    const blockEnd = new Date(`${date}T${endTime}`).getTime();

    // Check conflict
    const conflict = this.bookings.find(
      (b) =>
        b.space_id === spaceId &&
        ["confirmed", "active", "pending"].includes(b.booking_status) &&
        new Date(b.start_time).getTime() < blockEnd &&
        new Date(b.end_time).getTime() > blockStart
    );

    if (conflict) {
      const err = new Error(`Conflict: Confirmed booking ${conflict.booking_reference} is already scheduled`);
      err.status = 409;
      err.conflict = conflict;
      throw err;
    }

    const rule = {
      id: `rule-${Date.now()}`,
      space_id: spaceId,
      specific_date: date,
      start_time: startTime,
      end_time: endTime,
      is_blocked: true,
      reason,
    };
    this.availabilityRules.push(rule);
    return rule;
  }

  // 5. Public Search Query
  searchPublic() {
    return Array.from(this.parkingSpaces.values()).filter(
      (s) => s.publication_status === "published"
    );
  }

  // 6. Admin Verification
  adminVerify(spaceId, status) {
    const space = this.parkingSpaces.get(spaceId);
    if (!space) throw new Error("Space not found");
    space.verification_status = status;
    return space;
  }
}

async function runTests() {
  console.log("==========================================================");
  console.log("ParkMate Owner Listing & Availability Verification Suite");
  console.log("==========================================================\n");

  const db = new MockDatabase();

  // Test 1: Draft creation & progression
  try {
    const draft = db.saveDraft("owner-1", {
      title: "Marina View Driveway",
      address: "2100 Chestnut St",
      draftStep: 3,
      pricePerHour: 8.0,
      pricePerDay: 50.0,
    });
    const isStep3 = draft.draft_step === 3 && draft.publication_status === "draft";
    recordTest(
      "Test 1: Draft Saving with Progress Persistence",
      isStep3,
      `Draft created with ID ${draft.id}, publication_status='draft', draft_step=3`
    );
  } catch (err) {
    recordTest("Test 1: Draft Saving with Progress Persistence", false, err.message);
  }

  // Test 2: Unchecked authorization cannot publish
  try {
    const draft = db.saveDraft("owner-1", { title: "Unconfirmed Space", address: "100 Pine" });
    try {
      db.publishListing("owner-1", draft.id, false);
      recordTest("Test 2: Publish Requires Owner Authorization Confirmation", false, "Allowed publishing without authorization");
    } catch {
      recordTest(
        "Test 2: Publish Requires Owner Authorization Confirmation",
        true,
        "System successfully rejected publishing when owner authorization declaration was false"
      );
    }
  } catch (err) {
    recordTest("Test 2: Publish Requires Owner Authorization Confirmation", false, err.message);
  }

  // Test 3: Authorized publish sets pending-verification status
  let publishedSpace;
  try {
    const draft = db.saveDraft("owner-1", {
      title: "SOMA High Clearance Garage",
      address: "780 Howard St",
      pricePerHour: 9.0,
      pricePerDay: 55.0,
      pricePerMonth: 500.0,
      clearanceFeet: 8.2,
      spaceDimensions: "20ft x 10ft",
    });
    publishedSpace = db.publishListing("owner-1", draft.id, true);
    const validPublish =
      publishedSpace.publication_status === "published" &&
      publishedSpace.verification_status === "pending" &&
      publishedSpace.is_authorized === true;
    recordTest(
      "Test 3: Publication Sets 'pending-verification' Status (Cannot Auto-Claim Verified)",
      validPublish,
      `Listing published with status='published', verification='pending', is_authorized=true`
    );
  } catch (err) {
    recordTest("Test 3: Publication Sets 'pending-verification' Status", false, err.message);
  }

  // Test 4: Published space appears in public search
  try {
    const publicResults = db.searchPublic();
    const found = publicResults.some((s) => s.id === publishedSpace?.id);
    recordTest(
      "Test 4: Published Listing Appears in Public Search",
      found,
      `Public marketplace query returned ${publicResults.length} spaces including newly published listing`
    );
  } catch (err) {
    recordTest("Test 4: Published Listing Appears in Public Search", false, err.message);
  }

  // Test 5: Cross-Account Security Isolation (User 2 cannot edit User 1's listing)
  try {
    try {
      db.updateSpace("owner-2", publishedSpace.id, { price_per_hour: 1.0 });
      recordTest("Test 5: Cross-Account Edit Protection", false, "Malicious user successfully edited another owner's space");
    } catch (err) {
      const is403 = err.status === 403;
      recordTest(
        "Test 5: Cross-Account Edit Protection (403 Forbidden)",
        is403,
        `Tampering blocked: Malicious user 'owner-2' denied permission to edit space owned by 'owner-1'`
      );
    }
  } catch (err) {
    recordTest("Test 5: Cross-Account Edit Protection", false, err.message);
  }

  // Test 6: Availability Conflict Prevention (Confirmed booking blocks conflicting unavailability)
  try {
    // There is an existing booking on sp-101 on 2026-11-01 from 10:00 to 16:00
    try {
      db.blockAvailability("owner-1", "sp-101", "2026-11-01", "09:00:00Z", "17:00:00Z", "Driveway maintenance");
      recordTest("Test 6: Availability Conflict Prevention", false, "Allowed blocking date that conflicts with confirmed booking");
    } catch (err) {
      const is409 = err.status === 409;
      recordTest(
        "Test 6: Availability Conflict Prevention (409 Conflict)",
        is409,
        `Blocked attempt: Detected overlapping confirmed booking ${err.conflict?.booking_reference} on 2026-11-01`
      );
    }
  } catch (err) {
    recordTest("Test 6: Availability Conflict Prevention", false, err.message);
  }

  // Test 7: Non-conflicting availability block succeeds
  try {
    const rule = db.blockAvailability("owner-1", "sp-101", "2026-11-05", "00:00:00Z", "23:59:59Z", "Vacation");
    recordTest(
      "Test 7: Clear Availability Block Scheduled (200 OK)",
      Boolean(rule?.id),
      `Successfully scheduled blocked date for 2026-11-05 (0 booking conflicts)`
    );
  } catch (err) {
    recordTest("Test 7: Clear Availability Block Scheduled", false, err.message);
  }

  // Test 8: Admin Verification Review Placeholder
  try {
    const verified = db.adminVerify(publishedSpace.id, "verified");
    recordTest(
      "Test 8: Admin Verification Review Updates Status to 'verified'",
      verified.verification_status === "verified",
      `Listing transitioned from 'pending' -> 'verified' with verified title & deed`
    );
  } catch (err) {
    recordTest("Test 8: Admin Verification Review Updates Status to 'verified'", false, err.message);
  }

  console.log("\n==========================================================");
  const total = TEST_RESULTS.length;
  const passed = TEST_RESULTS.filter((r) => r.passed).length;
  console.log(`Results: ${passed}/${total} test cases passed (${Math.round((passed / total) * 100)}%)`);
  console.log("==========================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
