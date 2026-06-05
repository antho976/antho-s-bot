import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type User } from "discord.js";
import { DIFFICULTIES, DIFFICULTY_MAP, RPG } from "../config";
import { buildId } from "../domain/custom-id";
import { classDef, maxHp } from "../domain/stats";
import type { RpgPlayer } from "../queries";
import type { AdventureReport, Charges, Encounter } from "../service";
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

/** A 10-segment text HP bar. */
function hpBar(cur: number, max: number): string {
  const filled = Math.max(0, Math.min(10, Math.round((cur / Math.max(1, max)) * 10)));
  return "▰".repeat(filled) + "▱".repeat(10 - filled);
}

function backButton(ownerId: string, label: string): ButtonBuilder {
  return new ButtonBuilder()
    .setCustomId(buildId(ownerId, "hub"))
    .setLabel(label)
    .setEmoji("◀️")
    .setStyle(ButtonStyle.Secondary);
}

/** The Combat landing screen: how adventures work, your charges, and a difficulty button per option. */
export function renderCombat(
  player: RpgPlayer,
  user: User,
  charges: Charges,
  notice?: string,
): RpgScreen {
  const ready = charges.charges > 0;
  const full = charges.charges >= charges.max;

  const legend = DIFFICULTIES.map((d) => {
    const locked = player.level < d.minLevel;
    const icon = locked ? "🔒" : d.emoji;
    const note = locked ? ` (unlocks at Lv ${d.minLevel})` : "";
    return `${icon} **${d.label}**: ${d.hint}${note}`;
  }).join("\n");

  const chargeLine = `⚡ Charges: **${charges.charges}/${charges.max}**${
    full ? " · full" : ` · +1 in **${formatRemaining(charges.nextInMs)}**`
  }`;

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("⚔️  Adventure")
    .setDescription(
      [
        notice ? `*${notice}*\n` : "",
        "Spend a charge to fight for **XP**, **gold** and the occasional **key**. A lone foe is settled",
        "instantly; tougher difficulties can throw a **pack** you fight turn-by-turn.",
        "",
        legend,
        "",
        chargeLine,
        ready ? "🟢 Pick a difficulty to set out." : "🟠 Out of charges — rest up.",
      ]
        .filter((l) => l !== "")
        .join("\n"),
    );

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

  return {
    embeds: [embed],
    components: [diffRow, new ActionRowBuilder<ButtonBuilder>().addComponents(backButton(user.id, "Back"))],
  };
}

/** The live turn-based fight screen for a multi-mob pack. Attack the front foe, or flee. */
export function renderEncounter(player: RpgPlayer, user: User, enc: Encounter): RpgScreen {
  const pMax = maxHp(classDef(player.classId), player.level);
  const diff = DIFFICULTY_MAP[enc.difficultyId];
  const frontIdx = enc.mobs.findIndex((m) => m.hp > 0);
  const alive = enc.mobs.filter((m) => m.hp > 0).length;

  const mobLines = enc.mobs.map((m, i) => {
    if (m.hp <= 0) return `💀 ~~${m.emoji} ${m.name}~~`;
    const marker = i === frontIdx ? "▶️" : "▫️";
    return `${marker} ${m.emoji} **${m.name}**  ${hpBar(m.hp, m.maxHp)} ${m.hp}/${m.maxHp}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle("⚔️  Encounter")
    .setDescription(
      [
        `**${alive}** foe${alive === 1 ? "" : "s"} left${diff ? ` · ${diff.label}` : ""}`,
        "",
        ...mobLines,
        "",
        `❤️ **You**  ${hpBar(enc.playerHp, pMax)} ${enc.playerHp}/${pMax}`,
        "",
        enc.log.slice(-3).join("\n"),
      ].join("\n"),
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "combat", "fight"))
      .setLabel("Attack")
      .setEmoji("⚔️")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "combat", "flee"))
      .setLabel("Flee")
      .setEmoji("🏳️")
      .setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [row] };
}

/** The report after a fight (single or pack) — what you gained, or that you lost/fled. */
export function renderAdventureResult(report: AdventureReport, user: User): RpgScreen {
  const { mob, difficulty, packSize } = report;
  const foe = packSize > 1 ? `pack of ${packSize} (${difficulty.label})` : `${mob.emoji} **${mob.name}** (${difficulty.label})`;
  let lines: string[];

  if (report.fled) {
    lines = [`🏳️ You retreated from the ${foe}. **No rewards.**`, `❤️ HP **${report.hp}** / ${report.maxHp}`];
  } else if (report.defeated) {
    lines = [`💀 The ${foe} bested you. **No rewards.**`, `❤️ HP **${report.hp}** / ${report.maxHp}`];
  } else {
    const head =
      packSize > 1
        ? `🎉 You cleared a **pack of ${packSize}** (${difficulty.label}) in ${report.rounds} rounds!`
        : `${mob.emoji} You beat the **${mob.name}** (${difficulty.label}) in ${report.rounds} round${report.rounds === 1 ? "" : "s"}!`;
    lines = [head, "", `✨ +${report.xp.toLocaleString()} XP`, `💰 +${report.gold.toLocaleString()} gold`];
    if (report.keys > 0) lines.push(`🗝️ Found **${report.keys}** key${report.keys === 1 ? "" : "s"}!`);
    if (report.leveledTo) lines.push(`🎉 **Level up!** You're now level **${report.leveledTo}**.`);
    lines.push(`❤️ HP **${report.hp}** / ${report.maxHp}`);
  }

  const embed = new EmbedBuilder()
    .setColor(report.defeated ? 0xe74c3c : report.fled ? 0x95a5a6 : RPG.embedColor)
    .setTitle("⚔️  Adventure")
    .setDescription(lines.join("\n"));

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "combat"))
      .setLabel("Adventure again")
      .setEmoji("⚔️")
      .setStyle(ButtonStyle.Primary),
    backButton(user.id, "Hub"),
  );

  return { embeds: [embed], components: [row] };
}
