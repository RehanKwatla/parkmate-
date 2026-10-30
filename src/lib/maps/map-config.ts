/**
 * Map Configuration & OpenStreetMap Tile Providers
 * 
 * Provides configurable open-source tile layers and default center for Pune, Maharashtra.
 */

export interface TileProviderConfig {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string[];
  description: string;
}

export const PUNE_DEFAULT_COORDINATES = {
  lat: 18.5204,
  lng: 73.8567,
  zoom: 12,
  city: "Pune",
  state: "Maharashtra",
  country: "India",
};

/**
 * Open-source tile providers compliant with OpenStreetMap and standard web mapping policies.
 */
export const TILE_PROVIDERS: Record<string, TileProviderConfig> = {
  openstreetmap: {
    id: "openstreetmap",
    name: "OpenStreetMap (Standard)",
    url: process.env.NEXT_PUBLIC_OSM_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: ["a", "b", "c"],
    description: "Standard open-source vector map tiles powered by the OpenStreetMap community.",
  },
  carto_positron: {
    id: "carto_positron",
    name: "CARTO Positron (High-Contrast)",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
    maxZoom: 20,
    subdomains: ["a", "b", "c", "d"],
    description: "Subtle, light-themed open tiles emphasizing parking landmarks and road networks.",
  },
  carto_voyager: {
    id: "carto_voyager",
    name: "CARTO Voyager (Detailed Streets)",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
    maxZoom: 20,
    subdomains: ["a", "b", "c", "d"],
    description: "Rich street-level detailing with landmark highlights.",
  },
};

export const DEFAULT_TILE_PROVIDER_ID = "openstreetmap";
