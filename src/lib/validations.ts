import { z } from "zod";

// ==============================================================================
// 1. Booking Schemas
// ==============================================================================
export const BookingCreateSchema = z.object({
  spaceId: z.string().min(1, "Space ID is required"),
  durationHours: z.coerce.number().int().min(1, "Duration must be at least 1 hour").max(48, "Duration cannot exceed 48 hours").default(2),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  vehicleModel: z.string().trim().min(2, "Vehicle make/model is required (min 2 chars)").max(50),
  vehicleType: z.enum(["compact", "sedan", "suv", "truck", "van", "ev"]),
  licensePlate: z.string().trim().min(2, "License plate is required (min 2 chars)").max(20),
  customHeightFeet: z.coerce.number().positive().optional(),
  customLengthFeet: z.coerce.number().positive().optional(),
  customWidthFeet: z.coerce.number().positive().optional(),
  paymentMethod: z.string().default("test_card_visa"),
  simulateFailure: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
});

export const BookingQuoteSchema = z.object({
  spaceId: z.string().min(1, "Space ID is required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  durationHours: z.coerce.number().int().min(1).max(48).default(2),
});

export const BookingExtensionSchema = z.object({
  additionalHours: z.coerce.number().int().min(1, "Must extend at least 1 hour").max(24, "Extension cannot exceed 24 hours"),
  simulateFailure: z.boolean().default(false),
});

export const BookingStatusUpdateSchema = z.object({
  action: z.enum(["extend", "cancel", "status", "complete", "report_issue"]).default("status"),
  status: z.enum(["pending", "confirmed", "active", "completed", "cancelled", "access_issue"]).optional(),
  additionalHours: z.coerce.number().int().min(1).max(24).optional(),
  reason: z.string().optional(),
  simulateFailure: z.boolean().default(false),
});

// ==============================================================================
// 2. Listing Wizard Step-by-Step Validation Schemas
// ==============================================================================

// Step 1: Location and Map Pin
export const ListingStep1LocationSchema = z.object({
  address: z.string().trim().min(5, "Street address must be at least 5 characters"),
  neighborhood: z.string().trim().min(2, "Neighborhood is required"),
  city: z.string().trim().min(2, "City is required").default("San Francisco"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

// Step 2: Space Type and Access Method
export const ListingStep2TypeSchema = z.object({
  category: z.enum(["all", "covered", "ev_charging", "daily", "monthly", "event", "airport"]).default("covered"),
  accessType: z.enum(["instant_keypad", "app_remote", "qr_scanner", "on_site_attendant", "physical_permit"]).default("instant_keypad"),
  accessInstructions: z.string().trim().min(5, "Provide access instructions for arriving drivers (e.g. keypad code, bay number)"),
});

// Step 3: Dimensions, Height Clearance and Vehicle Restrictions
export const ListingStep3DimensionsSchema = z.object({
  spaceDimensions: z.string().trim().min(3, "Dimensions required (e.g. 18ft x 9ft)").default("18ft x 9ft"),
  clearanceFeet: z.coerce.number().positive("Clearance height must be greater than zero").max(25),
  heightClearanceInches: z.coerce.number().nonnegative().optional(),
  maxVehicleType: z.enum(["compact", "sedan", "suv", "truck", "van", "ev"]).default("suv"),
});

// Step 4: Covered Status, EV Charging, and Accessibility Information
export const ListingStep4FeaturesSchema = z.object({
  isCovered: z.boolean().default(false),
  hasEvCharging: z.boolean().default(false),
  evChargerType: z.string().optional().nullable(),
  isAccessible: z.boolean().default(false),
  securityFeatures: z.array(z.string()).default([]),
  rules: z.array(z.string()).default([]),
});

// Step 5: Photos and Description
export const ListingStep5PhotosDescSchema = z.object({
  photos: z.array(z.string().url("Must be a valid photo URL")).min(1, "At least one high quality photo is required"),
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(120),
  description: z.string().trim().min(15, "Description must be at least 15 characters").max(2000),
  walkingDistance: z.string().trim().min(2, "Walking distance note is required (e.g. 3 min walk to transit)").default("2 min walk to transit"),
});

// Step 6: Hourly/Daily/Monthly Pricing
export const ListingStep6PricingSchema = z.object({
  pricePerHour: z.coerce.number().positive("Hourly price must be positive").min(1).max(250),
  pricePerDay: z.coerce.number().positive("Daily price must be positive").min(5).max(2000),
  pricePerMonth: z.coerce.number().positive("Monthly price must be positive").min(50).max(10000).optional().nullable(),
});

// Step 7: Availability Schedule and Blocked Periods
export const WeeklyDayRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, "Valid HH:MM required"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, "Valid HH:MM required"),
  isBlocked: z.boolean().default(false),
});

export const BlockedPeriodSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  startTime: z.string().default("00:00:00"),
  endTime: z.string().default("23:59:59"),
  reason: z.string().default("Owner reserved / maintenance"),
});

export const ListingStep7AvailabilitySchema = z.object({
  weeklySchedule: z.array(WeeklyDayRuleSchema).default([]),
  blockedPeriods: z.array(BlockedPeriodSchema).default([]),
});

// Step 8: Review & Authorization
export const ListingStep8ReviewSchema = z.object({
  isAuthorized: z.literal(true, {
    message: "You must confirm you are the authorized owner or manager of this space.",
  }),
  publicationStatus: z.enum(["draft", "published", "paused"]).default("published"),
});

// Full Master Wizard Schema (combining all 8 steps)
export const ListingWizardFullSchema = ListingStep1LocationSchema
  .merge(ListingStep2TypeSchema)
  .merge(ListingStep3DimensionsSchema)
  .merge(ListingStep4FeaturesSchema)
  .merge(ListingStep5PhotosDescSchema)
  .merge(ListingStep6PricingSchema)
  .merge(ListingStep7AvailabilitySchema)
  .merge(ListingStep8ReviewSchema)
  .extend({
    availableSlotsCount: z.coerce.number().int().min(1).default(1),
    flexibleExtensionSupported: z.boolean().default(true),
    recoveryGuaranteed: z.boolean().default(true),
  });

// Draft Save Schema (partial fields allowed so user can save at any step)
export const ListingDraftSaveSchema = z.object({
  id: z.string().uuid().optional(),
  draftStep: z.number().int().min(1).max(8).default(1),
  title: z.string().trim().min(1, "Draft title or address is required to save").default("Untitled Draft Space"),
  description: z.string().optional().default(""),
  address: z.string().optional().default(""),
  neighborhood: z.string().optional().default("San Francisco"),
  city: z.string().optional().default("San Francisco"),
  latitude: z.coerce.number().optional().default(37.7749),
  longitude: z.coerce.number().optional().default(-122.4194),
  pricePerHour: z.coerce.number().nonnegative().optional().default(5.0),
  pricePerDay: z.coerce.number().nonnegative().optional().default(30.0),
  pricePerMonth: z.coerce.number().nonnegative().optional().nullable(),
  category: z.enum(["all", "covered", "ev_charging", "daily", "monthly", "event", "airport"]).optional().default("covered"),
  photos: z.array(z.string()).optional().default([]),
  isCovered: z.boolean().optional().default(false),
  hasEvCharging: z.boolean().optional().default(false),
  evChargerType: z.string().optional().nullable(),
  maxVehicleType: z.enum(["compact", "sedan", "suv", "truck", "van", "ev"]).optional().default("suv"),
  clearanceFeet: z.coerce.number().optional().default(7.5),
  heightClearanceInches: z.coerce.number().optional().nullable(),
  spaceDimensions: z.string().optional().default("18ft x 9ft"),
  isAccessible: z.boolean().optional().default(false),
  accessType: z.enum(["instant_keypad", "app_remote", "qr_scanner", "on_site_attendant", "physical_permit"]).optional().default("instant_keypad"),
  accessInstructions: z.string().optional().default(""),
  securityFeatures: z.array(z.string()).optional().default([]),
  rules: z.array(z.string()).optional().default([]),
  weeklySchedule: z.array(WeeklyDayRuleSchema).optional(),
  blockedPeriods: z.array(BlockedPeriodSchema).optional(),
  isAuthorized: z.boolean().optional().default(false),
  flexibleExtensionSupported: z.boolean().optional().default(true),
  recoveryGuaranteed: z.boolean().optional().default(true),
  availableSlotsCount: z.coerce.number().int().min(1).optional().default(1),
  publicationStatus: z.enum(["draft", "published", "paused", "archived"]).optional().default("draft"),
});

// Backward compatible ListingCreateSchema
export const ListingCreateSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(120),
  description: z.string().trim().min(15, "Description must be at least 15 characters").max(2000),
  address: z.string().trim().min(5, "Address must be at least 5 characters"),
  neighborhood: z.string().trim().min(2, "Neighborhood is required"),
  city: z.string().trim().min(2, "City is required").default("San Francisco"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  pricePerHour: z.coerce.number().positive("Hourly price must be greater than zero").max(250),
  pricePerDay: z.coerce.number().positive("Daily price must be greater than zero").max(2000),
  pricePerMonth: z.coerce.number().positive().max(10000).optional().nullable(),
  category: z.enum(["all", "covered", "ev_charging", "daily", "monthly", "event", "airport"]).default("covered"),
  photos: z.array(z.string().url("Must be a valid photo URL")).min(1, "At least one photo is required"),
  isCovered: z.boolean().default(false),
  hasEvCharging: z.boolean().default(false),
  evChargerType: z.string().optional().nullable(),
  maxVehicleType: z.enum(["compact", "sedan", "suv", "truck", "van", "ev"]).default("suv"),
  clearanceFeet: z.coerce.number().positive("Clearance height must be greater than zero").max(25),
  heightClearanceInches: z.coerce.number().optional().nullable(),
  spaceDimensions: z.string().default("18ft x 9ft"),
  isAccessible: z.boolean().default(false),
  isAuthorized: z.boolean().default(true),
  draftStep: z.number().int().min(1).max(8).optional().default(8),
  publicationStatus: z.enum(["draft", "published", "paused", "archived"]).default("published"),
  accessType: z.enum(["instant_keypad", "app_remote", "qr_scanner", "on_site_attendant", "physical_permit"]).default("instant_keypad"),
  accessInstructions: z.string().default(""),
  securityFeatures: z.array(z.string()).default([]),
  rules: z.array(z.string()).default([]),
  weeklySchedule: z.array(WeeklyDayRuleSchema).optional(),
  blockedPeriods: z.array(BlockedPeriodSchema).optional(),
  flexibleExtensionSupported: z.boolean().default(true),
  recoveryGuaranteed: z.boolean().default(true),
  availableSlotsCount: z.coerce.number().int().min(1).default(1),
});

// ==============================================================================
// 3. Availability & Conflict Prevention Schemas
// ==============================================================================
export const AvailabilityBlockPeriodSchema = z.object({
  spaceId: z.string().uuid("Valid Space ID required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, "Valid startTime HH:MM required").default("00:00:00"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, "Valid endTime HH:MM required").default("23:59:59"),
  reason: z.string().trim().min(2, "Reason is required (e.g. driveway maintenance)").default("Owner reserved / blocked"),
});

export const AvailabilityScheduleUpdateSchema = z.object({
  spaceId: z.string().uuid("Valid Space ID required"),
  weeklySchedule: z.array(WeeklyDayRuleSchema).min(1, "At least one day schedule is required"),
});

// ==============================================================================
// 4. Verification & Pricing Quick Updates
// ==============================================================================
export const SpaceVerificationReviewSchema = z.object({
  spaceId: z.string().uuid("Valid Space ID required"),
  status: z.enum(["pending", "verified", "rejected"]),
  notes: z.string().optional(),
});

export const ListingPriceUpdateSchema = z.object({
  pricePerHour: z.coerce.number().positive().max(250).optional(),
  pricePerDay: z.coerce.number().positive().max(2000).optional(),
  pricePerMonth: z.coerce.number().positive().max(10000).optional().nullable(),
  publicationStatus: z.enum(["draft", "published", "paused", "archived"]).optional(),
});

// ==============================================================================
// 5. Recovery, Incident Reporting & Moderation
// ==============================================================================
export const AccessProblemTypeSchema = z.enum([
  "space_occupied",
  "entrance_inaccessible",
  "listing_details_incorrect",
  "other",
]);

export type AccessProblemType = z.infer<typeof AccessProblemTypeSchema>;

export const ReportAccessProblemSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  problemType: AccessProblemTypeSchema,
  notes: z.string().trim().max(1000).optional(),
  userCoordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  isDemo: z.boolean().optional().default(false),
});

export const ConfirmReplacementSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  replacementSpaceId: z.string().min(1, "Replacement space ID is required"),
  isDemo: z.boolean().optional().default(false),
});

export const UpdateReportStatusSchema = z.object({
  status: z.enum(["open", "investigating", "resolved", "dismissed"]),
  resolutionNotes: z.string().trim().max(1000).optional(),
});

export const RecoveryRequestSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  reason: z.string().trim().min(3, "Reason must be at least 3 characters"),
  problemType: AccessProblemTypeSchema.optional().default("space_occupied"),
  notes: z.string().trim().max(1000).optional(),
  userCoordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  isDemo: z.boolean().optional().default(false),
});

export const SavedSpaceSchema = z.object({
  spaceId: z.string().min(1, "Space ID is required"),
});

