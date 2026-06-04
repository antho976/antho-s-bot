import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./types";

export const help: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("What this bot does and how to get started"),
  execute: async (interaction) => {
    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle("Need a hand?")
      .setDescription(
        [
          "I track chat levels, run polls & giveaways, host a little RPG, and pass your ideas to the staff.",
          "",
          "**Get started**",
          "• `/rank` — check your level and where you place",
          "• `/leaderboards` — see who's on top",
          "• `/rpg` — begin your adventure",
          "• `/suggest` — send the staff an idea",
          "",
          "Run `/commands` for the full list and who can use each one.",
        ].join("\n"),
      );
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
