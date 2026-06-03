import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { rpgConfig, rpgPlayers } from "./schema";
import { classDef, maxEnergy, maxHp } from "./domain/stats";

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

/** Create a fresh character at level 1 with full hp/energy for its class. */
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
      energy: maxEnergy(cls, 1),
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

export type RpgConfig = { guildId: string; enabled: boolean; channelId: string | null };

export async function getRpgConfig(guildId: string): Promise<RpgConfig> {
  const rows = await db.select().from(rpgConfig).where(eq(rpgConfig.guildId, guildId)).limit(1);
  const row = rows[0];
  return row
    ? { guildId: row.guildId, enabled: row.enabled, channelId: row.channelId }
    : { guildId, enabled: false, channelId: null };
}
