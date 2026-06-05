import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  rpgConfig,
  rpgGathering,
  rpgGatherTalents,
  rpgInventory,
  rpgPlayers,
  rpgPlayerSkills,
} from "./schema";
import { classDef, maxHp } from "./domain/stats";

export type RpgPlayer = typeof rpgPlayers.$inferSelect;
type PlayerPatch = Partial<typeof rpgPlayers.$inferInsert>;

export async function getPlayer(guildId: string, userId: string): Promise<RpgPlayer | null> {
  const rows = await db
    .select()
    .from(rpgPlayers)
    .where(and(eq(rpgPlayers.guildId, guildId), eq(rpgPlayers.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Create a fresh character at level 1 with full hp for its class. */
export async function createPlayer(
  guildId: string,
  userId: string,
  classId: string,
): Promise<RpgPlayer> {
  const cls = classDef(classId);
  const [row] = await db
    .insert(rpgPlayers)
    .values({
      guildId,
      userId,
      classId,
      hp: maxHp(cls, 1),
      lastRegenAt: new Date(),
    })
    .returning();
  return row;
}

export async function updatePlayer(id: number, patch: PlayerPatch): Promise<void> {
  await db
    .update(rpgPlayers)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(rpgPlayers.id, id));
}

/** Permanently delete a character and everything it owns. */
export async function deletePlayer(playerId: number): Promise<void> {
  await db.delete(rpgInventory).where(eq(rpgInventory.playerId, playerId));
  await db.delete(rpgPlayerSkills).where(eq(rpgPlayerSkills.playerId, playerId));
  await db.delete(rpgPlayers).where(eq(rpgPlayers.id, playerId));
}

export async function getAllocatedNodeIds(playerId: number): Promise<string[]> {
  const rows = await db
    .select({ nodeId: rpgPlayerSkills.nodeId })
    .from(rpgPlayerSkills)
    .where(eq(rpgPlayerSkills.playerId, playerId));
  return rows.map((r) => r.nodeId);
}

export async function allocateNode(playerId: number, nodeId: string): Promise<void> {
  await db.insert(rpgPlayerSkills).values({ playerId, nodeId }).onConflictDoNothing();
}

export async function respecSkills(playerId: number): Promise<void> {
  await db.delete(rpgPlayerSkills).where(eq(rpgPlayerSkills.playerId, playerId));
}

/**
 * Add `qty` of a stackable item to a player's inventory (find-or-insert the stackable row). Rolled
 * instances would be separate rows, so we only stack onto the null-instance row. Single-player
 * writes are serialized by the per-user in-flight guard, so no race here.
 */
export async function addItem(playerId: number, itemId: string, qty: number): Promise<void> {
  if (qty <= 0) return;
  const rows = await db
    .select()
    .from(rpgInventory)
    .where(
      and(
        eq(rpgInventory.playerId, playerId),
        eq(rpgInventory.itemId, itemId),
        isNull(rpgInventory.instanceStatsJson),
      ),
    )
    .limit(1);
  const existing = rows[0];
  if (existing) {
    await db
      .update(rpgInventory)
      .set({ qty: existing.qty + qty, updatedAt: new Date() })
      .where(eq(rpgInventory.id, existing.id));
  } else {
    await db.insert(rpgInventory).values({ playerId, itemId, qty });
  }
}

// --- Gathering -------------------------------------------------------------------------------

/** Per-skill cumulative gathering xp as a map (missing skill = 0). */
export async function getGatheringXp(playerId: number): Promise<Record<string, number>> {
  const rows = await db.select().from(rpgGathering).where(eq(rpgGathering.playerId, playerId));
  return Object.fromEntries(rows.map((r) => [r.skillId, r.xp]));
}

/** Add xp to a skill (find-or-insert the row). */
export async function addGatherXp(playerId: number, skillId: string, xp: number): Promise<void> {
  if (xp <= 0) return;
  await db
    .insert(rpgGathering)
    .values({ playerId, skillId, xp })
    .onConflictDoUpdate({
      target: [rpgGathering.playerId, rpgGathering.skillId],
      set: { xp: sql`${rpgGathering.xp} + ${xp}`, updatedAt: new Date() },
    });
}

export type GatherTalentRow = typeof rpgGatherTalents.$inferSelect;

export function getGatherTalents(playerId: number): Promise<GatherTalentRow[]> {
  return db.select().from(rpgGatherTalents).where(eq(rpgGatherTalents.playerId, playerId));
}

/** Add one rank to a talent (insert at rank 1, else +1). Caller checks points + max rank first. */
export async function allocGatherTalent(
  playerId: number,
  skillId: string,
  nodeId: string,
): Promise<void> {
  await db
    .insert(rpgGatherTalents)
    .values({ playerId, skillId, nodeId, rank: 1 })
    .onConflictDoUpdate({
      target: [rpgGatherTalents.playerId, rpgGatherTalents.skillId, rpgGatherTalents.nodeId],
      set: { rank: sql`${rpgGatherTalents.rank} + 1` },
    });
}

/** Free respec of one skill's gathering talents. */
export async function resetGatherTalents(playerId: number, skillId: string): Promise<void> {
  await db
    .delete(rpgGatherTalents)
    .where(and(eq(rpgGatherTalents.playerId, playerId), eq(rpgGatherTalents.skillId, skillId)));
}

export type RpgConfig = typeof rpgConfig.$inferSelect;

export function defaultRpgConfig(guildId: string): RpgConfig {
  return { guildId, enabled: false, channelId: null, updatedAt: null };
}

export async function getRpgConfig(guildId: string): Promise<RpgConfig> {
  const rows = await db.select().from(rpgConfig).where(eq(rpgConfig.guildId, guildId)).limit(1);
  return rows[0] ?? defaultRpgConfig(guildId);
}

export async function saveRpgConfig(
  guildId: string,
  patch: Partial<typeof rpgConfig.$inferInsert>,
): Promise<RpgConfig> {
  const rows = await db
    .insert(rpgConfig)
    .values({ guildId, ...patch, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: rpgConfig.guildId,
      set: { ...patch, updatedAt: new Date() },
    })
    .returning();
  return rows[0];
}
