import { Events, type Client } from "discord.js";
import { logger } from "@/server/core/logger";
import { registerReady } from "./ready";
import { registerInteractionCreate } from "./interaction-create";

/**
 * Attaches all gateway event handlers to the client.
 * Feature modules register their own handlers here as they're added.
 */
export function registerEvents(client: Client): void {
  registerReady(client);
  registerInteractionCreate(client);
  client.on(Events.Error, (err) => logger.error("discord", "Gateway client error", err));
}
