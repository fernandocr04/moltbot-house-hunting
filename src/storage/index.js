/**
 * AsyncStorage wrapper for persisting properties, filters, and settings.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PROPERTIES: 'properties',
  FILTERS: 'filters',
  SETTINGS: 'settings',
};

// ─── Properties ──────────────────────────────────────────────────────────────

export async function getProperties() {
  const raw = await AsyncStorage.getItem(KEYS.PROPERTIES);
  return raw ? JSON.parse(raw) : [];
}

export async function saveProperty(property) {
  const existing = await getProperties();
  const idx = existing.findIndex((p) => p.id === property.id);
  if (idx >= 0) {
    existing[idx] = property;
  } else {
    existing.unshift(property); // newest first
  }
  await AsyncStorage.setItem(KEYS.PROPERTIES, JSON.stringify(existing));
  return property;
}

export async function updatePropertyRating(id, rating) {
  const existing = await getProperties();
  const idx = existing.findIndex((p) => p.id === id);
  if (idx < 0) return;
  existing[idx].rating = rating;
  existing[idx].ratedAt = new Date().toISOString();
  await AsyncStorage.setItem(KEYS.PROPERTIES, JSON.stringify(existing));
}

export async function deleteProperty(id) {
  const existing = await getProperties();
  const updated = existing.filter((p) => p.id !== id);
  await AsyncStorage.setItem(KEYS.PROPERTIES, JSON.stringify(updated));
}

// ─── Filters ─────────────────────────────────────────────────────────────────

/**
 * Filter shape:
 * {
 *   id: string,
 *   type: 'distance' | 'feature' | 'nl',
 *   enabled: boolean,
 *   // distance filters:
 *   label?: string,          // e.g. "Work"
 *   address?: string,        // e.g. "1 Infinite Loop, Cupertino, CA"
 *   maxKm?: number,
 *   coordinates?: { lat, lng },
 *   // feature filters:
 *   keyword?: string,        // e.g. "backyard"
 *   // nl filters:
 *   text?: string,           // e.g. "good natural light"
 * }
 */
export async function getFilters() {
  const raw = await AsyncStorage.getItem(KEYS.FILTERS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveFilter(filter) {
  const existing = await getFilters();
  const idx = existing.findIndex((f) => f.id === filter.id);
  if (idx >= 0) {
    existing[idx] = filter;
  } else {
    existing.push(filter);
  }
  await AsyncStorage.setItem(KEYS.FILTERS, JSON.stringify(existing));
}

export async function deleteFilter(id) {
  const existing = await getFilters();
  const updated = existing.filter((f) => f.id !== id);
  await AsyncStorage.setItem(KEYS.FILTERS, JSON.stringify(updated));
}

export async function toggleFilter(id, enabled) {
  const existing = await getFilters();
  const idx = existing.findIndex((f) => f.id === id);
  if (idx < 0) return;
  existing[idx].enabled = enabled;
  await AsyncStorage.setItem(KEYS.FILTERS, JSON.stringify(existing));
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings() {
  const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
  return raw ? JSON.parse(raw) : { claudeApiKey: '', distanceUnit: 'km' };
}

export async function updateSettings(partial) {
  const existing = await getSettings();
  const updated = { ...existing, ...partial };
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(updated));
  return updated;
}
