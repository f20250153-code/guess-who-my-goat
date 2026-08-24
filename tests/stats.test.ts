import { describe, it, expect, beforeEach } from "vitest";
import { recordGameResult, loadStats, getCategoryBreakdown, resetStats } from "@/lib/stats";
import { readJSON, writeJSON, STORAGE_KEYS } from "@/lib/storage";
import type { GameResult } from "@/types/game";
import type { Character } from "@/types/character";

function makeResult(overrides: Partial<GameResult> = {}): GameResult {
  const secretCharacter: Character = {
    id: "c1",
    name: "Test Character",
    categoryId: "footballers",
    attributes: {},
  };
  return {
    won: true,
    secretCharacter,
    questionCount: 5,
    durationMs: 20000,
    score: 700,
    category: "Footballers",
    mode: "classic",
    difficulty: "medium",
    ...overrides,
  };
}

describe("stats module", () => {
  beforeEach(() => {
    resetStats();
  });

  it("tracks per-category played/won counts", () => {
    recordGameResult(makeResult({ won: true }), "footballers");
    recordGameResult(makeResult({ won: false }), "footballers");
    recordGameResult(makeResult({ won: true }), "cricketers");

    const breakdown = getCategoryBreakdown(loadStats());
    const football = breakdown.find((b) => b.categoryId === "footballers")!;
    expect(football.played).toBe(2);
    expect(football.won).toBe(1);
    expect(football.winRate).toBe(50);

    const cricket = breakdown.find((b) => b.categoryId === "cricketers")!;
    expect(cricket.played).toBe(1);
    expect(cricket.won).toBe(1);
    expect(cricket.winRate).toBe(100);
  });

  it("tracks games played per difficulty", () => {
    recordGameResult(makeResult({ difficulty: "easy" }), "footballers");
    recordGameResult(makeResult({ difficulty: "easy" }), "footballers");
    recordGameResult(makeResult({ difficulty: "expert" }), "footballers");

    const stats = loadStats();
    expect(stats.difficultyPlayCounts.easy).toBe(2);
    expect(stats.difficultyPlayCounts.expert).toBe(1);
    expect(stats.difficultyPlayCounts.medium).toBe(0);
  });

  it("never throws when loading a pre-upgrade stats object missing new fields", () => {
    // Simulates a real browser's localStorage from before categoryStats /
    // difficultyPlayCounts existed in the schema.
    const oldShapeStats = {
      gamesPlayed: 5,
      gamesWon: 3,
      gamesLost: 2,
      totalQuestionsAsked: 30,
      bestScore: 850,
      bestQuestionCount: 4,
      bestTimeMs: 12000,
      categoryPlayCounts: { footballers: 5 },
      // categoryStats and difficultyPlayCounts intentionally absent
    };
    writeJSON(STORAGE_KEYS.stats, oldShapeStats);

    expect(() => loadStats()).not.toThrow();
    const migrated = loadStats();
    expect(migrated.gamesPlayed).toBe(5);
    expect(migrated.categoryStats).toEqual({});
    expect(migrated.difficultyPlayCounts).toEqual({ easy: 0, medium: 0, hard: 0, expert: 0 });

    // And recording a new result on top of migrated old data must also work.
    expect(() => recordGameResult(makeResult(), "footballers")).not.toThrow();
    const afterRecord = loadStats();
    expect(afterRecord.gamesPlayed).toBe(6);
    expect(afterRecord.categoryStats.footballers.played).toBe(1);
  });

  it("readJSON itself never throws on corrupted stored JSON", () => {
    // Simulate corrupted localStorage content directly.
    expect(() => readJSON(STORAGE_KEYS.stats, {})).not.toThrow();
  });
});
