import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./types";
import { removeBirthday, setBirthday } from "@/server/features/birthdays/queries";

export const birthday: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("birthday")
    .setDescription("Set or remove your birthday")
    .addSubcommand((s) =>
      s
        .setName("set")
        .setDescription("Set your birthday")
        .addIntegerOption((o) =>
          o.setName("month").setDescription("Month (1-12)").setRequired(true).setMinValue(1).setMaxValue(12),
        )
        .addIntegerOption((o) =>
          o.setName("day").setDescription("Day (1-31)").setRequired(true).setMinValue(1).setMaxValue(31),
        ),
    )
    .addSubcommand((s) => s.setName("remove").setDescription("Remove your birthday")),
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: "Use this in a server.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (interaction.options.getSubcommand() === "set") {
      const month = interaction.options.getInteger("month", true);
      const day = interaction.options.getInteger("day", true);
      await setBirthday(interaction.guildId, interaction.user.id, month, day);
      await interaction.reply({ content: `🎂 Birthday set to ${month}/${day}.`, flags: MessageFlags.Ephemeral });
    } else {
      await removeBirthday(interaction.guildId, interaction.user.id);
      await interaction.reply({ content: "Birthday removed.", flags: MessageFlags.Ephemeral });
    }
  },
};
