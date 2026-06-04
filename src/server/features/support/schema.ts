import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

const now = () => new Date();
const ts = (n: string) => integer(n, { mode: "timestamp_ms" });

/** Support config per guild. */
export const supportConfig = sqliteTable("support_config", {
  guildId: text("guild_id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  channelId: text("channel_id"), // where ticket threads are created
  staffRoleId: text("staff_role_id"), // pinged on new tickets
  updatedAt: ts("updated_at").$defaultFn(now),
});

/** A support ticket. The conversation lives in its Discord thread; this is the record. */
export const tickets = sqliteTable(
  "tickets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    number: integer("number").notNull(),
    userId: text("user_id").notNull(),
    subject: text("subject").notNull(),
    category: text("category").notNull(),
    priority: text("priority").notNull(), // urgent | high | medium | low
    status: text("status").notNull().default("open"), // open | closed
    threadId: text("thread_id"),
    createdAt: ts("created_at").$defaultFn(now),
    closedAt: ts("closed_at"),
    closedBy: text("closed_by"),
  },
  (t) => [
    index("tickets_guild_status").on(t.guildId, t.status),
    index("tickets_thread").on(t.threadId),
  ],
);

/** A member suggestion from /suggest. Lands in the Support & Feedback dashboard tab. */
export const feedback = sqliteTable(
  "feedback",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    content: text("content").notNull(),
    category: text("category").notNull().default("suggestion"),
    status: text("status").notNull().default("new"), // new | read
    createdAt: ts("created_at").$defaultFn(now),
  },
  (t) => [index("feedback_guild_created").on(t.guildId, t.createdAt)],
);
