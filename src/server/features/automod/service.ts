import { EmbedBuilder, PermissionFlagsBits, type Message } from "discord.js";
import { track } from "@/server/core/analytics";
import { logger } from "@/server/core/logger";
import { sendToChannel } from "@/server/integrations/discord/send";
import { detectScam } from "./domain/detect";
import { getBlocklistDomains, getConfig, recordAction } from "./queries";

/** Scan a message for scams and enforce (delete / timeout / log) per config. */
export async function runAutomod(message: Message): Promise<void> {
  if (!message.inGuild() || message.author.bot) return;

  const config = await getConfig(message.guildId);
  if (!config.enabled) return;

  // Never moderate staff.
  const member = message.member;
  if (member?.permissions.has(PermissionFlagsBits.ModerateMembers)) return;

  const blocklist = config.checkBlocklist ? await getBlocklistDomains(message.guildId) : [];
  const hit = detectScam(message.content, config, blocklist);
  if (!hit) return;

  const actions: string[] = [];
  if (config.deleteMessage && message.deletable) {
    await message.delete().catch(() => {});
    actions.push("deleted");
  }
  if (config.timeoutUser && member?.moderatable) {
    await member
      .timeout(config.timeoutMinutes * 60_000, `Automod: scam (${hit.rule})`)
      .catch(() => {});
    actions.push(`timeout ${config.timeoutMinutes}m`);
  }
  const actionStr = actions.join(", ") || "logged only";

  await recordAction(
    message.guildId,
    message.author.id,
    hit.rule,
    actionStr,
    message.content.slice(0, 200),
  );
  await track(message.guildId, "automod.scam", { rule: hit.rule });

  if (config.logChannelId) {
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle("🛡️ Scam blocked")
      .setDescription(`<@${message.author.id}> · rule **${hit.rule}** (${hit.detail})`)
      .addFields(
        { name: "Action", value: actionStr },
        { name: "Message", value: (message.content || "—").slice(0, 500) },
      )
      .setTimestamp(new Date());
    await sendToChannel(config.logChannelId, { embeds: [embed] });
  }

  logger.info("automod", `Scam (${hit.rule}) by ${message.author.tag}: ${actionStr}`);
}
