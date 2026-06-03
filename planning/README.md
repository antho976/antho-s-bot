# antho's bot — v2 planning

This folder is our shared memory for rebuilding the bot from scratch. Every decision,
spec, and open question lives here so nothing gets lost (the way it did in v1).

These are markdown text files — read them in order.

## The docs

| File | What's in it |
|------|--------------|
| `00-vision-scope-decisions.md` | Why we're rebuilding, v1 retrospective, the locked-in decisions, hard constraints |
| `01-architecture.md` | Tech stack, the monolith design, the feature-module system, core services, folder layout, the Twitch/YouTube notification engine |
| `02-hosting-cost.md` | The $7/mo Render path, the genuinely-free path, containerization, secrets |
| `03-data-model.md` | The SQLite/Drizzle schema sketch for every feature, `guildId` strategy, backups |
| `04-roadmap.md` | Phased build order. Phase 0 = infra + dashboard shell first (your call) |
| `05-features.md` | Detailed spec of every feature from your list, organized by dashboard section |
| `06-open-questions.md` | Gaps still to fill before we build each piece — answer these as we go |
| `07-scope-headroom.md` | Where we design *seams* for bigger scope (more platforms, identity, storage…) without building it yet |
| `08-analytics.md` | Analytics/tracking prep — instrument from day one, build the charts later |
| `09-project-structure.md` | The extensive directory architecture (layer-first, per-feature template) modeled on the Forge gym-app |
| `10-polish-backlog.md` | Deferred "make it pretty & feature-packed" work (logic first, polish later) |
| `11-rpg-design.md` | RPG v2 flow & seams (deferred feature) — public hub/router, combatant abstraction, `rpg_*`/`clan` schema |

## Status

- **Phase:** Planning (no code yet)
- **Decided:** stack, hosting model, scope, dashboard approach (see `00`)
- **Next:** answer the open questions in `06`, then start Phase 0

## How we work

1. We plan a slice here before writing any code.
2. Decisions get logged in `00` so we never re-litigate them.
3. Anything uncertain goes in `06` as an open question, not a guess.
4. v1 (`github.com/antho976/Discord-bot`) is reference-only — we mine ideas, we do **not** port code.
