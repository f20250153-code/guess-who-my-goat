import type { Character } from "./character";

/**
 * Client-side mirror of the multiplayer server's wire contract
 * (multiplayer-server/src/types.ts's PlayerView / ClientAction / Effect /
 * ActionError). Deliberately duplicated rather than imported: the Next.js
 * app (Vercel) and the multiplayer server (Railway) are two separately
 * deployed projects with no shared package, so there's no build-time
 * dependency to share types through without introducing a monorepo. Keep
 * these in sync by hand if the server's wire shapes change — they're
 * intentionally kept small and stable.
 */

export type RoomState =
  | "WAITING_FOR_PLAYERS"
  | "READY"
  | "PLAYING"
  | "PLAYER_GUESS"
  | "GAME_OVER"
  | "REMATCH_PENDING"
  | "REMATCH"
  | "EXPIRED";

export interface PlayerQuestionRecord {
  questionId: string;
  questionText: string;
  answer: boolean;
  questionNumber: number;
  eliminatedCount: number;
}

/** The server never sends this whole object to any client as-is — this
 * type describes the tailored, per-player payload it builds from it. */
export interface PlayerView {
  roomId: string;
  gameId: string;
  categoryId: string;
  state: RoomState;
  stateVersion: number;

  board: Character[];
  yourPlayerId: string;
  yourSessionToken: string;
  yourSecretCharacterId: string;
  yourRemainingCandidateIds: string[];
  yourAskedQuestions: PlayerQuestionRecord[];
  yourQuestionCount: number;

  opponentPlayerId: string | null;
  opponentName: string | null;
  opponentConnected: boolean;
  opponentQuestionCount: number;

  currentTurnPlayerId: string | null;
  isYourTurn: boolean;
  turnStartedAt: number | null;
  turnTimeLimitMs: number;

  winnerId: string | null;
  youWon: boolean | null;
  winReason: "correct-guess" | "opponent-left" | "timeout-forfeit" | null;

  revealedSecrets: { yourSecretCharacterId: string; opponentSecretCharacterId: string } | null;

  yourReadyForRematch: boolean;
  opponentReadyForRematch: boolean;
}

export type ClientActionType = "ASK_QUESTION" | "FINAL_GUESS" | "REQUEST_REMATCH" | "CANCEL_REMATCH" | "LEAVE";

interface BaseClientAction {
  actionId: string;
  roomId: string;
  playerId: string;
  sessionToken: string;
}

export type ClientAction =
  | (BaseClientAction & { type: "ASK_QUESTION"; questionId: string })
  | (BaseClientAction & { type: "FINAL_GUESS"; characterId: string })
  | (BaseClientAction & { type: "REQUEST_REMATCH" })
  | (BaseClientAction & { type: "CANCEL_REMATCH" })
  | (BaseClientAction & { type: "LEAVE" });

export type Effect =
  | { type: "QUESTION_ANSWERED"; askerId: string; questionText: string; answer: boolean }
  | { type: "TURN_CHANGED"; nextPlayerId: string }
  | { type: "GAME_OVER"; winnerId: string; winReason: NonNullable<PlayerView["winReason"]> }
  | { type: "REMATCH_REQUESTED"; byPlayerId: string }
  | { type: "REMATCH_STARTED" };

export interface ActionError {
  code:
    | "INVALID_SESSION"
    | "INVALID_STATE"
    | "NOT_YOUR_TURN"
    | "UNKNOWN_QUESTION"
    | "QUESTION_ALREADY_ASKED"
    | "QUESTION_UNSUPPORTED"
    | "UNKNOWN_CHARACTER"
    | "ROOM_NOT_FOUND"
    | "ROOM_FULL"
    | "UNKNOWN_CATEGORY"
    | "INTERNAL_ERROR";
  message: string;
}

export interface CreateRoomAck {
  ok: true;
  roomId: string;
  playerId: string;
  sessionToken: string;
  view: PlayerView;
}
export interface JoinRoomAck {
  ok: true;
  roomId: string;
  playerId: string;
  sessionToken: string;
  view: PlayerView;
}
export interface ResumeAck {
  ok: true;
  view: PlayerView;
}
export interface ActionAck {
  ok: true;
  view: PlayerView;
}
export interface ErrorAck {
  ok: false;
  error: ActionError;
}

/** Credentials persisted (sessionStorage) so a page refresh — or a brief
 * network drop — can resume the same room instead of starting a new one. */
export interface StoredMultiplayerSession {
  roomId: string;
  playerId: string;
  sessionToken: string;
}
