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
npm run build   # production build
npm run start   # run the production build locally
npm run lint    # eslint
npm run test    # vitest (game engine + question engine)
```

## Deploy to Vercel

1. Push this repository to GitHub (or any git provider Vercel supports).
2. Go to https://vercel.com/new and import the repository.
3. Framework preset: Next.js (auto-detected). No environment variables,
   database, or extra configuration are required — everything runs
   client-side against the local TypeScript dataset.
4. Click Deploy.

Or from the CLI:

```bash
npm i -g vercel
vercel
```

## Project structure

- `app/` — routes (home, categories, play, create, how-to-play, stats)
- `components/game/` — gameplay UI (character grid/card, question panel,
  guess modal, results, header)
- `components/home/` and `components/shared/` — marketing + shared UI
- `data/` — category registry, 310 built-in characters, question bank
- `lib/` — pure game/question engine, storage, stats, custom-pack utils
- `types/` — shared TypeScript types
- `tests/` — Vitest unit tests for the engine
