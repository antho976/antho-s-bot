import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type User } from "discord.js";
import { HUB_CATEGORIES, RPG } from "../config";
import { buildId } from "../domain/custom-id";
import type { RpgScreen } from "./types";

/** Temporary view for categories not built yet — keeps navigation working end to end (Slice 1). */
export function renderPlaceholder(ownerId: string, view: string, _user: User): RpgScreen {
  const cat = HUB_CATEGORIES.find((c) => c.view === view);
  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle(`${cat?.emoji ?? "🚧"}  ${cat?.label ?? "Coming soon"}`)
    .setDescription("This area isn't built yet — check back soon.");
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(ownerId, "hub"))
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary),
  );
  return { embeds: [embed], components: [row] };
}
