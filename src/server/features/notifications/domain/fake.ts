import type { AlertInput, StreamEventType } from "./types";

interface FakeChannel {
  platform: string;
  channelRef: string;
  displayName: string | null;
}

const FAKE_COLOR: Record<string, string> = { twitch: "9146ff", youtube: "ff0000" };

/** Placeholder stream preview so test embeds show a picture without a real stream. */
export function fakeThumbnail(platform: string, name: string): string {
  const color = FAKE_COLOR[platform] ?? "5865f2";
  return `https://placehold.co/1280x720/${color}/ffffff/png?text=${encodeURIComponent(`${name} • LIVE (test)`)}`;
}

/** Placeholder avatar for the embed author line in test alerts. */
export function fakeAvatar(platform: string, name: string): string {
  const color = FAKE_COLOR[platform] ?? "5865f2";
  return `https://placehold.co/128x128/${color}/ffffff/png?text=${encodeURIComponent(name.slice(0, 2).toUpperCase())}`;
}

/** Synthesize a believable alert payload for the dashboard's "fake live/end/upload" test. */
export function makeFakeInput(channel: FakeChannel, type: StreamEventType): AlertInput {
  const name = channel.displayName || channel.channelRef;
  const isTwitch = channel.platform === "twitch";
  const url = isTwitch
    ? `https://twitch.tv/${channel.channelRef}`
    : `https://youtube.com/channel/${channel.channelRef}`;

  if (type === "live") {
    return {
      type,
      test: true,
      title: `[TEST] ${name} is live!`,
      game: isTwitch ? "Just Chatting" : undefined,
      url,
      thumbnailUrl: fakeThumbnail(channel.platform, name),
      avatarUrl: fakeAvatar(channel.platform, name),
      viewers: 42,
      startedAt: Date.now(),
    };
  }

  if (type === "end") {
    // Fallback stats so a standalone fake "end" still shows a full summary; a fake "live"
    // beforehand makes the engine compute these from its own tracked state instead.
    return {
      type,
      test: true,
      title: `[TEST] ${name} was live`,
      game: isTwitch ? "Just Chatting" : undefined,
      url,
      durationMs: (2 * 60 + 47) * 60_000,
      peakViewers: 87,
      avgViewers: 54,
    };
  }

  // upload
  if (isTwitch) {
    return {
      type,
      test: true,
      title: `[TEST] ${name} — new clip`,
      url,
      thumbnailUrl: fakeThumbnail(channel.platform, name),
      avatarUrl: fakeAvatar(channel.platform, name),
    };
  }
  return {
    type,
    test: true,
    title: `[TEST] ${name} posted a new video`,
    url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
    videoId: "dQw4w9WgXcQ",
    thumbnailUrl: fakeThumbnail(channel.platform, name),
    avatarUrl: fakeAvatar(channel.platform, name),
  };
}
