import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./types";
import { ensureGuild } from "./guard";
import { track } from "@/server/core/analytics";
import { isFeatureEnabled } from "@/server/core/guilds";

// The dungeon crew role this command rallies. Both pings mention it.
const DUNGEON_ROLE_ID = "1462471504187883531";

// Two flavours of the same call-to-arms — the message differs by timing, the role ping doesn't.
const PINGS: Record<string, string> = {
  happy: `🍻 <@&${DUNGEON_ROLE_ID}> **Happy Hour dungeons are live!** Bonus XP & loot are dropping right now — group up and let's clear some dungeons! ⚔️`,
  outside: `⚔️ <@&${DUNGEON_ROLE_ID}> **Dungeon run forming!** No happy-hour bonuses right now, but we're heading in — come join the party!`,
};

export const dungeons: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("dungeons")
    .setDescription("Rally the dungeon crew with a ping")
    .addStringOption((o) =>
      o
        .setName("when")
        .setDescription("Happy hour or outside happy hour?")
        .setRequired(true)
        .addChoices(
          { name: "Happy Hour", value: "happy" },
          { name: "Outside Happy Hour", value: "outside" },
        ),
    ),
  feature: "dungeons",
  execute: async (interaction) => {
    const guildId = await ensureGuild(interaction);
    if (!guildId) return;

    if (!isFeatureEnabled(guildId, "dungeons")) {
      await interaction.reply({
        content: "Not available on this server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const when = interaction.options.getString("when", true);
    // Public reply (not ephemeral) so the role ping actually notifies the crew.
    await interaction.reply({
      content: PINGS[when] ?? PINGS.outside,
      allowedMentions: { roles: [DUNGEON_ROLE_ID] },
    });
    await track(guildId, "dungeons.ping", { when });
  },
};
