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
  areaAbundance,
  areaOdds,
  areaSkills,
  ladderNames,
  toolName,
} from "../gather-config";
import type { GatherPreview, GatheringLevels } from "../gather";
import type { RpgPlayer } from "../queries";
import { renderGatherTalentsImage } from "./gather-talent-canvas";
import type { RpgScreen } from "./types";

function back(ownerId: string, view: string, label = "Back"): ButtonBuilder {
  return new ButtonBuilder()
    .setCustomId(buildId(ownerId, view))
    .setLabel(label)
    .setStyle(ButtonStyle.Secondary);
}

/** Jump straight to the RPG hub — added on screens more than one Back away from it. */
function hubButton(ownerId: string): ButtonBuilder {
  return new ButtonBuilder()
    .setCustomId(buildId(ownerId, "hub"))
    .setLabel("Hub")
    .setEmoji("🏠")
    .setStyle(ButtonStyle.Secondary);
}

function fmtDuration(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
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
  const levelLine = GATHER_SKILLS.map((s) => `${s.emoji} ${levels.perSkill[s.id] ?? 1}`).join("   ");

  let now: string;
  if (preview.active && preview.areaId) {
    const area = GATHER_AREA_MAP[preview.areaId];
    now = [
      `📍 Gathering at **${area?.name ?? "?"}**`,
      `Ready to collect: **${(preview.totalUnits ?? 0).toLocaleString()}** drops (+${(preview.xp ?? 0).toLocaleString()} xp)`,
      preview.wasCapped
        ? "⏳ Idle cap reached — collect to keep earning."
        : `⏳ ${fmtDuration(preview.remainingMs ?? 0)} of idle time left.`,
    ].join("\n");
  } else {
    now = "Not gathering. Travel to an area below to begin.";
  }

  // Area names use `###` markdown headers to read bigger — headers only render in the embed
  // description (not inside a field value), so the whole hub body lives in the description.
  //
  // The embed only lists a window of relevant areas: the two most-recent unlocked req tiers plus the
  // next locked tier (a goal). Outgrown low tiers fall off. The Travel menu below still has them all.
  const tiers = [...new Set(GATHER_AREAS.map((a) => a.reqLevel))].sort((x, y) => x - y);
  const unlocked = tiers.filter((t) => t <= levels.total);
  const nextLocked = tiers.find((t) => t > levels.total);
  const keep = new Set<number>([...unlocked.slice(-2), ...(nextLocked !== undefined ? [nextLocked] : [])]);
  const shownAreas = GATHER_AREAS.filter((a) => keep.has(a.reqLevel));
  const hidden = GATHER_AREAS.length - shownAreas.length;

  // Group the shown areas under a level header (`## Level N`), with each area's name as a `###`
  // sub-header and its abundances beneath. Locked groups (the next tier) get a 🔒 on the header.
  const shownTiers = [...new Set(shownAreas.map((a) => a.reqLevel))].sort((x, y) => x - y);
  const areaBlocks = shownTiers
    .map((tier) => {
      const header = `### ${levels.total < tier ? "🔒 " : ""}Level ${tier}`;
      const areas = shownAreas
        .filter((a) => a.reqLevel === tier)
        .map((a) => {
          const good = areaSkills(a)
            .map((s) => `${GATHER_SKILL_MAP[s].emoji} ${areaAbundance(a.id, s)} ${GATHER_SKILL_MAP[s].noun}`)
            .join(", ");
          return `**${a.name}**\n${good}`;
        })
        .join("\n");
      return `${header}\n${areas}`;
    })
    .join("\n");

  const body: string[] = [];
  if (notice) body.push(`*${notice}*`, "");
  body.push(`Total **${levels.total}**`, levelLine, `🛠️ ${toolName(player.toolTier)}`, "", now, "", areaBlocks);
  if (hidden > 0) {
    body.push("", `-# Showing areas near your level — all ${GATHER_AREAS.length} are in the Travel menu.`);
  }

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("⛏️ Gathering")
    .setDescription(body.join("\n"))
    .setFooter({ text: "Progress builds in real time, even while offline. Reopen to refresh, then Collect." });

  const travel = new StringSelectMenuBuilder()
    .setCustomId(buildId(user.id, "gather", "area"))
    .setPlaceholder("Travel to an area…")
    .addOptions(
      GATHER_AREAS.slice(0, 25).map((a) => ({
        label: a.name,
        description: `Lv ${a.reqLevel}  ·  ${skillNames(a.id)}`.slice(0, 100),
        value: a.id,
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
      .setEmoji("✋")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!preview.active),
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
  );

  const nav = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "gather", "guide"))
      .setLabel("Guide")
      .setEmoji("📖")
      .setStyle(ButtonStyle.Secondary),
    back(user.id, "hub"),
  );

  return {
    embeds: [embed],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(travel), actions, nav],
  };
}

/** Reference screen: what every skill does, what it drops, and how talents + tools work. */
export function renderGatherGuide(user: User): RpgScreen {
  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("📖 Gathering Guide")
    .setDescription(
      [
        "Travel to an area and gather **every skill it offers at once**. Drops and skill XP build in **real time** — even while you're offline — up to a **12h** cap. Press **Collect** to bank them.",
        "Each skill levels from its own XP; your levels add into a **Total** that unlocks new areas and better tools.",
      ].join("\n\n"),
    )
    .addFields(
      ...GATHER_SKILLS.map((s) => ({
        name: `${s.emoji} ${s.name}`,
        value: `${s.desc}\n${ladderNames(s.id).join(" → ")}`,
        inline: true,
      })),
      {
        name: "🌟 Talents (per skill)",
        value: `${GATHER_TALENTS.map((t) => `**${t.name}** — ${t.unit}`).join("\n")}\n*1 point per skill level; reset any talent for a free refund.*`,
        inline: false,
      },
      {
        name: "🛠️ Multitools",
        value:
          "One tool covers every skill. Higher tiers gather faster, yield more, double drops more often, and idle longer — bought with gold, gated by your total level.",
        inline: false,
      },
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    back(user.id, "gather"),
    hubButton(user.id),
  );
  return { embeds: [embed], components: [row] };
}

/** Area detail (Overview): the drop odds for every skill the area offers. You gather them all. */
export function renderArea(user: User, areaId: string, total: number, notice?: string): RpgScreen {
  const area = GATHER_AREA_MAP[areaId];
  if (!area) {
    return {
      embeds: [new EmbedBuilder().setColor(RPG.embedColor).setTitle("Unknown area")],
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(back(user.id, "gather"))],
    };
  }

  const locked = total < area.reqLevel;
  const blocks = areaSkills(area).map((s) => {
    const sk = GATHER_SKILL_MAP[s];
    const odds = areaOdds(area.id, s)
      .map((o) => `${o.name} ${o.pct}%`)
      .join("   ");
    return `${sk.emoji} **${sk.name}**  (${areaAbundance(area.id, s)} ${sk.noun})\n${odds}`;
  });

  const lines = [notice ? `*${notice}*` : area.blurb];
  if (locked) lines.push(`🔒 Requires total gathering level **${area.reqLevel}**.`);
  lines.push("", "You gather everything here at once.", "", ...blocks);

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle(`📍 ${area.name}`)
    .setDescription(lines.join("\n"));

  const startRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "gather", "start", area.id))
      .setLabel("Gather here")
      .setEmoji("⛏️")
      .setStyle(ButtonStyle.Success)
      .setDisabled(locked),
    back(user.id, "gather"),
    hubButton(user.id),
  );

  return { embeds: [embed], components: [startRow] };
}

/** The multitool ladder. */
export function renderGatherTools(
  user: User,
  player: RpgPlayer,
  total: number,
  notice?: string,
): RpgScreen {
  const lines = GATHER_TOOLS.map((t) => {
    const tag =
      player.toolTier >= t.tier ? "✅ owned" : t.tier === player.toolTier + 1 ? "▶️ next" : `🔒 Lv ${t.reqLevel}`;
    return `${tag}  **${t.name}**  (${t.cost.toLocaleString()}g)\n⚡ ×${t.speed} speed   📦 ×${t.efficiency} yield   ✨ ${Math.round(t.doubleChance * 100)}% double   ⏳ +${t.capBonusH}h`;
  });

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("🛠️ Multitools")
    .setDescription(
      [
        notice ?? `Current: **${toolName(player.toolTier)}**   total level **${total}**   💰 ${player.gold.toLocaleString()}g`,
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
          .setLabel(`Buy ${next.name} (${next.cost.toLocaleString()}g)`)
          .setEmoji("🛒")
          .setStyle(ButtonStyle.Success)
          .setDisabled(!canBuy),
      ),
    );
  }
  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(back(user.id, "gather"), hubButton(user.id)));
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

  // The talents themselves (names, effects, rank pips) are drawn on the themed scene image; the
  // embed text just carries the notice / how-to so the picture isn't duplicated below it.
  const image = renderGatherTalentsImage(skillId, ranks, level, points);

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle(`${sk?.emoji ?? "🌟"} ${sk?.name ?? "Skill"} Talents`)
    .setDescription(
      notice ??
        (points > 0
          ? "Spend a point below to upgrade a talent."
          : "Level up this skill to earn more talent points."),
    )
    .setImage("attachment://gather-talents.png");

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
          GATHER_SKILLS.map((s) => ({ label: s.name, value: s.id, default: s.id === skillId, emoji: s.emoji })),
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

  const resettable = GATHER_TALENTS.filter((t) => (ranks[t.id] ?? 0) > 0);
  if (resettable.length > 0) {
    rows.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(buildId(user.id, "gather", "resettalent", skillId))
          .setPlaceholder("Reset a talent (refund its points)…")
          .addOptions(
            resettable.map((t) => ({
              label: t.name,
              description: `Refund ${ranks[t.id]} point${ranks[t.id] === 1 ? "" : "s"}`,
              value: t.id,
            })),
          ),
      ),
    );
  }

  rows.push(
    new ActionRowBuilder<ButtonBuilder>().addComponents(back(user.id, "gather"), hubButton(user.id)),
  );

  return { embeds: [embed], components: rows, files: [image] };
}
