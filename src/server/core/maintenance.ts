import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { analyticsDaily, auditLog } from "@/server/db/schema";
import { resetLiveStates } from "@/server/features/notifications/queries";
import { clearSchedule } from "@/server/features/notifications/schedule-queries";
import { logger } from "./logger";

export type MaintenanceAction = "reset-live" | "reset-schedule" | "reset-daily";

function utcDay(): string {
  const d = new Date();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

/** Run a maintenance reset, log it to the audit trail, and return a human message. */
export async function runMaintenance(
  action: MaintenanceAction,
  guildId: string,
  actorId: string,
): Promise<{ ok: boolean; message: string }> {
  let message: string;

  if (action === "reset-live") {
    const n = await resetLiveStates(guildId);
    message = `Cleared live state for ${n} channel(s).`;
  } else if (action === "reset-schedule") {
    await clearSchedule(guildId);
    message = "Cleared the stream schedule.";
  } else if (action === "reset-daily") {
    const today = utcDay();
    await db
      .delete(analyticsDaily)
      .where(and(eq(analyticsDaily.guildId, guildId), eq(analyticsDaily.day, today)));
    message = `Reset today's (${today}) daily stats.`;
  } else {
    return { ok: false, message: "Unknown action." };
  }

  await db.insert(auditLog).values({ guildId, actorId, action: `maintenance.${action}` });
  logger.info("maintenance", message);
  return { ok: true, message };
}
