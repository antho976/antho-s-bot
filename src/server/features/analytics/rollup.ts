import { lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { analyticsDaily, analyticsEvents } from "@/server/db/schema";

const pad = (n: number) => String(n).padStart(2, "0");

function startOfTodayUTC(): number {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function dayStr(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/**
 * Roll complete (pre-today) raw events into the tiny permanent `analytics_daily` table, then
 * prune them. Today's events stay raw and are counted live; they roll up tomorrow.
 * Idempotent: once a day's raw rows are deleted, re-running finds nothing for it.
 */
export async function rollupAnalytics(): Promise<void> {
  const cutoff = new Date(startOfTodayUTC());
  const rows = await db
    .select()
    .from(analyticsEvents)
    .where(lt(analyticsEvents.createdAt, cutoff));
  if (!rows.length) return;

  const buckets = new Map<string, { guildId: string; metric: string; day: string; count: number }>();
  for (const r of rows) {
    const day = dayStr(r.createdAt ?? cutoff);
    const key = `${r.guildId}|${r.eventType}|${day}`;
    const b = buckets.get(key) ?? { guildId: r.guildId, metric: r.eventType, day, count: 0 };
    b.count += 1;
    buckets.set(key, b);
  }

  for (const b of buckets.values()) {
    await db
      .insert(analyticsDaily)
      .values({ guildId: b.guildId, metric: b.metric, day: b.day, count: b.count })
      .onConflictDoUpdate({
        target: [analyticsDaily.guildId, analyticsDaily.metric, analyticsDaily.day],
        set: { count: sql`${analyticsDaily.count} + ${b.count}` },
      });
  }

  await db.delete(analyticsEvents).where(lt(analyticsEvents.createdAt, cutoff));
}
