# Guess Who

A modern, polished Guess Who–style social party game. Pick a category, get a
secret character, ask yes/no questions, eliminate candidates, and guess who
it is — faster than your friends.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Other commands

```bash
npm run build            # production build
npm run start             # run the production build locally
npm run lint               # eslint
npm run test                # vitest (engine, board generator, question generator)
npm run validate:data # data-integrity report (character/question counts, warnings)
npm run smoke-test    # full-loop integration check across every category/difficulty
npm run fetch-images  # populate real character photos (see below)
```

## The character database

4,624 characters across 12 categories, converted once at build time from
`data/source/characters.xlsx` (the master spreadsheet) into the plain
TypeScript modules under `data/` — nothing parses XLSX in the browser or on
every request. To regenerate after updating the spreadsheet:

```bash
npm run generate:data   # data/source/characters.xlsx -> data/*.ts
npm run validate:data   # sanity-check the result
```

| Category | Characters |
|---|---|
| Cricketers | 508 |
| Fictional Characters | 490 |
| Footballers | 485 |
| Singers | 416 |
| Actresses | 394 |
| Actors | 368 |
| Basketball Players | 359 |
| Indian Celebrities | 340 |
| Famous Personalities | 327 |
| Gamers & Streamers | 323 |
| F1 Drivers | 316 |
| Tech & Business | 298 |

Plus a derived **Movie Stars** category (Actors + Actresses combined — see
`data/categories.ts`), which doesn't add new characters of its own.

**What the data can and can't answer:** the spreadsheet's identity/career
columns (name, nationality, birth year, profession, sport/team/league/
position, popularity, and — for Fictional Characters — origin and hero/
villain) are fully populated and drive most questions. Its achievement/role
boolean columns (World Cup wins, Oscars, Grammys, cricket batting roles,
Marvel appearances, active/retired status, and similar) are currently empty
for all 4,624 rows — there's no per-character fact behind them yet. Rather
than guessing, the question engine (`lib/question-engine.ts`) treats a
missing attribute as **unsupported**, not as "no": a question with no data
behind it is simply never offered (see `isQuestionSupported` /
`canAskQuestion`), never silently answered incorrectly. A handful of flags
*are* safely derived from populated columns rather than fabricated —
`indian`/`american`/`british`/`european` from nationality, and
`actor`/`actress`/`singer`/`director`/`entrepreneur`/`streamer`/`athlete`
from profession — see the header comment in `scripts/generate-data.ts` for
exactly what's derived versus left blank. Add real per-character
achievement data to the spreadsheet and regenerate any time; the questions
tied to it will start working automatically, no code changes needed.

## Smart boards, difficulty, and dynamic questions

Every category has a full character **pool** (see counts above); each game samples a
fresh, balanced **30-character board** from it via `lib/board-generator.ts`:

- Weighted random selection that deprioritizes characters used in your last ~45
  games (per category) and gently favors ones you haven't seen much, so the
  whole pool gets explored over time rather than the same faces every round.
- A diversity pass that nudges the board toward a better spread of gender,
  nationality, and role/position when the pool supports it.
- Four difficulty tiers (Easy/Medium/Hard/Expert) that filter by a fame-tier
  heuristic — Easy stays to the most recognizable characters, Expert opens the
  full pool.
- Optional seeded generation (`generateGameBoard({ seed })`) for reproducible
  boards — the foundation for a future daily-challenge mode.
- Graceful fallback: categories with fewer characters than the board size
  just use the full pool.

The question list combines the static bank in `data/questions.ts` with
questions **generated on the fly** from whatever's actually on the current
board (`lib/question-generator.ts`) — e.g. if the board happens to include
players from 5 different countries, you get real "Are they from X?"
questions for exactly those 5, not a fixed pre-written list. Because it only
ever asks about values present on the real board, it can't fabricate
anything. Questions are also scored and ranked (`getQuestionQuality`) so the
"Recommended" section shows the ones that split the board most evenly, with
BEST/GOOD badges and an "eliminates ~N/30" hint.

## Optional: freeform AI-judged questions

By default, typing your own question shows a hint to use the suggested
questions instead — this needs no setup and costs nothing. To let players
type genuinely freeform questions ("did they ever win anything big?"),
answered by Claude:

1. Get an API key from https://console.anthropic.com (Settings → API Keys).
   **Set a monthly spend limit on the key** — this is a public-facing
   endpoint and that's your real safety net against abuse, since serverless
   functions can't reliably rate-limit in-memory.
2. In your Vercel project: **Settings → Environment Variables** → add
   `ANTHROPIC_API_KEY` with your key. Redeploy.
3. That's it — the "Ask a question" box will start answering freeform
   questions. Optionally set `ANTHROPIC_MODEL` too (defaults to a cheap,
   fast model suited to this yes/no/unknown/invalid classification task).

Freeform answers are **advisory only** — they inform you but don't
auto-eliminate candidates the way the built-in structured questions do,
since that would require a separate AI call per remaining candidate. Tap a
card yourself once you know it doesn't fit. Without a key configured, the
feature just degrades gracefully back to the suggested-questions hint —
nothing breaks.

## Optional: real character photos

By default every character shows a generated initials avatar — reliable,
license-free, works with zero setup. To use real photos instead:

```bash
npm run fetch-images
```

This queries Wikipedia's free, no-key REST API for each of the 4,624
built-in characters and writes the results to `data/character-images.json`
(committed to your repo — re-run any time you add characters). At that
volume it takes a while (one polite, rate-limited request per character) —
run it locally, not in CI. Photos are
hotlinked directly from Wikipedia's CDN (their own reuse policy supports
this for attributed, non-commercial use); nothing is downloaded or
re-hosted. Every card falls back to the initials avatar automatically if a
photo 404s, so a bad or missing match never breaks the UI.

**This has to run somewhere with real internet access** — your own machine
or a CI step, not inside a sandboxed build. It is *not* run automatically
by `next build` or by Vercel.

**Known limitation:** matching is by name, which is ambiguous for a
handful of entries (common first names, streamer handles, etc). After
running it, spot-check a category or two. Fix a bad match either by
editing `data/character-images.json` directly, or by adding the correct
Wikipedia page title to `TITLE_OVERRIDES` in `scripts/fetch-images.ts` and
re-running.

## Real-time 1v1 online play

`/play/multiplayer` is a genuine head-to-head mode: two players in a room,
one server-generated board, a fresh secret character each, and a turn
clock — all decided by a server, never by either browser.

**Why a separate service.** Vercel's serverless functions can't hold a
persistent WebSocket connection open, and Socket.IO needs one. So the
multiplayer backend lives in its own project, `multiplayer-server/`,
deployed independently (Railway is the recommended target — see
`multiplayer-server/README.md`) while this Next.js app stays on Vercel.
They share no runtime dependency; `multiplayer-server/shared/` holds
verbatim copies of the pure game-logic files this app also uses
(`board-generator.ts`, `question-engine.ts`, `question-generator.ts`,
`data/*.ts`), kept in sync by hand. If you change board generation, the
question engine, or the character/question data, mirror the change into
both places.

**Enabling it.** Set `NEXT_PUBLIC_MULTIPLAYER_SERVER_URL` to your deployed
multiplayer-server's URL (see `.env.example`). Unset, `/play/multiplayer`
still renders — it just shows a "not configured" message rather than
single-player being affected in any way.

**What's actually server-authoritative** (see `multiplayer-server/README.md`
for the full design): board generation and secret assignment (crypto-random,
never client-supplied), whose turn it is and the 45s turn clock (a stalled
or clock-tampering client can't stall the match — the server's own timer
advances the turn on expiry), every question's answer (evaluated server-side
against the real secret; a question with no data for that secret is
rejected rather than silently answered "no"), win/loss determination, and
reconnection (a 45s grace period keyed to a server-issued session token, not
the raw Socket.IO connection id, so a page refresh or brief network drop
can resume the same room). An opponent's secret character is included in a
player's payload only after the game actually ends — see
`multiplayer-server/src/player-view.ts`, the single choke point every
outgoing payload passes through.

**Client-side pieces** (this repo): `types/multiplayer.ts` (wire-protocol
types, hand-mirrored from the server's), `lib/multiplayer/socket-client.ts`
(connection setup), `hooks/useMultiplayerGame.ts` (connection lifecycle,
session persistence/resume via `sessionStorage`, action dispatch),
`components/multiplayer/` (header, results/rematch screen — new
components, since the existing single-player `GameHeader`/`GameResult`
don't carry turn/opponent state), and `app/play/multiplayer/`. Everything
else — the character grid, question panel, guess modal — is the exact same
components single-player uses; a multiplayer game's own "remaining
candidates" narrowing and manual crossing-off work identically to
single-player, just fed from the server's per-player view instead of the
local game engine.

`scripts/smoke-multiplayer.mjs` is a manual (not CI-wired) end-to-end
check: run a `multiplayer-server` instance, then `node
scripts/smoke-multiplayer.mjs`, to exercise the full create → join → ask →
guess → rematch flow over real Socket.IO connections.

## Deploy to Vercel

1. Push this repository to GitHub (or any git provider Vercel supports).
2. Go to https://vercel.com/new and import the repository.
3. Framework preset: Next.js (auto-detected). No environment variables,
   database, or extra configuration are required for the base game —
   everything runs client-side against the local TypeScript dataset. Add
   `ANTHROPIC_API_KEY` only if you want freeform AI questions (see above),
   and `NEXT_PUBLIC_MULTIPLAYER_SERVER_URL` only if you want real-time
   online play (see above) — both are fully optional.
4. Click Deploy.

Or from the CLI:

```bash
npm i -g vercel
vercel
```

## Project structure

- `app/` — routes (home, categories, play, play/multiplayer, create,
  how-to-play, stats)
- `app/api/ask/` — serverless route that judges freeform questions (optional)
- `components/game/` — single-player gameplay UI (character grid/card,
  question panel, guess modal, results, header) — also reused as-is by
  multiplayer
- `components/multiplayer/` — multiplayer-specific UI (turn/opponent
  header, results + rematch screen)
- `components/home/` and `components/shared/` — marketing + shared UI
- `data/` — category registry, 4,624 built-in characters (generated —
  see `data/source/characters.xlsx` and `scripts/generate-data.ts`),
  static + dynamic question definitions, `character-images.json`
  (real-photo lookup, empty until you run the script)
- `lib/` — game engine, question engine (tri-state yes/no/unsupported
  evaluation, entropy-based ranking) + dynamic question generation,
  smart board generator, seeded RNG, popularity/difficulty, board history
  (recency + usage tracking), storage, stats, custom-pack utils
- `lib/multiplayer/` — Socket.IO client setup for real-time online play
- `hooks/useMultiplayerGame.ts` — multiplayer connection/session/action hook
- `scripts/` — `generate-data.ts` (spreadsheet -> data/*.ts),
  `fetch-images.ts` (real photos), `validate-data.ts` (data
  integrity report), `smoke-test.ts` (full-loop integration check),
  `smoke-multiplayer.mjs` (manual end-to-end multiplayer check)
- `types/` — shared TypeScript types, including `multiplayer.ts` (wire
  protocol shared with — hand-mirrored from — `multiplayer-server/`)
- `tests/` — Vitest unit tests (engine, board generator, question generator)
- `multiplayer-server/` (sibling project, not inside this folder) — the
  dedicated real-time multiplayer backend; see its own README
