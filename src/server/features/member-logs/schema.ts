import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

const now = () => new Date();
const ts = (n: string) => integer(n, { mode: "timestamp_ms" });
const bool = (n: string, def: boolean) =>
  integer(n, { mode: "boolean" }).notNull().default(def);

/** One member-logs config per guild — a single log channel + per-event toggles. */
export const memberLogConfig = sqliteTable("member_log_config", {
  guildId: text("guild_id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  channelId: text("channel_id"),

  logJoins: bool("log_joins", true),
  logLeaves: bool("log_leaves", true),
  logBans: bool("log_bans", true),
  logUnbans: bool("log_unbans", true),
  logNicknames: bool("log_nicknames", true),
  logRoles: bool("log_roles", true),
  logMessageEdits: bool("log_message_edits", true),
  logMessageDeletes: bool("log_message_deletes", true),
  logVoice: bool("log_voice", false),

  updatedAt: ts("updated_at").$defaultFn(now),
});

/** Recent logged events (also feeds the dashboard activity list + growth stats). */
export const memberEvents = sqliteTable(
  "member_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    type: text("type").notNull(), // join | leave | ban | unban | nickname | roles | msg_edit | msg_delete | voice
    userId: text("user_id"),
    summary: text("summary").notNull(),
    dataJson: text("data_json"),
    createdAt: ts("created_at").$defaultFn(now),
  },
  (t) => [
    index("member_events_guild_created").on(t.guildId, t.createdAt),
    index("member_events_type").on(t.type),
  ],
);

/**
 * Last-known role set per member, so a roles-updated log can diff against what we stored rather
 * than discord.js's `oldMember` cache (which is empty for uncached members → "all roles added").
 * Seeded for every member on ready and kept current on each update.
 */
export const memberRoleSnapshots = sqliteTable(
  "member_role_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    rolesJson: text("roles_json").notNull(), // JSON string[] of role IDs (excludes @everyone)
    updatedAt: ts("updated_at").$defaultFn(now),
  },
  (t) => [uniqueIndex("member_role_snap_guild_user").on(t.guildId, t.userId)],
);
