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
  AlertCircle,
  Calendar,
  Clock,
  Car,
  Eye,
  Edit3,
  AlertTriangle,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ParkingImage } from "@/components/ui/parking-image";
import { useAuth } from "@/lib/auth-context";
import { ParkingSpace } from "@/types/parking";

interface OwnerOverviewStats {
  totalEarnings: number;
  pendingPayout: number;
  activeSpacesCount: number;
  totalSpacesCount: number;
  totalBookingsCount: number;
  completedCount: number;
  activeOrUpcomingCount: number;
  averageHourlyYield: number;
}

interface OwnerBookingItem {
  id: string;
  bookingReference: string;
  spaceId: string;
  spaceTitle: string;
  spaceAddress: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  driverEmail: string;
  driverAvatar: string;
  startTime: string;
  endTime: string;
  hourlyRate: number;
  hostPayout: number;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  vehicleModel: string;
  vehicleType: string;
  licensePlate: string;
  accessCode: string;
  canExtend: boolean;
  recoveryStatus: string;
  createdAt: string;
}

interface AvailabilityRuleItem {
  id: string;
  space_id: string;
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  is_blocked: boolean;
  specific_date: string | null;
  reason: string | null;
}

interface ConflictDetail {
  bookingReference: string;
  startTime: string;
  endTime: string;
  vehicleModel?: string;
  driverName?: string;
}

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
    pricePerMonth: 420.00,
    category: "covered",
    images: ["https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=400&q=80"],
    rating: 4.95,
    reviewCount: 128,
    isCovered: true,
    hasEvCharging: true,
    isVerified: true,
    isDemoSeed: true,
    publicationStatus: "published",
    verificationStatus: "verified",
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
    pricePerMonth: 320.00,
    category: "ev_charging",
    images: ["https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=400&q=80"],
    rating: 4.88,
    reviewCount: 64,
    isCovered: false,
    hasEvCharging: true,
    isVerified: true,
    isDemoSeed: true,
    publicationStatus: "published",
    verificationStatus: "verified",
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
  const [activeTab, setActiveTab] = React.useState<"overview" | "spaces" | "availability" | "bookings">("spaces");
  const [filterStatus, setFilterStatus] = React.useState<"all" | "published" | "draft" | "paused">("all");

  // Overview stats & records
  const [stats, setStats] = React.useState<OwnerOverviewStats>({
    totalEarnings: 2840.50,
    pendingPayout: 320.00,
    activeSpacesCount: 2,
    totalSpacesCount: 2,
    totalBookingsCount: 42,
    completedCount: 38,
    activeOrUpcomingCount: 4,
    averageHourlyYield: 6.25,
  });
  const [listings, setListings] = React.useState<ParkingSpace[]>(DEFAULT_OWNER_SPACES);
  const [bookings, setBookings] = React.useState<OwnerBookingItem[]>([]);
  // Smart commute toggle
  const [smartShareActive, setSmartShareActive] = React.useState(true);
  const [selectedDays, setSelectedDays] = React.useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [shareStart, setShareStart] = React.useState("08:30");
  const [shareEnd, setShareEnd] = React.useState("17:30");

  // Price Edit Modal
  const [editingPriceSpace, setEditingPriceSpace] = React.useState<ParkingSpace | null>(null);
  const [editPricePerHour, setEditPricePerHour] = React.useState("");
  const [editPricePerDay, setEditPricePerDay] = React.useState("");
  const [editPricePerMonth, setEditPricePerMonth] = React.useState("");
  const [isUpdatingPrice, setIsUpdatingPrice] = React.useState(false);

  // Availability Management State
  const [selectedSpaceForRules, setSelectedSpaceForRules] = React.useState<string>("");
  const [spaceRules, setSpaceRules] = React.useState<AvailabilityRuleItem[]>([]);
  const [isBlockingDate, setIsBlockingDate] = React.useState(false);
  const [newBlockDate, setNewBlockDate] = React.useState("");
  const [newBlockReason, setNewBlockReason] = React.useState("Driveway maintenance");
  const [conflictError, setConflictError] = React.useState<{ message: string; detail?: ConflictDetail } | null>(null);

  // Verification Review Simulation
  const [verifyingSpaceId, setVerifyingSpaceId] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Fetch real overview data from Supabase
  const loadOverviewData = React.useCallback(async () => {
    try {
      const res = await fetch("/api/owner/overview");
      if (res.ok) {
        const data = await res.json();
        if (data.stats) {
          setStats(data.stats);
        }
        if (data.listings && data.listings.length > 0) {
          setListings(data.listings);
          setSelectedSpaceForRules((curr) => curr || data.listings[0].id);
        }
        if (data.upcomingBookings) {
          setBookings(data.upcomingBookings);
        }
      }
    } catch {
      // Keep defaults
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    async function init() {
      try {
        const res = await fetch("/api/owner/overview");
        if (res.ok) {
          const data = await res.json();
          if (!active) return;
          if (data.stats) setStats(data.stats);
          if (data.listings && data.listings.length > 0) {
            setListings(data.listings);
            setSelectedSpaceForRules((curr) => curr || data.listings[0].id);
          }
          if (data.upcomingBookings) setBookings(data.upcomingBookings);
        }
      } catch {
        // Fallback
      }
    }
    init();
    return () => {
      active = false;
    };
  }, [user]);

  // Load availability rules when selected space changes
  React.useEffect(() => {
    if (!selectedSpaceForRules) return;
    let active = true;

    async function fetchRules() {
      try {
        const res = await fetch(`/api/owner/availability?spaceId=${selectedSpaceForRules}`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.rules) {
            setSpaceRules(data.rules);
          }
        }
      } catch {
        // Fallback
      }
    }
    fetchRules();
    return () => {
      active = false;
    };
  }, [selectedSpaceForRules]);

  // Toggle Space Pause / Unpause
  const toggleSpacePause = async (spaceId: string) => {
    const space = listings.find((s) => s.id === spaceId);
    if (!space) return;

    const currentStatus = space.publicationStatus || "published";
    const nextStatus = currentStatus === "paused" ? "published" : "paused";

    // Optimistic update
    setListings((prev) =>
      prev.map((s) => (s.id === spaceId ? { ...s, publicationStatus: nextStatus } : s))
    );

    try {
      const res = await fetch(`/api/listings/${spaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicationStatus: nextStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        setToastMessage({ type: "error", text: err.error || "Failed to update publication status." });
        loadOverviewData();
      } else {
        setToastMessage({
          type: "success",
          text: `Listing ${nextStatus === "paused" ? "paused (hidden from search)" : "reactivated & live on marketplace"}.`,
        });
      }
    } catch {
      loadOverviewData();
    }
  };

  // Open Price Edit Modal
  const handleOpenPriceModal = (space: ParkingSpace) => {
    setEditingPriceSpace(space);
    setEditPricePerHour(space.pricePerHour.toFixed(2));
    setEditPricePerDay(space.pricePerDay.toFixed(2));
    setEditPricePerMonth(space.pricePerMonth ? space.pricePerMonth.toFixed(2) : (space.pricePerHour * 55).toFixed(2));
  };

  // Save Price Edits to Supabase
  const handleSavePriceEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPriceSpace) return;

    setIsUpdatingPrice(true);
    try {
      const res = await fetch(`/api/listings/${editingPriceSpace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pricePerHour: parseFloat(editPricePerHour),
          pricePerDay: parseFloat(editPricePerDay),
          pricePerMonth: parseFloat(editPricePerMonth) || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setToastMessage({ type: "error", text: data.error || "Failed to update pricing." });
        return;
      }

      setToastMessage({ type: "success", text: "Pricing updated successfully in Supabase." });
      setEditingPriceSpace(null);
      loadOverviewData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving prices";
      setToastMessage({ type: "error", text: msg });
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  // Add Blocked Period with strict conflict checking
  const handleAddBlockedPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpaceForRules || !newBlockDate) return;

    setIsBlockingDate(true);
    setConflictError(null);

    try {
      const res = await fetch("/api/owner/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "block_period",
          spaceId: selectedSpaceForRules,
          date: newBlockDate,
          startTime: "00:00:00",
          endTime: "23:59:59",
          reason: newBlockReason || "Owner reserved / maintenance",
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // Silently conflict prevented! Show explicit conflict alert to owner
        setConflictError({
          message: data.error || "Cannot block availability due to conflicting booking.",
          detail: data.conflict,
        });
        return;
      }

      if (!res.ok) {
        setToastMessage({ type: "error", text: data.error || "Failed to schedule blocked period." });
        return;
      }

      setToastMessage({
        type: "success",
        text: "Blocked date saved successfully! Verified 0 conflicts with existing driver bookings.",
      });
      setNewBlockDate("");
      // Refresh rules
      const rulesRes = await fetch(`/api/owner/availability?spaceId=${selectedSpaceForRules}`);
      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setSpaceRules(rulesData.rules || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add blocked period";
      setToastMessage({ type: "error", text: msg });
    } finally {
      setIsBlockingDate(false);
    }
  };

  // Remove Availability Rule / Unblock Date
  const handleRemoveRule = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/owner/availability?ruleId=${ruleId}&spaceId=${selectedSpaceForRules}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        setToastMessage({ type: "error", text: err.error || "Failed to remove rule." });
        return;
      }

      setSpaceRules((prev) => prev.filter((r) => r.id !== ruleId));
      setToastMessage({ type: "success", text: "Availability rule removed." });
    } catch {
      setToastMessage({ type: "error", text: "Network error removing rule." });
    }
  };

  // Admin Verification Simulation
  const handleSimulateVerification = async (spaceId: string) => {
    setVerifyingSpaceId(spaceId);
    try {
      const res = await fetch("/api/owner/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId,
          status: "verified",
          adminNotes: "Admin verified property title, coordinates, and clear driveway access.",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setToastMessage({ type: "error", text: data.error || "Verification update failed." });
        return;
      }

      setToastMessage({
        type: "success",
        text: "Listing verified by Admin Review! Green Verified Shield badge is now active.",
      });
      loadOverviewData();
    } catch {
      setToastMessage({ type: "error", text: "Verification network error." });
    } finally {
      setVerifyingSpaceId(null);
    }
  };

  // Filter listings
  const filteredListings = listings.filter((s) => {
    if (filterStatus === "all") return true;
    return (s.publicationStatus || "published") === filterStatus;
  });

  return (
    <div className="min-h-screen bg-[#F7F7F7] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-xs">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              Owner &amp; Space Host Hub &bull; Real Supabase Backend
            </div>
            <h1 className="text-3xl font-black text-[#222222] tracking-tight">
              Host Performance &amp; Space Management
            </h1>
            <p className="text-sm text-[#717171] mt-1">
              Automate parking reservations, inspect upcoming drivers, and manage calendar availability.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/owner/new-listing">
              <Button size="sm" className="rounded-full shadow-xs px-5 font-bold">
                <Plus className="h-4 w-4 mr-1.5" />
                List New Space (8-Step Wizard)
              </Button>
            </Link>
            <Link href="/search">
              <Button variant="outline" size="sm" className="rounded-full">
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                Public Marketplace
              </Button>
            </Link>
          </div>
        </div>

        {/* Global Toast / Alerts */}
        {toastMessage && (
          <div
            className={`p-4 rounded-2xl border text-sm flex items-center justify-between gap-3 ${
              toastMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-xs font-bold uppercase tracking-wider hover:opacity-75"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 4 Real Metric Cards based on Booking Records */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="rounded-3xl bg-white p-6 border border-[#EAEAEA] shadow-xs">
            <div className="flex items-center justify-between text-[#717171] mb-2 text-xs font-bold uppercase tracking-wider">
              <span>Gross Host Earnings</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-[#222222]">
              ${stats.totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-2">
              <ArrowUpRight className="h-3.5 w-3.5" /> Verified paid reservations
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 border border-[#EAEAEA] shadow-xs">
            <div className="flex items-center justify-between text-[#717171] mb-2 text-xs font-bold uppercase tracking-wider">
              <span>Pending Payout</span>
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <BarChart3 className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-[#222222]">
              ${stats.pendingPayout.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-blue-600 font-semibold flex items-center gap-1 mt-2">
              <Clock className="h-3.5 w-3.5" /> Active &amp; upcoming bookings
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 border border-[#EAEAEA] shadow-xs">
            <div className="flex items-center justify-between text-[#717171] mb-2 text-xs font-bold uppercase tracking-wider">
              <span>Active Spaces</span>
              <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Car className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-[#222222]">{stats.activeSpacesCount}</p>
            <p className="text-xs text-[#717171] mt-2">
              {stats.totalSpacesCount} total registered ({stats.totalSpacesCount - stats.activeSpacesCount} draft/paused)
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 border border-[#EAEAEA] shadow-xs">
            <div className="flex items-center justify-between text-[#717171] mb-2 text-xs font-bold uppercase tracking-wider">
              <span>Reservations Completed</span>
              <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <CalendarCheck2 className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-[#222222]">{stats.totalBookingsCount}</p>
            <p className="text-xs text-emerald-600 font-semibold mt-2">Superhost Standing</p>
          </div>
        </div>

        {/* Dashboard Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-neutral-200 pb-2 overflow-x-auto">
          {[
            { id: "spaces", label: "My Spaces & Pricing", count: listings.length },
            { id: "availability", label: "Availability Calendar & Exceptions", count: spaceRules.length },
            { id: "bookings", label: "Upcoming Bookings & Drivers", count: bookings.length },
            { id: "overview", label: "Commute Auto-Share & Surge", count: null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === tab.id
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                    activeTab === tab.id ? "bg-neutral-700 text-white" : "bg-neutral-100 text-neutral-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB 1: Spaces & Listings Management */}
        {activeTab === "spaces" && (
          <div className="space-y-6">
            {/* Filter Sub-Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                {[
                  { id: "all", label: "All Spaces" },
                  { id: "published", label: "Active & Published" },
                  { id: "draft", label: "Drafts" },
                  { id: "paused", label: "Paused" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterStatus(f.id as typeof filterStatus)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      filterStatus === f.id
                        ? "bg-neutral-200 text-neutral-900 font-bold"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <Link href="/owner/new-listing">
                <Button size="sm" className="rounded-full shadow-xs text-xs font-bold">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create New Space Draft
                </Button>
              </Link>
            </div>

            {/* Spaces Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((space) => {
                const pubStatus = space.publicationStatus || "published";
                const isDraft = pubStatus === "draft";
                const isPaused = pubStatus === "paused";
                const isVerified = space.isVerified;

                return (
                  <div
                    key={space.id}
                    className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Space Image & Status Badges */}
                      <div className="relative aspect-video w-full bg-neutral-100 overflow-hidden">
                        <ParkingImage
                          src={space.images?.[0] || "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=400&q=80"}
                          alt={space.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                          {isDraft ? (
                            <Badge className="bg-amber-500 text-white font-bold text-[10px]">
                              Draft (Step {space.draftStep || 1}/8)
                            </Badge>
                          ) : isPaused ? (
                            <Badge className="bg-neutral-600 text-white font-bold text-[10px]">
                              Paused
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                              Live &amp; Accepting
                            </Badge>
                          )}
                        </div>

                        <div className="absolute top-3 right-3">
                          {isVerified ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Deed Verified
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Pending Verification
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 space-y-3">
                        <div>
                          <h3 className="font-extrabold text-base text-[#222222] line-clamp-1">
                            {space.title}
                          </h3>
                          <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">
                            {space.address}, {space.neighborhood}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-semibold">
                            {space.category.toUpperCase()}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-semibold">
                            Max {space.maxVehicleType.toUpperCase()}
                          </span>
                          {space.isCovered && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                              Covered
                            </span>
                          )}
                          {space.hasEvCharging && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold">
                              EV
                            </span>
                          )}
                        </div>

                        {/* Pricing Row */}
                        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-black text-sm text-[#222222]">
                              ${space.pricePerHour.toFixed(2)}
                            </span>
                            <span className="text-neutral-500 font-normal"> / hr</span>
                          </div>
                          <div>
                            <span className="font-black text-sm text-[#222222]">
                              ${space.pricePerDay.toFixed(2)}
                            </span>
                            <span className="text-neutral-500 font-normal"> / day</span>
                          </div>
                          {space.pricePerMonth && (
                            <div>
                              <span className="font-black text-sm text-[#222222]">
                                ${space.pricePerMonth.toFixed(2)}
                              </span>
                              <span className="text-neutral-500 font-normal"> / mo</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        {isDraft ? (
                          <Link href={`/owner/new-listing?draftId=${space.id}`} className="flex-1">
                            <Button size="sm" className="w-full rounded-full text-xs font-bold">
                              Resume Draft &rarr;
                            </Button>
                          </Link>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleSpacePause(space.id)}
                              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold border transition ${
                                isPaused
                                  ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                                  : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100"
                              }`}
                            >
                              {isPaused ? "Reactivate" : "Pause"}
                            </button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPriceModal(space)}
                              className="rounded-full text-xs font-semibold"
                            >
                              <Edit3 className="w-3.5 h-3.5 mr-1" />
                              Price
                            </Button>

                            <Link href={`/listings/${space.id}`}>
                              <Button variant="ghost" size="sm" className="rounded-full text-xs">
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          </>
                        )}
                      </div>

                      {/* Admin Verification Placeholder Review Button */}
                      {!isVerified && !isDraft && (
                        <button
                          type="button"
                          onClick={() => handleSimulateVerification(space.id)}
                          disabled={verifyingSpaceId === space.id}
                          className="w-full text-center py-1.5 px-2 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition flex items-center justify-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                          {verifyingSpaceId === space.id
                            ? "Approving Deed..."
                            : "Simulate Admin Verification Approval"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Availability Calendar & Conflict Prevention */}
        {activeTab === "availability" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#222222] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-neutral-900" />
                  Availability Rules, Exceptions &amp; Conflict Prevention
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Manage recurring access schedules and add blocked periods. Overlapping confirmed bookings are strictly protected.
                </p>
              </div>

              {/* Space Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-neutral-600">Select Space:</label>
                <select
                  value={selectedSpaceForRules}
                  onChange={(e) => setSelectedSpaceForRules(e.target.value)}
                  className="rounded-xl border border-neutral-200 p-2 text-xs font-bold bg-white"
                >
                  {listings.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Conflict Alert Banner (If owner tried to block a booked time) */}
            {conflictError && (
              <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <h4 className="font-black text-sm">Availability Conflict Prevented</h4>
                    <p className="text-xs leading-relaxed font-semibold text-rose-800">
                      {conflictError.message}
                    </p>
                    {conflictError.detail && (
                      <div className="mt-2 p-3 rounded-xl bg-white/80 border border-rose-200 text-xs space-y-1">
                        <p><span className="font-bold">Booking Ref:</span> {conflictError.detail.bookingReference}</p>
                        <p><span className="font-bold">Driver:</span> {conflictError.detail.driverName || "Confirmed Driver"}</p>
                        <p><span className="font-bold">Scheduled Window:</span> {new Date(conflictError.detail.startTime).toLocaleString()} &rarr; {new Date(conflictError.detail.endTime).toLocaleString()}</p>
                        {conflictError.detail.vehicleModel && (
                          <p><span className="font-bold">Vehicle:</span> {conflictError.detail.vehicleModel}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConflictError(null)}
                    className="rounded-full text-xs font-bold border-rose-300 text-rose-800"
                  >
                    Acknowledge &amp; Dismiss
                  </Button>
                </div>
              </div>
            )}

            {/* Add Blocked Date Form */}
            <form onSubmit={handleAddBlockedPeriod} className="p-5 rounded-3xl bg-neutral-50 border border-neutral-200 space-y-3">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-neutral-700" />
                Add Host Blocked Date / Vacation Exception
              </h3>
              <p className="text-xs text-neutral-500">
                Reserve this parking space for personal use or scheduled maintenance. The system automatically validates against existing bookings.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <div className="space-y-1 sm:w-48">
                  <label className="text-[11px] font-bold text-neutral-600">Select Date *</label>
                  <Input
                    type="date"
                    required
                    value={newBlockDate}
                    onChange={(e) => setNewBlockDate(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                <div className="space-y-1 flex-1">
                  <label className="text-[11px] font-bold text-neutral-600">Reason for Block</label>
                  <Input
                    value={newBlockReason}
                    onChange={(e) => setNewBlockReason(e.target.value)}
                    placeholder="e.g. Driveway pressure washing, Host family visiting"
                    className="text-xs bg-white"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="submit"
                    disabled={isBlockingDate || !newBlockDate}
                    size="sm"
                    className="rounded-full font-bold px-5"
                  >
                    {isBlockingDate ? "Validating Conflicts..." : "Schedule Blocked Date"}
                  </Button>
                </div>
              </div>
            </form>

            {/* Current Active Rules & Exceptions Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-neutral-900">
                Active Availability Rules &amp; Blocked Exceptions
              </h3>

              {spaceRules.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500 bg-neutral-50 rounded-2xl border border-neutral-200">
                  No custom blocked dates. Spot follows standard operating schedule.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl overflow-hidden text-xs">
                  {spaceRules.map((rule) => {
                    const isDateBlock = Boolean(rule.specific_date);
                    return (
                      <div
                        key={rule.id}
                        className="p-3.5 flex items-center justify-between bg-white hover:bg-neutral-50"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                              rule.is_blocked
                                ? "bg-rose-100 text-rose-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {rule.is_blocked ? "✕" : "✓"}
                          </div>
                          <div>
                            <div className="font-bold text-neutral-900">
                              {isDateBlock ? (
                                <span>Specific Date: {rule.specific_date}</span>
                              ) : (
                                <span>Day {rule.day_of_week} ({daysOfWeek[rule.day_of_week ?? 0]})</span>
                              )}
                            </div>
                            <div className="text-neutral-500 text-[11px]">
                              {rule.start_time.slice(0, 5)} - {rule.end_time.slice(0, 5)} &bull; {rule.reason || (rule.is_blocked ? "Blocked" : "Open for booking")}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRule(rule.id)}
                          className="text-rose-600 hover:text-rose-700 text-xs font-bold"
                        >
                          Delete
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Upcoming Bookings & Drivers */}
        {activeTab === "bookings" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#222222] flex items-center gap-2">
                  <CalendarCheck2 className="w-5 h-5 text-neutral-900" />
                  Upcoming Driver Bookings &amp; Vehicle Access
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Inspect arriving vehicles, license plates, and driver contact info.
                </p>
              </div>

              <Badge className="bg-purple-100 text-purple-800 text-xs font-bold">
                {bookings.length} Total Bookings
              </Badge>
            </div>

            {bookings.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                <Car className="w-8 h-8 text-neutral-400 mx-auto" />
                <p className="font-bold text-neutral-700">No upcoming bookings yet</p>
                <p className="text-neutral-500">
                  When drivers reserve your space, their vehicle and pass codes will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-5 rounded-2xl border border-neutral-200 bg-white hover:border-neutral-300 transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-neutral-900">
                          {booking.bookingReference}
                        </span>
                        <Badge
                          className={`text-[10px] font-bold ${
                            booking.status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : booking.status === "completed"
                              ? "bg-neutral-100 text-neutral-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {booking.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="text-xs font-extrabold text-emerald-600">
                        Host Payout: ${booking.hostPayout.toFixed(2)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-neutral-400 font-semibold block text-[11px]">Space</span>
                        <span className="font-bold text-neutral-900">{booking.spaceTitle}</span>
                        <span className="text-neutral-500 block truncate">{booking.spaceAddress}</span>
                      </div>

                      <div>
                        <span className="text-neutral-400 font-semibold block text-[11px]">Time Window</span>
                        <span className="font-bold text-neutral-900">
                          {new Date(booking.startTime).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                        <span className="text-neutral-500 block">
                          {new Date(booking.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                          {new Date(booking.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div>
                        <span className="text-neutral-400 font-semibold block text-[11px]">Driver &amp; Vehicle</span>
                        <span className="font-bold text-neutral-900">{booking.driverName}</span>
                        <span className="text-neutral-500 block">
                          {booking.vehicleModel} &bull; Plate: <span className="font-mono font-bold text-neutral-800">{booking.licensePlate}</span>
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                      <span>Access PIN Code: <span className="font-mono font-bold text-neutral-900">{booking.accessCode}</span></span>
                      <span>Payment Status: <span className="font-semibold text-emerald-700 capitalize">{booking.paymentStatus}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Commute Auto-Share & Surge */}
        {activeTab === "overview" && (
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
                    <span className="text-2xl font-extrabold text-amber-600">+40% Surge Boost</span>
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
        )}
      </div>

      {/* Quick Price Edit Dialog */}
      <Dialog
        isOpen={Boolean(editingPriceSpace)}
        onClose={() => setEditingPriceSpace(null)}
        title="Edit Space Pricing"
        description={editingPriceSpace ? `Update rates for ${editingPriceSpace.title}` : ""}
      >
        <form onSubmit={handleSavePriceEdit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#222222] mb-1">Hourly Rate ($/hr) *</label>
            <Input
              type="number"
              step="0.25"
              required
              value={editPricePerHour}
              onChange={(e) => setEditPricePerHour(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-bold text-[#222222] mb-1">Daily Cap Rate ($/day) *</label>
            <Input
              type="number"
              step="1.00"
              required
              value={editPricePerDay}
              onChange={(e) => setEditPricePerDay(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-bold text-[#222222] mb-1">Monthly Commuter Pass ($/mo)</label>
            <Input
              type="number"
              step="5.00"
              value={editPricePerMonth}
              onChange={(e) => setEditPricePerMonth(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingPriceSpace(null)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isUpdatingPrice}
              className="rounded-full font-bold"
            >
              {isUpdatingPrice ? "Saving..." : "Update Pricing in Supabase"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
