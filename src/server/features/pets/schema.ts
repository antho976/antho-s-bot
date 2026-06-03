import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

const now = () => new Date();
const ts = (n: string) => integer(n, { mode: "timestamp_ms" });

/**
 * Pet submissions awaiting mod approval (+ history). The Idleon-specific data source/giveaway
 * integration is deferred — this is the generic approval workflow.
 */
export const petSubmissions = sqliteTable(
  "pet_submissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    petName: text("pet_name").notNull(),
    note: text("note"),
    imageUrl: text("image_url"),
    status: text("status").notNull().default("pending"), // pending | approved | denied
    reviewedBy: text("reviewed_by"),
    reviewedAt: ts("reviewed_at"),
    createdAt: ts("created_at").$defaultFn(now),
  },
  (t) => [index("pet_submissions_guild_status").on(t.guildId, t.status)],
);
