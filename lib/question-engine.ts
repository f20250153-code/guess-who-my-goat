import type { Character } from "@/types/character";
import type { Question } from "@/types/question";
import { questions as builtInQuestions } from "@/data/questions";

/**
 * Evaluate a single question against a single character's attributes.
 * Deterministic and pure — same inputs always produce the same output.
 * An attribute that is missing on the character is treated as "does not
 * satisfy the condition" rather than throwing, so incomplete/custom pack
 * data can never crash the engine.
 */
export function evaluateQuestion(question: Question, character: Character): boolean {
  if (question.operator === "hasTag") {
    const custom = character.attributes.custom;
    if (!custom) return false;
    return Boolean(custom[String(question.value)]);
  }

  const raw = character.attributes[question.attribute];

  if (raw === undefined || raw === null) return false;

  switch (question.operator) {
    case "equals":
      return raw === question.value;

    case "contains": {
      if (Array.isArray(raw)) {
        const target = String(question.value).toLowerCase();
        return raw.some((item) => String(item).toLowerCase() === target);
      }
      if (typeof raw === "string") {
        return raw.toLowerCase().includes(String(question.value).toLowerCase());
      }
      return false;
    }

    case "greaterThan":
      return typeof raw === "number" && typeof question.value === "number" && raw > question.value;

    case "lessThan":
      return typeof raw === "number" && typeof question.value === "number" && raw < question.value;

    case "greaterThanOrEqual":
      return typeof raw === "number" && typeof question.value === "number" && raw >= question.value;

    case "lessThanOrEqual":
      return typeof raw === "number" && typeof question.value === "number" && raw <= question.value;

    default:
      return false;
  }
}

/**
 * Every question that could legally be asked for a given category, minus
 * any already asked this game. Category-aware via `categoryIds` — a
 * question with no `categoryIds` is considered universal.
 */
export function getAvailableQuestions(
  categoryId: string,
  askedQuestionIds: string[],
  pool: Question[] = builtInQuestions,
): Question[] {
  const asked = new Set(askedQuestionIds);
  return pool.filter((q) => {
    if (asked.has(q.id)) return false;
    if (!q.categoryIds) return true;
    return q.categoryIds.includes(categoryId);
  });
}

export interface QuestionSplit {
  yes: number;
  no: number;
}

/** How many of the remaining candidates would answer YES vs NO. Used both
 * to actually filter candidates after an answer, and ahead of time to
 * gauge how useful a question is. */
export function getQuestionSplit(question: Question, candidates: Character[]): QuestionSplit {
  let yes = 0;
  for (const c of candidates) {
    if (evaluateQuestion(question, c)) yes++;
  }
  return { yes, no: candidates.length - yes };
}

/** A question is "smart" when it splits the remaining pool close to evenly
 * — the closer to a 50/50 split, the more information it gives regardless
 * of the answer. Thresholded rather than a raw score so the UI can show a
 * simple badge. */
export function isSmartQuestion(question: Question, candidates: Character[]): boolean {
  if (candidates.length < 4) return false;
  const { yes, no } = getQuestionSplit(question, candidates);
  if (yes === 0 || no === 0) return false;
  const ratio = Math.min(yes, no) / candidates.length;
  return ratio >= 0.35;
}

export type QuestionQualityLabel = "Excellent" | "Good" | "Fair" | "Poor";

export interface QuestionQuality {
  /** 0-1, where 1 is a perfect 50/50 split of the current candidates. */
  score: number;
  label: QuestionQualityLabel;
  yes: number;
  no: number;
}

/** Numeric upgrade of the smart-question check: score = 1 -
 * abs(yes-no)/total, per the standard "closest to an even split gives
 * the most information" heuristic. Used to rank and label candidate
 * questions (BEST / GOOD) rather than just flag them individually. */
export function getQuestionQuality(question: Question, candidates: Character[]): QuestionQuality {
  const { yes, no } = getQuestionSplit(question, candidates);
  const total = candidates.length;

  if (total === 0 || yes === 0 || no === 0) {
    return { score: 0, label: "Poor", yes, no };
  }

  const score = 1 - Math.abs(yes - no) / total;
  const label: QuestionQualityLabel =
    score >= 0.85 ? "Excellent" : score >= 0.65 ? "Good" : score >= 0.4 ? "Fair" : "Poor";

  return { score, label, yes, no };
}

/** Ranks a pool of candidate questions by quality and returns the top
 * `count`, each annotated with its quality. Questions with a 0-100% or
 * 100-0% split (no information at all) are excluded outright rather than
 * ranked last, since they're never worth asking. */
export function rankQuestionsByQuality(
  questions: Question[],
  candidates: Character[],
  count = 4,
): Array<Question & { quality: QuestionQuality }> {
  return questions
    .map((q) => ({ ...q, quality: getQuestionQuality(q, candidates) }))
    .filter((q) => q.quality.yes > 0 && q.quality.no > 0)
    .sort((a, b) => b.quality.score - a.quality.score)
    .slice(0, count);
}

/** Builds a question set on the fly for a user-created pack, since custom
 * characters don't populate the typed attribute fields the built-in bank
 * relies on. Includes gender (if any character sets it) plus one
 * "hasTag" question per freeform tag that actually discriminates the
 * pack (present on some but not all characters). */
export function buildCustomPackQuestions(characters: Character[]): Question[] {
  const result: Question[] = [];

  if (characters.some((c) => c.attributes.gender)) {
    result.push(
      {
        id: "custom-q-male",
        text: "Is the person male?",
        group: "identity",
        attribute: "gender",
        operator: "equals",
        value: "male",
      },
      {
        id: "custom-q-female",
        text: "Is the person female?",
        group: "identity",
        attribute: "gender",
        operator: "equals",
        value: "female",
      },
    );
  }

  const tagCounts = new Map<string, number>();
  for (const c of characters) {
    const custom = c.attributes.custom;
    if (!custom) continue;
    for (const [tag, value] of Object.entries(custom)) {
      if (value === true) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }
  }

  for (const [tag, count] of tagCounts.entries()) {
    if (count === 0 || count === characters.length) continue; // not discriminating
    result.push({
      id: `custom-q-tag-${tag}`,
      text: `Are they "${tag}"?`,
      group: "career",
      attribute: "custom",
      operator: "hasTag",
      value: tag,
    });
  }

  return result;
}

export function filterByAnswer(
  question: Question,
  candidates: Character[],
  answer: boolean,
): Character[] {
  return candidates.filter((c) => evaluateQuestion(question, c) === answer);
}
