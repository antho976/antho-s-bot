import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Analytics capture layer (planning/08). Raw events are short-lived and rotated;
// analyticsDaily rollups are tiny and permanent — charts read the rollups.
const now = () => new Date();

/** Raw tracked events. Append-only, short retention, used to compute rollups + drill-down. */
export const analyticsEvents = sqliteTable(
  "analytics_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    eventType: text("event_type").notNull(), // e.g. "member.joined", "stream.alert_sent"
    propsJson: text("props_json"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(now),
  },
  (t) => [
    index("analytics_events_created").on(t.createdAt),
    index("analytics_events_type").on(t.eventType),
  ],
);

/** Pre-aggregated daily counters (UTC day). Permanent but tiny. */
export const analyticsDaily = sqliteTable(
  "analytics_daily",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    metric: text("metric").notNull(),
    day: text("day").notNull(), // YYYY-MM-DD (UTC)
    dimsJson: text("dims_json"),
    count: integer("count").notNull().default(0),
  },
  (t) => [uniqueIndex("analytics_daily_unique").on(t.guildId, t.metric, t.day)],
);
