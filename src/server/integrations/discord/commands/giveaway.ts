import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { BotCommand } from "./types";
import { ensureAdmin } from "./guard";
import { createGiveawayInChannel } from "@/server/features/giveaways/service";

export const giveaway: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Start a giveaway (also shows in the dashboard)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o.setName("prize").setDescription("What you're giving away").setRequired(true).setMaxLength(200),
    )
    .addIntegerOption((o) =>
      o
        .setName("minutes")
        .setDescription("How long it runs, in minutes")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(43_200),
    )
    .addIntegerOption((o) =>
      o.setName("winners").setDescription("Number of winners (default 1)").setMinValue(1).setMaxValue(50),
    )
    .addIntegerOption((o) =>
      o.setName("minlevel").setDescription("Minimum level to enter").setMinValue(0).setMaxValue(1000),
    )
    .addRoleOption((o) => o.setName("pingrole").setDescription("Role to ping when it starts"))
    .addChannelOption((o) =>
      o
        .setName("channel")
        .setDescription("Where to post (defaults to here)")
        .addChannelTypes(ChannelType.GuildText),
    ),
  execute: async (interaction) => {
    const guildId = await ensureAdmin(interaction);
    if (!guildId) return;

    const channel = interaction.options.getChannel("channel") ?? interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: "Pick a text channel to post in.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const created = await createGiveawayInChannel({
        guildId,
        channelId: channel.id,
        prize: interaction.options.getString("prize", true),
        winnersCount: interaction.options.getInteger("winners") ?? 1,
        durationMin: interaction.options.getInteger("minutes", true),
        minLevel: interaction.options.getInteger("minlevel") ?? 0,
        pingRoleId: interaction.options.getRole("pingrole")?.id ?? null,
        createdBy: interaction.user.id,
      });
      await interaction.editReply(
        `🎉 Giveaway **#${created.id}** for **${created.prize}** posted in <#${channel.id}>.`,
      );
    } catch {
      await interaction.editReply("Couldn't post the giveaway — check my permissions in that channel.");
    }
  },
};
