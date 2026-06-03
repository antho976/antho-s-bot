# 09 — Project Structure

The directory architecture, modeled on the depth/discipline of the `gym-phone-app` (Forge)
repo: **layer-first, deeply nested by sub-domain, one file per concern.** This doc is the map
every phase fills in. Folders are created **as their phase needs them** — the tree below is the
target, not a pile of empty dirs.

## The layers (what lives where)

| Layer | Path | Holds | Forge analog |
|-------|------|-------|--------------|
| **Presentation** | `src/app/` | Next.js pages + API routes (UI & HTTP edges only) | `ui/` |
| **Core** | `src/server/core/` | cross-cutting services (logger, health, scheduler, registry, config, audit, permissions, analytics) | `core/` |
| **Data** | `src/server/db/` | `schema/` (entities) · `queries/` (repositories) · client · migrator | `data/` (`entities`, `dao`, `repo`) |
| **Integrations** | `src/server/integrations/` | external clients: `discord/`, `twitch/`, `youtube/` | (Android system APIs) |
| **Features** | `src/server/features/` | toggleable feature modules (one folder each) | `program/` + slices of `ui`/`domain` |
| **Jobs** | `src/server/jobs/` | scheduled workers (rollups, reminders, backups, resets) | `service/` (Workers) |
| **Shared-pure** | `src/lib/` | framework-agnostic utils, safe on client & server | (Kotlin util) |
| **Contracts** | `src/shared/` | types shared between server & app (DTOs) | (shared models) |

Rule: **a client component may never import from `src/server/`.** `app` → `server` is fine;
`server` → `app` is never.

## Target tree (fills in per phase)

```
src/
  app/                                   PRESENTATION
    dashboard/
      _components/                       shared dashboard UI (nav, cards, status dot…)
      _hooks/                            shared client hooks (useSSE, usePolling…)
      overview/    page.tsx
      health/      page.tsx  components/
      logs/        page.tsx  components/
      analytics/   page.tsx  components/  state/        (Phase 6)
      notifications/ welcome/ leveling/ events/ automod/        each:
        page.tsx  components/  state/                           (one per dashboard section)
    api/
      auth/  health/  logs/stream/
      webhooks/ twitch/  youtube/        (Phase 1 — inbound EventSub / PubSubHubbub)
  server/                                BACKEND (server-only)
    core/        logger · health · analytics · permissions
                 (+ scheduler · registry · config · audit · events — added as needed)
    db/
      schema/    core.ts · analytics.ts · <feature>.ts …
      queries/   <domain>-queries.ts …   (repositories — added with features)
      client.ts (index.ts)  migrate.ts
    integrations/
      discord/   client · index · register-commands · commands/ · events/
      twitch/    provider · eventsub · api          (Phase 1)
      youtube/   provider · pubsub · api            (Phase 1)
    features/<name>/                     FEATURE MODULE TEMPLATE (see below)
    jobs/        <name>-job.ts …         (scheduled workers)
    auth/        (Auth.js config)        currently src/server/auth.ts
  lib/           format.ts …             isomorphic pure helpers
  shared/        types/contracts         (added when server↔app share DTOs)
  env.ts  instrumentation.ts
```

## Feature module template

Every feature is one folder under `src/server/features/<name>/`. Add only the parts it needs;
this is the full shape (mirrors Forge splitting a feature across focused files):

```
server/features/<name>/
  index.ts        module definition: key, toggle, default config, wiring into the registry
  service.ts      orchestration / the feature's main logic
  config.ts       typed config shape + defaults (edited from the dashboard)
  schema.ts       this feature's Drizzle tables (also re-exported from db/schema)
  domain/         pure logic (no IO) — e.g. leveling math, automod matchers, alert formatting
  commands/       slash commands this feature adds
  events/         gateway handlers this feature needs
  jobs/           scheduled tasks this feature owns
  api.ts          dashboard API endpoints for its settings/data
```

Its dashboard counterpart lives at `src/app/dashboard/<name>/` with `page.tsx`, `components/`,
and `state/` — exactly like Forge's `ui/gym/<feature>/{components,state}`.

## Naming conventions

- **Files:** kebab-case (`register-commands.ts`, `health-live.tsx`). One job per file
  (`planning/01`), split big ones the way Forge splits `Day*` into handlers/builders/refresh.
- **Barrels:** an `index.ts` per folder that has a clean public surface (commands, events).
- **Tests:** co-located `*.test.ts` next to the unit, mirroring the tree (Forge keeps a parallel
  `src/test/` — we co-locate for a TS project).
- **Schema files** grouped by domain; each feature's tables live in its `schema.ts` and are
  re-exported through `db/schema/index.ts`.

## How it grows (per phase)

- **Phase 1 (notifications):** `integrations/twitch`, `integrations/youtube`,
  `features/notifications/`, `app/dashboard/notifications/`, `api/webhooks/*`, first
  `db/queries/`, first `jobs/` (reminders).
- **Phase 2+:** each feature adds its `features/<name>/` + `app/dashboard/<name>/` following the
  template above. Nothing is pre-created empty.
