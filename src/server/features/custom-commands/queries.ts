import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { customCommands } from "@/server/db/schema";

export type CustomCommand = typeof customCommands.$inferSelect;

export function listCommands(guildId: string) {
  return db.select().from(customCommands).where(eq(customCommands.guildId, guildId));
}

export async function getByName(guildId: string, name: string): Promise<CustomCommand | null> {
  const rows = await db
    .select()
    .from(customCommands)
    .where(and(eq(customCommands.guildId, guildId), eq(customCommands.name, name)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createCommand(
  data: typeof customCommands.$inferInsert,
): Promise<CustomCommand> {
  const rows = await db.insert(customCommands).values(data).returning();
  return rows[0];
}

export async function updateCommand(
  id: number,
  patch: Partial<typeof customCommands.$inferInsert>,
): Promise<CustomCommand | null> {
  const rows = await db
    .update(customCommands)
    .set(patch)
    .where(eq(customCommands.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteCommand(id: number): Promise<void> {
  await db.delete(customCommands).where(eq(customCommands.id, id));
}

export async function incrementUses(id: number): Promise<void> {
  await db
    .update(customCommands)
    .set({ usesCount: sql`${customCommands.usesCount} + 1` })
    .where(eq(customCommands.id, id));
}
