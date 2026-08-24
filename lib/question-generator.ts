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
    attribute: "profession",
    arrayValued: true,
    group: "career",
    categoryIds: ["famous-personalities", "indian-celebrities", "tech-business", "gamers"],
    questionText: (v) => `Are they primarily known as a${/^[aeiou]/i.test(v) ? "n" : ""} ${v.toLowerCase()}?`,
    maxGenerated: 5,
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
