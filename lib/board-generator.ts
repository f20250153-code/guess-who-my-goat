import type { Category } from "@/types/game";
import type { Character } from "@/types/character";
import type { GameDifficulty } from "@/types/game";
import { createRng, shuffleWithRng, weightedSampleWithoutReplacement, type RNG } from "./rng";
import { getPopularity, DIFFICULTY_POPULARITY_FLOOR } from "./popularity";
import { getRecentIds, getAppearanceCount } from "./board-history";

export interface GenerateBoardParams {
  category: Category;
  difficulty?: GameDifficulty;
  /** Explicit seed for deterministic boards (daily challenges, shareable
   * games, tests). Omit for a fresh random board each call. */
  seed?: string;
  boardSize?: number;
  /** Turn off recent-character deprioritization — used by tests that
   * need predictable pool membership regardless of prior play history. */
  avoidRecent?: boolean;
}

export interface GenerateBoardResult {
  characters: Character[];
  seed: string;
  /** True when the master pool was too small to need trimming — the
   * full pool was used as-is rather than being sampled down. */
  usedFullPool: boolean;
  /** Rough 0-1 measure of how evenly the board spreads across whatever
   * categorical dimensions (gender, nationality, role) the data
   * supports. Informational only, shown as a small UI hint. */
  diversityScore: number;
}

/** Pulls out whatever single categorical "role" signal a character has,
 * generically across categories — football position, cricket batting
 * role, a fictional character's origin, etc. Used only for the diversity
 * nudge below; absence is fine, it just means that dimension is skipped
 * for that character. */
function getRoleKey(character: Character): string | undefined {
  const a = character.attributes;
  if (a.position && a.position.length > 0) return a.position[0];
  if (a.batsman) return "batsman";
  if (a.bowler) return "bowler";
  if (a.allRounder) return "all-rounder";
  if (a.wicketKeeper) return "wicketkeeper";
  if (a.sport && a.sport.length > 0) return a.sport[0];
  if (a.origin) return a.origin;
  if (a.profession && a.profession.length > 0) return a.profession[0];
  return undefined;
}

const DIVERSITY_DIMENSIONS: Array<(c: Character) => string | undefined> = [
  (c) => c.attributes.gender,
  (c) => c.attributes.nationality?.[0],
  getRoleKey,
];

function computeWeight(character: Character, recentIds: Set<string>): number {
  let weight = 1;

  if (recentIds.has(character.id)) {
    weight *= 0.08; // strongly deprioritized, never fully excluded
  }

  const appearances = getAppearanceCount(character.id);
  weight *= 1 / (1 + appearances * 0.15); // gently favor under-explored characters

  return weight;
}

function distribution(characters: Character[], keyFn: (c: Character) => string | undefined): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of characters) {
    const key = keyFn(c);
    if (key === undefined) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Nudges the selected board toward better spread on each diversity
 * dimension by swapping a handful of over-represented picks for
 * under-represented ones drawn from the rest of the candidate pool.
 * Bounded (max ~15 total swaps) so it can never loop unpredictably, and
 * it's a nudge, not a quota — if the pool genuinely lacks variety on a
 * dimension, it leaves the board alone rather than forcing anything. */
function balanceDiversity(
  selected: Character[],
  candidatePool: Character[],
  rng: RNG,
): Character[] {
  const board = [...selected];
  const selectedIds = new Set(board.map((c) => c.id));
  let swapsRemaining = 15;

  for (const keyFn of DIVERSITY_DIMENSIONS) {
    if (swapsRemaining <= 0) break;
    if (board.length < 6) continue; // not worth balancing tiny boards

    const poolDist = distribution(candidatePool, keyFn);
    if (poolDist.size < 2) continue; // no variety available on this dimension anyway

    for (let attempt = 0; attempt < 3 && swapsRemaining > 0; attempt++) {
      const boardDist = distribution(board, keyFn);
      if (boardDist.size === 0) break;

      const [dominantKey, dominantCount] = [...boardDist.entries()].sort((a, b) => b[1] - a[1])[0];
      const share = dominantCount / board.length;
      if (share <= 0.75) break; // already reasonably spread

      // Find a replacement candidate outside the current board with a
      // different, ideally under-represented, value on this dimension.
      const replacementCandidates = candidatePool.filter((c) => {
        if (selectedIds.has(c.id)) return false;
        const key = keyFn(c);
        return key !== undefined && key !== dominantKey;
      });
      if (replacementCandidates.length === 0) break;

      const replacement =
        replacementCandidates[Math.floor(rng() * replacementCandidates.length)];

      // Swap out a random board member currently holding the dominant key.
      const outgoingIndex = board.findIndex((c) => keyFn(c) === dominantKey);
      if (outgoingIndex === -1) break;

      selectedIds.delete(board[outgoingIndex].id);
      board[outgoingIndex] = replacement;
      selectedIds.add(replacement.id);
      swapsRemaining--;
    }
  }

  return board;
}

function computeDiversityScore(board: Character[]): number {
  if (board.length === 0) return 0;
  const scores = DIVERSITY_DIMENSIONS.map((keyFn) => {
    const dist = distribution(board, keyFn);
    if (dist.size === 0) return null;
    const maxShare = Math.max(...dist.values()) / board.length;
    return 1 - maxShare; // lower dominance = higher score
  }).filter((s): s is number => s !== null);
  if (scores.length === 0) return 1;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function generateGameBoard({
  category,
  difficulty = "medium",
  seed,
  boardSize,
  avoidRecent = true,
}: GenerateBoardParams): GenerateBoardResult {
  const targetSize = boardSize ?? category.targetBoardSize ?? 30;
  const resolvedSeed = seed ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const rng = createRng(resolvedSeed);
  const masterPool = category.characters;

  // Master pool too small to trim — use it all, per Phase 33's graceful
  // small-pool handling rather than failing or padding with duplicates.
  if (masterPool.length <= targetSize) {
    return {
      characters: shuffleWithRng(masterPool, rng),
      seed: resolvedSeed,
      usedFullPool: true,
      diversityScore: computeDiversityScore(masterPool),
    };
  }

  // Apply the difficulty's popularity floor, relaxing it in steps if the
  // filtered pool would be too small to fill a board — always guarantees
  // a fillable pool when the master pool itself is big enough.
  const floors = [DIFFICULTY_POPULARITY_FLOOR[difficulty], 35, 0];
  let candidatePool = masterPool;
  for (const floor of floors) {
    const filtered = masterPool.filter((c) => getPopularity(c) >= floor);
    if (filtered.length >= targetSize) {
      candidatePool = filtered;
      break;
    }
    candidatePool = filtered.length > 0 ? filtered : masterPool;
  }

  const recentIds = avoidRecent ? getRecentIds(category.id) : new Set<string>();
  const weights = candidatePool.map((c) => computeWeight(c, recentIds));

  let board = weightedSampleWithoutReplacement(candidatePool, weights, targetSize, rng);
  board = balanceDiversity(board, candidatePool, rng);
  board = shuffleWithRng(board, rng);

  return {
    characters: board,
    seed: resolvedSeed,
    usedFullPool: false,
    diversityScore: computeDiversityScore(board),
  };
}
