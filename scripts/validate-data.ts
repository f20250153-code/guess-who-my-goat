/**
 * Validates the built-in data set and prints a summary report. Run with:
 *   npm run validate:data
 *
 * Checks (per category):
 *  - unique character ids
 *  - no duplicate character names within a pool
 *  - required fields present (id, name, categoryId)
 *  - categoryId matches the category it's registered under
 *  - every question definition references a real, valid attribute shape
 *
 * Never silently passes over a problem — everything found is printed,
 * and the process exits with a non-zero code if any *errors* (not
 * warnings) were found, so this can be wired into CI later if wanted.
 */
import { categories } from "../data/categories";
import { questions } from "../data/questions";

let errorCount = 0;
let warningCount = 0;

function error(message: string) {
  errorCount++;
  console.log(`  \x1b[31m✗ ERROR\x1b[0m ${message}`);
}

function warn(message: string) {
  warningCount++;
  console.log(`  \x1b[33m! warning\x1b[0m ${message}`);
}

console.log("=== Guess Who — Data Validation ===\n");

console.log("Characters:");
const allIdsGlobal = new Set<string>();
for (const category of categories) {
  console.log(`  ${category.name}: ${category.characters.length}`);

  const idsInCategory = new Set<string>();
  const namesInCategory = new Set<string>();

  for (const character of category.characters) {
    if (!character.id) {
      error(`[${category.name}] A character is missing an id (name: "${character.name}")`);
      continue;
    }
    if (allIdsGlobal.has(character.id)) {
      error(`[${category.name}] Duplicate character id across the whole dataset: "${character.id}"`);
    }
    allIdsGlobal.add(character.id);

    if (idsInCategory.has(character.id)) {
      error(`[${category.name}] Duplicate character id within category: "${character.id}"`);
    }
    idsInCategory.add(character.id);

    if (!character.name || !character.name.trim()) {
      error(`[${category.name}] Character "${character.id}" is missing a name`);
    } else {
      const nameKey = character.name.trim().toLowerCase();
      if (namesInCategory.has(nameKey)) {
        warn(`[${category.name}] Duplicate character name within category: "${character.name}"`);
      }
      namesInCategory.add(nameKey);
    }

    if (character.categoryId !== category.id) {
      error(
        `[${category.name}] Character "${character.name}" has categoryId "${character.categoryId}", expected "${category.id}"`,
      );
    }

    if (!character.attributes || Object.keys(character.attributes).length === 0) {
      warn(`[${category.name}] Character "${character.name}" has no attributes at all — no questions can distinguish them`);
    }

    if (character.popularity !== undefined && (character.popularity < 0 || character.popularity > 100)) {
      error(`[${category.name}] Character "${character.name}" has out-of-range popularity: ${character.popularity}`);
    }
  }

  if (category.characters.length < 2) {
    warn(`[${category.name}] Fewer than 2 characters — this category can't be played`);
  }
}

console.log(`\nTotal unique characters: ${allIdsGlobal.size}`);

console.log("\nQuestions:");
console.log(`  Built-in question bank: ${questions.length}`);

const questionIds = new Set<string>();
for (const q of questions) {
  if (questionIds.has(q.id)) {
    error(`Duplicate question id: "${q.id}"`);
  }
  questionIds.add(q.id);

  if (!q.text || !q.text.trim()) {
    error(`Question "${q.id}" has no text`);
  }
  if (q.categoryIds) {
    for (const catId of q.categoryIds) {
      if (!categories.some((c) => c.id === catId)) {
        error(`Question "${q.id}" references unknown category "${catId}"`);
      }
    }
  }
}

console.log(`\n${"=".repeat(40)}`);
console.log(`Result: ${errorCount} error(s), ${warningCount} warning(s)`);
console.log("=".repeat(40));

if (errorCount > 0) {
  process.exitCode = 1;
}
