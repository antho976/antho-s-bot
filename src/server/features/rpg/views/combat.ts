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

/** A jump-straight-to-the-hub button — kept (with its 🏠) on screens more than one step away. */
function hubButton(ownerId: string, label = "Hub"): ButtonBuilder {
  return new ButtonBuilder()
    .setCustomId(buildId(ownerId, "hub"))
    .setLabel(label)
    .setEmoji("🏠")
    .setStyle(ButtonStyle.Secondary);
}

/** A plain one-step-back button (no emoji) routing to `view`. */
function backButton(ownerId: string, view: string, label = "Back"): ButtonBuilder {
  return new ButtonBuilder()
    .setCustomId(buildId(ownerId, view))
    .setLabel(label)
    .setStyle(ButtonStyle.Secondary);
}

/** The Combat overview — your readiness at a glance, plus the two fight modes side by side. */
export function renderCombatHome(
  player: RpgPlayer,
  user: User,
  charges: Charges,
  keys: number,
): RpgScreen {
  const max = maxHp(classDef(player.classId), player.level);
  const full = charges.charges >= charges.max;
  const chargeLine = `⚡ **${charges.charges}/${charges.max}**${full ? " · full" : ` · next ${formatRemaining(charges.nextInMs)}`}`;

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("⚔️  Combat")
    .setDescription(
      [
        `🛡️ **Lv ${player.level}**  ·  ❤️ ${hpBar(player.hp, max)} ${player.hp}/${max}`,
        `${chargeLine}  ·  🗝️ **${keys}** key${keys === 1 ? "" : "s"}`,
      ].join("\n"),
    )
    .addFields(
      {
        name: "⚔️ Adventures",
        value: [
          "Spend ⚡ **1 charge**",
          "✨ XP · 💰 gold · 🗝️ keys",
          "A lone foe settles instantly; tougher tiers throw **packs** you fight turn-by-turn.",
        ].join("\n"),
        inline: true,
      },
      {
        name: "💀 Dungeons",
        value: [
          "Spend 🗝️ **keys**",
          "🎯 Turn-based, multi-room runs",
          "Deadlier than adventures — but **richer loot**.",
        ].join("\n"),
        inline: true,
      },
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "combat", "adventure"))
      .setLabel("Adventures")
      .setEmoji("⚔️")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "dungeon"))
      .setLabel("Dungeons")
      .setEmoji("💀")
      .setStyle(ButtonStyle.Danger),
    backButton(user.id, "hub"),
  );

  return { embeds: [embed], components: [row] };
}

/** The Adventure picker: your charges + a difficulty button per option. */
export function renderAdventure(
  player: RpgPlayer,
  user: User,
  charges: Charges,
  notice?: string,
): RpgScreen {
  const ready = charges.charges > 0;
  const full = charges.charges >= charges.max;
  const lockedTiers = DIFFICULTIES.filter((d) => player.level < d.minLevel);

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("⚔️ Adventure")
    .setDescription(
      [
        notice ? `*${notice}*` : "",
        `⚡ **${charges.charges}/${charges.max} charges**${full ? " · full" : ` · next in ${formatRemaining(charges.nextInMs)}`}`,
        "",
        "Spend a charge to fight for **XP**, **gold** and rare **keys**. One foe is settled instantly; harder tiers can spawn a **pack** you fight turn-by-turn.",
        ready ? "" : "🟠 Out of charges — rest up.",
        lockedTiers.length ? `🔒 ${lockedTiers.map((d) => `${d.label} (Lv ${d.minLevel})`).join(" · ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .setFooter({ text: "Easy → Brutal: more risk, more loot, more packs." });

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

  const nav = new ActionRowBuilder<ButtonBuilder>().addComponents(backButton(user.id, "combat"));

  return { embeds: [embed], components: [diffRow, nav] };
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
      .setCustomId(buildId(user.id, "combat", "adventure"))
      .setLabel("Adventure again")
      .setEmoji("⚔️")
      .setStyle(ButtonStyle.Primary),
    hubButton(user.id),
  );

  return { embeds: [embed], components: [row] };
}
