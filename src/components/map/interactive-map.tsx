"use client";

import * as React from "react";
import { ParkingSpace } from "@/types/parking";
import { formatCurrency } from "@/lib/utils";
import { Plus, Minus, Zap, X, Star } from "lucide-react";
import Link from "next/link";
import { ParkingImage } from "@/components/ui/parking-image";

interface InteractiveMapProps {
  spaces: ParkingSpace[];
  selectedSpaceId?: string | null;
  onSelectSpace?: (spaceId: string) => void;
  className?: string;
}

export function InteractiveMap({
  spaces,
  selectedSpaceId,
  onSelectSpace,
  className = "",
}: InteractiveMapProps) {
  const [zoom, setZoom] = React.useState(14);
  const [hoveredSpaceId, setHoveredSpaceId] = React.useState<string | null>(null);
  const [activeSpace, setActiveSpace] = React.useState<ParkingSpace | null>(null);

  // Pune center reference: lat 18.5204, lng 73.8567
  const centerLat = 18.5204;
  const centerLng = 73.8567;

  const getPositionStyle = (lat: number, lng: number) => {
    // Map offsets to percentage coordinates within container
    const deltaLat = lat - centerLat;
    const deltaLng = lng - centerLng;
    
    // Scale factor based on zoom
    const zoomMultiplier = (zoom / 14) * 1600;
    
    const xPercent = 50 + deltaLng * zoomMultiplier;
    const yPercent = 50 - deltaLat * zoomMultiplier * 1.3;

    // Constrain within bounds
    const clampedX = Math.min(Math.max(xPercent, 8), 92);
    const clampedY = Math.min(Math.max(yPercent, 10), 90);

    return {
      left: `${clampedX}%`,
      top: `${clampedY}%`,
    };
  };

  const handleMarkerClick = (space: ParkingSpace) => {
    setActiveSpace(space);
    if (onSelectSpace) onSelectSpace(space.id);
  };

  return (
    <div className={`relative w-full h-full min-h-[420px] rounded-3xl overflow-hidden bg-[#E8ECEF] border border-[#DDDDDD] shadow-inner select-none ${className}`}>
      {/* Stylized Vector Map Background Canvas */}
      <svg
        className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-80"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1000 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C9E5F5" />
            <stop offset="100%" stopColor="#B3DCF2" />
          </linearGradient>
          <pattern id="cityGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#DCE1E5" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Background land */}
        <rect width="1000" height="800" fill="#F4F4F2" />
        <rect width="1000" height="800" fill="url(#cityGrid)" opacity="0.6" />

        {/* Water / Bay Area curves */}
        <path
          d="M 680 0 Q 720 200, 780 400 T 920 800 L 1000 800 L 1000 0 Z"
          fill="url(#waterGrad)"
        />

        {/* Major Thoroughfares & Streets */}
        <path d="M 100 700 L 900 150" stroke="#FFFFFF" strokeWidth="16" />
        <path d="M 100 700 L 900 150" stroke="#E2A687" strokeWidth="6" strokeDasharray="6,4" />
        
        {/* Highway 101 / Market St axis */}
        <path d="M 0 450 Q 400 420, 850 320" stroke="#FFFFFF" strokeWidth="20" />
        <path d="M 0 450 Q 400 420, 850 320" stroke="#F6D799" strokeWidth="10" />

        <path d="M 450 0 L 520 800" stroke="#FFFFFF" strokeWidth="14" />
        <path d="M 300 0 L 360 800" stroke="#FFFFFF" strokeWidth="10" />
        <path d="M 620 0 L 680 800" stroke="#FFFFFF" strokeWidth="10" />

        {/* Parks / Green spaces */}
        <rect x="180" y="240" width="160" height="120" rx="20" fill="#D2E8CE" opacity="0.8" />
        <text x="210" y="305" fill="#5F8857" fontSize="12" fontWeight="bold" fontFamily="sans-serif">
          Yerba Buena Gardens
        </text>

        <rect x="600" y="520" width="140" height="90" rx="16" fill="#D2E8CE" opacity="0.8" />
        <text x="625" y="568" fill="#5F8857" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
          Oracle Park Basin
        </text>
      </svg>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 shadow-md">
        <button
          type="button"
          onClick={() => setZoom((prev) => Math.min(prev + 1, 18))}
          className="h-10 w-10 rounded-xl bg-white border border-[#EAEAEA] flex items-center justify-center text-[#222222] hover:bg-[#F7F7F7] active:scale-95 transition-all shadow-xs"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((prev) => Math.max(prev - 1, 10))}
          className="h-10 w-10 rounded-xl bg-white border border-[#EAEAEA] flex items-center justify-center text-[#222222] hover:bg-[#F7F7F7] active:scale-95 transition-all shadow-xs"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Location / Current Area Badge */}
      <div className="absolute top-4 left-4 z-20">
        <div className="flex items-center gap-2 rounded-full bg-white/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-[#222222] shadow-md border border-[#EAEAEA]">
          <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
          <span>Pune Metro Area</span>
          <span className="text-[#717171] font-normal">({spaces.length} spots)</span>
        </div>
      </div>

      {/* Interactive Price Pins */}
      {spaces.map((space) => {
        const isSelected = selectedSpaceId === space.id || activeSpace?.id === space.id;
        const isHovered = hoveredSpaceId === space.id;
        const style = getPositionStyle(space.coordinates.lat, space.coordinates.lng);

        return (
          <div
            key={space.id}
            style={style}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-300"
          >
            <button
              type="button"
              onClick={() => handleMarkerClick(space)}
              onMouseEnter={() => setHoveredSpaceId(space.id)}
              onMouseLeave={() => setHoveredSpaceId(null)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-extrabold text-xs shadow-lg transition-all duration-200 cursor-pointer active:scale-90 ${
                isSelected
                  ? "bg-[#222222] text-white scale-110 ring-4 ring-[#222222]/20 z-30"
                  : isHovered
                  ? "bg-[#FF5A5F] text-white scale-110 z-30"
                  : "bg-white text-[#222222] hover:bg-[#F7F7F7] border border-[#DDDDDD] hover:scale-105"
              }`}
            >
              {space.hasEvCharging && (
                <Zap className={`h-3 w-3 ${isSelected || isHovered ? "fill-white" : "fill-sky-500 text-sky-500"}`} />
              )}
              <span>{formatCurrency(space.pricePerHour)}/hr</span>
            </button>
          </div>
        );
      })}

      {/* Active Space Popup Card Overlay */}
      {activeSpace && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-30 bg-white rounded-2xl shadow-2xl border border-[#EAEAEA] p-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {activeSpace.walkingDistance}
            </span>
            <button
              type="button"
              onClick={() => setActiveSpace(null)}
              className="p-1 rounded-full text-[#717171] hover:bg-[#F7F7F7]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-3">
            <ParkingImage
              src={activeSpace.images[0]}
              alt={activeSpace.title}
              className="h-20 w-20 rounded-xl object-cover shrink-0"
            />
            <div className="flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs text-[#222222] line-clamp-1">
                  {activeSpace.title}
                </h4>
                <p className="text-[11px] text-[#717171]">{activeSpace.neighborhood}</p>
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#222222] mt-0.5">
                  <Star className="h-3 w-3 fill-[#222222]" />
                  <span>{activeSpace.rating}</span>
                  <span className="text-[#717171] font-normal">({activeSpace.reviewCount})</span>
                </div>
              </div>

              <div className="flex items-baseline justify-between mt-1">
                <span className="font-extrabold text-[#222222] text-sm">
                  {formatCurrency(activeSpace.pricePerHour)}/hr
                </span>
                <Link
                  href={`/listings/${activeSpace.id}`}
                  className="text-xs font-bold text-[#FF5A5F] hover:underline"
                >
                  View Details &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
