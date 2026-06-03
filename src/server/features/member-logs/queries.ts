import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { memberEvents, memberLogConfig } from "@/server/db/schema";

export type MemberLogConfig = typeof memberLogConfig.$inferSelect;
export type MemberEvent = typeof memberEvents.$inferSelect;

export function defaultConfig(guildId: string): MemberLogConfig {
  return {
    guildId,
    enabled: false,
    channelId: null,
    logJoins: true,
    logLeaves: true,
    logBans: true,
    logUnbans: true,
    logNicknames: true,
    logRoles: true,
    logMessageEdits: true,
    logMessageDeletes: true,
    logVoice: false,
    updatedAt: null,
  };
}

export async function getConfig(guildId: string): Promise<MemberLogConfig> {
  const rows = await db
    .select()
    .from(memberLogConfig)
    .where(eq(memberLogConfig.guildId, guildId))
    .limit(1);
  return rows[0] ?? defaultConfig(guildId);
}

export async function saveConfig(
  guildId: string,
  patch: Partial<typeof memberLogConfig.$inferInsert>,
): Promise<MemberLogConfig> {
  const rows = await db
    .insert(memberLogConfig)
    .values({ guildId, ...patch, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: memberLogConfig.guildId,
      set: { ...patch, updatedAt: new Date() },
    })
    .returning();
  return rows[0];
}

export async function recordEvent(
  guildId: string,
  type: string,
  userId: string | null,
  summary: string,
  data?: unknown,
): Promise<void> {
  await db.insert(memberEvents).values({
    guildId,
    type,
    userId,
    summary,
    dataJson: data ? JSON.stringify(data) : null,
  });
}

export function recentEvents(guildId: string, limit = 30) {
  return db
    .select()
    .from(memberEvents)
    .where(eq(memberEvents.guildId, guildId))
    .orderBy(desc(memberEvents.createdAt))
    .limit(limit);
}
