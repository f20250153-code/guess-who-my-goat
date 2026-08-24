/**
 * A small, dependency-free seeded PRNG (mulberry32). Deterministic: the
 * same seed always produces the same sequence, which is what lets
 * generateGameBoard({ seed }) reproduce an identical 30-character board —
 * the foundation for future daily challenges and shareable game links.
 *
 * Not cryptographically secure — nor does it need to be, it's just for
 * fair shuffling of a party game board.
 */

export type RNG = () => number;

/** Hashes an arbitrary string into a 32-bit int, used to turn a
 * human-readable seed like "2026-08-23-football" into a numeric seed. */
function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function createRng(seed?: string | number): RNG {
  let a =
    seed === undefined
      ? (Math.random() * 0xffffffff) >>> 0
      : typeof seed === "number"
        ? seed >>> 0
        : hashSeed(seed);

  return function mulberry32() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle using a provided RNG, so it's reproducible when
 * the RNG was seeded. */
export function shuffleWithRng<T>(items: T[], rng: RNG): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Weighted random pick without replacement. Higher weight = more likely
 * to be picked. Weights <= 0 are treated as a tiny epsilon rather than
 * excluded outright, so nothing is ever permanently unreachable. */
export function weightedSampleWithoutReplacement<T>(
  items: T[],
  weights: number[],
  count: number,
  rng: RNG,
): T[] {
  const pool = items.map((item, i) => ({ item, weight: Math.max(weights[i] ?? 1, 0.0001) }));
  const result: T[] = [];

  while (result.length < count && pool.length > 0) {
    const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
    let r = rng() * totalWeight;
    let pickedIndex = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].weight;
      if (r <= 0) {
        pickedIndex = i;
        break;
      }
    }
    result.push(pool[pickedIndex].item);
    pool.splice(pickedIndex, 1);
  }

  return result;
}
