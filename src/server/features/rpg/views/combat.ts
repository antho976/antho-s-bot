import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type User } from "discord.js";
import { RPG, type Mob } from "../config";
import { buildId } from "../domain/custom-id";
import type { Rewards } from "../domain/adventure";
import { xpBar, xpForLevel } from "../domain/stats";
import type { RpgPlayer } from "../queries";
import type { RpgScreen } from "./types";

function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function cooldownRemaining(player: RpgPlayer, now: number): number {
  const last = player.lastAdventureAt ? player.lastAdventureAt.getTime() : 0;
  return RPG.adventureCooldownMs - (now - last);
}

/** Adventure + Back. The Adventure button stays enabled so a click refreshes the cooldown timer. */
function combatButtons(ownerId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(ownerId, "combat", "go"))
      .setLabel("Adventure")
      .setEmoji("🗺️")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(buildId(ownerId, "hub"))
      .setLabel("Back")
      .setEmoji("◀️")
      .setStyle(ButtonStyle.Secondary),
  );
}

/** The Combat landing screen: explains adventures + shows cooldown status. */
export function renderCombat(player: RpgPlayer, user: User, now: number): RpgScreen {
  const remaining = cooldownRemaining(player, now);
  const ready = remaining <= 0;

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("⚔️  Adventure")
    .setDescription(
      [
        "Head out to fight a roaming monster for **XP** and the occasional **key**.",
        "",
        ready
          ? "🟢 You're ready to set out."
          : `🟠 Resting… ready in **${formatRemaining(remaining)}**.`,
      ].join("\n"),
    )
    .addFields(
      { name: "Level", value: `\`${player.level}\``, inline: true },
      { name: "Keys", value: `🗝️ ${player.keys}`, inline: true },
      { name: "Gold", value: `💰 ${player.gold.toLocaleString()}`, inline: true },
    );

  return { embeds: [embed], components: [combatButtons(user.id)] };
}

/** Shown after a successful adventure: the encounter + what you got. */
export function renderAdventureResult(
  player: RpgPlayer,
  user: User,
  mob: Mob,
  rewards: Rewards,
  leveledTo: number | null,
): RpgScreen {
  const lines = [`You encountered a ${mob.emoji} **${mob.name}** and won!`, "", `✨ +${rewards.xp} XP`];
  if (rewards.keys > 0) lines.push(`🗝️ Found a **key**!`);
  if (leveledTo) lines.push("", `🎉 **Level up!** You're now level **${leveledTo}**.`);

  const needed = xpForLevel(player.level);
  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("⚔️  Adventure")
    .setDescription(lines.join("\n"))
    .addFields({
      name: "Experience",
      value: `${xpBar(player.xp, needed, 18)}\n\`${player.xp} / ${needed} XP\``,
      inline: false,
    });

  return { embeds: [embed], components: [combatButtons(user.id)] };
}
