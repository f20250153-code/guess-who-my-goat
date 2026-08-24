/**
 * Build-time generator: converts the master character spreadsheet
 * (data/source/characters.xlsx — the 4,624+ character database) into the
 * per-category TypeScript data modules under data/. Run with:
 *
 *   npm run generate:data
 *
 * This never runs in the browser or on every request — it's a one-time
 * (or "whenever the spreadsheet changes") build step, per the project's
 * "do not parse XLSX at runtime" rule. The output is plain, already-typed
 * Character[] arrays, identical in shape to the hand-written data files
 * this replaces.
 *
 * IMPORTANT — what this script does and does NOT invent:
 * The spreadsheet's identity/career columns (Name, Category, Description,
 * Gender, Nationality, Birth Year, Popularity, Profession, Sport, Team,
 * League, Position, Fictional Origin, Hero/Villain) are populated and are
 * mapped through directly (or split on "; " for multi-value cells).
 *
 * The achievement/role BOOLEAN columns (World Cup Winner, Champions
 * League Winner, Olympic Medalist, Major Champion, Oscar/Grammy Winner,
 * Captain, Batsman/Bowler/All-Rounder/Wicketkeeper, Marvel, Comedy, Solo
 * Artist/Band Member, Billionaire, Founder, Active, Retired) are 100%
 * empty in the source spreadsheet for all 4,624 rows — there is no
 * per-character data behind them. This script does NOT fabricate values
 * for those; they are left undefined, which the question engine treats
 * as "unsupported" rather than "no" (see lib/question-engine.ts). Any
 * static question tied to one of these attributes simply won't be
 * offered until/unless that data is added to the spreadsheet later.
 *
 * A handful of boolean flags ARE safely derivable because they're just a
 * structured restatement of a populated column, not a new fact:
 *  - indian / american / british / european: derived from Nationality
 *    (explicit true/false whenever nationality is known; left unset only
 *    for the ~490 Fictional Characters, who have no nationality at all).
 *  - actor / actress / singer / director / entrepreneur / streamer /
 *    athlete: derived from Profession (a "; "-separated list of a
 *    person's real, curated roles) whenever Profession is populated,
 *    which is every character except Fictional Characters.
 *  - fictional: true for the Fictional Characters category (omitted,
 *    not false, elsewhere — no question currently keys off it directly).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

const SOURCE_PATH = path.join(__dirname, "../data/source/characters.xlsx");
const DATA_DIR = path.join(__dirname, "../data");

interface CategoryMeta {
  /** Exact value in the spreadsheet's "Category" column. */
  sheetCategory: string;
  /** data/categories.ts category id. */
  categoryId: string;
  /** Output file (relative to data/). */
  fileName: string;
  /** Exported const name. */
  exportName: string;
}

const CATEGORY_META: CategoryMeta[] = [
  { sheetCategory: "Footballers", categoryId: "footballers", fileName: "footballers.ts", exportName: "footballers" },
  { sheetCategory: "Cricketers", categoryId: "cricketers", fileName: "cricketers.ts", exportName: "cricketers" },
  { sheetCategory: "Actors", categoryId: "actors", fileName: "actors.ts", exportName: "actors" },
  { sheetCategory: "Actresses", categoryId: "actresses", fileName: "actresses.ts", exportName: "actresses" },
  { sheetCategory: "Singers", categoryId: "singers", fileName: "singers.ts", exportName: "singers" },
  {
    sheetCategory: "Famous Personalities",
    categoryId: "famous-personalities",
    fileName: "famousPersonalities.ts",
    exportName: "famousPersonalities",
  },
  { sheetCategory: "F1 Drivers", categoryId: "f1-drivers", fileName: "f1Drivers.ts", exportName: "f1Drivers" },
  {
    sheetCategory: "Basketball Players",
    categoryId: "basketball",
    fileName: "basketballPlayers.ts",
    exportName: "basketballPlayers",
  },
  { sheetCategory: "Gamers & Streamers", categoryId: "gamers", fileName: "gamers.ts", exportName: "gamers" },
  {
    sheetCategory: "Tech & Business",
    categoryId: "tech-business",
    fileName: "techBusiness.ts",
    exportName: "techBusiness",
  },
  {
    sheetCategory: "Fictional Characters",
    categoryId: "fictional",
    fileName: "fictionalCharacters.ts",
    exportName: "fictionalCharacters",
  },
  {
    sheetCategory: "Indian Celebrities",
    categoryId: "indian-celebrities",
    fileName: "indianCelebrities.ts",
    exportName: "indianCelebrities",
  },
];

// UEFA-member / conventionally-"European" nationalities that actually
// appear in the spreadsheet. A judgment call for a handful of
// transcontinental countries (Russia, Turkey, Georgia) — included per
// common sporting convention (UEFA membership), documented here rather
// than silently guessed.
const EUROPEAN_NATIONALITIES = new Set([
  "Albania", "Austria", "Belgium", "Bosnia and Herzegovina", "Croatia",
  "Czech Republic", "Denmark", "England", "Finland", "France", "Georgia",
  "Germany", "Greece", "Hungary", "Iceland", "Ireland", "Italy", "Latvia",
  "Lithuania", "Monaco", "Montenegro", "Netherlands", "Northern Ireland",
  "Norway", "Poland", "Portugal", "Russia", "Scotland", "Serbia",
  "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland", "Turkey",
  "UK", "Ukraine", "Wales",
]);
const BRITISH_NATIONALITIES = new Set(["UK", "England", "Scotland", "Wales", "Northern Ireland"]);

const ROLE_TOKENS: Array<{ attribute: "actor" | "actress" | "singer" | "director" | "entrepreneur" | "streamer" | "athlete"; matches: (professions: string[]) => boolean }> = [
  { attribute: "actor", matches: (p) => p.includes("Actor") },
  { attribute: "actress", matches: (p) => p.includes("Actress") },
  { attribute: "singer", matches: (p) => p.includes("Singer") },
  { attribute: "director", matches: (p) => p.includes("Director") },
  { attribute: "entrepreneur", matches: (p) => p.includes("Entrepreneur") },
  { attribute: "streamer", matches: (p) => p.includes("Streamer") || p.includes("YouTuber") },
  {
    attribute: "athlete",
    matches: (p) =>
      p.some((role) =>
        [
          "Athlete", "Cricketer", "Footballer", "Basketball Player", "F1 Driver", "Boxer", "Wrestler",
          "Tennis Player", "Hockey Player", "Chess Player", "Archer", "Shooter", "Cueist",
          "Badminton Player", "Esports Player",
        ].includes(role),
      ),
  },
];

const SPORT_CATEGORIES = new Set(["footballers", "cricketers", "basketball", "f1-drivers"]);

function splitMulti(raw: unknown): string[] {
  if (raw === null || raw === undefined) return [];
  const s = String(raw).trim();
  if (!s) return [];
  return s.split(";").map((part) => part.trim()).filter(Boolean);
}

function str(raw: unknown): string | undefined {
  if (raw === null || raw === undefined) return undefined;
  const s = String(raw).trim();
  return s.length > 0 ? s : undefined;
}

function num(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

/** Minimal, dependency-free stable JS-literal serializer — used instead of
 * JSON.stringify so keys don't get quoted and output matches the existing
 * hand-written file style. Deterministic key order (insertion order, since
 * we build objects with only meaningful keys already in a sensible order). */
function serialize(value: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  const padIn = "  ".repeat(indent + 1);
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[${value.map((v) => serialize(v, indent)).join(", ")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "{}";
  const lines = entries.map(([k, v]) => `${padIn}${k}: ${serialize(v, indent + 1)},`);
  return `{\n${lines.join("\n")}\n${pad}}`;
}

interface Row {
  ID: string;
  Name: string;
  Category: string;
  Description: string;
  Gender: string;
  Nationality: string;
  "Birth Year": number;
  "Popularity (1-100)": number;
  Profession: string;
  Sport: string;
  Team: string;
  League: string;
  Position: string;
  "Fictional Origin": string;
  "Hero/Villain": string;
}

function buildCharacter(row: Row, categoryId: string) {
  const nationalities = splitMulti(row.Nationality);
  const professions = splitMulti(row.Profession);
  const isFictional = categoryId === "fictional";

  const attributes: Record<string, unknown> = {};

  const gender = str(row.Gender);
  if (gender) attributes.gender = gender;
  if (nationalities.length > 0) attributes.nationality = nationalities;
  if (professions.length > 0) attributes.profession = professions;

  const birthYear = num(row["Birth Year"]);
  if (birthYear !== undefined) attributes.birthYear = birthYear;

  const sport = splitMulti(row.Sport);
  if (sport.length > 0) attributes.sport = sport;
  const team = splitMulti(row.Team);
  if (team.length > 0) attributes.team = team;
  const league = splitMulti(row.League);
  if (league.length > 0) attributes.league = league;
  const position = splitMulti(row.Position);
  if (position.length > 0) attributes.position = position;

  // Region flags: explicit true/false whenever nationality is known (we
  // can derive them with certainty), left unset entirely when it isn't.
  if (nationalities.length > 0) {
    attributes.indian = nationalities.includes("India");
    attributes.american = nationalities.includes("USA");
    attributes.british = nationalities.some((n) => BRITISH_NATIONALITIES.has(n));
    attributes.european = nationalities.some((n) => EUROPEAN_NATIONALITIES.has(n));
  }

  // Role flags: explicit true/false whenever Profession is known (every
  // non-fictional character); genuinely unset for fictional characters,
  // who have no Profession data at all.
  if (professions.length > 0) {
    for (const { attribute, matches } of ROLE_TOKENS) {
      attributes[attribute] = matches(professions);
    }
  }
  // Category-implied athlete flag for the four pure sport categories,
  // even on rows whose Profession is a single fixed value like
  // "Footballer" that ROLE_TOKENS' athlete matcher doesn't special-case.
  if (SPORT_CATEGORIES.has(categoryId)) {
    attributes.athlete = true;
  }

  if (isFictional) {
    attributes.fictional = true;
    const origin = str(row["Fictional Origin"]);
    if (origin) attributes.origin = origin;
    const heroOrVillain = str(row["Hero/Villain"]);
    if (heroOrVillain) attributes.heroOrVillain = heroOrVillain;
  }

  const popularity = num(row["Popularity (1-100)"]);

  return {
    id: row.ID,
    name: row.Name,
    categoryId,
    description: str(row.Description),
    popularity: popularity !== undefined ? Math.min(100, Math.max(1, popularity)) : undefined,
    attributes,
  };
}

function main() {
  const workbook = XLSX.readFile(SOURCE_PATH);
  const sheet = workbook.Sheets["Characters"];
  if (!sheet) throw new Error(`"Characters" sheet not found in ${SOURCE_PATH}`);
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: undefined });

  console.log(`Read ${rows.length} rows from ${path.relative(process.cwd(), SOURCE_PATH)}`);

  mkdirSync(DATA_DIR, { recursive: true });

  let totalWritten = 0;
  const summary: Array<{ category: string; count: number }> = [];

  for (const meta of CATEGORY_META) {
    const rowsForCategory = rows.filter((r) => r.Category === meta.sheetCategory);
    if (rowsForCategory.length === 0) {
      console.warn(`  ! No rows found for category "${meta.sheetCategory}" — skipping file write.`);
      continue;
    }

    const characters = rowsForCategory.map((r) => buildCharacter(r, meta.categoryId));

    const header = [
      `// AUTO-GENERATED by scripts/generate-data.ts from data/source/characters.xlsx.`,
      `// Do not hand-edit — re-run \`npm run generate:data\` after updating the spreadsheet.`,
      `import type { Character } from "@/types/character";`,
      ``,
      `const cat = "${meta.categoryId}";`,
      ``,
      `export const ${meta.exportName}: Character[] = [`,
    ].join("\n");

    const body = characters
      .map((c) => {
        // categoryId re-expressed as the `cat` const for readability/DRY,
        // matching the existing hand-written file convention.
        const withCatVar = { ...c, categoryId: "__CAT__" };
        const serialized = serialize(withCatVar, 1).replace(/"__CAT__"/, "cat");
        return `  ${serialized},`;
      })
      .join("\n");

    const footer = `\n];\n`;

    const fileContents = `${header}\n${body}${footer}`;
    writeFileSync(path.join(DATA_DIR, meta.fileName), fileContents, "utf-8");

    console.log(`  ${meta.sheetCategory.padEnd(24)} -> ${meta.fileName.padEnd(26)} (${characters.length} characters)`);
    summary.push({ category: meta.sheetCategory, count: characters.length });
    totalWritten += characters.length;
  }

  console.log(`\nTotal characters written: ${totalWritten}`);
  if (totalWritten !== rows.length) {
    console.warn(
      `\n! Warning: ${rows.length} rows read but only ${totalWritten} written — some rows had an unrecognized Category value.`,
    );
    const known = new Set(CATEGORY_META.map((m) => m.sheetCategory));
    const unknown = new Set(rows.filter((r) => !known.has(r.Category)).map((r) => r.Category));
    if (unknown.size > 0) {
      console.warn(`  Unrecognized categories: ${[...unknown].join(", ")}`);
    }
  }
}

main();
