import { Events, MessageFlags, type Client } from "discord.js";
import { logger } from "@/server/core/logger";
import { commandMap } from "../commands";

/** Dispatches slash-command interactions to their handlers. */
export function registerInteractionCreate(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = commandMap.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error("discord", `Command /${interaction.commandName} failed`, err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction
          .reply({ content: "Something went wrong.", flags: MessageFlags.Ephemeral })
          .catch(() => {});
      }
    }
  });
}
