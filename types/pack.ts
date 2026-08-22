import type { Character } from "./character";

export interface CharacterPack {
  id: string;
  name: string;
  description: string;
  /** Free-form category label chosen by the pack author. */
  category: string;
  characters: Character[];
  createdAt: string;
  /** Format version, so future migrations can detect old local data. */
  version: 1;
}

/** Shape stored/encoded for the shareable-URL pack system (see
 * lib/pack-utils.ts). Deliberately minimal to keep encoded URLs short. */
export interface EncodedPackPayload {
  n: string; // name
  d: string; // description
  c: string; // category
  ch: Array<{
    id: string;
    name: string;
    d?: string;
    a: Record<string, string | number | boolean | string[]>;
  }>;
  v: 1;
}
