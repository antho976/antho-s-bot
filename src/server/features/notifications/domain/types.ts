export type Platform = "twitch" | "youtube";

export type StreamEventType = "live" | "end" | "upload";

/** The data a platform (or a fake-live test) hands the engine to build an alert. */
export interface AlertInput {
  type: StreamEventType;
  title?: string;
  game?: string; // twitch category / game
  url?: string;
  thumbnailUrl?: string;
  videoId?: string; // youtube
}
