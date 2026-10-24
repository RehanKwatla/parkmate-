"use client";
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import { Warehouse, Car } from "lucide-react";

interface ParkingImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackTitle?: string;
}

export function ParkingImage({
  src,
  alt = "Parking Space",
  className = "",
  fallbackTitle = "Verified Parking Bay",
  ...props
}: ParkingImageProps) {
  const [hasError, setHasError] = React.useState(false);

  if (hasError || !src) {
    return (
      <div className={`w-full h-full bg-[#EAEAEA] flex flex-col items-center justify-center text-[#717171] p-4 text-center select-none ${className}`}>
        <div className="h-12 w-12 rounded-2xl bg-white/80 shadow-xs flex items-center justify-center text-[#222222] mb-2">
          <Warehouse className="h-6 w-6 stroke-[1.8]" />
        </div>
        <p className="text-xs font-bold text-[#222222]">{fallbackTitle}</p>
        <span className="text-[10px] text-[#999999] flex items-center gap-1 mt-1">
          <Car className="h-3 w-3" /> Space View Available
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={className}
      loading="lazy"
      {...props}
    />
  );
}
