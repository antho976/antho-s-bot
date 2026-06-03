import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type User } from "discord.js";
import { HUB_CATEGORIES, RPG } from "../config";
import { buildId } from "../domain/custom-id";
import { classDef, maxEnergy, maxHp, xpBar, xpForLevel } from "../domain/stats";
import type { RpgPlayer } from "../queries";
import type { RpgScreen } from "./types";

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
          .setStyle(ButtonStyle.Secondary),
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
  const bar = xpBar(player.xp, needed);

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle(`${cls.emoji}  ${player.name ?? user.displayName}`)
    .setThumbnail(user.displayAvatarURL())
    .setDescription(
      [
        `**Level ${player.level}**  ·  ${cls.name}`,
        `XP ${bar}  ${player.xp.toLocaleString()} / ${needed.toLocaleString()}`,
        `❤️ ${player.hp}/${maxHp(cls, player.level)}   ⚡ ${player.energy}/${maxEnergy(cls, player.level)}   💰 ${player.gold.toLocaleString()}g`,
      ].join("\n"),
    );

  return { embeds: [embed], components: categoryRows(user.id) };
}
