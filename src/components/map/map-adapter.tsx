"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { ParkingSpace } from "@/types/parking";
import { MapPin, Loader2 } from "lucide-react";

interface MapAdapterProps {
  spaces: ParkingSpace[];
  selectedSpaceId?: string | null;
  onSelectSpace?: (spaceId: string) => void;
  className?: string;
}

// Dynamically import Leaflet map with SSR disabled to prevent window/document undefined errors
const LeafletMapInner = dynamic(() => import("./leaflet-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="relative w-full h-full min-h-[420px] rounded-3xl overflow-hidden bg-neutral-100 border border-[#DDDDDD] flex flex-col items-center justify-center p-6 text-center shadow-inner">
      <div className="w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center text-[#FF5A5F] mb-3 animate-bounce">
        <MapPin className="w-6 h-6" />
      </div>
      <div className="flex items-center gap-2 text-sm font-bold text-neutral-800">
        <Loader2 className="w-4 h-4 animate-spin text-[#FF5A5F]" />
        <span>Loading OpenStreetMap (Pune)...</span>
      </div>
      <p className="text-xs text-neutral-500 mt-1 max-w-xs">
        Loading live OpenStreetMap vector tiles &amp; plotting parking bays across Pune
      </p>
    </div>
  ),
});

export function MapAdapter({
  spaces,
  selectedSpaceId,
  onSelectSpace,
  className = "",
}: MapAdapterProps) {
  return (
    <LeafletMapInner
      spaces={spaces}
      selectedSpaceId={selectedSpaceId}
      onSelectSpace={onSelectSpace}
      className={className}
    />
  );
}
