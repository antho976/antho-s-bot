import {
  ChannelType,
  EmbedBuilder,
  type Message,
  type MessageReaction,
  type PartialMessageReaction,
} from "discord.js";
import { track } from "@/server/core/analytics";
import { getClient } from "@/server/integrations/discord/client";
import { createPost, getConfig, getPost, updateCount } from "./queries";

function buildEmbed(message: Message, count: number): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0xfacc15)
    .setAuthor({
      name: message.author?.tag ?? "Unknown",
      iconURL: message.author?.displayAvatarURL(),
    })
    .setDescription(message.content?.slice(0, 2000) || "")
    .addFields({ name: "Source", value: `[Jump to message](${message.url})` })
    .setTimestamp(message.createdAt ?? new Date())
    .setFooter({ text: `${count} ⭐` });
  const image = message.attachments.find((a) => a.contentType?.startsWith("image/"));
  if (image) embed.setImage(image.url);
  return embed;
}

/** Recount stars on a message and create/update its starboard mirror. */
export async function handleStarReaction(
  reaction: MessageReaction | PartialMessageReaction,
): Promise<void> {
  const message = reaction.message.partial
    ? await reaction.message.fetch().catch(() => null)
    : reaction.message;
  if (!message || !message.guildId) return;

  const config = await getConfig(message.guildId);
  if (!config.enabled || !config.channelId) return;
  if (message.channelId === config.channelId) return; // don't star the starboard

  const key = reaction.emoji.id ?? reaction.emoji.name;
  if (key !== config.emoji) return;

  const users = await reaction.users.fetch().catch(() => null);
  if (!users) return;
  const count = users.filter(
    (u) => !u.bot && (config.selfStar || u.id !== message.author?.id),
  ).size;

  const client = getClient();
  const channel = client ? await client.channels.fetch(config.channelId).catch(() => null) : null;
  if (!channel || channel.type !== ChannelType.GuildText) return;

  const existing = await getPost(message.id);
  const content = `${config.emoji} **${count}** · <#${message.channelId}>`;
  const embed = buildEmbed(message, count);

  if (existing) {
    const sbMsg = await channel.messages.fetch(existing.starboardMessageId).catch(() => null);
    if (sbMsg) await sbMsg.edit({ content, embeds: [embed] }).catch(() => {});
    await updateCount(message.id, count);
  } else if (count >= config.threshold) {
    const sbMsg = await channel.send({ content, embeds: [embed] });
    await createPost({
      guildId: message.guildId,
      originalMessageId: message.id,
      originalChannelId: message.channelId,
      starboardMessageId: sbMsg.id,
      starCount: count,
    });
    await track(message.guildId, "starboard.add", {});
  }
}
