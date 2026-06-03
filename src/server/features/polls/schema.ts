import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

const now = () => new Date();
const ts = (n: string) => integer(n, { mode: "timestamp_ms" });

/** A poll. Votes are number-emoji reactions on its message; results counted at end. */
export const polls = sqliteTable(
  "polls",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    messageId: text("message_id"),
    question: text("question").notNull(),
    optionsJson: text("options_json").notNull(), // JSON string[]
    multi: integer("multi", { mode: "boolean" }).notNull().default(false),
    endsAt: ts("ends_at"),
    status: text("status").notNull().default("active"), // active | ended
    createdBy: text("created_by"),
    createdAt: ts("created_at").$defaultFn(now),
    endedAt: ts("ended_at"),
  },
  (t) => [index("polls_status_ends").on(t.status, t.endsAt)],
);
