"use client";

import * as React from "react";
import { ParkingSpace } from "@/types/parking";
import { InteractiveMap } from "./interactive-map";
import { AlertCircle, Settings2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type MapProvider = "mapbox" | "google" | "vector_fallback";

interface MapAdapterProps {
  spaces: ParkingSpace[];
  selectedSpaceId?: string | null;
  onSelectSpace?: (spaceId: string) => void;
  className?: string;
  forceProviderUnavailable?: boolean;
}

export function MapAdapter({
  spaces,
  selectedSpaceId,
  onSelectSpace,
  className = "",
  forceProviderUnavailable = false,
}: MapAdapterProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Determine active provider
  const detectedProvider: MapProvider = React.useMemo(() => {
    if (forceProviderUnavailable) return "vector_fallback";
    if (mapboxToken && mapboxToken !== "pk.your_mapbox_public_token_here") return "mapbox";
    if (googleKey && googleKey !== "your_google_maps_browser_key_here") return "google";
    return "vector_fallback";
  }, [mapboxToken, googleKey, forceProviderUnavailable]);

  const [activeProvider, setActiveProvider] = React.useState<MapProvider>(detectedProvider);
  const [showDiagnostics, setShowDiagnostics] = React.useState(false);

  // If map provider is simulated unavailable or unconfigured
  const isExternalConfigured = Boolean(
    (mapboxToken && mapboxToken !== "pk.your_mapbox_public_token_here") ||
    (googleKey && googleKey !== "your_google_maps_browser_key_here")
  );

  return (
    <div className={`relative w-full h-full min-h-[420px] rounded-3xl overflow-hidden flex flex-col ${className}`}>
      {/* Top Map Engine Status Bar */}
      <div className="absolute top-4 left-4 z-30 flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className="bg-white/95 backdrop-blur-md border-neutral-300 shadow-sm text-neutral-800 text-[11px] font-bold flex items-center gap-1.5 py-1 px-3"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {activeProvider === "mapbox" && "Mapbox Vector Tiles"}
          {activeProvider === "google" && "Google Maps Platform"}
          {activeProvider === "vector_fallback" && "ParkMate High-Precision Vector Engine"}
        </Badge>

        <button
          type="button"
          onClick={() => setShowDiagnostics((prev) => !prev)}
          className="h-7 px-2.5 rounded-full bg-white/90 backdrop-blur-md border border-neutral-200 text-neutral-600 hover:text-neutral-900 text-[10px] font-bold flex items-center gap-1 shadow-sm transition"
        >
          <Settings2 className="w-3 h-3" />
          <span>Adapter Info</span>
        </button>
      </div>

      {/* Diagnostics / Map-Unavailable State Banner */}
      {showDiagnostics && (
        <div className="absolute top-16 left-4 right-4 z-30 bg-neutral-900/95 text-white backdrop-blur-md p-4 rounded-2xl border border-neutral-700 shadow-xl text-xs space-y-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              Reusable Map Adapter Diagnostics
            </span>
            <button
              onClick={() => setShowDiagnostics(false)}
              className="text-neutral-400 hover:text-white font-bold"
            >
              ✕
            </button>
          </div>
          <div className="text-neutral-300 text-[11px] space-y-1">
            <p>
              &bull; External Provider Status:{" "}
              {isExternalConfigured ? (
                <span className="text-emerald-400 font-bold">API Key Detected</span>
              ) : (
                <span className="text-amber-300 font-semibold">Unconfigured (Safe Fallback Active)</span>
              )}
            </p>
            <p>&bull; Active Render Mode: <span className="font-mono text-purple-300">{activeProvider}</span></p>
            <p>&bull; Interactive Pins: <span className="font-bold text-white">{spaces.length} parking spaces plotted</span></p>
          </div>

          <div className="pt-2 border-t border-neutral-800 flex items-center gap-2">
            <span className="text-[10px] text-neutral-400">Switch Engine:</span>
            <button
              onClick={() => setActiveProvider("vector_fallback")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                activeProvider === "vector_fallback" ? "bg-purple-600 text-white" : "bg-neutral-800 text-neutral-300"
              }`}
            >
              Vector Fallback
            </button>
            <button
              onClick={() => setActiveProvider("mapbox")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                activeProvider === "mapbox" ? "bg-purple-600 text-white" : "bg-neutral-800 text-neutral-300"
              }`}
            >
              Mapbox GL
            </button>
            <button
              onClick={() => setActiveProvider("google")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                activeProvider === "google" ? "bg-purple-600 text-white" : "bg-neutral-800 text-neutral-300"
              }`}
            >
              Google Maps
            </button>
          </div>
        </div>
      )}

      {/* Map Rendering Layer */}
      {activeProvider === "vector_fallback" ? (
        <InteractiveMap
          spaces={spaces}
          selectedSpaceId={selectedSpaceId}
          onSelectSpace={onSelectSpace}
          className="w-full h-full"
        />
      ) : (
        /* If an external provider is selected but credentials are not live, display clear unconfigured state */
        <div className="relative w-full h-full flex flex-col items-center justify-center p-8 text-center bg-neutral-100 border border-neutral-200">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-base text-neutral-900">
            {activeProvider === "mapbox" ? "Mapbox Provider Not Initialized" : "Google Maps API Key Required"}
          </h3>
          <p className="text-xs text-neutral-500 max-w-md mt-1 mb-4 leading-relaxed">
            The external map provider API token is either unconfigured in <code className="bg-neutral-200 px-1 py-0.5 rounded font-mono text-[11px]">.env.local</code> or restricted. You can seamlessly switch to the built-in high precision vector map.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveProvider("vector_fallback")}
              className="px-4 py-2 rounded-full bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 transition"
            >
              Switch to Built-in Vector Map
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
