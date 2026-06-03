import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

const now = () => new Date();
const ts = (n: string) => integer(n, { mode: "timestamp_ms" });

/** Starboard (highlights) config per guild. */
export const starboardConfig = sqliteTable("starboard_config", {
  guildId: text("guild_id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  emoji: text("emoji").notNull().default("⭐"),
  threshold: integer("threshold").notNull().default(3),
  channelId: text("channel_id"), // highlights channel
  selfStar: integer("self_star", { mode: "boolean" }).notNull().default(false),
  updatedAt: ts("updated_at").$defaultFn(now),
});

/** A highlighted message and its mirror in the starboard channel. */
export const starboardPosts = sqliteTable(
  "starboard_posts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    originalMessageId: text("original_message_id").notNull(),
    originalChannelId: text("original_channel_id").notNull(),
    starboardMessageId: text("starboard_message_id").notNull(),
    starCount: integer("star_count").notNull().default(0),
    createdAt: ts("created_at").$defaultFn(now),
  },
  (t) => [uniqueIndex("starboard_posts_original").on(t.originalMessageId)],
);
