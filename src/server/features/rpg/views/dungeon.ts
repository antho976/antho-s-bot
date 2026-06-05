import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  type User,
} from "discord.js";
import { ITEMS, RPG } from "../config";
import { buildId } from "../domain/custom-id";
import { xpBar } from "../domain/stats";
import {
  DUNGEONS,
  ELEMENTS,
  ELEMENT_MAP,
  abilitiesFor,
  dungeonDef,
  enemyDef,
  type Ability,
} from "../dungeon-config";
import type { DungeonSummary } from "../dungeon";
import type { RunState } from "../domain/dungeon";
import type { RpgPlayer } from "../queries";
import { RESOURCES } from "../gather-config";
import type { RpgScreen } from "./types";

function backToHub(ownerId: string, label = "Back"): ButtonBuilder {
  return new ButtonBuilder()
    .setCustomId(buildId(ownerId, "hub"))
    .setLabel(label)
    .setEmoji("◀️")
    .setStyle(ButtonStyle.Secondary);
}

function itemName(itemId: string): string {
  return RESOURCES[itemId]?.name ?? ITEMS[itemId]?.name ?? itemId;
}

function lootLine(items: { itemId: string; qty: number }[]): string {
  return items.map((i) => `${i.qty}× ${itemName(i.itemId)}`).join(", ");
}

/** The dungeon picker: blurb, key/level gates, and a select to enter the ones you qualify for. */
export function renderDungeonList(
  user: User,
  player: RpgPlayer,
  keys: number,
  notice?: string,
): RpgScreen {
  const lines = DUNGEONS.map((d) => {
    const locked = player.level < d.reqLevel;
    const gate = locked ? `🔒 Lv ${d.reqLevel}` : `${d.keyCost}🗝️`;
    return `${d.emoji} **${d.name}** — ${d.blurb}\n${d.rooms.length} rooms · Lv ${d.reqLevel}+ · ${gate}`;
  });

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("💀 Dungeons")
    .setDescription(
      [
        notice ? `*${notice}*\n` : "",
        "Active, hand-fought delves. **Coat your blade** with a foe's weakness, **guard** its telegraphed heavy blows, and spend **skills** wisely. Fall and you keep nothing — **flee** to leave with what you've banked.",
        "",
        `You hold **${keys}** 🗝️ (won from Adventures).`,
        "",
        ...lines,
      ]
        .filter((l) => l !== "")
        .join("\n"),
    );

  const openable = DUNGEONS.filter((d) => player.level >= d.reqLevel);
  const rows: (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[] = [];
  if (openable.length > 0) {
    rows.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(buildId(user.id, "dungeon", "enter"))
          .setPlaceholder("Enter a dungeon…")
          .addOptions(
            openable.map((d) => ({
              label: d.name,
              description: `${d.keyCost} key${d.keyCost > 1 ? "s" : ""} · Lv ${d.reqLevel}+ · ${d.rooms.length} rooms`.slice(0, 100),
              value: d.id,
              emoji: d.emoji,
            })),
          ),
      ),
    );
  }
  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(backToHub(user.id)));
  return { embeds: [embed], components: rows };
}

/** The live combat board: foe + your HP bars, blade coating, the round log, and the action buttons.
 *  When a (non-boss) room is cleared it switches to a Descend / Leave choice. */
export function renderDungeonCombat(user: User, run: RunState, classId: string): RpgScreen {
  const dungeon = dungeonDef(run.dungeonId);
  const enemy = enemyDef(run.enemy.id);
  if (!dungeon || !enemy) {
    return {
      embeds: [new EmbedBuilder().setColor(RPG.embedColor).setTitle("💀 Dungeon").setDescription("This run has ended.")],
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(backToHub(user.id, "Back to Hub"))],
    };
  }

  const cleared = run.enemy.hp <= 0;
  const weak = ELEMENT_MAP[enemy.weakness];
  const resist = enemy.resist ? ELEMENT_MAP[enemy.resist] : null;

  const foePanel = cleared
    ? `${enemy.emoji} **${enemy.name}** — defeated`
    : [
        `${enemy.emoji} **${enemy.name}**`,
        `❤️ ${xpBar(run.enemy.hp, run.enemy.maxHp)} ${run.enemy.hp}/${run.enemy.maxHp}`,
        `Weak: ${weak?.emoji ?? "?"} ${weak?.name ?? "?"}${resist ? ` · Resists: ${resist.emoji} ${resist.name}` : ""}`,
        run.enemy.intent === "heavy" ? "🔆 **Winding up a heavy blow — guard!**" : "",
      ]
        .filter(Boolean)
        .join("\n");

  const coat = run.coating
    ? `${ELEMENT_MAP[run.coating]?.emoji ?? ""} ${ELEMENT_MAP[run.coating]?.name ?? "?"} (${run.coatingHits} hit${run.coatingHits === 1 ? "" : "s"} left)`
    : "uncoated";
  const youPanel = [
    `🧍 **${user.displayName}**`,
    `❤️ ${xpBar(run.hp, run.maxHp)} ${run.hp}/${run.maxHp}`,
    `🗡️ Blade: ${coat}`,
  ].join("\n");

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle(`${dungeon.emoji} ${dungeon.name} — Room ${run.roomIndex + 1}/${dungeon.rooms.length}`)
    .setDescription([foePanel, "", youPanel, "", "> " + run.log.join("\n> ")].join("\n"));

  if (cleared) {
    const last = run.roomIndex >= dungeon.rooms.length - 1;
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildId(user.id, "dungeon", "advance"))
        .setLabel("Descend")
        .setEmoji("⬇️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(last),
      new ButtonBuilder()
        .setCustomId(buildId(user.id, "dungeon", "flee"))
        .setLabel("Leave (keep loot)")
        .setEmoji("🏳️")
        .setStyle(ButtonStyle.Success),
    );
    return { embeds: [embed], components: [row] };
  }

  // Core actions.
  const coreRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(buildId(user.id, "dungeon", "attack")).setLabel("Attack").setEmoji("⚔️").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(buildId(user.id, "dungeon", "guard")).setLabel("Guard").setEmoji("🛡️").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(buildId(user.id, "dungeon", "flee")).setLabel("Flee").setEmoji("🏳️").setStyle(ButtonStyle.Secondary),
  );

  // Abilities (disabled while on cooldown — label shows the remaining turns).
  const abilityRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...abilitiesFor(classId).map((ab: Ability) => {
      const cd = run.cooldowns[ab.id] ?? 0;
      return new ButtonBuilder()
        .setCustomId(buildId(user.id, "dungeon", "ability", ab.id))
        .setLabel(cd > 0 ? `${ab.name} (${cd})` : ab.name)
        .setEmoji(ab.emoji)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(cd > 0);
    }),
  );

  // Coat select — the matching element is flagged so you can spot the weakness at a glance.
  const coatRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(buildId(user.id, "dungeon", "coat"))
      .setPlaceholder("Coat your blade…")
      .addOptions(
        ELEMENTS.map((el) => ({
          label: el.name,
          description:
            el.id === enemy.weakness ? "Exploits the weakness!" : el.id === enemy.resist ? "Resisted by this foe" : "Neutral",
          value: el.id,
          emoji: el.emoji,
        })),
      ),
  );

  return { embeds: [embed], components: [coreRow, abilityRow, coatRow] };
}

/** Outcome screen after a run ends (cleared / fled / fallen). */
export function renderDungeonResult(user: User, summary: DungeonSummary, dungeonName: string): RpgScreen {
  let lines: string[];
  if (summary.outcome === "lost") {
    lines = [`☠️ You fell in **${dungeonName}**. You escaped with **nothing**.`, `❤️ HP: **${summary.hp}** / ${summary.maxHp}`];
  } else {
    const head =
      summary.outcome === "won"
        ? `🏆 You cleared **${dungeonName}**!`
        : `🏳️ You fled **${dungeonName}**, loot in hand.`;
    lines = [head, "", `✨ +${summary.xp.toLocaleString()} XP`, `💰 +${summary.gold.toLocaleString()} gold`];
    if (summary.items.length > 0) lines.push(`🎁 ${lootLine(summary.items)}`);
    if (summary.leveledTo) lines.push(`🎉 **Level up!** You're now level **${summary.leveledTo}**.`);
    lines.push(`❤️ HP: **${summary.hp}** / ${summary.maxHp}`);
  }

  const embed = new EmbedBuilder()
    .setColor(summary.outcome === "lost" ? 0xe74c3c : RPG.embedColor)
    .setTitle("💀 Dungeon")
    .setDescription(lines.join("\n"));

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "dungeon", "list"))
      .setLabel("Dungeons")
      .setEmoji("💀")
      .setStyle(ButtonStyle.Primary),
    backToHub(user.id, "Hub"),
  );
  return { embeds: [embed], components: [row] };
}
