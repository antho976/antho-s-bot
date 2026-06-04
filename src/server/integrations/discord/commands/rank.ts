import { EmbedBuilder, SlashCommandBuilder, type APIEmbedField } from "discord.js";
import type { BotCommand } from "./types";
import { ensureGuild } from "./guard";
import { progressFromXp } from "@/server/features/leveling/domain/curve";
import { fmtMinutes, progressBar } from "@/server/features/leveling/domain/format";
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
    const pct = p.needed > 0 ? Math.round((p.into / p.needed) * 100) : 100;

    const fields: APIEmbedField[] = [
      { name: "🏆 Rank", value: `#${rankPos}${total ? ` / ${total}` : ""}`, inline: true },
      { name: "⭐ Total XP", value: xp.toLocaleString(), inline: true },
    ];
    if (row && row.prestige > 0) {
      fields.push({ name: "✨ Prestige", value: `${row.prestige}`, inline: true });
    }
    fields.push(
      { name: "💬 Messages", value: (row?.messages ?? 0).toLocaleString(), inline: true },
      { name: "🎙️ Voice", value: fmtMinutes(row?.voiceMinutes ?? 0), inline: true },
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({
        name: target.displayName ?? target.username,
        iconURL: target.displayAvatarURL(),
      })
      .setThumbnail(target.displayAvatarURL())
      .setTitle(`Level ${p.level}`)
      .setDescription(
        `\`${progressBar(pct)}\` **${pct}%**\n` +
          `**${p.into.toLocaleString()}** / **${p.needed.toLocaleString()}** XP to level ${p.level + 1}`,
      )
      .addFields(fields);

    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
