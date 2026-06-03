import { PermissionFlagsBits } from "discord.js";
import { env } from "@/env";
import { getClient } from "@/server/integrations/discord/client";

/**
 * Access levels are ordered. Phase 0 derives them from Discord permissions in our guild;
 * later they become capability-based with configurable role mapping (planning/07 seam 9).
 */
export type AccessLevel = "owner" | "admin" | "mod" | "viewer";

const ORDER: AccessLevel[] = ["viewer", "mod", "admin", "owner"];

export function atLeast(level: AccessLevel, required: AccessLevel): boolean {
  return ORDER.indexOf(level) >= ORDER.indexOf(required);
}

/**
 * Resolve a Discord user's dashboard access level from their role in our guild.
 * Falls back to "viewer" if the bot isn't ready or the user can't be resolved.
 */
export async function resolveAccessLevel(userId: string): Promise<AccessLevel> {
  const client = getClient();
  const guildId = env.DISCORD_GUILD_ID;
  if (!client || !guildId) return "viewer";

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
