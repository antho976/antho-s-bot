import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { BotCommand } from "./types";
import { ensureAdmin } from "./guard";
import { createPollInChannel } from "@/server/features/polls/service";

export const poll: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Post a reaction poll (also shows in the dashboard)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o.setName("question").setDescription("The poll question").setRequired(true).setMaxLength(256),
    )
    .addStringOption((o) =>
      o.setName("option1").setDescription("Choice 1").setRequired(true).setMaxLength(100),
    )
    .addStringOption((o) =>
      o.setName("option2").setDescription("Choice 2").setRequired(true).setMaxLength(100),
    )
    .addStringOption((o) => o.setName("option3").setDescription("Choice 3").setMaxLength(100))
    .addStringOption((o) => o.setName("option4").setDescription("Choice 4").setMaxLength(100))
    .addStringOption((o) => o.setName("option5").setDescription("Choice 5").setMaxLength(100))
    .addIntegerOption((o) =>
      o
        .setName("minutes")
        .setDescription("Auto-close after N minutes (0 = close it manually)")
        .setMinValue(0)
        .setMaxValue(20_160),
    )
    .addBooleanOption((o) => o.setName("multi").setDescription("Allow multiple choices"))
    .addChannelOption((o) =>
      o
        .setName("channel")
        .setDescription("Where to post (defaults to here)")
        .addChannelTypes(ChannelType.GuildText),
    ),
  execute: async (interaction) => {
    const guildId = await ensureAdmin(interaction);
    if (!guildId) return;

    const options = [1, 2, 3, 4, 5]
      .map((i) => interaction.options.getString(`option${i}`))
      .filter((v): v is string => Boolean(v && v.trim()));
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
      const created = await createPollInChannel({
        guildId,
        channelId: channel.id,
        question: interaction.options.getString("question", true),
        options,
        multi: interaction.options.getBoolean("multi") ?? false,
        durationMin: interaction.options.getInteger("minutes") ?? 0,
        createdBy: interaction.user.id,
      });
      await interaction.editReply(`📊 Poll **#${created.id}** posted in <#${channel.id}>.`);
    } catch {
      await interaction.editReply("Couldn't post the poll — check my permissions in that channel.");
    }
  },
};
