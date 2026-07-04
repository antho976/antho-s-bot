import type { StreamEventType } from "./domain/types";

/** Default message templates. Placeholders: {name} {platform} {title} {game} {url} */
export const DEFAULT_TEMPLATES: Record<StreamEventType, string> = {
  live: "🔴 **{name}** is now live on {platform} — come hang out!",
  end: "**{name}**'s stream has ended — thanks for watching!",
  upload: "📺 **{name}** just posted on {platform}!",
};

export const PLATFORM_LABEL: Record<string, string> = {
  twitch: "Twitch",
  youtube: "YouTube",
};

export const PLATFORM_COLOR: Record<string, number> = {
  twitch: 0x9146ff,
  youtube: 0xff0000,
};

/** Small platform logos for embed author/footer icons. */
export const PLATFORM_ICON: Record<string, string> = {
  twitch: "https://www.google.com/s2/favicons?domain=twitch.tv&sz=64",
  youtube: "https://www.google.com/s2/favicons?domain=youtube.com&sz=64",
};

/** How often the live embed's viewer stats refresh when the channel doesn't override it. */
export const DEFAULT_STATS_INTERVAL_MIN = 10;

/** Public URL of a watched channel (undefined for platforms we can't derive it for). */
export function platformChannelUrl(platform: string, channelRef: string): string | undefined {
  if (platform === "twitch") return `https://twitch.tv/${channelRef}`;
  if (platform === "youtube") return `https://youtube.com/channel/${channelRef}`;
  return undefined;
}
