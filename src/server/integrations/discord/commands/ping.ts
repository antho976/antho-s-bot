import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./types";

export const ping: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check the bot is alive and see its latency."),
  execute: async (interaction) => {
    const ws = Math.round(interaction.client.ws.ping);
    await interaction.reply({
      content: `🏓 Pong! Gateway latency: ${ws}ms`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
