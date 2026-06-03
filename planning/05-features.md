# 05 — Feature Specs

Your full list, organized by dashboard section, each as a feature module with a toggle (D9).
This is the "what each screen does" reference. Details marked ❓ are tracked in `06`.

---

## CORE

### Overview page
A glanceable home screen + quick actions.

- **Quick actions:** VIPs, **fake live**, **fake end**, send stream reminders (1 h, 10 min).
- **Maintenance:** reset daily, reset live, reset schedule.
- At-a-glance: live status, next scheduled stream, key counts.

### Bot Health
Real telemetry from the health service:
- Uptime, memory usage.
- APIs status (Discord, Twitch, YouTube) — reachable / authed / quota.
- Features & connections (which modules are on, gateway/webhook connectivity).
- Systems, runtime & environment (node version, host, region).
- Storage (DB size, disk).
- Recent errors & warnings.
- Quick stats.

### Logs
- Export, clear, **live-feed** toggle (WebSocket), filters (level, source, text).
- Backed by `logs` table with rotation so it can't bloat memory/disk.

### Analytics *(built later — captured from day one)*
- Growth & churn, engagement trends, **stream impact** ("did going live bring people in?"),
  feature/command usage, event stats — with date ranges + CSV export.
- Data is tracked from Phase 0 via the `track()` layer; this page just visualizes it. See `08`.

---

## COMMUNITY

### Welcome (& Goodbye)
- Welcome message (text).
- **Custom artwork** with member name + profile picture rendered on an image (canvas).
- Message modes + target channel.
- Quick templates for both plain bot messages and custom artwork.
- Goodbye = same capabilities as welcome.
- **Random background** welcome picture option + ability to add your own images.

### Leveling
- Server leveling overview.
- Level leaderboard.
- Prestige.
- Settings: XP per message (min), XP per message (max), message cooldown (seconds),
  XP per voice minute, XP per reaction.
- XP-per-level: **increment multiplier** OR **custom XP per level** table.
- (Optional) role rewards at levels — ❓ confirm if wanted.

### Events
- **Giveaways:** prize, duration (min), winners; advanced: embed, channel, ping role,
  created-by, min level; exclusion & eligibility rules.
- **Polls.**
- **Birthdays** (last priority).

### YouTube alerts
- Alerts for new **videos** and **shorts** (configurable separately).
- (Lives in the notification engine; surfaced here in the dashboard.)

### Pets
- Idleon pets giveaway.
- Pet approvals and history.

### Auto-mod
- On par with Discord's native automod, and **better at catching scams** (scam signature list,
  link/domain analysis).
- Everything toggleable.

### Support & feedback
- Tickets with **auto-classification** into priority/category.

### Reaction roles
- Assign roles via reactions; modes (toggle / unique / verify). Everything toggleable.

### Member logs
- Log basically every server event possible, each with on/off toggles, to a log channel.

### Highlights
- **X stars** on a post → it gets saved into a custom highlights channel (starboard).
- Configurable threshold, emoji, target channel, ignored channels.

### Tags & custom commands
- Custom `!name` commands that post pictures with text.
- Per command: auto-delete after X seconds or X uses, cooldown, embed toggle,
  allowed roles, allowed channels, image URL or uploaded image.

---

## GENERAL

- **Commands** — reference of all bot commands.
- **Bot config** — global/server settings.
- **Export** — export data/config.
- **Backups** — create / download / restore (deliberate, replacing v1's ad-hoc JSON backups).
- **Accounts & login** — manage who can access the dashboard and at what level.

---

## DEFERRED (reserved, not built)

- **Smart bot reply system** (v1 `guidance-engine` / `smartbot`) — future.
- **RPG game v2** (v1 worlds/crafting/quests/bounties sprawl) — future, walled off.

---

## Toggle model

Every feature above has:
1. An **enabled** switch (off by default for optional features).
2. Its own **config** object, edited in the dashboard, hot-reloaded by the bot.
3. Its own **DB tables** (see `03`), loaded only when enabled.

This is the structural fix for v1's scope creep: a feature can be fully turned off and it
contributes nothing — no listeners, no memory, no risk to the rest.
