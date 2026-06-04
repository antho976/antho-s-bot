import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { memberEvents, memberLogConfig, memberRoleSnapshots } from "@/server/db/schema";

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

/** The role IDs we last recorded for a member, or null if we've never seen them. */
export async function getRoleSnapshot(
  guildId: string,
  userId: string,
): Promise<string[] | null> {
  const rows = await db
    .select({ roles: memberRoleSnapshots.rolesJson })
    .from(memberRoleSnapshots)
    .where(and(eq(memberRoleSnapshots.guildId, guildId), eq(memberRoleSnapshots.userId, userId)))
    .limit(1);
  if (!rows[0]) return null;
  try {
    return JSON.parse(rows[0].roles) as string[];
  } catch {
    return null;
  }
}

export async function saveRoleSnapshot(
  guildId: string,
  userId: string,
  roleIds: string[],
): Promise<void> {
  const rolesJson = JSON.stringify(roleIds);
  await db
    .insert(memberRoleSnapshots)
    .values({ guildId, userId, rolesJson, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [memberRoleSnapshots.guildId, memberRoleSnapshots.userId],
      set: { rolesJson, updatedAt: new Date() },
    });
}

export async function deleteRoleSnapshot(guildId: string, userId: string): Promise<void> {
  await db
    .delete(memberRoleSnapshots)
    .where(and(eq(memberRoleSnapshots.guildId, guildId), eq(memberRoleSnapshots.userId, userId)));
}

/** Bulk upsert snapshots — used to seed every member's roles on startup. */
export async function seedRoleSnapshots(
  guildId: string,
  entries: { userId: string; roleIds: string[] }[],
): Promise<void> {
  if (!entries.length) return;
  const updatedAt = new Date();
  const CHUNK = 100;
  for (let i = 0; i < entries.length; i += CHUNK) {
    const rows = entries.slice(i, i + CHUNK).map((e) => ({
      guildId,
      userId: e.userId,
      rolesJson: JSON.stringify(e.roleIds),
      updatedAt,
    }));
    await db
      .insert(memberRoleSnapshots)
      .values(rows)
      .onConflictDoUpdate({
        target: [memberRoleSnapshots.guildId, memberRoleSnapshots.userId],
        set: { rolesJson: sql`excluded.roles_json`, updatedAt },
      });
  }
}
