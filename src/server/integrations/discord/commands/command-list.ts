import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./types";
import { COMMAND_CATALOG } from "./catalog";

const lines = (admin: boolean) =>
  COMMAND_CATALOG.filter((c) => c.admin === admin)
    .map((c) => `**/${c.name}** — ${c.summary}`)
    .join("\n") || "_None_";

/** Public command listing. File is named command-list to avoid clashing with the index barrel. */
export const commandList: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("commands")
    .setDescription("List every command and who can use it"),
  execute: async (interaction) => {
    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle("Commands")
      .addFields(
        { name: "Everyone", value: lines(false) },
        { name: "Admins · needs Manage Server", value: lines(true) },
      );
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
