import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type MessageCreateOptions,
} from "discord.js";
import {
  DEFAULT_TEMPLATES,
  PLATFORM_COLOR,
  PLATFORM_ICON,
  PLATFORM_LABEL,
  platformChannelUrl,
} from "../config";
import type { AlertInput, StreamSummary } from "./types";

/** The subset of a stream-channel row the formatter needs (pure — no DB types leak in). */
export interface AlertChannel {
  platform: string;
  displayName: string | null;
  channelRef: string;
  messageTemplate: string | null;
  useEmbed: boolean;
  pingRoleId: string | null;
  statsIntervalMin: number;
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

/** "2h 47m" / "47m" / "under a minute" */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "under a minute";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function mentionParts(channel: AlertChannel) {
  return {
    mention: channel.pingRoleId ? `<@&${channel.pingRoleId}>` : "",
    allowedMentions: { roles: channel.pingRoleId ? [channel.pingRoleId] : [] },
  };
}

function linkButton(label: string, url: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(label).setURL(url),
  );
}

/** Build the Discord message payload for an alert. Pure: same inputs → same output. */
export function buildAlert(channel: AlertChannel, input: AlertInput): MessageCreateOptions {
  const name = channel.displayName || channel.channelRef;
  const platform = PLATFORM_LABEL[channel.platform] ?? channel.platform;
  const template = channel.messageTemplate || DEFAULT_TEMPLATES[input.type];
  const text = applyTemplate(template, {
    name,
    platform,
    title: input.title ?? "",
    game: input.game ?? "",
    url: input.url ?? "",
  });
  const { mention, allowedMentions } = mentionParts(channel);

  // Plain message for "end" or when embeds are off.
  if (!channel.useEmbed || input.type === "end") {
    const line = input.url ? `${text}\n${input.url}` : text;
    return { content: `${mention} ${line}`.trim(), allowedMentions };
  }

  // Embed mode: the message content is ONLY the role ping — everything else lives in the embed.
  const icon = PLATFORM_ICON[channel.platform];
  const embed = new EmbedBuilder()
    .setColor(PLATFORM_COLOR[channel.platform] ?? 0x5865f2)
    .setAuthor({ name, iconURL: input.avatarUrl ?? icon })
    .setTitle(input.title || (input.type === "live" ? `${name} is live!` : `New from ${name}`))
    .setDescription(text)
    .setTimestamp();
  if (input.url) embed.setURL(input.url);
  if (input.game) embed.addFields({ name: "🎮 Category", value: input.game, inline: true });
  if (input.type === "live") {
    if (input.viewers != null) {
      embed.addFields({ name: "👀 Viewers", value: input.viewers.toLocaleString("en-US"), inline: true });
    }
    if (input.startedAt) {
      embed.addFields({
        name: "⏰ Started",
        value: `<t:${Math.floor(input.startedAt / 1000)}:R>`,
        inline: true,
      });
    }
    embed.setFooter({
      text: `${platform} • viewers update every ${channel.statsIntervalMin} min`,
      iconURL: icon,
    });
  } else {
    embed.setFooter({ text: platform, iconURL: icon });
  }
  if (input.thumbnailUrl) embed.setImage(input.thumbnailUrl);

  const label = input.type === "upload" ? "Watch the video" : `Watch on ${platform}`;
  return {
    content: mention || undefined,
    embeds: [embed],
    components: input.url ? [linkButton(label, input.url)] : undefined,
    allowedMentions,
  };
}

/**
 * After-stream summary embed — used both to edit the live announcement in place and (when
 * "alert on end" is enabled) as the fresh end-of-stream message.
 */
export function buildEndAlert(channel: AlertChannel, summary: StreamSummary): MessageCreateOptions {
  const name = channel.displayName || channel.channelRef;
  const platform = PLATFORM_LABEL[channel.platform] ?? channel.platform;
  const { mention, allowedMentions } = mentionParts(channel);
  const url = platformChannelUrl(channel.platform, channel.channelRef);

  const embed = new EmbedBuilder()
    .setColor(0x64748b)
    .setAuthor({ name, iconURL: PLATFORM_ICON[channel.platform] })
    .setTitle("Stream ended — thanks for watching! 💜")
    .setFooter({ text: platform, iconURL: PLATFORM_ICON[channel.platform] })
    .setTimestamp();
  if (url) embed.setURL(url);
  if (summary.title) embed.addFields({ name: "📝 Title", value: summary.title, inline: false });
  if (summary.durationMs != null) {
    embed.addFields({ name: "⏱️ Duration", value: formatDuration(summary.durationMs), inline: true });
  }
  if (summary.peakViewers != null) {
    embed.addFields({
      name: "📈 Peak viewers",
      value: summary.peakViewers.toLocaleString("en-US"),
      inline: true,
    });
  }
  if (summary.avgViewers != null) {
    embed.addFields({
      name: "👀 Avg viewers",
      value: summary.avgViewers.toLocaleString("en-US"),
      inline: true,
    });
  }
  if (summary.game) embed.addFields({ name: "🎮 Category", value: summary.game, inline: true });

  return {
    content: mention || undefined,
    embeds: [embed],
    components: url ? [linkButton("Visit the channel", url)] : undefined,
    allowedMentions,
  };
}
