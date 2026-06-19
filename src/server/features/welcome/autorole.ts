import { type GuildMember } from "discord.js";
import { track } from "@/server/core/analytics";
import { getConfig } from "./queries";

/**
 * Hand the configured auto-roles to a member that just joined. Best-effort: roles that don't
 * exist, are integration-managed, or sit above the bot's top role are skipped (a 403 on those
 * would otherwise drop the whole batch), and any remaining failure is swallowed so a bad role
 * can never break the join handler.
 */
export async function applyAutoRoles(member: GuildMember): Promise<void> {
  const config = await getConfig(member.guild.id);
  if (!config.autoRoleEnabled || config.autoRoleIds.length === 0) return;

  const me = member.guild.members.me;
  const myTop = me?.roles.highest.position ?? Infinity;
  const assignable = config.autoRoleIds.filter((id) => {
    const role = member.guild.roles.cache.get(id);
    return role !== undefined && !role.managed && role.position < myTop;
  });
  if (assignable.length === 0) return;

  await member.roles.add(assignable, "Welcome auto-role").catch(() => {});
  await track(member.guild.id, "welcome.autorole", {
    userId: member.id,
    count: assignable.length,
  });
}
