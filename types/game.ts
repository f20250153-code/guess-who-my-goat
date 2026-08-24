import type { Character } from "./character";
import type { AskedQuestion } from "./question";

export type GameModeId = "classic" | "speed" | "limited" | "challenge";

export type GameDifficulty = "easy" | "medium" | "hard" | "expert";

export interface GameMode {
  id: GameModeId;
  name: string;
  description: string;
  /** Undefined = unlimited. */
  maxQuestions?: number;
  /** Undefined = no clock. */
  timeLimitSeconds?: number;
}

export type GameStatus = "idle" | "in-progress" | "won" | "lost";

export interface GameState {
  gameId: string;
  categoryId: string;
  mode: GameModeId;
  difficulty: GameDifficulty;
  /** Seed used to generate this game's 30-character board. Persisted so
   * a game can in principle be reproduced/debugged/shared — the
   * foundation for future daily challenges. */
  seed: string;

  allCharacters: Character[];
  possibleCharacters: Character[];
  eliminatedCharacters: Character[];
  secretCharacter: Character;

  askedQuestions: AskedQuestion[];
  questionCount: number;

  status: GameStatus;
  guessedCharacterId?: string;

  startedAt: number;
  endedAt?: number;

  /** Reserved for future multiplayer sync; unused in local V1. */
  players?: string[];
  currentPlayer?: string;
}

export interface GameResult {
  won: boolean;
  secretCharacter: Character;
  guessedCharacter?: Character;
  questionCount: number;
  durationMs: number;
  score: number;
  category: string;
  mode: GameModeId;
  difficulty: GameDifficulty;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  emoji: string;
  theme: "violet" | "cyan" | "amber" | "rose" | "emerald" | "sky";
  characters: Character[];
  /** How many characters a generated board should contain. Categories
   * with fewer than this in their master pool fall back to using the
   * full pool (see lib/board-generator.ts) rather than failing. */
  targetBoardSize?: number;
}
