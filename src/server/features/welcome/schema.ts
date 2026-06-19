import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

const now = () => new Date();
const ts = (n: string) => integer(n, { mode: "timestamp_ms" });

/** One welcome/goodbye config row per guild. mode: 'text' | 'image' | 'both'. */
export const welcomeConfig = sqliteTable("welcome_config", {
  guildId: text("guild_id").primaryKey(),

  welcomeEnabled: integer("welcome_enabled", { mode: "boolean" }).notNull().default(false),
  welcomeChannelId: text("welcome_channel_id"),
  welcomeMode: text("welcome_mode").notNull().default("both"),
  welcomeMessage: text("welcome_message").notNull().default("Welcome {user} to {server}!"),

  goodbyeEnabled: integer("goodbye_enabled", { mode: "boolean" }).notNull().default(false),
  goodbyeChannelId: text("goodbye_channel_id"),
  goodbyeMode: text("goodbye_mode").notNull().default("text"),
  goodbyeMessage: text("goodbye_message").notNull().default("{username} just left the server."),

  // Auto-role: roles handed to every member on join. JSON-encoded string[] of role IDs.
  autoRoleEnabled: integer("auto_role_enabled", { mode: "boolean" }).notNull().default(false),
  autoRoleIds: text("auto_role_ids").notNull().default("[]"),

  randomBackground: integer("random_background", { mode: "boolean" }).notNull().default(true),
  updatedAt: ts("updated_at").$defaultFn(now),
});

/** Background images for the artwork. kind: 'welcome' | 'goodbye' | 'both'. */
export const welcomeBackgrounds = sqliteTable(
  "welcome_backgrounds",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    url: text("url").notNull(),
    kind: text("kind").notNull().default("both"),
    createdAt: ts("created_at").$defaultFn(now),
  },
  (t) => [index("welcome_backgrounds_guild").on(t.guildId)],
);
