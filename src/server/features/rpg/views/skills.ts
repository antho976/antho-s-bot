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
import { classDef } from "../domain/stats";
import type { RpgPlayer } from "../queries";
import { computeStats } from "../skills/compute";
import { frontier } from "../skills/graph";
import { renderTreeImage } from "../skills/render";
import { getTree, nodeById, type SkillNode } from "../skills/trees";
import type { RpgScreen } from "./types";

function backOnlyRow(ownerId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(ownerId, "player"))
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary),
  );
}

/** The skill-tree screen: canvas image + a select menu of the nodes you can take next. */
export function renderSkills(player: RpgPlayer, user: User, nodeIds: string[]): RpgScreen {
  const tree = getTree(player.classId);
  if (!tree) {
    const embed = new EmbedBuilder()
      .setColor(RPG.embedColor)
      .setTitle("🌳  Skills")
      .setDescription("Your class's skill tree isn't available yet — Warrior is in testing.");
    return { embeds: [embed], components: [backOnlyRow(user.id)] };
  }

  const allocated = new Set([tree.root, ...nodeIds]);
  const points = player.level - nodeIds.length;
  const stats = computeStats(player.classId, player.level, nodeIds);
  const image = renderTreeImage(tree, allocated);

  const bonus = [`Damage ${stats.damage}`, `Crit ${Math.round(stats.critChance * 100)}%`];
  if (stats.lifesteal) bonus.push(`Lifesteal ${Math.round(stats.lifesteal * 100)}%`);
  if (stats.dodge) bonus.push(`Dodge ${Math.round(stats.dodge * 100)}%`);
  if (stats.dmgReduction) bonus.push(`Defence ${Math.round(stats.dmgReduction * 100)}%`);

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("🌳  Skill Tree")
    .setDescription(
      [
        `**Points:** ${points}`,
        `**Stats:** ${bonus.join(" · ")}`,
        "",
        points > 0
          ? "Allocate a node below — you can only take nodes connected to what you have."
          : "No points free. Level up for more, or respec.",
      ].join("\n"),
    )
    .setImage("attachment://skill-tree.png");

  const components: (
    | ActionRowBuilder<ButtonBuilder>
    | ActionRowBuilder<StringSelectMenuBuilder>
  )[] = [];

  const frontierNodes = [...frontier(tree, allocated)]
    .map((id) => nodeById(tree, id))
    .filter((n): n is SkillNode => Boolean(n));

  if (points > 0 && frontierNodes.length > 0) {
    const select = new StringSelectMenuBuilder()
      .setCustomId(buildId(user.id, "skills", "alloc"))
      .setPlaceholder("Allocate a node…")
      .addOptions(
        frontierNodes.slice(0, 25).map((n) => ({
          label: n.name,
          description: n.desc.slice(0, 100),
          value: n.id,
        })),
      );
    components.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
    );
  }

  components.push(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildId(user.id, "skills", "actives"))
        .setLabel("Actives")
        .setEmoji("⚡")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(buildId(user.id, "skills", "respec"))
        .setLabel("Respec (free)")
        .setEmoji("♻️")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(buildId(user.id, "player"))
        .setLabel("Back")
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { embeds: [embed], components, files: [image] };
}

/** Active-skill viewer: lists every active the class has at once — what each does and whether you've
 *  unlocked it. (Actives are dormant until the dungeon engine.) */
export function renderActiveSkills(
  player: RpgPlayer,
  user: User,
  nodeIds: string[],
  _selectedId?: string,
): RpgScreen {
  const tree = getTree(player.classId);
  const cls = classDef(player.classId);
  if (!tree) {
    const embed = new EmbedBuilder()
      .setColor(RPG.embedColor)
      .setTitle("⚡  Active Skills")
      .setDescription("Your class's skill tree isn't available yet — Warrior is in testing.");
    return { embeds: [embed], components: [backOnlyRow(user.id)] };
  }

  const actives = tree.nodes.filter((n) => n.type === "active");
  const embed = new EmbedBuilder().setColor(RPG.embedColor).setTitle(`⚡  ${cls.name} Active Skills`);

  if (actives.length === 0) {
    embed.setDescription("This class has no active skills yet.");
    return { embeds: [embed], components: [backOnlyRow(user.id)] };
  }

  // One field per active so the name renders as a bold header (bigger than body text) and every
  // skill is visible at once, rather than one-at-a-time behind a picker.
  const allocated = new Set(nodeIds);
  const unlockedCount = actives.filter((a) => allocated.has(a.id)).length;
  embed
    .setDescription(
      `**${unlockedCount}/${actives.length} unlocked.** Allocate an active's node in the skill tree to unlock it — actives are used in Dungeons.`,
    )
    .addFields(
      actives.map((a) => ({
        name: `${allocated.has(a.id) ? "✅" : "🔒"}  ${a.name}`,
        value: a.detail ?? a.desc,
        inline: false,
      })),
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "skills"))
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "hub"))
      .setLabel("Hub")
      .setEmoji("🏠")
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row] };
}
