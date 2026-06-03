import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { streamChannels, streamEvents, streamState } from "@/server/db/schema";

export type StreamChannel = typeof streamChannels.$inferSelect;
export type NewStreamChannel = typeof streamChannels.$inferInsert;
type StatePatch = Partial<typeof streamState.$inferInsert>;

export function listChannels(guildId: string) {
  return db.select().from(streamChannels).where(eq(streamChannels.guildId, guildId));
}

export async function getChannel(id: number): Promise<StreamChannel | null> {
  const rows = await db
    .select()
    .from(streamChannels)
    .where(eq(streamChannels.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createChannel(data: NewStreamChannel): Promise<StreamChannel> {
  const rows = await db.insert(streamChannels).values(data).returning();
  return rows[0];
}

export async function updateChannel(
  id: number,
  data: Partial<NewStreamChannel>,
): Promise<StreamChannel | null> {
  const rows = await db
    .update(streamChannels)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(streamChannels.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteChannel(id: number): Promise<void> {
  await db.delete(streamChannels).where(eq(streamChannels.id, id));
  await db.delete(streamState).where(eq(streamState.channelId, id));
}

export async function recordEvent(
  channelId: number,
  type: string,
  payload?: unknown,
): Promise<void> {
  await db.insert(streamEvents).values({
    channelId,
    type,
    payloadJson: payload ? JSON.stringify(payload) : null,
  });
}

/** Upsert the live/seen state; only the provided fields change on an existing row. */
export async function upsertState(channelId: number, patch: StatePatch): Promise<void> {
  await db
    .insert(streamState)
    .values({ channelId, isLive: patch.isLive ?? false, ...patch, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: streamState.channelId,
      set: { ...patch, updatedAt: new Date() },
    });
}
