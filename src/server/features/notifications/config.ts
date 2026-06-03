import type { StreamEventType } from "./domain/types";

/** Default message templates. Placeholders: {name} {platform} {title} {game} {url} */
export const DEFAULT_TEMPLATES: Record<StreamEventType, string> = {
  live: "🔴 **{name}** is now live on {platform}!",
  end: "**{name}** just ended their stream.",
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
