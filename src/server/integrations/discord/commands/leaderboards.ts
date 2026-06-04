import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./types";
import { ensureGuild, reply } from "./guard";
import { renderLeaderboard } from "@/server/features/leveling/leaderboard";

export const leaderboards: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("leaderboards")
    .setDescription("Server leaderboards: XP, voice, messages and time in the server"),
  execute: async (interaction) => {
    const guildId = await ensureGuild(interaction);
    if (!guildId) return;
    if (!interaction.guild) {
      await reply(interaction, "Server data isn't ready yet — try again in a moment.");
      return;
    }

    // Opens on XP; the buttons switch to messages, voice and time-in-server.
    const screen = await renderLeaderboard(interaction.guild, "xp");
    await interaction.reply({ ...screen, allowedMentions: { parse: [] } });
  },
};
