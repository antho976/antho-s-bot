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
    lastRegenAt: ts("last_regen_at"),
    lastAdventureAt: ts("last_adventure_at"), // adventure cooldown (lazy check, no timer)
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
