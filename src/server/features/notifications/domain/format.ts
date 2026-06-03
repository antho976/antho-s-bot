import { EmbedBuilder, type MessageCreateOptions } from "discord.js";
import { DEFAULT_TEMPLATES, PLATFORM_COLOR, PLATFORM_LABEL } from "../config";
import type { AlertInput } from "./types";

/** The subset of a stream-channel row the formatter needs (pure — no DB types leak in). */
export interface AlertChannel {
  platform: string;
  displayName: string | null;
  channelRef: string;
  messageTemplate: string | null;
  useEmbed: boolean;
  pingRoleId: string | null;
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

/** Build the Discord message payload for an alert. Pure: same inputs → same output. */
export function buildAlert(channel: AlertChannel, input: AlertInput): MessageCreateOptions {
  const name = channel.displayName || channel.channelRef;
  const platform = PLATFORM_LABEL[channel.platform] ?? channel.platform;
  const template = channel.messageTemplate || DEFAULT_TEMPLATES[input.type];
  const content = applyTemplate(template, {
    name,
    platform,
    title: input.title ?? "",
    game: input.game ?? "",
    url: input.url ?? "",
  });

  const ping = channel.pingRoleId ? `<@&${channel.pingRoleId}> ` : "";
  const allowedMentions = { roles: channel.pingRoleId ? [channel.pingRoleId] : [] };

  // Plain message for "end" or when embeds are off.
  if (!channel.useEmbed || input.type === "end") {
    const line = input.url ? `${content}\n${input.url}` : content;
    return { content: `${ping}${line}`.trim(), allowedMentions };
  }

  const embed = new EmbedBuilder()
    .setColor(PLATFORM_COLOR[channel.platform] ?? 0x5865f2)
    .setAuthor({ name })
    .setTitle(input.title || content);
  if (input.url) embed.setURL(input.url);
  if (input.game) embed.addFields({ name: "Category", value: input.game, inline: true });
  if (input.thumbnailUrl) embed.setImage(input.thumbnailUrl);

  return { content: `${ping}${content}`.trim(), embeds: [embed], allowedMentions };
}
