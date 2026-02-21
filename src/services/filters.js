/**
 * Filter evaluation engine.
 * Runs all active filters against a property and returns per-filter results.
 */

import { haversineKm, formatDistance, geocodePlace } from './geocoding';
import { evaluateNaturalLanguageFilter } from './claude';

/**
 * Evaluate all enabled filters against a property.
 *
 * @param {object} property
 * @param {Array} filters - from storage
 * @param {string} claudeApiKey
 * @returns {Array<FilterResult>}
 *
 * FilterResult: { filterId, type, label, passes, reason, loading, error }
 */
export async function evaluateFilters(property, filters, claudeApiKey) {
  const enabled = filters.filter((f) => f.enabled);
  const results = await Promise.all(
    enabled.map((filter) => evaluateSingle(property, filter, claudeApiKey))
  );
  return results;
}

async function evaluateSingle(property, filter, claudeApiKey) {
  const base = { filterId: filter.id, type: filter.type, loading: false, error: null };

  try {
    switch (filter.type) {
      case 'distance':
        return { ...base, ...(await evaluateDistance(property, filter)) };
      case 'feature':
        return { ...base, ...evaluateFeature(property, filter) };
      case 'nl':
        return { ...base, ...(await evaluateNL(property, filter, claudeApiKey)) };
      default:
        return { ...base, label: 'Unknown filter', passes: null, reason: '' };
    }
  } catch (err) {
    return {
      ...base,
      label: filter.label ?? filter.text ?? filter.keyword ?? 'Filter',
      passes: null,
      reason: '',
      error: err.message,
    };
  }
}

// ─── Distance ────────────────────────────────────────────────────────────────

async function evaluateDistance(property, filter) {
  const propLat = property.coordinates?.lat;
  const propLng = property.coordinates?.lng;

  // Geocode property if coordinates missing
  let pLat = propLat;
  let pLng = propLng;
  if (pLat == null || pLng == null) {
    const geo = await geocodePlace(property.address);
    pLat = geo.lat;
    pLng = geo.lng;
  }

  // Geocode target location if not cached
  let tLat = filter.coordinates?.lat;
  let tLng = filter.coordinates?.lng;
  if (tLat == null || tLng == null) {
    const geo = await geocodePlace(filter.address);
    tLat = geo.lat;
    tLng = geo.lng;
  }

  const km = haversineKm(pLat, pLng, tLat, tLng);
  const maxKm = filter.maxKm ?? 10;
  const passes = km <= maxKm;

  return {
    label: `Within ${formatDistance(maxKm * 1000 / 1000)} of ${filter.label ?? filter.address}`,
    passes,
    reason: `${formatDistance(km)} away`,
    distanceKm: km,
  };
}

// ─── Feature ─────────────────────────────────────────────────────────────────

const FEATURE_ALIASES = {
  backyard: ['backyard', 'back yard', 'yard', 'outdoor space', 'garden', 'patio', 'deck', 'lot'],
  garage: ['garage', 'car port', 'carport', 'parking'],
  pool: ['pool', 'swimming'],
  fireplace: ['fireplace', 'fire place'],
  basement: ['basement', 'lower level', 'cellar'],
  ac: ['air conditioning', 'central air', 'cooling', 'hvac'],
  dishwasher: ['dishwasher'],
  laundry: ['laundry', 'washer', 'dryer', 'w/d'],
  'hardwood floors': ['hardwood', 'wood floor', 'wood flooring'],
  'open floor plan': ['open floor', 'open concept', 'open layout', 'great room'],
};

function evaluateFeature(property, filter) {
  const keyword = (filter.keyword ?? '').toLowerCase().trim();
  const label = filter.label ?? keyword;

  // Build a big searchable text blob from description + facts
  const factsText = (property.facts ?? [])
    .map((f) => `${f.label} ${f.value}`)
    .join(' ');
  const haystack = `${property.description ?? ''} ${factsText}`.toLowerCase();

  // Look for the keyword and any known aliases
  const searchTerms = FEATURE_ALIASES[keyword] ?? [keyword];
  const found = searchTerms.find((term) => haystack.includes(term));

  return {
    label,
    passes: Boolean(found),
    reason: found ? `Mentioned: "${found}"` : 'Not found in listing',
  };
}

// ─── Natural Language ────────────────────────────────────────────────────────

async function evaluateNL(property, filter, claudeApiKey) {
  const { passes, reason } = await evaluateNaturalLanguageFilter(
    property,
    filter.text,
    claudeApiKey
  );
  return {
    label: filter.text,
    passes,
    reason,
  };
}
