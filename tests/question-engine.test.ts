import { describe, it, expect } from "vitest";
import {
  evaluateQuestion,
  getAvailableQuestions,
  getQuestionSplit,
  filterByAnswer,
  isQuestionSupported,
  isAttributeSupported,
  filterQuestionsSupportedBy,
} from "@/lib/question-engine";
import type { Character } from "@/types/character";
import type { Question } from "@/types/question";

const alice: Character = {
  id: "c1",
  name: "Alice",
  categoryId: "test",
  attributes: {
    gender: "female",
    indian: true,
    birthYear: 1990,
    sport: ["Cricket"],
    batsman: true,
  },
};

const bob: Character = {
  id: "c2",
  name: "Bob",
  categoryId: "test",
  attributes: {
    gender: "male",
    indian: false,
    birthYear: 1975,
    sport: ["Football"],
    batsman: false,
  },
};

const carol: Character = {
  id: "c3",
  name: "Carol",
  categoryId: "test",
  attributes: {
    gender: "female",
    // no birthYear, no sport — incomplete data on purpose
  },
};

const qGender: Question = {
  id: "q1",
  text: "Is the person female?",
  group: "identity",
  attribute: "gender",
  operator: "equals",
  value: "female",
};

const qIndian: Question = {
  id: "q2",
  text: "Are they Indian?",
  group: "identity",
  attribute: "indian",
  operator: "equals",
  value: true,
};

const qBornBefore1980: Question = {
  id: "q3",
  text: "Born before 1980?",
  group: "age",
  attribute: "birthYear",
  operator: "lessThan",
  value: 1980,
};

const qPlaysCricket: Question = {
  id: "q4",
  text: "Plays cricket?",
  group: "sport",
  attribute: "sport",
  operator: "contains",
  value: "Cricket",
};

const qCategoryScoped: Question = {
  id: "q5",
  text: "Category scoped question",
  categoryIds: ["footballers"],
  group: "career",
  attribute: "gender",
  operator: "equals",
  value: "male",
};

describe("evaluateQuestion", () => {
  it("evaluates boolean equality correctly", () => {
    expect(evaluateQuestion(qGender, alice)).toBe(true);
    expect(evaluateQuestion(qGender, bob)).toBe(false);
  });

  it("evaluates boolean attribute equality", () => {
    expect(evaluateQuestion(qIndian, alice)).toBe(true);
    expect(evaluateQuestion(qIndian, bob)).toBe(false);
  });

  it("evaluates numeric lessThan", () => {
    expect(evaluateQuestion(qBornBefore1980, bob)).toBe(true);
    expect(evaluateQuestion(qBornBefore1980, alice)).toBe(false);
  });

  it("evaluates array contains", () => {
    expect(evaluateQuestion(qPlaysCricket, alice)).toBe(true);
    expect(evaluateQuestion(qPlaysCricket, bob)).toBe(false);
  });

  it("treats missing attributes as false rather than throwing", () => {
    expect(() => evaluateQuestion(qBornBefore1980, carol)).not.toThrow();
    expect(evaluateQuestion(qBornBefore1980, carol)).toBe(false);
    expect(evaluateQuestion(qPlaysCricket, carol)).toBe(false);
  });
});

describe("getAvailableQuestions", () => {
  const pool = [qGender, qIndian, qCategoryScoped];

  it("excludes already-asked questions", () => {
    const available = getAvailableQuestions("footballers", ["q1"], pool);
    expect(available.find((q) => q.id === "q1")).toBeUndefined();
  });

  it("includes universal questions for any category", () => {
    const available = getAvailableQuestions("cricketers", [], pool);
    expect(available.find((q) => q.id === "q1")).toBeDefined();
  });

  it("excludes category-scoped questions for the wrong category", () => {
    const available = getAvailableQuestions("cricketers", [], pool);
    expect(available.find((q) => q.id === "q5")).toBeUndefined();
  });

  it("includes category-scoped questions for the right category", () => {
    const available = getAvailableQuestions("footballers", [], pool);
    expect(available.find((q) => q.id === "q5")).toBeDefined();
  });
});

describe("getQuestionSplit / filterByAnswer", () => {
  const candidates = [alice, bob, carol];

  it("counts yes/no candidates correctly", () => {
    const split = getQuestionSplit(qGender, candidates);
    expect(split.yes).toBe(2); // alice, carol
    expect(split.no).toBe(1); // bob
  });

  it("filters candidates matching the given answer", () => {
    const yesGroup = filterByAnswer(qGender, candidates, true);
    expect(yesGroup.map((c) => c.id).sort()).toEqual(["c1", "c3"]);

    const noGroup = filterByAnswer(qGender, candidates, false);
    expect(noGroup.map((c) => c.id)).toEqual(["c2"]);
  });
});

describe("missing data is 'unsupported', never a silent 'no'", () => {
  it("isQuestionSupported is false when the attribute is absent, true when present", () => {
    expect(isQuestionSupported(qBornBefore1980, carol)).toBe(false); // carol has no birthYear
    expect(isQuestionSupported(qBornBefore1980, alice)).toBe(true);
    expect(isQuestionSupported(qPlaysCricket, carol)).toBe(false); // carol has no sport
  });

  it("isAttributeSupported works against a bare attributes object", () => {
    expect(isAttributeSupported(qBornBefore1980, carol.attributes)).toBe(false);
    expect(isAttributeSupported(qBornBefore1980, alice.attributes)).toBe(true);
  });

  it("a hasTag question is always considered supported, even with no custom tags set", () => {
    const qTag = { id: "t", text: "?", group: "career" as const, attribute: "custom" as const, operator: "hasTag" as const, value: "x" };
    expect(isQuestionSupported(qTag, carol)).toBe(true);
  });

  it("getQuestionSplit counts unsupported candidates separately from yes/no", () => {
    const split = getQuestionSplit(qBornBefore1980, [alice, bob, carol]);
    expect(split.yes).toBe(1); // bob, born 1975 -> before 1980
    expect(split.no).toBe(1); // alice, born 1990 -> not before 1980
    expect(split.unsupported).toBe(1); // carol has no birthYear at all
  });

  it("filterByAnswer never eliminates a candidate the question can't be checked against, for either answer", () => {
    const yesGroup = filterByAnswer(qBornBefore1980, [alice, bob, carol], true);
    const noGroup = filterByAnswer(qBornBefore1980, [alice, bob, carol], false);
    expect(yesGroup.map((c) => c.id)).toContain("c3"); // carol stays regardless of the answer
    expect(noGroup.map((c) => c.id)).toContain("c3");
  });

  it("filterQuestionsSupportedBy narrows a pool to what a given attribute set can answer", () => {
    const pool = [qGender, qBornBefore1980, qPlaysCricket];
    const supported = filterQuestionsSupportedBy(pool, carol.attributes);
    expect(supported.map((q) => q.id)).toEqual(["q1"]); // only gender, which carol has
  });
});
