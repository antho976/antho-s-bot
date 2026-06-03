import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { levelConfig, levelCurve, levelRewards, levels } from "@/server/db/schema";

export type LevelRow = typeof levels.$inferSelect;
export type LevelConfig = typeof levelConfig.$inferSelect;
export type LevelReward = typeof levelRewards.$inferSelect;

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
    voiceRequireActive: true,
    updatedAt: null,
  };
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
