import { describe, it, expect } from "vitest";
import { questions } from "@/data/questions";
import { categories } from "@/data/categories";

describe("data/questions.ts integrity", () => {
  it("has unique question ids", () => {
    const ids = questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every categoryIds entry references a real category", () => {
    const knownIds = new Set(categories.map((c) => c.id));
    for (const q of questions) {
      if (!q.categoryIds) continue;
      for (const id of q.categoryIds) {
        expect(knownIds.has(id)).toBe(true);
      }
    }
  });

  it("propagates every actors/actresses-scoped question to the derived movie-stars category", () => {
    const moviePropagated = questions.filter(
      (q) => q.categoryIds?.includes("movie-stars"),
    );
    const actorsOrActresses = questions.filter(
      (q) => q.categoryIds?.includes("actors") || q.categoryIds?.includes("actresses"),
    );
    expect(moviePropagated.length).toBe(actorsOrActresses.length);
  });
});
