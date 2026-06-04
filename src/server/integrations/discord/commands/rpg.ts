import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./types";
import { track } from "@/server/core/analytics";
import { getPlayer, getRpgConfig } from "@/server/features/rpg/queries";
import { rememberHubMessage, withRegen } from "@/server/features/rpg/service";
import { renderHub } from "@/server/features/rpg/views/hub";
import { renderIntro } from "@/server/features/rpg/views/onboarding";

export const rpg: BotCommand = {
  data: new SlashCommandBuilder().setName("rpg").setDescription("Open your adventure hub"),
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: "Use this in a server.", flags: MessageFlags.Ephemeral });
      return;
    }
    const guildId = interaction.guildId;

    const config = await getRpgConfig(guildId);
    if (!config.enabled) {
      await interaction.reply({
        content: "The RPG isn't enabled on this server yet.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await track(guildId, "rpg_command", {});

    const existing = await getPlayer(guildId, interaction.user.id);
    if (!existing) {
      // No character yet — show the intro lore (its button leads to class selection).
      await interaction.reply(renderIntro(interaction.user));
      return;
    }

    const player = await withRegen(existing);
    await interaction.reply(renderHub(player, interaction.user));
    const message = await interaction.fetchReply();
    await rememberHubMessage(player, message); // replace the player's previous board
  },
};
