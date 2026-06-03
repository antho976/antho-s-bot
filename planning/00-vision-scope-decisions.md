# 00 — Vision, Scope & Decisions

## The vision

A Twitch + YouTube notification bot for a single Discord community, with a rich set of
community-engagement features, all manageable from a web dashboard where **everything is
seeable and editable**. Built on clean, modular infrastructure that can grow without
turning into the mess v1 became.

Two big things are explicitly **deferred** (not now, not soon):
- **Smart bot reply system** (the v1 `smartbot`/`guidance-engine`).
- **RPG game v2** (the v1 `rpg-routes` + balance/bounties/crafting/quests/worlds sprawl).

The infrastructure must *leave room* for these without us building them yet.

## v1 retrospective — what we learned

From inspecting `github.com/antho976/Discord-bot`:

**What v1 got right (keep the ideas):**
- discord.js v14 — modern, correct choice. We stay on v14.
- A real web dashboard (express + socket.io) with live updates. We keep a dashboard with live feed.
- Custom welcome artwork via `@napi-rs/canvas` (name + profile picture on an image). Keep.
- Modular `/modules` layout — right instinct, poor execution.
- Schedule cards, starboard, reaction roles, automod, tickets, custom commands — all good features.

**What v1 got wrong (fix in v2):**
- **Memory:** start script used `--max-old-space-size=6144` (6 GB heap). Symptom of loading
  giant JSON blobs fully into memory. v2 uses a real DB and queries instead of loading everything.
- **JSON as a database:** 30+ JSON files in `/data` with a `/backups` folder, plus a bolted-on
  Firebase dependency once JSON stopped scaling. v2 uses SQLite from day one.
- **Scope creep:** a full RPG (worlds, crafting, bounties, quests, guild-quests, defense-quests,
  progression-tiers) tangled into a notification bot. v2 walls features off behind clean module
  boundaries and a feature registry, so adding/removing one can't rot the rest.
- **Bad management:** many `.bak`, `.bak16`, `.bak53`, `.full`, `.bak-pre-v2` files committed
  alongside live code. v2 uses git branches, not filename backups.

## Locked decisions

These are decided. We don't re-litigate without a good reason — if we change one, we note why here.

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **TypeScript + discord.js v14** for the bot | Type safety directly attacks v1's bug/maintenance pain; shares one language with the dashboard. (You said "you pick".) |
| D2 | **SQLite + Drizzle ORM** for storage | JSON-simple (single file, ~free) but with integrity, migrations, and real queries. Drizzle over Prisma for **much lower memory** on small hosts. Solves the 6 GB-heap problem. |
| D3 | **Monolith**: bot + dashboard in one service | A Discord bot must be always-on = one paid instance is the cost floor anyway. Co-hosting the dashboard adds $0 and lets it read the bot's live state directly. Matches v1's express-in-process model you already know. |
| D4 | **Next.js + Discord OAuth** for the dashboard | Your choice. One React full-stack app, log in with Discord, role-gated admin. |
| D5 | **Single server now, multi-server-ready schema** | Every table carries `guildId` so going multi-tenant later is a smaller lift, but we only support your server now. |
| D6 | **Dockerized, host-agnostic** | Same container runs on Render ($7), an Oracle Cloud free VM, or a home box. We are not locked to Render. |
| D7 | **Target ~$7/mo**, document a free path | Render Starter instance is the reliable baseline; a genuinely-free option is documented in `02` for if you want it. |
| D8 | **Build Phase 0 first** (infra + dashboard shell) | Your call. Get the skeleton deployed and online, then slot features in one by one. |
| D9 | **Everything toggleable** | Per your spec ("basically everything possible with toggles on and off"). Every feature is a module with an on/off switch and its own config, all in the dashboard. |
| D10 | **v1 is reference-only** | We mine behaviors and ideas; we do not port v1's code. |

## Hard constraints

- **Cost-sensitive.** Low monthly cost is a real requirement, not a nice-to-have.
- **Memory-conscious.** Must run comfortably on a 512 MB–1 GB instance. No loading whole datasets into RAM.
- **One streamer now**, maybe more later — the notification system is built for N channels but tuned for 1.
- **Solo developer.** Favor simplicity, convention, and clear boundaries over cleverness.

## Open scope question

The RPG and smart-reply are deferred but their *data* and *hooks* shouldn't surprise us later.
We reserve namespaces for them in the schema (see `03`) but build nothing.
