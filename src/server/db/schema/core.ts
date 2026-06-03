import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// All timestamps are stored as epoch-ms integers = inherently UTC
// (planning/07 seam 14). `$defaultFn(() => new Date())` stamps on insert.
const now = () => new Date();
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" }).$defaultFn(now);

/** The Discord server(s) we serve. Single guild now; guildId is on every table for later. */
export const guilds = sqliteTable("guilds", {
  id: text("id").primaryKey(), // discord guild snowflake
  name: text("name"),
  joinedAt: integer("joined_at", { mode: "timestamp_ms" }).$defaultFn(now),
});

/** Dashboard users (logged in via Discord). accessLevel gates what they can see/do. */
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(), // discord user snowflake
  username: text("username").notNull(),
  avatar: text("avatar"),
  accessLevel: text("access_level").notNull().default("viewer"), // owner|admin|mod|viewer
  createdAt: createdAt(),
});

/** On/off + config per feature per guild. Disabled features load nothing. */
export const featureToggles = sqliteTable(
  "feature_toggles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    featureKey: text("feature_key").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
    configJson: text("config_json"),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(now),
  },
  (t) => [uniqueIndex("feature_toggles_guild_key").on(t.guildId, t.featureKey)],
);

/** Global dashboard preferences, one row per key (e.g. accent color). */
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(now),
});

/** Every dashboard change, for the audit log (who/what/when/before/after). */
export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id"),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    target: text("target"),
    beforeJson: text("before_json"),
    afterJson: text("after_json"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_log_created").on(t.createdAt)],
);

/** Structured bot logs (Logs page). Rotated by retention so it can't bloat. */
export const logs = sqliteTable(
  "logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    level: text("level").notNull(), // debug|info|warn|error
    source: text("source").notNull(),
    message: text("message").notNull(),
    metaJson: text("meta_json"),
    createdAt: createdAt(),
  },
  (t) => [index("logs_created").on(t.createdAt), index("logs_level").on(t.level)],
);

/** Persisted jobs so reminders/resets/etc. survive restarts (the Scheduler reads these). */
export const scheduledTasks = sqliteTable(
  "scheduled_tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type").notNull(),
    runAt: integer("run_at", { mode: "timestamp_ms" }),
    cron: text("cron"),
    payloadJson: text("payload_json"),
    status: text("status").notNull().default("pending"), // pending|done|failed
    createdAt: createdAt(),
  },
  (t) => [
    index("scheduled_tasks_status").on(t.status),
    index("scheduled_tasks_run_at").on(t.runAt),
  ],
);
