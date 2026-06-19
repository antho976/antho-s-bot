import { Events, type Client } from "discord.js";
import { applyAutoRoles } from "./autorole";
import { handleJoin, handleLeave } from "./service";

/** Attach welcome/goodbye gateway handlers (needs the Server Members intent). */
export function registerWelcomeEvents(client: Client): void {
  client.on(Events.GuildMemberAdd, async (member) => {
    await applyAutoRoles(member);
    await handleJoin({
      guildId: member.guild.id,
      userId: member.id,
      username: member.user.username,
      avatarUrl: member.user.displayAvatarURL({ extension: "png", size: 256 }),
      serverName: member.guild.name,
      memberCount: member.guild.memberCount,
    });
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    await handleLeave({
      guildId: member.guild.id,
      userId: member.id,
      username: member.user?.username ?? "Member",
      avatarUrl: member.user?.displayAvatarURL({ extension: "png", size: 256 }) ?? "",
      serverName: member.guild.name,
      memberCount: member.guild.memberCount,
    });
  });
}
