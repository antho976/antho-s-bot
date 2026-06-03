import { Events, type Client } from "discord.js";
import { handleCustomCommand } from "./service";

/** Run `!name` custom commands on every guild message. */
export function registerCustomCommandEvents(client: Client): void {
  client.on(Events.MessageCreate, async (message) => {
    await handleCustomCommand(message);
  });
}
