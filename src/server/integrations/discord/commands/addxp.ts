import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./types";
import { ensureAdmin, reply } from "./guard";
import { addXpAdmin } from "@/server/features/leveling/service";

export const addxp: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("addxp")
    .setDescription("Add or remove a member's XP")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((o) => o.setName("user").setDescription("Member to adjust").setRequired(true))
    .addIntegerOption((o) =>
      o
        .setName("amount")
        .setDescription("XP to add (use a negative number to remove)")
        .setRequired(true)
        .setMinValue(-10_000_000)
        .setMaxValue(10_000_000),
    ),
  execute: async (interaction) => {
    const guildId = await ensureAdmin(interaction);
    if (!guildId) return;

    const user = interaction.options.getUser("user", true);
    const amount = interaction.options.getInteger("amount", true);
    if (user.bot) {
      await reply(interaction, "Bots don't earn XP.");
      return;
    }

    const row = await addXpAdmin(guildId, user.id, amount, interaction.channelId);
    const verb = amount >= 0 ? "Added" : "Removed";
    const prep = amount >= 0 ? "to" : "from";
    await reply(
      interaction,
      `${verb} **${Math.abs(amount).toLocaleString()}** XP ${prep} **${user.username}** — ` +
        `now level **${row.level}** (${row.xp.toLocaleString()} XP).`,
    );
  },
};
