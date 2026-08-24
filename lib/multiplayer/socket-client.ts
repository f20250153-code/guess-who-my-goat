import { io, type Socket } from "socket.io-client";

/** Where the dedicated multiplayer server (Socket.IO + Express, deployed
 * separately on Railway — see multiplayer-server/README.md) lives. Unset
 * in local dev unless configured; the multiplayer UI degrades to a clear
 * "not configured" message rather than trying to connect to nothing. */
export const MULTIPLAYER_SERVER_URL = process.env.NEXT_PUBLIC_MULTIPLAYER_SERVER_URL ?? "";

export function isMultiplayerConfigured(): boolean {
  return MULTIPLAYER_SERVER_URL.length > 0;
}

/** Creates (but does not auto-connect) a fresh socket for one multiplayer
 * session. Call `.connect()` once a consumer is ready to use it, and
 * `.disconnect()` when leaving — never shared across unrelated rooms, so
 * a leftover listener from a previous game can't leak into a new one. */
export function createMultiplayerSocket(): Socket {
  return io(MULTIPLAYER_SERVER_URL, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });
}

/** Promisified emit-with-ack — every mutating socket event in this app's
 * protocol (create_room, join_room, resume, action) uses the standard
 * Socket.IO ack callback rather than a separate response event, so this
 * one helper covers all of them. Rejects on a timeout so a dropped
 * connection can't leave a caller awaiting forever. */
export function emitWithAck<TAck>(socket: Socket, event: string, payload: unknown, timeoutMs = 10_000): Promise<TAck> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for a response to "${event}".`)), timeoutMs);
    socket.emit(event, payload, (res: TAck) => {
      clearTimeout(timer);
      resolve(res);
    });
  });
}
