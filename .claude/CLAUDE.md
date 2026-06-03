# Project conventions

antho's bot — Twitch/YouTube notification + community bot. Bot (discord.js) and dashboard
(Next.js) run as one monolith. **Read `planning/` before non-trivial work** — `00` has the
locked decisions, `01` the architecture, `03` the data model, `04` the roadmap.

## Rules

- **Small, single-purpose files.** ~100–250 lines; split before ~400. One job per file.
- **Layered layout** (`planning/09-project-structure.md`): `app` = UI · `server/{core,db,integrations,features,jobs}` = backend · `lib` = pure. Add folders per phase, not empty up front. Never import `src/server` from a client component.
- **Design seams, don't over-build.** Never hardcode the single case (use a discriminator +
  list-of-one). See `planning/07-scope-headroom.md`. Deferred: smart-reply, RPG.
- **Every feature is a toggleable module** with its own commands/events/schema/api/config.
- **DB is the source of truth** (no whole-dataset-in-memory — that was v1's 6 GB-heap bug).
  Config in DB, secrets in env. All timestamps UTC (epoch-ms).
- **Instrument as you build:** call `track()` (planning/08) from new features.

## Stack / tooling

- TypeScript (strict), discord.js v14, Next.js (App Router), Drizzle ORM + SQLite via libsql,
  Auth.js (Discord OAuth). Tailwind for UI.
- Bot boots from `src/instrumentation.ts`. Node-only libs (discord.js, @libsql/client) are in
  `serverExternalPackages` — never import them into client components.
- After schema changes: `npm run db:generate` then `npm run db:migrate`.
- Verify with `npx tsc --noEmit` and `npm run build`.
