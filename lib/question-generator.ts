import type { Character, CharacterAttributes } from "@/types/character";
import type { Question, QuestionGroup, QuestionOperator } from "@/types/question";

interface TemplateDefinition {
  attribute: keyof CharacterAttributes;
  /** Whether the attribute is an array (nationality, team, position...)
   * vs a single value (gender). Controls whether generated questions use
   * "contains" or "equals". */
  arrayValued: boolean;
  group: QuestionGroup;
  categoryIds?: string[];
  questionText: (value: string) => string;
  /** Cap on how many distinct-value questions this one definition
   * contributes per board, so a single high-cardinality attribute (like
   * nationality on a 30-person international board) can't flood the
   * list — the most evenly-splitting values are preferred. */
  maxGenerated: number;
}

const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    attribute: "nationality",
    arrayValued: true,
    group: "identity",
    questionText: (v) => `Are they from ${v}?`,
    maxGenerated: 6,
  },
  {
    attribute: "team",
    arrayValued: true,
    group: "career",
    categoryIds: ["footballers", "cricketers", "basketball", "f1-drivers"],
    questionText: (v) => `Have they played for ${v}?`,
    maxGenerated: 5,
  },
  {
    attribute: "league",
    arrayValued: true,
    group: "career",
    categoryIds: ["footballers", "cricketers", "basketball", "f1-drivers"],
    questionText: (v) => `Do they currently play in the ${v}?`,
    maxGenerated: 4,
  },
  {
    attribute: "position",
    arrayValued: true,
    group: "sport",
    categoryIds: ["footballers", "basketball"],
    questionText: (v) => `Do they play as a ${v.toLowerCase()}?`,
    maxGenerated: 5,
  },
  {
    // No categoryIds restriction — Profession is populated for every
    // non-fictional character (see scripts/generate-data.ts), so this
    // generates real, board-grounded questions for whichever category is
    // actually being played, from a one-word sport ("Footballer") to the
    // dozens of distinct roles Famous Personalities / Indian Celebrities
    // cover (Politician, Scientist, Poet, Yoga Guru, Emperor...). The
    // "only keep values that actually discriminate the board" filter
    // below means a category where everyone shares one profession (e.g.
    // "Cricketer") just silently produces nothing for this template.
    attribute: "profession",
    arrayValued: true,
    group: "career",
    questionText: (v) => `Are they primarily known as a${/^[aeiou]/i.test(v) ? "n" : ""} ${v.toLowerCase()}?`,
    maxGenerated: 8,
  },
  {
    // Mostly a no-op for single-sport categories (everyone shares one
    // value -> filtered as non-discriminating) but genuinely useful for
    // multi-sport pools like Indian Celebrities (Cricket, Badminton,
    // Shooting, Boxing, Athletics...).
    attribute: "sport",
    arrayValued: true,
    group: "sport",
    questionText: (v) => `Do they compete in ${v.toLowerCase()}?`,
    maxGenerated: 4,
  },
];

function operatorFor(def: TemplateDefinition): QuestionOperator {
  return def.arrayValued ? "contains" : "equals";
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * Generates extra Question objects from the current board's actual
 * attribute values — e.g. if the 30-character football board happens to
 * include players from 6 different countries, this produces up to 6 real
 * "Are they from X?" questions, without a human ever having hand-written
 * per-country entries. Because it only ever surfaces values it found on
 * the real board, it can't fabricate anything: every generated question
 * is guaranteed answerable and grounded in the actual data.
 */
export function generateBoardQuestions(categoryId: string, board: Character[]): Question[] {
  const generated: Question[] = [];
  const total = board.length;
  if (total === 0) return generated;

  for (const def of TEMPLATE_DEFINITIONS) {
    if (def.categoryIds && !def.categoryIds.includes(categoryId)) continue;

    const counts = new Map<string, number>();
    for (const character of board) {
      const raw = character.attributes[def.attribute];
      const values: string[] = def.arrayValued
        ? Array.isArray(raw)
          ? raw.map(String)
          : []
        : raw !== undefined && raw !== null && typeof raw !== "object"
          ? [String(raw)]
          : [];
      for (const value of values) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }

    const discriminating = [...counts.entries()]
      .filter(([, count]) => count > 0 && count < total) // skip "everyone" or "no one" — no information
      .sort((a, b) => Math.abs(a[1] - total / 2) - Math.abs(b[1] - total / 2)); // closest to 50/50 first

    for (const [value] of discriminating.slice(0, def.maxGenerated)) {
      generated.push({
        id: `gen-${def.attribute}-${slugify(value)}`,
        text: def.questionText(value),
        categoryIds: def.categoryIds,
        group: def.group,
        attribute: def.attribute,
        operator: operatorFor(def),
        value,
      });
    }
  }

  return generated;
}

/**
 * Generates numeric threshold questions from the current board's actual
 * birth years — e.g. "Were they born before 1994?" using this specific
 * board's median, rather than only the handful of fixed decades in the
 * static question bank (data/questions.ts). The median is used
 * specifically because splitting a numeric list at its median is, by
 * definition, the closest a single threshold can get to an even yes/no
 * split — the "useful split" requirement this exists to satisfy.
 * Complements (doesn't replace) the static age questions: both can be
 * offered side by side since they have distinct ids.
 */
export function generateNumericBoardQuestions(categoryId: string, board: Character[]): Question[] {
  const years = board
    .map((c) => c.attributes.birthYear)
    .filter((y): y is number => typeof y === "number");

  if (years.length < 6) return []; // too little numeric data on this board to bother

  const sorted = [...years].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  const before = years.filter((y) => y < median).length;
  const after = years.length - before;
  if (before === 0 || after === 0) return []; // degenerate — every birth year identical

  return [
    {
      id: `gen-birthyear-${median}`,
      text: `Were they born before ${median}?`,
      categoryIds: [categoryId],
      group: "age",
      attribute: "birthYear",
      operator: "lessThan",
      value: median,
    },
  ];
}
