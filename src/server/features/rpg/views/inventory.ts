import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type User } from "discord.js";
import { ITEMS, RPG } from "../config";
import { buildId } from "../domain/custom-id";
import {
  GATHER_SKILLS,
  LADDER,
  RESOURCES,
  type GatherSkillId,
} from "../gather-config";
import type { RpgInventoryRow } from "../queries";
import type { RpgScreen } from "./types";

/** Resource id → the skill it belongs to, so drops can be grouped under their skill. */
const RESOURCE_SKILL: Record<string, GatherSkillId> = Object.fromEntries(
  GATHER_SKILLS.flatMap((s) => LADDER[s.id].map((id) => [id, s.id] as const)),
);

/** The player's pack: gathering resources grouped by skill, plus other items (keys, etc.). */
export function renderInventory(user: User, rows: RpgInventoryRow[]): RpgScreen {
  const bySkill = new Map<GatherSkillId, { id: string; qty: number }[]>();
  const items: string[] = [];

  for (const row of rows) {
    if (row.qty <= 0 || row.instanceStatsJson) continue; // weapons live in the Blacksmith screen
    const skill = RESOURCE_SKILL[row.itemId];
    if (skill && RESOURCES[row.itemId]) {
      const arr = bySkill.get(skill) ?? [];
      arr.push({ id: row.itemId, qty: row.qty });
      bySkill.set(skill, arr);
    } else if (ITEMS[row.itemId]) {
      const it = ITEMS[row.itemId];
      items.push(`${it.emoji} ${it.name} ×${row.qty.toLocaleString()}`);
    } else {
      items.push(`${row.itemId} ×${row.qty.toLocaleString()}`);
    }
  }

  const embed = new EmbedBuilder().setColor(RPG.embedColor).setTitle("🎒 Inventory");

  const fields = [];
  for (const s of GATHER_SKILLS) {
    const arr = bySkill.get(s.id);
    if (!arr || arr.length === 0) continue;
    arr.sort((a, b) => LADDER[s.id].indexOf(a.id) - LADDER[s.id].indexOf(b.id));
    fields.push({
      name: `${s.emoji} ${s.name}`,
      value: arr.map((e) => `${RESOURCES[e.id].name} ×${e.qty.toLocaleString()}`).join("\n"),
      inline: true,
    });
  }
  if (items.length > 0) fields.push({ name: "📦 Items", value: items.join("\n"), inline: true });

  if (fields.length === 0) {
    embed.setDescription("Your pack is empty. Gather resources or adventure to fill it.");
  } else {
    embed.addFields(...fields);
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "player"))
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary),
  );
  return { embeds: [embed], components: [row] };
}
