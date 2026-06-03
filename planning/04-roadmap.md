# 04 — Roadmap

Build order. You chose **infra + dashboard shell first** (D8), so everything starts from a
deployed, online skeleton, then features slot in one at a time — each with its dashboard page
and toggle from day one.

Each phase should end in something **deployed and working**, not a pile of half-features.

## Phase 0 — Foundation (the skeleton)

Goal: bot online, dashboard reachable, login works, nothing crashes, deployable to Render.

- Repo scaffold: TypeScript, Drizzle, Docker, lint/format, `.env.example`.
- Core services: config, feature registry, logger, health, scheduler, audit, permissions, db,
  **analytics `track()` sink** (capture only — every feature instruments itself as it's built; charts come later, see `08`).
- discord.js client boots, registers slash commands, connects to your guild.
- Next.js dashboard shell with **Discord OAuth** login + role-gated access.
- **Overview page** (skeleton) and **Bot Health page** wired to real telemetry
  (uptime, memory, API/connection status, storage, recent errors, quick stats).
- **Logs page**: live feed (WebSocket), filters, export, clear.
- Deployed on Render (Path A), reachable, stays online.

✅ Exit: you can log in, see the bot is healthy, watch live logs — with zero features yet.

## Phase 1 — The core purpose: notifications

Goal: the actual reason the bot exists.

- Twitch EventSub webhook pipeline → live / offline alerts.
- YouTube PubSubHubbub → new video + short alerts (classified).
- Per-channel alert config in the dashboard (channel, template, embed, ping role, toggles).
- Stream schedule + **1 h / 10 min reminders** via the scheduler.
- Overview **quick actions**: VIPs, **fake live**, **fake end**, send reminders.
- Maintenance: **reset live**, **reset schedule**, **reset daily**.

✅ Exit: going live (or a fake-live) posts the right alert; reminders fire; you manage it all
from the dashboard.

## Phase 2 — Welcome & Leveling (everyday engagement)

- Welcome + goodbye: message modes, channel, **custom artwork** (name + avatar via canvas),
  templates, random background option + your own uploads.
- Leveling: XP per message (min/max), cooldown, XP per voice minute, XP per reaction, prestige,
  curve (multiplier or custom per-level), leaderboard, overview. Optional role rewards.

✅ Exit: members get welcomed with art; chatting/voice earns XP; leaderboard + prestige work.

## Phase 3 — Moderation & safety

- Auto-mod on par with Discord's, **plus stronger scam detection** (scam signature list).
- Member logs: everything possible, each event toggleable, to a log channel.
- Support & feedback: tickets with **auto-classification** + priority.

✅ Exit: the server is protected and observable; support requests get triaged automatically.

## Phase 4 — Community interaction

- Reaction roles (toggle / unique / verify modes).
- Highlights / starboard (X stars → saved to a custom channel).
- Tags / custom `!name` commands (image + text, auto-delete after X sec/uses, cooldown,
  embed toggle, allowed roles/channels, image URL or upload).

✅ Exit: self-serve roles, community highlights, and custom commands all live.

## Phase 5 — Events & extras

- Giveaways (prize, duration, winners, embed, channel, ping role, created-by, min level,
  exclusions/eligibility).
- Polls.
- Pets: Idleon pet giveaways, approvals + history.
- Birthdays (lowest priority).

✅ Exit: full event toolkit running.

## Phase 6 — Polish & general

- Commands reference page, full bot config page, export, backups, accounts & login management.
- **Analytics dashboard** — the charts/views over the data we've been capturing since Phase 0
  (growth, engagement, stream impact, feature usage). Zero retro-work because capture started day one (`08`).
- Hardening, docs, and a clean pass over toggles/defaults.

## Deferred (NOT on this roadmap — reserved only)

- **Smart bot reply system** — future, after the above is solid.
- **RPG game v2** — future, walled off. Schema namespace reserved, nothing built.

## Sequencing note

Phase 0 must fully land before Phase 1 — the whole point of "infra first" is that every later
feature plugs into a stable core (registry + config + logger + health + scheduler) instead of
reinventing it. That discipline is what v1 lacked.
