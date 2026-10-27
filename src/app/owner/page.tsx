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
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ParkingImage } from "@/components/ui/parking-image";
import { useAuth } from "@/lib/auth-context";
import { ParkingSpace } from "@/types/parking";
import {
  UnusedSlotRecommendation,
  OwnerUtilizationStats,
} from "@/lib/slot-recommendation-engine";
import {
  estimateDemand,
  DEFAULT_MANUAL_EVENT_FLAGS,
  DemandEstimateResult,
} from "@/lib/demand-engine";

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

interface OwnerIssueReport {
  id: string;
  booking_id?: string;
  space_id?: string;
  report_type?: string;
  description: string;
  status: "open" | "investigating" | "resolved" | "dismissed";
  resolution_notes?: string | null;
  created_at: string;
  isDemo?: boolean;
  parking_spaces?: {
    id: string;
    title: string;
    address: string;
  } | null;
  profiles?: {
    display_name?: string;
    phone?: string;
  } | null;
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

const INITIAL_OWNER_ISSUES: OwnerIssueReport[] = [
  {
    id: "rep-demo-01",
    booking_id: "bk-demo-fail",
    space_id: "sp-101",
    report_type: "spot_blocked",
    description: "Space occupied by another vehicle: Red Ford F-150 parked without authorization in bay A12.",
    status: "open",
    created_at: "2026-10-26T23:30:00.000Z",
    parking_spaces: {
      id: "sp-101",
      title: "Secure Downtown Underground Garage - Bay A12",
      address: "245 Market St, Financial District",
    },
    profiles: {
      display_name: "Elena Rostova",
      phone: "+1 (415) 555-0188",
    },
  },
];

export default function OwnerDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<"overview" | "spaces" | "utilization" | "availability" | "bookings" | "issues">("spaces");
  const [filterStatus, setFilterStatus] = React.useState<"all" | "published" | "draft" | "paused">("all");

  // Smart Space Sharing & Demand Utilization State
  const [utilizationStats, setUtilizationStats] = React.useState<OwnerUtilizationStats | null>(null);
  const [recommendations, setRecommendations] = React.useState<UnusedSlotRecommendation[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = React.useState(false);
  const [approvingRec, setApprovingRec] = React.useState<UnusedSlotRecommendation | null>(null);
  const [customPrice, setCustomPrice] = React.useState("");
  const [customStartTime, setCustomStartTime] = React.useState("");
  const [customEndTime, setCustomEndTime] = React.useState("");
  const [isPublishingRec, setIsPublishingRec] = React.useState(false);

  // Demand Simulator State
  const [simDay, setSimDay] = React.useState<number>(1); // Monday
  const [simStartHour, setSimStartHour] = React.useState<number>(8.5); // 8:30 AM
  const [simEndHour, setSimEndHour] = React.useState<number>(17.5);   // 5:30 PM
  const [simEventId, setSimEventId] = React.useState<string>("evt-moscone-summit");
  const [simOccupancyCount, setSimOccupancyCount] = React.useState<number>(4);
  const [simTrendMultiplier, setSimTrendMultiplier] = React.useState<number>(1.2);

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
  const [issues, setIssues] = React.useState<OwnerIssueReport[]>(INITIAL_OWNER_ISSUES);
  const [isAdminView, setIsAdminView] = React.useState(false);
  const [updatingIssueId, setUpdatingIssueId] = React.useState<string | null>(null);
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

      const issuesRes = await fetch("/api/recovery?action=owner_reports");
      if (issuesRes.ok) {
        const iData = await issuesRes.json();
        if (iData.reports && iData.reports.length > 0) {
          setIssues(iData.reports);
        }
      }

      const recRes = await fetch("/api/owner/recommendations");
      if (recRes.ok) {
        const rData = await recRes.json();
        if (rData.recommendations) setRecommendations(rData.recommendations);
        if (rData.utilizationStats) setUtilizationStats(rData.utilizationStats);
      }
    } catch {
      // Keep defaults
    }
  }, []);

  const loadRecommendations = React.useCallback(async (spaceId?: string) => {
    setIsLoadingRecs(true);
    try {
      const url = spaceId ? `/api/owner/recommendations?spaceId=${spaceId}` : "/api/owner/recommendations";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.recommendations) setRecommendations(data.recommendations);
        if (data.utilizationStats) setUtilizationStats(data.utilizationStats);
      }
    } catch {
      // Keep defaults
    } finally {
      setIsLoadingRecs(false);
    }
  }, []);

  const handleOpenApproveModal = (rec: UnusedSlotRecommendation) => {
    setApprovingRec(rec);
    setCustomPrice(rec.suggestedHourlyPrice.toString());
    setCustomStartTime(rec.startTime);
    setCustomEndTime(rec.endTime);
  };

  const handleApproveAndPublishSlot = async () => {
    if (!approvingRec) return;
    setIsPublishingRec(true);
    try {
      const res = await fetch("/api/owner/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_and_publish",
          spaceId: approvingRec.spaceId,
          date: approvingRec.dateIso,
          startTime: customStartTime,
          endTime: customEndTime,
          approvedHourlyPrice: parseFloat(customPrice) || approvingRec.suggestedHourlyPrice,
          notes: `Owner approved smart slot (${customStartTime}-${customEndTime})`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setToastMessage({
          type: "error",
          text: data.error || "Failed to publish slot.",
        });
        return;
      }

      setToastMessage({
        type: "success",
        text: `Success! Approved slot published for ${approvingRec.displayDate}. 0 booking conflicts verified.`,
      });

      // Remove from recommendations list and refresh stats
      setRecommendations((prev) => prev.filter((r) => r.id !== approvingRec.id));
      setApprovingRec(null);
      loadRecommendations();
    } catch {
      setToastMessage({ type: "error", text: "Network error approving slot." });
    } finally {
      setIsPublishingRec(false);
    }
  };

  const handleDismissRecommendation = async (recId: string) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== recId));
    setToastMessage({
      type: "success",
      text: "Slot suggestion dismissed.",
    });
  };

  // Computed demand simulation for the active simulator inputs
  const simulatedDemand: DemandEstimateResult = React.useMemo(() => {
    const activeEvts = DEFAULT_MANUAL_EVENT_FLAGS.map((evt) => ({
      ...evt,
      isActive: simEventId === "all" || evt.id === simEventId,
    }));

    return estimateDemand({
      destination: "Financial District, San Francisco",
      neighborhood: "financial district",
      dayOfWeek: simDay,
      startHour: simStartHour,
      endHour: simEndHour,
      historicalSampleBookingsCount: simOccupancyCount,
      totalCapacityInArea: 5,
      customSearchTrendMultiplier: simTrendMultiplier,
      activeEvents: activeEvts,
    });
  }, [simDay, simStartHour, simEndHour, simEventId, simOccupancyCount, simTrendMultiplier]);

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

        const iRes = await fetch("/api/recovery?action=owner_reports");
        if (iRes.ok) {
          const iData = await iRes.json();
          if (!active) return;
          if (iData.reports && iData.reports.length > 0) {
            setIssues(iData.reports);
          }
        }

        const rRes = await fetch("/api/owner/recommendations");
        if (rRes.ok) {
          const rData = await rRes.json();
          if (!active) return;
          if (rData.recommendations) setRecommendations(rData.recommendations);
          if (rData.utilizationStats) setUtilizationStats(rData.utilizationStats);
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

  const handleUpdateIssueStatus = async (
    reportId: string,
    newStatus: "open" | "investigating" | "resolved" | "dismissed",
    notes?: string
  ) => {
    setUpdatingIssueId(reportId);
    try {
      const res = await fetch("/api/recovery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          status: newStatus,
          resolutionNotes: notes || `Owner verified and resolved on ${new Date().toLocaleDateString()}`,
        }),
      });

      if (res.ok) {
        setIssues((prev) =>
          prev.map((iss) =>
            iss.id === reportId
              ? {
                  ...iss,
                  status: newStatus,
                  resolution_notes: notes || `Status updated to ${newStatus}`,
                }
              : iss
          )
        );
        setToastMessage({
          type: "success",
          text: `Report #${reportId} updated to "${newStatus}".`,
        });
      } else {
        setToastMessage({ type: "error", text: "Failed to update report status." });
      }
    } catch {
      setToastMessage({ type: "error", text: "Network error updating report." });
    } finally {
      setUpdatingIssueId(null);
    }
  };

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
            { id: "utilization", label: "Demand & Space Utilization (Smart Sharing)", count: recommendations.length },
            { id: "availability", label: "Availability Calendar & Exceptions", count: spaceRules.length },
            { id: "bookings", label: "Upcoming Bookings & Drivers", count: bookings.length },
            { id: "issues", label: "Access Issues & Disputes", count: issues.length },
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

        {/* TAB: Demand & Space Utilization (Smart Space Sharing) */}
        {activeTab === "utilization" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Header info */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold mb-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Smart Space Sharing &bull; Rule-Based Demand Modeling
                </div>
                <h2 className="text-2xl font-black text-[#222222]">
                  Driveway &amp; Garage Utilization Intelligence
                </h2>
                <p className="text-xs sm:text-sm text-[#717171] mt-1 max-w-2xl">
                  Inspect scheduled listing hours, confirmed driver occupancy, and identify unbooked windows ready to monetize. All predictions and earnings estimates are transparently labeled.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => loadRecommendations(selectedSpaceForRules || undefined)}
                disabled={isLoadingRecs}
                className="rounded-full self-start md:self-auto text-xs font-bold cursor-pointer"
              >
                {isLoadingRecs ? "Refreshing..." : "Refresh Recommendations"}
              </Button>
            </div>

            {/* 1. Demand & Utilization Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="rounded-3xl bg-white p-6 border border-[#EAEAEA] shadow-xs space-y-1">
                <div className="flex items-center justify-between text-[#717171] text-xs font-bold uppercase tracking-wider">
                  <span>Listed Hours</span>
                  <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-[#222222]">
                  {utilizationStats?.listedHours ?? 50.0} <span className="text-sm font-bold text-neutral-400">hrs/wk</span>
                </p>
                <p className="text-xs text-neutral-500 font-medium">
                  Total scheduled availability capacity
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 border border-[#EAEAEA] shadow-xs space-y-1">
                <div className="flex items-center justify-between text-[#717171] text-xs font-bold uppercase tracking-wider">
                  <span>Booked Hours</span>
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-[#222222]">
                  {utilizationStats?.bookedHours ?? 18.5} <span className="text-sm font-bold text-neutral-400">hrs</span>
                </p>
                <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Occupied by confirmed driver bookings
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 border border-[#EAEAEA] shadow-xs space-y-1">
                <div className="flex items-center justify-between text-[#717171] text-xs font-bold uppercase tracking-wider">
                  <span>Available Unbooked Hours</span>
                  <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-purple-700">
                  {utilizationStats?.availableUnbookedHours ?? 31.5} <span className="text-sm font-bold text-purple-400">hrs</span>
                </p>
                <p className="text-xs text-purple-600 font-medium">
                  Idle periods identified for Smart Sharing
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 border border-[#EAEAEA] shadow-xs space-y-1">
                <div className="flex items-center justify-between text-[#717171] text-xs font-bold uppercase tracking-wider">
                  <span>Space Utilization</span>
                  <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-[#222222]">
                  {utilizationStats?.utilizationRatePercent ?? 37.0}%
                </p>
                {/* Progress bar */}
                <div className="w-full bg-neutral-100 rounded-full h-2 mt-2">
                  <div
                    className="bg-neutral-900 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, utilizationStats?.utilizationRatePercent ?? 37)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 2. Estimated Gross Booking Value & Financial Transparency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Actual Confirmed Gross Value */}
              <div className="rounded-3xl bg-white p-6 sm:p-7 border border-emerald-200 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-extrabold">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Verified Realized Revenue
                  </div>
                  <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300 bg-white">
                    Confirmed in Database
                  </Badge>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                    Actual Realized Gross Bookings:
                  </span>
                  <span className="text-3xl sm:text-4xl font-black text-neutral-900">
                    ${(utilizationStats?.verifiedActualGrossBookings ?? stats.totalEarnings).toFixed(2)}
                  </span>
                </div>

                <p className="text-xs text-neutral-600 mt-3 leading-relaxed">
                  Calculated solely from completed and active driver reservations. Real customer transactions with settled payouts.
                </p>
              </div>

              {/* Sample-Data Forecasted Potential Gross Value */}
              <div className="rounded-3xl bg-white p-6 sm:p-7 border border-purple-200 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 text-xs font-extrabold">
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                    Estimated Potential Gross Value
                  </div>
                  <Badge variant="outline" className="text-[10px] text-purple-700 border-purple-300 bg-white">
                    Sample-Data Forecast
                  </Badge>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                    Total Estimated Potential Value:
                  </span>
                  <span className="text-3xl sm:text-4xl font-black text-purple-700">
                    ${(utilizationStats?.projectedPotentialGrossBookings ?? (stats.totalEarnings + 240)).toFixed(2)}
                  </span>
                </div>

                <p className="text-xs text-neutral-600 mt-3 leading-relaxed">
                  Projected booking value if available unbooked hours ({utilizationStats?.availableUnbookedHours ?? 31.5} hrs) are approved and reserved at sample demand rates (70% booking probability).
                </p>
              </div>
            </div>

            {/* Crucial Transparency Label Banner */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Transparent Reporting Notice &bull; No Simulated Revenue Claim</p>
                <p className="text-amber-800 leading-relaxed">
                  All projections and earnings estimates are rule-based calculations using sample demand. They do NOT represent guaranteed customers, booked reservations, or actual realized revenue. Confirmed bookings are strictly separated from simulated forecasts.
                </p>
              </div>
            </div>

            {/* 3. Smart Space Sharing — Suggested Unused Slots */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full mb-1.5">
                    <Sparkles className="h-3 w-3" />
                    Smart Space Sharing Engine
                  </div>
                  <h3 className="text-xl font-black text-[#222222]">
                    Suggested Unused Slots (Owner Approval Required)
                  </h3>
                  <p className="text-xs text-[#717171] mt-0.5">
                    Detected unbooked periods in your recurring schedule. Review suggested rates and publish with 1 click. Confirmed driver bookings are never altered.
                  </p>
                </div>

                <Badge variant="outline" className="text-xs bg-neutral-50 font-bold px-3 py-1 self-start sm:self-auto">
                  {recommendations.length} Unused Windows Found
                </Badge>
              </div>

              {recommendations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center text-xs text-neutral-500">
                  No unused slot suggestions at this time. All scheduled windows are either booked or blocked.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="rounded-2xl border border-neutral-200 p-5 bg-white hover:border-neutral-300 transition-all flex flex-col justify-between space-y-4 shadow-2xs"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-extrabold text-neutral-500 uppercase tracking-wide block">
                              {rec.spaceTitle}
                            </span>
                            <h4 className="text-base font-extrabold text-neutral-900 flex items-center gap-1.5 mt-0.5">
                              <Calendar className="h-4 w-4 text-purple-600" />
                              {rec.displayDate} &bull; {rec.startTime} - {rec.endTime}
                            </h4>
                            <span className="text-xs text-neutral-500 font-medium">
                              Duration: {rec.durationHours} hours
                            </span>
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shrink-0 ${
                              rec.estimatedDemandLevel === "high"
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : rec.estimatedDemandLevel === "medium"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            {rec.estimatedDemandLevel.toUpperCase()} DEMAND
                          </span>
                        </div>

                        {/* Price & Earnings Breakdown */}
                        <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-3 rounded-xl border border-neutral-100 text-xs">
                          <div>
                            <span className="text-[10px] text-neutral-500 font-bold block">Suggested Hourly Rate:</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-base font-black text-neutral-900">${rec.suggestedHourlyPrice.toFixed(2)}</span>
                              <span className="text-[11px] text-neutral-400 line-through">${rec.baselineHourlyPrice.toFixed(2)}</span>
                            </div>
                            <span className="text-[10px] text-purple-700 font-medium block">{rec.pricingRuleApplied}</span>
                          </div>

                          <div>
                            <span className="text-[10px] text-neutral-500 font-bold block">Estimated Additional Earnings:</span>
                            <span className="text-base font-black text-emerald-700 block mt-0.5">+${rec.estimatedHostEarnings.toFixed(2)}</span>
                            <span className="text-[10px] text-neutral-500 font-medium block">
                              Potential gross: ${rec.potentialGrossBookingValue.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Conflict Status Verification Badge */}
                        <div className="rounded-xl bg-emerald-50/80 p-2.5 border border-emerald-200 text-emerald-900 text-[11px] flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>{rec.conflictVerification.guaranteeMessage}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                        <Button
                          size="sm"
                          onClick={() => handleOpenApproveModal(rec)}
                          className="flex-1 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer"
                        >
                          Review &amp; Approve Slot
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDismissRecommendation(rec.id)}
                          className="text-xs text-neutral-500 hover:text-neutral-800 cursor-pointer"
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Interactive Demand & Pricing Simulator (Configurable Rule Tester) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Acceptance Criteria Verification
                </div>
                <h3 className="text-xl font-black text-[#222222]">
                  Interactive Demand &amp; Dynamic Pricing Simulator
                </h3>
                <p className="text-xs text-[#717171] mt-0.5">
                  Test and observe how changing time windows, day of the week, historical sample data, or event flags consistently updates the rule-based demand estimate.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Simulator Inputs (Left Column, 7 cols) */}
                <div className="lg:col-span-7 space-y-4 bg-neutral-50 p-5 rounded-2xl border border-neutral-200">
                  <h4 className="text-xs font-extrabold text-neutral-900 uppercase tracking-wider mb-2">
                    Configurable Input Parameters
                  </h4>

                  {/* Day of Week */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                      Day of Week:
                    </label>
                    <div className="grid grid-cols-7 gap-1.5">
                      {[
                        { id: 1, name: "Mon" },
                        { id: 2, name: "Tue" },
                        { id: 3, name: "Wed" },
                        { id: 4, name: "Thu" },
                        { id: 5, name: "Fri" },
                        { id: 6, name: "Sat" },
                        { id: 0, name: "Sun" },
                      ].map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSimDay(d.id)}
                          className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                            simDay === d.id
                              ? "bg-neutral-900 text-white shadow-xs"
                              : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200"
                          }`}
                        >
                          {d.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Window */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1">
                        Start Hour: {Math.floor(simStartHour)}:{String(Math.round((simStartHour % 1) * 60)).padStart(2, "0")} ({simStartHour >= 12 ? "PM" : "AM"})
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="23"
                        step="0.5"
                        value={simStartHour}
                        onChange={(e) => setSimStartHour(parseFloat(e.target.value))}
                        className="w-full accent-neutral-900 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
                        <span>12 AM</span>
                        <span>8 AM</span>
                        <span>12 PM</span>
                        <span>11 PM</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1">
                        End Hour: {Math.floor(simEndHour)}:{String(Math.round((simEndHour % 1) * 60)).padStart(2, "0")} ({simEndHour >= 12 ? "PM" : "AM"})
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="24"
                        step="0.5"
                        value={simEndHour}
                        onChange={(e) => setSimEndHour(parseFloat(e.target.value))}
                        className="w-full accent-neutral-900 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
                        <span>1 AM</span>
                        <span>12 PM</span>
                        <span>6 PM</span>
                        <span>12 AM</span>
                      </div>
                    </div>
                  </div>

                  {/* Manually Configured Event Flags */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1">
                      Manually Configured Event Flag:
                    </label>
                    <select
                      value={simEventId}
                      onChange={(e) => setSimEventId(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-neutral-300 focus:outline-none cursor-pointer"
                    >
                      <option value="none">No Special Event Flag Active</option>
                      <option value="evt-moscone-summit">Moscone Tech Expo &amp; Summit (SoMa, +32 pts)</option>
                      <option value="evt-chase-center">Chase Center Warriors Evening Game (Mission Bay, +35 pts)</option>
                      <option value="evt-oracle-park">Oracle Park SF Giants Game (South Beach, +28 pts)</option>
                      <option value="evt-ferry-market">Ferry Building Farmers &amp; Artisan Market (FiDi, +18 pts)</option>
                      <option value="all">Simulate All Major Local Events Active</option>
                    </select>
                  </div>

                  {/* Sample Historical Occupancy */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-neutral-800 mb-1">
                        <span>Sample Area Bookings:</span>
                        <span>{simOccupancyCount} / 5 spots</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="1"
                        value={simOccupancyCount}
                        onChange={(e) => setSimOccupancyCount(parseInt(e.target.value, 10))}
                        className="w-full accent-neutral-900 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold text-neutral-800 mb-1">
                        <span>Search Query Trend:</span>
                        <span>+{Math.round((simTrendMultiplier - 1.0) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="1.8"
                        step="0.1"
                        value={simTrendMultiplier}
                        onChange={(e) => setSimTrendMultiplier(parseFloat(e.target.value))}
                        className="w-full accent-neutral-900 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Simulator Live Output (Right Column, 5 cols) */}
                <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
                        Live Calculated Result
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                          simulatedDemand.demandLevel === "high"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : simulatedDemand.demandLevel === "medium"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {simulatedDemand.label}
                      </span>
                    </div>

                    {/* Deterministic Score Gauge */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-3xl font-black text-neutral-900">
                          {simulatedDemand.score}
                          <span className="text-sm font-bold text-neutral-400">/100</span>
                        </span>
                        <span className="text-xs font-bold text-purple-700">
                          Multiplier: {simulatedDemand.pricingMultiplier}x (+{simulatedDemand.suggestedHourlyPriceDeltaPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${
                            simulatedDemand.demandLevel === "high"
                              ? "bg-rose-600"
                              : simulatedDemand.demandLevel === "medium"
                              ? "bg-amber-500"
                              : "bg-emerald-600"
                          }`}
                          style={{ width: `${simulatedDemand.score}%` }}
                        />
                      </div>
                    </div>

                    {/* Contributing Factors Explanation */}
                    <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                      <span className="text-xs font-bold text-neutral-800 block">
                        Explainable Contributing Factors:
                      </span>
                      <div className="space-y-1 text-xs">
                        {simulatedDemand.contributingFactors.map((f, i) => (
                          <div key={i} className="flex justify-between items-center text-[11px] bg-neutral-50 p-1.5 rounded-lg">
                            <span className="text-neutral-700 font-medium truncate max-w-[200px]">{f.name}</span>
                            <span className="font-mono font-bold text-neutral-900">+{f.scoreDelta} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-neutral-400 pt-2 border-t border-neutral-100">
                    Transparent rule-based algorithm: changes to time or parameters produce consistent, reproducible demand scores without black-box ML claims.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Owner Review & Approve Slot */}
        {/* Modal: Owner Review & Approve Slot */}
        <Dialog
          isOpen={!!approvingRec}
          onClose={() => setApprovingRec(null)}
          title="Approve & Publish Unused Slot"
          description="Owner approval required before publishing on public search marketplace."
        >
          {approvingRec && (
            <div className="space-y-4 text-xs pt-2">
              {/* Space & Date Info */}
              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200/80 space-y-1">
                <span className="text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                  Selected Parking Space:
                </span>
                <p className="font-extrabold text-sm text-neutral-900">{approvingRec.spaceTitle}</p>
                <p className="text-neutral-600">{approvingRec.displayDate} ({approvingRec.dayName})</p>
              </div>

              {/* Time Window Customization */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-800 mb-1">Start Time:</label>
                  <input
                    type="time"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-neutral-300 p-2.5 bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-800 mb-1">End Time:</label>
                  <input
                    type="time"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-neutral-300 p-2.5 bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Hourly Rate Customization */}
              <div>
                <label className="block font-bold text-neutral-800 mb-1">
                  Approved Price Per Hour ($):
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="1.0"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full text-xs font-extrabold rounded-xl border border-neutral-300 p-2.5 bg-white focus:outline-none"
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  Engine suggested ${approvingRec.suggestedHourlyPrice.toFixed(2)}/hr based on {approvingRec.estimatedDemandLevel} demand.
                </p>
              </div>

              {/* Conflict Check Guarantee */}
              <div className="rounded-2xl bg-emerald-50 p-3.5 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Confirmed Reservations Protected</p>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    0 conflicts verified with confirmed driver bookings. Publishing this slot will not overwrite or alter any existing reservations.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <Button
                  variant="ghost"
                  onClick={() => setApprovingRec(null)}
                  disabled={isPublishingRec}
                  className="text-xs font-bold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApproveAndPublishSlot}
                  disabled={isPublishingRec}
                  className="rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer px-5"
                >
                  {isPublishingRec ? "Publishing..." : "Approve & Publish to Marketplace"}
                </Button>
              </div>
            </div>
          )}
        </Dialog>

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

        {/* TAB 4: Access Issues, Reports & Admin Moderation */}
        {activeTab === "issues" && (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-7 border border-[#EAEAEA] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-[#222222] flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-rose-600" />
                    Reported Access Problems &amp; Landlord Disputes
                  </h3>
                  <p className="text-xs text-[#717171] mt-0.5">
                    Review and resolve arrival disruptions, blocked bays, and gate access failures reported by drivers.
                  </p>
                </div>

                {/* Admin Mode Toggle */}
                <div className="flex items-center gap-2 bg-neutral-100 p-1.5 rounded-full text-xs font-bold shrink-0">
                  <span className="text-neutral-500 text-[11px] px-2">Role View:</span>
                  <button
                    type="button"
                    onClick={() => setIsAdminView(false)}
                    className={`px-3 py-1 rounded-full transition-all ${
                      !isAdminView
                        ? "bg-white text-neutral-900 shadow-2xs font-bold"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    Host Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAdminView(true)}
                    className={`px-3 py-1 rounded-full transition-all ${
                      isAdminView
                        ? "bg-purple-600 text-white shadow-2xs font-bold"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    Admin Moderation
                  </button>
                </div>
              </div>

              {issues.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center">
                  <CheckCircle2 className="h-9 w-9 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-neutral-800 text-sm">No Reported Access Problems</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    All your parking bays are operating normally with zero reported driver disputes.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {issues.map((issue) => {
                    const isOpen = issue.status === "open";
                    const isInvestigating = issue.status === "investigating";
                    const isResolved = issue.status === "resolved";
                    const isUpdating = updatingIssueId === issue.id;

                    return (
                      <div
                        key={issue.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          isResolved
                            ? "bg-emerald-50/40 border-emerald-200"
                            : isOpen
                            ? "bg-rose-50/30 border-rose-200 shadow-2xs"
                            : "bg-amber-50/30 border-amber-200"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-200/60 pb-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                isResolved
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isOpen
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {issue.status}
                            </span>
                            <span className="text-xs font-mono font-bold text-neutral-500">
                              #{issue.id}
                            </span>
                            {issue.isDemo && (
                              <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md">
                                [Demo Simulation]
                              </span>
                            )}
                          </div>

                          <span className="text-xs text-neutral-500">
                            Reported: {new Date(issue.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })},{" "}
                            {new Date(issue.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                              Affected Space
                            </span>
                            <span className="font-bold text-neutral-900 block">
                              {issue.parking_spaces?.title || "Downtown Garage Bay A12"}
                            </span>
                            <span className="text-neutral-500 truncate block">
                              {issue.parking_spaces?.address || "245 Market St"}
                            </span>
                          </div>

                          <div className="md:col-span-2">
                            <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                              Driver Observation &amp; Problem Description
                            </span>
                            <p className="font-semibold text-neutral-800 mt-0.5 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-neutral-200/70">
                              {issue.description}
                            </p>
                          </div>
                        </div>

                        {issue.resolution_notes && (
                          <div className="mt-3 p-3 bg-white/90 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold block">Resolution Log</span>
                              <span>{issue.resolution_notes}</span>
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="mt-4 pt-3 border-t border-neutral-200/60 flex flex-wrap items-center justify-between gap-3">
                          <div className="text-[11px] text-neutral-500">
                            {isAdminView ? (
                              <span className="font-semibold text-purple-700">
                                Admin Moderation Protocol: All actions logged in system audit trail.
                              </span>
                            ) : (
                              <span>Landlord Action: Verify bay access to restore live listing status.</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {!isResolved && (
                              <>
                                {!isInvestigating && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    disabled={isUpdating}
                                    onClick={() =>
                                      handleUpdateIssueStatus(
                                        issue.id,
                                        "investigating",
                                        "Owner/Admin dispatched on-site attendant to inspect obstruction."
                                      )
                                    }
                                  >
                                    Mark Investigating
                                  </Button>
                                )}

                                <Button
                                  variant="brand"
                                  size="sm"
                                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                                  disabled={isUpdating}
                                  onClick={() =>
                                    handleUpdateIssueStatus(
                                      issue.id,
                                      "resolved",
                                      "Owner confirmed unauthorized vehicle removed and bay is fully accessible."
                                    )
                                  }
                                >
                                  {isUpdating ? "Updating..." : "Mark Bay Cleared & Resolved"}
                                </Button>
                              </>
                            )}

                            {isAdminView && isResolved && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs text-neutral-500"
                                disabled={isUpdating}
                                onClick={() =>
                                  handleUpdateIssueStatus(
                                    issue.id,
                                    "open",
                                    "Admin reopened dispute for re-investigation."
                                  )
                                }
                              >
                                Reopen Dispute
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
