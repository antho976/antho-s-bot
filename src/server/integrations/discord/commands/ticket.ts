import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./types";
import { closeTicketCommand, openTicket } from "@/server/features/support/service";

export const ticket: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Open or close a support ticket")
    .addSubcommand((s) =>
      s
        .setName("open")
        .setDescription("Open a support ticket")
        .addStringOption((o) =>
          o
            .setName("subject")
            .setDescription("What do you need help with?")
            .setRequired(true)
            .setMaxLength(200),
        ),
    )
    .addSubcommand((s) => s.setName("close").setDescription("Close the current ticket")),
  execute: async (interaction) => {
    const sub = interaction.options.getSubcommand();
    if (sub === "open") {
      await openTicket(interaction, interaction.options.getString("subject", true));
    } else {
      await closeTicketCommand(interaction);
    }
  },
};
