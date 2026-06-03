import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { env } from "@/env";
import { getBotStatus, type BotStatus } from "@/server/integrations/discord/client";

export type ApiStatus = "connected" | "connecting" | "not_configured";

export interface HealthSnapshot {
  now: number;
  uptimeSec: number;
  memory: { rss: number; heapUsed: number; heapTotal: number };
  runtime: { node: string; platform: string; env: string };
  db: { ok: boolean };
  discord: BotStatus;
  apis: { discord: ApiStatus; twitch: ApiStatus; youtube: ApiStatus };
}

function discordApiStatus(bot: BotStatus): ApiStatus {
  if (bot.ready) return "connected";
  if (env.DISCORD_TOKEN) return "connecting";
  return "not_configured";
}

/** A point-in-time snapshot for the Bot Health page. Cheap; safe to call often. */
export async function getHealth(): Promise<HealthSnapshot> {
  const mem = process.memoryUsage();

  let dbOk = false;
  try {
    await db.run(sql`select 1`);
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const discord = getBotStatus();

  return {
    now: Date.now(),
    uptimeSec: Math.round(process.uptime()),
    memory: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal },
    runtime: {
      node: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV ?? "development",
    },
    db: { ok: dbOk },
    discord,
    apis: {
      discord: discordApiStatus(discord),
      // Wired in Phase 1 when the notification engine lands.
      twitch: "not_configured",
      youtube: "not_configured",
    },
  };
}
