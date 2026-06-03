/**
 * Next.js runs this once when the server process starts. We use it to boot the bot side of
 * the monolith: apply migrations, prune old logs, then connect the Discord client.
 * Guarded to the Node.js runtime (skips the Edge runtime).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { logger, pruneOldLogs } = await import("@/server/core/logger");
  const { env } = await import("@/env");

  try {
    const { runMigrations } = await import("@/server/db/migrate");
    await runMigrations();
    logger.info("boot", "Migrations applied.");
  } catch (err) {
    logger.error("boot", "Migration failed", err);
  }

  await pruneOldLogs(env.LOG_RETENTION_DAYS).catch(() => {});

  try {
    const { startBot } = await import("@/server/integrations/discord");
    await startBot();
  } catch (err) {
    logger.error("boot", "Bot failed to start", err);
  }

  try {
    const { startScheduler, onTick } = await import("@/server/core/scheduler");
    const { checkReminders } = await import("@/server/features/notifications/reminders");
    onTick("stream-reminders", checkReminders);
    startScheduler();
  } catch (err) {
    logger.error("boot", "Scheduler failed to start", err);
  }
}
