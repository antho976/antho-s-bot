import type { AlertInput, StreamEventType } from "./types";

interface FakeChannel {
  platform: string;
  channelRef: string;
  displayName: string | null;
}

/** Synthesize a believable alert payload for the dashboard's "fake live/end/upload" test. */
export function makeFakeInput(channel: FakeChannel, type: StreamEventType): AlertInput {
  const name = channel.displayName || channel.channelRef;

  if (channel.platform === "twitch") {
    const url = `https://twitch.tv/${channel.channelRef}`;
    if (type === "upload") return { type, title: `[TEST] ${name} — new clip`, url };
    return { type, title: `[TEST] ${name} is live!`, game: "Just Chatting", url };
  }

  // youtube
  if (type === "live") {
    return { type, title: `[TEST] ${name} is streaming`, url: "https://youtube.com/" };
  }
  return {
    type,
    title: `[TEST] ${name} posted a new video`,
    url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
    videoId: "dQw4w9WgXcQ",
  };
}
