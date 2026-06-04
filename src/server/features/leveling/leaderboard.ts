import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  type Client,
  type Guild,
} from "discord.js";
import { logger } from "@/server/core/logger";
import { fmtMinutes, rankPrefix } from "./domain/format";
import { leaderboard, topByMessages, topByVoice } from "./queries";

/** custom_id wire format for the switch buttons: `lb:<metric>`. Stateless, so it survives restarts. */
export const LB_PREFIX = "lb";
const DAY_MS = 86_400_000;

const METRICS = [
  { key: "xp", label: "XP", emoji: "⭐", color: 0xf59e0b },
  { key: "messages", label: "Messages", emoji: "💬", color: 0x3b82f6 },
  { key: "voice", label: "Voice", emoji: "🎙️", color: 0x22c55e },
  { key: "joined", label: "Time in server", emoji: "📅", color: 0xa855f7 },
] as const;

export type LbMetric = (typeof METRICS)[number]["key"];

function isMetric(v: string): v is LbMetric {
  return METRICS.some((m) => m.key === v);
}

/** Build the ranked-list body for one metric. Mentions render as names (we never ping). */
async function renderBody(guild: Guild, metric: LbMetric): Promise<string> {
  if (metric === "xp") {
    const rows = await leaderboard(guild.id, 10);
    if (!rows.length) return "_No XP earned yet._";
    return rows
      .map((r, i) => `${rankPrefix(i)} <@${r.userId}> — level **${r.level}** · ${r.xp.toLocaleString()} XP`)
      .join("\n");
  }
  if (metric === "messages") {
    const rows = await topByMessages(guild.id, 10);
    if (!rows.length) return "_No messages tracked yet._";
    return rows
      .map((r, i) => `${rankPrefix(i)} <@${r.userId}> — ${r.messages.toLocaleString()} messages`)
      .join("\n");
  }
  if (metric === "voice") {
    const rows = await topByVoice(guild.id, 10);
    if (!rows.length) return "_No voice time yet._";
    return rows
      .map((r, i) => `${rankPrefix(i)} <@${r.userId}> — ${fmtMinutes(r.voiceMinutes)}`)
      .join("\n");
  }
  // joined — oldest members first, from the gateway cache (no extra API calls).
  const now = Date.now();
  const members = [...guild.members.cache.values()]
    .filter((m) => !m.user.bot && m.joinedTimestamp)
    .sort((a, b) => a.joinedTimestamp! - b.joinedTimestamp!)
    .slice(0, 10);
  if (!members.length) return "_No data yet._";
  return members
    .map((m, i) => `${rankPrefix(i)} <@${m.id}> — ${Math.floor((now - m.joinedTimestamp!) / DAY_MS)} days`)
    .join("\n");
}

function switchRow(active: LbMetric): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();
  for (const m of METRICS) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${LB_PREFIX}:${m.key}`)
        .setLabel(m.label)
        .setEmoji(m.emoji)
        .setStyle(m.key === active ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(m.key === active), // the current view's button is the selected-state marker
    );
  }
  return row;
}

export interface LbScreen {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
}

/** One leaderboard page: a metric's ranked list plus the row of switch buttons. */
export async function renderLeaderboard(guild: Guild, metric: LbMetric): Promise<LbScreen> {
  const meta = METRICS.find((m) => m.key === metric) ?? METRICS[0];
  const embed = new EmbedBuilder()
    .setColor(meta.color)
    .setTitle(`${meta.emoji} ${guild.name} — ${meta.label}`)
    .setDescription(await renderBody(guild, meta.key))
    .setFooter({ text: "Use the buttons to switch leaderboards" });
  return { embeds: [embed], components: [switchRow(meta.key)] };
}

/** Handle clicks on the leaderboard switch buttons — re-renders the shared message in place. */
export function registerLeaderboardEvents(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton() || !interaction.customId.startsWith(`${LB_PREFIX}:`)) return;
    const metric = interaction.customId.slice(LB_PREFIX.length + 1);
    if (!interaction.guild || !isMetric(metric)) {
      await interaction.deferUpdate().catch(() => {});
      return;
    }
    try {
      const screen = await renderLeaderboard(interaction.guild, metric);
      await interaction.update({ ...screen, allowedMentions: { parse: [] } });
    } catch (err) {
      logger.error("leveling", "Leaderboard switch failed", err);
      await interaction.deferUpdate().catch(() => {});
    }
  });
}
