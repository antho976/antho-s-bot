import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const now = () => new Date();
const ts = (n: string) => integer(n, { mode: "timestamp_ms" });

/** Per-member XP/level state. */
export const levels = sqliteTable(
  "levels",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    xp: integer("xp").notNull().default(0),
    level: integer("level").notNull().default(0),
    prestige: integer("prestige").notNull().default(0),
    voiceMinutes: integer("voice_minutes").notNull().default(0),
    lastMessageAt: ts("last_message_at"),
    updatedAt: ts("updated_at").$defaultFn(now),
  },
  (t) => [
    uniqueIndex("levels_guild_user").on(t.guildId, t.userId),
    index("levels_guild_xp").on(t.guildId, t.xp),
  ],
);

/** One leveling config row per guild (the dashboard's knobs). */
export const levelConfig = sqliteTable("level_config", {
  guildId: text("guild_id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  xpMsgMin: integer("xp_msg_min").notNull().default(15),
  xpMsgMax: integer("xp_msg_max").notNull().default(25),
  msgCooldownSec: integer("msg_cooldown_sec").notNull().default(60),
  xpPerVoiceMin: integer("xp_per_voice_min").notNull().default(5),
  xpPerReaction: integer("xp_per_reaction").notNull().default(0),
  curveType: text("curve_type").notNull().default("multiplier"), // 'multiplier' | 'custom'
  curveBase: integer("curve_base").notNull().default(100),
  curveFactor: real("curve_factor").notNull().default(1.2),
  announce: integer("announce", { mode: "boolean" }).notNull().default(true),
  announceChannelId: text("announce_channel_id"),
  voiceRequireActive: integer("voice_require_active", { mode: "boolean" })
    .notNull()
    .default(true),
  updatedAt: ts("updated_at").$defaultFn(now),
});

/** Optional role granted when a member reaches a level. */
export const levelRewards = sqliteTable(
  "level_rewards",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    level: integer("level").notNull(),
    roleId: text("role_id").notNull(),
  },
  (t) => [uniqueIndex("level_rewards_guild_level").on(t.guildId, t.level)],
);

/** Custom XP-per-level overrides (used when curveType = 'custom'). */
export const levelCurve = sqliteTable(
  "level_curve",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    level: integer("level").notNull(),
    xpRequired: integer("xp_required").notNull(),
  },
  (t) => [uniqueIndex("level_curve_guild_level").on(t.guildId, t.level)],
);
