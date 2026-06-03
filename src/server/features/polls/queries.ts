import { and, desc, eq, isNotNull, lte } from "drizzle-orm";
import { db } from "@/server/db";
import { polls } from "@/server/db/schema";

export type Poll = typeof polls.$inferSelect;

export function listPolls(guildId: string) {
  return db
    .select()
    .from(polls)
    .where(eq(polls.guildId, guildId))
    .orderBy(desc(polls.createdAt))
    .limit(50);
}

export async function getPoll(id: number): Promise<Poll | null> {
  const rows = await db.select().from(polls).where(eq(polls.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getByMessage(messageId: string): Promise<Poll | null> {
  const rows = await db.select().from(polls).where(eq(polls.messageId, messageId)).limit(1);
  return rows[0] ?? null;
}

export async function createPoll(data: typeof polls.$inferInsert): Promise<Poll> {
  const rows = await db.insert(polls).values(data).returning();
  return rows[0];
}

export async function setMessageId(id: number, messageId: string): Promise<void> {
  await db.update(polls).set({ messageId }).where(eq(polls.id, id));
}

export async function markEnded(id: number): Promise<void> {
  await db.update(polls).set({ status: "ended", endedAt: new Date() }).where(eq(polls.id, id));
}

export function duePolls(nowMs: number) {
  return db
    .select()
    .from(polls)
    .where(
      and(eq(polls.status, "active"), isNotNull(polls.endsAt), lte(polls.endsAt, new Date(nowMs))),
    );
}
