import { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./types";
import { ensureAdmin, truncate } from "./guard";
import { listGiveaways } from "@/server/features/giveaways/queries";

export const giveawaylist: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("giveawaylist")
    .setDescription("List recent giveaways")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  execute: async (interaction) => {
    const guildId = await ensureAdmin(interaction);
    if (!guildId) return;

    const giveaways = await listGiveaways(guildId);
    const lines = giveaways.slice(0, 25).map((g) => {
      const mark = g.status === "active" ? "🟢" : g.status === "cancelled" ? "🔴" : "⚪";
      const when =
        g.status === "active"
          ? `ends <t:${Math.floor(g.endsAt.getTime() / 1000)}:R>`
          : `${g.status}${g.winnersJson ? ` · ${(JSON.parse(g.winnersJson) as string[]).length} winner(s)` : ""}`;
      return `${mark} **#${g.id}** ${truncate(g.prize, 50)} — ${when}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0xa855f7)
      .setTitle("Giveaways")
      .setDescription(lines.length ? lines.join("\n") : "_No giveaways yet._");
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
