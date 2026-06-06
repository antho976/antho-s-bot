import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type User } from "discord.js";
import { DEV_TOOLS } from "@/env";
import { RPG } from "../config";
import { buildId } from "../domain/custom-id";
import { classDef, maxHp } from "../domain/stats";
import type { RpgPlayer } from "../queries";
import type { RpgScreen } from "./types";

/** The Options screen — character management (+ a dev cheat row on the test bot). */
export function renderOptions(user: User, player?: RpgPlayer): RpgScreen {
  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("⚙️  Options")
    .setDescription("Manage your character.");

  const rows: ActionRowBuilder<ButtonBuilder>[] = [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildId(user.id, "options", "delete"))
        .setLabel("Delete character")
        .setEmoji("🗑️")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(buildId(user.id, "hub"))
        .setLabel("Back")
        .setStyle(ButtonStyle.Secondary),
    ),
  ];

  // Dev cheat row — test bot only. Never rendered (and never handled) in production.
  if (DEV_TOOLS && player) {
    const cls = classDef(player.classId);
    embed.addFields({
      name: "🛠️  Dev tools",
      value: `Lvl **${player.level}** · 💰 **${player.gold}** · ❤️ **${player.hp}/${maxHp(cls, player.level)}** · cooldown off`,
    });
    const dev = (action: string, label: string, emoji: string) =>
      new ButtonBuilder()
        .setCustomId(buildId(user.id, "dev", action))
        .setLabel(label)
        .setEmoji(emoji)
        .setStyle(ButtonStyle.Secondary);
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        dev("level", "+5 Levels", "⬆️"),
        dev("gold", "+1000 Gold", "💰"),
        dev("keys", "+10 Keys", "🗝️"),
        dev("heal", "Full Heal", "❤️"),
      ),
    );
  }

  return { embeds: [embed], components: rows };
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
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row] };
}
