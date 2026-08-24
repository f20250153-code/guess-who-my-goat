/**
 * Core character data model.
 *
 * Every character in every category (built-in or user-created) conforms to
 * this shape. Gameplay logic (lib/question-engine.ts, lib/game-engine.ts)
 * never special-cases an individual character — it only ever reads
 * `attributes`. This keeps the dataset fully data-driven and lets new
 * categories / characters be added without touching game logic.
 */

export interface CharacterAttributes {
  gender?: "male" | "female" | "other";
  nationality?: string[];
  profession?: string[];
  birthYear?: number;

  active?: boolean;
  retired?: boolean;
  married?: boolean;

  sport?: string[];
  team?: string[];
  league?: string[];
  position?: string[];

  actor?: boolean;
  actress?: boolean;
  singer?: boolean;
  athlete?: boolean;
  director?: boolean;
  entrepreneur?: boolean;
  streamer?: boolean;
  fictional?: boolean;
  marvel?: boolean;
  comedy?: boolean;

  indian?: boolean;
  american?: boolean;
  british?: boolean;
  european?: boolean;

  oscarWinner?: boolean;
  grammyWinner?: boolean;
  worldCupWinner?: boolean;
  olympicMedalist?: boolean;
  championsLeagueWinner?: boolean;
  /** Won the top individual championship in their sport (F1 Drivers'
   * Championship, a league MVP/title, etc). Kept generic so it can be
   * reused across sport categories without adding a field per sport. */
  champion?: boolean;

  captain?: boolean;
  batsman?: boolean;
  bowler?: boolean;
  allRounder?: boolean;
  wicketKeeper?: boolean;

  soloArtist?: boolean;
  bandMember?: boolean;

  billionaire?: boolean;
  founder?: boolean;

  heroOrVillain?: "hero" | "villain" | "anti-hero" | "neutral";
  origin?: "comics" | "movies" | "games" | "tv" | "literature" | "anime" | "books" | "cartoons";

  /** Escape hatch for category-specific attributes that don't merit a
   * first-class field yet. Kept intentionally rare — prefer adding a typed
   * field above so the question engine can reason about it directly. */
  custom?: Record<string, string | number | boolean | string[]>;
}

export interface Character {
  id: string;
  name: string;
  categoryId: string;
  image?: string;
  description?: string;
  /** Rough 1-100 fame tier used by the board generator's difficulty
   * filtering — higher is more universally recognizable. Optional: most
   * existing characters don't set this explicitly and get a sensible
   * mid-tier default (see lib/popularity.ts) rather than requiring every
   * record to be hand-tuned. */
  popularity?: number;
  attributes: CharacterAttributes;
}
