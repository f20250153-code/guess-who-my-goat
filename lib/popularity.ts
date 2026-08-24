import type { Character } from "@/types/character";

/**
 * Rough 1-100 fame tiers, used only to bias EASY boards toward more
 * universally-recognizable characters and EXPERT boards toward deeper
 * cuts. This is a subjective ranking judgment, not a factual claim about
 * the person — unlike attributes (nationality, awards, etc.) it carries
 * no risk of being "wrong" in a way that breaks gameplay, so it's a
 * reasonable thing to hand-curate by general knowledge rather than a
 * fact requiring verification.
 *
 * Only the most/least globally recognizable characters are listed here;
 * everyone else gets DEFAULT_POPULARITY. Extend this list over time as
 * the character pools grow — it's additive and never required.
 */
const POPULARITY_OVERRIDES: Record<string, number> = {
  // Footballers — global icons
  "fb-messi": 99,
  "fb-ronaldo-cr7": 99,
  "fb-neymar": 90,
  "fb-mbappe": 92,
  "fb-haaland": 88,
  "fb-maradona": 95,
  "fb-pele": 96,
  "fb-zidane": 88,
  "fb-beckham": 87,
  "fb-ronaldinho": 86,
  // Footballers — deeper cuts
  "fb-lauda": 40,

  // Cricketers — global icons
  "cr-tendulkar": 98,
  "cr-kohli": 97,
  "cr-dhoni": 96,
  "cr-babar": 85,
  "cr-warne": 88,
  "cr-lara": 85,
  // Deeper cuts
  "cr-gavaskar": 55,
  "cr-kallis": 55,

  // Actors — global icons
  "ac-hanks": 92,
  "ac-dicaprio": 93,
  "ac-rdj": 92,
  "ac-srk": 96,
  "ac-bachchan": 95,
  "ac-cruise": 90,
  // Deeper cuts
  "ac-dayLewis": 55,
  "ac-nicholson": 55,

  // Actresses — global icons
  "as-streep": 92,
  "as-jlaw": 88,
  "as-zendaya": 88,
  "as-priyanka": 85,
  // Deeper cuts
  "as-vidya": 45,
  "as-cruz": 60,

  // Singers — global icons
  "si-taylor": 98,
  "si-beyonce": 96,
  "si-mj": 99,
  "si-elvis": 95,
  "si-arijit": 82,
  // Deeper cuts
  "si-badshah": 50,

  // Famous personalities — global icons
  "fp-obama": 95,
  "fp-einstein": 96,
  "fp-gandhi": 96,
  "fp-modi": 90,
  "fp-trump": 95,
  // Historical, less universally known to younger players
  "fp-tesla": 60,
  "fp-lincoln": 65,

  // F1 — global icons
  "f1-hamilton": 92,
  "f1-verstappen": 90,
  "f1-schumacher": 90,
  "f1-senna": 88,
  // Deeper cuts
  "f1-tsunoda": 40,
  "f1-ocon": 38,

  // Basketball — global icons
  "bb-jordan": 98,
  "bb-lebron": 97,
  "bb-kobe": 95,
  "bb-curry": 92,
  // Deeper cuts
  "bb-iverson": 55,

  // Gamers — varies wildly by audience; keep conservative
  "gm-pewdiepie": 85,
  "gm-mrbeast": 92,
  // Deeper cuts
  "gm-totalgaming": 35,
  "gm-technogamerz": 35,

  // Tech & business — global icons
  "tb-musk": 96,
  "tb-jobs": 94,
  "tb-gates": 92,
  "tb-bezos": 88,
  // Deeper cuts
  "tb-hoffman": 35,
  "tb-nooyi": 45,

  // Fictional — global icons
  "fc-batman": 95,
  "fc-superman": 90,
  "fc-mario": 92,
  "fc-mickey": 92,
  "fc-harrypotter": 93,

  // Indian celebrities — global-to-India icons
  "ic-rajinikanth": 92,
  "ic-kapildev": 85,
  "ic-lata": 85,
  // Deeper cuts
  "ic-milkha": 45,
  "ic-abhinav": 40,
};

export const DEFAULT_POPULARITY = 60;

export function getPopularity(character: Character): number {
  return character.popularity ?? POPULARITY_OVERRIDES[character.id] ?? DEFAULT_POPULARITY;
}

/** Minimum popularity a character must have to appear at a given
 * difficulty. Lower difficulties keep the pool to widely-recognized
 * characters; higher difficulties open up the full pool, deeper cuts
 * included. */
export const DIFFICULTY_POPULARITY_FLOOR: Record<string, number> = {
  easy: 75,
  medium: 55,
  hard: 35,
  expert: 0,
};
