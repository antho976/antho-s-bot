# 11 — RPG Design (flow & seams)

> **Deferred feature — designed, not built.** The RPG game v2 is walled off (`05`, `00`). This
> doc locks its *flow and structure* so when it is built it slots into the existing seams
> (`rpg_*` namespace, `07`) without a teardown. **No content or balance here** — no XP curves,
> drop rates, class kits, or numbers. Those get decided when we build, per the deferred rule.

The job of this doc is the part that is expensive to get wrong later: the **navigation flow**,
the **combat abstraction**, and the **table shapes**. Everything else is fill-in.

## Scope (locked with the owner)

- **Combat:** solo PvE now. **Guild bosses** later are *semi-solo* — shared boss HP, but each
  player fights it solo. **PvP** later, and **not hard-locked to snapshots** — the seam supports
  both async-snapshot duels *and* real live player-vs-player.
- **Guilds:** real multiplayer clans (membership, shared bank, upgrades, guild bosses) but
  **not fully real-time co-op** — async/turn-based interaction with shared state.
- **Economy:** isolated per player now; **player trades + marketplace** are reserved seams
  (groundwork built, features later).
- **Items:** mostly resources + a few predefined-stat weapons. **Hybrid** model so rolled/affix
  items are possible later with no migration.
- **One character per player, per Discord server. Single class** now (catalog is a list, so
  multi-class later is rows, not a rewrite).

## Naming: "Guild" in the UI, `clan` in the code

The data model already uses **`guildId` for the Discord server** on every table (`03`). The RPG
group concept is a *different* thing, so it is named **`clan`** everywhere in code/tables and
**"Guild" everywhere in the UI/embeds**. This keeps `guildId` unambiguous. Non-negotiable —
renaming this later is miserable.

## Navigation flow — public hub, owner-gated, stateless router

The hub is one **public, persistent** message (everyone can see it; only the owner can drive it).

- `/rpg` posts **one message** to a dedicated channel (`rpgChannelId` config). The embed shows:
  avatar (pulled live from Discord — **never stored**), display name, level, class, an XP bar
  (text `▰▱` now; a canvas profile card is a later polish swap, `10`), HP / energy / gold, and the
  category buttons (Combat · Guild · Inventory · Shop · Quests · Options).
- Every button does `interaction.update()` — the **same message morphs** between views. No channel
  spam from navigation. Each view renders its own embed + buttons + a `rpg:…:hub` Back button.

**The route lives in the `custom_id`, not in memory:**

```
rpg:<ownerId>:<view>:<action>:<args>      e.g.  rpg:438...921:combat:attack:goblin
                                                 rpg:438...921:inventory:page:2
```

A central **router** parses it and dispatches to a view handler (one file per view). First thing
on every interaction — the **owner check**:

```ts
if (interaction.user.id !== ownerId)
  return interaction.reply({ content: `That's <@${ownerId}>'s adventure — run /rpg.`, ephemeral: true });
```

Because only the owner mutates their own public hub, navigation stays **single-writer** even
though the message is public — no contention, no ephemeral needed.

**Why this survives restarts for free:** navigation is stateless (route is in the `custom_id`),
and game state is in the DB keyed `(guildId, userId)`. A redeploy loses nothing — the next click
reads fresh DB and re-renders. Existing buttons keep working.

**Clutter control (the cost of going public):** store `lastHubMessageId` on the player; `/rpg`
deletes the previous hub before posting a new one, so the channel stays ~one message per player.
Optional idle-cleanup job disables buttons on / removes stale hubs.

**Discord mechanics baked into the router:**
- Ack within 3 s — `update()` directly for DB work; `deferUpdate()` only before external IO.
- **Pull personal, push shared:** personal screens are driven by the owner's clicks; anything that
  updates on a timer (guild-boss HP, a live PvP turn) lives in its own message refreshed by a
  **throttled tick**, never edited per-action (rate limits).
- Component cap is 5×5; long lists (inventory, shop, skills) use a **select menu + page index in
  the `custom_id`**, never button-paginated.

## Combat — one engine, many targets (the keystone seam)

**Everything you fight is a `Combatant` — a stat block — and the engine never knows where the
stat block came from.**

```ts
// pure, IO-free, target-agnostic
resolve(attacker: StatBlock, defender: StatBlock, action) → outcome
```

The defender's `StatBlock` is sourced by the encounter's **`kind` discriminator**:

| `kind` | Defender source | Concurrency | When |
|--------|-----------------|-------------|------|
| `pve` | a monster def | single-writer (solo) | built first |
| `pvp` | a player **snapshot** *or* a **live player** | mode-dependent (see below) | later |
| `guild_boss` | a boss def + a **shared HP row** | shared HP only (atomic) | later |

This is what makes the later modes **additive, not rewrites**:

- **Guild bosses are "semi-solo":** your attacks resolve solo against the boss stat block; the
  only shared write is the atomic HP decrement (`UPDATE … SET hp = hp - ? WHERE hp > 0`) plus a
  per-player contribution row for reward splitting. The public boss message refreshes on a tick.
- **PvP is not hard-locked to snapshots.** A `rpg_pvp_matches` row carries a **`mode`**:
  - `async_snapshot` — defender is a frozen `rpg_snapshots` row (fight a player "as a mob");
    single-writer, opponent need not be online. Cheap, what we'd likely ship first.
  - `live` — both sides are live players; the match row holds both HP pools, a `turnPlayerId`,
    and a `turnSeq` version. Each action is guarded (`WHERE turnPlayerId = me AND turnSeq = n`)
    then advances the turn atomically; a turn-timeout job prevents a walk-away freeze. This is the
    one mode that reintroduces two-writer state — the seam keeps it isolated to this table.

## State & performance principles

- **DB is the source of truth.** No whole-world / whole-player map in memory (kills v1's 6 GB-heap
  class of bug). Per-player row reads are cheap; 10–15 players is trivial load.
- **Lazy regen, no per-player timers.** Energy / HP / cooldowns are computed on next open
  (`min(max, stored + floor((now − lastRegenAt)/rate))`). The only scheduled work is the daily
  reset, plus guild-boss / live-PvP **ticks** when those ship.
- **Atomic writes for all shared state** — boss HP, clan bank, marketplace purchases — one guarded
  SQL statement / transaction, never read-modify-write in JS.
- **One `transfer()` primitive** moves gold/items between owners atomically; every movement writes
  an `rpg_ledger` row. The clan bank is its first user; trades and the marketplace reuse the same
  primitive + ledger later — so the economy grows as data, not surgery.

## Data model (`rpg_*`) — seams land first, features fill in

`[P1]` core loop · `[seam]` thin table / discriminator now, feature later · `[reserve]` named, empty until needed.

| Group | Table | When | Notes |
|-------|-------|------|-------|
| **Player** | `rpg_players` | P1 | guildId, userId, classId, level, xp, hp, energy, gold, lastRegenAt, **lastHubMessageId** |
| | `rpg_classes` | P1 | class catalog — single class now, but a *list* (multi-class later = rows) |
| | `rpg_skill_defs` / `rpg_player_skills` | P1 | skills exist now so **snapshots can capture them** |
| **Items** | `rpg_item_defs` | P1 | catalog: type (resource/weapon/…), `baseStatsJson`, `stackable` |
| | `rpg_inventory` | P1 | `playerId, itemDefId, qty, instanceStatsJson?, equippedSlot?` — **hybrid seam:** null instance = stackable; populated = a rolled instance later, no migration |
| **Combat** | `rpg_monster_defs` | P1 | PvE mob / boss stat blocks |
| | `rpg_encounters` | P1 | `kind (pve/pvp/guild_boss)` + defender ref + stateJson — the discriminator reserving PvP & bosses |
| | `rpg_quest_defs` / `rpg_quest_progress` | P1 | quest content + per-player progress |
| | `rpg_snapshots` | seam | `sourcePlayerId, statBlockJson, createdAt` — frozen-player-as-mob (async PvP, leaderboard defense) |
| | `rpg_pvp_matches` | seam | `mode (async_snapshot/live)`, two combatant refs, two HP pools, `turnPlayerId?`, `turnSeq` — supports async *and* live |
| **Clan** | `rpg_clans` | P1 | id, guildId, name, level, **bankGold**, createdBy |
| | `rpg_clan_members` | P1 | clanId, playerId, rank, joinedAt |
| | `rpg_clan_bank_items` | P1 | shared item bank — first consumer of `transfer()` |
| | `rpg_clan_upgrades` | seam | clanId, upgradeId, level (guild-wide progression) |
| | `rpg_clan_bosses` / `rpg_clan_boss_contrib` | seam | shared HP pool + per-player damage for reward split |
| **Economy** | `transfer()` primitive | P1 | one atomic txn moving gold/items between owners |
| | `rpg_ledger` | P1 (thin) | every gold/item movement logged — audit now, spine for trades + market later |
| | `rpg_trades` | reserve | offer/accept — reuses `transfer()` + ledger |
| | `rpg_market_listings` | reserve | listings board — reuses `transfer()` + ledger |

## Module layout (the standard feature template, `09`)

```
server/features/rpg/
  index.ts        toggle, default config, registers /rpg + the interaction router
  config.ts       tunables (regen rate, cooldowns, drop/loot config) — dashboard-editable
  schema.ts       rpg_* + rpg_clan_* tables (re-exported from db/schema)
  router.ts       custom_id → view dispatch + owner check  ← the hub/spoke core
  service.ts      orchestration
  views/          hub · combat · guild · inventory · shop · quests · options (one file each)
  domain/         pure, testable: combat-engine · stat-block · loot-table · regen · xp-curve
  commands/       /rpg
  events/         interaction handler → router.ts
  jobs/           daily-reset (P1) · guild-boss-tick / pvp-turn-timeout (seam)
  api.ts          dashboard config endpoints
```

`domain/` is IO-free so the combat engine, stat-block builder, and regen formula are unit-tested
in isolation — the structural fix for v1's untestable RPG sprawl.

## Build order (within the RPG, once it leaves "deferred")

All four rebuild-risk seams land in **P1** — combatant abstraction + `kind`, hybrid inventory,
`transfer()` + ledger, clan tables with the shared-HP boss shape — so later phases never migrate
the spine:

1. **P1 — core loop:** hub + router + owner check, players/classes/skills, hybrid items, solo PvE
   combat, quests, clans + membership + shared bank (on `transfer()`).
2. **Guild bosses:** `rpg_clan_bosses` + contributions + tick.
3. **PvP:** `async_snapshot` first; `live` mode is additive on the same match table.
4. **Economy:** trades, then marketplace — both on the existing `transfer()` + ledger.

## Deliberately NOT designed yet (YAGNI)

Real-time co-op combat, cross-server (global) RPG progression, multiple characters per player, and
all balance/content. Each is cheap to add on top of the seams above *if* we ever want it.
