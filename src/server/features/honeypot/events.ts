import { Events, type Client } from "discord.js";
import { runHoneypot } from "./service";

/** Run the honeypot check on every guild message. */
export function registerHoneypotEvents(client: Client): void {
  client.on(Events.MessageCreate, async (message) => {
    await runHoneypot(message);
  });
}
