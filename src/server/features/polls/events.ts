import { Events, type Client } from "discord.js";
import { handlePollReaction } from "./service";

/** Enforce single-choice polls when users vote. */
export function registerPollEvents(client: Client): void {
  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return;
    try {
      if (reaction.partial) await reaction.fetch();
    } catch {
      return;
    }
    await handlePollReaction(reaction, user);
  });
}
