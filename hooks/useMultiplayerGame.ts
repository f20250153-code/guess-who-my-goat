"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type {
  ActionAck,
  ActionError,
  ClientAction,
  CreateRoomAck,
  Effect,
  ErrorAck,
  JoinRoomAck,
  PlayerView,
  ResumeAck,
  StoredMultiplayerSession,
} from "@/types/multiplayer";
import { createMultiplayerSocket, emitWithAck, isMultiplayerConfigured } from "@/lib/multiplayer/socket-client";

const STORAGE_KEY = "guess-who:multiplayer-session";

/** TypeScript's built-in `Omit<T, K>` isn't distributive over a
 * discriminated union — applied to `ClientAction` it collapses the union
 * down to only the fields every variant shares, losing e.g.
 * `questionId`/`characterId`. This local type is the action-specific part
 * of each variant instead, kept distributive by construction. */
type ActionInput =
  | { type: "ASK_QUESTION"; questionId: string }
  | { type: "FINAL_GUESS"; characterId: string }
  | { type: "REQUEST_REMATCH" }
  | { type: "CANCEL_REMATCH" }
  | { type: "LEAVE" };

function readStoredSession(): StoredMultiplayerSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.roomId === "string" && typeof parsed.playerId === "string" && typeof parsed.sessionToken === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null; // private browsing / storage disabled — resume just isn't available
  }
}

function writeStoredSession(session: StoredMultiplayerSession): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Non-fatal — the game still works, it just won't survive a refresh.
  }
}

function clearStoredSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

export interface UseMultiplayerGameResult {
  configured: boolean;
  connectionStatus: ConnectionStatus;
  /** True while attempting to silently resume a session found in
   * sessionStorage (e.g. right after a page refresh) — the caller should
   * show a lightweight "Reconnecting…" state rather than the lobby. */
  resuming: boolean;
  view: PlayerView | null;
  lastError: ActionError | null;
  lastEffect: Effect | null;
  roomExpired: boolean;
  createRoom: (categoryId: string, name: string) => Promise<{ ok: true; roomId: string } | { ok: false; message: string }>;
  joinRoom: (roomId: string, name: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  askQuestion: (questionId: string) => void;
  finalGuess: (characterId: string) => void;
  requestRematch: () => void;
  cancelRematch: () => void;
  /** Tells the server you're leaving (forfeiting if a game is in
   * progress), then clears all local session state. */
  leaveRoom: () => void;
  /** Clears local state without notifying the server — for recovering
   * from an expired/invalid room without a real LEAVE to send. */
  resetLocal: () => void;
  dismissError: () => void;
}

export function useMultiplayerGame(): UseMultiplayerGameResult {
  const configured = isMultiplayerConfigured();
  const socketRef = useRef<Socket | null>(null);
  const credentialsRef = useRef<StoredMultiplayerSession | null>(null);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [resuming, setResuming] = useState(false);
  const [view, setView] = useState<PlayerView | null>(null);
  const [lastError, setLastError] = useState<ActionError | null>(null);
  const [lastEffect, setLastEffect] = useState<Effect | null>(null);
  const [roomExpired, setRoomExpired] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const socket = createMultiplayerSocket();
    socketRef.current = socket;

    async function handleConnect() {
      setConnectionStatus("connected");
      const creds = credentialsRef.current;
      if (!creds) {
        setResuming(false);
        return;
      }
      try {
        const ack = await emitWithAck<ResumeAck | ErrorAck>(socket, "resume", creds);
        if (ack.ok) {
          setView(ack.view);
          setLastError(null);
        } else {
          clearStoredSession();
          credentialsRef.current = null;
          setView(null);
          setLastError(ack.error);
        }
      } catch {
        // Ack timed out — leave credentials in place, a later reconnect
        // (socket.io retries automatically) will try resume again.
      } finally {
        setResuming(false);
      }
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", () => setConnectionStatus("disconnected"));
    socket.on("connect_error", () => setConnectionStatus("error"));
    socket.on("room_update", (v: PlayerView) => setView(v));
    socket.on("effect", (e: Effect) => setLastEffect(e));
    socket.on("action_error", (e: ActionError) => setLastError(e));
    socket.on("room_expired", () => {
      clearStoredSession();
      credentialsRef.current = null;
      setView(null);
      setRoomExpired(true);
    });

    const stored = readStoredSession();
    if (stored) {
      credentialsRef.current = stored;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResuming(true);
      setConnectionStatus("connecting");
      socket.connect();
    }

    return () => {
      socket.off();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [configured]);

  const ensureConnected = useCallback((): Promise<void> => {
    const socket = socketRef.current;
    if (!socket) return Promise.reject(new Error("Multiplayer isn't configured on this deployment."));
    if (socket.connected) return Promise.resolve();
    setConnectionStatus("connecting");
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Could not reach the multiplayer server.")), 10_000);
      socket.once("connect", () => {
        clearTimeout(timer);
        resolve();
      });
      socket.once("connect_error", (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });
      socket.connect();
    });
  }, []);

  const createRoom = useCallback(
    async (categoryId: string, name: string) => {
      try {
        await ensureConnected();
        const ack = await emitWithAck<CreateRoomAck | ErrorAck>(socketRef.current!, "create_room", { categoryId, name });
        if (!ack.ok) return { ok: false as const, message: ack.error.message };
        const session: StoredMultiplayerSession = { roomId: ack.roomId, playerId: ack.playerId, sessionToken: ack.sessionToken };
        credentialsRef.current = session;
        writeStoredSession(session);
        setRoomExpired(false);
        setView(ack.view);
        setLastError(null);
        return { ok: true as const, roomId: ack.roomId };
      } catch (e) {
        return { ok: false as const, message: (e as Error).message };
      }
    },
    [ensureConnected],
  );

  const joinRoom = useCallback(
    async (roomId: string, name: string) => {
      try {
        await ensureConnected();
        const ack = await emitWithAck<JoinRoomAck | ErrorAck>(socketRef.current!, "join_room", { roomId, name });
        if (!ack.ok) return { ok: false as const, message: ack.error.message };
        const session: StoredMultiplayerSession = { roomId: ack.roomId, playerId: ack.playerId, sessionToken: ack.sessionToken };
        credentialsRef.current = session;
        writeStoredSession(session);
        setRoomExpired(false);
        setView(ack.view);
        setLastError(null);
        return { ok: true as const };
      } catch (e) {
        return { ok: false as const, message: (e as Error).message };
      }
    },
    [ensureConnected],
  );

  const sendAction = useCallback(async (partial: ActionInput) => {
    const creds = credentialsRef.current;
    const socket = socketRef.current;
    if (!creds || !socket) return;
    const action = {
      actionId: crypto.randomUUID(),
      roomId: creds.roomId,
      playerId: creds.playerId,
      sessionToken: creds.sessionToken,
      ...partial,
    } as ClientAction;
    try {
      const ack = await emitWithAck<ActionAck | ErrorAck>(socket, "action", action);
      if (!ack.ok) {
        setLastError(ack.error);
      } else {
        setLastError(null);
        setView(ack.view);
      }
    } catch (e) {
      setLastError({ code: "INTERNAL_ERROR", message: (e as Error).message });
    }
  }, []);

  const askQuestion = useCallback((questionId: string) => void sendAction({ type: "ASK_QUESTION", questionId }), [sendAction]);
  const finalGuess = useCallback((characterId: string) => void sendAction({ type: "FINAL_GUESS", characterId }), [sendAction]);
  const requestRematch = useCallback(() => void sendAction({ type: "REQUEST_REMATCH" }), [sendAction]);
  const cancelRematch = useCallback(() => void sendAction({ type: "CANCEL_REMATCH" }), [sendAction]);

  const resetLocal = useCallback(() => {
    clearStoredSession();
    credentialsRef.current = null;
    setView(null);
    setLastError(null);
    setRoomExpired(false);
  }, []);

  const leaveRoom = useCallback(() => {
    void sendAction({ type: "LEAVE" }).finally(() => {
      socketRef.current?.disconnect();
      resetLocal();
    });
  }, [sendAction, resetLocal]);

  const dismissError = useCallback(() => setLastError(null), []);

  return {
    configured,
    connectionStatus,
    resuming,
    view,
    lastError,
    lastEffect,
    roomExpired,
    createRoom,
    joinRoom,
    askQuestion,
    finalGuess,
    requestRematch,
    cancelRematch,
    leaveRoom,
    resetLocal,
    dismissError,
  };
}
