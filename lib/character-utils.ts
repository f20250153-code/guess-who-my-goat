import type { Character } from "@/types/character";

/** A restrained set of on-brand background tints used for the generated
 * initials avatar. Picked deterministically per-character so the same
 * person always gets the same color across a session. */
const AVATAR_PALETTES = [
  { bg: "#2a1f4d", fg: "#c4b5fd" }, // violet
  { bg: "#0e2e3d", fg: "#67e8f9" }, // cyan
  { bg: "#3a2410", fg: "#fbbf24" }, // amber
  { bg: "#3a1424", fg: "#fda4af" }, // rose
  { bg: "#0f2e22", fg: "#6ee7b7" }, // emerald
  { bg: "#12233d", fg: "#7dd3fc" }, // sky
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarPalette(seed: string): { bg: string; fg: string } {
  const index = hashString(seed) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

/** Short, human-readable subtitle shown under a character's name on their
 * card — first profession if known, otherwise a category-appropriate
 * fallback so a card is never left blank. */
export function getCharacterSubtitle(character: Character): string {
  const { profession, sport, origin } = character.attributes;
  if (profession && profession.length > 0) return profession[0];
  if (sport && sport.length > 0) return sport[0];
  if (origin) return origin.charAt(0).toUpperCase() + origin.slice(1);
  return "Mystery entry";
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
