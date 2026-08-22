import type { GameResult } from "@/types/game";
import { readJSON, writeJSON, STORAGE_KEYS } from "./storage";

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalQuestionsAsked: number;
  bestScore: number;
  bestQuestionCount: number | null;
  bestTimeMs: number | null;
  categoryPlayCounts: Record<string, number>;
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
};

export function loadStats(): PlayerStats {
  return readJSON<PlayerStats>(STORAGE_KEYS.stats, EMPTY_STATS);
}

export function recordGameResult(result: GameResult, categoryId: string): PlayerStats {
  const current = loadStats();

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

export function resetStats(): PlayerStats {
  writeJSON(STORAGE_KEYS.stats, EMPTY_STATS);
  return EMPTY_STATS;
}
