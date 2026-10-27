"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { 
  Map, 
  List, 
  X, 
  RotateCcw, 
  Zap, 
  Warehouse, 
  Car,
  Clock,
  SlidersHorizontal,
  ShieldCheck,
  Info,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  AlertTriangle
} from "lucide-react";
import { ParkingCard } from "@/components/parking/parking-card";
import { MapAdapter } from "@/components/map/map-adapter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { VehicleType, ParkingSpace } from "@/types/parking";
import { DETAILED_VEHICLE_PROFILES, DEFAULT_SAFETY_MARGINS } from "@/lib/compatibility-engine";
import { RankedSpaceResult } from "@/lib/ranking-engine";
import { SearchResponsePayload } from "@/app/api/search/route";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialDestination = searchParams.get("destination") || "";
  const initialVehicle = (searchParams.get("vehicle") as VehicleType) || "all";

  // Filter States
  const [destinationQuery, setDestinationQuery] = React.useState(initialDestination);
  const [selectedVehicle, setSelectedVehicle] = React.useState<VehicleType | "all">(initialVehicle);
  const [customHeight, setCustomHeight] = React.useState<string>("");
  const [customLength, setCustomLength] = React.useState<string>("");
  const [customWidth, setCustomWidth] = React.useState<string>("");
  const [showCustomDimensions, setShowCustomDimensions] = React.useState(false);

  const [arrivalDateTime, setArrivalDateTime] = React.useState<string>("");
  const [departureDateTime, setDepartureDateTime] = React.useState<string>("");

  const [onlyCovered, setOnlyCovered] = React.useState(false);
  const [onlyEv, setOnlyEv] = React.useState(false);
  const [maxPrice, setMaxPrice] = React.useState<number>(15);
  const [maxDistanceMiles, setMaxDistanceMiles] = React.useState<number | "any">("any");
  const [sortBy, setSortBy] = React.useState<"recommended" | "price_asc" | "price_desc" | "rating" | "distance">("recommended");
  
  // UI states
  const [mobileView, setMobileView] = React.useState<"list" | "map">("list");
  const [highlightedSpaceId, setHighlightedSpaceId] = React.useState<string | null>(null);
  const [showFiltersModal, setShowFiltersModal] = React.useState(false);
  const [showFactorsDrawer, setShowFactorsDrawer] = React.useState(false);

  // Server Search Response State
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchResponse, setSearchResponse] = React.useState<SearchResponsePayload | null>(null);
  const [errorNotice, setErrorNotice] = React.useState<string | null>(null);

  // Active filter count
  const activeFiltersCount = [
    destinationQuery.trim() !== "",
    selectedVehicle !== "all",
    customHeight !== "" || customLength !== "" || customWidth !== "",
    arrivalDateTime !== "" && departureDateTime !== "",
    onlyCovered,
    onlyEv,
    maxPrice < 15,
    maxDistanceMiles !== "any",
    sortBy !== "recommended",
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setDestinationQuery("");
    setSelectedVehicle("all");
    setCustomHeight("");
    setCustomLength("");
    setCustomWidth("");
    setShowCustomDimensions(false);
    setArrivalDateTime("");
    setDepartureDateTime("");
    setOnlyCovered(false);
    setOnlyEv(false);
    setMaxPrice(15);
    setMaxDistanceMiles("any");
    setSortBy("recommended");
  };

  // Perform Server Search
  const fetchSearchResults = React.useCallback(async () => {
    setIsLoading(true);
    setErrorNotice(null);

    try {
      const params = new URLSearchParams();
      if (destinationQuery.trim()) params.set("destination", destinationQuery.trim());
      if (selectedVehicle !== "all") params.set("vehicleType", selectedVehicle);
      if (customHeight) params.set("customHeightFeet", customHeight);
      if (customLength) params.set("customLengthFeet", customLength);
      if (customWidth) params.set("customWidthFeet", customWidth);
      if (arrivalDateTime) params.set("startTime", new Date(arrivalDateTime).toISOString());
      if (departureDateTime) params.set("endTime", new Date(departureDateTime).toISOString());
      if (onlyCovered) params.set("onlyCovered", "true");
      if (onlyEv) params.set("onlyEv", "true");
      if (maxPrice && maxPrice < 25) params.set("maxPrice", maxPrice.toString());
      if (maxDistanceMiles !== "any") params.set("maxDistanceMiles", maxDistanceMiles.toString());
      if (sortBy) params.set("sortBy", sortBy);

      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Search failed with status ${res.status}`);
      }
      const data: SearchResponsePayload = await res.json();
      setSearchResponse(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load parking results";
      setErrorNotice(msg);
    } finally {
      setIsLoading(false);
    }
  }, [
    destinationQuery,
    selectedVehicle,
    customHeight,
    customLength,
    customWidth,
    arrivalDateTime,
    departureDateTime,
    onlyCovered,
    onlyEv,
    maxPrice,
    maxDistanceMiles,
    sortBy,
  ]);

  // Debounced search trigger on filter change
  React.useEffect(() => {
    const handler = setTimeout(() => {
      fetchSearchResults();
    }, 250);
    return () => clearTimeout(handler);
  }, [fetchSearchResults]);

  const validSpaces: RankedSpaceResult[] = searchResponse?.data || [];
  const alternativeSpaces = searchResponse?.alternatives || [];
  const mapSpaces: ParkingSpace[] = [
    ...validSpaces.map((item) => item.space),
    ...alternativeSpaces.map((item) => item.space),
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDFD]">
      {/* Top Search & Filter Bar */}
      <div className="sticky top-20 z-30 bg-white/95 backdrop-blur-md border-b border-[#EBEBEB] px-4 sm:px-6 lg:px-8 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          {/* Main Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Left: Search input & vehicle selection */}
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
              {/* Destination Input */}
              <div className="relative min-w-[220px] sm:min-w-[280px]">
                <input
                  type="text"
                  value={destinationQuery}
                  onChange={(e) => setDestinationQuery(e.target.value)}
                  placeholder="Destination, neighborhood, or landmark..."
                  className="w-full text-xs sm:text-sm pl-3.5 pr-8 py-2 rounded-full border border-[#DDDDDD] bg-[#F7F7F7] focus:bg-white focus:outline-none focus:border-[#222222] transition-colors"
                />
                {destinationQuery && (
                  <button
                    type="button"
                    onClick={() => setDestinationQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#717171] hover:text-[#222222]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Vehicle Profile Selector */}
              <div className="flex items-center gap-1 bg-[#F7F7F7] border border-[#DDDDDD] rounded-full px-3 py-1.5 text-xs">
                <Car className="h-3.5 w-3.5 text-neutral-600 shrink-0" />
                <select
                  value={selectedVehicle}
                  onChange={(e) => {
                    setSelectedVehicle(e.target.value as VehicleType | "all");
                    if (e.target.value === "all") {
                      setCustomHeight("");
                      setCustomLength("");
                      setCustomWidth("");
                    }
                  }}
                  className="bg-transparent text-xs font-bold text-[#222222] focus:outline-none cursor-pointer"
                >
                  <option value="all">Any Vehicle Profile</option>
                  <option value="compact">Compact / Mini (&lt; 4.8ft)</option>
                  <option value="sedan">Sedan / Mid-Size (&lt; 4.9ft)</option>
                  <option value="suv">SUV / Crossover (&lt; 5.8ft)</option>
                  <option value="truck">Pickup Truck (&lt; 6.5ft)</option>
                  <option value="van">Commercial Van (&lt; 7.8ft)</option>
                  <option value="ev">Electric Vehicle (EV)</option>
                </select>
              </div>

              {/* Custom Dimensions Trigger */}
              <button
                type="button"
                onClick={() => setShowCustomDimensions(!showCustomDimensions)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  customHeight || customLength || customWidth
                    ? "bg-[#222222] text-white border-[#222222]"
                    : "bg-white text-[#717171] border-[#DDDDDD] hover:border-[#222222]"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {customHeight || customLength || customWidth ? "Custom Dimensions Set" : "Custom Dimensions"}
              </button>

              {/* Quick Toggle: Covered */}
              <button
                type="button"
                onClick={() => setOnlyCovered(!onlyCovered)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  onlyCovered
                    ? "bg-[#222222] text-white border-[#222222]"
                    : "bg-white text-[#717171] border-[#DDDDDD] hover:border-[#222222]"
                }`}
              >
                <Warehouse className="h-3.5 w-3.5" />
                Covered
              </button>

              {/* Quick Toggle: EV */}
              <button
                type="button"
                onClick={() => setOnlyEv(!onlyEv)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  onlyEv
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-white text-[#717171] border-[#DDDDDD] hover:border-[#222222]"
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                EV Fast Charging
              </button>
            </div>

            {/* Right: Sort & Filter Modals */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-[#717171] hidden md:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "recommended" | "price_asc" | "price_desc" | "rating" | "distance")}
                  className="bg-white border border-[#DDDDDD] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#222222] focus:outline-none cursor-pointer"
                >
                  <option value="recommended">Recommended (Multi-Criteria Score)</option>
                  <option value="distance">Proximity (Closest First)</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Highest Host Rating</option>
                </select>
              </div>

              {/* Expand All Filters Button */}
              <button
                type="button"
                onClick={() => setShowFiltersModal(!showFiltersModal)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                  showFiltersModal || activeFiltersCount > 0
                    ? "bg-[#222222] text-white border-[#222222]"
                    : "bg-white text-[#222222] border-[#DDDDDD] hover:bg-neutral-50"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ""}</span>
              </button>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs text-[#FF5A5F] hover:underline font-bold px-2 py-1 flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Custom Dimensions Drawer / Collapsible */}
          {showCustomDimensions && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-[#FF5A5F]" />
                  <h4 className="text-xs font-extrabold text-neutral-900 uppercase tracking-wide">
                    Custom Vehicle Physical Dimensions
                  </h4>
                  <Badge variant="outline" className="text-[10px] bg-white text-neutral-600">
                    Safety Margin: +{DEFAULT_SAFETY_MARGINS.heightFeet}&apos; roof &bull; +{DEFAULT_SAFETY_MARGINS.lengthFeet}&apos; length
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomDimensions(false)}
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Vehicle Height (Feet)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="3.0"
                    max="14.0"
                    placeholder="e.g. 5.9"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-neutral-300 bg-white focus:outline-none focus:border-neutral-900"
                  />
                  <p className="text-[10px] text-neutral-500 mt-0.5">Enforces hard ceiling clearance limit.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Vehicle Length (Feet)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="10.0"
                    max="30.0"
                    placeholder="e.g. 16.5"
                    value={customLength}
                    onChange={(e) => setCustomLength(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-neutral-300 bg-white focus:outline-none focus:border-neutral-900"
                  />
                  <p className="text-[10px] text-neutral-500 mt-0.5">Checked against space bay length.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Vehicle Width (Feet)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="4.0"
                    max="10.0"
                    placeholder="e.g. 6.2"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-neutral-300 bg-white focus:outline-none focus:border-neutral-900"
                  />
                  <p className="text-[10px] text-neutral-500 mt-0.5">Ensures sufficient door opening space.</p>
                </div>
              </div>
            </div>
          )}

          {/* Extended Filters Panel (Time Windows, Budget, Walking Radius) */}
          {showFiltersModal && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-3 border-b border-neutral-200 pb-2">
                <span className="text-xs font-extrabold uppercase tracking-wide text-neutral-800">
                  Search &amp; Server Availability Filters
                </span>
                <button
                  type="button"
                  onClick={() => setShowFiltersModal(false)}
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* Arrival Time */}
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Arrival Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    value={arrivalDateTime}
                    onChange={(e) => setArrivalDateTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white focus:outline-none focus:border-neutral-900 text-xs font-mono"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">Checks server booking overlaps.</p>
                </div>

                {/* Departure Time */}
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Departure Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    value={departureDateTime}
                    onChange={(e) => setDepartureDateTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white focus:outline-none focus:border-neutral-900 text-xs font-mono"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">Blocks unavailable calendar periods.</p>
                </div>

                {/* Max Budget Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-neutral-700">Max Budget</label>
                    <span className="font-extrabold text-neutral-900">${maxPrice}/hr</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="25"
                    step="1"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-[#FF5A5F] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
                    <span>$4/hr</span>
                    <span>$15/hr</span>
                    <span>$25/hr</span>
                  </div>
                </div>

                {/* Walking Distance Filter */}
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Max Walking Distance
                  </label>
                  <select
                    value={maxDistanceMiles}
                    onChange={(e) => setMaxDistanceMiles(e.target.value === "any" ? "any" : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white focus:outline-none focus:border-neutral-900 text-xs font-medium cursor-pointer"
                  >
                    <option value="any">Any Distance</option>
                    <option value="0.25">Within 0.25 mi (~5 min walk)</option>
                    <option value="0.5">Within 0.5 mi (~10 min walk)</option>
                    <option value="1.0">Within 1.0 mi (~20 min walk)</option>
                    <option value="2.0">Within 2.0 mi (~40 min walk)</option>
                  </select>
                  <p className="text-[10px] text-neutral-500 mt-1">Based on urban pedestrian routing.</p>
                </div>
              </div>
            </div>
          )}

          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
              <span className="text-[#717171] font-medium text-[11px]">Active Filters:</span>
              {destinationQuery && (
                <span className="inline-flex items-center gap-1 bg-[#F7F7F7] border border-[#DDDDDD] px-2.5 py-0.5 rounded-full font-medium">
                  Destination: {destinationQuery}
                  <X className="h-3 w-3 cursor-pointer text-[#717171]" onClick={() => setDestinationQuery("")} />
                </span>
              )}
              {selectedVehicle !== "all" && (
                <span className="inline-flex items-center gap-1 bg-[#F7F7F7] border border-[#DDDDDD] px-2.5 py-0.5 rounded-full font-medium">
                  Vehicle: {selectedVehicle.toUpperCase()}
                  <X className="h-3 w-3 cursor-pointer text-[#717171]" onClick={() => setSelectedVehicle("all")} />
                </span>
              )}
              {(customHeight || customLength || customWidth) && (
                <span className="inline-flex items-center gap-1 bg-neutral-900 text-white px-2.5 py-0.5 rounded-full font-medium">
                  Custom: {customHeight ? `H:${customHeight}'` : ""} {customLength ? `L:${customLength}'` : ""}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => {
                      setCustomHeight("");
                      setCustomLength("");
                      setCustomWidth("");
                    }}
                  />
                </span>
              )}
              {arrivalDateTime && departureDateTime && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-0.5 rounded-full font-medium">
                  <Clock className="h-3 w-3" />
                  Time Window Selected
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => {
                      setArrivalDateTime("");
                      setDepartureDateTime("");
                    }}
                  />
                </span>
              )}
              {onlyCovered && (
                <span className="inline-flex items-center gap-1 bg-[#F7F7F7] border border-[#DDDDDD] px-2.5 py-0.5 rounded-full font-medium">
                  Covered Only
                  <X className="h-3 w-3 cursor-pointer text-[#717171]" onClick={() => setOnlyCovered(false)} />
                </span>
              )}
              {onlyEv && (
                <span className="inline-flex items-center gap-1 bg-sky-50 border border-sky-200 text-sky-800 px-2.5 py-0.5 rounded-full font-medium">
                  EV Fast Charging
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setOnlyEv(false)} />
                </span>
              )}
              {maxPrice < 15 && (
                <span className="inline-flex items-center gap-1 bg-[#F7F7F7] border border-[#DDDDDD] px-2.5 py-0.5 rounded-full font-medium">
                  Max ${maxPrice}/hr
                  <X className="h-3 w-3 cursor-pointer text-[#717171]" onClick={() => setMaxPrice(15)} />
                </span>
              )}
              {maxDistanceMiles !== "any" && (
                <span className="inline-flex items-center gap-1 bg-[#F7F7F7] border border-[#DDDDDD] px-2.5 py-0.5 rounded-full font-medium">
                  Max {maxDistanceMiles} mi
                  <X className="h-3 w-3 cursor-pointer text-[#717171]" onClick={() => setMaxDistanceMiles("any")} />
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Split List and Map */}
      <div className="flex-1 flex flex-col lg:flex-row relative">
        {/* Left / Main: Listings Column */}
        <div
          className={`w-full lg:w-7/12 p-4 sm:p-6 lg:p-8 overflow-y-auto ${
            mobileView === "map" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Header Summary & Ranking Philosophy Disclosure */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-neutral-100">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#222222]">
                  {isLoading ? "Searching Spaces..." : `${validSpaces.length} Verified Spaces Available`}
                </h1>
                {searchResponse?.source === "supabase" && (
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300 text-[10px]">
                    Live Supabase DB
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[#717171] mt-1 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Hard vehicle compatibility &amp; server booking availability strictly enforced.
              </p>
            </div>

            {/* Ranking disclosure badge */}
            <div className="text-[11px] text-neutral-500 bg-neutral-100 rounded-xl px-2.5 py-1 self-start sm:self-auto flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-neutral-600" />
              <span>Deterministic Multi-Criteria Ranking</span>
            </div>
          </div>

          {errorNotice && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
              {errorNotice}
            </div>
          )}

          {/* Demand Estimation & Driver Recommendations Banner */}
          {searchResponse?.demandEstimate && (
            <div className="mb-6 rounded-3xl border border-neutral-200 bg-white p-5 shadow-xs transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-neutral-600" />
                      Area Demand Forecast
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                        searchResponse.demandEstimate.demandLevel === "high"
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : searchResponse.demandEstimate.demandLevel === "medium"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {searchResponse.demandEstimate.label}
                    </span>
                    <Badge variant="outline" className="text-[10px] text-neutral-500 bg-neutral-50">
                      Rule-Based Heuristic (Score: {searchResponse.demandEstimate.score}/100)
                    </Badge>
                  </div>

                  <p className="text-sm font-semibold text-[#222222]">
                    {searchResponse.demandEstimate.summary}
                  </p>

                  <p className="text-[11px] text-[#717171] leading-relaxed">
                    <strong className="text-neutral-700">Notice:</strong> {searchResponse.demandEstimate.disclaimer}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFactorsDrawer(!showFactorsDrawer)}
                  className="shrink-0 text-xs font-bold text-neutral-800 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer"
                >
                  <span>Why this estimate?</span>
                  {showFactorsDrawer ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Explanatory Contributing Factors Breakdown Drawer */}
              {showFactorsDrawer && (
                <div className="mt-4 pt-4 border-t border-neutral-100 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-800 mb-1">
                    <span>Contributing Factors (Transparent Rule-Based Calculation)</span>
                    <span className="text-[11px] text-neutral-500 font-normal">
                      Deterministic score &bull; No ML model claimed
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {searchResponse.demandEstimate.contributingFactors.map((factor, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-start justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                            <span className="capitalize text-[10px] bg-white border border-neutral-200 px-1.5 py-0.2 rounded text-neutral-600">
                              {factor.category}
                            </span>
                            <span>{factor.name}</span>
                          </div>
                          <p className="text-[11px] text-neutral-600 leading-tight">{factor.reason}</p>
                        </div>
                        <span className="shrink-0 font-mono font-bold text-xs text-neutral-900 bg-white px-2 py-0.5 rounded-lg border border-neutral-200">
                          +{factor.scoreDelta} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Driver Smart Alternative Recommendations */}
              {(searchResponse.demandEstimate.nearbyAlternativeLocations.length > 0 ||
                searchResponse.demandEstimate.alternativeTimeWindows.length > 0) && (
                <div className="mt-4 pt-4 border-t border-neutral-100 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    <span>Smart Driver Recommendations to Avoid Peak Demand</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Alternative Nearby Location */}
                    {searchResponse.demandEstimate.nearbyAlternativeLocations.map((altLoc, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex flex-col justify-between space-y-2"
                      >
                        <div>
                          <div className="flex items-center justify-between font-bold text-amber-950">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-amber-700" />
                              {altLoc.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] bg-white text-amber-800 border-amber-300">
                              {altLoc.estimatedDemand.toUpperCase()} DEMAND
                            </Badge>
                          </div>
                          <p className="text-[11px] text-amber-800 mt-1">
                            {altLoc.reason} (avg ${altLoc.avgPricePerHour.toFixed(2)}/hr)
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setDestinationQuery(altLoc.neighborhood)}
                          className="self-start text-[11px] font-bold text-white bg-neutral-900 hover:bg-neutral-800 px-3 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>Search in {altLoc.neighborhood}</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    {/* Alternative Time Window */}
                    {searchResponse.demandEstimate.alternativeTimeWindows.slice(0, 1).map((altTime, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-sky-50/60 border border-sky-200/80 flex flex-col justify-between space-y-2"
                      >
                        <div>
                          <div className="flex items-center justify-between font-bold text-sky-950">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-sky-700" />
                              {altTime.label}
                            </span>
                            <span className="text-[10px] font-bold text-sky-800 bg-white px-2 py-0.5 rounded-full border border-sky-300">
                              {altTime.priceDifferencePercent}% Expected Rates
                            </span>
                          </div>
                          <p className="text-[11px] text-sky-800 mt-1">
                            {altTime.reason}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setArrivalDateTime(altTime.targetStartTimeIso.slice(0, 16));
                            setDepartureDateTime(altTime.targetEndTimeIso.slice(0, 16));
                          }}
                          className="self-start text-[11px] font-bold text-white bg-sky-800 hover:bg-sky-900 px-3 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>Apply Adjusted Window</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading Skeletons */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="aspect-4/3 w-full rounded-2xl" />
                  <Skeleton className="h-5 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-1/2 rounded-md" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : validSpaces.length > 0 ? (
            /* Direct Results Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {validSpaces.map((item) => (
                <div
                  key={item.space.id}
                  onMouseEnter={() => setHighlightedSpaceId(item.space.id)}
                  onMouseLeave={() => setHighlightedSpaceId(null)}
                >
                  <ParkingCard
                    space={item.space}
                    compatibility={item.compatibility}
                    distanceMiles={item.distanceMiles}
                    walkingTimeMinutes={item.walkingTimeMinutes}
                    rankingScore={item.score}
                  />
                </div>
              ))}
            </div>
          ) : (
            /* Empty State with Guaranteed Safe Alternatives */
            <div className="flex flex-col space-y-6">
              <div className="rounded-3xl border border-dashed border-[#DDDDDD] bg-[#F7F7F7] p-8 sm:p-12 text-center">
                <Car className="h-10 w-10 text-[#717171] mx-auto mb-3" />
                <h3 className="text-lg font-bold text-[#222222]">
                  No direct matches for your exact constraints
                </h3>
                <p className="text-xs sm:text-sm text-[#717171] max-w-md mx-auto mt-1 mb-4">
                  {selectedVehicle !== "all"
                    ? `We could not find parking spaces fitting your ${DETAILED_VEHICLE_PROFILES[selectedVehicle]?.name || "vehicle"} within your current distance or budget limits.`
                    : "No spaces match your combined filters."}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="brand" onClick={resetAllFilters} className="text-xs">
                    Clear All Filters
                  </Button>
                </div>
              </div>

              {/* Verified Safe Alternatives Section */}
              {alternativeSpaces.length > 0 && (
                <div className="pt-2">
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <h3 className="text-base font-bold text-[#222222]">
                        Recommended Compatible Alternatives ({alternativeSpaces.length})
                      </h3>
                    </div>
                    <p className="text-xs text-[#717171] mt-0.5">
                      These spaces strictly satisfy your vehicle clearance and availability requirements, but differ on secondary distance or budget filters.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {alternativeSpaces.map((item) => (
                      <div
                        key={item.space.id}
                        onMouseEnter={() => setHighlightedSpaceId(item.space.id)}
                        onMouseLeave={() => setHighlightedSpaceId(null)}
                      >
                        <ParkingCard
                          space={item.space}
                          compatibility={item.compatibility}
                          distanceMiles={item.distanceMiles}
                          walkingTimeMinutes={item.walkingTimeMinutes}
                          rankingScore={item.score}
                          isAlternative={true}
                          alternativeReason={item.alternativeReason}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Reusable Map Adapter (Sticky on Desktop) */}
        <div
          className={`w-full lg:w-5/12 h-[calc(100vh-140px)] sticky top-[140px] p-4 lg:p-6 ${
            mobileView === "list" ? "hidden lg:block" : "block h-[calc(100vh-140px)]"
          }`}
        >
          <MapAdapter
            spaces={mapSpaces}
            selectedSpaceId={highlightedSpaceId}
            onSelectSpace={(id) => setHighlightedSpaceId(id)}
            className="h-full w-full"
          />
        </div>
      </div>

      {/* Floating Mobile Toggle Button (List vs Map) */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <button
          type="button"
          onClick={() => setMobileView(mobileView === "list" ? "map" : "list")}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#222222] text-white font-bold text-sm shadow-xl active:scale-95 transition-transform"
        >
          {mobileView === "list" ? (
            <>
              <Map className="h-4 w-4" />
              <span>Show Map ({mapSpaces.length})</span>
            </>
          ) : (
            <>
              <List className="h-4 w-4" />
              <span>Show List</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-4 border-[#FF5A5F] border-t-transparent animate-spin" />
            <p className="text-sm font-semibold text-[#717171]">Loading parking spaces...</p>
          </div>
        </div>
      }
    >
      <SearchPageContent />
    </React.Suspense>
  );
}
