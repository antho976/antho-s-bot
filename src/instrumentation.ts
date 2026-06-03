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
    const { checkVoiceXp } = await import("@/server/features/leveling/voice-tick");
    const { checkGiveaways } = await import("@/server/features/giveaways/service");
    const { checkPolls } = await import("@/server/features/polls/service");
    const { checkBirthdays } = await import("@/server/features/birthdays/service");
    const { rollupAnalytics } = await import("@/server/features/analytics/rollup");
    onTick("stream-reminders", checkReminders);
    onTick("voice-xp", checkVoiceXp);
    onTick("giveaways", checkGiveaways);
    onTick("polls", checkPolls);
    onTick("birthdays", checkBirthdays);
    onTick("analytics-rollup", rollupAnalytics);
    startScheduler();
  } catch (err) {
    logger.error("boot", "Scheduler failed to start", err);
  }

  try {
    const { getClient } = await import("@/server/integrations/discord/client");
    const client = getClient();
    if (client) {
      const { registerLevelingEvents } = await import("@/server/features/leveling/events");
      const { registerWelcomeEvents } = await import("@/server/features/welcome/events");
      const { registerMemberLogEvents } = await import("@/server/features/member-logs/events");
      const { registerAutomodEvents } = await import("@/server/features/automod/events");
      const { registerReactionRoleEvents } = await import("@/server/features/reaction-roles/events");
      const { registerStarboardEvents } = await import("@/server/features/starboard/events");
      const { registerCustomCommandEvents } = await import("@/server/features/custom-commands/events");
      const { registerGiveawayEvents } = await import("@/server/features/giveaways/events");
      const { registerPollEvents } = await import("@/server/features/polls/events");
      const { registerRpgEvents } = await import("@/server/features/rpg/events");
      registerLevelingEvents(client);
      registerWelcomeEvents(client);
      registerMemberLogEvents(client);
      registerAutomodEvents(client);
      registerReactionRoleEvents(client);
      registerStarboardEvents(client);
      registerCustomCommandEvents(client);
      registerGiveawayEvents(client);
      registerPollEvents(client);
      registerRpgEvents(client);
    }
  } catch (err) {
    logger.error("boot", "Feature events failed to register", err);
  }
}
