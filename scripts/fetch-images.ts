/**
 * Fetches a real photo for every built-in character from Wikipedia's free,
 * no-key-required REST API and writes the results to
 * data/character-images.json — a flat { characterId: { url, attribution } }
 * lookup that lib/character-utils.ts reads at runtime.
 *
 * Run it yourself:  npm run fetch-images
 *
 * This does NOT run automatically during `next build` or on Vercel — it
 * needs outbound internet access to en.wikipedia.org, which a sandboxed
 * CI/AI environment may not have. Run it once locally (or re-run any time
 * you add characters) and commit the resulting JSON file.
 *
 * Wikipedia/Wikimedia's own reuse policy explicitly supports hotlinking
 * their CDN-served thumbnails for exactly this kind of non-commercial,
 * attributed use. We store only the URL (never the binary), and each
 * CharacterCard falls back to the generated-initials avatar automatically
 * if an image 404s or fails to load — nothing here can "break" the game.
 *
 * KNOWN LIMITATION: matching is by character name only, which is
 * ambiguous for a handful of entries (e.g. common first names, or
 * usernames that aren't primarily what Wikipedia indexes). After running
 * this, spot-check a few categories and hand-fix any wrong photo by
 * either editing data/character-images.json directly, or adding an entry
 * to TITLE_OVERRIDES below and re-running.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { categories } from "../data/categories";

const OUTPUT_PATH = path.resolve(process.cwd(), "data/character-images.json");
const WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const REQUEST_DELAY_MS = 150; // be polite to Wikipedia's free API

/**
 * Hand-corrected Wikipedia page titles for characters whose plain name is
 * ambiguous or resolves to the wrong page. Add to this as you spot
 * mismatches: "character-id": "Exact Wikipedia Page Title".
 */
const TITLE_OVERRIDES: Record<string, string> = {
  "fb-ronaldo-cr7": "Cristiano Ronaldo",
  "fb-ronaldo-r9": "Ronaldo (Brazilian footballer)",
  "ic-vijay": "Vijay (actor)",
};

interface ImageEntry {
  url: string;
  attribution: string;
}

async function fetchWikipediaImage(title: string): Promise<string | null> {
  try {
    const res = await fetch(`${WIKI_API}${encodeURIComponent(title)}`, {
      headers: {
        "User-Agent": "GuessWhoPartyGame/1.0 (personal project; hotlinks Wikipedia thumbnails)",
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.type === "disambiguation") return null;
    return data?.thumbnail?.source ?? data?.originalimage?.source ?? null;
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  let existing: Record<string, ImageEntry> = {};
  try {
    existing = JSON.parse(await fs.readFile(OUTPUT_PATH, "utf-8"));
  } catch {
    // No existing file yet — start fresh.
  }

  const result: Record<string, ImageEntry> = { ...existing };
  let fetched = 0;
  let skipped = 0;
  let failed = 0;
  const failedNames: string[] = [];

  for (const category of categories) {
    for (const character of category.characters) {
      if (result[character.id]) {
        skipped++;
        continue;
      }

      const title = TITLE_OVERRIDES[character.id] ?? character.name;
      const url = await fetchWikipediaImage(title);

      if (url) {
        result[character.id] = { url, attribution: `Wikipedia — ${title}` };
        fetched++;
        console.log(`  ✓ ${character.name}`);
      } else {
        failed++;
        failedNames.push(character.name);
        console.log(`  ✗ ${character.name} (no image found)`);
      }

      await sleep(REQUEST_DELAY_MS);
    }
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2) + "\n", "utf-8");

  console.log(`\nDone.`);
  console.log(`  Fetched:  ${fetched}`);
  console.log(`  Skipped (already cached): ${skipped}`);
  console.log(`  Failed:   ${failed}`);
  if (failedNames.length > 0) {
    console.log(`\nNo photo found for: ${failedNames.join(", ")}`);
    console.log(`These will show the initials avatar — that's expected, not an error.`);
  }
  console.log(`\nSaved to ${OUTPUT_PATH}`);
}

main();
