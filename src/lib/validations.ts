import { z } from "zod";

export const BookingCreateSchema = z.object({
  spaceId: z.string().min(1, "Space ID is required"),
  durationHours: z.coerce.number().int().min(1, "Duration must be at least 1 hour").max(48, "Duration cannot exceed 48 hours"),
  startTime: z.string().optional(),
  vehicleModel: z.string().trim().min(2, "Vehicle make/model is required (min 2 chars)").max(50),
  vehicleType: z.enum(["compact", "sedan", "suv", "truck", "van", "ev"]),
  licensePlate: z.string().trim().min(2, "License plate is required (min 2 chars)").max(20),
});

export const BookingExtensionSchema = z.object({
  additionalHours: z.coerce.number().int().min(1, "Must extend at least 1 hour").max(24, "Extension cannot exceed 24 hours"),
});

export const BookingStatusUpdateSchema = z.object({
  status: z.enum(["active", "completed", "cancelled"]),
  reason: z.string().optional(),
});

export const ListingCreateSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(120),
  description: z.string().trim().min(15, "Description must be at least 15 characters").max(2000),
  address: z.string().trim().min(5, "Address must be at least 5 characters"),
  neighborhood: z.string().trim().min(2, "Neighborhood is required"),
  city: z.string().trim().min(2, "City is required").default("San Francisco"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  pricePerHour: z.coerce.number().positive("Hourly price must be greater than zero").max(100),
  pricePerDay: z.coerce.number().positive("Daily price must be greater than zero").max(1000),
  category: z.enum(["all", "covered", "ev_charging", "daily", "monthly", "event", "airport"]).default("covered"),
  photos: z.array(z.string().url("Must be a valid photo URL")).min(1, "At least one photo is required"),
  isCovered: z.boolean().default(false),
  hasEvCharging: z.boolean().default(false),
  evChargerType: z.string().optional().nullable(),
  maxVehicleType: z.enum(["compact", "sedan", "suv", "truck", "van", "ev"]).default("suv"),
  clearanceFeet: z.coerce.number().positive("Clearance height must be greater than zero").max(25),
  accessType: z.enum(["instant_keypad", "app_remote", "qr_scanner", "on_site_attendant", "physical_permit"]).default("instant_keypad"),
  accessInstructions: z.string().default(""),
  securityFeatures: z.array(z.string()).default([]),
  rules: z.array(z.string()).default([]),
  flexibleExtensionSupported: z.boolean().default(true),
  recoveryGuaranteed: z.boolean().default(true),
  availableSlotsCount: z.coerce.number().int().min(1).default(1),
});

export const RecoveryRequestSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  reason: z.string().trim().min(3, "Reason must be at least 3 characters"),
  userCoordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
});

export const SavedSpaceSchema = z.object({
  spaceId: z.string().min(1, "Space ID is required"),
});
