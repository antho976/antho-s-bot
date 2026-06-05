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
  areaResource,
  ratingIcon,
  toolName,
  type GatherSkillId,
} from "../gather-config";
import type { GatherPreview, GatheringLevels } from "../gather";
import type { RpgPlayer } from "../queries";
import type { RpgScreen } from "./types";

function backTo(ownerId: string, view: string, label = "Back"): ButtonBuilder {
  return new ButtonBuilder()
    .setCustomId(buildId(ownerId, view))
    .setLabel(label)
    .setEmoji("◀️")
    .setStyle(ButtonStyle.Secondary);
}

/** The gathering hub: per-skill levels, current idle session, and the controls. */
export function renderGather(
  user: User,
  player: RpgPlayer,
  levels: GatheringLevels,
  preview: GatherPreview,
  notice?: string,
): RpgScreen {
  const skillLine = GATHER_SKILLS.map(
    (s) => `${s.emoji} ${s.name} **${levels.perSkill[s.id] ?? 1}**`,
  ).join("\n");

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("⛏️  Gathering")
    .setDescription(
      notice
        ? `*${notice}*`
        : "Idle in an area to harvest resources, sell them for gold, and level each skill to unlock better spots and tools.",
    )
    .addFields(
      { name: "Skills", value: `${skillLine}\n— — —\n🧮 Total **${levels.total}**`, inline: true },
      {
        name: "Gear",
        value: `🛠️ ${toolName(player.toolTier)}\n💰 ${player.gold.toLocaleString()} gold`,
        inline: true,
      },
    );

  if (preview.active && preview.resourceId && preview.skillId) {
    const sk = GATHER_SKILL_MAP[preview.skillId];
    const area = preview.areaId ? GATHER_AREA_MAP[preview.areaId] : undefined;
    const res = RESOURCES[preview.resourceId];
    embed.addFields({
      name: "⏳  Gathering now",
      value: [
        `${sk?.emoji ?? ""} **${sk?.name}** at **${area?.name ?? "?"}**`,
        `Banked: **${(preview.units ?? 0).toLocaleString()}× ${res.emoji} ${res.name}**  ·  +${(preview.xp ?? 0).toLocaleString()} xp`,
        preview.wasCapped
          ? "🔴 Idle cap reached — collect to keep earning."
          : "Collect to bank it, or pick a new spot below.",
      ].join("\n"),
      inline: false,
    });
  } else {
    embed.addFields({
      name: "⏳  Gathering now",
      value: "Nothing — choose a skill below to start.",
      inline: false,
    });
  }

  const skillSelect = new StringSelectMenuBuilder()
    .setCustomId(buildId(user.id, "gather", "pick"))
    .setPlaceholder("Choose a skill to gather…")
    .addOptions(
      GATHER_SKILLS.map((s) => ({
        label: s.name,
        description: `Level ${levels.perSkill[s.id] ?? 1}`,
        value: s.id,
        emoji: s.emoji,
      })),
    );

  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "gather", "collect"))
      .setLabel("Collect")
      .setEmoji("📥")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!preview.active),
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "gather", "stop"))
      .setLabel("Stop")
      .setEmoji("⏹️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!preview.active),
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "gather", "sell"))
      .setLabel("Sell drops")
      .setEmoji("💰")
      .setStyle(ButtonStyle.Primary),
  );

  const nav = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "gather", "tools"))
      .setLabel("Tools")
      .setEmoji("🛠️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "gather", "talents"))
      .setLabel("Talents")
      .setEmoji("🌟")
      .setStyle(ButtonStyle.Secondary),
    backTo(user.id, "hub"),
  );

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(skillSelect),
      actions,
      nav,
    ],
  };
}

/** Area picker for one skill — lists every spot that offers it (locked ones flagged). */
export function renderGatherAreas(user: User, skillId: string, levels: GatheringLevels): RpgScreen {
  const sk = GATHER_SKILL_MAP[skillId];
  const offering = GATHER_AREAS.filter((a) => a.yields[skillId as GatherSkillId]).sort(
    (a, b) => a.reqLevel - b.reqLevel,
  );

  const lines = offering.map((a) => {
    const rating = a.yields[skillId as GatherSkillId]!;
    const resId = areaResource(a.id, skillId);
    const res = resId ? RESOURCES[resId] : undefined;
    const locked = levels.total < a.reqLevel;
    const tail = locked ? ` 🔒 *needs total ${a.reqLevel}*` : "";
    return `${ratingIcon(rating)} **${a.name}** — ${res?.emoji ?? ""} ${res?.name ?? ""}${tail}`;
  });

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle(`${sk?.emoji ?? "⛏️"}  ${sk?.name ?? "Gather"} — choose a spot`)
    .setDescription(["🟢 best · 🟡 good · 🔴 poor", "", ...lines].join("\n"));

  const available = offering.filter((a) => levels.total >= a.reqLevel).slice(0, 10);
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < available.length; i += 5) {
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...available.slice(i, i + 5).map((a) =>
          new ButtonBuilder()
            .setCustomId(buildId(user.id, "gather", "start", `${skillId}:${a.id}`))
            .setLabel(a.name)
            .setStyle(ButtonStyle.Success),
        ),
      ),
    );
  }
  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(backTo(user.id, "gather")));

  return { embeds: [embed], components: rows };
}

/** The multitool ladder. */
export function renderGatherTools(
  user: User,
  player: RpgPlayer,
  total: number,
  notice?: string,
): RpgScreen {
  const lines = GATHER_TOOLS.map((t) => {
    const owned = player.toolTier >= t.tier;
    const isNext = t.tier === player.toolTier + 1;
    const status = owned ? "✅" : isNext ? "🔹" : "🔒";
    return [
      `${status} **${t.name}** — Lv ${t.reqLevel} · ${t.cost.toLocaleString()}g`,
      `⚡${t.speed}× speed · 📦${t.efficiency}× yield · ✨${Math.round(t.doubleChance * 100)}% double · ⏳+${t.capBonusH}h`,
    ].join("\n");
  });

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("🛠️  Multitools")
    .setDescription(
      [
        notice ? `*${notice}*\n` : "",
        `Current: **${toolName(player.toolTier)}** · total level **${total}** · 💰 ${player.gold.toLocaleString()}`,
        "",
        ...lines,
      ]
        .filter(Boolean)
        .join("\n"),
    );

  const next = GATHER_TOOLS.find((t) => t.tier === player.toolTier + 1);
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  if (next) {
    const canBuy = player.gold >= next.cost && total >= next.reqLevel;
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(buildId(user.id, "gather", "buytool", String(next.tier)))
          .setLabel(`Buy ${next.name} (${next.cost.toLocaleString()}g)`)
          .setEmoji("🛒")
          .setStyle(ButtonStyle.Success)
          .setDisabled(!canBuy),
      ),
    );
  }
  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(backTo(user.id, "gather")));

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

  const lines = GATHER_TALENTS.map((t) => {
    const r = ranks[t.id] ?? 0;
    return `${t.emoji} **${t.name}** — ${r}/${t.maxRank}  *(${t.unit} per rank)*`;
  });

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle(`🌟  ${sk?.name ?? "Skill"} Talents`)
    .setDescription(
      [notice ? `*${notice}*\n` : "", `Level **${level}** · Points **${points}**`, "", ...lines]
        .filter(Boolean)
        .join("\n"),
    );

  const rows: (
    | ActionRowBuilder<ButtonBuilder>
    | ActionRowBuilder<StringSelectMenuBuilder>
  )[] = [];

  const skillSwitch = new StringSelectMenuBuilder()
    .setCustomId(buildId(user.id, "gather", "talentpick"))
    .setPlaceholder("View another skill…")
    .addOptions(
      GATHER_SKILLS.map((s) => ({
        label: s.name,
        value: s.id,
        emoji: s.emoji,
        default: s.id === skillId,
      })),
    );
  rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(skillSwitch));

  const spendable = GATHER_TALENTS.filter((t) => (ranks[t.id] ?? 0) < t.maxRank);
  if (points > 0 && spendable.length > 0) {
    const spend = new StringSelectMenuBuilder()
      .setCustomId(buildId(user.id, "gather", "talent", skillId))
      .setPlaceholder("Spend a point…")
      .addOptions(
        spendable.map((t) => ({
          label: t.name,
          description: `${ranks[t.id] ?? 0}/${t.maxRank} · ${t.unit}`,
          value: t.id,
          emoji: t.emoji,
        })),
      );
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(spend));
  }

  rows.push(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildId(user.id, "gather", "respecgather", skillId))
        .setLabel("Reset (free)")
        .setEmoji("♻️")
        .setStyle(ButtonStyle.Secondary),
      backTo(user.id, "gather"),
    ),
  );

  return { embeds: [embed], components: rows };
}
