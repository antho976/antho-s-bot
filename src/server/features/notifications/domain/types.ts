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
  avatarUrl?: string; // streamer avatar for the embed author
  viewers?: number; // concurrent viewers at event time
  startedAt?: number; // epoch ms — when the stream went live
  test?: boolean; // dashboard fake alert (skips dedup, simulates stats)
  // Fallback summary stats for "end" events when the engine tracked no samples itself
  // (fake tests today; platforms that report their own totals later).
  durationMs?: number;
  peakViewers?: number;
  avgViewers?: number;
}

/** What a finished stream looked like — rendered into the after-stream embed. */
export interface StreamSummary {
  title: string | null;
  game: string | null;
  durationMs?: number;
  peakViewers?: number;
  avgViewers?: number;
}
