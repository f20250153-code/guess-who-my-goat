# Guess Who — Production Master Upgrade: Final Report

This report covers everything delivered against the original 67-phase specification, in two parts: Part A (4,624-character database integration into the existing single-player app) and Part B (a new server-authoritative 1v1 multiplayer system). Both are fully implemented, tested, and running — not architecture sketches or a separate demo.

## 1. Existing architecture discovered

Before writing any code, the existing Next.js 16 / React 19 / TypeScript app was read in full: `types/` (character, question, game, pack), `data/categories.ts` and its 12 per-category data files (then ~544 characters total), `lib/board-generator.ts` (already using a seeded PRNG + Fisher-Yates + weighted sampling — no manual board selection, no `Math.random()` shuffle antipattern), `lib/question-engine.ts` and `lib/question-generator.ts` (static + dynamic questions, quality ranking), `lib/game-engine.ts` (turn-free single-player game state), `app/play/PlayClient.tsx` and the full `components/game/` and `components/home/` UI, `lib/pack-utils.ts` (custom packs), `lib/board-history.ts` (recency tracking), and the existing test suite. This confirmed the app already satisfied several spec requirements (no manual 30-character selection, no fixed boards, seeded randomness) — so Part A's job was extending correctly-designed foundations, not replacing them, and Part B's job was adding a genuinely new capability without touching any of this.

## 2. Files changed

**Part A — 30 files, all in `guess-who/`:** `data/source/characters.xlsx` (new, the regeneration source of truth), `scripts/generate-data.ts` (new, ~280 lines — the xlsx→TS build-time generator), `package.json` (added `xlsx` + `generate:data` script), `types/character.ts` (extended `origin` union), `types/game.ts` (added `derived` category flag), `data/categories.ts` (added the Movie Stars derived category), `data/questions.ts` (expanded 59→75 static definitions), `lib/question-engine.ts` (tri-state evaluation), `lib/game-engine.ts` and `components/game/QuestionPanel.tsx` (wired to tri-state), `lib/question-generator.ts` (new numeric-question generator, universal profession template), `scripts/validate-data.ts` (derived-category-aware validation), `README.md`, and 6 test files (4 extended, 2 new).

**Part B — 59 files:** 14 in `guess-who/` (the client integration: `types/multiplayer.ts`, `lib/multiplayer/socket-client.ts`, `hooks/useMultiplayerGame.ts`, `components/multiplayer/{MultiplayerHeader,MultiplayerResult}.tsx`, `app/play/multiplayer/{page,MultiplayerClient}.tsx`, edits to `Navbar.tsx` and `Hero.tsx` for the new entry point, `.env.example`, `README.md`, `package.json`/`package-lock.json` for the new `socket.io-client` dependency, and `scripts/smoke-multiplayer.mjs`), plus 45 in a new sibling project, `multiplayer-server/` (the entire server-authoritative backend — see §11 onward).

Nothing existing was deleted. No category, game mode, or custom pack was removed or redesigned; the multiplayer UI reuses the existing `CharacterGrid`, `QuestionPanel`, `GuessModal`, `Button`, and `Modal` components exactly as single-player does — the two new components (`MultiplayerHeader`, `MultiplayerResult`) exist only because turn/opponent/rematch state has no single-player equivalent to reuse, and they're styled to match the existing header/result screens exactly (same Stat/Divider pattern, same rounded-card language).

## 3. Database integration

The supplied `guesswho4624characters.xlsx` (3 sheets: Characters, Attribute Reference, Distribution) is checked into the repo at `data/source/characters.xlsx` as the single source of truth, and `scripts/generate-data.ts` (run via `npm run generate:data`) parses it once at build/dev time with the `xlsx` package and writes plain `data/*.ts` files — **never parsed in the browser**, satisfying that constraint directly. Every character is mapped through one function, `buildCharacter()`, which is documented field-by-field for exactly what's derived (gender, nationality parsed from `"; "`-separated strings, birth year, popularity, sport/team/league/position for athletes, `actor`/`actress`/`singer`/`director`/`entrepreneur`/`streamer`/`athlete` booleans inferred from the Profession text, `indian`/`american`/`british`/`european` inferred from Nationality, `origin` and `heroOrVillain` for fictional characters) versus what's intentionally left `undefined` — the spreadsheet's 31 achievement/role columns (World Cup Winner, Oscar Winner, Grammy Winner, Captain, Batsman, etc.) are **100% empty for all 4,624 rows** in the source file, so nothing was invented to fill them. **No fact was fabricated anywhere in this pipeline.**

## 4. Character counts

| Category | Characters |
|---|---|
| Footballers | 485 |
| Cricketers | 508 |
| Actors | 368 |
| Actresses | 394 |
| Singers | 416 |
| Famous Personalities | 327 |
| F1 Drivers | 316 |
| Basketball | 359 |
| Gamers | 323 |
| Tech & Business | 298 |
| Fictional | 490 |
| Indian Celebrities | 340 |
| **Total (real, non-derived)** | **4,624** |
| Movie Stars (derived: Actors + Actresses) | 762 |

The Movie Stars category is a genuine addition — an alternate lens combining two existing pools — implemented via a new `derived: true` flag on `Category` rather than by duplicating character records, so it can't silently inflate the true character count or trip the data-uniqueness validator (`scripts/validate-data.ts` was updated to skip cross-category id-uniqueness/categoryId-match checks specifically for derived categories, while still validating everything else about them).

## 5. Random board implementation

Every game — single-player and multiplayer — pulls a fresh, automatically generated 30-character board from `lib/board-generator.ts`'s `generateGameBoard()`. There is no manual character-selection UI anywhere in the game flow, and no fixed board ever ships. A category with fewer than 30 characters (none currently) falls back to using its full pool rather than failing.

## 6. Randomness method

Two distinct RNGs are used deliberately, for two different trust levels:

- **Client-side, single-player** (`lib/rng.ts`): a seeded `mulberry32` PRNG driving Fisher–Yates shuffling and weighted-sampling-without-replacement. Seeded so a board is reproducible/debuggable, and explicitly *not* `array.sort(() => Math.random() - 0.5)` (a well-known biased-shuffle antipattern the spec called out).
- **Server-side, multiplayer** (`multiplayer-server/src/game-logic.ts` and `src/id.ts`): Node's `node:crypto` (`randomBytes`, `randomInt`, `randomUUID`) for anything adversarial between two players — the board seed, and especially *which* board member becomes each player's secret. `Math.random()`/seeded PRNGs are fine for solo board variety; they are not appropriate for choosing information one player must not be able to predict about another, so the server never uses them for that.

## 7. Repeat protection

`lib/board-history.ts` records which character ids appeared in a player's last several single-player games (via `localStorage`) and `generateGameBoard(..., avoidRecent: true)` down-weights recently-seen characters during sampling — a player doesn't keep seeing the same 30 faces every game. Multiplayer intentionally passes `avoidRecent: false` (per-browser recency history isn't a meaningful concept for a shared two-player room), documented explicitly in `shared/lib/board-history.ts`'s stub.

## 8. Board balancing

Board generation reports a `diversityScore` and `usedFullPool` flag; `generateServerBoard()` (multiplayer) retries board generation up to 5 times (bounded — never an infinite loop) if a generated board comes back degenerate (too small to play, or suspiciously flat diversity), falling back gracefully to the last attempt if all retries are exhausted rather than failing the room outright.

## 9. Question engine

The core correctness fix in Part A: question evaluation was upgraded from binary (yes/no, with missing data silently treated as "no") to **tri-state** (yes / no / *unsupported*). New functions `isQuestionSupported()`/`isAttributeSupported()`/`filterQuestionsSupportedBy()` were added in `lib/question-engine.ts`; `getQuestionSplit()` and `filterByAnswer()` were rewritten to route through them; `canAskQuestion()` in `lib/game-engine.ts` gained a final "does the secret actually have data for this?" guard. Critically, the existing public `evaluateQuestion()` function and its behavior were left **unchanged** (existing tests explicitly asserted its old boolean semantics), so this was an additive, backward-compatible fix, not a breaking rewrite. The multiplayer server enforces the same rule server-side: `evaluateForSecret()` returns `null` (never a silent "no") when the opponent's secret has no data for a question, and the action is rejected outright (`QUESTION_UNSUPPORTED`) rather than answered incorrectly.

## 10. Question definitions per category

The static bank grew from 59 to **75** hand-written definitions across 7 groups (identity: 6, career: 36, status: 2, sport: 13, achievements: 6, age: 5, origin: 7), plus per-board dynamically generated ones (§11). Many new definitions (composer, poet, royal, emperor, educator, investor, executive, esports, manager, activist, artist, economist, boxer, military leader, inventor, religious leader) exist even though their backing spreadsheet columns are currently empty — they're kept rather than deleted because the tri-state engine (§9) means an unsupported question is simply never offered to a player, never silently wrong; the day that data is added and the data file regenerated, these start working automatically with no code change.

## 11. Dynamic question generation

`lib/question-generator.ts`'s `generateBoardQuestions()` builds category- and attribute-driven questions from the *actual 30 characters on this specific board* (nationality, team, league, position, sport, profession, and more), capping how many distinct-value questions one attribute contributes so a high-cardinality field can't flood the list, and preferring the most evenly-splitting values. A new function, `generateNumericBoardQuestions()`, adds a single median-split birth-year question ("Were they born before {median}?") whenever the board has enough numeric data points to make it non-degenerate. Both functions are pure functions of `(categoryId, board)` — critically, this determinism is what lets the multiplayer client and server independently compute *the exact same dynamic question ids* from the same shared public board, without the server ever having to ship its question pool to the client or vice versa. This was verified end-to-end (§24), not just asserted.

## 12. Information gain

`getQuestionQuality()` (`lib/question-engine.ts`) now scores every candidate question using real binary Shannon entropy (`binaryEntropy(yes, no)`, normalized 0–1) over the current candidate pool, replacing the old `1 - |yes - no| / total` heuristic — an information-theoretically grounded "how much does this question actually narrow things down" score, factoring in unsupported candidates separately so they don't skew the split.

## 13. Smart recommendations, diversity, history, difficulty

`rankQuestionsByQuality()` surfaces the top-N questions by entropy in the "Recommended" section of `QuestionPanel`, using each game's live candidate pool (single-player: `gameState.possibleCharacters`; multiplayer: the player's own server-narrowed `yourRemainingCandidateIds`) — so recommendations sharpen as the game progresses, in both modes, without either client ever needing the opponent's or the true secret's identity to compute them. Difficulty tiers (`easy`/`medium`/`hard`/`expert`) and board history (§7) are unchanged, pre-existing features, confirmed still working after all Part A changes (full regression suite, §24).

## 14. Multiplayer architecture

A dedicated Node/Express/Socket.IO service, `multiplayer-server/`, deployed as a separate long-running process from the Next.js app — the explicit, spec-driven reason being that Vercel's serverless functions can't hold a WebSocket connection open. It reuses the *exact same* pure game-logic files as the client (`shared/` is a maintained-in-sync copy of `board-generator.ts`, `question-engine.ts`, `question-generator.ts`, and all category/question data — diffed identical against the client's copies at the end of this work), so board generation and question logic behave identically on both sides without semantic drift.

## 15. State machine

An explicit, validated finite state machine (`src/state-machine.ts`):

```
WAITING_FOR_PLAYERS --PLAYER_JOINED--> READY --GAME_READY--> PLAYING
PLAYING --SUBMIT_GUESS--> PLAYER_GUESS --GUESS_CORRECT--> GAME_OVER
PLAYER_GUESS --GUESS_INCORRECT--> PLAYING
GAME_OVER --REQUEST_REMATCH--> REMATCH_PENDING --BOTH_REMATCH_READY--> REMATCH --REMATCH_GAME_READY--> PLAYING
REMATCH_PENDING --CANCEL_REMATCH--> GAME_OVER
(any non-EXPIRED state) --PLAYER_LEFT / EXPIRE--> GAME_OVER or EXPIRED
```

`isActionAllowedInState()` gates every client action against the room's current state before any game logic runs (e.g. `ASK_QUESTION` mid-`GAME_OVER` is rejected outright). `EXPIRED` is verified terminal — nothing transitions out of it. A wrong final guess costs the guesser their turn but does **not** end a multiplayer match — a deliberate, documented divergence from single-player's "any guess ends the game," since a real head-to-head match should continue until someone's actually right; single-player's own guess behavior was left completely untouched.

## 16. Idempotency

Every client action carries a client-generated `actionId`. `processAction()` checks a per-room `Map<actionId, cachedResult>` before doing anything else — a retried/duplicated action (dropped ack, client retry, network hiccup) replays the cached result instead of being applied twice (verified: asking the same question twice via the same actionId narrows candidates only once). The cache is swept on a 15-minute TTL so a long-lived room's memory doesn't grow unbounded.

## 17. Race-condition handling

`withRoomLock()` is a small promise-chaining mutex, one per room. Every action handler runs inside it, so two near-simultaneous actions on the same room are applied strictly one at a time, in receipt order — verified with a real interleaved-async test proving max concurrency of 1 within a room, while two different rooms' locks never block each other, and a thrown error inside the lock doesn't poison it for later callers.

## 18. Timer implementation

`scheduleTurnTimer()` (`src/server.ts`) is a genuine server-side `setTimeout` per room (45s), independent of any client clock. A stalled client, a closed tab, or a clock-tampering client cannot stall the match — on expiry the server advances the turn itself, exactly as if the player had passed, and reschedules the next timer. The client only ever *displays* a countdown (`MultiplayerHeader`'s `useTurnCountdown`), computed from the server's own `turnStartedAt`/`turnTimeLimitMs` — it never drives game logic.

## 19. Reconnection

Each player gets a server-issued `sessionToken`, deliberately independent of the Socket.IO connection id (which changes every reconnect). On disconnect, the server starts a 45-second grace period rather than ending the match immediately; a `resume` event with the correct `roomId`/`playerId`/`sessionToken` re-attaches a new socket to the same player and pushes them a fresh view. If the grace period elapses with no reconnection, the disconnected player is auto-forfeited via a synthesized server-side `LEAVE` action. On the client, `hooks/useMultiplayerGame.ts` persists `{roomId, playerId, sessionToken}` to `sessionStorage` and automatically attempts `resume` on reconnect/page-refresh — verified via the real Socket.IO integration test suite, not just unit-level.

## 20. Room lifecycle

A room still `WAITING_FOR_PLAYERS` after 10 minutes, or any room idle past 30 minutes, is swept and deleted on a 60-second sweep interval — verified against both boundary conditions (a room *not* swept before its TTL, and a room *swept* once past it, including one mid-game).

## 21. Secret security

`buildPlayerView()` (`src/player-view.ts`) is the **single choke point** every outgoing payload passes through — nothing about a `Room` object is ever spread wholesale into a broadcast. An opponent's secret character is included only after the game has actually ended (`revealedSecrets`, gated on `GAME_OVER`/`REMATCH_PENDING`/`REMATCH`); before that, nothing in a payload identifies which board member is the opponent's — verified over a **real Socket.IO wire connection** (not just in-process), including that a stolen/wrong session token is rejected. A genuine gap was caught and fixed during this work: `findQuestion()` originally let a client name *any* question id from the entire static bank regardless of the room's actual category (e.g. asking a cricket-only question while playing football); it now validates the question's `categoryIds` against the room's category and rejects anything out of scope.

## 22. Rematch

Either player can request a rematch once a game ends; the room moves to `REMATCH_PENDING`. Once both have requested it, a genuinely new game is generated — fresh board, fresh seed, fresh secrets, new `gameId`, and `playerOrder` reversed so the same player doesn't always open — not a cosmetic reset, verified by asserting the new `gameId` differs and the opener rotates. Either side can cancel before both agree, returning cleanly to `GAME_OVER`.

## 23. Performance optimizations

The question pool for a room's board (static + dynamic) is built once per game/rematch and reused, never recomputed from the full 4,624-character dataset per question. A deliberate, data-driven decision was made *not* to build a lazy per-category data-loading split (Phase 54's suggestion): the entire combined character dataset gzips to roughly 136KB, and images are already lazy-loaded with an initials-avatar fallback — the actual "don't load thousands of images" concern the spec raised was already satisfied by the existing architecture, so an additional code-splitting refactor would have added complexity without a measurable benefit.

## 24. Tests

**guess-who** (single-player + client multiplayer integration): 64 Vitest tests across 6 files, all passing — engine, board generator, question generator/engine (including the new tri-state coverage), game engine, and question-data integrity. `npx tsc --noEmit` and `npx eslint .` both clean; `npm run build` succeeds (routes include the new `/play/multiplayer`).

**multiplayer-server**: 63 Vitest tests across 5 files, all passing — state-machine transition coverage (happy paths, rejections, `EXPIRED` terminality), game-logic (board generation validity/randomness/unknown-category, secret distinctness, question pool building, unsupported-question handling), room-store (creation/join validation, multi-room isolation, expiration sweeps, and genuine concurrent-async mutex testing), actions (the full `processAction` surface — turn/session validation, category-scoped question rejection, duplicate-question rejection, idempotent replay, correct/incorrect guesses, rematch agreement/cancellation, forfeit-on-leave, cross-room and cross-session isolation), and a **real Socket.IO client-server integration suite** — actual sockets, actual wire messages, not in-process function calls — covering room creation/join, secret non-leakage, question asking with turn advancement, invalid-session rejection, wrong-room rejection, and out-of-turn rejection, all over real network connections. `npx tsc --noEmit` clean. Beyond the automated suite, a manual end-to-end script (`scripts/smoke-multiplayer.mjs`, both projects) was run against the **actual compiled production build** (`npm run build && npm start`, plain `node`, no `tsx`) exercising the full create → join → ask a static question → ask a dynamically-generated question → guess → rematch flow — this is what caught a real production-blocking bug (§26).

## 25. Build result

Both projects build cleanly. `guess-who`: `next build` succeeds, all 9 routes generated (`/`, `/_not-found`, `/api/ask`, `/categories`, `/create`, `/how-to-play`, `/play`, `/play/multiplayer`, `/stats`). `multiplayer-server`: `tsc` + `tsc-alias` produce a `dist/` that runs standalone under plain `node dist/src/server.js` — verified live (`/health` and `/categories` responding, and the full smoke test passing against it).

## 26. Deployment requirements

**guess-who (Vercel)**: no required environment variables. `ANTHROPIC_API_KEY` remains optional (freeform AI questions). One new optional variable, `NEXT_PUBLIC_MULTIPLAYER_SERVER_URL`, enables the multiplayer UI; unset, `/play/multiplayer` renders a clear "not configured" message rather than breaking anything.

**multiplayer-server (Railway, per your earlier choice)**: `railway.json` is included, pinning the Nixpacks build (`npm run build`) and start (`npm start`) commands and a `/health` healthcheck. You opted to run the deploy yourself; the exact commands (`railway login`, `railway init`, `railway up`, `railway domain`, `railway variables set CLIENT_ORIGIN=...`) are in `multiplayer-server/README.md`'s Deployment section, along with a GitHub-based alternative if you'd rather Railway auto-redeploy on push. One real bug was caught and fixed before handing this off (§27) — without the fix, `npm start` would have failed immediately on Railway.

Both projects and all 59 new/changed files (14 in `guess-who`, 45 in the new `multiplayer-server`) have been written to your connected folder — `multiplayer-server` sits alongside `guess-who`, not nested inside it, since it deploys independently.

## 27. Remaining limitations

- **Single-process, in-memory rooms.** Multiplayer rooms live in the server process's memory — fine for one instance, but they won't survive a restart/redeploy, and horizontal scaling across multiple instances would need a shared store (e.g. Redis + Socket.IO's Redis adapter). Not needed at the current scale; documented in `multiplayer-server/README.md` for whoever revisits it.
- **No spectators, no >2-player rooms, no matchmaking queue** — by design, matching the existing app's no-accounts, share-a-code spirit.
- **No persistent match history** — a room's data is gone once swept; nothing is written to a database.
- **A production-blocking build bug was caught and fixed during this work, not before it**: the compiled server initially landed at `dist/src/server.js` (not `dist/server.js`, which `package.json` assumed) and couldn't resolve its own `@/*` imports under plain `node` at all — `tsx`-based dev testing alone would never have caught this, since `tsx` resolves path aliases itself. It was only caught by explicitly building and running the *actual* production artifact end-to-end. Fixed via `tsc-alias` and corrected `main`/`start` paths, then re-verified with the full smoke test against the real compiled output. Worth calling out as the one place "it works in dev" and "it works in production" genuinely diverged during this project.
- **Real-character photos remain opt-in** (`npm run fetch-images`, unchanged from before this work) — not run automatically, per the existing project's own documented tradeoff.
- **Multiplayer's actual deployment (the `railway up` step) is pending on your end** — everything up to that point (code, config, verified production build, instructions) is done.
