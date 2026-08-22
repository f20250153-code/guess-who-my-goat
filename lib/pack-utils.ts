import type { Character } from "@/types/character";
import type { CharacterPack, EncodedPackPayload } from "@/types/pack";

export const PACK_LIMITS = {
  minCharacters: 2,
  maxCharacters: 60,
  maxNameLength: 60,
  maxDescriptionLength: 240,
  /** Encoded URL payloads beyond this are rejected outright — keeps
   * shared links reasonable and prevents abuse via giant payloads. */
  maxEncodedLength: 12000,
};

function toPayload(pack: CharacterPack): EncodedPackPayload {
  return {
    n: pack.name,
    d: pack.description,
    c: pack.category,
    v: 1,
    ch: pack.characters.map((c) => ({
      id: c.id,
      name: c.name,
      d: c.description,
      a: (c.attributes.custom ?? {}) as Record<string, string | number | boolean | string[]>,
    })),
  };
}

function fromPayload(payload: EncodedPackPayload): CharacterPack {
  return {
    id: `pack_${Date.now().toString(36)}`,
    name: payload.n,
    description: payload.d,
    category: payload.c,
    version: 1,
    createdAt: new Date().toISOString(),
    characters: payload.ch.map((c) => ({
      id: c.id,
      name: c.name,
      categoryId: "custom",
      description: c.d,
      attributes: { custom: c.a },
    })),
  };
}

/** Base64url-encodes a pack for embedding in a shareable `?pack=` URL
 * parameter. Never throws — returns null on any failure so callers can
 * show a friendly error instead of crashing. */
export function encodePack(pack: CharacterPack): string | null {
  try {
    const json = JSON.stringify(toPayload(pack));
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    const base64 = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    if (base64.length > PACK_LIMITS.maxEncodedLength) return null;
    return base64;
  } catch {
    return null;
  }
}

export interface DecodeResult {
  pack: CharacterPack | null;
  error?: string;
}

/** Decodes and validates an imported pack. Never executes anything from
 * the payload — it is pure data that is structurally validated before
 * being handed back to the caller. */
export function decodePack(encoded: string): DecodeResult {
  if (!encoded || encoded.length > PACK_LIMITS.maxEncodedLength) {
    return { pack: null, error: "This pack link looks invalid or too large." };
  }
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const payload = JSON.parse(json) as EncodedPackPayload;

    const validation = validatePayload(payload);
    if (validation) return { pack: null, error: validation };

    return { pack: fromPayload(payload) };
  } catch {
    return { pack: null, error: "This pack link couldn't be read. It may be corrupted." };
  }
}

function validatePayload(payload: EncodedPackPayload): string | null {
  if (!payload || typeof payload !== "object") return "Pack data is malformed.";
  if (typeof payload.n !== "string" || payload.n.length === 0) return "Pack is missing a name.";
  if (!Array.isArray(payload.ch)) return "Pack has no characters.";
  if (payload.ch.length < PACK_LIMITS.minCharacters) {
    return `A pack needs at least ${PACK_LIMITS.minCharacters} characters.`;
  }
  if (payload.ch.length > PACK_LIMITS.maxCharacters) {
    return `A pack can have at most ${PACK_LIMITS.maxCharacters} characters.`;
  }
  for (const c of payload.ch) {
    if (typeof c.name !== "string" || c.name.trim().length === 0) {
      return "Every character needs a name.";
    }
  }
  return null;
}

export function validateNewPack(input: {
  name: string;
  description: string;
  category: string;
  characters: Character[];
}): string | null {
  if (!input.name.trim()) return "Give your pack a name.";
  if (input.name.length > PACK_LIMITS.maxNameLength) return "Pack name is too long.";
  if (input.description.length > PACK_LIMITS.maxDescriptionLength) return "Description is too long.";
  if (input.characters.length < PACK_LIMITS.minCharacters) {
    return `Add at least ${PACK_LIMITS.minCharacters} characters to start.`;
  }
  if (input.characters.length > PACK_LIMITS.maxCharacters) {
    return `A pack can have at most ${PACK_LIMITS.maxCharacters} characters.`;
  }
  const names = new Set<string>();
  for (const c of input.characters) {
    if (!c.name.trim()) return "Every character needs a name.";
    const key = c.name.trim().toLowerCase();
    if (names.has(key)) return `"${c.name}" is listed more than once.`;
    names.add(key);
  }
  return null;
}
