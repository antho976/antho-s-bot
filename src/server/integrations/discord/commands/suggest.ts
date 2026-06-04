import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./types";
import { ensureGuild, reply } from "./guard";
import { track } from "@/server/core/analytics";
import { addFeedback } from "@/server/features/support/queries";

export const suggest: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Send a suggestion to the server staff")
    .addStringOption((o) =>
      o.setName("idea").setDescription("Your suggestion").setRequired(true).setMaxLength(1000),
    ),
  execute: async (interaction) => {
    const guildId = await ensureGuild(interaction);
    if (!guildId) return;

    const idea = interaction.options.getString("idea", true);
    await addFeedback(guildId, interaction.user.id, idea);
    await track(guildId, "feedback.create", {});
    await reply(interaction, "✅ Thanks! Your suggestion was sent to the staff.");
  },
};
