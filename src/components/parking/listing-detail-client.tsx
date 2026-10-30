"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Star, 
  MapPin, 
  Share2, 
  Heart, 
  ShieldCheck, 
  Zap, 
  Warehouse, 
  Car, 
  Key, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  Footprints,
  UserCheck,
  Clock
} from "lucide-react";
import { VEHICLE_PRESETS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { ParkingSpace, VehicleType } from "@/types/parking";
import { ParkingImage } from "@/components/ui/parking-image";
import { evaluateVehicleCompatibility, DEFAULT_SAFETY_MARGINS } from "@/lib/compatibility-engine";

interface ListingDetailClientProps {
  space: ParkingSpace;
}

export function ListingDetailClient({ space }: ListingDetailClientProps) {
  const router = useRouter();

  // Interactive booking state
  const [selectedDurationHours, setSelectedDurationHours] = React.useState<number>(3);
  const [testedVehicle, setTestedVehicle] = React.useState<VehicleType>("suv");
  const [isSaved, setIsSaved] = React.useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = React.useState(false);
  const [isBookingConfirmed, setIsBookingConfirmed] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [bookingError, setBookingError] = React.useState<string | null>(null);
  const [testPaymentMethod, setTestPaymentMethod] = React.useState<"test_card_visa" | "simulate_failure">("test_card_visa");
  const [arrivalDatetime, setArrivalDatetime] = React.useState<string>("");
  const [confirmedBookingData, setConfirmedBookingData] = React.useState<{
    bookingRef: string;
    accessCode: string;
    totalPrice: number;
    instructions: string;
  } | null>(null);

  // Pricing calculations
  const hourlySubtotal = space.pricePerHour * selectedDurationHours;
  const serviceFee = 2.50;
  const taxes = Number((hourlySubtotal * 0.08).toFixed(2));
  const totalPrice = hourlySubtotal + serviceFee + taxes;

  // Vehicle Compatibility Check via Compatibility Engine
  const testedPreset = VEHICLE_PRESETS.find((v) => v.id === testedVehicle) || VEHICLE_PRESETS[0];
  const compatibility = React.useMemo(() => {
    return evaluateVehicleCompatibility(space, { vehicleType: testedVehicle }, DEFAULT_SAFETY_MARGINS);
  }, [space, testedVehicle]);
  const isCompatible = compatibility.isCompatible;

  // Check saved state on mount
  React.useEffect(() => {
    fetch("/api/saved-spaces")
      .then((res) => res.json())
      .then((data) => {
        if (data.savedSpaceIds && data.savedSpaceIds.includes(space.id)) {
          setIsSaved(true);
        }
      })
      .catch(() => {});
  }, [space.id]);

  const toggleSaveSpace = async () => {
    const nextState = !isSaved;
    setIsSaved(nextState);
    try {
      if (nextState) {
        await fetch("/api/saved-spaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spaceId: space.id }),
        });
      } else {
        await fetch(`/api/saved-spaces?spaceId=${space.id}`, {
          method: "DELETE",
        });
      }
    } catch {
      // Keep UI responsive even if network fails
    }
  };

  const handleConfirmReservation = async () => {
    setIsSubmitting(true);
    setBookingError(null);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId: space.id,
          durationHours: selectedDurationHours,
          startTime: arrivalDatetime ? new Date(arrivalDatetime).toISOString() : undefined,
          vehicleModel: `${testedPreset.name} (Registered)`,
          vehicleType: testedVehicle,
          licensePlate: "7XYZ899",
          paymentMethod: testPaymentMethod,
          simulateFailure: testPaymentMethod === "simulate_failure",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setBookingError(data.error || "Failed to reserve parking space.");
        setIsSubmitting(false);
        return;
      }

      setConfirmedBookingData({
        bookingRef: data.booking.bookingReference,
        accessCode: data.booking.accessCode,
        totalPrice: data.booking.totalPrice,
        instructions: data.accessDetails?.instructions || space.accessInstructions || "Digital Pass issued. Proceed to reserved bay.",
      });
      setIsBookingConfirmed(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error reserving space.";
      setBookingError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb & Navigation */}
      <div className="border-b border-[#EBEBEB] bg-[#FAFAFA] py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-[#717171]">
          <div className="flex items-center gap-2">
            <Link href="/" className="hover:text-[#222222]">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/search" className="hover:text-[#222222]">Pune</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-semibold text-[#222222] truncate max-w-[200px] sm:max-w-none">
              {space.title}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleSaveSpace}
              className="flex items-center gap-1.5 font-bold hover:text-[#222222] text-[#717171]"
            >
              <Heart className={`h-4 w-4 ${isSaved ? "fill-[#FF5A5F] text-[#FF5A5F]" : ""}`} />
              <span className="hidden sm:inline">{isSaved ? "Saved" : "Save"}</span>
            </button>
            <button
              type="button"
              onClick={() => alert("Link copied to clipboard!")}
              className="flex items-center gap-1.5 font-bold hover:text-[#222222] text-[#717171]"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title & Key Meta */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {space.isVerified ? (
              <Badge variant="success" className="gap-1 py-1 px-3">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified Authorized Space
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1 py-1 px-3">
                <Clock className="h-3.5 w-3.5" />
                Pending Host Verification (Admin Review)
              </Badge>
            )}

            {space.hasEvCharging && (
              <Badge variant="ev" className="gap-1 py-1 px-3">
                <Zap className="h-3.5 w-3.5 fill-current" />
                {space.evChargerType || "EV Charging"}
              </Badge>
            )}

            <Badge variant="recovery" className="gap-1 py-1 px-3">
              <ShieldCheck className="h-3.5 w-3.5" />
              Booking Recovery Protection Included
            </Badge>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#222222] tracking-tight">
            {space.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-[#717171]">
            <div className="flex items-center gap-1 font-bold text-[#222222]">
              <Star className="h-4 w-4 fill-[#222222]" />
              <span>{space.rating}</span>
              <span className="underline cursor-pointer font-normal">
                ({space.reviewCount} verified driver reviews)
              </span>
            </div>
            <span>&middot;</span>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-[#FF5A5F]" />
              <span className="text-[#222222] font-medium">{space.address}</span>
            </div>
            <span>&middot;</span>
            <div className="flex items-center gap-1 text-[#222222] font-semibold">
              <Footprints className="h-4 w-4 text-emerald-600" />
              <span>{space.walkingDistance}</span>
            </div>
          </div>
        </div>

        {/* Airbnb-style Photo Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-3xl overflow-hidden mb-12 shadow-sm">
          <div className="md:col-span-2 relative aspect-4/3 md:aspect-auto h-72 md:h-96">
            <ParkingImage
              src={space.images[0]}
              alt={space.title}
              className="w-full h-full object-cover hover:scale-102 transition-transform duration-300 cursor-pointer"
            />
          </div>
          <div className="hidden md:grid md:col-span-2 grid-cols-2 gap-3 h-96">
            {(space.images.length > 1 ? space.images.slice(1, 5) : [space.images[0], space.images[0]]).map((img, idx) => (
              <div key={idx} className="relative h-[186px] overflow-hidden">
                <ParkingImage
                  src={img}
                  alt={`Space view ${idx + 2}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Content & Booking Panel Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Details, Compatibility & Host */}
          <div className="lg:col-span-2 space-y-10">
            {/* Host overview badge */}
            <div className="flex items-center justify-between pb-8 border-b border-[#EAEAEA]">
              <div className="flex items-center gap-4">
                <ParkingImage
                  src={space.host.avatar}
                  alt={space.host.name}
                  className="h-14 w-14 rounded-full object-cover border-2 border-white shadow-md"
                />
                <div>
                  <h3 className="font-bold text-lg text-[#222222]">
                    Hosted by {space.host.name}
                  </h3>
                  <p className="text-xs text-[#717171]">
                    {space.host.isSuperhost ? "Superhost" : "Verified Host"} &middot; Joined in {space.host.joinedYear} &middot; Responds {space.host.responseTime}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
                  <UserCheck className="h-4 w-4" />
                  ID & Title Verified
                </span>
              </div>
            </div>

            {/* Differentiator 2: Vehicle Compatibility Interactive Tester */}
            <div className="rounded-3xl border border-[#DDDDDD] bg-[#F7F7F7] p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Car className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#222222]">
                      Vehicle Compatibility Check
                    </h3>
                    <p className="text-xs text-[#717171]">
                      Instant match against bay clearance & dimensions
                    </p>
                  </div>
                </div>

                <Badge variant={isCompatible ? "success" : "warning"} className="text-xs py-1 px-3">
                  {isCompatible ? "Guaranteed Fit" : "May Not Fit"}
                </Badge>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-[#222222] mb-1.5">
                  Test Your Vehicle Model:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {VEHICLE_PRESETS.map((vp) => (
                    <button
                      key={vp.id}
                      type="button"
                      onClick={() => setTestedVehicle(vp.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        testedVehicle === vp.id
                          ? "bg-white border-[#222222] ring-2 ring-[#222222]/10 shadow-xs"
                          : "bg-white/60 border-[#DDDDDD] hover:bg-white text-[#717171]"
                      }`}
                    >
                      <p className="font-bold text-xs text-[#222222]">{vp.name.split("/")[0]}</p>
                      <p className="text-[10px] text-[#717171]">{vp.heightFeet} ft height</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Compatibility Result Banner */}
              <div
                className={`rounded-2xl p-4 flex items-start gap-3 border ${
                  isCompatible
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                    : "bg-amber-50/80 border-amber-200 text-amber-900"
                }`}
              >
                {isCompatible ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="text-xs">
                  <p className="font-bold">
                    {isCompatible
                      ? `Perfect fit for ${testedPreset.name}`
                      : `Warning: This space ceiling clearance is ${space.clearanceFeet} ft`}
                  </p>
                  <p className="mt-0.5 opacity-90 leading-relaxed">
                    {isCompatible
                      ? `Ceiling clearance is ${space.clearanceFeet} ft, which easily accommodates your vehicle profile with safety margins.`
                      : `Your selected vehicle requires ${testedPreset.heightFeet} ft. We recommend selecting a different space to avoid height issues.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-4">
              <h3 className="font-bold text-xl text-[#222222]">About this space</h3>
              <p className="text-sm text-[#717171] leading-relaxed">
                {space.description}
              </p>
            </div>

            {/* Specifications & Access */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-[#EAEAEA]">
              <div>
                <h4 className="font-bold text-base text-[#222222] mb-3 flex items-center gap-2">
                  <Warehouse className="h-4 w-4 text-[#FF5A5F]" />
                  Space Specifications
                </h4>
                <ul className="space-y-2.5 text-xs text-[#717171]">
                  <li className="flex justify-between border-b border-[#F0F0F0] pb-1.5">
                    <span>Parking Type:</span>
                    <span className="font-bold text-[#222222]">{space.isCovered ? "Covered Garage" : "Open Paved Bay"}</span>
                  </li>
                  <li className="flex justify-between border-b border-[#F0F0F0] pb-1.5">
                    <span>Max Clearance:</span>
                    <span className="font-bold text-[#222222]">{space.clearanceFeet} Feet</span>
                  </li>
                  <li className="flex justify-between border-b border-[#F0F0F0] pb-1.5">
                    <span>Max Vehicle Size:</span>
                    <span className="font-bold text-[#222222] capitalize">{space.maxVehicleType}</span>
                  </li>
                  <li className="flex justify-between border-b border-[#F0F0F0] pb-1.5">
                    <span>EV Charger:</span>
                    <span className="font-bold text-[#222222]">{space.hasEvCharging ? space.evChargerType : "None"}</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-base text-[#222222] mb-3 flex items-center gap-2">
                  <Key className="h-4 w-4 text-[#FF5A5F]" />
                  Access & Security
                </h4>
                <ul className="space-y-2 text-xs text-[#717171]">
                  {space.securityFeatures.map((sec, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-[#222222]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{sec}</span>
                    </li>
                  ))}
                  <li className="mt-3 p-2.5 rounded-xl bg-[#F7F7F7] text-[#717171] border border-[#EAEAEA]">
                    <span className="font-bold text-[#222222] block mb-0.5">Entry Mode:</span>
                    {space.accessInstructions}
                  </li>
                </ul>
              </div>
            </div>

            {/* Differentiator 1 & 3: Recovery Guarantee & Flexible Extensions Banner */}
            <div className="rounded-3xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-sm">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  ParkMate Double Guarantee
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  1. <span className="font-semibold">Booking Recovery:</span> If this space is obstructed, our system automatically gives you a backup space instantly.
                  <br />
                  2. <span className="font-semibold">Flexible Extension:</span> Need more time? Extend your reservation with 1 click if no driver is booked right after.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Airbnb Booking Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 rounded-3xl border border-[#DDDDDD] bg-white p-6 shadow-xl space-y-6">
              {/* Price header */}
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#222222]">
                    {formatCurrency(space.pricePerHour)}
                  </span>
                  <span className="text-sm text-[#717171] font-medium"> / hour</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-[#222222]">
                  <Star className="h-3.5 w-3.5 fill-[#222222]" />
                  <span>{space.rating}</span>
                  <span className="text-[#717171] font-normal">({space.reviewCount})</span>
                </div>
              </div>

              {/* Duration Selector */}
              <div className="rounded-2xl border border-[#DDDDDD] p-3 space-y-3 bg-[#FBFBFB]">
                <div className="flex justify-between items-center text-xs font-bold text-[#222222]">
                  <span>Duration:</span>
                  <span className="text-[#FF5A5F]">{selectedDurationHours} Hours</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={selectedDurationHours}
                  onChange={(e) => setSelectedDurationHours(Number(e.target.value))}
                  className="w-full accent-[#FF5A5F] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#717171]">
                  <span>1 hr</span>
                  <span>4 hrs</span>
                  <span>8 hrs</span>
                  <span>12 hrs</span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 text-xs text-[#717171]">
                <div className="flex justify-between">
                  <span>{formatCurrency(space.pricePerHour)} &times; {selectedDurationHours} hours</span>
                  <span className="font-bold text-[#222222]">{formatCurrency(hourlySubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ParkMate Protection &amp; Recovery Fee</span>
                  <span className="font-bold text-[#222222]">{formatCurrency(serviceFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Municipal Taxes</span>
                  <span className="font-bold text-[#222222]">{formatCurrency(taxes)}</span>
                </div>
                <div className="border-t border-[#EAEAEA] pt-3 flex justify-between text-sm font-extrabold text-[#222222]">
                  <span>Total (INR)</span>
                  <span className="text-base text-[#FF5A5F]">{formatCurrency(totalPrice)}</span>
                </div>
              </div>

              {/* Reserve Button with Compatibility Gate */}
              <Button
                size="lg"
                onClick={() => setIsBookingModalOpen(true)}
                disabled={!isCompatible}
                className={`w-full rounded-2xl py-4 text-base font-bold shadow-lg transition-transform ${
                  isCompatible
                    ? "shadow-[#FF5A5F]/20 hover:scale-[1.01]"
                    : "bg-neutral-300 text-neutral-600 cursor-not-allowed"
                }`}
              >
                {isCompatible ? "Reserve Space Now" : "Incompatible Vehicle Clearance"}
              </Button>

              {!isCompatible && (
                <p className="text-[11px] text-center text-red-600 font-medium">
                  {compatibility.reasons[0] || "Ceiling clearance too low for selected vehicle."}
                </p>
              )}

              <p className="text-[11px] text-center text-[#717171]">
                You won&apos;t be charged until booking is confirmed. Free cancellation up to 2 hours before arrival.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Confirmation Dialog */}
      <Dialog
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setIsBookingConfirmed(false);
          setBookingError(null);
        }}
        title={isBookingConfirmed ? "Reservation Confirmed!" : "Confirm Your Parking Spot"}
        description={isBookingConfirmed ? "Your spot is secured and access credentials generated." : `Reservation for ${space.title}`}
      >
        {isBookingConfirmed && confirmedBookingData ? (
          <div className="py-4 space-y-4">
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h4 className="text-base font-extrabold text-[#222222]">Access Pass Issued!</h4>
              <p className="text-xs text-[#717171] mt-0.5">
                Your reservation has been confirmed and registered on the server.
              </p>
            </div>

            <div className="rounded-2xl bg-neutral-900 text-white p-4 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-neutral-700 pb-2">
                <span className="text-neutral-400">Reference:</span>
                <span className="font-extrabold text-amber-400 text-sm tracking-wider">
                  {confirmedBookingData.bookingRef}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-neutral-700 pb-2">
                <span className="text-neutral-400">Access PIN Code:</span>
                <span className="font-extrabold text-emerald-400 text-sm tracking-widest">
                  {confirmedBookingData.accessCode}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-neutral-700 pb-2">
                <span className="text-neutral-400">Paid Total:</span>
                <span className="font-bold text-white text-sm">
                  {formatCurrency(confirmedBookingData.totalPrice)}
                </span>
              </div>
              <div className="pt-1 text-[11px] font-sans text-neutral-300">
                <span className="font-bold text-white block mb-0.5">Gate Instructions:</span>
                {confirmedBookingData.instructions}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="w-1/2 text-xs"
                onClick={() => {
                  setIsBookingModalOpen(false);
                  setIsBookingConfirmed(false);
                }}
              >
                Close
              </Button>
              <Button
                variant="brand"
                className="w-1/2 text-xs"
                onClick={() => {
                  setIsBookingModalOpen(false);
                  router.push("/bookings");
                }}
              >
                Go to My Bookings
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 text-xs">
            {/* Arrival DateTime Picker */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                Arrival Schedule (Optional - defaults to immediate)
              </label>
              <input
                type="datetime-local"
                value={arrivalDatetime}
                onChange={(e) => setArrivalDatetime(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 bg-white focus:outline-none focus:border-neutral-900 text-xs font-mono"
              />
            </div>

            {/* Space Summary Card */}
            <div className="rounded-2xl bg-[#F7F7F7] p-3.5 space-y-2 border border-[#EAEAEA]">
              <div className="flex justify-between font-bold text-[#222222]">
                <span>Spot:</span>
                <span className="truncate max-w-[200px]">{space.title}</span>
              </div>
              <div className="flex justify-between text-[#717171]">
                <span>Duration:</span>
                <span>{selectedDurationHours} Hours</span>
              </div>
              <div className="flex justify-between text-[#717171]">
                <span>Vehicle Profile:</span>
                <span className="capitalize font-semibold text-neutral-800">{testedPreset.name}</span>
              </div>
              <div className="flex justify-between text-[#717171]">
                <span>Clearance Headroom:</span>
                <span className="text-emerald-700 font-semibold">
                  +{compatibility.clearanceBufferFeet.toFixed(1)} ft buffer
                </span>
              </div>
              <div className="flex justify-between font-bold text-sm text-[#FF5A5F] border-t border-[#DDDDDD] pt-2">
                <span>Total Due:</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            {/* Test Payment Simulation Selector */}
            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-sky-900">
                <span>Payment Simulation (Test Mode)</span>
                <span className="text-[10px] bg-sky-200/80 px-2 py-0.5 rounded-full font-mono">No card stored</span>
              </div>
              <select
                value={testPaymentMethod}
                onChange={(e) => setTestPaymentMethod(e.target.value as "test_card_visa" | "simulate_failure")}
                className="w-full text-xs p-1.5 rounded-lg border border-sky-300 bg-white font-medium text-neutral-800 focus:outline-none"
              >
                <option value="test_card_visa">Visa &bull;&bull;&bull;&bull; 4242 (Simulate Success)</option>
                <option value="simulate_failure">Test Card Decline (Simulate Failure)</option>
              </select>
              <p className="text-[10px] text-sky-700">
                Payments are verified strictly on the server before issuing confirmed reservation passes.
              </p>
            </div>

            {bookingError && (
              <div className="p-3 bg-red-50 text-red-800 rounded-xl text-[11px] border border-red-200">
                <p className="font-bold">Reservation Failed</p>
                <p>{bookingError}</p>
              </div>
            )}

            <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl text-[11px] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Includes Free Cancellation &amp; Automatic Booking Recovery Protection.</span>
            </div>

            <div className="pt-2 flex gap-3">
              <Button
                variant="outline"
                className="w-1/2"
                onClick={() => setIsBookingModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="brand"
                className="w-1/2"
                onClick={handleConfirmReservation}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Confirm & Pay"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
