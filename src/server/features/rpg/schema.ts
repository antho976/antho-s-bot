import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

// RPG v2 — see planning/11-rpg-design.md. All tables use the `rpg_` prefix (planning/03).
// `guildId` = Discord server (never the in-game "clan"). Timestamps are epoch-ms (UTC).
const now = () => new Date();
const ts = (n: string) => integer(n, { mode: "timestamp_ms" });

/** Per-guild RPG settings + toggle. Off by default (optional feature). */
export const rpgConfig = sqliteTable("rpg_config", {
  guildId: text("guild_id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  channelId: text("channel_id"), // dedicated #rpg channel (not yet enforced)
  updatedAt: ts("updated_at").$defaultFn(now),
});

/**
 * One character per player, per guild. `hp` is the current value; its max is derived from
 * class + level (domain/stats). `lastRegenAt` drives lazy hp regen on read — no
 * background per-player timers (planning/11). `lastHub*` lets a fresh /rpg replace the old board.
 */
export const rpgPlayers = sqliteTable(
  "rpg_players",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    name: text("name"), // optional custom character name; falls back to Discord display name
    classId: text("class_id").notNull().default("adventurer"),
    level: integer("level").notNull().default(1),
    xp: integer("xp").notNull().default(0),
    hp: integer("hp").notNull().default(0),
    gold: integer("gold").notNull().default(0),
    equippedWeaponId: integer("equipped_weapon_id"), // rpg_inventory.id of the equipped weapon (null = none)
    toolTier: integer("tool_tier").notNull().default(0), // owned multitool tier (0 = bare hands)
    // Active idle-gathering session (one at a time). Drops are computed lazily on collect from
    // gatherStartedAt, no timer. Null skill/area = not gathering.
    gatherSkillId: text("gather_skill_id"),
    gatherAreaId: text("gather_area_id"),
    gatherStartedAt: ts("gather_started_at"),
    lastRegenAt: ts("last_regen_at"),
    lastAdventureAt: ts("last_adventure_at"), // last adventure (kept for stats; gating is charges now)
    // Adventure charges (stack up to RPG.maxAdventureCharges). `adventureChargeAt` anchors the lazy
    // refill clock for the next charge; computed on read, no timers. Start full so nobody waits on rollout.
    adventureCharges: integer("adventure_charges").notNull().default(5),
    adventureChargeAt: ts("adventure_charge_at"),
    // Active turn-based multi-mob encounter (one at a time), JSON. Null = no fight in progress.
    adventureEncounterJson: text("adventure_encounter_json"),
    lastHubChannelId: text("last_hub_channel_id"),
    lastHubMessageId: text("last_hub_message_id"),
    createdAt: ts("created_at").$defaultFn(now),
    updatedAt: ts("updated_at").$defaultFn(now),
  },
  (t) => [uniqueIndex("rpg_players_guild_user").on(t.guildId, t.userId)],
);

/**
 * Player inventory. `itemId` references the code ITEMS catalog (config). Stackables (keys,
 * resources) keep one row with `qty`; `instanceStatsJson` is the hybrid seam (planning/11) — when
 * populated it's a rolled, non-stacking instance (e.g. a weapon), so those become separate rows.
 */
export const rpgInventory = sqliteTable(
  "rpg_inventory",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    playerId: integer("player_id").notNull(),
    itemId: text("item_id").notNull(),
    qty: integer("qty").notNull().default(0),
    instanceStatsJson: text("instance_stats_json"),
    createdAt: ts("created_at").$defaultFn(now),
    updatedAt: ts("updated_at").$defaultFn(now),
  },
  (t) => [index("rpg_inventory_player").on(t.playerId)],
);

/** Allocated skill-tree nodes (PoE-style). `nodeId` references the code tree (skills/trees). */
export const rpgPlayerSkills = sqliteTable(
  "rpg_player_skills",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    playerId: integer("player_id").notNull(),
    nodeId: text("node_id").notNull(),
    rank: integer("rank").notNull().default(1),
    createdAt: ts("created_at").$defaultFn(now),
  },
  (t) => [uniqueIndex("rpg_player_skills_unique").on(t.playerId, t.nodeId)],
);

/** Per-skill gathering XP (Mining/Woodcutting/Herbalism/Fishing). Level is derived from xp. */
export const rpgGathering = sqliteTable(
  "rpg_gathering",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    playerId: integer("player_id").notNull(),
    skillId: text("skill_id").notNull(),
    xp: integer("xp").notNull().default(0),
    createdAt: ts("created_at").$defaultFn(now),
    updatedAt: ts("updated_at").$defaultFn(now),
  },
  (t) => [uniqueIndex("rpg_gathering_player_skill").on(t.playerId, t.skillId)],
);

/** Allocated gathering-talent ranks, per player per skill. Points to spend = that skill's level. */
export const rpgGatherTalents = sqliteTable(
  "rpg_gather_talents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    playerId: integer("player_id").notNull(),
    skillId: text("skill_id").notNull(),
    nodeId: text("node_id").notNull(),
    rank: integer("rank").notNull().default(1),
  },
  (t) => [uniqueIndex("rpg_gather_talents_unique").on(t.playerId, t.skillId, t.nodeId)],
);

/** Per-profession XP (Blacksmithing, etc.). Level is derived from xp, like gathering. */
export const rpgProfessions = sqliteTable(
  "rpg_professions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    playerId: integer("player_id").notNull(),
    profId: text("prof_id").notNull(),
    xp: integer("xp").notNull().default(0),
    createdAt: ts("created_at").$defaultFn(now),
    updatedAt: ts("updated_at").$defaultFn(now),
  },
  (t) => [uniqueIndex("rpg_professions_player_prof").on(t.playerId, t.profId)],
);

/**
 * One active dungeon run per player (active, turn-based combat). The whole run — current room, both
 * HP pools, blade coating, ability cooldowns, accrued loot, log — lives in `stateJson` (shape:
 * domain/dungeon.RunState), so a click loads it, applies one round, and saves. Deleted on
 * win/loss/flee. Stateless router + DB-as-truth: the run survives restarts (planning/11).
 */
export const rpgDungeonRuns = sqliteTable(
  "rpg_dungeon_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    playerId: integer("player_id").notNull(),
    dungeonId: text("dungeon_id").notNull(),
    stateJson: text("state_json").notNull(),
    createdAt: ts("created_at").$defaultFn(now),
    updatedAt: ts("updated_at").$defaultFn(now),
  },
  (t) => [uniqueIndex("rpg_dungeon_runs_player").on(t.playerId)],
);
