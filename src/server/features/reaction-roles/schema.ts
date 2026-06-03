import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

const now = () => new Date();
const ts = (n: string) => integer(n, { mode: "timestamp_ms" });

/** A reaction-role panel — one Discord message the bot owns. mode: toggle | unique | verify. */
export const reactionRolePanels = sqliteTable(
  "reaction_role_panels",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    messageId: text("message_id").notNull(),
    title: text("title"),
    mode: text("mode").notNull().default("toggle"),
    createdAt: ts("created_at").$defaultFn(now),
  },
  (t) => [uniqueIndex("rr_panels_message").on(t.messageId)],
);

/** emoji → role mapping, keyed by the panel's Discord message id for fast reaction lookup. */
export const reactionRolePairs = sqliteTable(
  "reaction_role_pairs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    messageId: text("message_id").notNull(),
    emoji: text("emoji").notNull(), // unicode char OR custom emoji id
    roleId: text("role_id").notNull(),
    label: text("label"),
  },
  (t) => [index("rr_pairs_message").on(t.messageId)],
);
