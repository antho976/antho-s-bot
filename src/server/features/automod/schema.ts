import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

const now = () => new Date();
const ts = (n: string) => integer(n, { mode: "timestamp_ms" });
const bool = (n: string, def: boolean) =>
  integer(n, { mode: "boolean" }).notNull().default(def);

/**
 * Scam/phishing protection config (we deliberately do NOT duplicate Discord's native automod
 * for spam / mentions / keyword filters — only the scam gap it handles poorly).
 */
export const automodConfig = sqliteTable("automod_config", {
  guildId: text("guild_id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  deleteMessage: bool("delete_message", true),
  timeoutUser: bool("timeout_user", true),
  timeoutMinutes: integer("timeout_minutes").notNull().default(60),
  logChannelId: text("log_channel_id"),
  checkBlocklist: bool("check_blocklist", true),
  checkTyposquats: bool("check_typosquats", true), // discord/steam lookalike domains
  checkScamPhrases: bool("check_scam_phrases", true), // "free nitro" + a link, etc.
  updatedAt: ts("updated_at").$defaultFn(now),
});

/** User-maintained scam domains (matched exactly or as a parent domain). */
export const automodBlocklist = sqliteTable(
  "automod_blocklist",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    domain: text("domain").notNull(),
    note: text("note"),
    createdAt: ts("created_at").$defaultFn(now),
  },
  (t) => [index("automod_blocklist_guild").on(t.guildId)],
);

/** History of enforcement actions. */
export const automodActions = sqliteTable(
  "automod_actions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    userId: text("user_id"),
    rule: text("rule").notNull(),
    action: text("action").notNull(),
    snippet: text("snippet"),
    createdAt: ts("created_at").$defaultFn(now),
  },
  (t) => [index("automod_actions_guild_created").on(t.guildId, t.createdAt)],
);
