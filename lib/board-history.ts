import { readJSON, writeJSON, STORAGE_KEYS } from "./storage";

/** How many of the most recent boards (per category) are remembered and
 * strongly deprioritized on the next generation. Small enough that
 * popular characters return reasonably soon, large enough that a 30-40
 * character pool doesn't just cycle the same handful every game. */
const RECENT_WINDOW = 45;

export interface BoardHistory {
  /** Most-recently-seen-first list of character ids per category,
   * capped at RECENT_WINDOW. */
  recentByCategory: Record<string, string[]>;
  /** Total times each character has been placed on a board, ever. Used
   * to gently favor under-explored characters so the whole pool actually
   * gets seen over many games, not just the same popular faces. */
  appearanceCounts: Record<string, number>;
}

const EMPTY_HISTORY: BoardHistory = {
  recentByCategory: {},
  appearanceCounts: {},
};

export function loadBoardHistory(): BoardHistory {
  return readJSON<BoardHistory>(STORAGE_KEYS.boardHistory, EMPTY_HISTORY);
}

/** Records that these character ids just appeared on a board for this
 * category — call once per generated board. */
export function recordBoardUsage(categoryId: string, characterIds: string[]): void {
  const history = loadBoardHistory();

  const previousRecent = history.recentByCategory[categoryId] ?? [];
  const nextRecent = [...characterIds, ...previousRecent].slice(0, RECENT_WINDOW);

  const nextCounts = { ...history.appearanceCounts };
  for (const id of characterIds) {
    nextCounts[id] = (nextCounts[id] ?? 0) + 1;
  }

  writeJSON<BoardHistory>(STORAGE_KEYS.boardHistory, {
    recentByCategory: { ...history.recentByCategory, [categoryId]: nextRecent },
    appearanceCounts: nextCounts,
  });
}

export function getRecentIds(categoryId: string): Set<string> {
  const history = loadBoardHistory();
  return new Set(history.recentByCategory[categoryId] ?? []);
}

export function getAppearanceCount(characterId: string): number {
  const history = loadBoardHistory();
  return history.appearanceCounts[characterId] ?? 0;
}

export function resetBoardHistory(): void {
  writeJSON<BoardHistory>(STORAGE_KEYS.boardHistory, EMPTY_HISTORY);
}
