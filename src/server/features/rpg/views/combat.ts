import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type User } from "discord.js";
import { DEV_TOOLS } from "@/env";
import { DIFFICULTIES, RPG } from "../config";
import { buildId } from "../domain/custom-id";
import type { RpgPlayer } from "../queries";
import type { AdventureReport } from "../service";
import type { RpgScreen } from "./types";

const BUTTON_STYLE = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
} as const;

function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function cooldownRemaining(player: RpgPlayer, now: number): number {
  if (DEV_TOOLS) return 0; // dev bot: no adventure cooldown
  const last = player.lastAdventureAt ? player.lastAdventureAt.getTime() : 0;
  return RPG.adventureCooldownMs - (now - last);
}

function backButton(ownerId: string, label: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(ownerId, "hub"))
      .setLabel(label)
      .setEmoji("◀️")
      .setStyle(ButtonStyle.Secondary),
  );
}

/** The Combat landing screen: how adventures work + a difficulty button per option. */
export function renderCombat(player: RpgPlayer, user: User, now: number): RpgScreen {
  const remaining = cooldownRemaining(player, now);
  const ready = remaining <= 0;

  const legend = DIFFICULTIES.map((d) => {
    const locked = player.level < d.minLevel;
    const icon = locked ? "🔒" : d.emoji;
    const note = locked ? ` (unlocks at Lv ${d.minLevel})` : "";
    return `${icon} **${d.label}**: ${d.hint}${note}`;
  }).join("\n");

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("⚔️  Adventure")
    .setDescription(
      [
        "Fight a roaming monster for **XP**, **gold** and the occasional **key**.",
        "Tougher foes have more health, hit harder, and pay out more. Lose and you get nothing.",
        "",
        legend,
        "",
        ready
          ? "🟢 Pick a difficulty to set out."
          : `🟠 Resting… ready in **${formatRemaining(remaining)}**.`,
      ].join("\n"),
    );

  // No emoji on the buttons — the button colour already carries the difficulty, and a coloured
  // circle on a same-coloured button just clashed. Locked Brutal shows a 🔒.
  const diffRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...DIFFICULTIES.map((d) => {
      const locked = player.level < d.minLevel;
      const btn = new ButtonBuilder()
        .setCustomId(buildId(user.id, "combat", "go", d.id))
        .setLabel(d.label)
        .setStyle(BUTTON_STYLE[d.style])
        .setDisabled(!ready || locked);
      if (locked) btn.setEmoji("🔒");
      return btn;
    }),
  );

  return { embeds: [embed], components: [diffRow, backButton(user.id, "Back")] };
}

/** The mob report after a fight — what you gained (or that you lost). */
export function renderAdventureResult(report: AdventureReport, user: User): RpgScreen {
  const { mob, difficulty } = report;
  let lines: string[];

  if (report.defeated) {
    lines = [
      `💀 The ${mob.emoji} **${mob.name}** (${difficulty.label}) bested you. **No rewards.**`,
      `❤️ HP: **${report.hp}** / ${report.maxHp}`,
    ];
  } else {
    lines = [
      `${mob.emoji} You beat the **${mob.name}** (${difficulty.label}) in ${report.rounds} round${report.rounds === 1 ? "" : "s"}!`,
      "",
      `✨ +${report.xp.toLocaleString()} XP`,
      `💰 +${report.gold.toLocaleString()} gold`,
    ];
    if (report.keys > 0) lines.push("🗝️ Found a **key**!");
    if (report.leveledTo) lines.push(`🎉 **Level up!** You're now level **${report.leveledTo}**.`);
    lines.push(`❤️ Took ${report.hpLost} damage. HP **${report.hp}** / ${report.maxHp}`);
  }

  const embed = new EmbedBuilder()
    .setColor(report.defeated ? 0xe74c3c : RPG.embedColor)
    .setTitle("⚔️  Adventure")
    .setDescription(lines.join("\n"));

  return { embeds: [embed], components: [backButton(user.id, "Back to Hub")] };
}
