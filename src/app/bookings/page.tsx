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
  PlusCircle
} from "lucide-react";
import { INITIAL_USER_BOOKINGS, MOCK_RECOVERY_ALTERNATIVES } from "@/lib/mock-data";
import { Booking, ParkingSpace } from "@/types/parking";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { ParkingImage } from "@/components/ui/parking-image";

export default function BookingsPage() {
  const [bookings, setBookings] = React.useState<Booking[]>(INITIAL_USER_BOOKINGS);
  const [activeTab, setActiveTab] = React.useState<"active" | "completed">("active");

  // Extension Modal state
  const [extensionBooking, setExtensionBooking] = React.useState<Booking | null>(null);
  const [extensionHours, setExtensionHours] = React.useState(1);
  const [extensionSuccess, setExtensionSuccess] = React.useState(false);

  // Recovery Modal state
  const [recoveryBooking, setRecoveryBooking] = React.useState<Booking | null>(null);
  const [isRecovering, setIsRecovering] = React.useState(false);
  const [recoveredSpace, setRecoveredSpace] = React.useState<ParkingSpace | null>(null);

  // Digital Pass QR Modal
  const [passModalBooking, setPassModalBooking] = React.useState<Booking | null>(null);

  // Filter bookings by tab
  const displayedBookings = bookings.filter((b) => {
    if (activeTab === "active") return b.status === "active" || b.status === "upcoming" || b.status === "recovered";
    return b.status === "completed" || b.status === "cancelled";
  });

  // Handle Flexible Extension execution
  const handleConfirmExtension = () => {
    if (!extensionBooking) return;
    const additionalCost = extensionBooking.hourlyRate * extensionHours;
    
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === extensionBooking.id) {
          return {
            ...b,
            endTime: `Extended +${extensionHours}hr (Today, 5:00 PM)`,
            totalPrice: b.totalPrice + additionalCost,
          };
        }
        return b;
      })
    );
    setExtensionSuccess(true);
    setTimeout(() => {
      setExtensionSuccess(false);
      setExtensionBooking(null);
    }, 1500);
  };

  // Handle Booking Recovery execution (Differentiator 1)
  const handleTriggerRecovery = () => {
    if (!recoveryBooking) return;
    setIsRecovering(true);

    setTimeout(() => {
      const backup = MOCK_RECOVERY_ALTERNATIVES[0];
      setRecoveredSpace(backup);
      setIsRecovering(false);

      // Update state to recovered space
      setBookings((prev) =>
        prev.map((b) => {
          if (b.id === recoveryBooking.id) {
            return {
              ...b,
              status: "recovered",
              spaceTitle: `[RECOVERED] ${backup.title}`,
              spaceAddress: backup.address,
              spaceImage: backup.images[0],
              accessCode: "REC-PASS-FREE-772",
              recoveryStatus: "recovered",
            };
          }
          return b;
        })
      );
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#222222] tracking-tight">
              My Parking Passes &amp; Bookings
            </h1>
            <p className="text-sm text-[#717171] mt-1">
              Manage your active reservations, digital access passes, and extensions
            </p>
          </div>

          <Link href="/search">
            <Button size="md" className="rounded-full shadow-xs">
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Book Another Space
            </Button>
          </Link>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b border-[#DDDDDD] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeTab === "active"
                ? "bg-[#222222] text-white"
                : "text-[#717171] hover:text-[#222222]"
            }`}
          >
            Active &amp; Upcoming ({bookings.filter(b => b.status === "active" || b.status === "upcoming" || b.status === "recovered").length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeTab === "completed"
                ? "bg-[#222222] text-white"
                : "text-[#717171] hover:text-[#222222]"
            }`}
          >
            Past Bookings ({bookings.filter(b => b.status === "completed" || b.status === "cancelled").length})
          </button>
        </div>

        {/* Bookings List */}
        <div className="space-y-6">
          {displayedBookings.map((booking) => {
            const isActive = booking.status === "active";
            const isRecovered = booking.status === "recovered";

            return (
              <div
                key={booking.id}
                className="rounded-3xl bg-white border border-[#EAEAEA] p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                {/* Left: Image & Info */}
                <div className="flex items-start gap-4">
                  <ParkingImage
                    src={booking.spaceImage}
                    alt={booking.spaceTitle}
                    className="h-24 w-28 rounded-2xl object-cover shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          Active Now
                        </span>
                      )}
                      {isRecovered && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full">
                          <Sparkles className="h-3 w-3" />
                          Recovery Space Reallocated
                        </span>
                      )}
                      <span className="text-xs text-[#717171] font-mono">
                        Booking #{booking.id}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-[#222222]">
                      {booking.spaceTitle}
                    </h3>

                    <p className="text-xs text-[#717171] flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-[#FF5A5F]" />
                      {booking.spaceAddress}
                    </p>

                    <div className="pt-1 flex flex-wrap items-center gap-3 text-xs text-[#222222]">
                      <span className="flex items-center gap-1 font-semibold">
                        <Clock className="h-3.5 w-3.5 text-[#717171]" />
                        {booking.startTime} &rarr; {booking.endTime}
                      </span>
                      <span>&middot;</span>
                      <span className="flex items-center gap-1 text-[#717171]">
                        <Car className="h-3.5 w-3.5" />
                        {booking.vehicleModel} ({booking.licensePlate})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions & QR Pass */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-[#F0F0F0]">
                  {/* Digital Pass Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPassModalBooking(booking)}
                    className="rounded-xl gap-1.5"
                  >
                    <QrCode className="h-4 w-4" />
                    View Entry Pass
                  </Button>

                  {/* Differentiator 3: Flexible Extension Button */}
                  {booking.canExtend && (
                    <Button
                      variant="brand"
                      size="sm"
                      onClick={() => setExtensionBooking(booking)}
                      className="rounded-xl gap-1.5"
                    >
                      <Clock className="h-4 w-4" />
                      Request Extension
                    </Button>
                  )}

                  {/* Differentiator 1: Trigger Booking Recovery Button */}
                  {isActive && !isRecovered && (
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryBooking(booking);
                        setRecoveredSpace(null);
                      }}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Spot Blocked?
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flexible Extension Dialog */}
      <Dialog
        isOpen={!!extensionBooking}
        onClose={() => setExtensionBooking(null)}
        title={extensionSuccess ? "Extension Approved!" : "Flexible Extension Request"}
        description={
          extensionSuccess
            ? "Your reservation time has been extended with zero penalties."
            : `Add extra time to your booking at ${extensionBooking?.spaceTitle}`
        }
      >
        {extensionSuccess ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
            <h4 className="text-base font-bold text-[#222222]">Extra Time Added!</h4>
            <p className="text-xs text-[#717171]">Host calendar successfully updated without conflicts.</p>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Slot is Available</p>
                <p className="text-[11px]">No driver reservation is scheduled right after your booking.</p>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#222222] mb-1.5">
                Select Extra Time:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setExtensionHours(h)}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                      extensionHours === h
                        ? "bg-[#222222] text-white border-[#222222]"
                        : "bg-white border-[#DDDDDD] text-[#717171] hover:border-[#222222]"
                    }`}
                  >
                    +{h} {h === 1 ? "Hour" : "Hours"}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-[#F7F7F7] p-3 space-y-1.5 border border-[#EAEAEA]">
              <div className="flex justify-between">
                <span>Hourly Rate:</span>
                <span className="font-bold">{formatCurrency(extensionBooking?.hourlyRate || 0)} / hr</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-[#FF5A5F] border-t border-[#EAEAEA] pt-1.5">
                <span>Additional Total:</span>
                <span>{formatCurrency((extensionBooking?.hourlyRate || 0) * extensionHours)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="w-1/2"
                onClick={() => setExtensionBooking(null)}
              >
                Cancel
              </Button>
              <Button
                variant="brand"
                className="w-1/2"
                onClick={handleConfirmExtension}
              >
                Confirm Extension
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Booking Recovery Dialog (Differentiator 1) */}
      <Dialog
        isOpen={!!recoveryBooking}
        onClose={() => setRecoveryBooking(null)}
        title="ParkMate Booking Recovery Protection"
        description="If your spot is occupied, blocked, or gate access failed, we rebook you instantly."
      >
        {isRecovering ? (
          <div className="text-center py-8 space-y-4">
            <div className="h-12 w-12 rounded-full border-4 border-[#FF5A5F] border-t-transparent animate-spin mx-auto" />
            <div>
              <h4 className="font-bold text-[#222222]">Locating Nearby Backup Space...</h4>
              <p className="text-xs text-[#717171]">Matching clearance requirements &amp; proximity...</p>
            </div>
          </div>
        ) : recoveredSpace ? (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span className="font-extrabold text-sm">Backup Space Unlocked!</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                We have assigned you to our priority partner space with zero fee difference.
              </p>
            </div>

            <div className="border border-[#DDDDDD] rounded-2xl p-4 bg-white flex gap-3">
              <ParkingImage
                src={recoveredSpace.images[0]}
                alt={recoveredSpace.title}
                className="h-20 w-20 rounded-xl object-cover shrink-0"
              />
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-[#222222]">{recoveredSpace.title}</h4>
                <p className="text-[11px] text-[#717171]">{recoveredSpace.address}</p>
                <p className="text-[11px] font-bold text-emerald-600">{recoveredSpace.walkingDistance}</p>
              </div>
            </div>

            <Button
              variant="brand"
              className="w-full"
              onClick={() => setRecoveryBooking(null)}
            >
              Done &amp; Open Digital Pass
            </Button>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <p className="text-[#717171] leading-relaxed">
              Are you at <span className="font-bold text-[#222222]">{recoveryBooking?.spaceAddress}</span> and unable to park?
            </p>

            <div className="space-y-2">
              <label className="font-bold text-[#222222]">What happened?</label>
              <select className="w-full p-2.5 rounded-xl border border-[#DDDDDD] bg-white text-xs">
                <option>Another unauthorized car is in the space</option>
                <option>Keypad or gate code did not unlock barrier</option>
                <option>Host is unresponsive</option>
                <option>Vehicle clearance is unexpectedly too low</option>
              </select>
            </div>

            <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-[11px] flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
              <span>Recovery protection will immediately provision an alternative space within 3 minutes walk.</span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="w-1/2"
                onClick={() => setRecoveryBooking(null)}
              >
                Nevermind
              </Button>
              <Button
                variant="danger"
                className="w-1/2"
                onClick={handleTriggerRecovery}
              >
                Trigger Recovery
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Digital QR Entry Pass Modal */}
      <Dialog
        isOpen={!!passModalBooking}
        onClose={() => setPassModalBooking(null)}
        title="ParkMate Digital Access Pass"
        description="Hold this pass to entry scanner or show attendant"
      >
        <div className="text-center py-4 space-y-4">
          <div className="p-6 bg-white border-2 border-dashed border-[#222222] rounded-3xl inline-block shadow-sm">
            <QrCode className="h-36 w-36 text-[#222222] mx-auto" />
            <span className="block font-mono font-bold text-sm mt-3 tracking-widest text-[#222222]">
              {passModalBooking?.accessCode}
            </span>
          </div>

          <div className="text-xs text-[#717171] space-y-1">
            <p className="font-bold text-[#222222]">{passModalBooking?.spaceTitle}</p>
            <p>{passModalBooking?.spaceAddress}</p>
            <p className="text-[11px] text-emerald-600 font-semibold">
              Vehicle Registered: {passModalBooking?.vehicleModel} ({passModalBooking?.licensePlate})
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full rounded-full"
            onClick={() => setPassModalBooking(null)}
          >
            Close Pass
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
