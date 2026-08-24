import { describe, it, expect } from "vitest";
import {
  createGame,
  answerQuestion,
  canAskQuestion,
  eliminateCharacter,
  restoreCharacter,
  makeGuess,
  calculateScore,
  restartGame,
  forceEndGame,
  GAME_MODES,
} from "@/lib/game-engine";
import type { Character } from "@/types/character";
import type { Question } from "@/types/question";

function makeCharacters(): Character[] {
  return [
    { id: "a", name: "Alice", categoryId: "test", attributes: { gender: "female", indian: true } },
    { id: "b", name: "Bob", categoryId: "test", attributes: { gender: "male", indian: false } },
    { id: "c", name: "Carol", categoryId: "test", attributes: { gender: "female", indian: false } },
    { id: "d", name: "Dave", categoryId: "test", attributes: { gender: "male", indian: true } },
  ];
}

const qGender: Question = {
  id: "q-gender",
  text: "Is the person female?",
  group: "identity",
  attribute: "gender",
  operator: "equals",
  value: "female",
};

const qIndian: Question = {
  id: "q-indian",
  text: "Are they Indian?",
  group: "identity",
  attribute: "indian",
  operator: "equals",
  value: true,
};

describe("createGame", () => {
  it("creates a game with a secret character from the given pool", () => {
    const characters = makeCharacters();
    const state = createGame({ categoryId: "test", mode: "classic", characters });
    expect(state.status).toBe("in-progress");
    expect(state.possibleCharacters).toHaveLength(4);
    expect(characters.map((c) => c.id)).toContain(state.secretCharacter.id);
  });

  it("throws for too few characters", () => {
    expect(() =>
      createGame({ categoryId: "test", mode: "classic", characters: [makeCharacters()[0]] }),
    ).toThrow();
  });

  it("supports forcing a specific secret character (for deterministic tests)", () => {
    const characters = makeCharacters();
    const state = createGame({ categoryId: "test", mode: "classic", characters, forcedSecretId: "b" });
    expect(state.secretCharacter.id).toBe("b");
  });
});

describe("answerQuestion", () => {
  it("eliminates candidates that don't match a YES answer", () => {
    const characters = makeCharacters();
    let state = createGame({ categoryId: "test", mode: "classic", characters, forcedSecretId: "a" });
    // secret is Alice: female -> answer should be true (YES)
    state = answerQuestion(state, qGender);
    expect(state.askedQuestions).toHaveLength(1);
    expect(state.askedQuestions[0].answer).toBe(true);
    // Bob and Dave (male) should be eliminated
    expect(state.possibleCharacters.map((c) => c.id).sort()).toEqual(["a", "c"]);
    expect(state.eliminatedCharacters.map((c) => c.id).sort()).toEqual(["b", "d"]);
  });

  it("eliminates candidates that match when the answer is NO", () => {
    const characters = makeCharacters();
    let state = createGame({ categoryId: "test", mode: "classic", characters, forcedSecretId: "b" });
    // secret is Bob: male -> "Is female?" is NO
    state = answerQuestion(state, qGender);
    expect(state.askedQuestions[0].answer).toBe(false);
    expect(state.possibleCharacters.map((c) => c.id).sort()).toEqual(["b", "d"]);
  });

  it("never mutates the original state object", () => {
    const characters = makeCharacters();
    const state = createGame({ categoryId: "test", mode: "classic", characters, forcedSecretId: "a" });
    const originalPossible = state.possibleCharacters;
    const nextState = answerQuestion(state, qGender);
    expect(state.possibleCharacters).toBe(originalPossible); // untouched
    expect(nextState).not.toBe(state);
    expect(nextState.possibleCharacters).not.toBe(originalPossible);
  });

  it("does not allow asking the same question twice", () => {
    const characters = makeCharacters();
    let state = createGame({ categoryId: "test", mode: "classic", characters, forcedSecretId: "a" });
    state = answerQuestion(state, qGender);
    const countAfterFirst = state.questionCount;
    state = answerQuestion(state, qGender);
    expect(state.questionCount).toBe(countAfterFirst); // unchanged, question rejected
  });

  it("stacks multiple questions to progressively narrow candidates", () => {
    const characters = makeCharacters();
    let state = createGame({ categoryId: "test", mode: "classic", characters, forcedSecretId: "a" });
    state = answerQuestion(state, qGender); // -> a, c remain
    state = answerQuestion(state, qIndian); // a is indian, c is not -> a remains
    expect(state.possibleCharacters.map((c) => c.id)).toEqual(["a"]);
  });
});

describe("canAskQuestion / game modes", () => {
  it("respects a mode's maxQuestions limit", () => {
    const characters = makeCharacters();
    let state = createGame({ categoryId: "test", mode: "challenge", characters, forcedSecretId: "a" });
    expect(GAME_MODES.challenge.maxQuestions).toBe(5);

    const questions: Question[] = Array.from({ length: 6 }, (_, i) => ({
      id: `q-${i}`,
      text: `Question ${i}`,
      group: "identity",
      attribute: "gender",
      operator: "equals",
      value: "female",
    }));

    for (const q of questions) {
      if (canAskQuestion(state, q)) {
        state = answerQuestion(state, q);
      }
    }
    expect(state.questionCount).toBe(5);
  });
});

describe("canAskQuestion rejects questions the secret has no data for", () => {
  it("refuses a question whose attribute is missing on the secret, and answerQuestion is then a no-op", () => {
    const characters = makeCharacters(); // none of these set birthYear
    let state = createGame({ categoryId: "test", mode: "classic", characters, forcedSecretId: "a" });
    const qBirthYear: Question = {
      id: "q-birth",
      text: "Born before 2000?",
      group: "age",
      attribute: "birthYear",
      operator: "lessThan",
      value: 2000,
    };
    expect(canAskQuestion(state, qBirthYear)).toBe(false);
    const before = state;
    state = answerQuestion(state, qBirthYear);
    expect(state).toBe(before); // rejected, not silently answered "no"
    expect(state.questionCount).toBe(0);
  });
});

describe("manual elimination", () => {
  it("moves a character to eliminated and back", () => {
    const characters = makeCharacters();
    let state = createGame({ categoryId: "test", mode: "classic", characters, forcedSecretId: "a" });
    state = eliminateCharacter(state, "b");
    expect(state.possibleCharacters.map((c) => c.id)).not.toContain("b");
    expect(state.eliminatedCharacters.map((c) => c.id)).toContain("b");

    state = restoreCharacter(state, "b");
    expect(state.possibleCharacters.map((c) => c.id)).toContain("b");
  });
});

describe("makeGuess", () => {
  it("marks the game as won on a correct guess", () => {
    const characters = makeCharacters();
    let state = createGame({ categoryId: "test", mode: "classic", characters, forcedSecretId: "a" });
    state = makeGuess(state, "a");
    expect(state.status).toBe("won");
    expect(state.endedAt).toBeDefined();
  });

  it("marks the game as lost on an incorrect guess", () => {
    const characters = makeCharacters();
    let state = createGame({ categoryId: "test", mode: "classic", characters, forcedSecretId: "a" });
    state = makeGuess(state, "b");
    expect(state.status).toBe("lost");
  });

  it("does nothing if the game is already over", () => {
    const characters = makeCharacters();
    let state = createGame({ categoryId: "test", mode: "classic", characters, forcedSecretId: "a" });
    state = makeGuess(state, "a");
    const afterFirstGuess = state;
    state = makeGuess(state, "b");
    expect(state).toBe(afterFirstGuess);
  });
});

describe("forceEndGame", () => {
  it("ends an in-progress game as a loss", () => {
    const characters = makeCharacters();
    let state = createGame({ categoryId: "test", mode: "speed", characters, forcedSecretId: "a" });
    state = forceEndGame(state);
    expect(state.status).toBe("lost");
  });
});

describe("calculateScore", () => {
  it("is zero for a lost game", () => {
    const characters = makeCharacters();
    let state = createGame({ categoryId: "test", mode: "classic", characters, forcedSecretId: "a" });
    state = makeGuess(state, "b");
    expect(calculateScore(state)).toBe(0);
  });

  it("is positive and bounded for a won game", () => {
    const characters = makeCharacters();
    let state = createGame({ categoryId: "test", mode: "classic", characters, forcedSecretId: "a" });
    state = makeGuess(state, "a");
    const score = calculateScore(state);
    expect(score).toBeGreaterThanOrEqual(50);
    expect(score).toBeLessThanOrEqual(1000);
  });

  it("rewards fewer questions with a higher score", () => {
    const characters = makeCharacters();

    let fastState = createGame({ categoryId: "test", mode: "classic", characters, forcedSecretId: "a" });
    fastState = makeGuess(fastState, "a");

    let slowState = createGame({ categoryId: "test", mode: "classic", characters, forcedSecretId: "a" });
    slowState = answerQuestion(slowState, qGender);
    slowState = answerQuestion(slowState, qIndian);
    slowState = makeGuess(slowState, "a");

    expect(calculateScore(fastState)).toBeGreaterThanOrEqual(calculateScore(slowState));
  });
});

describe("restartGame", () => {
  it("produces a fresh in-progress game state", () => {
    const characters = makeCharacters();
    const state = restartGame({ categoryId: "test", mode: "classic", characters });
    expect(state.status).toBe("in-progress");
    expect(state.questionCount).toBe(0);
    expect(state.askedQuestions).toHaveLength(0);
  });
});

describe("robustness", () => {
  it("handles an empty character dataset gracefully via a thrown, catchable error", () => {
    expect(() => createGame({ categoryId: "test", mode: "classic", characters: [] })).toThrow();
  });
});
