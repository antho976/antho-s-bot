import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

const now = () => new Date();
const ts = (n: string) => integer(n, { mode: "timestamp_ms" });

/** A `!name` custom command. allowedRoles/allowedChannels are JSON arrays of IDs (null = any). */
export const customCommands = sqliteTable(
  "custom_commands",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    name: text("name").notNull(),
    responseText: text("response_text").notNull().default(""),
    imageUrl: text("image_url"),
    embed: integer("embed", { mode: "boolean" }).notNull().default(false),
    autoDeleteSec: integer("auto_delete_sec").notNull().default(0), // 0 = don't delete
    maxUses: integer("max_uses").notNull().default(0), // 0 = unlimited
    usesCount: integer("uses_count").notNull().default(0),
    cooldownSec: integer("cooldown_sec").notNull().default(0),
    allowedRoles: text("allowed_roles"),
    allowedChannels: text("allowed_channels"),
    createdBy: text("created_by"),
    createdAt: ts("created_at").$defaultFn(now),
  },
  (t) => [uniqueIndex("custom_commands_guild_name").on(t.guildId, t.name)],
);
