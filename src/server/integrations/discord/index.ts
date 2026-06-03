import { env } from "@/env";
import { logger } from "@/server/core/logger";
import { createBotClient, getClient, setBotState } from "./client";
import { registerEvents } from "./events";
import { registerCommands } from "./register-commands";

/**
 * Boots the discord.js client: wires events, logs in, registers slash commands.
 * Safe to call once per process; no-ops if already started or if there's no token.
 */
export async function startBot(): Promise<void> {
  if (getClient()) return; // HMR / double-call guard

  if (!env.DISCORD_TOKEN) {
    logger.warn(
      "discord",
      "DISCORD_TOKEN not set — bot stays offline (dashboard still runs).",
    );
    return;
  }

  const client = createBotClient();
  setBotState({ client });
  registerEvents(client);

  try {
    await client.login(env.DISCORD_TOKEN);
    await registerCommands();
    logger.info("discord", "Slash commands registered.");
  } catch (err) {
    logger.error("discord", "Failed to start bot", err);
    setBotState({ client: null, ready: false });
  }
}
