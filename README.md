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
npm run build          # production build
npm run start           # run the production build locally
npm run lint             # eslint
npm run test              # vitest (game engine + question engine)
npm run fetch-images  # populate real character photos (see below)
```

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

This queries Wikipedia's free, no-key REST API for each of the 310
built-in characters and writes the results to `data/character-images.json`
(committed to your repo — re-run any time you add characters). Photos are
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

## Deploy to Vercel

1. Push this repository to GitHub (or any git provider Vercel supports).
2. Go to https://vercel.com/new and import the repository.
3. Framework preset: Next.js (auto-detected). No environment variables,
   database, or extra configuration are required for the base game —
   everything runs client-side against the local TypeScript dataset. Add
   `ANTHROPIC_API_KEY` only if you want freeform AI questions (see above).
4. Click Deploy.

Or from the CLI:

```bash
npm i -g vercel
vercel
```

## Project structure

- `app/` — routes (home, categories, play, create, how-to-play, stats)
- `app/api/ask/` — serverless route that judges freeform questions (optional)
- `components/game/` — gameplay UI (character grid/card, question panel,
  guess modal, results, header)
- `components/home/` and `components/shared/` — marketing + shared UI
- `data/` — category registry, 310 built-in characters, question bank,
  `character-images.json` (real-photo lookup, empty until you run the script)
- `lib/` — pure game/question engine, storage, stats, custom-pack utils
- `scripts/fetch-images.ts` — populates real character photos from Wikipedia
- `types/` — shared TypeScript types
- `tests/` — Vitest unit tests for the engine
