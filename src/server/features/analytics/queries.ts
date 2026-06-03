import { and, count, eq, gte, sum } from "drizzle-orm";
import { db } from "@/server/db";
import { analyticsDaily, analyticsEvents } from "@/server/db/schema";

const pad = (n: number) => String(n).padStart(2, "0");

function startOfTodayUTC(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function dayStr(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export interface MetricTotal {
  metric: string;
  total: number;
}

/** Total events per type, combining permanent rollups + today's live raw events. */
export async function eventTypeTotals(guildId: string): Promise<MetricTotal[]> {
  const daily = await db
    .select({ metric: analyticsDaily.metric, total: sum(analyticsDaily.count) })
    .from(analyticsDaily)
    .where(eq(analyticsDaily.guildId, guildId))
    .groupBy(analyticsDaily.metric);
  const raw = await db
    .select({ metric: analyticsEvents.eventType, total: count() })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.guildId, guildId), gte(analyticsEvents.createdAt, startOfTodayUTC())))
    .groupBy(analyticsEvents.eventType);

  const map = new Map<string, number>();
  for (const d of daily) map.set(d.metric, Number(d.total ?? 0));
  for (const r of raw) map.set(r.metric, (map.get(r.metric) ?? 0) + Number(r.total ?? 0));
  return [...map.entries()]
    .map(([metric, total]) => ({ metric, total }))
    .sort((a, b) => b.total - a.total);
}

export interface DayPoint {
  day: string;
  count: number;
}

/** Total events per day for the last `days` days (rollups + today's live). */
export async function dailySeries(guildId: string, days = 30): Promise<DayPoint[]> {
  const daily = await db
    .select({ day: analyticsDaily.day, total: sum(analyticsDaily.count) })
    .from(analyticsDaily)
    .where(eq(analyticsDaily.guildId, guildId))
    .groupBy(analyticsDaily.day);
  const dayMap = new Map<string, number>(daily.map((d) => [d.day, Number(d.total ?? 0)]));

  const rawToday = await db
    .select({ total: count() })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.guildId, guildId), gte(analyticsEvents.createdAt, startOfTodayUTC())));
  const todayMs = startOfTodayUTC().getTime();
  const todayKey = dayStr(todayMs);
  dayMap.set(todayKey, (dayMap.get(todayKey) ?? 0) + Number(rawToday[0]?.total ?? 0));

  const series: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const ds = dayStr(todayMs - i * 86_400_000);
    series.push({ day: ds, count: dayMap.get(ds) ?? 0 });
  }
  return series;
}
