import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./types";
import { ensureGuild } from "./guard";
import { progressFromXp } from "@/server/features/leveling/domain/curve";
import {
  getConfig,
  getLevelRow,
  rankedMemberCount,
  xpRank,
} from "@/server/features/leveling/queries";
import { curveFor } from "@/server/features/leveling/service";

export const rank: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("See your chatting level and rank")
    .addUserOption((o) =>
      o.setName("user").setDescription("Whose rank to show (defaults to you)"),
    ),
  execute: async (interaction) => {
    const guildId = await ensureGuild(interaction);
    if (!guildId) return;

    const target = interaction.options.getUser("user") ?? interaction.user;
    const [row, config] = await Promise.all([getLevelRow(guildId, target.id), getConfig(guildId)]);
    const { c, custom } = await curveFor(config);

    const xp = row?.xp ?? 0;
    const p = progressFromXp(xp, c, custom);
    const [rankPos, total] = await Promise.all([xpRank(guildId, xp), rankedMemberCount(guildId)]);
    const pct = p.needed > 0 ? Math.round((p.into / p.needed) * 100) : 0;

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setAuthor({
        name: target.displayName ?? target.username,
        iconURL: target.displayAvatarURL(),
      })
      .setTitle(`Level ${p.level}`)
      .setDescription(
        `**Rank** #${rankPos}${total ? ` of ${total}` : ""}\n` +
          `**Progress** ${p.into.toLocaleString()} / ${p.needed.toLocaleString()} XP to next level (${pct}%)\n` +
          `**Total XP** ${xp.toLocaleString()}` +
          (row && row.prestige > 0 ? `\n**Prestige** ${row.prestige}` : ""),
      )
      .addFields(
        { name: "Messages", value: (row?.messages ?? 0).toLocaleString(), inline: true },
        { name: "Voice", value: `${(row?.voiceMinutes ?? 0).toLocaleString()} min`, inline: true },
      );

    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
