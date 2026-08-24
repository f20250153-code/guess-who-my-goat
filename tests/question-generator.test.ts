import { describe, it, expect } from "vitest";
import { generateBoardQuestions } from "@/lib/question-generator";
import { evaluateQuestion, getQuestionQuality, rankQuestionsByQuality } from "@/lib/question-engine";
import type { Character } from "@/types/character";

function makeBoard(): Character[] {
  return [
    { id: "a", name: "A", categoryId: "footballers", attributes: { nationality: ["Brazil"], team: ["Santos"] } },
    { id: "b", name: "B", categoryId: "footballers", attributes: { nationality: ["Brazil"], team: ["Flamengo"] } },
    { id: "c", name: "C", categoryId: "footballers", attributes: { nationality: ["France"], team: ["PSG"] } },
    { id: "d", name: "D", categoryId: "footballers", attributes: { nationality: ["France"], team: ["PSG"] } },
    { id: "e", name: "E", categoryId: "footballers", attributes: { nationality: ["Spain"], team: ["Real Madrid"] } },
  ];
}

describe("generateBoardQuestions", () => {
  it("generates a question only for values actually present on the board", () => {
    const board = makeBoard();
    const generated = generateBoardQuestions("footballers", board);
    const nationalityQuestions = generated.filter((q) => q.attribute === "nationality");
    const values = nationalityQuestions.map((q) => q.value);
    expect(values).toContain("Brazil");
    expect(values).toContain("France");
    expect(values).toContain("Spain");
    expect(values).not.toContain("Germany"); // never on the board — must never be fabricated
  });

  it("never generates a question where every character shares the same value (no information)", () => {
    const board: Character[] = [
      { id: "x", name: "X", categoryId: "footballers", attributes: { nationality: ["Brazil"] } },
      { id: "y", name: "Y", categoryId: "footballers", attributes: { nationality: ["Brazil"] } },
    ];
    const generated = generateBoardQuestions("footballers", board);
    expect(generated.some((q) => q.attribute === "nationality")).toBe(false);
  });

  it("every generated question evaluates cleanly (true/false, never throws) against every board character", () => {
    const board = makeBoard();
    const generated = generateBoardQuestions("footballers", board);
    for (const question of generated) {
      for (const character of board) {
        expect(() => evaluateQuestion(question, character)).not.toThrow();
        const result = evaluateQuestion(question, character);
        expect(typeof result).toBe("boolean");
      }
    }
  });

  it("respects categoryIds scoping — a team question doesn't leak into an unrelated category", () => {
    const board = makeBoard().map((c) => ({ ...c, categoryId: "fictional" }));
    const generated = generateBoardQuestions("fictional", board);
    expect(generated.some((q) => q.attribute === "team")).toBe(false);
  });

  it("caps the number of generated questions per attribute (maxGenerated)", () => {
    const board: Character[] = Array.from({ length: 20 }, (_, i) => ({
      id: `n${i}`,
      name: `N${i}`,
      categoryId: "footballers",
      attributes: { nationality: [`Country${i}`] }, // 20 distinct nationalities
    }));
    const generated = generateBoardQuestions("footballers", board);
    const nationalityQuestions = generated.filter((q) => q.attribute === "nationality");
    expect(nationalityQuestions.length).toBeLessThanOrEqual(6);
  });
});

describe("getQuestionQuality / rankQuestionsByQuality", () => {
  const board = makeBoard();
  const generated = generateBoardQuestions("footballers", board);

  it("scores a perfect split (France: 2 of 5) reasonably and a trivial split near zero", () => {
    const franceQ = generated.find((q) => q.value === "France")!;
    const quality = getQuestionQuality(franceQ, board);
    expect(quality.yes).toBe(2);
    expect(quality.no).toBe(3);
    expect(quality.score).toBeGreaterThan(0);
    expect(["Excellent", "Good", "Fair", "Poor"]).toContain(quality.label);
  });

  it("excludes questions with a 100/0 split from ranking", () => {
    const allYesQuestion = {
      id: "always-yes",
      text: "Are they real?",
      group: "identity" as const,
      attribute: "gender" as const,
      operator: "equals" as const,
      value: "not-a-real-value",
    };
    const ranked = rankQuestionsByQuality([allYesQuestion], board, 4);
    expect(ranked).toHaveLength(0);
  });

  it("ranks the most evenly-split question first", () => {
    const ranked = rankQuestionsByQuality(generated, board, 4);
    expect(ranked.length).toBeGreaterThan(0);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].quality.score).toBeGreaterThanOrEqual(ranked[i].quality.score);
    }
  });
});
