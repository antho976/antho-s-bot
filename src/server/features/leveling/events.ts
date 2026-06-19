import { Events, type Client } from "discord.js";
import { awardMessageXp, awardReactionXp } from "./service";
import { syncRewardForRole } from "./reward-sync";

/** Attach the leveling gateway handlers (message XP, reaction XP, role-reward auto-detect). */
export function registerLevelingEvents(client: Client): void {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guildId) return;
    await awardMessageXp({
      guildId: message.guildId,
      userId: message.author.id,
      channelId: message.channelId,
    });
  });

  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return;
    const guildId = reaction.message.guildId;
    if (!guildId) return;
    await awardReactionXp({ guildId, userId: user.id });
  });

  // A new or renamed role that looks like "Lv 75" auto-registers as that level's reward.
  client.on(Events.GuildRoleCreate, async (role) => {
    await syncRewardForRole(role.guild.id, role.id, role.name).catch(() => {});
  });
  client.on(Events.GuildRoleUpdate, async (_old, role) => {
    await syncRewardForRole(role.guild.id, role.id, role.name).catch(() => {});
  });
}
