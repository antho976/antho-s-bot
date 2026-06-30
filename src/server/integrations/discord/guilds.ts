import { getClient } from "./client";
import { GUILD_IDS } from "@/server/core/guilds";

export interface ManagedGuild {
  id: string;
  name: string;
}

/**
 * The configured guilds with display names pulled from the gateway cache (falls back to the raw
 * id when the bot isn't in that guild yet). Powers the dashboard's guild switcher.
 */
export function listManagedGuilds(): ManagedGuild[] {
  const client = getClient();
  return GUILD_IDS.filter((id) => id !== "default").map((id) => ({
    id,
    name: client?.guilds.cache.get(id)?.name ?? id,
  }));
}
