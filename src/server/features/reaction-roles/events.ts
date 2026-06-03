import { Events, type Client } from "discord.js";
import { handleReaction } from "./service";

/** Grant/remove roles when users react on reaction-role panels (handles uncached reactions). */
export function registerReactionRoleEvents(client: Client): void {
  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return;
    try {
      if (reaction.partial) await reaction.fetch();
    } catch {
      return;
    }
    await handleReaction(reaction, user, true);
  });

  client.on(Events.MessageReactionRemove, async (reaction, user) => {
    if (user.bot) return;
    try {
      if (reaction.partial) await reaction.fetch();
    } catch {
      return;
    }
    await handleReaction(reaction, user, false);
  });
}
