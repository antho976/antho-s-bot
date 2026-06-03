import { Events, MessageFlags, type Client } from "discord.js";
import { logger } from "@/server/core/logger";
import { RPG_PREFIX } from "./domain/custom-id";
import { handleRpgComponent } from "./router";

/** Routes RPG button/select interactions (custom_id `rpg:…`) into the hub router. */
export function registerRpgEvents(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
    if (!interaction.customId.startsWith(`${RPG_PREFIX}:`)) return;
    try {
      await handleRpgComponent(interaction);
    } catch (err) {
      logger.error("rpg", "Component handler failed", err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction
          .reply({ content: "Something went wrong.", flags: MessageFlags.Ephemeral })
          .catch(() => {});
      }
    }
  });
}
