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
  Car
} from "lucide-react";
import { MOCK_PARKING_SPACES } from "@/lib/mock-data";
import { ParkingCard } from "@/components/parking/parking-card";
import { InteractiveMap } from "@/components/map/interactive-map";
import { Button } from "@/components/ui/button";
import { VEHICLE_PRESETS } from "@/lib/constants";
import { VehicleType } from "@/types/parking";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialDestination = searchParams.get("destination") || "";
  const initialVehicle = (searchParams.get("vehicle") as VehicleType) || "all";

  // Filter States
  const [destinationQuery, setDestinationQuery] = React.useState(initialDestination);
  const [selectedVehicle, setSelectedVehicle] = React.useState<VehicleType | "all">(initialVehicle);
  const [onlyCovered, setOnlyCovered] = React.useState(false);
  const [onlyEv, setOnlyEv] = React.useState(false);
  const [maxPrice, setMaxPrice] = React.useState(15);
  const [maxWalkMins, setMaxWalkMins] = React.useState<number | null>(null);
  const [sortBy, setSortBy] = React.useState<"recommended" | "price_asc" | "price_desc" | "rating">("recommended");
  
  // UI states
  const [mobileView, setMobileView] = React.useState<"list" | "map">("list");
  const [highlightedSpaceId, setHighlightedSpaceId] = React.useState<string | null>(null);

  // Active filter count calculation
  const activeFiltersCount = [
    destinationQuery !== "",
    selectedVehicle !== "all",
    onlyCovered,
    onlyEv,
    maxPrice < 15,
    maxWalkMins !== null,
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setDestinationQuery("");
    setSelectedVehicle("all");
    setOnlyCovered(false);
    setOnlyEv(false);
    setMaxPrice(15);
    setMaxWalkMins(null);
    setSortBy("recommended");
  };

  // Filter & Sort Logic
  const filteredSpaces = React.useMemo(() => {
    const list = MOCK_PARKING_SPACES.filter((s) => {
      // Destination search
      if (destinationQuery) {
        const query = destinationQuery.toLowerCase();
        const matchesLocation =
          s.title.toLowerCase().includes(query) ||
          s.address.toLowerCase().includes(query) ||
          s.neighborhood.toLowerCase().includes(query);
        if (!matchesLocation) return false;
      }

      // Vehicle clearance compatibility
      if (selectedVehicle !== "all") {
        const preset = VEHICLE_PRESETS.find((v) => v.id === selectedVehicle);
        if (preset && s.clearanceFeet < preset.heightFeet) {
          return false;
        }
      }

      // Covered filter
      if (onlyCovered && !s.isCovered) return false;

      // EV filter
      if (onlyEv && !s.hasEvCharging) return false;

      // Price filter
      if (s.pricePerHour > maxPrice) return false;

      return true;
    });

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === "price_asc") return a.pricePerHour - b.pricePerHour;
      if (sortBy === "price_desc") return b.pricePerHour - a.pricePerHour;
      if (sortBy === "rating") return b.rating - a.rating;
      return 0; // recommended
    });
  }, [destinationQuery, selectedVehicle, onlyCovered, onlyEv, maxPrice, sortBy]);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Top Search & Filter Bar */}
      <div className="sticky top-20 z-30 bg-white border-b border-[#EBEBEB] px-4 sm:px-6 lg:px-8 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Search input & Active Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-[200px] sm:min-w-[280px]">
              <input
                type="text"
                value={destinationQuery}
                onChange={(e) => setDestinationQuery(e.target.value)}
                placeholder="Filter by area, street, or spot name..."
                className="w-full text-xs sm:text-sm pl-3.5 pr-8 py-2 rounded-full border border-[#DDDDDD] bg-[#F7F7F7] focus:bg-white focus:outline-none focus:border-[#222222]"
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
              Covered Parking
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
              EV Charging
            </button>

            {/* Vehicle Selector Pill */}
            <div className="hidden sm:flex items-center gap-1 text-xs">
              <span className="text-[#717171] font-medium">Vehicle:</span>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value as VehicleType | "all")}
                className="bg-[#F7F7F7] border border-[#DDDDDD] rounded-full px-2.5 py-1 text-xs font-bold text-[#222222] focus:outline-none"
              >
                <option value="all">Any Size</option>
                <option value="compact">Compact (&lt; 4.8ft)</option>
                <option value="sedan">Sedan (&lt; 5.0ft)</option>
                <option value="suv">SUV (&lt; 6.0ft)</option>
                <option value="truck">Truck / Van (&lt; 7.0ft)</option>
              </select>
            </div>
          </div>

          {/* Right: Sort and Filter Trigger */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[#717171] hidden md:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "recommended" | "price_asc" | "price_desc" | "rating")}
                className="bg-white border border-[#DDDDDD] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#222222] focus:outline-none cursor-pointer"
              >
                <option value="recommended">Recommended</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-xs text-[#FF5A5F] hover:underline font-bold px-2 py-1 flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFiltersCount > 0 && (
          <div className="max-w-7xl mx-auto flex items-center gap-2 pt-2.5 flex-wrap text-xs">
            <span className="text-[#717171] font-medium">Active:</span>
            {destinationQuery && (
              <span className="inline-flex items-center gap-1 bg-[#F7F7F7] border border-[#DDDDDD] px-2.5 py-0.5 rounded-full font-medium">
                Area: {destinationQuery}
                <X className="h-3 w-3 cursor-pointer text-[#717171]" onClick={() => setDestinationQuery("")} />
              </span>
            )}
            {selectedVehicle !== "all" && (
              <span className="inline-flex items-center gap-1 bg-[#F7F7F7] border border-[#DDDDDD] px-2.5 py-0.5 rounded-full font-medium">
                Vehicle: {selectedVehicle}
                <X className="h-3 w-3 cursor-pointer text-[#717171]" onClick={() => setSelectedVehicle("all")} />
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
          </div>
        )}
      </div>

      {/* Main Content: Split List and Map on Desktop, Toggle on Mobile */}
      <div className="flex-1 flex flex-col lg:flex-row relative">
        {/* Left / Main: Listings Grid */}
        <div
          className={`w-full lg:w-7/12 p-4 sm:p-6 lg:p-8 overflow-y-auto ${
            mobileView === "map" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Results Summary */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#222222]">
                {filteredSpaces.length} Parking {filteredSpaces.length === 1 ? "Space" : "Spaces"} in San Francisco
              </h1>
              <p className="text-xs text-[#717171] mt-0.5">
                All spots include real-time vehicle clearance guarantee &amp; Booking Recovery protection
              </p>
            </div>
          </div>

          {/* Listings List */}
          {filteredSpaces.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredSpaces.map((space) => (
                <div
                  key={space.id}
                  onMouseEnter={() => setHighlightedSpaceId(space.id)}
                  onMouseLeave={() => setHighlightedSpaceId(null)}
                >
                  <ParkingCard space={space} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#DDDDDD] bg-[#F7F7F7] p-12 text-center my-6">
              <Car className="h-10 w-10 text-[#717171] mx-auto mb-3" />
              <h3 className="text-lg font-bold text-[#222222]">No parking spaces match these criteria</h3>
              <p className="text-sm text-[#717171] mt-1 mb-4">
                Try widening your vehicle clearance requirements or removing covered/EV restrictions.
              </p>
              <Button variant="brand" onClick={resetAllFilters}>
                Clear All Filters
              </Button>
            </div>
          )}
        </div>

        {/* Right: Interactive Map (Sticky on Desktop) */}
        <div
          className={`w-full lg:w-5/12 h-[calc(100vh-140px)] sticky top-[140px] p-4 lg:p-6 ${
            mobileView === "list" ? "hidden lg:block" : "block h-[calc(100vh-140px)]"
          }`}
        >
          <InteractiveMap
            spaces={filteredSpaces}
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
              <span>Show Map ({filteredSpaces.length})</span>
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
