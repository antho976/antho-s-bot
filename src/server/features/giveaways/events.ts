import {
  Events,
  type Client,
  type MessageReaction,
  type PartialMessageReaction,
  type PartialUser,
  type User,
} from "discord.js";
import { handleGiveawayReaction } from "./service";

/** Track 🎉 reactions as giveaway entries. */
export function registerGiveawayEvents(client: Client): void {
  const handle = async (
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
    added: boolean,
  ) => {
    if (user.bot) return;
    try {
      if (reaction.partial) await reaction.fetch();
    } catch {
      return;
    }
    await handleGiveawayReaction(reaction, user, added);
  };
  client.on(Events.MessageReactionAdd, (r, u) => handle(r, u, true));
  client.on(Events.MessageReactionRemove, (r, u) => handle(r, u, false));
}
