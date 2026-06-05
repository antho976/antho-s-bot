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
import {
  GATHER_AREAS,
  GATHER_AREA_MAP,
  GATHER_SKILLS,
  GATHER_SKILL_MAP,
  GATHER_TALENTS,
  GATHER_TOOLS,
  RESOURCES,
  areaDropTable,
  areaSkills,
  toolName,
} from "../gather-config";
import type { GatherPreview, GatheringLevels } from "../gather";
import type { RpgPlayer } from "../queries";
import type { RpgScreen } from "./types";

function back(ownerId: string, view: string, label = "Back"): ButtonBuilder {
  return new ButtonBuilder()
    .setCustomId(buildId(ownerId, view))
    .setLabel(label)
    .setStyle(ButtonStyle.Secondary);
}

function skillNames(areaId: string): string {
  const area = GATHER_AREA_MAP[areaId];
  if (!area) return "";
  return areaSkills(area)
    .map((s) => GATHER_SKILL_MAP[s].name)
    .join(", ");
}

/** Gathering hub: your levels, the current session, and the list of areas you can travel to. */
export function renderGather(
  user: User,
  player: RpgPlayer,
  levels: GatheringLevels,
  preview: GatherPreview,
  notice?: string,
): RpgScreen {
  const levelLine = GATHER_SKILLS.map((s) => `${s.name} ${levels.perSkill[s.id] ?? 1}`).join("  ·  ");

  let now: string;
  if (preview.active && preview.skillId) {
    const sk = GATHER_SKILL_MAP[preview.skillId];
    const area = preview.areaId ? GATHER_AREA_MAP[preview.areaId] : undefined;
    now = [
      `**${sk?.verb ?? "Gathering"}** at **${area?.name ?? "?"}**`,
      `Banked **${(preview.totalUnits ?? 0).toLocaleString()}** drops · +${(preview.xp ?? 0).toLocaleString()} xp${preview.wasCapped ? " · idle cap reached" : ""}`,
    ].join("\n");
  } else {
    now = "Not gathering — pick an area below to begin.";
  }

  const unlocked = GATHER_AREAS.filter((a) => levels.total >= a.reqLevel);
  const locked = GATHER_AREAS.length - unlocked.length;
  const areaList = unlocked.map((a) => `**${a.name}** — ${skillNames(a.id)}`).join("\n");

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("Gathering")
    .setDescription(notice ?? "Progress builds in real time — even while you're offline. Reopen to refresh, then Collect.")
    .addFields(
      { name: "Skills", value: `${levelLine}\nTotal **${levels.total}** · Tool: ${toolName(player.toolTier)}`, inline: false },
      { name: "Now", value: now, inline: false },
      {
        name: "Areas",
        value: areaList + (locked > 0 ? `\n*+${locked} more unlock at higher total level.*` : ""),
        inline: false,
      },
    );

  const travel = new StringSelectMenuBuilder()
    .setCustomId(buildId(user.id, "gather", "area"))
    .setPlaceholder("Travel to an area…")
    .addOptions(
      unlocked.slice(0, 25).map((a) => ({
        label: a.name,
        description: skillNames(a.id).slice(0, 100),
        value: a.id,
      })),
    );

  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "gather", "collect"))
      .setLabel("Collect")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!preview.active),
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "gather", "stop"))
      .setLabel("Stop")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!preview.active),
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "gather", "tools"))
      .setLabel("Tools")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "gather", "talents"))
      .setLabel("Talents")
      .setStyle(ButtonStyle.Secondary),
    back(user.id, "hub"),
  );

  return {
    embeds: [embed],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(travel), actions],
  };
}

/** Area detail: what each offered skill yields here, and a button to start that skill. */
export function renderArea(user: User, areaId: string, notice?: string): RpgScreen {
  const area = GATHER_AREA_MAP[areaId];
  if (!area) {
    return {
      embeds: [new EmbedBuilder().setColor(RPG.embedColor).setTitle("Unknown area")],
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(back(user.id, "gather"))],
    };
  }

  const skills = areaSkills(area);
  const lines = skills.map((s) => {
    const names = areaDropTable(area.id, s).map((d) => RESOURCES[d.resourceId].name);
    return `**${GATHER_SKILL_MAP[s].name}** — ${names.join(", ")}`;
  });

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle(area.name)
    .setDescription([notice ? `*${notice}*` : area.blurb, "", ...lines].join("\n"));

  const startRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...skills.map((s) =>
      new ButtonBuilder()
        .setCustomId(buildId(user.id, "gather", "start", `${s}:${area.id}`))
        .setLabel(GATHER_SKILL_MAP[s].name)
        .setStyle(ButtonStyle.Success),
    ),
  );

  return { embeds: [embed], components: [startRow, new ActionRowBuilder<ButtonBuilder>().addComponents(back(user.id, "gather"))] };
}

/** The multitool ladder. */
export function renderGatherTools(
  user: User,
  player: RpgPlayer,
  total: number,
  notice?: string,
): RpgScreen {
  const lines = GATHER_TOOLS.map((t) => {
    const tag = player.toolTier >= t.tier ? "owned" : t.tier === player.toolTier + 1 ? "next" : `Lv ${t.reqLevel}`;
    return `**${t.name}** _(${tag})_ — ${t.cost.toLocaleString()}g · speed ×${t.speed}, yield ×${t.efficiency}, double ${Math.round(t.doubleChance * 100)}%, +${t.capBonusH}h`;
  });

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("Multitools")
    .setDescription(
      [
        notice ?? `Current: **${toolName(player.toolTier)}** · total level **${total}** · ${player.gold.toLocaleString()}g`,
        "",
        ...lines,
      ].join("\n"),
    );

  const next = GATHER_TOOLS.find((t) => t.tier === player.toolTier + 1);
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  if (next) {
    const canBuy = player.gold >= next.cost && total >= next.reqLevel;
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(buildId(user.id, "gather", "buytool", String(next.tier)))
          .setLabel(`Buy ${next.name} — ${next.cost.toLocaleString()}g`)
          .setStyle(ButtonStyle.Success)
          .setDisabled(!canBuy),
      ),
    );
  }
  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(back(user.id, "gather")));
  return { embeds: [embed], components: rows };
}

/** A skill's small talent tree. */
export function renderGatherTalents(
  user: User,
  skillId: string,
  level: number,
  ranks: Record<string, number>,
  notice?: string,
): RpgScreen {
  const sk = GATHER_SKILL_MAP[skillId];
  const spent = Object.values(ranks).reduce((a, b) => a + b, 0);
  const points = Math.max(0, level - spent);

  const lines = GATHER_TALENTS.map(
    (t) => `**${t.name}** — ${ranks[t.id] ?? 0}/${t.maxRank}  _(${t.unit} per rank)_`,
  );

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle(`${sk?.name ?? "Skill"} — Talents`)
    .setDescription([notice ?? `Level **${level}** · **${points}** point${points === 1 ? "" : "s"} free`, "", ...lines].join("\n"));

  const rows: (
    | ActionRowBuilder<ButtonBuilder>
    | ActionRowBuilder<StringSelectMenuBuilder>
  )[] = [];

  rows.push(
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(buildId(user.id, "gather", "talentpick"))
        .setPlaceholder("View another skill…")
        .addOptions(
          GATHER_SKILLS.map((s) => ({ label: s.name, value: s.id, default: s.id === skillId })),
        ),
    ),
  );

  const spendable = GATHER_TALENTS.filter((t) => (ranks[t.id] ?? 0) < t.maxRank);
  if (points > 0 && spendable.length > 0) {
    rows.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(buildId(user.id, "gather", "talent", skillId))
          .setPlaceholder("Spend a point…")
          .addOptions(
            spendable.map((t) => ({
              label: t.name,
              description: `${ranks[t.id] ?? 0}/${t.maxRank} · ${t.unit}`,
              value: t.id,
            })),
          ),
      ),
    );
  }

  rows.push(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildId(user.id, "gather", "respecgather", skillId))
        .setLabel("Reset (free)")
        .setStyle(ButtonStyle.Secondary),
      back(user.id, "gather"),
    ),
  );

  return { embeds: [embed], components: rows };
}
