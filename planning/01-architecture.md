# 01 — Architecture

## Stack at a glance

| Layer | Choice | Notes |
|-------|--------|-------|
| Language | TypeScript (strict) | One language across bot + dashboard |
| Bot | discord.js v14 | Slash commands + gateway events |
| HTTP / API | Fastify (or Next.js API routes) | Serves dashboard API + Twitch/YouTube webhooks |
| Dashboard | Next.js (React) + Discord OAuth | Co-hosted in the same service |
| Realtime | WebSocket (socket.io) | Live log feed + live health, reuses your v1 familiarity |
| DB | SQLite via Drizzle ORM | Single file on a persistent disk |
| Image gen | `@napi-rs/canvas` | Welcome art, schedule cards (same lib as v1) |
| Uploads | `multer` / Fastify multipart | Custom command images, welcome backgrounds |
| Scheduling | In-process job scheduler | Reminders, scheduled messages, giveaway/poll ends, daily resets |
| Container | Docker | Host-agnostic (Render / Oracle / home) |

## The monolith, drawn

```
┌─────────────────────────────────────────────────────────────┐
│  One Node process  (one Render service / one container)      │
│                                                              │
│  ┌────────────┐   ┌──────────────┐   ┌────────────────────┐  │
│  │ discord.js │   │  HTTP server │   │  WebSocket (live)  │  │
│  │  client    │   │  - dashboard │   │  - log feed        │  │
│  │  - events  │   │    API       │   │  - health metrics  │  │
│  │  - cmds    │   │  - webhooks  │   │                    │  │
│  └─────┬──────┘   └──────┬───────┘   └─────────┬──────────┘  │
│        │                 │                     │             │
│        └────────┬────────┴──────────┬──────────┘             │
│                 ▼                    ▼                        │
│        ┌─────────────────┐  ┌──────────────────┐             │
│        │  Core services  │  │  Feature modules │             │
│        │  (see below)    │  │  (registry)      │             │
│        └────────┬────────┘  └────────┬─────────┘             │
│                 └──────────┬─────────┘                       │
│                            ▼                                 │
│                   ┌─────────────────┐                        │
│                   │ Drizzle  →  SQLite file (on disk)        │
│                   └─────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
            ▲                              ▲
    Discord gateway              Twitch EventSub / YouTube
                                 PubSubHubbub webhooks (inbound)
```

The Next.js dashboard and the discord.js client live in the **same process**, so the
dashboard can read live bot state (uptime, memory, connection status) with zero network
plumbing, and both import the **same Drizzle `db` module** and the **same TypeScript types**.

> Phase-0 spike: confirm the cleanest way to boot discord.js alongside Next.js in one
> process (Next.js custom-server pattern). Fallback: run the dashboard as a tiny separate
> Render service that calls the bot's API (covered in `02`). We don't decide this blind —
> we prototype it first.

## Core services (the "infrastructure" you asked for)

These are shared, feature-agnostic building blocks. Every feature uses them; no feature
reimplements them (the v1 mistake).

- **Config service** — typed, per-guild settings stored in DB, editable from the dashboard,
  **hot-reloadable** (change a setting → bot picks it up without redeploy). This is what makes
  "everything editable in the dashboard" real.
- **Feature registry** — each feature self-registers its commands, event listeners, dashboard
  routes, DB tables, and an **on/off toggle**. Disabled features load nothing. This is how
  "everything toggleable" works and how we wall off scope creep.
- **Logger** — one structured logger. Every log line goes to (a) storage for the Logs page
  (export/clear/filter) and (b) the live WebSocket feed. Levels: debug/info/warn/error.
- **Health/telemetry** — collects uptime, memory, per-API status (Discord/Twitch/YouTube),
  active features, connection state, storage size, recent errors. Powers the Bot Health page.
  (Real-time "is the bot OK now?" — distinct from analytics below.)
- **Analytics / instrumentation** — one `track(guildId, event, props)` sink every feature
  calls. Writes raw events (short retention) + scheduled rollups into tiny permanent daily
  counters. Behind an interface so an external analytics backend can be added later untouched.
  Capture ships in Phase 0; charts come later. Full design in `08`.
- **Scheduler** — one job runner for all time-based work: stream reminders (1 h / 10 min),
  scheduled messages, giveaway/poll endings, daily resets, birthday checks. Survives restarts
  by persisting jobs in the DB. Sits **behind an interface** so it can later be swapped for a
  distributed queue without touching callers (see `07`, seam 8). All times stored in **UTC**.
- **Audit** — records every dashboard change (who, what, when, before/after) for the audit log.
- **Permissions** — maps Discord roles → **capabilities**; the tiers (owner/admin/mod/viewer)
  are presets built *from* capabilities, so granular per-feature access is possible later
  without re-architecting auth (see `07`, seam 9).
- **Storage** — file uploads (welcome backgrounds, custom-command images) go through a
  **storage interface**: local disk now, swappable to Cloudflare R2 / S3 later — no path
  rewrites (see `07`, seam 7).

## Feature-module shape

Every feature is a folder that exports a standard interface:

```
features/<name>/
  index.ts        # registers the module: name, toggle key, default config
  commands.ts     # slash commands this feature adds
  events.ts       # gateway event handlers this feature needs
  schema.ts       # its Drizzle tables
  api.ts          # dashboard API endpoints for its settings/data
  service.ts      # the actual logic
  config.ts       # typed config shape + defaults
```

The registry mounts all of this only if the feature is toggled on for the guild. Adding a
feature = adding a folder. Removing one = deleting a folder. No tangling.

## The notification engine (the core purpose)

This is the heart of the bot, so it gets first-class infrastructure rather than being one
feature among many.

**Platform providers (extension seam):** Twitch and YouTube are each a *provider* implementing
one common interface (`subscribe` / `detectLive` / `detectUpload`). The engine talks only to
that interface, so adding Kick, TikTok, or X/Twitter later is a new provider file — not an
engine rewrite (see `07`, seam 3). Stream events carry a generic `eventType` + payload, so new
event kinds (title/category change, raids, sub milestones) need no schema change (seam 4).

**Twitch (going live / going offline):**
- Use **EventSub webhooks** (Twitch pushes us an HTTP callback when the channel goes
  live/offline). Preferred over polling — near-instant, and uses almost no resources/quota
  (matters for our memory/cost goals).
- Polling is the fallback if webhooks are ever flaky.
- Subscriptions are (re)registered on startup for each configured channel.

**YouTube (new video / short):**
- Use **PubSubHubbub** (YouTube's push notifications via Google's hub) — YouTube pings our
  webhook when a channel uploads. Cheap and fast.
- RSS-feed polling as fallback.
- Classify video vs short (duration / URL shape) so alerts can be configured separately.

**Stream schedule & reminders:**
- A schedule (recurring or one-off stream times) drives the scheduler to fire **1 h** and
  **10 min** pre-stream reminders.
- "Reset schedule" maintenance action clears it.

**Quick actions / testing (from your Overview spec):**
- **Fake live / Fake end** — fire the notification pipeline with test data so you can verify
  the message/embed/ping without actually going live.
- **VIPs** — a list that can be pinged / treated specially in alerts.
- **Reset live** — clears the current live-state flags if they get stuck.

**Per-channel alert config** (dashboard-editable): target channel, message template, embed
on/off, ping role, role to @, thumbnail/art, and toggles for live vs offline vs upload vs short.
Delivery is modeled as a **list of targets** (channel / DM / webhook) even though we use one
now, so multi-channel posting or DMing VIPs later is data, not a rewrite (see `07`, seam 5).

## Folder layout (Phase 0 — actual)

The split tells a story: `app` = UI + HTTP edges, `server` = backend (never touched by the
client), `lib` = pure helpers usable anywhere. `instrumentation.ts` must sit at `src/` root
(Next.js requirement) — it's how the bot boots inside the server process.

```
/                       repo root
  src/
    app/                Next.js — dashboard pages + API routes (auth, health, logs SSE)
    server/             server-only backend (layer-first — see 09-project-structure.md)
      core/             logger, health, analytics, permissions (+ scheduler/registry/config as needed)
      db/               schema/ (entities) · queries/ (repos) · client · migrate
      integrations/     external clients: discord/ (now) · twitch/ · youtube/ (Phase 1)
      features/<name>/  toggleable feature modules — one folder each, added per phase
      jobs/             scheduled workers (reminders, rollups, backups)
      auth.ts           Auth.js (Discord OAuth)
    lib/                isomorphic pure helpers (format, etc.)
    types/              ambient declarations
    env.ts              typed env access
    instrumentation.ts  boots migrations + bot (must live at src/ root)
  drizzle/              generated SQL migrations (committed)
  planning/             these docs
  Dockerfile · render.yaml · drizzle.config.ts · next.config.ts
```

> Full directory map, layer definitions, and the per-feature module template live in
> `09-project-structure.md` (modeled on the depth of the Forge gym-app repo).

## Cross-cutting principles

- **DB is the source of truth.** No in-memory "current state" that isn't backed by the DB.
  (Kills the 6 GB-heap class of bug.)
- **Config in DB, secrets in env.** Tokens/keys never go in the database or git.
- **Everything has a toggle and a default.** A fresh install boots with sane defaults, all
  optional features off.
- **Reserve, don't build.** `smartreply` and `rpg` get reserved module namespaces and table
  prefixes so adding them later doesn't require migrations that touch everything else.
- **Never hardcode the single case.** Anything with a category (platform, event type, delivery
  target, permission) gets a discriminator field and loops over a list-of-one, so adding the
  second case is data, not a rewrite. This is the rule that makes every seam in `07` ~free.
- **Small, single-purpose files.** Target ~100–250 lines; ~300 is a yellow flag; split before
  ~400 (schema/config files may be longer). One job per file, nameable without "and". The
  feature-module shape above keeps files small automatically. Don't over-shred either — things
  that always change together stay together. This directly prevents v1's giant-tangled-file rot.
