import { EmbedBuilder, PermissionFlagsBits, type GuildMember, type Message } from "discord.js";
import { track } from "@/server/core/analytics";
import { logger } from "@/server/core/logger";
import { sendToChannel } from "@/server/integrations/discord/send";
import { getConfig, recordAction, type HoneypotConfig } from "./queries";
import { purgeRecentMessages } from "./sweep";

/** Staff (Moderate Members) and any configured exempt role are never trapped. */
function isExempt(member: GuildMember, config: HoneypotConfig): boolean {
  if (member.permissions.has(PermissionFlagsBits.ModerateMembers)) return true;
  return config.exemptRoleIds.some((id) => member.roles.cache.has(id));
}

/** Compact human duration for a mute, e.g. 40320 → "28d", 120 → "2h", 90 → "90m". */
function muteDuration(min: number): string {
  if (min % 1440 === 0) return `${min / 1440}d`;
  if (min % 60 === 0) return `${min / 60}h`;
  return `${min}m`;
}

/** What actually happened to the offender — drives both the log row and the embed. */
interface Outcome {
  muteLabel: string | null; // the mute that was applied (null = none/failed)
  banned: boolean;
  purged: number;
}

/** Fires when a non-exempt member posts in a honeypot channel: mute → purge → ban → notify. */
export async function runHoneypot(message: Message): Promise<void> {
  if (!message.inGuild() || message.author.bot) return;
  // Only ever act on a message the user actually typed. System notices (member-join, boosts,
  // pins) and webhook posts carry a real user as `author` but weren't "talking" in the channel —
  // acting on those would mute/ban someone who never posted here.
  if (message.system || message.webhookId) return;

  const config = await getConfig(message.guildId);
  if (!config.enabled || !config.channelIds.includes(message.channelId)) return;

  const member = message.member;
  if (!member || isExempt(member, config)) return;

  const userId = message.author.id;
  const snippet = (message.content || "").slice(0, 200);
  const outcome: Outcome = { muteLabel: null, banned: false, purged: 0 };

  // 1) Delete the triggering message right away.
  if (message.deletable) await message.delete().catch(() => {});

  // 2) Mute — role (stays forever) or native timeout (auto-expires).
  if (config.muteMode === "role" && config.muteRoleId) {
    const ok = await member.roles
      .add(config.muteRoleId, "Honeypot trap")
      .then(() => true)
      .catch(() => false);
    if (ok) outcome.muteLabel = "🔇 Muted (role — stays until removed)";
  } else if (config.muteMode === "timeout" && member.moderatable) {
    const ok = await member
      .timeout(config.timeoutMinutes * 60_000, "Honeypot trap")
      .then(() => true)
      .catch(() => false);
    if (ok) outcome.muteLabel = `⏳ Timed out for ${muteDuration(config.timeoutMinutes)}`;
  }

  // 3) Optional DM — before any ban, while we still share a guild.
  if (config.dmUser && config.dmMessage) {
    await message.author.send(config.dmMessage).catch(() => {});
  }

  // 4) Purge their recent messages server-wide.
  outcome.purged = await purgeRecentMessages(
    message.guild,
    userId,
    config.purgeLookbackMinutes * 60_000,
  );

  // 5) Optional ban.
  if (config.alsoBan && member.bannable) {
    outcome.banned = await member
      .ban({ reason: "Honeypot trap" })
      .then(() => true)
      .catch(() => false);
  }

  const actionStr = summarize(outcome);
  await recordAction({
    guildId: message.guildId,
    userId,
    channelId: message.channelId,
    action: actionStr,
    purged: outcome.purged,
    snippet,
  });
  await track(message.guildId, "honeypot.triggered", { actions: actionStr });
  await notify(message, config, userId, outcome, snippet);

  logger.info("honeypot", `Trap tripped by ${message.author.tag}: ${actionStr}`);
}

/** Plain one-line summary for the dashboard log row. */
function summarize(o: Outcome): string {
  const parts: string[] = [];
  if (o.muteLabel) parts.push(o.muteLabel);
  if (o.purged > 0) parts.push(`purged ${o.purged}`);
  if (o.banned) parts.push("banned");
  return parts.join(", ") || "logged only";
}

/** "DM @x" / "Contact @role" — reuses the ping target as the appeal contact. */
function contactLine(config: HoneypotConfig): string | null {
  if (config.pingTargetType === "user" && config.pingTargetId) {
    return `Think this was a mistake? DM <@${config.pingTargetId}>.`;
  }
  if (config.pingTargetType === "role" && config.pingTargetId) {
    return `Think this was a mistake? Contact <@&${config.pingTargetId}>.`;
  }
  return null;
}

/** The actual ping content + allow-list for the configured target (null = no ping). */
function pingMention(
  config: HoneypotConfig,
): { content: string; users: string[]; roles: string[] } | null {
  if (config.pingTargetType === "user" && config.pingTargetId) {
    return { content: `<@${config.pingTargetId}>`, users: [config.pingTargetId], roles: [] };
  }
  if (config.pingTargetType === "role" && config.pingTargetId) {
    return { content: `<@&${config.pingTargetId}>`, users: [], roles: [config.pingTargetId] };
  }
  return null;
}

/** The self-explanatory embed: what the trap is, the action taken, how many purged, who to DM. */
function buildEmbed(
  userId: string,
  channelId: string,
  outcome: Outcome,
  contact: string | null,
  snippet: string | null,
): EmbedBuilder {
  const actionLines =
    [outcome.muteLabel, outcome.banned ? "🔨 Banned" : null].filter(Boolean).join("\n") ||
    "Logged only — couldn't action (check my permissions).";

  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("🍯 Honeypot triggered")
    .setDescription(
      `<#${channelId}> is a trap — posting here isn't allowed, and <@${userId}> just did. ` +
        "They've been actioned automatically:",
    )
    .addFields(
      { name: "Action taken", value: actionLines },
      { name: "Messages purged", value: String(outcome.purged), inline: true },
    )
    .setTimestamp(new Date());

  if (contact) embed.addFields({ name: "Appeal", value: contact });
  if (snippet) embed.addFields({ name: "Their message", value: snippet });
  return embed;
}

/**
 * Posts the explanatory embed in the honeypot channel (pinging the configured target), and — if a
 * separate alert channel is set — a no-ping mod-log copy there that also includes the raw message.
 */
async function notify(
  message: Message,
  config: HoneypotConfig,
  userId: string,
  outcome: Outcome,
  snippet: string,
): Promise<void> {
  const contact = contactLine(config);
  const ping = pingMention(config);

  // Public notice in the trap channel. We omit the offender's message so scam/spam text isn't
  // re-posted; the ping mentions only the configured target (not the muted user).
  await sendToChannel(message.channelId, {
    content: ping?.content,
    embeds: [buildEmbed(userId, message.channelId, outcome, contact, null)],
    allowedMentions: ping ? { users: ping.users, roles: ping.roles } : { parse: [] },
  });

  // Optional mod-log copy in a separate channel — includes the message, never pings.
  if (config.alertChannelId && config.alertChannelId !== message.channelId) {
    await sendToChannel(config.alertChannelId, {
      embeds: [buildEmbed(userId, message.channelId, outcome, contact, snippet || "—")],
      allowedMentions: { parse: [] },
    });
  }
}
