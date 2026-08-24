/**
 * Thin, defensive wrapper around localStorage. Every consumer in the app
 * goes through here instead of touching `window.localStorage` directly, so
 * a missing/blocked/corrupted store never crashes the game — it just
 * behaves as if nothing was saved.
 */

const STORAGE_PREFIX = "guesswho:";

function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const testKey = `${STORAGE_PREFIX}__test__`;
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function readJSON<T>(key: string, fallback: T): T {
  if (!isStorageAvailable()) return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed;
  } catch {
    // Corrupted or unparsable data — treat as absent rather than throwing.
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): boolean {
  if (!isStorageAvailable()) return false;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // Ignore — nothing useful to do if removal fails.
  }
}

export const STORAGE_KEYS = {
  stats: "stats",
  preferences: "preferences",
  customPacks: "custom-packs",
  recentGames: "recent-games",
  boardHistory: "board-history",
} as const;
