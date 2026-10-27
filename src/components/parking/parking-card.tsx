"use client";

import * as React from "react";
import Link from "next/link";
import { 
  Heart, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Zap, 
  Warehouse, 
  Footprints, 
  Car,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { ParkingSpace } from "@/types/parking";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

import { ParkingImage } from "@/components/ui/parking-image";

import { CompatibilityResult } from "@/lib/compatibility-engine";

interface ParkingCardProps {
  space: ParkingSpace;
  userVehicleType?: string;
  compatibility?: CompatibilityResult;
  distanceMiles?: number;
  walkingTimeMinutes?: number;
  rankingScore?: number;
  alternativeReason?: string;
  isAlternative?: boolean;
}

export function ParkingCard({
  space,
  compatibility,
  distanceMiles,
  walkingTimeMinutes,
  rankingScore,
  alternativeReason,
  isAlternative,
}: ParkingCardProps) {
  const [currentImageIdx, setCurrentImageIdx] = React.useState(0);
  const [isSaved, setIsSaved] = React.useState(false);

  const images = space.images && space.images.length > 0 ? space.images : [
    "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80"
  ];

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIdx((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIdx((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const toggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSaved(!isSaved);
  };

  return (
    <div className="group relative flex flex-col rounded-2xl bg-white transition-all duration-200">
      <Link href={`/listings/${space.id}`} className="block">
        {/* Image Container */}
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-[#F0F0F0]">
          {/* Main Photo */}
          <ParkingImage
            src={images[currentImageIdx]}
            alt={space.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
          />

          {/* Verification & Real-Time Availability Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700/95 backdrop-blur-xs px-2.5 py-1 text-[10px] font-bold text-white shadow-xs">
              <CheckCircle2 className="h-3 w-3" />
              Verified Available (Real-Time)
            </span>

            {space.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur-xs px-2.5 py-1 text-[10px] font-bold text-[#222222] shadow-xs">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                Verified Space
              </span>
            )}

            {space.hasEvCharging && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/95 backdrop-blur-xs px-2 py-1 text-[11px] font-bold text-white shadow-xs">
                <Zap className="h-3 w-3 fill-white" />
                EV
              </span>
            )}
          </div>

          {/* Favourite Button */}
          <button
            type="button"
            onClick={toggleSave}
            aria-label={isSaved ? "Remove from saved" : "Save space"}
            className="absolute top-3 right-3 z-10 rounded-full p-2 text-white/90 drop-shadow-md hover:scale-110 active:scale-95 transition-transform"
          >
            <Heart
              className={`h-6 w-6 stroke-[2] ${
                isSaved ? "fill-[#FF5A5F] stroke-[#FF5A5F]" : "fill-black/30 stroke-white"
              }`}
            />
          </button>

          {/* Carousel Arrows (visible on hover) */}
          {images.length > 1 && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={handlePrevImage}
                aria-label="Previous image"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/90 text-[#222222] shadow-md flex items-center justify-center hover:bg-white hover:scale-105 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextImage}
                aria-label="Next image"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/90 text-[#222222] shadow-md flex items-center justify-center hover:bg-white hover:scale-105 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Indicator Dots */}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentImageIdx ? "w-3 bg-white" : "w-1.5 bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="mt-3 flex flex-col space-y-1">
          {/* Title & Rating */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-base text-[#222222] line-clamp-1 leading-snug">
              {space.title}
            </h3>
            <div className="flex items-center gap-1 shrink-0 text-sm font-semibold text-[#222222]">
              <Star className="h-3.5 w-3.5 fill-[#222222]" />
              <span>{space.rating.toFixed(2)}</span>
            </div>
          </div>

          {/* Location & Walking Distance */}
          <div className="flex items-center gap-1.5 text-xs text-[#717171]">
            <span>{space.neighborhood}, {space.city}</span>
            <span>&middot;</span>
            <span className="flex items-center gap-1 text-[#222222] font-medium">
              <Footprints className="h-3 w-3 text-[#FF5A5F]" />
              {distanceMiles !== undefined && walkingTimeMinutes !== undefined
                ? `${walkingTimeMinutes} min walk (${distanceMiles.toFixed(1)} mi)`
                : space.walkingDistance}
            </span>
          </div>

          {/* Compatibility & Clearance Chips */}
          <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
            <Badge variant="neutral" className="gap-1 py-0 px-2 font-medium">
              <Warehouse className="h-3 w-3" />
              {space.isCovered ? "Covered" : "Open Bay"}
            </Badge>

            <Badge variant="outline" className="gap-1 py-0 px-2 font-mono">
              <Car className="h-3 w-3" />
              {space.clearanceFeet}&apos; clearance
            </Badge>

            {compatibility && (
              <Badge
                variant="outline"
                className={`gap-1 py-0 px-2 font-medium text-[10px] ${
                  compatibility.isCompatible
                    ? "border-emerald-300 text-emerald-800 bg-emerald-50/60"
                    : "border-red-300 text-red-700 bg-red-50"
                }`}
              >
                {compatibility.isCompatible
                  ? `+${compatibility.clearanceBufferFeet.toFixed(1)}' buffer`
                  : "Incompatible"}
              </Badge>
            )}

            {space.recoveryGuaranteed && (
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                Recovery Guaranteed
              </span>
            )}

            {rankingScore !== undefined && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono bg-neutral-50 text-neutral-600 border-neutral-300">
                {Math.round(rankingScore)}% match
              </Badge>
            )}
          </div>

          {/* Alternative Suggestion Banner */}
          {isAlternative && alternativeReason && (
            <div className="mt-1.5 rounded-lg bg-amber-50/90 border border-amber-200/80 px-2.5 py-1 text-[11px] text-amber-900 flex items-start gap-1.5 font-medium">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>{alternativeReason}</span>
            </div>
          )}

          {/* Pricing Row */}
          <div className="pt-2 flex items-baseline justify-between">
            <div className="text-sm">
              <span className="font-extrabold text-[#222222] text-base">
                {formatCurrency(space.pricePerHour)}
              </span>
              <span className="text-[#717171] font-medium"> / hr</span>
              <span className="text-xs text-[#717171] ml-2">
                ({formatCurrency(space.pricePerDay)} / day)
              </span>
            </div>

            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {space.availableSlotsCount} spots open
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
