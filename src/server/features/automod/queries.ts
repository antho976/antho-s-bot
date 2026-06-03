import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { automodActions, automodBlocklist, automodConfig } from "@/server/db/schema";

export type AutomodConfig = typeof automodConfig.$inferSelect;
export type BlocklistEntry = typeof automodBlocklist.$inferSelect;

export function defaultConfig(guildId: string): AutomodConfig {
  return {
    guildId,
    enabled: false,
    deleteMessage: true,
    timeoutUser: true,
    timeoutMinutes: 60,
    logChannelId: null,
    checkBlocklist: true,
    checkTyposquats: true,
    checkScamPhrases: true,
    updatedAt: null,
  };
}

export async function getConfig(guildId: string): Promise<AutomodConfig> {
  const rows = await db
    .select()
    .from(automodConfig)
    .where(eq(automodConfig.guildId, guildId))
    .limit(1);
  return rows[0] ?? defaultConfig(guildId);
}

export async function saveConfig(
  guildId: string,
  patch: Partial<typeof automodConfig.$inferInsert>,
): Promise<AutomodConfig> {
  const rows = await db
    .insert(automodConfig)
    .values({ guildId, ...patch, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: automodConfig.guildId,
      set: { ...patch, updatedAt: new Date() },
    })
    .returning();
  return rows[0];
}

export function listBlocklist(guildId: string) {
  return db.select().from(automodBlocklist).where(eq(automodBlocklist.guildId, guildId));
}

export async function getBlocklistDomains(guildId: string): Promise<string[]> {
  const rows = await listBlocklist(guildId);
  return rows.map((r) => r.domain.toLowerCase().replace(/^www\./, ""));
}

export async function addBlocklist(guildId: string, domain: string, note?: string) {
  const clean = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  const rows = await db
    .insert(automodBlocklist)
    .values({ guildId, domain: clean, note: note ?? null })
    .returning();
  return rows[0];
}

export async function removeBlocklist(id: number) {
  await db.delete(automodBlocklist).where(eq(automodBlocklist.id, id));
}

export async function recordAction(
  guildId: string,
  userId: string | null,
  rule: string,
  action: string,
  snippet?: string,
) {
  await db
    .insert(automodActions)
    .values({ guildId, userId, rule, action, snippet: snippet ?? null });
}

export function recentActions(guildId: string, limit = 30) {
  return db
    .select()
    .from(automodActions)
    .where(eq(automodActions.guildId, guildId))
    .orderBy(desc(automodActions.createdAt))
    .limit(limit);
}
