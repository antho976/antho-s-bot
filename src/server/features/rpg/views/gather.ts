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
  type GatherArea,
  type GatherSkillId,
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

/** Gathering hub: your levels, the current session, a skill picker, and Farm XP. */
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
        ? "⏳ Idle cap reached, collect to keep earning."
        : `⏳ ${fmtDuration(preview.remainingMs ?? 0)} of idle time left.`,
    ].join("\n");
  } else {
    now = "Not gathering. Pick a skill below, or hit Farm XP.";
  }

  const body: string[] = [];
  if (notice) body.push(`*${notice}*`, "");
  body.push(`Total **${levels.total}**`, levelLine, `🛠️ ${toolName(player.toolTier)}`, "", now);

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("⛏️ Gathering")
    .setDescription(body.join("\n"))
    .setFooter({ text: "Progress builds in real time, even while offline. Reopen to refresh, then Collect." });

  const skillSelect = new StringSelectMenuBuilder()
    .setCustomId(buildId(user.id, "gather", "skill"))
    .setPlaceholder("Pick a skill to gather…")
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
      .setEmoji("✋")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!preview.active),
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "gather", "farm"))
      .setLabel("Farm XP")
      .setEmoji("🌾")
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
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "gather", "guide"))
      .setLabel("Guide")
      .setEmoji("📖")
      .setStyle(ButtonStyle.Secondary),
    back(user.id, "hub"),
  );

  return {
    embeds: [embed],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(skillSelect), actions, nav],
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

/** Areas for a chosen skill (the travel list, filtered to areas that offer it). Pick one to start. */
export function renderSkillAreas(user: User, skillId: string, levels: GatheringLevels): RpgScreen {
  const sk = GATHER_SKILL_MAP[skillId];
  const offering = GATHER_AREAS.filter((a) => areaSkills(a).includes(skillId as GatherSkillId)).sort(
    (a, b) => a.reqLevel - b.reqLevel,
  );

  // Each area lists every skill it offers (the chosen one first) with drop odds. If the full
  // version would blow Discord's 4096-char description limit, drop the odds, then hard-truncate.
  const block = (a: GatherArea, withOdds: boolean): string => {
    const order = [skillId, ...areaSkills(a).filter((s) => s !== skillId)];
    // Short resource names (first word) + tight spacing so a full 4-drop line fits one row instead
    // of wrapping under the L bracket. The emoji + "veins/timber/…" already says what type it is.
    const short = (n: string) => n.split(" ")[0];
    const rows = order.map((s, i) => {
      const primary = i === 0; // the skill you picked — its resources are bolded so they stand out
      const ss = GATHER_SKILL_MAP[s];
      const head = `${ss?.emoji ?? ""} ${areaAbundance(a.id, s)} ${ss?.noun ?? ""}`;
      const odds = withOdds
        ? `: ${areaOdds(a.id, s)
            .map((o) => `${primary ? `**${short(o.name)}**` : short(o.name)} ${o.pct}%`)
            .join("  ")}`
        : "";
      // The chosen skill sits at the base; the other skills nest under it with a light L bracket.
      return primary ? `${head}${odds}` : `　└ ${head}${odds}`;
    });
    const lock = levels.total < a.reqLevel ? "🔒 " : "";
    return `### ${lock}${a.name} (Lv ${a.reqLevel})\n${rows.join("\n")}`;
  };

  const intro = "Pick an area to gather. You'll harvest every skill it offers, not just this one.";
  const build = (withOdds: boolean) =>
    [intro, "", ...offering.map((a) => block(a, withOdds))].join("\n");
  let desc = build(true);
  if (desc.length > 4096) desc = build(false);
  if (desc.length > 4096) desc = `${desc.slice(0, 4095)}…`;

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle(`${sk?.emoji ?? "⛏️"} ${sk?.name ?? "Gather"} areas`)
    .setDescription(desc);

  const unlocked = offering.filter((a) => levels.total >= a.reqLevel);
  const rows: (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[] = [];
  if (unlocked.length > 0) {
    rows.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(buildId(user.id, "gather", "start"))
          .setPlaceholder("Travel to an area…")
          .addOptions(
            unlocked.slice(0, 25).map((a) => ({
              label: a.name,
              description: `Lv ${a.reqLevel} · ${areaAbundance(a.id, skillId)} ${sk?.noun ?? ""}`.slice(0, 100),
              value: a.id,
            })),
          ),
      ),
    );
  }
  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(back(user.id, "gather"), hubButton(user.id)));

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
