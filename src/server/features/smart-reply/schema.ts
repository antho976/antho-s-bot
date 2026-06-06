import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

const now = () => new Date();
const ts = (n: string) => integer(n, { mode: "timestamp_ms" });
const bool = (n: string, def: boolean) =>
  integer(n, { mode: "boolean" }).notNull().default(def);

/**
 * AI chat-reply config (the deferred "smart-reply" feature). One row per guild.
 * Secrets (the OpenRouter key) live in env; everything tunable lives here, edited from
 * `/ai`. Disabled by default — nothing fires until it's turned on AND a key is set.
 */
export const smartreplyConfig = sqliteTable("smartreply_config", {
  guildId: text("guild_id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  model: text("model").notNull().default("meta-llama/llama-3.3-70b-instruct:free"),
  botName: text("bot_name").notNull().default("Assistant"),
  persona: text("persona").notNull().default(""), // who he is / how he acts
  replyChance: integer("reply_chance").notNull().default(5), // % chance on a normal message
  cooldownSeconds: integer("cooldown_seconds").notNull().default(30), // per channel, random replies
  contextMessages: integer("context_messages").notNull().default(8), // recent msgs sent as context
  maxReplyChars: integer("max_reply_chars").notNull().default(600),
  minMessageLength: integer("min_message_length").notNull().default(6), // filter: ignore shorter
  dailyCap: integer("daily_cap").notNull().default(200), // 0 = unlimited
  replyOnMention: bool("reply_on_mention", true), // always answer an @mention
  ignoreBots: bool("ignore_bots", true),
  allowedChannelsJson: text("allowed_channels_json"), // JSON string[] of channel ids; null = all
  updatedAt: ts("updated_at").$defaultFn(now),
});

/** Free-form facts the owner fills in; injected into the system prompt as the bot's "memory". */
export const smartreplyMemory = sqliteTable(
  "smartreply_memory",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    content: text("content").notNull(),
    createdAt: ts("created_at").$defaultFn(now),
  },
  (t) => [index("smartreply_memory_guild").on(t.guildId)],
);
