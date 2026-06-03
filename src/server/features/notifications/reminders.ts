import { logger } from "@/server/core/logger";
import { sendToChannel } from "@/server/integrations/discord/send";
import { getChannel } from "./queries";
import { dueWindow, markReminderSent, type ScheduleEntry } from "./schedule-queries";

const HOUR = 60 * 60_000;
const TEN_MIN = 10 * 60_000;

/** Resolve where a schedule entry's reminder should post (its linked stream channel). */
async function reminderTarget(entry: ScheduleEntry) {
  if (!entry.channelId) return null;
  const channel = await getChannel(entry.channelId);
  if (!channel?.discordChannelId) return null;
  return { channelId: channel.discordChannelId, pingRoleId: channel.pingRoleId };
}

async function fire(entry: ScheduleEntry, label: string): Promise<void> {
  const target = await reminderTarget(entry);
  if (!target) {
    logger.warn("reminders", `Schedule #${entry.id} has no target Discord channel — skipped.`);
    return;
  }
  const text = `🔔 **${entry.title ?? "Stream"}** starts ${label}!`;
  const content = target.pingRoleId ? `<@&${target.pingRoleId}> ${text}` : text;
  await sendToChannel(target.channelId, {
    content,
    allowedMentions: { roles: target.pingRoleId ? [target.pingRoleId] : [] },
  });
}

/** Scheduler tick: fire any due 1h / 10min reminders, marking each sent so it can't repeat. */
export async function checkReminders(): Promise<void> {
  const now = Date.now();
  const entries = await dueWindow(now);
  for (const entry of entries) {
    const msUntil = (entry.startsAt?.getTime() ?? 0) - now;

    if (entry.remind1h && !entry.remind1hSent && msUntil <= HOUR) {
      await fire(entry, "in about an hour");
      await markReminderSent(entry.id, "1h");
    }
    if (entry.remind10m && !entry.remind10mSent && msUntil <= TEN_MIN) {
      await fire(entry, "in 10 minutes");
      await markReminderSent(entry.id, "10m");
    }
  }
}
