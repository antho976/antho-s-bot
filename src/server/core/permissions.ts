import { PermissionFlagsBits, type Client } from "discord.js";
import { getClient } from "@/server/integrations/discord/client";
import { GUILD_IDS } from "./guilds";

/**
 * Access levels are ordered. Phase 0 derives them from Discord permissions in our guild(s);
 * later they become capability-based with configurable role mapping (planning/07 seam 9).
 */
export type AccessLevel = "owner" | "admin" | "mod" | "viewer";

const ORDER: AccessLevel[] = ["viewer", "mod", "admin", "owner"];

export function atLeast(level: AccessLevel, required: AccessLevel): boolean {
  return ORDER.indexOf(level) >= ORDER.indexOf(required);
}

/** A user's access level within a single guild (viewer if unresolved). */
async function levelInGuild(
  client: Client,
  guildId: string,
  userId: string,
): Promise<AccessLevel> {
  try {
    const guild = await client.guilds.fetch(guildId);
    if (guild.ownerId === userId) return "owner";

    const member = await guild.members.fetch(userId);
    const p = member.permissions;
    if (p.has(PermissionFlagsBits.Administrator)) return "admin";
    if (p.has(PermissionFlagsBits.ManageGuild) || p.has(PermissionFlagsBits.ModerateMembers)) {
      return "mod";
    }
    return "viewer";
  } catch {
    return "viewer";
  }
}

/**
 * Resolve a Discord user's dashboard access level as the HIGHEST level they hold across any
 * configured guild. With multiple servers, being owner/admin of one grants that tier in the
 * dashboard. Falls back to "viewer" if the bot isn't ready.
 */
export async function resolveAccessLevel(userId: string): Promise<AccessLevel> {
  const client = getClient();
  if (!client) return "viewer";

  let best: AccessLevel = "viewer";
  for (const guildId of GUILD_IDS) {
    if (guildId === "default") continue;
    const level = await levelInGuild(client, guildId, userId);
    if (ORDER.indexOf(level) > ORDER.indexOf(best)) best = level;
    if (best === "owner") break;
  }
  return best;
}
