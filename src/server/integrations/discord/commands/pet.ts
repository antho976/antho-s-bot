import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./types";
import { createSubmission } from "@/server/features/pets/queries";

export const pet: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("pet")
    .setDescription("Submit a pet for approval")
    .addSubcommand((s) =>
      s
        .setName("submit")
        .setDescription("Submit a pet for the mods to review")
        .addStringOption((o) =>
          o.setName("name").setDescription("Pet name").setRequired(true).setMaxLength(100),
        )
        .addStringOption((o) => o.setName("note").setDescription("Details").setMaxLength(300))
        .addStringOption((o) => o.setName("image").setDescription("Image URL").setMaxLength(500)),
    ),
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: "Use this in a server.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (interaction.options.getSubcommand() !== "submit") return;
    const name = interaction.options.getString("name", true);
    await createSubmission({
      guildId: interaction.guildId,
      userId: interaction.user.id,
      petName: name,
      note: interaction.options.getString("note"),
      imageUrl: interaction.options.getString("image"),
    });
    await interaction.reply({
      content: `🐾 Submitted **${name}** for review.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
