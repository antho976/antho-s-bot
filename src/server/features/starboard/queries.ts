import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { starboardConfig, starboardPosts } from "@/server/db/schema";

export type StarboardConfig = typeof starboardConfig.$inferSelect;
export type StarboardPost = typeof starboardPosts.$inferSelect;

export function defaultConfig(guildId: string): StarboardConfig {
  return {
    guildId,
    enabled: false,
    emoji: "⭐",
    threshold: 3,
    channelId: null,
    selfStar: false,
    updatedAt: null,
  };
}

export async function getConfig(guildId: string): Promise<StarboardConfig> {
  const rows = await db
    .select()
    .from(starboardConfig)
    .where(eq(starboardConfig.guildId, guildId))
    .limit(1);
  return rows[0] ?? defaultConfig(guildId);
}

export async function saveConfig(
  guildId: string,
  patch: Partial<typeof starboardConfig.$inferInsert>,
): Promise<StarboardConfig> {
  const rows = await db
    .insert(starboardConfig)
    .values({ guildId, ...patch, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: starboardConfig.guildId,
      set: { ...patch, updatedAt: new Date() },
    })
    .returning();
  return rows[0];
}

export async function getPost(originalMessageId: string): Promise<StarboardPost | null> {
  const rows = await db
    .select()
    .from(starboardPosts)
    .where(eq(starboardPosts.originalMessageId, originalMessageId))
    .limit(1);
  return rows[0] ?? null;
}

export async function createPost(data: typeof starboardPosts.$inferInsert): Promise<void> {
  await db.insert(starboardPosts).values(data).onConflictDoNothing();
}

export async function updateCount(originalMessageId: string, starCount: number): Promise<void> {
  await db
    .update(starboardPosts)
    .set({ starCount })
    .where(eq(starboardPosts.originalMessageId, originalMessageId));
}
