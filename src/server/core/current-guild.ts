import { cookies } from "next/headers";
import { PRIMARY_GUILD_ID, isKnownGuild } from "@/server/core/guilds";

/** Cookie the dashboard uses to remember which guild you're managing. */
export const GUILD_COOKIE = "dash_guild";

/**
 * The guild the dashboard is currently scoped to. Reads the selection cookie, validates it against
 * the configured guilds, and falls back to the primary guild when absent or unknown.
 *
 * Request-scoped only (uses `next/headers`) — call it from pages, route handlers, and server
 * actions. The bot side never uses this; it derives the guild from the gateway event instead.
 */
export async function getCurrentGuildId(): Promise<string> {
  const value = (await cookies()).get(GUILD_COOKIE)?.value;
  return value && isKnownGuild(value) ? value : PRIMARY_GUILD_ID;
}
