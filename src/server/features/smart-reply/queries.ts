import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { smartreplyConfig, smartreplyMemory } from "@/server/db/schema";

export type SmartReplyConfig = typeof smartreplyConfig.$inferSelect;
export type SmartReplyConfigPatch = Partial<typeof smartreplyConfig.$inferInsert>;
export type MemoryEntry = typeof smartreplyMemory.$inferSelect;

/** Defaults mirror the schema column defaults; used when a guild has no row yet. */
export function defaultConfig(guildId: string): SmartReplyConfig {
  return {
    guildId,
    enabled: false,
    model: "meta-llama/llama-3.3-70b-instruct:free",
    botName: "Assistant",
    persona: "",
    replyChance: 5,
    cooldownSeconds: 30,
    contextMessages: 8,
    maxReplyChars: 600,
    minMessageLength: 6,
    dailyCap: 200,
    replyOnMention: true,
    ignoreBots: true,
    allowedChannelsJson: null,
    updatedAt: null,
  };
}

export async function getConfig(guildId: string): Promise<SmartReplyConfig> {
  const rows = await db
    .select()
    .from(smartreplyConfig)
    .where(eq(smartreplyConfig.guildId, guildId))
    .limit(1);
  return rows[0] ?? defaultConfig(guildId);
}

export async function saveConfig(
  guildId: string,
  patch: SmartReplyConfigPatch,
): Promise<SmartReplyConfig> {
  const rows = await db
    .insert(smartreplyConfig)
    .values({ guildId, ...patch, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: smartreplyConfig.guildId,
      set: { ...patch, updatedAt: new Date() },
    })
    .returning();
  return rows[0];
}

/** Parse the stored allowed-channels JSON into a string[] (empty = all channels). */
export function parseChannels(json: string | null): string[] {
  if (!json) return [];
  try {
    const v: unknown = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function listMemory(guildId: string): Promise<MemoryEntry[]> {
  return db
    .select()
    .from(smartreplyMemory)
    .where(eq(smartreplyMemory.guildId, guildId))
    .orderBy(desc(smartreplyMemory.createdAt));
}

export async function listMemoryContent(guildId: string): Promise<string[]> {
  const rows = await listMemory(guildId);
  return rows.map((r) => r.content);
}

export async function addMemory(guildId: string, content: string): Promise<MemoryEntry> {
  const rows = await db
    .insert(smartreplyMemory)
    .values({ guildId, content })
    .returning();
  return rows[0];
}

/** Delete a memory, scoped to the guild so ids can't be removed cross-server. */
export async function removeMemory(guildId: string, id: number): Promise<boolean> {
  const rows = await db
    .delete(smartreplyMemory)
    .where(and(eq(smartreplyMemory.id, id), eq(smartreplyMemory.guildId, guildId)))
    .returning();
  return rows.length > 0;
}
