import type { GameResult, GameDifficulty } from "@/types/game";
import { readJSON, writeJSON, STORAGE_KEYS } from "./storage";

interface CategoryStat {
  played: number;
  won: number;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalQuestionsAsked: number;
  bestScore: number;
  bestQuestionCount: number | null;
  bestTimeMs: number | null;
  categoryPlayCounts: Record<string, number>;
  /** Played/won breakdown per category, for a per-category win rate. */
  categoryStats: Record<string, CategoryStat>;
  /** How many games were played at each difficulty. */
  difficultyPlayCounts: Record<GameDifficulty, number>;
}

export const EMPTY_STATS: PlayerStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  totalQuestionsAsked: 0,
  bestScore: 0,
  bestQuestionCount: null,
  bestTimeMs: null,
  categoryPlayCounts: {},
  categoryStats: {},
  difficultyPlayCounts: { easy: 0, medium: 0, hard: 0, expert: 0 },
};

/** Merges freshly-loaded stats with any fields that didn't exist in an
 * older schema version (e.g. from before categoryStats/difficultyPlayCounts
 * were added) so upgrading the app never crashes on stale localStorage
 * data — missing fields just fall back to their empty defaults. */
function withDefaults(stats: Partial<PlayerStats>): PlayerStats {
  return {
    ...EMPTY_STATS,
    ...stats,
    categoryStats: stats.categoryStats ?? {},
    difficultyPlayCounts: { ...EMPTY_STATS.difficultyPlayCounts, ...stats.difficultyPlayCounts },
  };
}

export function loadStats(): PlayerStats {
  return withDefaults(readJSON<Partial<PlayerStats>>(STORAGE_KEYS.stats, EMPTY_STATS));
}

export function recordGameResult(result: GameResult, categoryId: string): PlayerStats {
  const current = loadStats();

  const prevCategoryStat = current.categoryStats[categoryId] ?? { played: 0, won: 0 };

  const next: PlayerStats = {
    gamesPlayed: current.gamesPlayed + 1,
    gamesWon: current.gamesWon + (result.won ? 1 : 0),
    gamesLost: current.gamesLost + (result.won ? 0 : 1),
    totalQuestionsAsked: current.totalQuestionsAsked + result.questionCount,
    bestScore: Math.max(current.bestScore, result.score),
    bestQuestionCount:
      result.won && (current.bestQuestionCount === null || result.questionCount < current.bestQuestionCount)
        ? result.questionCount
        : current.bestQuestionCount,
    bestTimeMs:
      result.won && (current.bestTimeMs === null || result.durationMs < current.bestTimeMs)
        ? result.durationMs
        : current.bestTimeMs,
    categoryPlayCounts: {
      ...current.categoryPlayCounts,
      [categoryId]: (current.categoryPlayCounts[categoryId] ?? 0) + 1,
    },
    categoryStats: {
      ...current.categoryStats,
      [categoryId]: {
        played: prevCategoryStat.played + 1,
        won: prevCategoryStat.won + (result.won ? 1 : 0),
      },
    },
    difficultyPlayCounts: {
      ...current.difficultyPlayCounts,
      [result.difficulty]: (current.difficultyPlayCounts[result.difficulty] ?? 0) + 1,
    },
  };

  writeJSON(STORAGE_KEYS.stats, next);
  return next;
}

export function getFavoriteCategory(stats: PlayerStats): string | null {
  const entries = Object.entries(stats.categoryPlayCounts);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

export function getWinRate(stats: PlayerStats): number {
  if (stats.gamesPlayed === 0) return 0;
  return Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
}

export function getAverageQuestions(stats: PlayerStats): number {
  if (stats.gamesPlayed === 0) return 0;
  return Math.round((stats.totalQuestionsAsked / stats.gamesPlayed) * 10) / 10;
}

/** Per-category win rate, sorted by games played (most-played first),
 * limited to categories with at least one game. */
export function getCategoryBreakdown(
  stats: PlayerStats,
): Array<{ categoryId: string; played: number; won: number; winRate: number }> {
  return Object.entries(stats.categoryStats)
    .map(([categoryId, stat]) => ({
      categoryId,
      played: stat.played,
      won: stat.won,
      winRate: stat.played > 0 ? Math.round((stat.won / stat.played) * 100) : 0,
    }))
    .sort((a, b) => b.played - a.played);
}

export function resetStats(): PlayerStats {
  writeJSON(STORAGE_KEYS.stats, EMPTY_STATS);
  return EMPTY_STATS;
}
