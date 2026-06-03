import { Events, type Client } from "discord.js";
import { awardMessageXp, awardReactionXp } from "./service";

/** Attach the leveling gateway handlers (message XP, reaction XP) to the client. */
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
}
