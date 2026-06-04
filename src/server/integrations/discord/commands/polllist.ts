import { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./types";
import { ensureAdmin, truncate } from "./guard";
import { listPolls } from "@/server/features/polls/queries";

export const polllist: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("polllist")
    .setDescription("List recent polls")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  execute: async (interaction) => {
    const guildId = await ensureAdmin(interaction);
    if (!guildId) return;

    const polls = await listPolls(guildId);
    const lines = polls.slice(0, 25).map((p) => {
      const mark = p.status === "active" ? "🟢" : "⚪";
      return `${mark} **#${p.id}** ${truncate(p.question, 60)} — ${p.status}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle("Polls")
      .setDescription(lines.length ? lines.join("\n") : "_No polls yet._");
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
