import { Events, type Client } from "discord.js";
import { runAutomod } from "./service";

/** Run scam automod on every guild message. */
export function registerAutomodEvents(client: Client): void {
  client.on(Events.MessageCreate, async (message) => {
    await runAutomod(message);
  });
}
