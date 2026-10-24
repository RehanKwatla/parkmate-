"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Clock, Car } from "lucide-react";
import { POPULAR_DESTINATIONS, VEHICLE_PRESETS } from "@/lib/constants";
import { VehicleType } from "@/types/parking";

interface SearchBarProps {
  initialDestination?: string;
  initialVehicle?: VehicleType | "all";
  onSearch?: (params: { destination: string; vehicle: VehicleType | "all" }) => void;
  compact?: boolean;
}

export function SearchBar({
  initialDestination = "",
  initialVehicle = "all",
  onSearch,
  compact = false,
}: SearchBarProps) {
  const router = useRouter();
  const [destination, setDestination] = React.useState(initialDestination);
  const [vehicle, setVehicle] = React.useState<VehicleType | "all">(initialVehicle);
  const [arrivalDate, setArrivalDate] = React.useState("Today");
  const [departureDate, setDepartureDate] = React.useState("Today + 3 hrs");
  
  const [activeTab, setActiveTab] = React.useState<"dest" | "dates" | "vehicle" | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveTab(null);
    if (onSearch) {
      onSearch({ destination, vehicle });
    } else {
      const query = new URLSearchParams();
      if (destination) query.set("destination", destination);
      if (vehicle !== "all") query.set("vehicle", vehicle);
      router.push(`/search?${query.toString()}`);
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <form
        onSubmit={handleSearchSubmit}
        className={`bg-white rounded-full border border-[#DDDDDD] shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)] transition-shadow flex flex-col md:flex-row items-center p-2 divide-y md:divide-y-0 md:divide-x divide-[#EAEAEA] relative z-20 ${
          compact ? "p-1.5" : "p-2"
        }`}
      >
        {/* Destination */}
        <div 
          onClick={() => setActiveTab(activeTab === "dest" ? null : "dest")}
          className="w-full md:w-5/12 px-6 py-2.5 rounded-full cursor-pointer hover:bg-[#F7F7F7] transition-colors relative"
        >
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#222222]">
            Where
          </label>
          <div className="flex items-center gap-2 mt-0.5">
            <MapPin className="h-4 w-4 text-[#FF5A5F] shrink-0" />
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Search destination, venue, or address"
              className="w-full bg-transparent text-sm font-semibold text-[#222222] placeholder:text-[#999999] focus:outline-none"
              onClick={(e) => e.stopPropagation()}
              onFocus={() => setActiveTab("dest")}
            />
          </div>

          {/* Destination Dropdown */}
          {activeTab === "dest" && (
            <div 
              className="absolute left-0 top-full mt-3 w-80 md:w-96 rounded-3xl bg-white shadow-2xl border border-[#EAEAEA] p-4 z-50 animate-in fade-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-[#717171] mb-2 px-2">
                Popular Parking Hotspots
              </p>
              <div className="space-y-1">
                {POPULAR_DESTINATIONS.map((dest) => (
                  <button
                    key={dest.name}
                    type="button"
                    onClick={() => {
                      setDestination(dest.name);
                      setActiveTab("vehicle");
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-[#F7F7F7] flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-[#FFF0F1] text-[#FF5A5F] flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#222222] group-hover:text-[#FF5A5F]">
                          {dest.name}
                        </p>
                        <p className="text-xs text-[#717171]">{dest.city}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {dest.spotsCount} spots
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Arrival & Departure Times */}
        <div 
          onClick={() => setActiveTab(activeTab === "dates" ? null : "dates")}
          className="w-full md:w-4/12 px-6 py-2.5 rounded-full cursor-pointer hover:bg-[#F7F7F7] transition-colors relative"
        >
          <div className="flex justify-between items-center">
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#222222]">
                When
              </label>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-[#222222] mt-0.5">
                <Clock className="h-3.5 w-3.5 text-[#717171]" />
                <span className="truncate">{arrivalDate} &rarr; {departureDate}</span>
              </div>
            </div>
          </div>

          {/* Dates quick selector */}
          {activeTab === "dates" && (
            <div 
              className="absolute left-0 md:left-auto md:right-0 top-full mt-3 w-72 rounded-3xl bg-white shadow-2xl border border-[#EAEAEA] p-4 z-50 animate-in fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-[#717171] mb-2 px-1">
                Duration & Slot
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: "Next 2 Hours", arr: "Now", dep: "+2 hrs" },
                  { label: "All Day Pass", arr: "Today 8 AM", dep: "6 PM" },
                  { label: "Overnight Safe", arr: "7 PM", dep: "Tomorrow 8 AM" },
                  { label: "Weekend Event", arr: "Sat 12 PM", dep: "Sat 9 PM" },
                ].map((slot) => (
                  <button
                    key={slot.label}
                    type="button"
                    onClick={() => {
                      setArrivalDate(slot.arr);
                      setDepartureDate(slot.dep);
                      setActiveTab("vehicle");
                    }}
                    className="p-2.5 rounded-xl border border-[#EAEAEA] hover:border-[#222222] text-left hover:bg-[#F7F7F7]"
                  >
                    <p className="font-bold text-[#222222]">{slot.label}</p>
                    <p className="text-[10px] text-[#717171]">{slot.arr} &rarr; {slot.dep}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Vehicle Compatibility Filter */}
        <div 
          onClick={() => setActiveTab(activeTab === "vehicle" ? null : "vehicle")}
          className="w-full md:w-3/12 px-6 py-2.5 rounded-full cursor-pointer hover:bg-[#F7F7F7] transition-colors relative"
        >
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#222222]">
            Vehicle
          </label>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-[#222222] mt-0.5">
            <Car className="h-4 w-4 text-[#717171]" />
            <span className="capitalize truncate">
              {vehicle === "all" ? "Any Vehicle" : vehicle}
            </span>
          </div>

          {/* Vehicle Dropdown */}
          {activeTab === "vehicle" && (
            <div 
              className="absolute right-0 top-full mt-3 w-80 rounded-3xl bg-white shadow-2xl border border-[#EAEAEA] p-4 z-50 animate-in fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-[#717171] mb-2 px-1">
                Select Your Vehicle Type
              </p>
              <p className="text-[11px] text-[#717171] mb-3 px-1">
                We automatically filter ceiling clearance & bay size to guarantee fit.
              </p>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setVehicle("all");
                    setActiveTab(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between ${
                    vehicle === "all" ? "bg-[#FFF0F1] text-[#FF5A5F]" : "hover:bg-[#F7F7F7] text-[#222222]"
                  }`}
                >
                  <span>All Vehicles (Standard)</span>
                  {vehicle === "all" && <span>&bull;</span>}
                </button>
                {VEHICLE_PRESETS.map((vp) => (
                  <button
                    key={vp.id}
                    type="button"
                    onClick={() => {
                      setVehicle(vp.id);
                      setActiveTab(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      vehicle === vp.id ? "bg-[#FFF0F1] text-[#FF5A5F]" : "hover:bg-[#F7F7F7] text-[#222222]"
                    }`}
                  >
                    <div>
                      <p className="font-bold">{vp.name}</p>
                      <p className="text-[10px] text-[#717171]">{vp.category}</p>
                    </div>
                    <span className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded font-mono">
                      {vp.heightFeet} ft
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search Submit Button */}
        <div className="w-full md:w-auto p-1.5 flex justify-end">
          <button
            type="submit"
            className="w-full md:w-auto h-12 px-6 rounded-full bg-gradient-to-r from-[#FF5A5F] to-[#E0484D] text-white font-bold flex items-center justify-center gap-2 hover:opacity-95 shadow-md shadow-[#FF5A5F]/20 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A5F]"
          >
            <Search className="h-4 w-4 stroke-[2.5]" />
            <span className="text-sm">Search</span>
          </button>
        </div>
      </form>
    </div>
  );
}
