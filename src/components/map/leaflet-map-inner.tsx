"use client";

import * as React from "react";
import { ParkingSpace } from "@/types/parking";
import { formatCurrency } from "@/lib/utils";
import { 
  TILE_PROVIDERS, 
  DEFAULT_TILE_PROVIDER_ID, 
  PUNE_DEFAULT_COORDINATES,
  TileProviderConfig 
} from "@/lib/maps/map-config";
import Link from "next/link";
import { 
  Warehouse, 
  Zap, 
  Plane, 
  Ticket, 
  Clock, 
  Layers, 
  CheckCircle2, 
  ShieldCheck, 
  Star,
  ExternalLink,
  Navigation
} from "lucide-react";

// Leaflet and React-Leaflet
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet";

// Fix default Leaflet icon assets
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LeafletMapInnerProps {
  spaces: ParkingSpace[];
  selectedSpaceId?: string | null;
  onSelectSpace?: (spaceId: string) => void;
  className?: string;
}

/**
 * Creates custom Airbnb-style interactive HTML price markers with category styling
 */
function createCategoryPriceIcon(space: ParkingSpace, isSelected: boolean): L.DivIcon {
  const price = Math.round(space.pricePerHour);
  
  // Category-specific color accents
  let categoryColor = "#1e293b"; // slate
  let categoryBg = "#ffffff";
  let iconSvg = "";

  switch (space.category) {
    case "ev_charging":
      categoryColor = "#059669"; // emerald
      categoryBg = "#ecfdf5";
      iconSvg = `<svg class="w-3 h-3 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;
      break;
    case "covered":
      categoryColor = "#2563eb"; // blue
      categoryBg = "#eff6ff";
      iconSvg = `<svg class="w-3 h-3 text-blue-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M4 10l8-6 8 6"/></svg>`;
      break;
    case "airport":
      categoryColor = "#0284c7"; // sky
      categoryBg = "#f0f9ff";
      iconSvg = `<svg class="w-3 h-3 text-sky-600 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;
      break;
    case "event":
      categoryColor = "#7c3aed"; // purple
      categoryBg = "#f5f3ff";
      iconSvg = `<svg class="w-3 h-3 text-purple-600 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
      break;
    case "daily":
    case "monthly":
      categoryColor = "#d97706"; // amber
      categoryBg = "#fffbeb";
      iconSvg = `<svg class="w-3 h-3 text-amber-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`;
      break;
    default:
      categoryColor = "#222222";
      categoryBg = "#ffffff";
      break;
  }

  const selectedClasses = isSelected
    ? "bg-[#FF5A5F] text-white ring-4 ring-[#FF5A5F]/30 scale-110 shadow-2xl z-50 font-black"
    : "bg-white text-neutral-900 border border-neutral-300 shadow-md hover:scale-105 hover:border-neutral-900";

  const tailColor = isSelected ? "#FF5A5F" : "#ffffff";
  const tailBorder = isSelected ? "transparent" : "#d4d4d4";

  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
      <div class="px-2.5 py-1 rounded-full flex items-center gap-1.5 font-sans font-bold text-xs tracking-tight ${selectedClasses}" style="white-space: nowrap; box-shadow: 0 4px 14px rgba(0,0,0,0.18);">
        ${!isSelected && iconSvg ? `<span class="flex items-center">${iconSvg}</span>` : ""}
        <span>₹${price}</span>
      </div>
      <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid ${tailColor}; margin-top: -1px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.15));"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "parkmate-marker-container",
    iconSize: [60, 32],
    iconAnchor: [30, 32],
    popupAnchor: [0, -32],
  });
}

/**
 * Controller to smoothly pan and fit map view to active selections or spaces bounds
 */
function MapViewController({
  spaces,
  selectedSpaceId,
}: {
  spaces: ParkingSpace[];
  selectedSpaceId?: string | null;
}) {
  const map = useMap();
  const hasInitialized = React.useRef(false);

  // Pan to selected space smoothly
  React.useEffect(() => {
    if (!selectedSpaceId) return;
    const targetSpace = spaces.find((s) => s.id === selectedSpaceId);
    if (targetSpace && targetSpace.coordinates) {
      map.flyTo(
        [targetSpace.coordinates.lat, targetSpace.coordinates.lng],
        Math.max(map.getZoom(), 14),
        { duration: 0.8, easeLinearity: 0.25 }
      );
    }
  }, [selectedSpaceId, spaces, map]);

  // Fit bounds initially if multiple spaces exist
  React.useEffect(() => {
    if (!hasInitialized.current && spaces.length > 0) {
      hasInitialized.current = true;
      const validCoords = spaces
        .filter((s) => s.coordinates && s.coordinates.lat && s.coordinates.lng)
        .map((s) => [s.coordinates.lat, s.coordinates.lng] as [number, number]);

      if (validCoords.length > 1) {
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    }
  }, [spaces, map]);

  return null;
}

export default function LeafletMapInner({
  spaces,
  selectedSpaceId,
  onSelectSpace,
  className = "",
}: LeafletMapInnerProps) {
  const [providerId, setProviderId] = React.useState<string>(DEFAULT_TILE_PROVIDER_ID);
  const [showTileMenu, setShowTileMenu] = React.useState(false);
  const markerRefs = React.useRef<Record<string, L.Marker>>({});

  const activeTileConfig: TileProviderConfig = TILE_PROVIDERS[providerId] || TILE_PROVIDERS.openstreetmap;

  // Automatically open popup of selected space
  React.useEffect(() => {
    if (selectedSpaceId && markerRefs.current[selectedSpaceId]) {
      markerRefs.current[selectedSpaceId].openPopup();
    }
  }, [selectedSpaceId]);

  return (
    <div className={`relative w-full h-full min-h-[420px] rounded-3xl overflow-hidden border border-[#DDDDDD] shadow-sm flex flex-col ${className}`}>
      {/* Top Map Engine Status & Tile Provider Toggle */}
      <div className="absolute top-4 left-4 z-30 flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md border border-neutral-200 shadow-md text-neutral-800 text-[11px] font-bold rounded-full py-1.5 px-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{activeTileConfig.name}</span>
          <span className="text-neutral-400">&bull;</span>
          <span className="text-neutral-600 font-medium">Pune, MH</span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTileMenu((prev) => !prev)}
            className="h-8 px-3 rounded-full bg-white/95 backdrop-blur-md border border-neutral-200 text-neutral-700 hover:text-neutral-950 text-[11px] font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            title="Configure OpenStreetMap Tile Provider"
          >
            <Layers className="w-3.5 h-3.5 text-[#FF5A5F]" />
            <span>Tiles</span>
          </button>

          {showTileMenu && (
            <div className="absolute left-0 top-10 mt-1 w-64 bg-white/95 backdrop-blur-md border border-neutral-200 rounded-2xl shadow-xl p-2 z-40 text-xs animate-in fade-in zoom-in-95">
              <div className="px-2 py-1 font-extrabold uppercase text-[10px] tracking-wider text-neutral-500 border-b border-neutral-100 mb-1">
                Open-Source Tile Providers
              </div>
              {Object.values(TILE_PROVIDERS).map((tp) => (
                <button
                  key={tp.id}
                  type="button"
                  onClick={() => {
                    setProviderId(tp.id);
                    setShowTileMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs transition flex flex-col ${
                    providerId === tp.id
                      ? "bg-[#FFF0F1] text-[#FF5A5F] font-bold"
                      : "hover:bg-neutral-100 text-neutral-700"
                  }`}
                >
                  <span className="font-semibold">{tp.name}</span>
                  <span className="text-[10px] text-neutral-400 font-normal leading-tight mt-0.5">
                    {tp.description}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main React Leaflet Map Container */}
      <MapContainer
        center={[PUNE_DEFAULT_COORDINATES.lat, PUNE_DEFAULT_COORDINATES.lng]}
        zoom={PUNE_DEFAULT_COORDINATES.zoom}
        zoomControl={false}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[420px] z-10"
      >
        <ZoomControl position="bottomright" />

        {/* Dynamic Configurable Tile Layer with OpenStreetMap Attribution */}
        <TileLayer
          key={activeTileConfig.id}
          url={activeTileConfig.url}
          attribution={activeTileConfig.attribution}
          maxZoom={activeTileConfig.maxZoom}
          subdomains={activeTileConfig.subdomains || ["a", "b", "c"]}
        />

        {/* Viewport & Pan Controller */}
        <MapViewController spaces={spaces} selectedSpaceId={selectedSpaceId} />

        {/* Interactive Parking Markers */}
        {spaces.map((space) => {
          if (!space.coordinates || !space.coordinates.lat || !space.coordinates.lng) {
            return null;
          }

          const isSelected = selectedSpaceId === space.id;
          const markerIcon = createCategoryPriceIcon(space, isSelected);

          return (
            <Marker
              key={space.id}
              position={[space.coordinates.lat, space.coordinates.lng]}
              icon={markerIcon}
              ref={(ref) => {
                if (ref) {
                  markerRefs.current[space.id] = ref;
                } else {
                  delete markerRefs.current[space.id];
                }
              }}
              eventHandlers={{
                click: () => {
                  if (onSelectSpace) onSelectSpace(space.id);
                },
              }}
            >
              {/* Rich Interactive Popup */}
              <Popup className="parkmate-custom-popup" maxWidth={310} minWidth={270}>
                <div className="flex flex-col bg-white overflow-hidden text-neutral-900 font-sans">
                  {/* Thumbnail Banner */}
                  <div className="relative w-full h-32 bg-neutral-100 overflow-hidden">
                    <img
                      src={space.images?.[0] || "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80"}
                      alt={space.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-bold text-neutral-900 shadow-xs flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{space.rating.toFixed(2)}</span>
                      <span className="text-neutral-400 font-normal">({space.reviewCount})</span>
                    </div>

                    <div className="absolute top-2 right-2 bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Available</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-3.5 space-y-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-neutral-900 line-clamp-1 leading-snug">
                        {space.title}
                      </h4>
                      <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5 flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-[#FF5A5F] shrink-0" />
                        <span>{space.address}, {space.neighborhood}</span>
                      </p>
                    </div>

                    {/* Features Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        space.isCovered ? "bg-blue-50 text-blue-700" : "bg-neutral-100 text-neutral-700"
                      }`}>
                        <Warehouse className="w-3 h-3" />
                        {space.isCovered ? "Covered" : "Open Parking"}
                      </span>

                      {space.hasEvCharging && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          <Zap className="w-3 h-3" />
                          EV Fast Charging
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 text-neutral-600">
                        Clearance: {space.clearanceFeet ? `${space.clearanceFeet} ft` : "Open Air"}
                      </span>
                    </div>

                    {/* Price and CTA Button */}
                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-base font-black text-neutral-950">
                          {formatCurrency(space.pricePerHour)}
                          <span className="text-xs font-normal text-neutral-500"> / hr</span>
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {formatCurrency(space.pricePerDay)} / day
                        </div>
                      </div>

                      <Link
                        href={`/listings/${space.id}`}
                        className="px-3.5 py-1.5 rounded-xl bg-[#FF5A5F] hover:bg-[#E0484D] text-white text-xs font-bold shadow-sm transition flex items-center gap-1"
                      >
                        <span>View Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
