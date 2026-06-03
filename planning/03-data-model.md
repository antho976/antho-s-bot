# 03 — Data Model (sketch)

SQLite via Drizzle. This is a **first sketch** to prove the schema covers every feature — exact
columns get finalized per feature as we build it (Phase by Phase). Principles:

- **`guildId` on every domain table** (D5) — single server now, multi-server-ready later.
- **Config in DB, secrets in env** (never store tokens here).
- **No giant blobs loaded into memory** — we query rows, not whole files (fixes v1's 6 GB heap).
- **Reserved namespaces** for deferred features: tables for the future RPG use an `rpg_` prefix,
  smart-reply uses `smartreply_` — none built now, just reserved so they don't surprise us.
- Small, flexible settings can live in a JSON column; anything we query/aggregate gets real columns.
- **All timestamps stored in UTC.** Schedules also keep a display timezone. (Cheap now; timezone
  bugs are miserable to retrofit — see `07`, seam 14.)
- **Discriminator over duplication.** Anything with a category gets a type column (`platform`,
  `eventType`, target kind) so a new case is a new row, not new code (see `07`).

## Core / infrastructure

| Table | Purpose | Key fields |
|-------|---------|-----------|
| `guilds` | the server(s) we serve | id, name, joinedAt |
| `feature_toggles` | on/off + config per feature per guild | guildId, featureKey, enabled, configJson |
| `accounts` | dashboard users | discordId, username, avatar, accessLevel |
| `sessions` | dashboard login sessions (or JWT, TBD) | id, accountId, expiresAt |
| `audit_log` | every dashboard change | guildId, actorId, action, target, before, after, ts |
| `logs` | bot logs for the Logs page | ts, level, source, message, metaJson |
| `command_usage` | command stats (a rollup view fed by analytics) | guildId, command, userId, ts |
| `analytics_events` | raw tracked events, short retention/rotated (see `08`) | guildId, eventType, propsJson, ts |
| `analytics_daily` | pre-aggregated daily counters, tiny + permanent | guildId, metric, day, dimsJson, count |
| `scheduled_tasks` | persisted jobs (survive restarts) | type, runAt/cron, payloadJson, status |
| `backups` | backup snapshots metadata | id, createdAt, size, location |

> `logs` is append-heavy — we cap/rotate it (keep N days or N rows) and offer export, so it
> never becomes a memory or disk problem.

## Notifications (Twitch + YouTube — the core)

| Table | Purpose | Key fields |
|-------|---------|-----------|
| `stream_channels` | watched channels | guildId, platform (twitch/youtube), channelRef, displayName, enabled |
| `stream_alert_config` | per-channel alert settings | channelId, targetDiscordChannel, template, embed, pingRole, alertOnLive, alertOnEnd, alertOnUpload, alertOnShort |
| `stream_state` | current live/seen state | channelId, isLive, lastLiveAt, lastEndedAt, lastVideoId |
| `stream_events` | history (live/end/upload) | channelId, type, startedAt, endedAt, payloadJson |
| `stream_schedule` | upcoming/recurring stream times → reminders | guildId, rrule/oneOff, time, remind1h, remind10m |
| `vips` | VIP list for alerts | guildId, userId, note |

## Community — Welcome / Goodbye

| Table | Purpose |
|-------|---------|
| `welcome_config` | enabled, channel, message mode, template, art on/off, art template, goodbye equivalents |
| `welcome_backgrounds` | uploaded/random background images for the artwork |

## Community — Leveling

| Table | Purpose | Key fields |
|-------|---------|-----------|
| `levels` | per-member progress | guildId, userId, xp, level, prestige, voiceMinutes, lastMessageAt |
| `level_config` | the knobs from your spec | xpMsgMin, xpMsgMax, msgCooldownSec, xpPerVoiceMin, xpPerReaction, curveType, incrementMultiplier |
| `level_curve` | custom XP-per-level table (when curveType=custom) | level, xpRequired |
| `level_rewards` | role rewards at levels (optional) | level, roleId |

## Community — Events

| Table | Purpose |
|-------|---------|
| `giveaways` | prize, durationMin, winners, channel, pingRole, createdBy, minLevel, embedJson, status, endsAt, messageId |
| `giveaway_entries` | giveawayId, userId |
| `giveaway_rules` | exclusions / eligibility (roles, min level, etc.) |
| `polls` | question, optionsJson, channel, multiSelect, endsAt, status, messageId |
| `poll_votes` | pollId, userId, optionIndex |
| `birthdays` | userId, month, day (lowest priority) |

## Community — Pets (Idleon)

| Table | Purpose |
|-------|---------|
| `pets` | giveaway/pet records |
| `pet_approvals` | submission, status, reviewedBy, reviewedAt (approvals + history) |

> v1 stored Idleon data in Firebase via `idleon-firebase.js`. We keep an **adapter boundary**
> so the Idleon data source (external API / Firebase / scrape) is pluggable and isolated.

## Community — Auto-mod

| Table | Purpose | Key fields |
|-------|---------|-----------|
| `automod_rules` | rules + actions | guildId, type (spam/scam/links/invites/words/mentions/caps/raids), configJson, action, enabled |
| `automod_actions` | enforcement history | guildId, userId, ruleType, action, ts, context |
| `scam_signatures` | known scam domains/patterns (the "even better with scams" goal) | pattern, source, updatedAt |

## Community — Support & Feedback

| Table | Purpose |
|-------|---------|
| `tickets` | userId, category (auto-classified), priority, status, channelId, createdAt |
| `ticket_messages` | ticketId, authorId, content, ts |
| `feedback` | userId, content, category, ts |

## Community — Reaction Roles

| Table | Purpose |
|-------|---------|
| `reaction_role_messages` | guildId, channelId, messageId, mode (toggle/unique/verify) |
| `reaction_role_map` | messageId, emoji, roleId |

## Community — Member Logs

| Table | Purpose |
|-------|---------|
| `member_log_config` | which events are logged + target channel (all toggleable) |
| `member_events` | type (join/leave/ban/kick/nick/role/msg-delete/msg-edit/...), userId, dataJson, ts |
| `member_growth` | daily member counts for stats/graphs |

## Community — Highlights (Starboard)

| Table | Purpose |
|-------|---------|
| `starboard_config` | star emoji, threshold (X stars), target channel, ignored channels |
| `starboard_posts` | originalMessageId, starboardMessageId, starCount |

## Community — Tags / Custom Commands

| Table | Purpose | Key fields |
|-------|---------|-----------|
| `custom_commands` | the `!name` commands | guildId, name, responseText, imageUrl, embed, autoDeleteSec, maxUses, usesCount, cooldownSec, allowedRoles, allowedChannels, createdBy |
| `custom_command_uses` | usage tracking for limits/stats | commandId, userId, ts |

## Scheduled messages (Overview quick actions + general)

| Table | Purpose |
|-------|---------|
| `scheduled_messages` | content, channel, runAt/recurring, createdBy, status (backs reminders + scheduled posts) |

## Headroom seams (thin now, ready to grow — see `07`)

| Table | Purpose | Why now |
|-------|---------|---------|
| `linked_accounts` | discordId ↔ twitchId ↔ youtubeId identity links | unlocks "subs get a role", VIP auto-roles, sub-only perks later — painful to backfill if not reserved |
| `alert_targets` | delivery targets per alert (kind: channel/DM/webhook, ref) | model delivery as a list-of-one now → multi-channel / DM VIPs / webhooks later is data, not a rewrite |

> Storage of uploaded media (welcome backgrounds, custom-command images) goes through a
> **storage interface** (local disk now → R2/S3 later), so the DB stores a storage key, not a
> hardcoded local path.

## Reserved (deferred — built later, reserved now)

| Prefix | For |
|--------|-----|
| `rpg_*` | the RPG game v2 (worlds, players, balance, crafting, quests…) — **not built now** |
| `smartreply_*` | the smart bot reply system — **not built now** |

## Maintenance actions (operations, not tables)

"Reset daily", "Reset live", "Reset schedule" are dashboard operations that clear/zero specific
tables (e.g. daily counters, `stream_state`, `stream_schedule`). Every run is recorded in
`audit_log`.
