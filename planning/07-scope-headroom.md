# 07 — Scope Headroom

> **Design the seams for more; build only what's needed now.**
> A *seam* = an interface, an abstraction boundary, or a reserved column/table. Cheap to add
> today, saves a teardown later. We add the seam; we do **not** build the bigger feature.

This is the audit you asked for: every place in the plan where the asymmetry holds —
**cheap to prep now, painful to retrofit later** — so v2 can grow without a rewrite.

## The discipline (how we avoid over-engineering)

Prep a seam **only** when *both* are true:
1. The bigger scope is plausible (you might actually want it), **and**
2. Retrofitting it later is much more expensive than the seam costs now.

If retrofitting later is cheap, we **don't** prep — we just do it then (YAGNI). The "Not
prepping" list at the bottom is as important as the seams.

## Seams we bake in now

| # | Dimension | Built now | The seam we add | Unlocks later | Cost now |
|---|-----------|-----------|-----------------|----------------|----------|
| 1 | **Servers** | one guild | `guildId` on every table (D5) | multi-server / SaaS | ~0 ✅ already |
| 2 | **Streamers** | one | N-row design + `platform` column | many streamers | ~0 ✅ already |
| 3 | **Stream platforms** | Twitch + YouTube | **Provider interface** (`subscribe`, `detectLive`, `detectUpload`) — Twitch & YT are just two implementations | Kick, TikTok, X/Twitter, Trovo = a new provider file, not an engine rewrite | small |
| 4 | **Stream event types** | live / offline / upload / short | generic `eventType` + `payloadJson` on `stream_events` | title/category change, raids, follower/sub milestones, "going live soon" = new type, no schema change | ~0 |
| 5 | **Alert delivery** | 1 target channel | a delivery-**target list** (channel / DM / webhook), even if we only use one now | post to multiple channels, DM VIPs, fire an external webhook | small |
| 6 | **Identity** | Discord only | reserved **`linked_accounts`** (discordId ↔ twitchId ↔ youtubeId) | "Twitch subs get a Discord role", VIP auto-roles, sub-only perks | small |
| 7 | **File storage** | local disk | **storage interface** (local now) | swap to Cloudflare R2 / S3 when multi-instance or for durability — no path rewrites | small |
| 8 | **Scheduling** | in-process job runner | **scheduler interface** | swap to a distributed queue (e.g. BullMQ) at scale without touching callers | small |
| 9 | **Permissions** | preset tiers | **capability-based** model (tiers are presets *built from* capabilities) | granular per-feature access (a mod who edits automod but not giveaways) without re-architecting auth | small |
| 10 | **Dashboard branding** | single look | theme/branding read from config (per-guild-ready) | white-label per server when multi-tenant | small |
| 11 | **Internal API** | private to dashboard | keep the API a **clean, versioned boundary** | expose a public API / OBS / Streamlabs integration later | ~0 |
| 12 | **DB engine** | SQLite file | Drizzle, dialect-portable; storage layer isolated | move to Turso/Postgres at scale | ~0 ✅ already (D2/02) |
| 13 | **Deferred features** | none | reserved `rpg_*` / `smartreply_*` namespaces | RPG v2, smart reply | ~0 ✅ already |
| 14 | **Timezones** | one streamer's TZ | **store all times in UTC** + a configurable display timezone | correct reminders for viewers/streamer in any TZ; multi-server later | ~0 |
| 15 | **Analytics** | none visible yet | **`track()` capture layer** + raw/rollup tables from day one (full design in `08`) | growth, engagement, stream-impact, feature-usage charts later — impossible to backfill if not captured now | small |

Rows 1, 2, 12, 13 are already in the plan. Rows **3–11, 14, 15** are the new headroom this doc adds.

## What we are deliberately NOT prepping (YAGNI)

Prepping these now would add cost/complexity for benefit that may never come — and they're
cheap enough to add later *if* we ever need them:

- **Discord sharding** — only matters past ~2,500 servers; discord.js's `ShardingManager` is a
  near-drop-in when that day comes. No prep needed now.
- **Localization / i18n** — one English-speaking community; routing every string through a
  translation layer now is pure friction. Add only if a real second language appears.
- **Redis / microservices / event-sourcing** — real infrastructure cost (and money) for scale
  we don't have. The storage/scheduler **interfaces** (rows 7–8) already give us the swap path,
  so we lose nothing by waiting.
- **Billing / payments** — only relevant if the multi-server path ever becomes a paid product.

## The one rule that keeps this honest

When building any module: **never hardcode the single case.** If a thing has a category
(platform, event type, delivery target, permission), give it a discriminator field and loop
over a list of one — adding the second case is then data, not a rewrite. That single habit is
what makes every seam above essentially free.
