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

/** Fires when a non-exempt member posts in a honeypot channel: mute → purge → ping. */
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
  const actions: string[] = [];

  // 1) Delete the triggering message right away.
  if (message.deletable) await message.delete().catch(() => {});

  // 2) Mute — role (stays forever) or native timeout (auto-expires).
  if (config.muteMode === "role" && config.muteRoleId) {
    const ok = await member.roles
      .add(config.muteRoleId, "Honeypot trap")
      .then(() => true)
      .catch(() => false);
    if (ok) actions.push("muted (role)");
  } else if (config.muteMode === "timeout" && member.moderatable) {
    const ok = await member
      .timeout(config.timeoutMinutes * 60_000, "Honeypot trap")
      .then(() => true)
      .catch(() => false);
    if (ok) actions.push(`timeout ${config.timeoutMinutes}m`);
  }

  // 3) Optional DM — before any ban, while we still share a guild.
  if (config.dmUser && config.dmMessage) {
    await message.author.send(config.dmMessage).catch(() => {});
  }

  // 4) Purge their recent messages server-wide.
  const purged = await purgeRecentMessages(
    message.guild,
    userId,
    config.purgeLookbackMinutes * 60_000,
  );
  if (purged > 0) actions.push(`purged ${purged}`);

  // 5) Optional ban.
  if (config.alsoBan && member.bannable) {
    const ok = await member
      .ban({ reason: "Honeypot trap" })
      .then(() => true)
      .catch(() => false);
    if (ok) actions.push("banned");
  }

  const actionStr = actions.join(", ") || "logged only";
  await recordAction({
    guildId: message.guildId,
    userId,
    channelId: message.channelId,
    action: actionStr,
    purged,
    snippet,
  });
  await track(message.guildId, "honeypot.triggered", { actions: actionStr });
  await postAlert(message, config, userId, actionStr, snippet);

  logger.info("honeypot", `Trap tripped by ${message.author.tag}: ${actionStr}`);
}

function pingFields(config: HoneypotConfig): {
  content?: string;
  users: string[];
  roles: string[];
} {
  if (config.pingTargetType === "user" && config.pingTargetId) {
    return { content: `<@${config.pingTargetId}>`, users: [config.pingTargetId], roles: [] };
  }
  if (config.pingTargetType === "role" && config.pingTargetId) {
    return { content: `<@&${config.pingTargetId}>`, users: [], roles: [config.pingTargetId] };
  }
  return { users: [], roles: [] };
}

async function postAlert(
  message: Message,
  config: HoneypotConfig,
  userId: string,
  actionStr: string,
  snippet: string,
): Promise<void> {
  if (!config.alertChannelId) return;
  const ping = pingFields(config);
  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("🍯 Honeypot tripped")
    .setDescription(`<@${userId}> posted in <#${message.channelId}>`)
    .addFields(
      { name: "Action", value: actionStr },
      { name: "Message", value: snippet || "—" },
    )
    .setTimestamp(new Date());
  await sendToChannel(config.alertChannelId, {
    content: ping.content,
    embeds: [embed],
    allowedMentions: { users: ping.users, roles: ping.roles },
  });
}
