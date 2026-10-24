export interface MapCoordinate {
  lat: number;
  lng: number;
}

export interface MapMarker {
  id: string;
  title: string;
  priceFormatted: string;
  position: MapCoordinate;
  isCovered?: boolean;
  hasEv?: boolean;
  isVerified?: boolean;
}

export interface MapAdapterOptions {
  apiKey?: string;
  center: MapCoordinate;
  zoom: number;
  provider: "mapbox" | "google-maps" | "interactive-canvas";
}

export interface MapAdapter {
  provider: string;
  setCenter(coord: MapCoordinate): void;
  setZoom(zoom: number): void;
  fitBounds(markers: MapCoordinate[]): void;
  addMarker(marker: MapMarker, onClick?: () => void): void;
  removeMarker(markerId: string): void;
}
