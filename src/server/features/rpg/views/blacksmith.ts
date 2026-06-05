import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  type User,
} from "discord.js";
import { RPG } from "../config";
import { buildId } from "../domain/custom-id";
import { RECIPE_BY_ID, WEAPON_RECIPES } from "../blacksmith-config";
import { upgradeCost, weaponDamage } from "../domain/blacksmith";
import { RESOURCES } from "../gather-config";
import type { Weapon } from "../blacksmith";
import type { RpgPlayer } from "../queries";
import type { RpgScreen } from "./types";

function matName(itemId: string): string {
  return RESOURCES[itemId]?.name ?? itemId;
}

function costLine(cost: { itemId: string; qty: number }[]): string {
  return cost.map((c) => `${c.qty} ${matName(c.itemId)}`).join(", ");
}

function back(ownerId: string, view: string, action: string | undefined, label = "Back"): ButtonBuilder {
  return new ButtonBuilder()
    .setCustomId(buildId(ownerId, view, action))
    .setLabel(label)
    .setEmoji("◀️")
    .setStyle(ButtonStyle.Secondary);
}

/** Blacksmith home: profession level, your equipped weapon, and the way into crafting + gear. */
export function renderBlacksmith(
  user: User,
  player: RpgPlayer,
  level: number,
  equipped: Weapon | null,
): RpgScreen {
  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("🔨 Blacksmith")
    .setDescription(
      [
        `Blacksmithing level **${level}**`,
        equipped
          ? `Equipped: ${equipped.emoji} **${equipped.name}** +${equipped.upgrade} (${equipped.damage} dmg)`
          : "Equipped: nothing",
        "",
        "Forge warrior weapons from gathered ore + wood, then enhance them. Your equipped weapon's damage is added to every hit in combat.",
      ].join("\n"),
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "smith", "craft"))
      .setLabel("Forge")
      .setEmoji("🔨")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "smith", "weapons"))
      .setLabel("Weapons")
      .setEmoji("⚔️")
      .setStyle(ButtonStyle.Primary),
    back(user.id, "player", undefined),
  );

  return { embeds: [embed], components: [row] };
}

/** Crafting menu: warrior weapon recipes with cost + a forge select for the ones you can make. */
export function renderCraft(
  user: User,
  player: RpgPlayer,
  level: number,
  counts: Record<string, number>,
  notice?: string,
): RpgScreen {
  const lines = WEAPON_RECIPES.map((r) => {
    const locked = level < r.reqLevel;
    const haveMats = r.cost.every((c) => (counts[c.itemId] ?? 0) >= c.qty);
    const tail = locked ? ` 🔒 Lv ${r.reqLevel}` : haveMats ? "" : " (missing materials)";
    return `${r.emoji} **${r.name}** — ${weaponDamage(r, 0)} dmg${tail}\n${costLine(r.cost)}`;
  });

  const desc: string[] = [];
  if (notice) desc.push(`*${notice}*`, "");
  desc.push(`Blacksmithing level **${level}** · Warrior weapons.`, "", ...lines);

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("🔨 Forge a weapon")
    .setDescription(desc.join("\n"));

  const forgeable = WEAPON_RECIPES.filter(
    (r) => r.classId === player.classId && level >= r.reqLevel,
  );
  const rows: (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[] = [];
  if (forgeable.length > 0) {
    rows.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(buildId(user.id, "smith", "make"))
          .setPlaceholder("Forge a weapon…")
          .addOptions(
            forgeable.slice(0, 25).map((r) => ({
              label: r.name,
              description: costLine(r.cost).slice(0, 100),
              value: r.id,
            })),
          ),
      ),
    );
  }
  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(back(user.id, "smith", undefined)));

  return { embeds: [embed], components: rows };
}

/** Your forged weapons; pick one to enhance or equip. */
export function renderWeapons(user: User, weapons: Weapon[], notice?: string): RpgScreen {
  const embed = new EmbedBuilder().setColor(RPG.embedColor).setTitle("⚔️ Your weapons");
  if (weapons.length === 0) {
    embed.setDescription(notice ?? "No weapons yet — forge one from the Blacksmith.");
    return {
      embeds: [embed],
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(back(user.id, "smith", undefined))],
    };
  }

  embed.setDescription(
    [
      notice ?? "Pick a weapon to enhance or equip.",
      "",
      ...weapons.map(
        (w) => `${w.emoji} **${w.name}** +${w.upgrade} — ${w.damage} dmg${w.equipped ? "  ✅ equipped" : ""}`,
      ),
    ].join("\n"),
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId(buildId(user.id, "smith", "weapon"))
    .setPlaceholder("Select a weapon…")
    .addOptions(
      weapons.slice(0, 25).map((w) => ({
        label: `${w.name} +${w.upgrade}`,
        description: `${w.damage} dmg${w.equipped ? " · equipped" : ""}`.slice(0, 100),
        value: String(w.rowId),
      })),
    );

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
      new ActionRowBuilder<ButtonBuilder>().addComponents(back(user.id, "smith", "weapons", "Refresh"), back(user.id, "smith", undefined)),
    ],
  };
}

/** One weapon: stats, the next enhancement's cost, and equip/upgrade controls. */
export function renderWeaponDetail(
  user: User,
  weapon: Weapon,
  player: RpgPlayer,
  notice?: string,
): RpgScreen {
  const recipe = RECIPE_BY_ID[weapon.recipeId];
  const maxed = weapon.upgrade >= weapon.maxUpgrade;

  const lines = [
    `Enhancement: **+${weapon.upgrade}** / ${weapon.maxUpgrade}`,
    `Damage: **${weapon.damage}**`,
    weapon.equipped ? "✅ Equipped" : "Not equipped",
  ];
  if (!maxed && recipe) {
    const cost = upgradeCost(recipe, weapon.upgrade);
    const nextDmg = weaponDamage(recipe, weapon.upgrade + 1);
    const mats = cost.items.map((it) => `${it.qty} ${matName(it.itemId)}`).join(", ");
    lines.push("", `Next: +1 → **${nextDmg}** dmg`, `Cost: ${cost.gold.toLocaleString()} gold${mats ? `, ${mats}` : ""}`);
  } else if (maxed) {
    lines.push("", "Fully enhanced.");
  }

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle(`${weapon.emoji} ${weapon.name}`)
    .setDescription((notice ? `*${notice}*\n\n` : "") + lines.join("\n"));

  const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "smith", "upgrade", String(weapon.rowId)))
      .setLabel("Enhance")
      .setEmoji("⬆️")
      .setStyle(ButtonStyle.Success)
      .setDisabled(maxed),
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "smith", weapon.equipped ? "unequip" : "equip", String(weapon.rowId)))
      .setLabel(weapon.equipped ? "Unequip" : "Equip")
      .setEmoji(weapon.equipped ? "❎" : "✅")
      .setStyle(weapon.equipped ? ButtonStyle.Secondary : ButtonStyle.Primary),
    back(user.id, "smith", "weapons"),
  );

  return { embeds: [embed], components: [controls] };
}
