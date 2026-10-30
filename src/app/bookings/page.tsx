"use client";

import * as React from "react";
import Link from "next/link";
import { 
  Clock, 
  MapPin, 
  QrCode, 
  ShieldAlert, 
  CheckCircle2, 
  Car, 
  Sparkles, 
  PlusCircle,
  AlertCircle,
  XCircle,
  Key,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { INITIAL_USER_BOOKINGS } from "@/lib/mock-data";
import { Booking, ParkingSpace } from "@/types/parking";
import { AccessProblemType, RecoveryAlternative } from "@/lib/recovery-engine";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { ParkingImage } from "@/components/ui/parking-image";

type TabType = "all" | "active" | "upcoming" | "completed" | "cancelled";

export default function BookingsPage() {
  const [bookings, setBookings] = React.useState<Booking[]>(INITIAL_USER_BOOKINGS);
  const [activeTab, setActiveTab] = React.useState<TabType>("all");

  // FlexPark Extension Modal state
  const [extensionBooking, setExtensionBooking] = React.useState<Booking | null>(null);
  const [extensionHours, setExtensionHours] = React.useState<number>(1);
  const [isExtending, setIsExtending] = React.useState(false);
  const [extensionError, setExtensionError] = React.useState<string | null>(null);
  const [extensionSuccess, setExtensionSuccess] = React.useState(false);

  // Cancellation Modal state
  const [cancellationBooking, setCancellationBooking] = React.useState<Booking | null>(null);
  const [cancellationReason, setCancellationReason] = React.useState("");
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [cancellationResult, setCancellationResult] = React.useState<{
    refundAmount: number;
    note: string;
    disclaimer?: string;
    isDemoRefund?: boolean;
  } | null>(null);

  // Recovery Modal state
  const [recoveryBooking, setRecoveryBooking] = React.useState<Booking | null>(null);
  const [recoveryStep, setRecoveryStep] = React.useState<
    "select_problem" | "review_alternatives" | "confirmed_replacement" | "refunded"
  >("select_problem");
  const [selectedProblemType, setSelectedProblemType] = React.useState<AccessProblemType>("space_occupied");
  const [problemNotes, setProblemNotes] = React.useState("");
  const [isDemoMode, setIsDemoMode] = React.useState(false);
  const [recoveryAlternatives, setRecoveryAlternatives] = React.useState<RecoveryAlternative[]>([]);
  const [selectedAlternativeId, setSelectedAlternativeId] = React.useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = React.useState(false);
  const [isConfirmingReplacement, setIsConfirmingReplacement] = React.useState(false);
  const [confirmedSpace, setConfirmedSpace] = React.useState<ParkingSpace | null>(null);
  const [newPassPin, setNewPassPin] = React.useState<string | null>(null);
  const [refundInfo, setRefundInfo] = React.useState<{
    refundAmount: number;
    credit: number;
    ticketId: string;
    summary: string;
  } | null>(null);
  const [recoveryConflictError, setRecoveryConflictError] = React.useState<string | null>(null);

  // Digital Pass QR Modal
  const [passModalBooking, setPassModalBooking] = React.useState<Booking | null>(null);

  // Fetch real bookings on mount
  React.useEffect(() => {
    let active = true;
    async function init() {
      try {
        const res = await fetch("/api/bookings");
        if (res.ok) {
          const data = await res.json();
          if (active && data.bookings && data.bookings.length > 0) {
            setBookings(data.bookings);
          }
        }
      } catch {
        // Fallback to initial sandbox bookings
      }
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  const refreshBookings = async () => {
    try {
      const res = await fetch("/api/bookings");
      if (res.ok) {
        const data = await res.json();
        if (data.bookings && data.bookings.length > 0) {
          setBookings(data.bookings);
        }
      }
    } catch {
      // Fallback
    }
  };

  // Tab Filtering
  const displayedBookings = React.useMemo(() => {
    if (activeTab === "all") return bookings;
    if (activeTab === "active") {
      return bookings.filter((b) => b.status === "active" || b.status === "recovered");
    }
    if (activeTab === "upcoming") {
      return bookings.filter((b) => b.status === "confirmed" || b.status === "upcoming");
    }
    if (activeTab === "completed") {
      return bookings.filter((b) => b.status === "completed");
    }
    if (activeTab === "cancelled") {
      return bookings.filter((b) => b.status === "cancelled");
    }
    return bookings;
  }, [bookings, activeTab]);

  // Handle FlexPark Extension Execution
  const handleConfirmExtension = async () => {
    if (!extensionBooking) return;
    setIsExtending(true);
    setExtensionError(null);

    try {
      const res = await fetch(`/api/bookings/${extensionBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "extend",
          additionalHours: extensionHours,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setExtensionError(data.error || "Extension could not be processed due to a scheduling conflict.");
        setIsExtending(false);
        return;
      }

      setExtensionSuccess(true);
      await refreshBookings();

      setTimeout(() => {
        setExtensionSuccess(false);
        setExtensionBooking(null);
        setIsExtending(false);
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error during extension request";
      setExtensionError(msg);
      setIsExtending(false);
    }
  };

  // Handle Cancellation Execution
  const handleConfirmCancellation = async () => {
    if (!cancellationBooking) return;
    setIsCancelling(true);

    try {
      const res = await fetch(`/api/bookings/${cancellationBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          reason: cancellationReason || "Driver cancelled reservation",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to cancel reservation.");
        setIsCancelling(false);
        return;
      }

      setCancellationResult({
        refundAmount: data.cancellation?.refundAmount ?? cancellationBooking.totalPrice,
        note: data.cancellation?.note ?? "Reservation cancelled and space slot released.",
        disclaimer: data.cancellation?.disclaimer ?? "Simulated test refund credited to demo ledger (Demo transaction: no real funds transferred).",
        isDemoRefund: data.cancellation?.isDemoRefund ?? true,
      });

      await refreshBookings();
    } catch {
      alert("Network error processing cancellation.");
    } finally {
      setIsCancelling(false);
    }
  };

  // =========================================================================
  // Recovery Handlers (Failed-Arrival Workflow)
  // =========================================================================
  const handleStartReporting = (booking: Booking, isDemo = false) => {
    setRecoveryBooking(booking);
    setRecoveryStep("select_problem");
    setSelectedProblemType("space_occupied");
    setProblemNotes("");
    setIsDemoMode(isDemo);
    setRecoveryAlternatives([]);
    setSelectedAlternativeId(null);
    setConfirmedSpace(null);
    setNewPassPin(null);
    setRefundInfo(null);
    setRecoveryConflictError(null);
  };

  const handleSubmitAccessReport = async () => {
    if (!recoveryBooking) return;
    setIsSubmittingReport(true);
    setRecoveryConflictError(null);

    try {
      const res = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report",
          bookingId: recoveryBooking.id,
          problemType: selectedProblemType,
          notes: problemNotes,
          isDemo: isDemoMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to submit access problem report.");
        setIsSubmittingReport(false);
        return;
      }

      const alts = data.alternatives || [];
      setRecoveryAlternatives(alts);
      if (alts.length > 0) {
        setSelectedAlternativeId(alts[0].space.id);
      }
      setRecoveryStep("review_alternatives");
      await refreshBookings();
    } catch {
      alert("Network error reporting problem.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleConfirmReplacement = async () => {
    if (!recoveryBooking || !selectedAlternativeId) return;
    setIsConfirmingReplacement(true);
    setRecoveryConflictError(null);

    try {
      const res = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_replacement",
          bookingId: recoveryBooking.id,
          replacementSpaceId: selectedAlternativeId,
          isDemo: isDemoMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRecoveryConflictError(data.message || "This alternative space is no longer available.");
        setIsConfirmingReplacement(false);
        return;
      }

      setConfirmedSpace(data.replacementSpace);
      setNewPassPin(data.newAccessCode);
      setRecoveryStep("confirmed_replacement");
      await refreshBookings();
    } catch {
      setRecoveryConflictError("Network error confirming replacement space.");
    } finally {
      setIsConfirmingReplacement(false);
    }
  };

  const handleRequestRefundAndEscalation = async () => {
    if (!recoveryBooking) return;
    setIsSubmittingReport(true);

    try {
      const res = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel_and_refund",
          bookingId: recoveryBooking.id,
          reason: `Driver opted for refund due to: ${selectedProblemType}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to process refund.");
        setIsSubmittingReport(false);
        return;
      }

      setRefundInfo({
        refundAmount: data.refundAmount,
        credit: data.inconvenienceCredit,
        ticketId: data.ticketId,
        summary: data.message,
      });
      setRecoveryStep("refunded");
      await refreshBookings();
    } catch {
      alert("Network error processing refund.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222] tracking-tight">
                My Parking Reservations
              </h1>
              <span className="text-xs font-bold bg-neutral-100 text-neutral-700 px-2.5 py-0.5 rounded-full">
                {bookings.length} Total
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#717171] mt-1">
              Active sessions, digital access passes, FlexPark extensions, and cancellation policies.
            </p>
          </div>

          <Link href="/search">
            <Button size="md" variant="brand" className="rounded-full shadow-md text-xs font-bold">
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Book Another Space
            </Button>
          </Link>
        </div>

        {/* Tab switcher: Upcoming, Active, Completed, Cancelled */}
        <div className="flex items-center gap-1.5 border-b border-neutral-200 pb-2 overflow-x-auto text-xs">
          {[
            { id: "all", label: "All Bookings", count: bookings.length },
            {
              id: "active",
              label: "Active Now",
              count: bookings.filter((b) => b.status === "active" || b.status === "recovered").length,
            },
            {
              id: "upcoming",
              label: "Upcoming",
              count: bookings.filter((b) => b.status === "confirmed" || b.status === "upcoming").length,
            },
            {
              id: "completed",
              label: "Completed",
              count: bookings.filter((b) => b.status === "completed").length,
            },
            {
              id: "cancelled",
              label: "Cancelled",
              count: bookings.filter((b) => b.status === "cancelled").length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "bg-[#222222] text-white shadow-xs"
                  : "bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-400"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === tab.id ? "bg-neutral-700 text-white" : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {displayedBookings.length > 0 ? (
            displayedBookings.map((booking) => {
              const isActive = booking.status === "active";
              const isUpcoming = booking.status === "confirmed" || booking.status === "upcoming";
              const isCompleted = booking.status === "completed";
              const isCancelled = booking.status === "cancelled";
              const isRecovered = booking.status === "recovered";

              return (
                <div
                  key={booking.id}
                  className="rounded-3xl bg-white border border-neutral-200 p-5 sm:p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                >
                  {/* Left: Image & Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <ParkingImage
                      src={booking.spaceImage}
                      alt={booking.spaceTitle}
                      className="h-24 w-28 rounded-2xl object-cover shrink-0 border border-neutral-100"
                    />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Status Badges & Booking Reference */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {isActive && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Active Now
                          </span>
                        )}
                        {isUpcoming && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 bg-sky-50 border border-sky-300 px-2.5 py-0.5 rounded-full">
                            <Clock className="h-3 w-3" />
                            Upcoming Pass
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-700 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                            Completed Trip
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                            <XCircle className="h-3 w-3" />
                            Cancelled &bull; Slot Released
                          </span>
                        )}
                        {isRecovered && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                            <Sparkles className="h-3 w-3" />
                            Reallocated Space
                          </span>
                        )}

                        <span className="text-xs font-mono font-bold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded-md">
                          {booking.bookingReference || `PM-${booking.id.slice(0, 8)}`}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-[#222222] truncate">
                        {booking.spaceTitle}
                      </h3>

                      <p className="text-xs text-[#717171] flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-[#FF5A5F] shrink-0" />
                        <span className="truncate">{booking.spaceAddress}</span>
                      </p>

                      <div className="pt-1 flex flex-wrap items-center gap-3 text-xs text-[#222222]">
                        <span className="flex items-center gap-1 font-semibold">
                          <Clock className="h-3.5 w-3.5 text-neutral-500" />
                          {booking.startTime} &rarr; {booking.endTime}
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1 text-neutral-600">
                          <Car className="h-3.5 w-3.5" />
                          {booking.vehicleModel} ({booking.licensePlate})
                        </span>
                        <span>&bull;</span>
                        <span className="font-extrabold text-[#222222]">
                          {formatCurrency(booking.totalPrice)}
                        </span>
                      </div>

                      {/* Policy note */}
                      {!isCancelled && !isCompleted && (
                        <p className="text-[10px] text-neutral-500 italic pt-0.5">
                          Free cancellation up to 2 hours prior to arrival. Space released atomically on cancellation.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap sm:flex-col items-stretch justify-center gap-2 w-full md:w-auto shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-100">
                    {/* View Entry Pass Button */}
                    {!isCancelled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPassModalBooking(booking)}
                        className="rounded-xl gap-1.5 text-xs font-bold"
                      >
                        <QrCode className="h-4 w-4 text-[#FF5A5F]" />
                        Entry Pass &amp; PIN
                      </Button>
                    )}

                    {/* FlexPark Extension Trigger */}
                    {(isActive || isUpcoming) && booking.canExtend && (
                      <Button
                        variant="brand"
                        size="sm"
                        onClick={() => {
                          setExtensionBooking(booking);
                          setExtensionHours(1);
                          setExtensionError(null);
                        }}
                        className="rounded-xl gap-1.5 text-xs font-bold"
                      >
                        <Clock className="h-4 w-4" />
                        FlexPark Extend
                      </Button>
                    )}

                    {/* Cancellation Trigger */}
                    {(isActive || isUpcoming) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCancellationBooking(booking);
                          setCancellationReason("");
                          setCancellationResult(null);
                        }}
                        className="text-xs font-semibold text-neutral-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-xl transition-colors text-center"
                      >
                        Cancel Reservation
                      </button>
                    )}

                    {/* Report an Access Problem Trigger */}
                    {!isCancelled && !isCompleted && !isRecovered && (
                      <div className="flex flex-col gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleStartReporting(booking, false)}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          Report Access Problem
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartReporting(booking, true)}
                          className="text-[10px] font-semibold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition-colors flex items-center justify-center gap-1"
                          title="Simulate a failed arrival (e.g. space occupied) to test automated recovery"
                        >
                          <Sparkles className="h-3 w-3 text-purple-600" />
                          [Demo] Simulate Failed Arrival
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center">
              <Car className="h-10 w-10 text-neutral-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-neutral-800">
                No {activeTab !== "all" ? activeTab : ""} reservations found
              </h3>
              <p className="text-xs text-neutral-500 mt-1 mb-4">
                Explore verified parking spaces and secure a spot before your trip.
              </p>
              <Link href="/search">
                <Button variant="brand" size="sm" className="rounded-full text-xs">
                  Search Available Spaces
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. FLEXPARK EXTENSION MODAL */}
      {/* ===================================================================== */}
      <Dialog
        isOpen={Boolean(extensionBooking)}
        onClose={() => {
          setExtensionBooking(null);
          setExtensionError(null);
        }}
        title="FlexPark: Extend Active Session"
        description={extensionBooking ? `Extend parking at ${extensionBooking.spaceTitle}` : ""}
      >
        {extensionSuccess ? (
          <div className="py-6 text-center space-y-2">
            <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 animate-bounce">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-base font-bold text-neutral-900">Extension Confirmed!</h4>
            <p className="text-xs text-neutral-600">
              Your parking session has been atomically extended and registered on the server.
            </p>
          </div>
        ) : extensionBooking ? (
          <div className="space-y-4 text-xs">
            <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-200 space-y-2">
              <div className="flex justify-between font-semibold text-neutral-700">
                <span>Current End Time:</span>
                <span className="font-bold text-neutral-900">{extensionBooking.endTime}</span>
              </div>
              <div className="flex justify-between font-semibold text-neutral-700">
                <span>Hourly Rate:</span>
                <span>{formatCurrency(extensionBooking.hourlyRate)} / hr</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-neutral-800 mb-2">
                Select Additional Duration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => setExtensionHours(hours)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      extensionHours === hours
                        ? "bg-[#222222] text-white border-[#222222] shadow-xs"
                        : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    +{hours} {hours === 1 ? "Hour" : "Hours"}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Preview */}
            <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-3.5 space-y-1.5 text-amber-900">
              <div className="flex justify-between font-bold">
                <span>Extension Charge:</span>
                <span>{formatCurrency(extensionBooking.hourlyRate * extensionHours * 1.08)}</span>
              </div>
              <p className="text-[10px] text-amber-800">
                Includes state/municipal tax. Space availability is rechecked live against subsequent reservations.
              </p>
            </div>

            {extensionError && (
              <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs border border-red-200 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <span className="font-bold block">Scheduling Conflict Detected</span>
                  <span>{extensionError}</span>
                  <span className="block mt-1 text-[10px] text-red-700">
                    Your original reservation remains 100% active and preserved.
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="w-1/2 text-xs"
                onClick={() => setExtensionBooking(null)}
                disabled={isExtending}
              >
                Cancel
              </Button>
              <Button
                variant="brand"
                className="w-1/2 text-xs"
                onClick={handleConfirmExtension}
                disabled={isExtending}
              >
                {isExtending ? "Checking Availability..." : "Confirm & Extend"}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>

      {/* ===================================================================== */}
      {/* 2. CANCELLATION MODAL */}
      {/* ===================================================================== */}
      <Dialog
        isOpen={Boolean(cancellationBooking)}
        onClose={() => {
          setCancellationBooking(null);
          setCancellationResult(null);
        }}
        title="Cancel Parking Reservation"
        description={cancellationBooking ? `Booking Reference: ${cancellationBooking.bookingReference}` : ""}
      >
        {cancellationResult ? (
          <div className="py-4 space-y-3 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-base font-bold text-neutral-900">Reservation Cancelled</h4>
            <p className="text-xs text-neutral-600">
              {cancellationResult.note}
            </p>
            <div className="rounded-xl bg-neutral-100 p-3 font-mono text-xs">
              Refund Amount: <span className="font-bold text-emerald-700">{formatCurrency(cancellationResult.refundAmount)}</span>
            </div>
            {cancellationResult.disclaimer && (
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-[11px] leading-relaxed text-left">
                <span className="font-bold block text-[10px] uppercase tracking-wider text-sky-900 mb-0.5">
                  Payment Transparency Notice
                </span>
                {cancellationResult.disclaimer}
              </div>
            )}
            <Button
              variant="brand"
              className="w-full text-xs"
              onClick={() => {
                setCancellationBooking(null);
                setCancellationResult(null);
              }}
            >
              Done
            </Button>
          </div>
        ) : cancellationBooking ? (
          <div className="space-y-4 text-xs">
            <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500">Space:</span>
                <span className="font-bold text-neutral-900">{cancellationBooking.spaceTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Paid Total:</span>
                <span className="font-bold text-neutral-900">{formatCurrency(cancellationBooking.totalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Scheduled Arrival:</span>
                <span className="font-semibold text-neutral-800">{cancellationBooking.startTime}</span>
              </div>
            </div>

            <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 text-sky-900">
              <span className="font-bold block mb-0.5">Cancellation Policy:</span>
              <p className="text-[11px] leading-relaxed">
                Cancelling more than 2 hours before arrival entitles you to a 100% full refund. Cancelling frees this parking space immediately for other drivers.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Reason for Cancellation (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Plans changed, no longer travelling..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white text-xs focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="w-1/2 text-xs"
                onClick={() => setCancellationBooking(null)}
                disabled={isCancelling}
              >
                Keep Reservation
              </Button>
              <Button
                variant="danger"
                className="w-1/2 text-xs"
                onClick={handleConfirmCancellation}
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>

      {/* ===================================================================== */}
      {/* 3. DIGITAL ACCESS PASS MODAL */}
      {/* ===================================================================== */}
      <Dialog
        isOpen={Boolean(passModalBooking)}
        onClose={() => setPassModalBooking(null)}
        title="ParkMate Digital Parking Pass"
        description={passModalBooking ? passModalBooking.spaceTitle : ""}
      >
        {passModalBooking && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-neutral-900 text-white p-6 shadow-xl space-y-4 font-mono text-center">
              <div className="border-b border-neutral-800 pb-3">
                <span className="text-[10px] uppercase text-neutral-400 tracking-widest block">
                  Booking Reference
                </span>
                <span className="text-xl font-extrabold text-amber-400 tracking-wider">
                  {passModalBooking.bookingReference || `PM-${passModalBooking.id.slice(0, 8)}`}
                </span>
              </div>

              {/* QR Representation */}
              <div className="bg-white p-4 rounded-2xl inline-block mx-auto">
                <QrCode className="h-32 w-32 text-neutral-900" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest block">
                  Automated Gate PIN Code
                </span>
                <span className="text-2xl font-black text-emerald-400 tracking-widest">
                  {passModalBooking.accessCode}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-left text-[11px] bg-neutral-800/80 p-3 rounded-xl border border-neutral-700">
                <div>
                  <span className="text-neutral-400 block text-[9px]">Vehicle:</span>
                  <span className="font-bold text-white">{passModalBooking.vehicleModel}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px]">Plate:</span>
                  <span className="font-bold text-white">{passModalBooking.licensePlate}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-200 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                <Key className="h-4 w-4 text-[#FF5A5F]" />
                <span>Entry &amp; Gate Instructions</span>
              </div>
              <p className="text-neutral-600 text-xs leading-relaxed">
                Scan the QR code at the entrance scanner, or type your 4-digit PIN on the driver-side keypad. Gate opens automatically.
              </p>
            </div>

            <Button
              variant="brand"
              className="w-full text-xs font-bold"
              onClick={() => setPassModalBooking(null)}
            >
              Done &bull; Save to Wallet
            </Button>
          </div>
        )}
      </Dialog>

      {/* ===================================================================== */}
      {/* ===================================================================== */}
      {/* 4. MULTI-STEP BOOKING RECOVERY WIZARD */}
      {/* ===================================================================== */}
      <Dialog
        isOpen={Boolean(recoveryBooking)}
        onClose={() => setRecoveryBooking(null)}
        title="ParkMate Booking Recovery Protection"
        description="If you cannot access your reserved space, our server matches you with verified compatible alternatives nearby."
      >
        {recoveryBooking && (
          <div className="space-y-4 text-xs">
            {/* STEP 1: Select Problem Type */}
            {recoveryStep === "select_problem" && (
              <div className="space-y-4">
                {isDemoMode && (
                  <div className="p-3 bg-purple-50 text-purple-900 rounded-2xl border border-purple-200 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
                    <span className="text-[11px] font-semibold">
                      Demo Simulation Mode: Testing failover with simulated arrival telemetry.
                    </span>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-neutral-800 mb-2">
                    What problem are you experiencing at {recoveryBooking.spaceTitle}?
                  </label>
                  <div className="space-y-2">
                    {[
                      {
                        id: "space_occupied" as AccessProblemType,
                        title: "Space occupied by another vehicle",
                        desc: "An unauthorized car is parked in your assigned parking bay.",
                      },
                      {
                        id: "entrance_inaccessible" as AccessProblemType,
                        title: "Entrance inaccessible",
                        desc: "Gated barrier is down, entrance locked, or keypad PIN code failed.",
                      },
                      {
                        id: "listing_details_incorrect" as AccessProblemType,
                        title: "Listing details incorrect",
                        desc: "Height clearance is lower than stated or address could not be located.",
                      },
                      {
                        id: "other" as AccessProblemType,
                        title: "Other physical access barrier",
                        desc: "Construction, temporary roadwork, or safety impediment.",
                      },
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        onClick={() => setSelectedProblemType(opt.id)}
                        className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          selectedProblemType === opt.id
                            ? "bg-rose-50/70 border-rose-300 ring-1 ring-rose-300"
                            : "bg-white border-neutral-200 hover:border-neutral-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="problemType"
                          value={opt.id}
                          checked={selectedProblemType === opt.id}
                          onChange={() => setSelectedProblemType(opt.id)}
                          className="mt-1 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <span className="font-bold text-neutral-900 block">{opt.title}</span>
                          <span className="text-neutral-500 text-[11px] block">{opt.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-neutral-800 mb-1">
                    Additional notes / details (optional):
                  </label>
                  <input
                    type="text"
                    value={problemNotes}
                    onChange={(e) => setProblemNotes(e.target.value)}
                    placeholder="e.g. Blue Honda Civic parked in spot #A12"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white text-xs focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="w-1/3 text-xs"
                    onClick={() => setRecoveryBooking(null)}
                    disabled={isSubmittingReport}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="brand"
                    className="w-2/3 text-xs font-bold"
                    onClick={handleSubmitAccessReport}
                    disabled={isSubmittingReport}
                  >
                    {isSubmittingReport ? "Searching Alternatives..." : "Find Backup Spaces"}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Review Alternatives */}
            {recoveryStep === "review_alternatives" && (
              <div className="space-y-4">
                {recoveryConflictError && (
                  <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs border border-red-200 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    <div>
                      <span className="font-bold block">Selection Conflict</span>
                      <span>{recoveryConflictError}</span>
                    </div>
                  </div>
                )}

                {recoveryAlternatives.length > 0 ? (
                  <>
                    <div className="p-3 bg-emerald-50 text-emerald-900 rounded-2xl border border-emerald-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-bold block text-xs">
                            {recoveryAlternatives.length} Compatible Alternative Spaces Found
                          </span>
                          <span className="text-[11px] text-emerald-700">
                            Revalidated for your vehicle clearance &bull; 100% price matched
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {recoveryAlternatives.map((alt) => {
                        const isSelected = selectedAlternativeId === alt.space.id;
                        return (
                          <div
                            key={alt.space.id}
                            onClick={() => setSelectedAlternativeId(alt.space.id)}
                            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                              isSelected
                                ? "bg-amber-50/70 border-amber-400 ring-2 ring-amber-400 shadow-xs"
                                : "bg-white border-neutral-200 hover:border-neutral-300"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0 bg-neutral-100">
                                  <ParkingImage
                                    src={alt.space.images?.[0]}
                                    alt={alt.space.title}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <h4 className="font-bold text-xs text-neutral-900 line-clamp-1">
                                    {alt.space.title}
                                  </h4>
                                  <p className="text-[11px] text-neutral-500 line-clamp-1">
                                    {alt.space.address}
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px]">
                                    <span className="font-bold text-neutral-700">
                                      {alt.distanceMiles} mi (~{alt.walkingMinutes} min walk)
                                    </span>
                                    <span>&bull;</span>
                                    <span className="text-emerald-700 font-semibold">
                                      Clearance: {alt.space.clearanceFeet} ft
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-[11px] font-extrabold text-neutral-900 block">
                                  ₹0 Extra
                                </span>
                                <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                  Price Matched
                                </span>
                              </div>
                            </div>

                            {/* Why recommended reasons */}
                            <div className="mt-2.5 pt-2 border-t border-neutral-100 space-y-1">
                              {alt.recommendationReasons.map((reason, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-[10px] text-neutral-600">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                                  <span>{reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="brand"
                        className="w-full text-xs font-bold"
                        onClick={handleConfirmReplacement}
                        disabled={isConfirmingReplacement || !selectedAlternativeId}
                      >
                        {isConfirmingReplacement ? "Confirming Replacement Space..." : "Confirm Replacement Space & Get Pass"}
                      </Button>
                    </div>

                    <div className="text-center pt-1 border-t border-neutral-100">
                      <button
                        type="button"
                        onClick={handleRequestRefundAndEscalation}
                        className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-800"
                        disabled={isSubmittingReport}
                      >
                        None of these work? Request 100% Instant Refund + ₹500 Credit
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 text-center py-2">
                    <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-neutral-900">
                        No Compatible Spaces Available Nearby
                      </h4>
                      <p className="text-neutral-600 text-[11px] leading-relaxed max-w-sm mx-auto">
                        All nearby parking bays are either currently reserved or do not meet your vehicle height clearance requirements.
                      </p>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-left space-y-2 text-amber-900">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <ShieldCheck className="h-4 w-4 text-amber-600" />
                        <span>ParkMate Guaranteed Resolution</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Under our Booking Recovery policy, when no valid replacement space exists, you are entitled to:
                      </p>
                      <ul className="text-[11px] list-disc list-inside space-y-1 font-semibold">
                        <li>100% Immediate refund of your reservation fee</li>
                        <li>₹500 Inconvenience credit added to your account</li>
                        <li>24/7 Priority support agent dispatch</li>
                      </ul>
                    </div>

                    <Button
                      variant="danger"
                      className="w-full text-xs font-bold"
                      onClick={handleRequestRefundAndEscalation}
                      disabled={isSubmittingReport}
                    >
                      {isSubmittingReport ? "Processing Refund..." : "Authorize 100% Refund & Support Credit"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Replacement Confirmed */}
            {recoveryStep === "confirmed_replacement" && confirmedSpace && (
              <div className="space-y-4 py-2 text-center">
                <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-neutral-900">Replacement Space Confirmed!</h4>
                  <p className="text-xs text-neutral-600">
                    Your reservation has been transferred to {confirmedSpace.title} at ₹0 fee.
                  </p>
                </div>

                <div className="p-4 bg-neutral-900 text-white rounded-3xl text-left space-y-3 font-mono">
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                    <span className="text-[10px] text-neutral-400">NEW PASS CODE</span>
                    <span className="text-lg font-bold text-emerald-400">{newPassPin}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">NEW ADDRESS:</span>
                    <span className="font-bold text-xs text-white block">{confirmedSpace.address}</span>
                  </div>
                  <div className="text-[11px] text-neutral-300 font-sans">
                    Instructions: {confirmedSpace.accessInstructions || "Drive in and scan QR pass or enter PIN."}
                  </div>
                </div>

                <Button
                  variant="brand"
                  className="w-full text-xs font-bold"
                  onClick={() => setRecoveryBooking(null)}
                >
                  Done &bull; View Active Pass
                </Button>
              </div>
            )}

            {/* STEP 4: Refunded & Support Ticket */}
            {recoveryStep === "refunded" && refundInfo && (
              <div className="space-y-4 py-2 text-center">
                <div className="h-14 w-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-neutral-900">Refund &amp; Credit Issued</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {refundInfo.summary}
                  </p>
                </div>

                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 text-left space-y-2 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-sans">Refund Amount:</span>
                    <span className="font-bold text-neutral-900">{formatCurrency(refundInfo.refundAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-sans">ParkMate Credit:</span>
                    <span className="font-bold text-emerald-600">+₹500 Credit</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-sans">Support Ticket:</span>
                    <span className="font-bold text-blue-600">{refundInfo.ticketId}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full text-xs font-bold"
                  onClick={() => setRecoveryBooking(null)}
                >
                  Close &bull; Return to Reservations
                </Button>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
