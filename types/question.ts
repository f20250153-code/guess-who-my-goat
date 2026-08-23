import type { CharacterAttributes } from "./character";

export type QuestionOperator =
  | "equals"
  | "contains"
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEqual"
  | "lessThanOrEqual"
  /** Custom-pack only: checks character.attributes.custom[value] === true.
   * Lets user-created packs ask about freeform tags without a typed field
   * per tag. */
  | "hasTag";

export type QuestionGroup =
  | "identity"
  | "career"
  | "status"
  | "sport"
  | "age"
  | "achievements"
  | "origin"
  /** A freeform, AI-judged question — not tied to a typed attribute, so it
   * can't auto-eliminate candidates the way structured questions do. */
  | "freeform";

export interface Question {
  id: string;
  text: string;
  /** Question is only offered when playing this category. Omit for
   * questions that make sense across every category (e.g. identity). */
  categoryIds?: string[];
  group: QuestionGroup;
  attribute: keyof CharacterAttributes;
  operator: QuestionOperator;
  value: string | number | boolean;
}

export interface AskedQuestion {
  question: Question;
  answer: boolean;
  questionNumber: number;
  /** How many of the remaining candidates this question eliminated. */
  eliminatedCount: number;
}
