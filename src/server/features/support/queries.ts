import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { supportConfig, tickets } from "@/server/db/schema";

export type SupportConfig = typeof supportConfig.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;

export function defaultConfig(guildId: string): SupportConfig {
  return { guildId, enabled: false, channelId: null, staffRoleId: null, updatedAt: null };
}

export async function getConfig(guildId: string): Promise<SupportConfig> {
  const rows = await db
    .select()
    .from(supportConfig)
    .where(eq(supportConfig.guildId, guildId))
    .limit(1);
  return rows[0] ?? defaultConfig(guildId);
}

export async function saveConfig(
  guildId: string,
  patch: Partial<typeof supportConfig.$inferInsert>,
): Promise<SupportConfig> {
  const rows = await db
    .insert(supportConfig)
    .values({ guildId, ...patch, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: supportConfig.guildId,
      set: { ...patch, updatedAt: new Date() },
    })
    .returning();
  return rows[0];
}

export async function nextTicketNumber(guildId: string): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(tickets)
    .where(eq(tickets.guildId, guildId));
  return (rows[0]?.n ?? 0) + 1;
}

export async function createTicket(
  data: typeof tickets.$inferInsert,
): Promise<Ticket> {
  const rows = await db.insert(tickets).values(data).returning();
  return rows[0];
}

export async function getTicketByThread(threadId: string): Promise<Ticket | null> {
  const rows = await db
    .select()
    .from(tickets)
    .where(eq(tickets.threadId, threadId))
    .limit(1);
  return rows[0] ?? null;
}

export async function closeTicket(id: number, closedBy: string): Promise<void> {
  await db
    .update(tickets)
    .set({ status: "closed", closedAt: new Date(), closedBy })
    .where(eq(tickets.id, id));
}

export function listTickets(guildId: string, status?: "open" | "closed", limit = 50) {
  const where = status
    ? and(eq(tickets.guildId, guildId), eq(tickets.status, status))
    : eq(tickets.guildId, guildId);
  return db.select().from(tickets).where(where).orderBy(desc(tickets.createdAt)).limit(limit);
}
