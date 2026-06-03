# antho's bot

A Twitch + YouTube notification bot for a single Discord community, with community features
and a web dashboard where everything is configurable. Bot (discord.js) and dashboard (Next.js)
run as one monolith. See [`planning/`](planning/) for the full design and roadmap.

**Stack:** TypeScript · discord.js v14 · Next.js · Drizzle ORM + SQLite (libsql) · Auth.js (Discord OAuth)

## Status

**Phase 0 complete** — deployable skeleton: bot bootstrap, dashboard login, Bot Health, live
Logs. Features land in later phases (see [`planning/04-roadmap.md`](planning/04-roadmap.md)).

## Local setup

```bash
npm install
cp .env.example .env      # then fill in the Discord values
npm run db:migrate        # create/upgrade the local SQLite DB
npm run dev               # http://localhost:3000
```

To bring the bot online and enable login, create a Discord application
(https://discord.com/developers/applications) and set in `.env`:
`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_GUILD_ID`.
Enable the **Server Members** and **Message Content** intents, and add the OAuth redirect
`http://localhost:3000/api/auth/callback/discord`.

## Scripts

| Script | Does |
|--------|------|
| `npm run dev` | Dev server (bot boots via `instrumentation.ts`) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Browse the DB |

## Layout

```
src/
  app/                 Next.js — dashboard pages + API routes (auth, health, logs SSE)
  server/              server-only backend (never imported by client components)
    core/              logger, health, analytics (track), permissions
    db/                schema/ · queries/ · client · migrate
    integrations/      external clients — discord/ (twitch/ youtube/ in Phase 1)
    features/          toggleable feature modules (one folder each, per phase)
    jobs/              scheduled workers
    auth.ts            Auth.js (Discord OAuth) config
  lib/                 framework-agnostic pure helpers (safe on client & server)
  types/               ambient type declarations
  env.ts               typed environment access
  instrumentation.ts   boots migrations + bot on server start
drizzle/               generated SQL migrations (committed)
planning/              design docs & roadmap (see 09-project-structure.md for the full tree)
```

## Deploy

Dockerized; runs anywhere. `render.yaml` provisions a Render web service + persistent disk for
the SQLite file (see [`planning/02-hosting-cost.md`](planning/02-hosting-cost.md)).
