# 06 — Open Questions

Gaps to fill before (or as) we build each piece. We answer these instead of guessing.
Format: ❓ question — *(why it matters)*. Mark answers inline when decided.

## Answered so far
- Stack → you pick → **TS + discord.js** (D1).
- Storage → cost-sensitive, JSON before → **SQLite + Drizzle** (D2).
- Scope → **one server, multi-ready schema** (D5).
- Dashboard → **Next.js + Discord OAuth** (D4).
- Notify scope → **one streamer, maybe more** → engine built for N, tuned for 1.
- First milestone → **infra + dashboard shell** (D8).
- Budget → **$7 fine, free path documented** (D7, see `02`).
- Old bot → **reference-only**, already mined.

## Phase 0 — Foundation
- ❓ Confirm the Next.js + discord.js single-process approach is acceptable, or should the
  dashboard be a separate (free) service calling the bot's API? *(Decides the deploy topology.)*
- ❓ Dashboard access levels — what tiers? (e.g. owner / admin / mod / viewer) and which Discord
  roles map to them? *(Drives the permissions service.)*
- ❓ Log retention — keep how many days or rows before rotating? *(Disk/memory bound.)*

## Phase 1 — Notifications
- ❓ Your Twitch channel name + YouTube channel(s)? *(Needed to configure watches.)*
- ❓ Default alert message/embed style — any existing format from v1 you liked? *(Templates.)*
- ❓ Stream schedule: fixed weekly times, or ad-hoc per-stream? *(Reminder model.)*
- ❓ "VIPs" — what exactly do VIPs do in an alert (extra ping? special mention?)? *(Behavior.)*
- ❓ Separate alerts for YouTube **video** vs **short** — different channels/messages? *(Config.)*
- ❓ Do you have a Twitch dev app + YouTube API project already, or set those up fresh?

## Phase 2 — Welcome & Leveling
- ❓ Welcome artwork: any reference image/layout from v1, or design new? *(Canvas template.)*
- ❓ Default XP curve — multiplier value, or a specific custom table? *(Leveling math.)*
- ❓ Should levels grant roles automatically? Which levels → which roles? *(Rewards.)*
- ❓ Does voice XP require non-AFK / non-muted? *(Anti-abuse.)*
- ❓ What does **prestige** reset and what does it grant? *(Prestige rules.)*

## Phase 3 — Moderation & safety
- ❓ Automod rule set to start with (spam, invites, links, bad words, mass-mention, raid, caps)?
- ❓ Actions per rule (delete / warn / timeout / kick / ban) and thresholds? *(Enforcement.)*
- ❓ Scam detection: maintain our own domain bl/ use a public feed? *(Source.)*
- ❓ Ticket categories + how auto-classification decides priority (keywords? rules? later AI?).
- ❓ Which member events to log by default? *(Defaults for the toggle list.)*

## Phase 4 — Community interaction
- ❓ Starboard threshold (X), which emoji, target channel, ignored channels? *(Defaults.)*
- ❓ Custom commands: who can create them (roles)? global cooldown defaults? *(Limits.)*
- ❓ Reaction-role default mode (toggle vs unique vs verify)? *(UX.)*

## Phase 5 — Events & extras
- ❓ Giveaway eligibility defaults (min level? role gates? exclude bots/staff?).
- ❓ Idleon pets: where does pet data come from now — same Firebase, an API, or manual? *(Adapter.)*
- ❓ Pet approval flow: who approves, what's the lifecycle? *(Workflow.)*
- ❓ Birthdays: announce in a channel? give a role for the day? *(Behavior.)*

## General
- ❓ Backup destination — local disk only, or also push to an external bucket? *(Durability.)*
- ❓ Export format(s) you want (JSON? CSV?). *(Export feature.)*
- ❓ Branding for the dashboard (name, colors, logo)? *(Theme.)*

## Analytics (`08`)
- ❓ Which metrics matter most to you first — growth, stream impact, engagement, feature usage? *(What to surface first.)*
- ❓ Raw-event retention window before rollup-only (30 / 60 / 90 days)? *(Disk vs drill-down depth.)*
- ❓ Privacy stance — IDs + counts only (recommended), or also opt-in deeper tracking? *(What we capture.)*
- ❓ Ever want an external analytics backend (e.g. PostHog), or DB-only forever? *(Whether the sink interface gets a second impl.)*

> When we start a phase, we knock out its questions first, log the answers in `00`, then build.
