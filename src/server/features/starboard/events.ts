import { Events, type Client } from "discord.js";
import { handleStarReaction } from "./service";

/** Re-count stars on add/remove and mirror highly-starred messages to the starboard. */
export function registerStarboardEvents(client: Client): void {
  const handle = async (reaction: Parameters<typeof handleStarReaction>[0]) => {
    try {
      if (reaction.partial) await reaction.fetch();
    } catch {
      return;
    }
    await handleStarReaction(reaction);
  };
  client.on(Events.MessageReactionAdd, (reaction) => handle(reaction));
  client.on(Events.MessageReactionRemove, (reaction) => handle(reaction));
}
