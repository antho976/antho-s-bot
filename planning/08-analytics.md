# 08 — Analytics & Tracking (prep)

> **Instrument from day one; build the charts later.** You can't backfill data you never
> recorded — so the *capture* layer is the seam we prep now (cheap), while the dashboards that
> read it come later (the expensive part we defer).

## Three things people confuse — keep them separate

| Concern | Question it answers | When | Where |
|---------|--------------------|------|-------|
| **Logs** | "what happened / what broke?" (debugging) | now | `logs` table, Logs page |
| **Health/telemetry** | "is the bot OK *right now*?" (uptime, memory, API up) | now | health service, Bot Health page |
| **Analytics** | "how is the community/bot doing *over time*?" (growth, engagement, usage) | capture now, view later | this doc |

Analytics is the only one of the three that's worthless if we start late — hence prepping it.

## The seam: one `track()` call, everywhere

A single instrumentation API used by every feature:

```
track(guildId, 'giveaway.entered', { userId, giveawayId })
track(guildId, 'stream.alert_sent', { platform: 'twitch', channel, eventType: 'live' })
track(guildId, 'member.joined', { userId, source })
```

- **One code path.** Features don't invent their own counters (the v1 mess where stats were
  scattered across `command-usage.json`, `member-growth.json`, etc.).
- **New metric = new event type**, not a migration (discriminator-over-duplication rule, `07`).
- Lives in `/core` next to the logger and health service. Ships in **Phase 0**; each feature
  adds its own `track()` calls *as it's built*, so instrumentation is never retrofitted.

## Storage that stays small (respects the cost/memory goals)

Two layers — this is what stops analytics from re-creating v1's bloat:

| Table | What | Retention |
|-------|------|-----------|
| `analytics_events` | raw append-only events | **short** (e.g. 30–90 days), rotated/pruned — used for drill-down + recomputing rollups |
| `analytics_daily` | pre-aggregated counters per `(guildId, metric, day, dims)` | **permanent but tiny** — this is what charts read |

A scheduled rollup job (reuse the Scheduler) folds raw events into daily counters. Charts query
the small rollup table, never the raw firehose — so the DB stays small forever and we never
load events into memory.

## Sink behind an interface (future-proof, no dependency now)

`track()` writes to the DB sink today. It sits **behind an interface** so we could later *also*
fan out to an external analytics backend (e.g. PostHog, a time-series DB) without touching a
single call site. We do **not** add any external service now — just the seam.

## What we'll be able to track (as event types)

Captured continuously; surfaced whenever we build the Analytics page.

- **Membership:** joins, leaves, kicks/bans → growth, churn, retention cohorts.
- **Engagement:** message activity (counts, **not content**), voice minutes, reactions, XP &
  level-ups → who's active, trend over time.
- **Notifications (core):** alerts sent (platform, channel, type) + post-alert activity bumps →
  "did going live bring people in?" stream-impact analysis.
- **Feature/command usage:** which commands and dashboard features actually get used → a direct
  **anti-scope-creep signal** (cut what nobody uses).
- **Events:** giveaway entries, poll votes, ticket volume + time-to-resolution.
- **Moderation:** automod actions and scam catches over time.

## Privacy & footprint (be responsible with a community's data)

- Store **IDs + counts/metadata, never message content.** Discord IDs are pseudonymous.
- An **analytics on/off toggle**, plus an optional aggregate-only mode.
- Retention limits on raw events keep both privacy exposure and disk small.

## Dashboard surface (built later)

An **Analytics** section: growth & churn, engagement trends, stream performance/impact, feature
usage, event stats — with date ranges and CSV export. Built in a later phase; because we
instrument from day one, there's **zero retro-work** when we get there.

## What we do NOT build now (YAGNI)

- No charting suite, no external analytics service, no real-time streaming pipeline, no ML.
- Just: the `track()` layer + the two tables + the scheduled rollup job. That's the whole prep.

## Relationship to existing tables

`member_growth` and `command_usage` from `03` become **rollups fed by the tracking layer**
rather than separate hand-maintained tables — one capture path, many views.
