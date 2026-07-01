import { EmbedBuilder } from "discord.js";
import { getClient } from "@/server/integrations/discord/client";
import { track } from "@/server/core/analytics";
import { logger } from "@/server/core/logger";
import { isEmptyEmbed, type EmbedInput } from "@/lib/embed";

export interface SendResult {
  ok: boolean;
  error?: string;
}

/** Only accept http(s) URLs — discord.js throws on malformed image/icon URLs. */
function httpUrl(value: string): string | undefined {
  const v = value.trim();
  return /^https?:\/\//i.test(v) ? v : undefined;
}

/** Map the dashboard embed shape to a real discord.js embed, or null if it's empty. */
function buildEmbed(input: EmbedInput): EmbedBuilder | null {
  if (isEmptyEmbed(input)) return null;

  const e = new EmbedBuilder();
  if (input.title.trim()) e.setTitle(input.title.slice(0, 256));
  if (input.description.trim()) e.setDescription(input.description.slice(0, 4096));
  const url = httpUrl(input.url);
  if (url) e.setURL(url);
  if (input.author.trim()) {
    e.setAuthor({ name: input.author.slice(0, 256), iconURL: httpUrl(input.authorIcon) });
  }
  if (/^#[0-9a-fA-F]{6}$/.test(input.color)) e.setColor(parseInt(input.color.slice(1), 16));
  const image = httpUrl(input.imageUrl);
  if (image) e.setImage(image);
  const thumb = httpUrl(input.thumbnailUrl);
  if (thumb) e.setThumbnail(thumb);
  if (input.footer.trim()) {
    e.setFooter({ text: input.footer.slice(0, 2048), iconURL: httpUrl(input.footerIcon) });
  }
  if (input.timestamp) e.setTimestamp();

  const fields = input.fields
    .filter((f) => f.name.trim() && f.value.trim())
    .slice(0, 25)
    .map((f) => ({ name: f.name.slice(0, 256), value: f.value.slice(0, 1024), inline: f.inline }));
  if (fields.length) e.addFields(fields);

  return e;
}

/**
 * Build the embed and post it to a channel — but only if that channel belongs to `guildId`, so
 * the dashboard can't be used to post into a server it isn't scoped to. Best-effort; returns a
 * result rather than throwing.
 */
export async function sendEmbed(
  guildId: string,
  channelId: string,
  input: EmbedInput,
): Promise<SendResult> {
  const client = getClient();
  if (!client) return { ok: false, error: "Bot is offline." };

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return { ok: false, error: "Channel not found." };
  if (channel.isDMBased()) return { ok: false, error: "Can't post to a DM channel." };
  if (channel.guildId !== guildId) return { ok: false, error: "That channel isn't in this server." };

  const embed = buildEmbed(input);
  const content = input.content.trim().slice(0, 2000);
  if (!embed && !content) return { ok: false, error: "Nothing to send." };

  try {
    await channel.send({ content: content || undefined, embeds: embed ? [embed] : [] });
  } catch (err) {
    logger.error("embeds", "Failed to send embed", err);
    return { ok: false, error: "Discord rejected the message — check your image/icon URLs." };
  }

  await track(guildId, "embed.sent", { channelId, hasEmbed: embed !== null });
  logger.info("embeds", `Embed posted to channel ${channelId}.`);
  return { ok: true };
}
