import { eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { reactionRolePairs, reactionRolePanels } from "@/server/db/schema";

export type Panel = typeof reactionRolePanels.$inferSelect;
export type Pair = typeof reactionRolePairs.$inferSelect;
export type PanelWithPairs = Panel & { pairs: Pair[] };

export function listPanels(guildId: string) {
  return db.select().from(reactionRolePanels).where(eq(reactionRolePanels.guildId, guildId));
}

export async function listPanelsWithPairs(guildId: string): Promise<PanelWithPairs[]> {
  const panels = await listPanels(guildId);
  if (!panels.length) return [];
  const allPairs = await db
    .select()
    .from(reactionRolePairs)
    .where(inArray(reactionRolePairs.messageId, panels.map((p) => p.messageId)));
  return panels.map((p) => ({
    ...p,
    pairs: allPairs.filter((pr) => pr.messageId === p.messageId),
  }));
}

export async function getPanel(id: number): Promise<Panel | null> {
  const rows = await db
    .select()
    .from(reactionRolePanels)
    .where(eq(reactionRolePanels.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPanelByMessage(messageId: string): Promise<Panel | null> {
  const rows = await db
    .select()
    .from(reactionRolePanels)
    .where(eq(reactionRolePanels.messageId, messageId))
    .limit(1);
  return rows[0] ?? null;
}

export async function createPanel(
  data: typeof reactionRolePanels.$inferInsert,
): Promise<Panel> {
  const rows = await db.insert(reactionRolePanels).values(data).returning();
  return rows[0];
}

export async function addPairs(rows: (typeof reactionRolePairs.$inferInsert)[]): Promise<void> {
  if (rows.length) await db.insert(reactionRolePairs).values(rows);
}

export function getPairsByMessage(messageId: string) {
  return db.select().from(reactionRolePairs).where(eq(reactionRolePairs.messageId, messageId));
}

export async function deletePanelRows(id: number, messageId: string): Promise<void> {
  await db.delete(reactionRolePairs).where(eq(reactionRolePairs.messageId, messageId));
  await db.delete(reactionRolePanels).where(eq(reactionRolePanels.id, id));
}
