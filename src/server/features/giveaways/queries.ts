import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "@/server/db";
import { giveawayEntries, giveaways } from "@/server/db/schema";

export type Giveaway = typeof giveaways.$inferSelect;

export function listGiveaways(guildId: string) {
  return db
    .select()
    .from(giveaways)
    .where(eq(giveaways.guildId, guildId))
    .orderBy(desc(giveaways.createdAt))
    .limit(50);
}

export async function getGiveaway(id: number): Promise<Giveaway | null> {
  const rows = await db.select().from(giveaways).where(eq(giveaways.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getByMessage(messageId: string): Promise<Giveaway | null> {
  const rows = await db
    .select()
    .from(giveaways)
    .where(eq(giveaways.messageId, messageId))
    .limit(1);
  return rows[0] ?? null;
}

export async function createGiveaway(
  data: typeof giveaways.$inferInsert,
): Promise<Giveaway> {
  const rows = await db.insert(giveaways).values(data).returning();
  return rows[0];
}

export async function setMessageId(id: number, messageId: string): Promise<void> {
  await db.update(giveaways).set({ messageId }).where(eq(giveaways.id, id));
}

export async function addEntry(giveawayId: number, userId: string): Promise<void> {
  await db.insert(giveawayEntries).values({ giveawayId, userId }).onConflictDoNothing();
}

export async function removeEntry(giveawayId: number, userId: string): Promise<void> {
  await db
    .delete(giveawayEntries)
    .where(and(eq(giveawayEntries.giveawayId, giveawayId), eq(giveawayEntries.userId, userId)));
}

export async function getEntryUserIds(giveawayId: number): Promise<string[]> {
  const rows = await db
    .select({ userId: giveawayEntries.userId })
    .from(giveawayEntries)
    .where(eq(giveawayEntries.giveawayId, giveawayId));
  return rows.map((r) => r.userId);
}

export async function markEnded(
  id: number,
  winners: string[],
  status: "ended" | "cancelled" = "ended",
): Promise<void> {
  await db
    .update(giveaways)
    .set({ status, winnersJson: JSON.stringify(winners), endedAt: new Date() })
    .where(eq(giveaways.id, id));
}

export function dueGiveaways(nowMs: number) {
  return db
    .select()
    .from(giveaways)
    .where(and(eq(giveaways.status, "active"), lte(giveaways.endsAt, new Date(nowMs))));
}
