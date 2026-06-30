import { REST, Routes } from "discord.js";
import { env } from "@/env";
import { logger } from "@/server/core/logger";
import { GUILD_IDS, isFeatureEnabled } from "@/server/core/guilds";
import { commands } from "./commands";

/**
 * Registers slash commands per guild (instant, vs global which can take ~1h). Each guild gets only
 * the commands whose feature is enabled there, so a feature disabled for a guild (e.g. AI/RPG on a
 * secondary server) doesn't even appear in that server's command picker.
 * No-ops if Discord credentials aren't set yet.
 */
export async function registerCommands(): Promise<void> {
  if (!env.DISCORD_TOKEN || !env.DISCORD_CLIENT_ID) return;

  const rest = new REST().setToken(env.DISCORD_TOKEN);
  for (const guildId of GUILD_IDS) {
    if (guildId === "default") continue; // no real guild configured

    const body = commands
      .filter((c) => !c.feature || isFeatureEnabled(guildId, c.feature))
      .map((c) => c.data.toJSON());

    try {
      await rest.put(
        Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, guildId),
        { body },
      );
      logger.info("discord", `Registered ${body.length} commands to guild ${guildId}.`);
    } catch (err) {
      logger.error("discord", `Failed to register commands to guild ${guildId}`, err);
    }
  }
}
