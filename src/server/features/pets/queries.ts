import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { petSubmissions } from "@/server/db/schema";

export type PetSubmission = typeof petSubmissions.$inferSelect;

export function listSubmissions(guildId: string, status?: string) {
  const where = status
    ? and(eq(petSubmissions.guildId, guildId), eq(petSubmissions.status, status))
    : eq(petSubmissions.guildId, guildId);
  return db
    .select()
    .from(petSubmissions)
    .where(where)
    .orderBy(desc(petSubmissions.createdAt))
    .limit(100);
}

export async function getSubmission(id: number): Promise<PetSubmission | null> {
  const rows = await db.select().from(petSubmissions).where(eq(petSubmissions.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createSubmission(
  data: typeof petSubmissions.$inferInsert,
): Promise<PetSubmission> {
  const rows = await db.insert(petSubmissions).values(data).returning();
  return rows[0];
}

export async function setStatus(
  id: number,
  status: string,
  reviewedBy: string,
): Promise<void> {
  await db
    .update(petSubmissions)
    .set({ status, reviewedBy, reviewedAt: new Date() })
    .where(eq(petSubmissions.id, id));
}
