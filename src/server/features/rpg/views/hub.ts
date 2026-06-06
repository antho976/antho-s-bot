import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type User } from "discord.js";
import { HUB_CATEGORIES, RPG } from "../config";
import { buildId } from "../domain/custom-id";
import { classDef, maxHp, xpForLevel } from "../domain/stats";
import type { RpgPlayer } from "../queries";
import type { RpgScreen } from "./types";

/** Category `style` token → Discord button color. */
const BUTTON_STYLE: Record<string, ButtonStyle> = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
};

/** Chunk hub category buttons into rows of 3 (stays well under Discord's 5×5 component cap). */
function categoryRows(ownerId: string): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < HUB_CATEGORIES.length; i += 3) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...HUB_CATEGORIES.slice(i, i + 3).map((c) =>
        new ButtonBuilder()
          .setCustomId(buildId(ownerId, c.view))
          .setLabel(c.label)
          .setEmoji(c.emoji)
          .setStyle(BUTTON_STYLE[c.style] ?? ButtonStyle.Secondary),
      ),
    );
    rows.push(row);
  }
  return rows;
}

/** The public, owner-gated profile hub. `user` is the owner (the router guarantees it). */
export function renderHub(player: RpgPlayer, user: User): RpgScreen {
  const cls = classDef(player.classId);
  const needed = xpForLevel(player.level);
  const name = player.name ?? user.displayName;

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setAuthor({
      name: `${name} • Level ${player.level} • ${cls.name}`,
      iconURL: user.displayAvatarURL({ size: 128 }),
    })
    .addFields(
      {
        name: "📊  Progress",
        value: [
          `XP: **${player.xp.toLocaleString()}** / ${needed.toLocaleString()}`,
          `HP: **${player.hp.toLocaleString()}** / ${maxHp(cls, player.level).toLocaleString()}`,
        ].join("\n"),
        inline: false,
      },
      {
        name: "💰  Resources",
        value: `Gold: **${player.gold.toLocaleString()}**`,
        inline: false,
      },
    )
    .setTimestamp();

  return { embeds: [embed], components: categoryRows(user.id) };
}

/** The "Player" sub-menu — Inventory and Skills live here, one Back away from the hub. */
export function renderPlayer(player: RpgPlayer, user: User): RpgScreen {
  const cls = classDef(player.classId);
  const name = player.name ?? user.displayName;

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setAuthor({
      name: `${name} • Level ${player.level} • ${cls.name}`,
      iconURL: user.displayAvatarURL({ size: 128 }),
    })
    .setDescription("Your pack, skills, professions, and gear.");

  const nav = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "inventory"))
      .setLabel("Inventory")
      .setEmoji("🎒")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "skills"))
      .setLabel("Skills")
      .setEmoji("🌳")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "smith"))
      .setLabel("Professions")
      .setEmoji("🛠️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "smith", "craft"))
      .setLabel("Crafting")
      .setEmoji("🔨")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "smith", "weapons"))
      .setLabel("Equipment")
      .setEmoji("⚔️")
      .setStyle(ButtonStyle.Primary),
  );

  const back = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "hub"))
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [nav, back] };
}
