"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MapPin,
  KeyRound,
  Ruler,
  Zap,
  Camera,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Save,
  Upload,
  Trash2,
  ShieldCheck,
  Sparkles,
  Car,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ParkingImage } from "@/components/ui/parking-image";
import {
  ListingStep1LocationSchema,
  ListingStep2TypeSchema,
  ListingStep3DimensionsSchema,
  ListingStep4FeaturesSchema,
  ListingStep5PhotosDescSchema,
  ListingStep6PricingSchema,
  ListingStep7AvailabilitySchema,
  ListingStep8ReviewSchema,
} from "@/lib/validations";
import { SpaceCategory, VehicleType, AccessType } from "@/types/parking";

const PUNE_PRESETS = [
  { name: "Hinjawadi Phase 1", address: "Embassy TechZone Rd", neighborhood: "Hinjawadi", lat: 18.5913, lng: 73.7389 },
  { name: "Koregaon Park", address: "Lane 5, North Main Rd", neighborhood: "Koregaon Park", lat: 18.5362, lng: 73.8940 },
  { name: "FC Road / Deccan", address: "Fergusson College Rd", neighborhood: "FC Road", lat: 18.5186, lng: 73.8415 },
  { name: "Baner High Street", address: "Balewadi Link Rd", neighborhood: "Baner", lat: 18.5590, lng: 73.7868 },
  { name: "Viman Nagar", address: "Symbiosis Rd", neighborhood: "Viman Nagar", lat: 18.5679, lng: 73.9143 },
  { name: "Magarpatta City", address: "Cybercity Ring Rd", neighborhood: "Magarpatta", lat: 18.5158, lng: 73.9272 },
  { name: "Kothrud", address: "Karve Road", neighborhood: "Kothrud", lat: 18.5074, lng: 73.8077 },
  { name: "Aundh", address: "Parihar Chowk", neighborhood: "Aundh", lat: 18.5602, lng: 73.8031 },
  { name: "Wakad", address: "Datta Mandir Rd", neighborhood: "Wakad", lat: 18.5987, lng: 73.7686 },
];

const VEHICLE_CLEARANCE_PRESETS: Record<VehicleType, { label: string; minClearance: number }> = {
  compact: { label: "Compact / Mini", minClearance: 5.5 },
  sedan: { label: "Standard Sedan", minClearance: 6.0 },
  suv: { label: "Full-Size SUV / Crossover", minClearance: 6.8 },
  truck: { label: "Pickup Truck", minClearance: 7.2 },
  van: { label: "Commercial Van / Sprinter", minClearance: 8.5 },
  ev: { label: "Electric Vehicle (All)", minClearance: 6.2 },
};

const COMMON_SECURITY_FEATURES = [
  "24/7 CCTV Surveillance",
  "Motorized Security Gate",
  "High-Intensity LED Lighting",
  "On-Site Attendant Patrols",
  "Ring Security Camera",
  "Keycard / RFID Gated Entry",
  "Underground Fire Suppression",
];

function WizardContent() {
  const searchParams = useSearchParams();
  const draftIdParam = searchParams.get("draftId");

  const [currentStep, setCurrentStep] = React.useState(1);
  const [draftId, setDraftId] = React.useState<string | null>(draftIdParam);
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
  const [stepErrors, setStepErrors] = React.useState<Record<string, string>>({});
  const [globalMessage, setGlobalMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [publishSuccessSpace, setPublishSuccessSpace] = React.useState<{ id: string; title: string } | null>(null);

  // Form State: Step 1 Location
  const [address, setAddress] = React.useState("");
  const [neighborhood, setNeighborhood] = React.useState("Hinjawadi");
  const [city, setCity] = React.useState("Pune");
  const [latitude, setLatitude] = React.useState(18.5913);
  const [longitude, setLongitude] = React.useState(73.7389);

  // Step 2 Type & Access
  const [category, setCategory] = React.useState<SpaceCategory>("covered");
  const [accessType, setAccessType] = React.useState<AccessType>("instant_keypad");
  const [accessInstructions, setAccessInstructions] = React.useState("Gate code 4921#. Proceed to Bay A12.");

  // Step 3 Dimensions & Restrictions
  const [spaceDimensions, setSpaceDimensions] = React.useState("18ft x 9ft");
  const [clearanceFeet, setClearanceFeet] = React.useState("7.5");
  const [heightClearanceInches, setHeightClearanceInches] = React.useState("90");
  const [maxVehicleType, setMaxVehicleType] = React.useState<VehicleType>("suv");

  // Step 4 Features
  const [isCovered, setIsCovered] = React.useState(true);
  const [hasEvCharging, setHasEvCharging] = React.useState(false);
  const [evChargerType, setEvChargerType] = React.useState("Tesla Wall Connector (Level 2)");
  const [isAccessible, setIsAccessible] = React.useState(false);
  const [securityFeatures, setSecurityFeatures] = React.useState<string[]>([
    "24/7 CCTV Surveillance",
    "High-Intensity LED Lighting",
  ]);
  const [rules, setRules] = React.useState<string[]>([
    "Head-in parking only",
    "Display active ParkMate pass on dashboard",
  ]);

  // Step 5 Photos & Description
  const [photos, setPhotos] = React.useState<string[]>([
    "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80",
  ]);
  const [photoUrlInput, setPhotoUrlInput] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [walkingDistance, setWalkingDistance] = React.useState("2 min walk to transit");

  // Step 6 Pricing
  const [pricePerHour, setPricePerHour] = React.useState("40.00");
  const [pricePerDay, setPricePerDay] = React.useState("250.00");
  const [pricePerMonth, setPricePerMonth] = React.useState("2500.00");

  // Step 7 Availability
  const [activeDays, setActiveDays] = React.useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [dailyStartTime, setDailyStartTime] = React.useState("08:00");
  const [dailyEndTime, setDailyEndTime] = React.useState("20:00");
  const [is247, setIs247] = React.useState(false);
  const [blockedPeriods, setBlockedPeriods] = React.useState<
    Array<{ date: string; startTime: string; endTime: string; reason: string }>
  >([]);
  const [newBlockDate, setNewBlockDate] = React.useState("");
  const [newBlockReason, setNewBlockReason] = React.useState("Personal host use");

  // Step 8 Authorization
  const [isAuthorized, setIsAuthorized] = React.useState(false);

  // Load existing draft if draftId is supplied
  React.useEffect(() => {
    if (!draftIdParam) return;
    let active = true;

    async function fetchDraft() {
      try {
        const res = await fetch(`/api/listings/${draftIdParam}`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.space) {
            const s = data.space;
            setDraftId(s.id);
            setTitle(s.title || "");
            setDescription(s.description || "");
            setAddress(s.address || "");
            setNeighborhood(s.neighborhood || "Hinjawadi");
            setCity(s.city || "Pune");
            if (s.coordinates) {
              setLatitude(s.coordinates.lat);
              setLongitude(s.coordinates.lng);
            }
            setPricePerHour(s.pricePerHour ? s.pricePerHour.toFixed(2) : "6.50");
            setPricePerDay(s.pricePerDay ? s.pricePerDay.toFixed(2) : "42.00");
            setPricePerMonth(s.pricePerMonth ? s.pricePerMonth.toFixed(2) : "380.00");
            setCategory(s.category || "covered");
            if (s.images && s.images.length > 0) setPhotos(s.images);
            setIsCovered(Boolean(s.isCovered));
            setHasEvCharging(Boolean(s.hasEvCharging));
            if (s.evChargerType) setEvChargerType(s.evChargerType);
            setIsAccessible(Boolean(s.isAccessible));
            setMaxVehicleType(s.maxVehicleType || "suv");
            setClearanceFeet(s.clearanceFeet ? s.clearanceFeet.toString() : "7.5");
            if (s.spaceDimensions) setSpaceDimensions(s.spaceDimensions);
            setAccessType(s.accessType || "instant_keypad");
            setAccessInstructions(s.accessInstructions || "");
            if (s.securityFeatures) setSecurityFeatures(s.securityFeatures);
            if (s.rules) setRules(s.rules);
            setWalkingDistance(s.walkingDistance || "2 min walk to transit");
            if (s.draftStep) setCurrentStep(Math.min(8, Math.max(1, s.draftStep)));
          }
        }
      } catch {
        // Fallback
      }
    }

    fetchDraft();
    return () => {
      active = false;
    };
  }, [draftIdParam]);

  // Quick Pune preset handler
  const handleApplyPreset = (preset: typeof PUNE_PRESETS[0]) => {
    setAddress(preset.address);
    setNeighborhood(preset.neighborhood);
    setLatitude(preset.lat);
    setLongitude(preset.lng);
    setStepErrors((prev) => ({ ...prev, address: "" }));
  };

  // Image Upload handler via real API
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setGlobalMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setGlobalMessage({ type: "error", text: data.error || "Failed to upload photo" });
        return;
      }

      if (data.url) {
        setPhotos((prev) => [data.url, ...prev]);
        setGlobalMessage({ type: "success", text: "Photo uploaded successfully to Supabase Storage!" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload error";
      setGlobalMessage({ type: "error", text: msg });
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleAddPhotoUrl = () => {
    if (!photoUrlInput.trim()) return;
    try {
      new URL(photoUrlInput);
      setPhotos((prev) => [...prev, photoUrlInput.trim()]);
      setPhotoUrlInput("");
      setStepErrors((prev) => ({ ...prev, photos: "" }));
    } catch {
      setStepErrors((prev) => ({ ...prev, photos: "Please enter a valid HTTP/HTTPS image URL." }));
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Step Validation logic
  const validateStep = (stepNumber: number): boolean => {
    setStepErrors({});
    let result;

    switch (stepNumber) {
      case 1:
        result = ListingStep1LocationSchema.safeParse({
          address,
          neighborhood,
          city,
          latitude,
          longitude,
        });
        break;
      case 2:
        result = ListingStep2TypeSchema.safeParse({
          category,
          accessType,
          accessInstructions,
        });
        break;
      case 3:
        result = ListingStep3DimensionsSchema.safeParse({
          spaceDimensions,
          clearanceFeet: parseFloat(clearanceFeet) || 0,
          heightClearanceInches: parseFloat(heightClearanceInches) || undefined,
          maxVehicleType,
        });
        break;
      case 4:
        result = ListingStep4FeaturesSchema.safeParse({
          isCovered,
          hasEvCharging,
          evChargerType: hasEvCharging ? evChargerType : null,
          isAccessible,
          securityFeatures,
          rules,
        });
        break;
      case 5:
        result = ListingStep5PhotosDescSchema.safeParse({
          photos,
          title,
          description,
          walkingDistance,
        });
        break;
      case 6:
        result = ListingStep6PricingSchema.safeParse({
          pricePerHour: parseFloat(pricePerHour) || 0,
          pricePerDay: parseFloat(pricePerDay) || 0,
          pricePerMonth: pricePerMonth ? parseFloat(pricePerMonth) : null,
        });
        break;
      case 7:
        const schedule = Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          startTime: is247 ? "00:00" : dailyStartTime,
          endTime: is247 ? "23:59" : dailyEndTime,
          isBlocked: !activeDays.includes(i),
        }));
        result = ListingStep7AvailabilitySchema.safeParse({
          weeklySchedule: schedule,
          blockedPeriods,
        });
        break;
      case 8:
        result = ListingStep8ReviewSchema.safeParse({
          isAuthorized,
          publicationStatus: "published",
        });
        break;
      default:
        return true;
    }

    if (!result.success) {
      const issues: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        const fieldName = err.path.join(".") || "error";
        issues[fieldName] = err.message;
      });
      setStepErrors(issues);
      return false;
    }

    return true;
  };

  // Next / Previous step handler
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 8) {
        setCurrentStep((prev) => prev + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Add Blocked Period to Step 7
  const handleAddBlockedPeriod = () => {
    if (!newBlockDate) {
      setStepErrors((prev) => ({ ...prev, blockedPeriod: "Please select a date to block." }));
      return;
    }
    setBlockedPeriods((prev) => [
      ...prev,
      {
        date: newBlockDate,
        startTime: "00:00:00",
        endTime: "23:59:59",
        reason: newBlockReason || "Owner reserved",
      },
    ]);
    setNewBlockDate("");
    setNewBlockReason("Personal host use");
    setStepErrors((prev) => ({ ...prev, blockedPeriod: "" }));
  };

  const handleRemoveBlockedPeriod = (idx: number) => {
    setBlockedPeriods((prev) => prev.filter((_, i) => i !== idx));
  };

  // Compile full payload
  const compilePayload = (asDraft: boolean) => {
    const schedule = Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      startTime: is247 ? "00:00" : dailyStartTime,
      endTime: is247 ? "23:59" : dailyEndTime,
      isBlocked: !activeDays.includes(i),
    }));

    return {
      id: draftId || undefined,
      draftStep: currentStep,
      publicationStatus: asDraft ? "draft" : "published",
      isDraft: asDraft,
      isAuthorized: asDraft ? false : isAuthorized,
      title: title || (address ? `Private Space at ${address}` : "Untitled Parking Space"),
      description: description || "Convenient, secure parking spot managed by host.",
      address: address || "Pending Address",
      neighborhood: neighborhood || "Hinjawadi",
      city: city || "Pune",
      latitude: Number(latitude) || 18.5913,
      longitude: Number(longitude) || 73.7389,
      pricePerHour: parseFloat(pricePerHour) || 40.00,
      pricePerDay: parseFloat(pricePerDay) || (parseFloat(pricePerHour) || 40.00) * 6,
      pricePerMonth: pricePerMonth ? parseFloat(pricePerMonth) : null,
      category,
      photos: photos.length > 0 ? photos : ["https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80"],
      isCovered,
      hasEvCharging,
      evChargerType: hasEvCharging ? evChargerType : null,
      isAccessible,
      maxVehicleType,
      clearanceFeet: parseFloat(clearanceFeet) || 7.5,
      heightClearanceInches: parseFloat(heightClearanceInches) || null,
      spaceDimensions,
      accessType,
      accessInstructions,
      securityFeatures,
      rules,
      walkingDistance,
      weeklySchedule: schedule,
      blockedPeriods,
      availableSlotsCount: 1,
      flexibleExtensionSupported: true,
      recoveryGuaranteed: true,
    };
  };

  // Save Draft to Supabase
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setGlobalMessage(null);

    try {
      const payload = compilePayload(true);
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setGlobalMessage({ type: "error", text: data.error || "Failed to save draft." });
        return;
      }

      if (data.space?.id) {
        setDraftId(data.space.id);
      }
      setGlobalMessage({
        type: "success",
        text: "Draft saved to Supabase! You can safely leave and resume at any time from your Owner Hub.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving draft";
      setGlobalMessage({ type: "error", text: msg });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Publish Listing to Supabase
  const handlePublishListing = async () => {
    if (!validateStep(8)) return;

    setIsPublishing(true);
    setGlobalMessage(null);

    try {
      const payload = compilePayload(false);
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setGlobalMessage({ type: "error", text: data.error || "Failed to publish listing." });
        return;
      }

      setPublishSuccessSpace({
        id: data.space?.id || "new-space",
        title: data.space?.title || title,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error publishing listing";
      setGlobalMessage({ type: "error", text: msg });
    } finally {
      setIsPublishing(false);
    }
  };

  // Success Confirmation View
  if (publishSuccessSpace) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] py-16 px-4 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-neutral-200 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222]">
              Listing Published Successfully!
            </h1>
            <p className="text-sm text-neutral-600">
              Your parking spot <span className="font-semibold text-neutral-900">&ldquo;{publishSuccessSpace.title}&rdquo;</span> is now active in Supabase and searchable by drivers.
            </p>
          </div>

          {/* Pending verification info banner */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <p className="font-bold">Pending Host Verification Status</p>
              <p>
                In accordance with ParkMate security standards, your listing is live with a <span className="font-semibold">&ldquo;Pending Host Verification&rdquo;</span> badge while our automated deed and permit checks verify your property rights.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link href={`/listings/${publishSuccessSpace.id}`} className="flex-1">
              <Button variant="outline" className="w-full rounded-full py-5 text-sm font-semibold">
                View Public Listing Page
              </Button>
            </Link>
            <Link href="/owner" className="flex-1">
              <Button className="w-full rounded-full py-5 text-sm font-semibold shadow-xs">
                Go to Host Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Wizard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              Listing Wizard &bull; Step {currentStep} of 8
            </div>
            <h1 className="text-2xl font-black text-[#222222] tracking-tight">
              {currentStep === 1 && "1. Location & Map Pin"}
              {currentStep === 2 && "2. Space Type & Access Method"}
              {currentStep === 3 && "3. Dimensions & Vehicle Fit"}
              {currentStep === 4 && "4. Covered, EV & Accessibility"}
              {currentStep === 5 && "5. Photos & Spot Description"}
              {currentStep === 6 && "6. Hourly, Daily & Monthly Pricing"}
              {currentStep === 7 && "7. Availability & Access Schedule"}
              {currentStep === 8 && "8. Review & Confirm Authorization"}
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Provide accurate parking details to ensure 100% smooth arrivals for drivers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="rounded-full text-xs font-semibold"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {isSavingDraft ? "Saving..." : "Save Draft"}
            </Button>
            <Link href="/owner">
              <Button variant="ghost" size="sm" className="rounded-full text-xs text-neutral-500">
                Exit
              </Button>
            </Link>
          </div>
        </div>

        {/* Global Notifications */}
        {globalMessage && (
          <div
            className={`p-4 rounded-2xl border text-sm flex items-center justify-between gap-3 ${
              globalMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {globalMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{globalMessage.text}</span>
            </div>
            <button
              onClick={() => setGlobalMessage(null)}
              className="text-xs font-bold uppercase tracking-wider hover:opacity-75"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Step Progress Indicators */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <button
                key={s}
                onClick={() => {
                  if (s < currentStep || validateStep(currentStep)) {
                    setCurrentStep(s);
                  }
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all text-center ${
                  currentStep === s
                    ? "bg-neutral-900 text-white font-bold shadow-xs scale-105"
                    : s < currentStep
                    ? "bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100"
                    : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100"
                }`}
              >
                <span className="text-xs">Step</span>
                <span className="text-sm font-black">{s}</span>
              </button>
            ))}
          </div>
        </div>

        {/* STEP 1: Location & Map Pin */}
        {currentStep === 1 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#222222] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-neutral-900" />
                Where is your parking space located?
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Drivers will navigate directly to this address. Use precise street and bay coordinates.
              </p>
            </div>

            {/* Quick Pune Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                Quick Select Pune Locations
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PUNE_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="p-2.5 text-left rounded-xl border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 text-xs transition"
                  >
                    <div className="font-bold text-neutral-900">{p.name}</div>
                    <div className="text-neutral-500 truncate">{p.address}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-neutral-700">Street Address *</label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 245 Market St, Bay A12"
                  className={stepErrors.address ? "border-rose-500" : ""}
                />
                {stepErrors.address && <p className="text-xs text-rose-500">{stepErrors.address}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700">Neighborhood *</label>
                <Input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="e.g. Financial District"
                  className={stepErrors.neighborhood ? "border-rose-500" : ""}
                />
                {stepErrors.neighborhood && <p className="text-xs text-rose-500">{stepErrors.neighborhood}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700">City *</label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Pune"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700">Latitude Coordinate</label>
                <Input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700">Longitude Coordinate</label>
                <Input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Interactive Pin Confirmation Card */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  📍
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900">GPS Pin Pointed</p>
                  <p className="text-xs text-neutral-500">{latitude.toFixed(4)}, {longitude.toFixed(4)} &bull; {neighborhood}, {city}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-semibold text-emerald-700 border-emerald-300 bg-emerald-50">
                Verified Coordinates
              </Badge>
            </div>
          </div>
        )}

        {/* STEP 2: Space Type & Access */}
        {currentStep === 2 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#222222] flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-neutral-900" />
                Select Space Type and Access Method
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Help drivers understand how they will enter and access your parking area.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Space Classification *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: "covered", title: "Covered Garage", desc: "Sheltered underground or multistorey" },
                  { id: "ev_charging", title: "EV Charging Hub", desc: "Dedicated charger included" },
                  { id: "daily", title: "Daily Driveway", desc: "Paved residential driveway" },
                  { id: "monthly", title: "Monthly Bay", desc: "Long term commuter space" },
                  { id: "event", title: "Event Proximity", desc: "Close to stadiums or venues" },
                  { id: "airport", title: "Airport Shuttle", desc: "Long term airport parking" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCategory(t.id as SpaceCategory)}
                    className={`p-3.5 text-left rounded-2xl border transition-all ${
                      category === t.id
                        ? "border-neutral-900 bg-neutral-900 text-white shadow-xs"
                        : "border-neutral-200 hover:border-neutral-400 bg-white"
                    }`}
                  >
                    <div className="font-bold text-sm">{t.title}</div>
                    <div className={`text-xs mt-1 ${category === t.id ? "text-neutral-300" : "text-neutral-500"}`}>
                      {t.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Driver Access Method *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: "instant_keypad", title: "Digital Keypad Code", desc: "Driver enters numeric PIN on gate" },
                  { id: "qr_scanner", title: "ParkMate QR Scanner", desc: "Driver scans ticket at barcode pillar" },
                  { id: "app_remote", title: "App Remote Gate Trigger", desc: "Driver unlocks gate via ParkMate app" },
                  { id: "on_site_attendant", title: "On-Site Valet / Attendant", desc: "Staff verifies driver's booking pass" },
                ].map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAccessType(a.id as AccessType)}
                    className={`p-3.5 text-left rounded-2xl border transition-all ${
                      accessType === a.id
                        ? "border-neutral-900 bg-neutral-900 text-white shadow-xs"
                        : "border-neutral-200 hover:border-neutral-400 bg-white"
                    }`}
                  >
                    <div className="font-bold text-sm">{a.title}</div>
                    <div className={`text-xs mt-1 ${accessType === a.id ? "text-neutral-300" : "text-neutral-500"}`}>
                      {a.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700">
                Detailed Access Instructions for Drivers *
              </label>
              <textarea
                value={accessInstructions}
                onChange={(e) => setAccessInstructions(e.target.value)}
                rows={3}
                placeholder="e.g. Approach gate on Pine Ave. Enter code 4921#. Proceed to Bay A12 on P1 level."
                className={`w-full rounded-2xl border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                  stepErrors.accessInstructions ? "border-rose-500" : "border-neutral-200"
                }`}
              />
              {stepErrors.accessInstructions && (
                <p className="text-xs text-rose-500">{stepErrors.accessInstructions}</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Dimensions & Restrictions */}
        {currentStep === 3 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#222222] flex items-center gap-2">
                <Ruler className="w-5 h-5 text-neutral-900" />
                Dimensions, Height Clearance &amp; Vehicle Restrictions
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Prevent vehicle damage by verifying physical fit before drivers confirm.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700">Space Dimensions</label>
                <Input
                  value={spaceDimensions}
                  onChange={(e) => setSpaceDimensions(e.target.value)}
                  placeholder="e.g. 18ft x 9ft"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700">Height Clearance (Feet) *</label>
                <Input
                  type="number"
                  step="0.1"
                  value={clearanceFeet}
                  onChange={(e) => setClearanceFeet(e.target.value)}
                  className={stepErrors.clearanceFeet ? "border-rose-500" : ""}
                />
                {stepErrors.clearanceFeet && (
                  <p className="text-xs text-rose-500">{stepErrors.clearanceFeet}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700">Clearance (Inches)</label>
                <Input
                  type="number"
                  value={heightClearanceInches}
                  onChange={(e) => setHeightClearanceInches(e.target.value)}
                  placeholder="90"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Maximum Vehicle Size Permitted *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(Object.keys(VEHICLE_CLEARANCE_PRESETS) as VehicleType[]).map((v) => {
                  const preset = VEHICLE_CLEARANCE_PRESETS[v];
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setMaxVehicleType(v)}
                      className={`p-3.5 text-left rounded-2xl border transition-all ${
                        maxVehicleType === v
                          ? "border-neutral-900 bg-neutral-900 text-white shadow-xs"
                          : "border-neutral-200 hover:border-neutral-400 bg-white"
                      }`}
                    >
                      <div className="font-bold text-sm flex items-center gap-1.5">
                        <Car className="w-4 h-4" />
                        {preset.label}
                      </div>
                      <div className={`text-xs mt-1 ${maxVehicleType === v ? "text-neutral-300" : "text-neutral-500"}`}>
                        Requires &ge; {preset.minClearance} ft clearance
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Covered, EV & Accessibility */}
        {currentStep === 4 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#222222] flex items-center gap-2">
                <Zap className="w-5 h-5 text-neutral-900" />
                Covered Status, EV Charging &amp; Accessibility
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Highlight premium amenities to attract corporate and EV drivers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border border-neutral-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-neutral-900">Covered Spot</div>
                  <div className="text-xs text-neutral-500">Protected from weather</div>
                </div>
                <input
                  type="checkbox"
                  checked={isCovered}
                  onChange={(e) => setIsCovered(e.target.checked)}
                  className="w-5 h-5 accent-neutral-900 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl border border-neutral-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-neutral-900">EV Charger</div>
                  <div className="text-xs text-neutral-500">Wall connector available</div>
                </div>
                <input
                  type="checkbox"
                  checked={hasEvCharging}
                  onChange={(e) => setHasEvCharging(e.target.checked)}
                  className="w-5 h-5 accent-neutral-900 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl border border-neutral-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-neutral-900">Accessible (ADA)</div>
                  <div className="text-xs text-neutral-500">Step-free ramp access</div>
                </div>
                <input
                  type="checkbox"
                  checked={isAccessible}
                  onChange={(e) => setIsAccessible(e.target.checked)}
                  className="w-5 h-5 accent-neutral-900 cursor-pointer"
                />
              </div>
            </div>

            {hasEvCharging && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700">EV Charger Specification</label>
                <Input
                  value={evChargerType}
                  onChange={(e) => setEvChargerType(e.target.value)}
                  placeholder="e.g. Tesla Wall Connector (48A / Level 2)"
                />
              </div>
            )}

            {/* Security Features Checkbox List */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Security Features
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COMMON_SECURITY_FEATURES.map((feat) => {
                  const isChecked = securityFeatures.includes(feat);
                  return (
                    <button
                      key={feat}
                      type="button"
                      onClick={() => {
                        setSecurityFeatures((prev) =>
                          isChecked ? prev.filter((f) => f !== feat) : [...prev, feat]
                        );
                      }}
                      className={`p-3 text-left rounded-xl border text-xs flex items-center justify-between transition ${
                        isChecked
                          ? "border-neutral-900 bg-neutral-50 text-neutral-900 font-semibold"
                          : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                      }`}
                    >
                      <span>{feat}</span>
                      {isChecked && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Photos & Description */}
        {currentStep === 5 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#222222] flex items-center gap-2">
                <Camera className="w-5 h-5 text-neutral-900" />
                Photos and Space Description
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Upload clear photos of the driveway bay, entry gate, and surroundings.
              </p>
            </div>

            {/* File Upload to Supabase Storage */}
            <div className="p-6 rounded-3xl border-2 border-dashed border-neutral-300 hover:border-neutral-900 text-center space-y-3 transition">
              <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900">
                  Upload photos to Supabase Storage (JPEG, PNG, WEBP &le; 5MB)
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Drag and drop files or choose from your computer.
                </p>
              </div>
              <label className="inline-block">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  disabled={isUploadingPhoto}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingPhoto}
                  className="rounded-full cursor-pointer pointer-events-none"
                >
                  {isUploadingPhoto ? "Uploading..." : "Browse Photo Files"}
                </Button>
              </label>
            </div>

            {/* URL Input Fallback */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700">Or Add Direct Photo URL</label>
              <div className="flex gap-2">
                <Input
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1"
                />
                <Button type="button" onClick={handleAddPhotoUrl} size="sm" className="rounded-full">
                  Add URL
                </Button>
              </div>
              {stepErrors.photos && <p className="text-xs text-rose-500">{stepErrors.photos}</p>}
            </div>

            {/* Photos Gallery */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((p, idx) => (
                <div key={idx} className="relative aspect-video rounded-2xl overflow-hidden border border-neutral-200 group">
                  <ParkingImage src={p} alt={`Spot photo ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-between p-2">
                    {idx === 0 && (
                      <span className="px-2 py-1 rounded bg-black/70 text-white text-[10px] font-bold">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700">Listing Title *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Downtown Secure Garage Bay A12"
                  className={stepErrors.title ? "border-rose-500" : ""}
                />
                {stepErrors.title && <p className="text-xs text-rose-500">{stepErrors.title}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe your parking space, convenience, proximity to offices/transit, ease of access..."
                  className={`w-full rounded-2xl border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                    stepErrors.description ? "border-rose-500" : "border-neutral-200"
                  }`}
                />
                {stepErrors.description && (
                  <p className="text-xs text-rose-500">{stepErrors.description}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700">Walking Distance Note</label>
                <Input
                  value={walkingDistance}
                  onChange={(e) => setWalkingDistance(e.target.value)}
                  placeholder="e.g. 2 min walk to Montgomery BART"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Pricing */}
        {currentStep === 6 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#222222] flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-neutral-900" />
                Hourly, Daily and Monthly Pricing
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Set competitive rates. Our smart algorithm handles surge demand multipliers automatically.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl border border-neutral-200 space-y-2">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Hourly Rate ($/hr) *
                </span>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-neutral-400 font-bold">$</span>
                  <Input
                    type="number"
                    step="0.25"
                    value={pricePerHour}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPricePerHour(val);
                      const num = parseFloat(val);
                      if (num > 0) {
                        setPricePerDay((num * 6.5).toFixed(2));
                        setPricePerMonth((num * 55).toFixed(2));
                      }
                    }}
                    className={`pl-8 text-lg font-bold ${stepErrors.pricePerHour ? "border-rose-500" : ""}`}
                  />
                </div>
                {stepErrors.pricePerHour && (
                  <p className="text-xs text-rose-500">{stepErrors.pricePerHour}</p>
                )}
              </div>

              <div className="p-5 rounded-2xl border border-neutral-200 space-y-2">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Daily Cap ($/day) *
                </span>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-neutral-400 font-bold">$</span>
                  <Input
                    type="number"
                    step="1.00"
                    value={pricePerDay}
                    onChange={(e) => setPricePerDay(e.target.value)}
                    className="pl-8 text-lg font-bold"
                  />
                </div>
                <p className="text-[11px] text-neutral-400">Auto-suggested 6.5x hourly cap</p>
              </div>

              <div className="p-5 rounded-2xl border border-neutral-200 space-y-2">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Monthly Commuter Pass ($/mo)
                </span>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-neutral-400 font-bold">$</span>
                  <Input
                    type="number"
                    step="5.00"
                    value={pricePerMonth}
                    onChange={(e) => setPricePerMonth(e.target.value)}
                    className="pl-8 text-lg font-bold"
                  />
                </div>
                <p className="text-[11px] text-neutral-400">Guaranteed recurring monthly earnings</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-purple-700" />
                <div>
                  <div className="text-sm font-bold text-purple-900">Dynamic Surge Pricing Enabled</div>
                  <div className="text-xs text-purple-700">
                    Automatically boosts hourly prices up to 1.4x during high-demand events (ballgames, concerts, peak commute).
                  </div>
                </div>
              </div>
              <Badge className="bg-purple-700 text-white font-bold">1.4x Active</Badge>
            </div>
          </div>
        )}

        {/* STEP 7: Availability Schedule & Exceptions */}
        {currentStep === 7 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#222222] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-neutral-900" />
                Availability Schedule, Blocked Periods &amp; Access Hours
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Configure your weekly operating hours and define blocked dates with automated conflict prevention.
              </p>
            </div>

            {/* Weekly Days Toggle */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Active Weekly Days *
              </label>
              <div className="flex flex-wrap gap-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, idx) => {
                  const isSelected = activeDays.includes(idx);
                  return (
                    <button
                      key={dayName}
                      type="button"
                      onClick={() => {
                        setActiveDays((prev) =>
                          isSelected ? prev.filter((d) => d !== idx) : [...prev, idx]
                        );
                      }}
                      className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-neutral-900 text-white shadow-xs"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {dayName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Operating Hours */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Access Hours
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is247"
                    checked={is247}
                    onChange={(e) => setIs247(e.target.checked)}
                    className="w-4 h-4 accent-neutral-900"
                  />
                  <label htmlFor="is247" className="text-xs font-bold text-neutral-900 cursor-pointer">
                    24/7 Access
                  </label>
                </div>
              </div>

              {!is247 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-500">Opens At</label>
                    <Input
                      type="time"
                      value={dailyStartTime}
                      onChange={(e) => setDailyStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-500">Closes At</label>
                    <Input
                      type="time"
                      value={dailyEndTime}
                      onChange={(e) => setDailyEndTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Owner Blocked Dates / Vacation Exceptions */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Owner-Defined Blocked Periods &amp; Exceptions
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Reserve dates for maintenance or personal driveway use.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="date"
                  value={newBlockDate}
                  onChange={(e) => setNewBlockDate(e.target.value)}
                  className="sm:w-48 text-xs"
                />
                <Input
                  value={newBlockReason}
                  onChange={(e) => setNewBlockReason(e.target.value)}
                  placeholder="Reason (e.g. Driveway sealing)"
                  className="flex-1 text-xs"
                />
                <Button type="button" onClick={handleAddBlockedPeriod} size="sm" className="rounded-full">
                  Add Blocked Date
                </Button>
              </div>
              {stepErrors.blockedPeriod && (
                <p className="text-xs text-rose-500">{stepErrors.blockedPeriod}</p>
              )}

              {blockedPeriods.length > 0 && (
                <div className="space-y-2 pt-2">
                  {blockedPeriods.map((bp, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900">{bp.date}</span>
                        <span className="text-neutral-500">&bull; {bp.reason}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBlockedPeriod(idx)}
                        className="text-rose-600 hover:text-rose-700 font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 8: Review & Publish */}
        {currentStep === 8 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#222222] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-neutral-900" />
                Review Listing &amp; Legal Authorization Confirmation
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Verify all listing specifications and confirm your authority to lease this space.
              </p>
            </div>

            {/* Driver Preview Card */}
            <div className="p-4 rounded-3xl border border-neutral-200 bg-neutral-50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Driver Preview Card
                </span>
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[11px] font-bold">
                  Pending Admin Verification Review
                </Badge>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="w-full sm:w-48 h-32 rounded-2xl overflow-hidden bg-neutral-200 shrink-0">
                  <ParkingImage
                    src={photos[0] || "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=400&q=80"}
                    alt="Space preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-extrabold text-base text-neutral-900">
                    {title || "Untitled Parking Spot"}
                  </h3>
                  <p className="text-xs text-neutral-600">
                    {address}, {neighborhood}, {city}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-800 text-[10px] font-bold">
                      {category.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-800 text-[10px] font-bold">
                      Fits up to {maxVehicleType.toUpperCase()}
                    </span>
                    {isCovered && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Covered
                      </span>
                    )}
                    {hasEvCharging && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                        EV Charging
                      </span>
                    )}
                  </div>
                  <div className="pt-2 text-sm font-extrabold text-neutral-900">
                    ${pricePerHour} <span className="text-xs font-normal text-neutral-500">/ hour</span> &bull; ${pricePerDay} <span className="text-xs font-normal text-neutral-500">/ day</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mandatory Owner Legal Authorization Confirmation */}
            <div className="p-5 rounded-3xl bg-neutral-900 text-white space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-purple-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm">Owner Authorization Declaration</h4>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    ParkMate strictly protects driver access rights and property owners. By publishing this listing, you affirm under penalty of platform deactivation that you are the legal deed owner or authorized lease manager for this specific parking space.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-800 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="authConfirm"
                  checked={isAuthorized}
                  onChange={(e) => {
                    setIsAuthorized(e.target.checked);
                    if (e.target.checked) {
                      setStepErrors((prev) => ({ ...prev, isAuthorized: "" }));
                    }
                  }}
                  className="w-5 h-5 mt-0.5 accent-purple-500 cursor-pointer"
                />
                <label htmlFor="authConfirm" className="text-xs font-semibold text-neutral-200 cursor-pointer">
                  I confirm that I am legally authorized to lease this parking space on ParkMate, and all dimensions and access instructions are 100% verified.
                </label>
              </div>
              {stepErrors.isAuthorized && (
                <p className="text-xs text-rose-400 font-bold">{stepErrors.isAuthorized}</p>
              )}
            </div>
          </div>
        )}

        {/* Wizard Controls Footer */}
        <div className="flex items-center justify-between gap-4 pt-4">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 1 || isPublishing}
            className="rounded-full px-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="rounded-full px-5 text-xs font-semibold"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {isSavingDraft ? "Saving Draft..." : "Save Draft"}
            </Button>

            {currentStep < 8 ? (
              <Button onClick={handleNext} className="rounded-full px-6 font-bold shadow-xs">
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handlePublishListing}
                disabled={isPublishing || !isAuthorized}
                className="rounded-full px-8 font-black bg-neutral-900 text-white hover:bg-neutral-800 shadow-md"
              >
                {isPublishing ? "Publishing to Supabase..." : "Publish Authorized Listing"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ListingWizardPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-4 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-neutral-500 font-semibold">Loading Listing Wizard...</p>
          </div>
        </div>
      }
    >
      <WizardContent />
    </React.Suspense>
  );
}
