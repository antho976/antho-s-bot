import { REST, Routes } from "discord.js";
import { env } from "@/env";
import { commands } from "./commands";

/**
 * Registers slash commands to our guild (instant, vs global which can take ~1h).
 * No-ops if Discord credentials aren't set yet.
 */
export async function registerCommands(): Promise<void> {
  if (!env.DISCORD_TOKEN || !env.DISCORD_CLIENT_ID || !env.DISCORD_GUILD_ID) return;

  const rest = new REST().setToken(env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID),
    { body: commands.map((c) => c.data.toJSON()) },
  );
}
