import type { Character, CharacterAttributes } from "@/types/character";
import type { Question } from "@/types/question";
import { questions as builtInQuestions } from "@/data/questions";

/**
 * Whether `character` actually has data for `question`'s attribute at
 * all — distinct from whether the answer is yes or no. A "hasTag"
 * question is always considered supported: for custom packs, a tag's
 * absence is a deliberate, known "no" from the pack author, not missing
 * data. Every other question is unsupported when the underlying
 * attribute is undefined/null on this character.
 *
 * This is what lets the engine tell "no" apart from "we don't know" per
 * the master spec's evaluation rule: missing data must never be silently
 * treated as a "no" answer. `evaluateQuestion` below stays a simple
 * boolean (unsupported == false) for backward compatibility with every
 * existing caller; call sites that need to distinguish "no" from
 * "unknown" — the candidate-splitting and elimination logic below, plus
 * the in-game guard that only offers questions the actual secret can
 * answer — call this first.
 */
export function isQuestionSupported(question: Question, character: Character): boolean {
  if (question.operator === "hasTag") return true;
  const raw = character.attributes[question.attribute];
  return raw !== undefined && raw !== null;
}

/** Same check as `isQuestionSupported`, against a bare attributes object
 * rather than a full Character — used where only the secret's attributes
 * are available (e.g. the multiplayer-safe, name-withheld payload sent
 * to the client, or the freeform-AI-question endpoint). */
export function isAttributeSupported(question: Question, attributes: CharacterAttributes): boolean {
  if (question.operator === "hasTag") return true;
  const raw = attributes[question.attribute];
  return raw !== undefined && raw !== null;
}

/** Narrows a question pool down to only questions answerable for a given
 * set of attributes — e.g. "only offer questions the actual secret has
 * data for" (see lib/game-engine.ts's canAskQuestion). */
export function filterQuestionsSupportedBy(questions: Question[], attributes: CharacterAttributes): Question[] {
  return questions.filter((q) => isAttributeSupported(q, attributes));
}

/**
 * Evaluate a single question against a single character's attributes.
 * Deterministic and pure — same inputs always produce the same output.
 * An attribute that is missing on the character is treated as "does not
 * satisfy the condition" rather than throwing, so incomplete/custom pack
 * data can never crash the engine. Note this collapses "no" and "unknown"
 * into `false` for simplicity/backward-compatibility — callers that need
 * to tell them apart (candidate elimination, split/quality scoring) use
 * `isQuestionSupported` alongside this rather than relying on it alone.
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
  /** Candidates whose data can't answer this question at all — neither a
   * "yes" nor a "no", so they're excluded from the split/score math and
   * (in filterByAnswer) never eliminated by it either way. */
  unsupported: number;
}

/** How many of the remaining candidates would answer YES vs NO — and how
 * many simply don't have data for this attribute (see
 * `isQuestionSupported`). Used both to actually filter candidates after
 * an answer, and ahead of time to gauge how useful a question is. */
export function getQuestionSplit(question: Question, candidates: Character[]): QuestionSplit {
  let yes = 0;
  let no = 0;
  let unsupported = 0;
  for (const c of candidates) {
    if (!isQuestionSupported(question, c)) {
      unsupported++;
      continue;
    }
    if (evaluateQuestion(question, c)) yes++;
    else no++;
  }
  return { yes, no, unsupported };
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
  /** 0-1 normalized Shannon entropy of the yes/no split among candidates
   * that actually support this question (unsupported candidates are
   * excluded from the calculation, not treated as either answer) — 1 is
   * a perfect 50/50 split, 0 is no information at all. */
  score: number;
  label: QuestionQualityLabel;
  yes: number;
  no: number;
  unsupported: number;
}

/** Binary Shannon entropy in bits, already normalized to 0-1 since a
 * fair coin (p=0.5) has exactly 1 bit of entropy. This is the actual
 * information-gain metric a yes/no question provides about which of the
 * `yes`/`no` candidates is the secret — maximized at an even split,
 * falling to 0 at a 100/0 split, same shape as (and now literally, not
 * just approximately, the "closest to 50/50 wins" heuristic this
 * replaces). */
function binaryEntropy(yes: number, no: number): number {
  const total = yes + no;
  if (total === 0 || yes === 0 || no === 0) return 0;
  const p = yes / total;
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
}

/** Ranks/labels a question by the information gain it would provide right
 * now: real binary entropy over just the candidates that can actually
 * answer it (see QuestionSplit.unsupported) — used to rank and label
 * candidate questions (BEST / GOOD) rather than just flag them
 * individually. */
export function getQuestionQuality(question: Question, candidates: Character[]): QuestionQuality {
  const { yes, no, unsupported } = getQuestionSplit(question, candidates);

  if (yes === 0 || no === 0) {
    return { score: 0, label: "Poor", yes, no, unsupported };
  }

  const score = binaryEntropy(yes, no);
  const label: QuestionQualityLabel =
    score >= 0.85 ? "Excellent" : score >= 0.65 ? "Good" : score >= 0.4 ? "Fair" : "Poor";

  return { score, label, yes, no, unsupported };
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

/** Keeps candidates matching the given answer — plus, per the "missing
 * data must never become a 'no'" rule, any candidate whose data simply
 * doesn't support this question at all. A character we have no fact
 * about for this attribute isn't ruled in or out by an answer we can't
 * actually check against them; eliminating them either way would be
 * asserting something the data doesn't back up. */
export function filterByAnswer(
  question: Question,
  candidates: Character[],
  answer: boolean,
): Character[] {
  return candidates.filter((c) => {
    if (!isQuestionSupported(question, c)) return true;
    return evaluateQuestion(question, c) === answer;
  });
}
