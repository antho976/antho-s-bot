import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type User } from "discord.js";
import { RPG } from "../config";
import { buildId } from "../domain/custom-id";
import type { RpgScreen } from "./types";

/** The Options screen — character management. */
export function renderOptions(user: User): RpgScreen {
  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("⚙️  Options")
    .setDescription("Manage your character.");

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "options", "delete"))
      .setLabel("Delete character")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "hub"))
      .setLabel("Back")
      .setEmoji("◀️")
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row] };
}

/** Confirmation gate before a destructive delete. */
export function renderDeleteConfirm(user: User): RpgScreen {
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle("🗑️  Delete character?")
    .setDescription("This permanently deletes your character and everything on it. It can't be undone.");

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "options", "confirm"))
      .setLabel("Yes, delete")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "options"))
      .setLabel("Cancel")
      .setEmoji("◀️")
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row] };
}
