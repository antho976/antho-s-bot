import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type User } from "discord.js";
import { HUB_CATEGORIES, RPG } from "../config";
import { buildId } from "../domain/custom-id";
import { classDef, maxHp, xpBar, xpForLevel } from "../domain/stats";
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
  const bar = xpBar(player.xp, needed, 18);
  const avatar = user.displayAvatarURL({ size: 128 });

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setAuthor({ name: player.name ?? user.displayName, iconURL: avatar })
    .setTitle(`${cls.name} · Level ${player.level}`)
    .addFields(
      { name: "Level", value: `\`${player.level}\``, inline: true },
      { name: "Health", value: `❤️ ${player.hp} / ${maxHp(cls, player.level)}`, inline: true },
      { name: "Gold", value: `💰 ${player.gold.toLocaleString()}`, inline: true },
      {
        name: "Experience",
        value: `${bar}\n\`${player.xp.toLocaleString()} / ${needed.toLocaleString()} XP\``,
        inline: false,
      },
    )
    .setFooter({ text: cls.blurb });

  return { embeds: [embed], components: categoryRows(user.id) };
}
