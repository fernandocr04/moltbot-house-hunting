/**
 * Geocoding via OpenStreetMap Nominatim (free, no API key).
 * Distance calculation using the Haversine formula (straight-line).
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_HEADERS = {
  // Nominatim requires a User-Agent identifying your app
  'User-Agent': 'moltbot-house-hunting/1.0 (personal use)',
  Accept: 'application/json',
};

/**
 * Geocode a human-readable address or place name.
 * Returns { lat, lng, displayName } or throws on failure.
 */
export async function geocodePlace(query) {
  const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const response = await fetch(url, { headers: NOMINATIM_HEADERS });
  if (!response.ok) throw new Error(`Geocoding failed (HTTP ${response.status})`);

  const results = await response.json();
  if (!results.length) throw new Error(`Could not find location: "${query}"`);

  const { lat, lon, display_name } = results[0];
  return {
    lat: parseFloat(lat),
    lng: parseFloat(lon),
    displayName: display_name,
  };
}

/**
 * Straight-line distance between two lat/lng points using Haversine.
 * Returns distance in kilometers.
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Format a kilometer distance for display.
 */
export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
