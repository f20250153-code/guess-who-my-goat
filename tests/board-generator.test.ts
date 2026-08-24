import { describe, it, expect, beforeEach } from "vitest";
import { generateGameBoard } from "@/lib/board-generator";
import { recordBoardUsage, resetBoardHistory } from "@/lib/board-history";
import type { Category } from "@/types/game";
import type { Character } from "@/types/character";

function makeCharacter(id: string, overrides: Partial<Character["attributes"]> = {}): Character {
  return {
    id,
    name: `Character ${id}`,
    categoryId: "test",
    attributes: {
      gender: Number(id.replace(/\D/g, "")) % 2 === 0 ? "male" : "female",
      nationality: [["USA", "Brazil", "India", "France"][Number(id.replace(/\D/g, "")) % 4]],
      ...overrides,
    },
  };
}

function makeCategory(size: number, targetBoardSize = 30): Category {
  return {
    id: "test-category",
    name: "Test Category",
    description: "",
    icon: "Star",
    emoji: "⭐",
    theme: "violet",
    targetBoardSize,
    characters: Array.from({ length: size }, (_, i) => makeCharacter(`c${i}`)),
  };
}

describe("generateGameBoard", () => {
  beforeEach(() => {
    resetBoardHistory();
  });

  it("returns exactly the target board size when the pool is large enough", () => {
    const category = makeCategory(100);
    const result = generateGameBoard({ category, seed: "test-seed-1" });
    expect(result.characters).toHaveLength(30);
  });

  it("returns no duplicate ids", () => {
    const category = makeCategory(100);
    const result = generateGameBoard({ category, seed: "test-seed-2" });
    const ids = result.characters.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only returns characters that belong to the requested category's pool", () => {
    const category = makeCategory(100);
    const result = generateGameBoard({ category, seed: "test-seed-3" });
    const poolIds = new Set(category.characters.map((c) => c.id));
    expect(result.characters.every((c) => poolIds.has(c.id))).toBe(true);
  });

  it("falls back to the full pool when it's smaller than the target board size", () => {
    const category = makeCategory(12);
    const result = generateGameBoard({ category, seed: "test-seed-4" });
    expect(result.characters).toHaveLength(12);
    expect(result.usedFullPool).toBe(true);
  });

  it("is deterministic for a given seed", () => {
    const category = makeCategory(200);
    const a = generateGameBoard({ category, seed: "same-seed", avoidRecent: false });
    const b = generateGameBoard({ category, seed: "same-seed", avoidRecent: false });
    expect(a.characters.map((c) => c.id)).toEqual(b.characters.map((c) => c.id));
  });

  it("produces a different board for a different seed", () => {
    const category = makeCategory(200);
    const a = generateGameBoard({ category, seed: "seed-a", avoidRecent: false });
    const b = generateGameBoard({ category, seed: "seed-b", avoidRecent: false });
    expect(a.characters.map((c) => c.id)).not.toEqual(b.characters.map((c) => c.id));
  });

  it("strongly avoids characters used on the immediately preceding board", () => {
    const category = makeCategory(80);
    const first = generateGameBoard({ category, seed: "seed-first" });
    recordBoardUsage(category.id, first.characters.map((c) => c.id));

    const second = generateGameBoard({ category, seed: "seed-second", avoidRecent: true });
    const firstIds = new Set(first.characters.map((c) => c.id));
    const overlap = second.characters.filter((c) => firstIds.has(c.id)).length;

    // Not a hard guarantee (recent characters are deprioritized, not
    // banned), but with 80 candidates and only 30 recently used, overlap
    // should be small.
    expect(overlap).toBeLessThan(10);
  });

  it("never throws when a character has missing attributes", () => {
    const category: Category = {
      id: "sparse",
      name: "Sparse",
      description: "",
      icon: "Star",
      emoji: "⭐",
      theme: "violet",
      characters: Array.from({ length: 50 }, (_, i) => ({
        id: `sparse-${i}`,
        name: `Sparse ${i}`,
        categoryId: "sparse",
        attributes: {},
      })),
    };
    expect(() => generateGameBoard({ category, seed: "sparse-seed" })).not.toThrow();
  });

  it("respects a custom boardSize", () => {
    const category = makeCategory(100);
    const result = generateGameBoard({ category, seed: "custom-size", boardSize: 10 });
    expect(result.characters).toHaveLength(10);
  });
});
