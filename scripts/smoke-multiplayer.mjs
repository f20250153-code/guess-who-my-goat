// One-off end-to-end smoke test: drives the real deployed-shape multiplayer
// server exactly as hooks/useMultiplayerGame.ts would, over a real
// socket.io-client connection, to catch any client/server wire-protocol
// mismatch that unit tests (which only exercise the server in-process)
// couldn't. Not part of the permanent test suite — run manually.
import { io } from "socket.io-client";
import { randomUUID } from "node:crypto";

const URL = "http://localhost:4890";

function connect() {
  return new Promise((resolve, reject) => {
    const s = io(URL, { transports: ["websocket"] });
    s.once("connect", () => resolve(s));
    s.once("connect_error", reject);
  });
}
function emitAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`ack timeout: ${event}`)), 8000);
    socket.emit(event, payload, (res) => {
      clearTimeout(t);
      resolve(res);
    });
  });
}
function waitFor(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}
function assert(cond, msg) {
  if (!cond) throw new Error("ASSERTION FAILED: " + msg);
  console.log("  ok:", msg);
}

async function main() {
  const alice = await connect();
  const bob = await connect();
  console.log("connected both sockets");

  const createAck = await emitAck(alice, "create_room", { categoryId: "footballers", name: "Alice" });
  assert(createAck.ok, "create_room ok");
  const roomId = createAck.roomId;

  // join_room's handler pushes a fresh room_update to BOTH players (not
  // just the ack to the joiner) — drain both before moving on, or a later
  // `once("room_update")` listener could catch this stale pre-question
  // event instead of the one it's actually waiting for.
  const aliceUpdate = waitFor(alice, "room_update");
  const bobPostJoinUpdate = waitFor(bob, "room_update");
  const joinAck = await emitAck(bob, "join_room", { roomId, name: "Bob" });
  assert(joinAck.ok, "join_room ok");
  const aliceView1 = await aliceUpdate;
  await bobPostJoinUpdate;
  assert(aliceView1.state === "PLAYING", "state is PLAYING after join");
  assert(aliceView1.board.length > 1, "board non-empty");
  assert(aliceView1.isYourTurn === true, "creator goes first");
  assert(!JSON.stringify(aliceView1).includes(joinAck.sessionToken), "no opponent session token leak");

  // Ask a universal static question.
  const q1AliceUpdate = waitFor(alice, "room_update");
  const q1BobUpdate = waitFor(bob, "room_update");
  const q1Ack = await emitAck(alice, "action", {
    type: "ASK_QUESTION",
    actionId: randomUUID(),
    roomId,
    playerId: createAck.playerId,
    sessionToken: createAck.sessionToken,
    questionId: "q-gender-male",
  });
  assert(q1Ack.ok, "ASK_QUESTION ok");
  const [aliceAfterQ1, bobAfterQ1] = await Promise.all([q1AliceUpdate, q1BobUpdate]);
  assert(aliceAfterQ1.isYourTurn === false, "turn passed to Bob");
  assert(bobAfterQ1.isYourTurn === true, "Bob's turn now");
  assert(aliceAfterQ1.yourAskedQuestions.length === 1, "alice has 1 asked question");

  // Bob asks a dynamically-generated question (birth-year median split),
  // exercising the exact code path a real client's generateNumericBoardQuestions
  // call would produce — verifying ID-generation determinism end to end.
  const years = bobAfterQ1.board.map((c) => c.attributes.birthYear).filter((y) => typeof y === "number");
  let dynAsked = false;
  if (years.length >= 6) {
    const sorted = [...years].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const before = years.filter((y) => y < median).length;
    if (before > 0 && before < years.length) {
      const dynId = `gen-birthyear-${median}`;
      const q2AliceUpdate = waitFor(alice, "room_update");
      const q2BobUpdate = waitFor(bob, "room_update");
      const q2Ack = await emitAck(bob, "action", {
        type: "ASK_QUESTION",
        actionId: randomUUID(),
        roomId,
        playerId: joinAck.playerId,
        sessionToken: joinAck.sessionToken,
        questionId: dynId,
      });
      assert(q2Ack.ok, `dynamic question "${dynId}" accepted by server (client-side ID generation matches server)`);
      await Promise.all([q2AliceUpdate, q2BobUpdate]);
      dynAsked = true;
    }
  }
  if (!dynAsked) console.log("  (skipped dynamic-question check — this board's birth years were degenerate)");

  // Alice makes the correct final guess. She doesn't know Bob's secret
  // client-side (by design), so peek it via bob's own view for the test.
  const secretId = bobAfterQ1.yourSecretCharacterId;
  const overAlice = waitFor(alice, "room_update");
  const overBob = waitFor(bob, "room_update");
  const guessAck = await emitAck(alice, "action", {
    type: "FINAL_GUESS",
    actionId: randomUUID(),
    roomId,
    playerId: createAck.playerId,
    sessionToken: createAck.sessionToken,
    characterId: secretId,
  });
  assert(guessAck.ok, "FINAL_GUESS ok");
  assert(guessAck.view.state === "GAME_OVER", "state GAME_OVER in ack");
  const [aliceOver, bobOver] = await Promise.all([overAlice, overBob]);
  assert(aliceOver.youWon === true, "Alice won");
  assert(bobOver.youWon === false, "Bob lost");
  assert(aliceOver.revealedSecrets.opponentSecretCharacterId === secretId, "secret revealed post-game-over");

  // Rematch flow.
  const rematchAliceUpdate = waitFor(alice, "room_update");
  await emitAck(alice, "action", {
    type: "REQUEST_REMATCH",
    actionId: randomUUID(),
    roomId,
    playerId: createAck.playerId,
    sessionToken: createAck.sessionToken,
  });
  const afterAliceRematchReq = await rematchAliceUpdate;
  assert(afterAliceRematchReq.state === "REMATCH_PENDING", "REMATCH_PENDING after one side requests");

  const bothReadyAlice = waitFor(alice, "room_update");
  const bothReadyBob = waitFor(bob, "room_update");
  await emitAck(bob, "action", {
    type: "REQUEST_REMATCH",
    actionId: randomUUID(),
    roomId,
    playerId: joinAck.playerId,
    sessionToken: joinAck.sessionToken,
  });
  const [aliceRematched, bobRematched] = await Promise.all([bothReadyAlice, bothReadyBob]);
  assert(aliceRematched.state === "PLAYING", "back to PLAYING after both accept rematch");
  assert(aliceRematched.gameId !== aliceOver.gameId, "rematch produced a fresh gameId");
  assert(aliceRematched.isYourTurn === false, "rematch rotates who opens (Bob was loser-turned-opener... actually creator reversed)");
  assert(bobRematched.isYourTurn === true, "opener rotated to Bob");

  alice.disconnect();
  bob.disconnect();
  console.log("\nALL SMOKE CHECKS PASSED");
}

main().catch((e) => {
  console.error("SMOKE TEST FAILED:", e);
  process.exit(1);
});
