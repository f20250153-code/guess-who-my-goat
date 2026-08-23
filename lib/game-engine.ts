import type { Character } from "@/types/character";
import type { GameMode, GameModeId, GameResult, GameState, GameStatus } from "@/types/game";
import type { AskedQuestion, Question } from "@/types/question";
import { evaluateQuestion, filterByAnswer } from "./question-engine";
import { pickRandom } from "./character-utils";

export const GAME_MODES: Record<GameModeId, GameMode> = {
  classic: {
    id: "classic",
    name: "Classic",
    description: "No limits. Ask as many questions as you need.",
  },
  speed: {
    id: "speed",
    name: "Speed",
    description: "Race the clock — 60 seconds to find your answer.",
    timeLimitSeconds: 60,
  },
  limited: {
    id: "limited",
    name: "Limited",
    description: "Sharpen your strategy — only 10 questions allowed.",
    maxQuestions: 10,
  },
  challenge: {
    id: "challenge",
    name: "Challenge",
    description: "For experts only — just 5 questions to crack it.",
    maxQuestions: 5,
  },
};

function generateGameId(): string {
  return `game_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export interface CreateGameParams {
  categoryId: string;
  mode: GameModeId;
  characters: Character[];
  /** Force a specific secret character — used by tests. */
  forcedSecretId?: string;
}

export function selectSecretCharacter(characters: Character[], forcedId?: string): Character {
  if (characters.length === 0) {
    throw new Error("Cannot start a game with zero characters.");
  }
  if (forcedId) {
    const found = characters.find((c) => c.id === forcedId);
    if (found) return found;
  }
  return pickRandom(characters);
}

export function createGame({ categoryId, mode, characters, forcedSecretId }: CreateGameParams): GameState {
  if (characters.length < 2) {
    throw new Error("A game needs at least 2 characters to be playable.");
  }
  const secretCharacter = selectSecretCharacter(characters, forcedSecretId);

  return {
    gameId: generateGameId(),
    categoryId,
    mode,
    allCharacters: characters,
    possibleCharacters: characters,
    eliminatedCharacters: [],
    secretCharacter,
    askedQuestions: [],
    questionCount: 0,
    status: "in-progress",
    startedAt: Date.now(),
  };
}

export function canAskQuestion(state: GameState, question: Question): boolean {
  if (state.status !== "in-progress") return false;
  const modeConfig = GAME_MODES[state.mode];
  if (modeConfig.maxQuestions !== undefined && state.questionCount >= modeConfig.maxQuestions) {
    return false;
  }
  const alreadyAsked = state.askedQuestions.some((aq) => aq.question.id === question.id);
  return !alreadyAsked;
}

/** Ask a question. The answer is derived from the secret character unless
 * explicitly overridden (used only by tests). Returns a brand-new
 * GameState — the input state and its arrays are never mutated. */
export function answerQuestion(state: GameState, question: Question, overrideAnswer?: boolean): GameState {
  if (!canAskQuestion(state, question)) return state;

  const answer = overrideAnswer ?? evaluateQuestion(question, state.secretCharacter);
  const stillPossible = filterByAnswer(question, state.possibleCharacters, answer);
  const newlyEliminatedIds = new Set(
    state.possibleCharacters.filter((c) => !stillPossible.includes(c)).map((c) => c.id),
  );
  const newlyEliminated = state.possibleCharacters.filter((c) => newlyEliminatedIds.has(c.id));

  const askedQuestion: AskedQuestion = {
    question,
    answer,
    questionNumber: state.questionCount + 1,
    eliminatedCount: newlyEliminated.length,
  };

  return {
    ...state,
    possibleCharacters: stillPossible,
    eliminatedCharacters: [...state.eliminatedCharacters, ...newlyEliminated],
    askedQuestions: [...state.askedQuestions, askedQuestion],
    questionCount: state.questionCount + 1,
  };
}

/** Records the answer to a freeform, AI-judged question in the question
 * log and increments the question count — but does NOT filter candidates.
 * Freeform questions are advisory only: the player reads the answer and
 * manually eliminates candidates themselves (via eliminateCharacter),
 * rather than the engine auto-eliminating based on a single LLM judgment
 * call against only the secret character. This keeps the deterministic
 * elimination guarantee intact for structured questions while still
 * letting freeform questions be useful. */
export function recordFreeformAnswer(state: GameState, questionText: string, answer: boolean): GameState {
  if (state.status !== "in-progress") return state;

  const freeformQuestion: Question = {
    id: `freeform-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    text: questionText,
    group: "freeform",
    attribute: "custom",
    operator: "equals",
    value: "",
  };

  const askedQuestion: AskedQuestion = {
    question: freeformQuestion,
    answer,
    questionNumber: state.questionCount + 1,
    eliminatedCount: 0,
  };

  return {
    ...state,
    askedQuestions: [...state.askedQuestions, askedQuestion],
    questionCount: state.questionCount + 1,
  };
}

/** Manually eliminate a candidate the player has ruled out themselves,
 * independent of any question. */
export function eliminateCharacter(state: GameState, characterId: string): GameState {
  const target = state.possibleCharacters.find((c) => c.id === characterId);
  if (!target) return state;
  return {
    ...state,
    possibleCharacters: state.possibleCharacters.filter((c) => c.id !== characterId),
    eliminatedCharacters: [...state.eliminatedCharacters, target],
  };
}

/** Undo a manual elimination (does not undo question-driven eliminations,
 * which are tracked by the question log instead). */
export function restoreCharacter(state: GameState, characterId: string): GameState {
  const target = state.eliminatedCharacters.find((c) => c.id === characterId);
  if (!target) return state;
  return {
    ...state,
    eliminatedCharacters: state.eliminatedCharacters.filter((c) => c.id !== characterId),
    possibleCharacters: [...state.possibleCharacters, target],
  };
}

export function makeGuess(state: GameState, characterId: string): GameState {
  if (state.status !== "in-progress") return state;
  const won = characterId === state.secretCharacter.id;
  const status: GameStatus = won ? "won" : "lost";
  return {
    ...state,
    status,
    guessedCharacterId: characterId,
    endedAt: Date.now(),
  };
}

/** Called when a time/question limit is hit without a guess. */
export function forceEndGame(state: GameState): GameState {
  if (state.status !== "in-progress") return state;
  return {
    ...state,
    status: "lost",
    endedAt: Date.now(),
  };
}

export function restartGame(params: CreateGameParams): GameState {
  return createGame(params);
}

const MODE_SCORE_MULTIPLIER: Record<GameModeId, number> = {
  classic: 1,
  speed: 1.3,
  limited: 1.2,
  challenge: 1.5,
};

/** Deterministic scoring: rewards a correct guess reached with fewer
 * questions and less time, weighted up for harder modes. Not shown to the
 * player as a formula — only the resulting number. */
export function calculateScore(state: GameState): number {
  if (state.status !== "won") return 0;

  const durationSeconds = state.endedAt ? (state.endedAt - state.startedAt) / 1000 : 0;
  const base = 1000;
  const questionPenalty = state.questionCount * 35;
  const timePenalty = Math.min(durationSeconds, 300) * 1.5;
  const raw = (base - questionPenalty - timePenalty) * MODE_SCORE_MULTIPLIER[state.mode];

  return Math.max(Math.round(raw), 50);
}

export function buildGameResult(state: GameState, categoryName: string): GameResult {
  const guessedCharacter = state.guessedCharacterId
    ? state.allCharacters.find((c) => c.id === state.guessedCharacterId)
    : undefined;

  return {
    won: state.status === "won",
    secretCharacter: state.secretCharacter,
    guessedCharacter,
    questionCount: state.questionCount,
    durationMs: state.endedAt ? state.endedAt - state.startedAt : 0,
    score: calculateScore(state),
    category: categoryName,
    mode: state.mode,
  };
}
