// Deployment-specific settings. Override with VITE_* variables in client/.env
// (see .env.example), e.g. to run a regional instance for another city.

export const REGION_LABEL = import.meta.env.VITE_REGION_LABEL ?? 'Princeton';

const [lat, lng, zoom] = (import.meta.env.VITE_DEFAULT_VIEW ?? '40.3350,-74.6800,12').split(',').map(Number);
export const DEFAULT_CENTER = [lat, lng];
export const DEFAULT_ZOOM = zoom;

export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
// Leaflet's default prefix includes a flag; we show a plain credit link instead.
// The OSM attribution below is required.
export const ATTRIBUTION_PREFIX = '<a href="https://leafletjs.com">Leaflet</a>';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
