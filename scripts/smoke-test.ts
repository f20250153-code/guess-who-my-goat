import { categories } from "../data/categories";
import { generateGameBoard } from "../lib/board-generator";
import { createGame, answerQuestion, makeGuess, buildGameResult, GAME_MODES } from "../lib/game-engine";
import { evaluateQuestion, getAvailableQuestions, rankQuestionsByQuality } from "../lib/question-engine";
import { generateBoardQuestions } from "../lib/question-generator";
import { questions as builtInQuestions } from "../data/questions";

let failures = 0;

function check(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.log(`  \x1b[31mFAIL\x1b[0m ${message}`);
  }
}

console.log("=== Full-loop integration smoke test ===\n");

for (const category of categories) {
  for (const difficulty of ["easy", "medium", "hard", "expert"] as const) {
    const boardResult = generateGameBoard({ category, difficulty, avoidRecent: false });
    check(boardResult.characters.length > 0, `${category.id}/${difficulty}: board is non-empty`);
    check(
      boardResult.characters.length <= Math.max(30, category.characters.length),
      `${category.id}/${difficulty}: board size sane`,
    );

    if (boardResult.characters.length < 2) continue;

    const state0 = createGame({
      categoryId: category.id,
      mode: "classic",
      difficulty,
      seed: boardResult.seed,
      characters: boardResult.characters,
    });
    check(state0.status === "in-progress", `${category.id}/${difficulty}: game starts in-progress`);
    check(
      boardResult.characters.some((c) => c.id === state0.secretCharacter.id),
      `${category.id}/${difficulty}: secret character is on the board`,
    );

    const pool = [...builtInQuestions, ...generateBoardQuestions(category.id, boardResult.characters)];
    const available = getAvailableQuestions(category.id, [], pool);

    // Every available question must evaluate cleanly against every board character.
    for (const q of available) {
      for (const c of boardResult.characters) {
        const result = evaluateQuestion(q, c);
        check(typeof result === "boolean", `${category.id}: question "${q.id}" evaluates to boolean for ${c.id}`);
      }
    }

    const ranked = rankQuestionsByQuality(available, state0.possibleCharacters, 4);
    check(
      ranked.every((q) => q.quality.yes > 0 && q.quality.no > 0),
      `${category.id}/${difficulty}: ranked questions all have real splits`,
    );

    // Ask up to 3 real questions and confirm elimination narrows candidates monotonically.
    let state = state0;
    for (let i = 0; i < Math.min(3, available.length); i++) {
      const before = state.possibleCharacters.length;
      state = answerQuestion(state, available[i]);
      check(
        state.possibleCharacters.length <= before,
        `${category.id}/${difficulty}: candidates never increase after a question`,
      );
      check(
        state.possibleCharacters.some((c) => c.id === state.secretCharacter.id),
        `${category.id}/${difficulty}: secret character never eliminated by its own true answers`,
      );
    }

    const finalState = makeGuess(state, state.secretCharacter.id);
    check(finalState.status === "won", `${category.id}/${difficulty}: guessing the secret correctly wins`);
    const result = buildGameResult(finalState, category.name);
    check(result.won, `${category.id}/${difficulty}: result reflects the win`);
    check(result.score >= 50 && result.score <= 1000, `${category.id}/${difficulty}: score in sane range`);
  }
}

// Sanity-check every game mode config is internally consistent.
for (const mode of Object.values(GAME_MODES)) {
  check(!!mode.name && !!mode.description, `mode ${mode.id} has name/description`);
}

console.log(`\n${failures === 0 ? "\x1b[32mAll checks passed.\x1b[0m" : `\x1b[31m${failures} check(s) failed.\x1b[0m`}`);
process.exitCode = failures > 0 ? 1 : 0;
