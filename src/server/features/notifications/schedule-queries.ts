import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/server/db";
import { streamSchedule } from "@/server/db/schema";

export type ScheduleEntry = typeof streamSchedule.$inferSelect;
export type NewScheduleEntry = typeof streamSchedule.$inferInsert;

export function listSchedule(guildId: string) {
  return db
    .select()
    .from(streamSchedule)
    .where(eq(streamSchedule.guildId, guildId))
    .orderBy(streamSchedule.startsAt);
}

export async function createScheduleEntry(data: NewScheduleEntry): Promise<ScheduleEntry> {
  const rows = await db.insert(streamSchedule).values(data).returning();
  return rows[0];
}

export async function deleteScheduleEntry(id: number): Promise<void> {
  await db.delete(streamSchedule).where(eq(streamSchedule.id, id));
}

export async function clearSchedule(guildId: string): Promise<void> {
  await db.delete(streamSchedule).where(eq(streamSchedule.guildId, guildId));
}

/** Entries due for a reminder soon (within the next ~65 min, or up to 5 min past). */
export function dueWindow(nowMs: number) {
  return db
    .select()
    .from(streamSchedule)
    .where(
      and(
        eq(streamSchedule.enabled, true),
        gte(streamSchedule.startsAt, new Date(nowMs - 5 * 60_000)),
        lte(streamSchedule.startsAt, new Date(nowMs + 65 * 60_000)),
      ),
    );
}

export async function markReminderSent(id: number, which: "1h" | "10m"): Promise<void> {
  await db
    .update(streamSchedule)
    .set(which === "1h" ? { remind1hSent: true } : { remind10mSent: true })
    .where(eq(streamSchedule.id, id));
}
