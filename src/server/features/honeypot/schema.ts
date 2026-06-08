import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

const now = () => new Date();
const ts = (n: string) => integer(n, { mode: "timestamp_ms" });
const bool = (n: string, def: boolean) =>
  integer(n, { mode: "boolean" }).notNull().default(def);

/**
 * Honeypot trap: channel(s) nobody legitimate should post in. A non-exempt member who does
 * is muted, has their recent messages purged server-wide, and a configurable ping is fired.
 * `channelIds` / `exemptRoleIds` are JSON arrays of IDs (stored as text, parsed in queries).
 */
export const honeypotConfig = sqliteTable("honeypot_config", {
  guildId: text("guild_id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  channelIds: text("channel_ids").notNull().default("[]"), // JSON string[] — the trap channels

  // Mute (discriminator: "role" = stays forever, "timeout" = native, auto-expires)
  muteMode: text("mute_mode").notNull().default("role"),
  muteRoleId: text("mute_role_id"), // used when muteMode = "role"
  timeoutMinutes: integer("timeout_minutes").notNull().default(40320), // Discord cap: 28 days

  // Purge: delete the offender's messages from the last N minutes, server-wide (0 = off)
  purgeLookbackMinutes: integer("purge_lookback_minutes").notNull().default(10),

  // Ping / alert (discriminator: "user" | "role" | "none")
  pingTargetType: text("ping_target_type").notNull().default("user"),
  pingTargetId: text("ping_target_id"),
  alertChannelId: text("alert_channel_id"),

  // Exemptions (staff + bots are always exempt; these are extra roles)
  exemptRoleIds: text("exempt_role_ids").notNull().default("[]"), // JSON string[]

  // Extra actions (both off by default)
  alsoBan: bool("also_ban", false),
  dmUser: bool("dm_user", false),
  dmMessage: text("dm_message"),

  updatedAt: ts("updated_at").$defaultFn(now),
});

/** History of trips, shown on the dashboard and for an audit trail. */
export const honeypotActions = sqliteTable(
  "honeypot_actions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    userId: text("user_id"),
    channelId: text("channel_id"), // the trap channel that was tripped
    action: text("action").notNull(), // human summary, e.g. "muted (role), purged 12, banned"
    purged: integer("purged").notNull().default(0),
    snippet: text("snippet"),
    createdAt: ts("created_at").$defaultFn(now),
  },
  (t) => [index("honeypot_actions_guild_created").on(t.guildId, t.createdAt)],
);
