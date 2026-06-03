import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

const now = () => new Date();
const ts = (n: string) => integer(n, { mode: "timestamp_ms" });

/** A giveaway. Entry is via the 🎉 reaction on its message; the scheduler ends it at endsAt. */
export const giveaways = sqliteTable(
  "giveaways",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    messageId: text("message_id"),
    prize: text("prize").notNull(),
    winnersCount: integer("winners_count").notNull().default(1),
    endsAt: ts("ends_at").notNull(),
    pingRoleId: text("ping_role_id"),
    minLevel: integer("min_level").notNull().default(0),
    createdBy: text("created_by"),
    status: text("status").notNull().default("active"), // active | ended | cancelled
    winnersJson: text("winners_json"),
    createdAt: ts("created_at").$defaultFn(now),
    endedAt: ts("ended_at"),
  },
  (t) => [index("giveaways_status_ends").on(t.status, t.endsAt)],
);

export const giveawayEntries = sqliteTable(
  "giveaway_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    giveawayId: integer("giveaway_id").notNull(),
    userId: text("user_id").notNull(),
    createdAt: ts("created_at").$defaultFn(now),
  },
  (t) => [uniqueIndex("giveaway_entries_unique").on(t.giveawayId, t.userId)],
);
