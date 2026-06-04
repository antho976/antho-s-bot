import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { rpgConfig, rpgPlayers } from "./schema";
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
