import { and, count, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { levelConfig, levelCurve, levelRewards, levels } from "@/server/db/schema";

export type LevelRow = typeof levels.$inferSelect;
export type LevelConfig = typeof levelConfig.$inferSelect;
export type LevelReward = typeof levelRewards.$inferSelect;

/** A member's current level (0 if they have none) — used for eligibility checks. */
export async function getLevelValue(guildId: string, userId: string): Promise<number> {
  const rows = await db
    .select({ level: levels.level })
    .from(levels)
    .where(and(eq(levels.guildId, guildId), eq(levels.userId, userId)))
    .limit(1);
  return rows[0]?.level ?? 0;
}

/** A member's full level row, or null if they've earned no XP yet. */
export async function getLevelRow(guildId: string, userId: string): Promise<LevelRow | null> {
  const rows = await db
    .select()
    .from(levels)
    .where(and(eq(levels.guildId, guildId), eq(levels.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/** 1-based rank of an XP total within the guild (how many sit strictly above it, + 1). */
export async function xpRank(guildId: string, xp: number): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(levels)
    .where(and(eq(levels.guildId, guildId), gt(levels.xp, xp)));
  return (rows[0]?.n ?? 0) + 1;
}

/** How many members have a level row in this guild (the leaderboard's denominator). */
export async function rankedMemberCount(guildId: string): Promise<number> {
  const rows = await db.select({ n: count() }).from(levels).where(eq(levels.guildId, guildId));
  return rows[0]?.n ?? 0;
}

/** Top members by voice minutes (only those with any). */
export function topByVoice(guildId: string, limit = 10) {
  return db
    .select()
    .from(levels)
    .where(and(eq(levels.guildId, guildId), gt(levels.voiceMinutes, 0)))
    .orderBy(desc(levels.voiceMinutes))
    .limit(limit);
}

/** Top members by message count (only those with any). */
export function topByMessages(guildId: string, limit = 10) {
  return db
    .select()
    .from(levels)
    .where(and(eq(levels.guildId, guildId), gt(levels.messages, 0)))
    .orderBy(desc(levels.messages))
    .limit(limit);
}

/** Defaults used when a guild hasn't saved a config yet (mirrors the schema defaults). */
export function defaultConfig(guildId: string): LevelConfig {
  return {
    guildId,
    enabled: true,
    xpMsgMin: 15,
    xpMsgMax: 25,
    msgCooldownSec: 60,
    xpPerVoiceMin: 5,
    xpPerReaction: 0,
    curveType: "multiplier",
    curveBase: 100,
    curveFactor: 1.2,
    announce: true,
    announceChannelId: null,
    announcePing: true,
    announceMinLevel: 0,
    levelUpMessage: null,
    stackRoleRewards: true,
    voiceRequireActive: true,
    updatedAt: null,
  };
}

export interface LevelingStats {
  members: number;
  totalXp: number;
  totalMessages: number;
  totalVoice: number;
  topLevel: number;
}

/** Guild-wide totals for the leaderboard "at a glance" panel. */
export async function levelingStats(guildId: string): Promise<LevelingStats> {
  const rows = await db
    .select({
      members: count(),
      totalXp: sql<number>`coalesce(sum(${levels.xp}), 0)`,
      totalMessages: sql<number>`coalesce(sum(${levels.messages}), 0)`,
      totalVoice: sql<number>`coalesce(sum(${levels.voiceMinutes}), 0)`,
      topLevel: sql<number>`coalesce(max(${levels.level}), 0)`,
    })
    .from(levels)
    .where(eq(levels.guildId, guildId));
  return rows[0] ?? { members: 0, totalXp: 0, totalMessages: 0, totalVoice: 0, topLevel: 0 };
}

export async function getConfig(guildId: string): Promise<LevelConfig> {
  const rows = await db
    .select()
    .from(levelConfig)
    .where(eq(levelConfig.guildId, guildId))
    .limit(1);
  return rows[0] ?? defaultConfig(guildId);
}

export async function saveConfig(
  guildId: string,
  patch: Partial<typeof levelConfig.$inferInsert>,
): Promise<LevelConfig> {
  const rows = await db
    .insert(levelConfig)
    .values({ guildId, ...patch, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: levelConfig.guildId,
      set: { ...patch, updatedAt: new Date() },
    })
    .returning();
  return rows[0];
}

export async function getOrCreateLevel(guildId: string, userId: string): Promise<LevelRow> {
  await db.insert(levels).values({ guildId, userId }).onConflictDoNothing();
  const rows = await db
    .select()
    .from(levels)
    .where(and(eq(levels.guildId, guildId), eq(levels.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function updateLevelRow(
  id: number,
  patch: Partial<typeof levels.$inferInsert>,
): Promise<void> {
  await db
    .update(levels)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(levels.id, id));
}

export function leaderboard(guildId: string, limit = 25) {
  return db
    .select()
    .from(levels)
    .where(eq(levels.guildId, guildId))
    .orderBy(desc(levels.prestige), desc(levels.xp))
    .limit(limit);
}

export function listRewards(guildId: string) {
  return db
    .select()
    .from(levelRewards)
    .where(eq(levelRewards.guildId, guildId))
    .orderBy(levelRewards.level);
}

export async function addReward(guildId: string, level: number, roleId: string) {
  await db
    .insert(levelRewards)
    .values({ guildId, level, roleId })
    .onConflictDoUpdate({
      target: [levelRewards.guildId, levelRewards.level],
      set: { roleId },
    });
}

export async function removeReward(id: number) {
  await db.delete(levelRewards).where(eq(levelRewards.id, id));
}

/** Custom XP-per-level overrides as a Map (only used when curveType = 'custom'). */
export async function loadCurveMap(guildId: string): Promise<Map<number, number>> {
  const rows = await db.select().from(levelCurve).where(eq(levelCurve.guildId, guildId));
  return new Map(rows.map((r) => [r.level, r.xpRequired]));
}
