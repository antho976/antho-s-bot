import { Events, type Client } from "discord.js";
import { handleSmartReply } from "./service";

/** Run the AI chat-reply check on every guild message. */
export function registerSmartReplyEvents(client: Client): void {
  client.on(Events.MessageCreate, (message) => {
    void handleSmartReply(message);
  });
}
