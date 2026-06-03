import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { welcomeBackgrounds, welcomeConfig } from "@/server/db/schema";

export type WelcomeConfig = typeof welcomeConfig.$inferSelect;
export type WelcomeBackground = typeof welcomeBackgrounds.$inferSelect;

export function defaultConfig(guildId: string): WelcomeConfig {
  return {
    guildId,
    welcomeEnabled: false,
    welcomeChannelId: null,
    welcomeMode: "both",
    welcomeMessage: "Welcome {user} to {server}!",
    goodbyeEnabled: false,
    goodbyeChannelId: null,
    goodbyeMode: "text",
    goodbyeMessage: "{username} just left the server.",
    randomBackground: true,
    updatedAt: null,
  };
}

export async function getConfig(guildId: string): Promise<WelcomeConfig> {
  const rows = await db
    .select()
    .from(welcomeConfig)
    .where(eq(welcomeConfig.guildId, guildId))
    .limit(1);
  return rows[0] ?? defaultConfig(guildId);
}

export async function saveConfig(
  guildId: string,
  patch: Partial<typeof welcomeConfig.$inferInsert>,
): Promise<WelcomeConfig> {
  const rows = await db
    .insert(welcomeConfig)
    .values({ guildId, ...patch, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: welcomeConfig.guildId,
      set: { ...patch, updatedAt: new Date() },
    })
    .returning();
  return rows[0];
}

export function listBackgrounds(guildId: string) {
  return db
    .select()
    .from(welcomeBackgrounds)
    .where(eq(welcomeBackgrounds.guildId, guildId));
}

export async function addBackground(guildId: string, url: string, kind: string) {
  const rows = await db
    .insert(welcomeBackgrounds)
    .values({ guildId, url, kind })
    .returning();
  return rows[0];
}

export async function removeBackground(id: number) {
  await db.delete(welcomeBackgrounds).where(eq(welcomeBackgrounds.id, id));
}

/** Pick a background URL for a card, or null to use the gradient fallback. */
export async function pickBackground(
  guildId: string,
  kind: "welcome" | "goodbye",
  random: boolean,
): Promise<string | null> {
  const rows = await db
    .select()
    .from(welcomeBackgrounds)
    .where(
      and(
        eq(welcomeBackgrounds.guildId, guildId),
        inArray(welcomeBackgrounds.kind, [kind, "both"]),
      ),
    );
  if (rows.length === 0) return null;
  if (!random) return rows[0].url;
  return rows[Math.floor(Math.random() * rows.length)].url;
}
