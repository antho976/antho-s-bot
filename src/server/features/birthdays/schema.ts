import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

const now = () => new Date();
const ts = (n: string) => integer(n, { mode: "timestamp_ms" });

export const birthdayConfig = sqliteTable("birthday_config", {
  guildId: text("guild_id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  channelId: text("channel_id"),
  roleId: text("role_id"), // optional "birthday" role for the day
  lastRunDay: text("last_run_day"), // YYYY-MM-DD (UTC) — run-once-per-day guard
  updatedAt: ts("updated_at").$defaultFn(now),
});

export const birthdays = sqliteTable(
  "birthdays",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    month: integer("month").notNull(),
    day: integer("day").notNull(),
  },
  (t) => [
    uniqueIndex("birthdays_guild_user").on(t.guildId, t.userId),
    index("birthdays_guild_md").on(t.guildId, t.month, t.day),
  ],
);
