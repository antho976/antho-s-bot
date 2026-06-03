import { Events, type Client } from "discord.js";
import { logger } from "@/server/core/logger";
import { setBotState } from "../client";

/** Marks the bot ready and logs the connection once the gateway handshake completes. */
export function registerReady(client: Client): void {
  client.once(Events.ClientReady, (c) => {
    setBotState({ ready: true, startedAt: Date.now() });
    logger.info(
      "discord",
      `Logged in as ${c.user.tag} — ${c.guilds.cache.size} guild(s).`,
    );
  });
}
