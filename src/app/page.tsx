"use client";

import * as React from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  ArrowRight,
  CheckCircle,
  Clock,
  Car
} from "lucide-react";
import { SearchBar } from "@/components/parking/search-bar";
import { CategoryTabs } from "@/components/parking/category-tabs";
import { ParkingCard } from "@/components/parking/parking-card";
import { DifferentiatorsSection } from "@/components/parking/differentiator-banner";
import { HostCtaSection } from "@/components/parking/host-cta-section";
import { MOCK_PARKING_SPACES } from "@/lib/mock-data";
import { SpaceCategory, ParkingSpace } from "@/types/parking";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = React.useState<SpaceCategory>("all");
  const [selectedCityFilter, setSelectedCityFilter] = React.useState<string>("all");
  const [spaces, setSpaces] = React.useState<ParkingSpace[]>(MOCK_PARKING_SPACES);

  React.useEffect(() => {
    fetch("/api/listings")
      .then((res) => res.json())
      .then((data) => {
        if (data.data && data.data.length > 0) {
          setSpaces(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const filteredSpaces = React.useMemo(() => {
    return spaces.filter((space) => {
      const matchCategory =
        selectedCategory === "all" || space.category === selectedCategory;
      const matchCity =
        selectedCityFilter === "all" || space.neighborhood.toLowerCase().includes(selectedCityFilter.toLowerCase());
      return matchCategory && matchCity;
    });
  }, [spaces, selectedCategory, selectedCityFilter]);

  const neighborhoods = [
    { id: "all", name: "All San Francisco" },
    { id: "Financial District", name: "Financial District" },
    { id: "Nob Hill", name: "Nob Hill" },
    { id: "SoMa", name: "SoMa & Moscone" },
    { id: "Airport", name: "SFO Airport Area" },
    { id: "Mission", name: "Mission District" },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section with Search */}
      <section className="relative pt-10 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-[#FCFCFC] to-[#F7F7F7] border-b border-[#EAEAEA]">
        <div className="max-w-7xl mx-auto">
          {/* Hero Header */}
          <div className="text-center max-w-3xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF0F1] text-[#FF5A5F] text-xs font-bold mb-4 shadow-xs">
              <ShieldCheck className="h-4 w-4" />
              <span>100% Guaranteed Space or Instant Recovery Replacement</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#222222] leading-[1.15]">
              Parking as seamless as <br className="hidden sm:inline" />
              <span className="text-[#FF5A5F]">staying somewhere great.</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-[#717171] max-w-2xl mx-auto">
              Reserve private driveways, residential carports, and verified garages with guaranteed vehicle clearance and flexible time extensions.
            </p>
          </div>

          {/* Prominent Search Bar */}
          <div className="relative z-20">
            <SearchBar />
          </div>

          {/* Trust Badges Bar */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#717171]">
            <span className="flex items-center gap-1.5 font-semibold text-[#222222]">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              Real Ceiling Clearances Verified
            </span>
            <span className="hidden sm:inline text-neutral-300">&bull;</span>
            <span className="flex items-center gap-1.5 font-semibold text-[#222222]">
              <Clock className="h-4 w-4 text-[#0284C7]" />
              1-Click Flexible Extensions
            </span>
            <span className="hidden sm:inline text-neutral-300">&bull;</span>
            <span className="flex items-center gap-1.5 font-semibold text-[#222222]">
              <ShieldCheck className="h-4 w-4 text-[#FF5A5F]" />
              ParkMate Booking Recovery Protection
            </span>
          </div>
        </div>
      </section>

      {/* Category Tabs Bar */}
      <CategoryTabs
        activeCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Main Listings Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex-1">
        {/* Neighborhood / Area Quick Filter Pills */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-[#222222] tracking-tight">
              Featured Spaces Available Now
            </h2>
            <p className="text-sm text-[#717171] mt-0.5">
              Showing {filteredSpaces.length} spots in verified high-demand urban corridors
            </p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
            {neighborhoods.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setSelectedCityFilter(n.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  selectedCityFilter === n.id
                    ? "bg-[#222222] text-white border-[#222222] shadow-xs"
                    : "bg-white text-[#717171] border-[#DDDDDD] hover:border-[#222222] hover:text-[#222222]"
                }`}
              >
                {n.name}
              </button>
            ))}
          </div>
        </div>

        {/* Listings Grid */}
        {filteredSpaces.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredSpaces.map((space) => (
              <ParkingCard key={space.id} space={space} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#DDDDDD] bg-[#F7F7F7] p-12 text-center">
            <Car className="h-10 w-10 text-[#717171] mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#222222]">No spaces found in this category</h3>
            <p className="text-sm text-[#717171] mt-1 mb-4">
              Try changing the filter or viewing all available spaces across San Francisco.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedCategory("all");
                setSelectedCityFilter("all");
              }}
            >
              Reset Filters
            </Button>
          </div>
        )}

        {/* Explore More CTA */}
        <div className="mt-14 text-center">
          <Link href="/search">
            <Button size="lg" className="rounded-full px-8 font-bold gap-2 shadow-sm">
              Explore All Spaces on Map
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* 5 Core Differentiators Section */}
      <DifferentiatorsSection />

      {/* Owner Acquisition & Smart Sharing Section */}
      <HostCtaSection />
    </div>
  );
}
