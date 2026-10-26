"use client";

import * as React from "react";
import Link from "next/link";
import { 
  TrendingUp, 
  DollarSign, 
  Plus, 
  ToggleLeft, 
  ToggleRight, 
  Sparkles, 
  ShieldCheck, 
  ArrowUpRight, 
  BarChart3, 
  CalendarCheck2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ParkingImage } from "@/components/ui/parking-image";
import { useAuth } from "@/lib/auth-context";
import { ParkingSpace, VehicleType, SpaceCategory } from "@/types/parking";

const DEFAULT_OWNER_SPACES: ParkingSpace[] = [
  {
    id: "sp-101",
    title: "Downtown Secure Garage Bay A12",
    description: "High speed gated garage.",
    address: "245 Market St",
    neighborhood: "Financial District",
    city: "San Francisco",
    coordinates: { lat: 37.7915, lng: -122.3995 },
    pricePerHour: 7.50,
    pricePerDay: 42.00,
    category: "covered",
    images: ["https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=400&q=80"],
    rating: 4.95,
    reviewCount: 128,
    isCovered: true,
    hasEvCharging: true,
    isVerified: true,
    isDemoSeed: true,
    walkingDistance: "2 min walk",
    maxVehicleType: "suv",
    clearanceFeet: 7.2,
    accessType: "qr_scanner",
    accessInstructions: "Scan pass",
    securityFeatures: ["CCTV", "Bright Lights"],
    host: { name: "Marcus Vance", avatar: "", rating: 4.98, joinedYear: 2023, responseTime: "5m", isSuperhost: true },
    rules: [],
    recoveryGuaranteed: true,
    flexibleExtensionSupported: true,
    availableSlotsCount: 1,
  },
  {
    id: "sp-102",
    title: "Residential Paved Driveway (Nob Hill)",
    description: "Private residential driveway with Tesla wall connector.",
    address: "712 Pine Ave",
    neighborhood: "Nob Hill",
    city: "San Francisco",
    coordinates: { lat: 37.7910, lng: -122.4110 },
    pricePerHour: 5.00,
    pricePerDay: 28.00,
    category: "ev_charging",
    images: ["https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=400&q=80"],
    rating: 4.88,
    reviewCount: 64,
    isCovered: false,
    hasEvCharging: true,
    isVerified: true,
    isDemoSeed: true,
    walkingDistance: "5 min walk",
    maxVehicleType: "truck",
    clearanceFeet: 12.0,
    accessType: "instant_keypad",
    accessInstructions: "Park in bay",
    securityFeatures: ["Ring Cam"],
    host: { name: "Elena Rostova", avatar: "", rating: 4.92, joinedYear: 2024, responseTime: "5m", isSuperhost: true },
    rules: [],
    recoveryGuaranteed: true,
    flexibleExtensionSupported: true,
    availableSlotsCount: 1,
  },
];

export default function OwnerDashboardPage() {
  const { user } = useAuth();
  const [smartShareActive, setSmartShareActive] = React.useState(true);
  const [demandMultiplier] = React.useState(1.4);
  const [selectedDays, setSelectedDays] = React.useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [shareStart, setShareStart] = React.useState("08:30");
  const [shareEnd, setShareEnd] = React.useState("17:30");
  const [spacePausedMap, setSpacePausedMap] = React.useState<Record<string, boolean>>({});

  // Listings state
  const [listings, setListings] = React.useState<ParkingSpace[]>(DEFAULT_OWNER_SPACES);

  // Add Space Modal state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [newAddress, setNewAddress] = React.useState("");
  const [newNeighborhood, setNewNeighborhood] = React.useState("Financial District");
  const [newPricePerHour, setNewPricePerHour] = React.useState("6.50");
  const [newClearanceFeet, setNewClearanceFeet] = React.useState("7.5");
  const [newCategory, setNewCategory] = React.useState<SpaceCategory>("covered");
  const [newMaxVehicle, setNewMaxVehicle] = React.useState<VehicleType>("suv");
  const [newPhotoUrl, setNewPhotoUrl] = React.useState(
    "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80"
  );
  const [isSubmittingNewSpace, setIsSubmittingNewSpace] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);
  const [addSuccess, setAddSuccess] = React.useState(false);

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  React.useEffect(() => {
    let active = true;
    async function init() {
      try {
        const res = await fetch("/api/listings?owner=me");
        if (res.ok) {
          const data = await res.json();
          if (active && data.data && data.data.length > 0) {
            setListings(data.data);
          }
        }
      } catch {
        // Keep defaults
      }
    }
    init();
    return () => {
      active = false;
    };
  }, [user]);

  const toggleSpacePause = async (spaceId: string) => {
    const isCurrentlyPaused = spacePausedMap[spaceId] ?? false;
    const nextState = !isCurrentlyPaused;
    setSpacePausedMap((prev) => ({ ...prev, [spaceId]: nextState }));

    try {
      await fetch(`/api/listings/${spaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicationStatus: nextState ? "paused" : "published",
        }),
      });
    } catch {
      // Optimistic update
    }
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingNewSpace(true);
    setAddError(null);

    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          address: newAddress,
          neighborhood: newNeighborhood,
          city: "San Francisco",
          latitude: 37.7749,
          longitude: -122.4194,
          pricePerHour: parseFloat(newPricePerHour),
          pricePerDay: parseFloat(newPricePerHour) * 6.5,
          category: newCategory,
          photos: [newPhotoUrl],
          isCovered: newCategory === "covered",
          hasEvCharging: newCategory === "ev_charging",
          clearanceFeet: parseFloat(newClearanceFeet),
          maxVehicleType: newMaxVehicle,
          accessType: "instant_keypad",
          accessInstructions: "Park in reserved space. Keycode provided upon booking.",
          securityFeatures: ["CCTV Security", "Bright Lighting"],
          rules: ["No overnight idling", "Display ParkMate Pass"],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setAddError(data.error || "Failed to create listing.");
        setIsSubmittingNewSpace(false);
        return;
      }

      setAddSuccess(true);
      if (data.space) {
        setListings((prev) => [data.space, ...prev]);
      }
      setTimeout(() => {
        setIsAddModalOpen(false);
        setAddSuccess(false);
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error creating space.";
      setAddError(message);
    } finally {
      setIsSubmittingNewSpace(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              Owner &amp; Space Host Hub
            </div>
            <h1 className="text-3xl font-extrabold text-[#222222] tracking-tight">
              Host Performance &amp; Space Management
            </h1>
            <p className="text-sm text-[#717171] mt-1">
              Automate driveway sharing, optimize surge pricing, and track monthly payouts
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/search">
              <Button variant="outline" size="sm" className="rounded-full">
                View Public Listings
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="rounded-full shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add New Parking Space
            </Button>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="rounded-3xl bg-white p-6 border border-[#EAEAEA] shadow-xs">
            <div className="flex items-center justify-between text-[#717171] mb-2 text-xs font-bold uppercase tracking-wider">
              <span>Monthly Earnings</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-[#222222]">$1,248.50</p>
            <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-2">
              <ArrowUpRight className="h-3.5 w-3.5" /> +18.4% vs last month
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 border border-[#EAEAEA] shadow-xs">
            <div className="flex items-center justify-between text-[#717171] mb-2 text-xs font-bold uppercase tracking-wider">
              <span>Occupancy Rate</span>
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <BarChart3 className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-[#222222]">87.2%</p>
            <p className="text-xs text-blue-600 font-semibold flex items-center gap-1 mt-2">
              <TrendingUp className="h-3.5 w-3.5" /> High demand corridor
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 border border-[#EAEAEA] shadow-xs">
            <div className="flex items-center justify-between text-[#717171] mb-2 text-xs font-bold uppercase tracking-wider">
              <span>Reservations</span>
              <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CalendarCheck2 className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-[#222222]">42</p>
            <p className="text-xs text-[#717171] mt-2">Active this billing cycle</p>
          </div>

          <div className="rounded-3xl bg-white p-6 border border-[#EAEAEA] shadow-xs">
            <div className="flex items-center justify-between text-[#717171] mb-2 text-xs font-bold uppercase tracking-wider">
              <span>Host Reputation</span>
              <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-[#222222]">4.95 &#9733;</p>
            <p className="text-xs text-emerald-600 font-semibold mt-2">Superhost Verified</p>
          </div>
        </div>

        {/* 2 Feature Cards: Smart Commute Auto-Share & Demand Prediction */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
          {/* Differentiator 3: Smart Commute Auto-Share Schedule */}
          <div className="rounded-3xl bg-white p-7 border border-[#EAEAEA] shadow-xs space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full mb-1.5">
                  <Sparkles className="h-3 w-3" />
                  Differentiator 3
                </div>
                <h3 className="text-xl font-extrabold text-[#222222]">
                  Smart Commute Auto-Share
                </h3>
                <p className="text-xs text-[#717171] mt-0.5">
                  Monetize your empty driveway automatically during your work commute hours.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSmartShareActive(!smartShareActive)}
                className="focus:outline-none"
              >
                {smartShareActive ? (
                  <ToggleRight className="h-8 w-8 text-[#FF5A5F]" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-[#999999]" />
                )}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#222222] mb-2">
                  Active Share Days:
                </label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => {
                    const isSelected = selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`h-9 w-11 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-[#222222] text-white"
                            : "bg-[#F7F7F7] text-[#717171] hover:bg-[#EAEAEA]"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#222222] mb-1">
                    Opens At (When You Leave):
                  </label>
                  <input
                    type="time"
                    value={shareStart}
                    onChange={(e) => setShareStart(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-[#DDDDDD] p-2.5 bg-[#F7F7F7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#222222] mb-1">
                    Closes At (When You Return):
                  </label>
                  <input
                    type="time"
                    value={shareEnd}
                    onChange={(e) => setShareEnd(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-[#DDDDDD] p-2.5 bg-[#F7F7F7]"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-purple-50 p-4 border border-purple-100 text-xs text-purple-900 space-y-1">
                <p className="font-bold">Protected Return Guarantee</p>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  Drivers cannot book past {shareEnd}. If an unexpected extension is requested, the system automatically redirects them to a nearby recovery partner so your space is guaranteed free when you get home.
                </p>
              </div>
            </div>
          </div>

          {/* Differentiator 4: Demand Prediction & Dynamic Pricing */}
          <div className="rounded-3xl bg-white p-7 border border-[#EAEAEA] shadow-xs space-y-6">
            <div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full mb-1.5">
                <TrendingUp className="h-3 w-3" />
                Differentiator 4
              </div>
              <h3 className="text-xl font-extrabold text-[#222222]">
                Demand Prediction &amp; Dynamic Pricing
              </h3>
              <p className="text-xs text-[#717171] mt-0.5">
                Estimated demand based on event schedules, weather, and commuter flow.
              </p>
            </div>

            <div className="rounded-2xl bg-[#F7F7F7] p-4 border border-[#EAEAEA] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#222222] block">Current Demand Multiplier:</span>
                  <span className="text-2xl font-extrabold text-amber-600">+{Math.round((demandMultiplier - 1) * 100)}% Surge</span>
                </div>
                <Badge variant="warning">High Demand Predicted</Badge>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#EAEAEA]">
                <p className="text-xs font-bold text-[#222222]">Upcoming Local Catalysts:</p>
                <div className="space-y-1.5 text-xs text-[#717171]">
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-[#EAEAEA]">
                    <span>Chase Center: Warriors vs Celtics</span>
                    <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px]">Tomorrow 7:30 PM (+35%)</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-[#EAEAEA]">
                    <span>Moscone Tech Summit (12k attendees)</span>
                    <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px]">Thu - Fri (+45%)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-[#717171]">Recommended Price:</span>
              <span className="font-extrabold text-base text-[#222222]">$7.50 &rarr; $10.50/hr</span>
            </div>
          </div>
        </div>

        {/* Active Spaces Table / Manager */}
        <div className="rounded-3xl bg-white border border-[#EAEAEA] p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-[#222222]">Your Listed Spaces</h3>
            <span className="text-xs text-[#717171]">{listings.length} managed spaces</span>
          </div>

          <div className="divide-y divide-[#F0F0F0] text-xs">
            {listings.map((space) => {
              const isPaused = spacePausedMap[space.id] ?? false;
              return (
                <div
                  key={space.id}
                  className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <ParkingImage
                      src={space.images?.[0] || "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=400&q=80"}
                      alt={space.title}
                      className="h-14 w-16 rounded-xl object-cover"
                    />
                    <div>
                      <h4 className="font-bold text-[#222222] text-sm">{space.title}</h4>
                      <p className="text-[#717171]">
                        {space.address} &middot; Clearance: {space.clearanceFeet} ft &middot; Max: {space.maxVehicleType.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSpacePause(space.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-colors ${
                        isPaused
                          ? "bg-amber-50 text-amber-800 border-amber-300"
                          : "bg-[#222222] text-white border-[#222222]"
                      }`}
                    >
                      {isPaused ? "Paused" : "Active & Accepting"}
                    </button>
                    <span className="font-extrabold text-sm">${space.pricePerHour.toFixed(2)} / hr</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add New Parking Space Dialog */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Parking Space"
        description="Publish a verified parking spot to the ParkMate marketplace."
      >
        {addSuccess ? (
          <div className="text-center py-6 space-y-3">
            <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-base font-bold text-[#222222]">Listing Published!</h4>
            <p className="text-xs text-[#717171]">
              Your space has been verified and is now live for drivers to discover.
            </p>
          </div>
        ) : (
          <form onSubmit={handleCreateSpace} className="space-y-4 text-xs">
            {addError && (
              <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs flex items-center gap-2 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{addError}</span>
              </div>
            )}

            <div>
              <label className="block font-bold text-[#222222] mb-1">Space Title</label>
              <Input
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Secure Downtown Driveway near Financial District"
              />
            </div>

            <div>
              <label className="block font-bold text-[#222222] mb-1">Street Address</label>
              <Input
                required
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="e.g. 150 Fremont St, San Francisco"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#222222] mb-1">Neighborhood</label>
                <select
                  value={newNeighborhood}
                  onChange={(e) => setNewNeighborhood(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-[#DDDDDD] p-2.5 bg-white"
                >
                  <option value="Financial District">Financial District</option>
                  <option value="Nob Hill">Nob Hill</option>
                  <option value="SoMa">SoMa</option>
                  <option value="Mission">Mission District</option>
                  <option value="Airport">Airport Corridor</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-1">Space Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as SpaceCategory)}
                  className="w-full text-xs font-semibold rounded-xl border border-[#DDDDDD] p-2.5 bg-white"
                >
                  <option value="covered">Covered / Garage</option>
                  <option value="ev_charging">EV Charging Included</option>
                  <option value="daily">Daily Commuter</option>
                  <option value="event">Event Arena Parking</option>
                  <option value="airport">Airport Parking</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-[#222222] mb-1">Price / hr ($)</label>
                <Input
                  type="number"
                  step="0.5"
                  required
                  value={newPricePerHour}
                  onChange={(e) => setNewPricePerHour(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-1">Clearance (ft)</label>
                <Input
                  type="number"
                  step="0.1"
                  required
                  value={newClearanceFeet}
                  onChange={(e) => setNewClearanceFeet(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-1">Max Vehicle</label>
                <select
                  value={newMaxVehicle}
                  onChange={(e) => setNewMaxVehicle(e.target.value as VehicleType)}
                  className="w-full text-xs font-semibold rounded-xl border border-[#DDDDDD] p-2.5 bg-white"
                >
                  <option value="compact">Compact</option>
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="truck">Truck / Van</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#222222] mb-1">Detailed Description</label>
              <textarea
                required
                rows={3}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Describe access instructions, security gates, charger speed, and proximity to landmarks."
                className="w-full text-xs rounded-xl border border-[#DDDDDD] p-2.5 bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-[#222222] mb-1">Space Photo URL</label>
              <Input
                required
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="pt-2 flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-1/2"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmittingNewSpace}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="brand"
                className="w-1/2"
                disabled={isSubmittingNewSpace}
              >
                {isSubmittingNewSpace ? "Publishing..." : "Publish Space"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
